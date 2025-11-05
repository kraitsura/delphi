import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useEvent } from "@/contexts/EventContext";

/**
 * Room with latest message preview for sidebar display
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
  membership?: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
    canPost: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManage: boolean;
    notificationLevel: "all" | "mentions" | "none";
    lastReadAt?: number;
    joinedAt: number;
    addedBy: Id<"users">;
  };
  latestMessage: {
    _id: Id<"messages">;
    text: string;
    authorId: Id<"users">;
    createdAt: number;
    isAIGenerated: boolean;
  } | null;
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
    isInEventContext && eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  return rooms as RoomWithPreview[] | undefined;
}
