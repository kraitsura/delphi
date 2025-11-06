/**
 * Cascade Delete Helpers
 *
 * Convex does NOT support automatic database triggers or cascade constraints.
 * All cascade deletions must be manually implemented in mutation handlers.
 *
 * This file provides reusable helper functions for cascade delete operations:
 * - Soft delete helpers: Used by application mutations
 * - Hard delete helpers: Used for manual cleanup from Convex dashboard
 */

import { internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// =============================================================================
// SOFT DELETE CASCADE HELPERS
// =============================================================================

/**
 * Soft delete a room and all its related data
 * Called by rooms.softDelete mutation
 *
 * Cascades to:
 * - RoomParticipants (soft delete)
 * - Messages (soft delete with text replacement)
 */
export async function softDeleteRoomCascade(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  timestamp: number
): Promise<void> {
  // 1. Soft delete all room participants
  const participants = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  for (const participant of participants) {
    if (!participant.isDeleted) {
      await ctx.db.patch(participant._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }

  // 2. Soft delete all messages
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  for (const message of messages) {
    if (!message.isDeleted) {
      await ctx.db.patch(message._id, {
        isDeleted: true,
        deletedAt: timestamp,
        text: "[Message deleted]",
      });
    }
  }
}

/**
 * Soft delete an event and all its related data
 * Called by events.softDelete mutation
 *
 * Cascades to:
 * - Rooms → RoomParticipants, Messages
 * - EventMembers
 * - EventInvitations
 * - Tasks
 * - Expenses
 * - Polls → PollVotes
 * - Dashboards
 */
export async function softDeleteEventCascade(
  ctx: MutationCtx,
  eventId: Id<"events">,
  timestamp: number
): Promise<void> {
  // 1. Soft delete all rooms (and their cascaded data)
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const room of rooms) {
    if (!room.isDeleted) {
      // Soft delete the room itself
      await ctx.db.patch(room._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });

      // Cascade to room's children
      await softDeleteRoomCascade(ctx, room._id, timestamp);
    }
  }

  // 2. Soft delete all event members
  const eventMembers = await ctx.db
    .query("eventMembers")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const member of eventMembers) {
    if (!member.isDeleted) {
      await ctx.db.patch(member._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }

  // 3. Soft delete all event invitations
  const invitations = await ctx.db
    .query("eventInvitations")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const invitation of invitations) {
    if (!invitation.isDeleted) {
      await ctx.db.patch(invitation._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }

  // 4. Soft delete all tasks
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const task of tasks) {
    if (!task.isDeleted) {
      await ctx.db.patch(task._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }

  // 5. Soft delete all expenses
  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const expense of expenses) {
    if (!expense.isDeleted) {
      await ctx.db.patch(expense._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }

  // 6. Soft delete all polls (and cascade to poll votes)
  const polls = await ctx.db
    .query("polls")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const poll of polls) {
    if (!poll.isDeleted) {
      await ctx.db.patch(poll._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });

      // Cascade: Soft delete all poll votes
      const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
        .collect();

      for (const vote of votes) {
        if (!vote.isDeleted) {
          await ctx.db.patch(vote._id, {
            isDeleted: true,
            deletedAt: timestamp,
          });
        }
      }
    }
  }

  // 7. Soft delete all dashboards
  const dashboards = await ctx.db
    .query("dashboards")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const dashboard of dashboards) {
    if (!dashboard.isDeleted) {
      await ctx.db.patch(dashboard._id, {
        isDeleted: true,
        deletedAt: timestamp,
      });
    }
  }
}

// =============================================================================
// HARD DELETE CASCADE HELPERS (For Manual Cleanup)
// =============================================================================

/**
 * Hard delete a room's related data (for Convex dashboard cleanup)
 * Does NOT delete the room itself - caller must do that
 */
async function hardDeleteRoomData(
  ctx: MutationCtx,
  roomId: Id<"rooms">
): Promise<number> {
  // 1. Delete all room participants
  const participants = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();

  for (const participant of participants) {
    await ctx.db.delete(participant._id);
  }

  // 2. Delete all messages (in batches for performance)
  let hasMore = true;
  let deletedCount = 0;

  while (hasMore && deletedCount < 50000) {
    // Safety limit
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .take(100);

    if (messages.length === 0) {
      hasMore = false;
    } else {
      for (const message of messages) {
        await ctx.db.delete(message._id);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}

/**
 * Hard delete an event's related data (for Convex dashboard cleanup)
 * Does NOT delete the event itself - caller must do that
 */
async function hardDeleteEventData(
  ctx: MutationCtx,
  eventId: Id<"events">
): Promise<void> {
  // 1. Delete all rooms (and their cascaded data)
  const rooms = await ctx.db
    .query("rooms")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const room of rooms) {
    await hardDeleteRoomData(ctx, room._id);
    await ctx.db.delete(room._id);
  }

  // 2. Delete all event members
  const eventMembers = await ctx.db
    .query("eventMembers")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const member of eventMembers) {
    await ctx.db.delete(member._id);
  }

  // 3. Delete all event invitations
  const invitations = await ctx.db
    .query("eventInvitations")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const invitation of invitations) {
    await ctx.db.delete(invitation._id);
  }

  // 4. Delete all tasks
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const task of tasks) {
    await ctx.db.delete(task._id);
  }

  // 5. Delete all expenses
  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const expense of expenses) {
    await ctx.db.delete(expense._id);
  }

  // 6. Delete all polls (and cascade to poll votes)
  const polls = await ctx.db
    .query("polls")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const poll of polls) {
    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(poll._id);
  }

  // 7. Delete all dashboards
  const dashboards = await ctx.db
    .query("dashboards")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const dashboard of dashboards) {
    await ctx.db.delete(dashboard._id);
  }
}

// =============================================================================
// INTERNAL MUTATIONS (For Manual Cleanup from Convex Dashboard)
// =============================================================================

/**
 * Internal mutation: Cascade delete event and all related data (HARD DELETE)
 * Use this from Convex dashboard when you need to permanently remove an event
 *
 * Usage: npx convex run cascadeHelpers:cascadeDeleteEvent --eventId "..."
 */
export const cascadeDeleteEvent = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    await hardDeleteEventData(ctx, args.eventId);
    await ctx.db.delete(args.eventId);
    return { success: true, message: "Event and all related data deleted" };
  },
});

/**
 * Internal mutation: Cascade delete room and all related data (HARD DELETE)
 * Use this from Convex dashboard when you need to permanently remove a room
 *
 * Usage: npx convex run cascadeHelpers:cascadeDeleteRoom --roomId "..."
 */
export const cascadeDeleteRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const deletedCount = await hardDeleteRoomData(ctx, args.roomId);
    await ctx.db.delete(args.roomId);
    return {
      success: true,
      message: `Room and ${deletedCount} messages deleted`,
    };
  },
});

/**
 * Internal mutation: Cascade delete poll and all votes (HARD DELETE)
 * Use this from Convex dashboard when you need to permanently remove a poll
 *
 * Usage: npx convex run cascadeHelpers:cascadeDeletePoll --pollId "..."
 */
export const cascadeDeletePoll = internalMutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll", (q) => q.eq("pollId", args.pollId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(args.pollId);

    return {
      success: true,
      message: `Deleted poll and ${votes.length} votes`,
    };
  },
});
