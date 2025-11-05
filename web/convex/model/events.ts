/**
 * Event Business Logic
 *
 * This module contains reusable business logic for event operations.
 * API handlers in convex/events.ts should be thin wrappers that call these functions.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type EventStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";

/**
 * Get all events that a user has access to.
 * Includes events where user is:
 * - Main coordinator
 * - Co-coordinator
 * - Room participant (collaborator)
 *
 * @param ctx Query context
 * @param userId The user ID to get events for
 * @param status Optional status filter
 * @returns Array of events, sorted by creation date (most recent first)
 */
export async function getUserEvents(
  ctx: QueryCtx,
  userId: Id<"users">,
  status?: EventStatus
): Promise<Doc<"events">[]> {
  // Get events where user is main coordinator
  const coordinatorEvents = await getCoordinatorEvents(ctx, userId, status);

  // Get events where user is co-coordinator
  const coCoordinatorEvents = await getCoCoordinatorEvents(ctx, userId, status);

  // Get events where user is a room participant (but not coordinator)
  const collaboratorEvents = await getCollaboratorEvents(ctx, userId, status);

  // Combine and deduplicate
  const allUserEvents = [
    ...coordinatorEvents,
    ...coCoordinatorEvents,
    ...collaboratorEvents,
  ];

  // Sort by creation date (most recent first)
  return allUserEvents.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get events where user is the main coordinator
 */
async function getCoordinatorEvents(
  ctx: QueryCtx,
  userId: Id<"users">,
  status?: EventStatus
): Promise<Doc<"events">[]> {
  if (status) {
    // Use compound index when status is specified
    return await ctx.db
      .query("events")
      .withIndex("by_coordinator_and_status", (q) =>
        q.eq("coordinatorId", userId).eq("status", status)
      )
      .collect();
  } else {
    // Use single field index when status is not specified
    return await ctx.db
      .query("events")
      .withIndex("by_coordinator", (q) => q.eq("coordinatorId", userId))
      .collect();
  }
}

/**
 * Get events where user is a co-coordinator
 * Note: Limited to 500 most recent events for performance.
 * For a more scalable solution, consider creating an eventCoordinators junction table.
 */
async function getCoCoordinatorEvents(
  ctx: QueryCtx,
  userId: Id<"users">,
  status?: EventStatus
): Promise<Doc<"events">[]> {
  const recentEvents = await ctx.db
    .query("events")
    .withIndex("by_creation_time")
    .order("desc")
    .take(500);

  return recentEvents.filter(
    (event) =>
      event.coCoordinatorIds?.includes(userId) &&
      (!status || event.status === status)
  );
}

/**
 * Get events where user is a room participant (but not coordinator/co-coordinator)
 */
async function getCollaboratorEvents(
  ctx: QueryCtx,
  userId: Id<"users">,
  status?: EventStatus
): Promise<Doc<"events">[]> {
  // Get all room memberships for this user
  const userRooms = await ctx.db
    .query("roomParticipants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Extract unique event IDs from the rooms
  const roomEventIds = new Set<Id<"events">>();
  for (const participant of userRooms) {
    const room = await ctx.db.get(participant.roomId);
    if (room) {
      roomEventIds.add(room.eventId);
    }
  }

  // Load all events
  const events = await Promise.all(
    Array.from(roomEventIds).map((id) => ctx.db.get(id))
  );

  // Filter to only events where user is NOT a coordinator/co-coordinator
  // (to avoid duplicates with the other two categories)
  return events.filter(
    (event): event is Doc<"events"> =>
      event !== null &&
      event.coordinatorId !== userId &&
      !event.coCoordinatorIds?.includes(userId) &&
      (!status || event.status === status)
  );
}
