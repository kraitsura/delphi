import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext } from "react";
import { useSession } from "@/lib/auth";
import { convexQuery } from "@/lib/convex-query";

/**
 * Event type from Convex schema
 */
type Event = Doc<"events">;

/**
 * User role within the event context
 */
type UserRole = "coordinator" | "co-coordinator" | "collaborator" | null;

/**
 * EventContext value interface
 */
interface EventContextValue {
	/** Current event ID (null if not in event context) */
	eventId: string | null;
	/** Current event data (null if not in event context or loading) */
	event: Event | null;
	/** User's role in the current event */
	userRole: UserRole;
	/** Whether event data is currently loading */
	isLoading: boolean;
	/** Whether we're currently in an event context (on /events/$eventId/* route) */
	isInEventContext: boolean;
	/** Whether user can manage the event (coordinator or co-coordinator) */
	canManageEvent: boolean;
	/** Exit event context and navigate away */
	exitEventContext: () => void;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

/**
 * EventProvider Props
 */
interface EventProviderProps {
	children: ReactNode;
	userId: string;
}

/**
 * EventProvider Component
 *
 * Provides event context throughout the app by detecting the current route
 * and fetching event data when on /events/$eventId/* routes.
 *
 * Should be placed at the authenticated layout level (_authed.tsx)
 */
export function EventProvider({ children, userId }: EventProviderProps) {
	const params = useParams({ strict: false });
	const navigate = useNavigate();
	const { data: session } = useSession();

	// Check if we're on an event route by looking for eventId param
	const eventId = "eventId" in params ? (params.eventId as string) : null;
	const isInEventContext = eventId !== null;

	// Fetch event data when in event context AND session is ready
	// This prevents unauthenticated queries during initialization
	const { data } = useSuspenseQuery(
		eventId && session?.user
			? convexQuery(api.events.getById, { eventId: eventId as Id<"events"> })
			: ({
					queryKey: ["no-event"] as const,
					queryFn: () => Promise.resolve(null),
				} as any),
	);

	const event = data as Event | null;

	// Suspense handles loading, so no isLoading needed
	const isLoading = false;

	// Determine user role in the event
	let userRole: UserRole = null;
	if (event) {
		if (event.coordinatorId === userId) {
			userRole = "coordinator";
		} else if (event.coCoordinatorIds?.includes(userId as Id<"users">)) {
			userRole = "co-coordinator";
		} else {
			userRole = "collaborator";
		}
	}

	const canManageEvent =
		userRole === "coordinator" || userRole === "co-coordinator";

	/**
	 * Exit event context and return to events list
	 */
	const exitEventContext = () => {
		navigate({ to: "/events" });
	};

	const value: EventContextValue = {
		eventId,
		event,
		userRole,
		isLoading,
		isInEventContext,
		canManageEvent,
		exitEventContext,
	};

	return (
		<EventContext.Provider value={value}>{children}</EventContext.Provider>
	);
}

/**
 * useEvent Hook
 *
 * Access the event context from any component.
 * Returns safe defaults if called outside EventProvider (e.g., during SSR or Suspense fallback).
 * This allows components to render gracefully while EventProvider is loading.
 */
export function useEvent(): EventContextValue {
	const context = useContext(EventContext);

	// Return safe defaults when context is unavailable (SSR, Suspense fallback, etc.)
	if (context === undefined) {
		return {
			eventId: null,
			event: null,
			userRole: null,
			isLoading: true,
			isInEventContext: false,
			canManageEvent: false,
			exitEventContext: () => {},
		};
	}

	return context;
}
