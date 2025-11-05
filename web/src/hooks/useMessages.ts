import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Hook to fetch messages for a room with real-time updates
 *
 * Messages are automatically updated in real-time via Convex subscriptions.
 * Returns messages in descending order (newest first) from the backend,
 * but the MessageList component will reverse them for display.
 *
 * @param roomId - The room to fetch messages from
 * @param limit - Maximum number of messages to fetch (default: 50)
 * @returns Messages array with author details, or undefined while loading
 */
export function useMessages(roomId: Id<"rooms"> | undefined, limit = 50) {
	const messages = useQuery(
		api.messages.listByRoom,
		roomId ? { roomId, limit } : "skip"
	);

	return messages;
}
