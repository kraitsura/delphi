import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEvent } from "@/contexts/EventContext";

/**
 * Room with latest message preview for sidebar display
 * Note: This matches the flattened structure returned from convex/rooms.ts
 */
export interface RoomWithPreview {
	_id: Id<"rooms">;
	eventId: Id<"events">;
	name: string;
	description?: string;
	type: "main" | "vendor" | "topic" | "guest_announcements" | "private";
	vendorId?: Id<"users">;
	isArchived: boolean;
	allowGuestMessages: boolean;
	createdAt: number;
	createdBy: Id<"users">;
	lastMessageAt?: number;

	// Membership permissions (flattened)
	canPost: boolean;
	canEdit: boolean;
	canDelete: boolean;
	canManage: boolean;
	notificationLevel: "all" | "mentions" | "none";
	lastReadAt?: number;
	joinedAt?: number;
	isCoordinator: boolean;

	// Latest message (flattened)
	latestMessageId: Id<"messages"> | null;
	latestMessageText: string | null;
	latestMessageAuthorId: Id<"users"> | null;
	latestMessageAuthorFirstName: string | null;
	latestMessageCreatedAt: number | null;
	latestMessageIsAI: boolean;

	// Unread count
	unreadCount: number;
}

/**
 * Hook to fetch accessible rooms for the current event
 *
 * Returns rooms the user is a participant of, with:
 * - Latest message preview
 * - Unread count
 * - Sorted by activity (most recent first)
 *
 * Returns undefined while loading, empty array if no rooms or not in event context
 */
export function useEventRooms() {
	const { eventId, isInEventContext } = useEvent();

	const rooms = useQuery(
		api.rooms.listAccessibleForEvent,
		isInEventContext && eventId ? { eventId: eventId as Id<"events"> } : "skip",
	);

	return rooms as RoomWithPreview[] | undefined;
}
