/**
 * Presence Hook
 *
 * Automatically tracks user presence based on current route context.
 * Detects whether user is in a room, event, or global view and
 * sends periodic heartbeats to maintain presence status.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

// Heartbeat interval: 30 seconds (must be less than 2.5x disconnect threshold)
const HEARTBEAT_INTERVAL = 30000;

type PresenceContext =
	| { type: "room"; roomId: Id<"rooms"> }
	| { type: "event"; eventId: Id<"events"> }
	| { type: "global" };

/**
 * Generate a unique session ID for this client session
 */
function generateSessionId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Hook to manage user presence tracking
 *
 * Automatically detects context from route parameters and sends heartbeats.
 * Cleans up presence when component unmounts or context changes.
 *
 * @returns {Object} Presence data and controls
 * @returns {Array} presentUsers - List of users present in current context
 * @returns {Function} setTyping - Update typing status
 * @returns {PresenceContext} context - Current presence context
 */
export function usePresence() {
	// Detect context from URL params
	const params = useParams({ strict: false });
	const eventId = (
		"eventId" in params ? params.eventId : null
	) as Id<"events"> | null;
	const roomId = (
		"roomId" in params ? params.roomId : null
	) as Id<"rooms"> | null;

	// Determine presence context
	const context: PresenceContext = roomId
		? { type: "room", roomId }
		: eventId
			? { type: "event", eventId }
			: { type: "global" };

	// Convex mutations and queries
	const updatePresence = useMutation(api.presence.updatePresence);
	const leaveLocation = useMutation(api.presence.leaveLocation);
	const presentUsers = useQuery(api.presence.listPresenceByContext, {
		context,
	});

	// Refs for managing state without causing re-renders
	const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const isTypingRef = useRef(false);
	const contextRef = useRef<PresenceContext>(context);
	const sessionIdRef = useRef<string>(generateSessionId());
	const sessionTokenRef = useRef<string | null>(null);

	// Update context ref when context changes
	useEffect(() => {
		contextRef.current = context;
	}, [context]);

	// Send heartbeat to server
	const sendHeartbeat = useCallback(() => {
		const currentContext = contextRef.current;

		updatePresence({
			context: currentContext,
			status: isTypingRef.current ? "typing" : "active",
			sessionId: sessionIdRef.current,
		})
			.then((tokens) => {
				// Store session token for cleanup
				if (tokens) {
					sessionTokenRef.current = tokens.sessionToken;
				}
			})
			.catch((error) => {
				console.error("Failed to update presence:", error);
			});
	}, [updatePresence]);

	// Main effect: manage presence tracking
	useEffect(() => {
		// Generate new session ID for this context
		sessionIdRef.current = generateSessionId();
		sessionTokenRef.current = null;

		// Send initial heartbeat
		sendHeartbeat();

		// Set up periodic heartbeat
		intervalRef.current = setInterval(() => {
			sendHeartbeat();
		}, HEARTBEAT_INTERVAL);

		// Cleanup function
		return () => {
			// Clear interval
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}

			// Leave current location if we have a session token
			if (sessionTokenRef.current) {
				leaveLocation({
					context: contextRef.current,
					sessionToken: sessionTokenRef.current,
				}).catch((error) => {
					console.error("Failed to leave location:", error);
				});
			}
		};
	}, [sendHeartbeat, leaveLocation]);

	// Function to update typing status
	const setTyping = useCallback(
		(typing: boolean) => {
			isTypingRef.current = typing;

			// Send immediate heartbeat when typing status changes
			updatePresence({
				context: contextRef.current,
				status: typing ? "typing" : "active",
				sessionId: sessionIdRef.current,
			})
				.then((tokens) => {
					if (tokens) {
						sessionTokenRef.current = tokens.sessionToken;
					}
				})
				.catch((error) => {
					console.error("Failed to update typing status:", error);
				});
		},
		[updatePresence],
	);

	return {
		presentUsers: presentUsers || [],
		setTyping,
		context,
	};
}

/**
 * Hook to get presence for a specific context
 * Use this when you need to query presence for a different context
 * than the current route (e.g., showing event-wide presence in a room)
 *
 * @param context - The presence context to query
 * @returns List of present users in the specified context
 */
export function usePresenceByContext(context: PresenceContext | null) {
	const presentUsers = useQuery(
		api.presence.listPresenceByContext,
		context ? { context } : "skip",
	);

	return presentUsers || [];
}

/**
 * Hook to get presence for a specific user
 * Useful for checking if a user is online anywhere in the app
 *
 * @param userId - The user ID to check presence for
 * @returns User's presence data across all contexts
 */
export function useUserPresence(userId: Id<"users"> | null) {
	const userPresence = useQuery(
		api.presence.getUserPresence,
		userId ? { userId } : "skip",
	);

	return userPresence || [];
}

/**
 * Hook to get event-wide presence statistics
 * Shows presence across all rooms in an event plus event-level presence
 *
 * @param eventId - The event ID to get statistics for
 * @returns Event presence statistics including per-room breakdown
 */
export function useEventPresenceStats(eventId: Id<"events"> | null) {
	const stats = useQuery(
		api.presence.getEventPresenceStats,
		eventId ? { eventId } : "skip",
	);

	return stats;
}
