/**
 * Permission and Access Control Helpers
 *
 * This module contains reusable functions for checking user permissions
 * and access control across different resources.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Requires that a user has access to an event.
 * Users have access if they are:
 * - The main coordinator
 * - A co-coordinator
 * - A participant in any room of the event
 *
 * @throws Error if user doesn't have access or event doesn't exist
 * @returns The event document
 */
export async function requireEventAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  // Check if user is coordinator or co-coordinator
  const isCoordinator =
    event.coordinatorId === userId ||
    event.coCoordinatorIds?.includes(userId);

  if (isCoordinator) {
    return event;
  }

  // For non-coordinators, check if they have room access
  const hasRoomAccess = await checkUserHasEventRoomAccess(ctx, eventId, userId);

  if (!hasRoomAccess) {
    throw new Error("Forbidden: Not a member of this event");
  }

  return event;
}

/**
 * Checks if a user has access to an event through room participation.
 *
 * @returns true if user is a participant in any room of the event
 */
export async function checkUserHasEventRoomAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<boolean> {
  // Get all rooms for this event
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  if (rooms.length === 0) {
    return false;
  }

  const roomIds = new Set(rooms.map((r) => r._id));

  // Get all room memberships for this user
  const memberships = await ctx.db
    .query("roomParticipants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Check if user is a participant in any of the event's rooms
  return memberships.some((m) => roomIds.has(m.roomId));
}

/**
 * Checks if a user is an event coordinator (main or co-coordinator).
 * Does not throw, just returns boolean.
 */
export function isEventCoordinator(
  event: Doc<"events">,
  userId: Id<"users">
): boolean {
  return (
    event.coordinatorId === userId ||
    event.coCoordinatorIds?.includes(userId) ||
    false
  );
}

/**
 * Requires that a user is the main coordinator of an event.
 *
 * @throws Error if user is not the main coordinator or event doesn't exist
 * @returns The event document
 */
export async function requireMainCoordinator(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  if (event.coordinatorId !== userId) {
    throw new Error("Forbidden: Only the main coordinator can perform this action");
  }

  return event;
}

/**
 * Requires that a user is a coordinator (main or co-coordinator) of an event.
 *
 * @throws Error if user is not a coordinator or event doesn't exist
 * @returns The event document
 */
export async function requireEventCoordinator(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  if (!isEventCoordinator(event, userId)) {
    throw new Error("Forbidden: Only coordinators can perform this action");
  }

  return event;
}
