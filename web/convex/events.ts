import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventCoordinator,
  canManageEvent,
  getUserEventRole,
  requireEventMember,
} from "./authHelpers";
import { requireEventAccess } from "./model/permissions";
import * as Events from "./model/events";
import { softDeleteEventCascade } from "./cascadeHelpers";

/**
 * Create new event
 * Automatically creates main room and adds coordinator as participant
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("wedding"),
      v.literal("corporate"),
      v.literal("party"),
      v.literal("destination"),
      v.literal("other")
    ),
    date: v.optional(v.number()),
    budget: v.number(),
    expectedGuests: v.number(),
    location: v.optional(
      v.object({
        address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Create event
    const eventId = await ctx.db.insert("events", {
      name: args.name,
      description: args.description,
      type: args.type,
      date: args.date,
      location: args.location,
      budget: {
        total: args.budget,
        spent: 0,
        committed: 0,
      },
      guestCount: {
        expected: args.expectedGuests,
        confirmed: 0,
      },
      coordinatorId: userProfile._id,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userProfile._id,
      isDeleted: false,
    });

    // Create main event room automatically
    const roomId = await ctx.db.insert("rooms", {
      eventId,
      name: `${args.name} - Main Chat`,
      type: "main",
      isArchived: false,
      allowGuestMessages: false,
      isDeleted: false,
      createdAt: Date.now(),
      createdBy: userProfile._id,
    });

    // Add coordinator as room participant with full permissions
    await ctx.db.insert("roomParticipants", {
      roomId,
      userId: userProfile._id,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: userProfile._id,
      isDeleted: false,
    });

    return { eventId, roomId };
  },
});

/**
 * Get event by ID with access control
 * User must be coordinator, co-coordinator, or event member
 */
export const getById = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Use new permission check - requires eventMembers table
    const { event } = await requireEventMember(ctx, args.eventId, userProfile._id);

    return event;
  },
});

/**
 * Get user's role in an event
 * Returns "coordinator", "collaborator", "guest", "vendor", or null
 */
export const getUserRole = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const role = await getUserEventRole(ctx, args.eventId, userProfile._id);

    return role;
  },
});

/**
 * List user's events
 * Returns events where user is coordinator, co-coordinator, or has room access
 */
export const listUserEvents = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Use helper function to get all user events
    return await Events.getUserEvents(ctx, userProfile._id, args.status);
  },
});

/**
 * Update event
 * Only coordinators and co-coordinators can update
 */
export const update = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(
      v.object({
        address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
      })
    ),
    budget: v.optional(v.object({ total: v.number() })),
    guestCount: v.optional(v.object({ expected: v.number() })),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is coordinator or co-coordinator
    const canManage = await canManageEvent(ctx, args.eventId, userProfile._id);
    if (!canManage) {
      throw new Error(
        "Forbidden: Only coordinators and co-coordinators can update events"
      );
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Build update object with proper typing
    const updates: Partial<Doc<"events">> = {
      updatedAt: Date.now(),
    };

    if (args.name) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.date) updates.date = args.date;
    if (args.location) updates.location = args.location;

    if (args.budget) {
      updates.budget = {
        ...event.budget,
        total: args.budget.total,
      };
    }

    if (args.guestCount) {
      updates.guestCount = {
        ...event.guestCount,
        expected: args.guestCount.expected,
      };
    }

    await ctx.db.patch(args.eventId, updates);

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Update event status
 * Only coordinators and co-coordinators can update
 */
export const updateStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is coordinator or co-coordinator
    const canManage = await canManageEvent(ctx, args.eventId, userProfile._id);
    if (!canManage) {
      throw new Error(
        "Forbidden: Only coordinators and co-coordinators can update event status"
      );
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Add co-coordinator to event
 * Only main coordinator can add co-coordinators
 */
export const addCoCoordinator = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify requester is the main coordinator
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.coordinatorId !== userProfile._id) {
      throw new Error("Only the main coordinator can add co-coordinators");
    }

    // Add to co-coordinators list
    const currentCoCoordinators = event.coCoordinatorIds || [];

    if (currentCoCoordinators.includes(args.userId)) {
      throw new Error("User is already a co-coordinator");
    }

    await ctx.db.patch(args.eventId, {
      coCoordinatorIds: [...currentCoCoordinators, args.userId],
      updatedAt: Date.now(),
    });

    // Add to all event rooms with manage permissions
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const room of rooms) {
      // Check if already a participant
      const existing = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", room._id).eq("userId", args.userId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("roomParticipants", {
          roomId: room._id,
          userId: args.userId,
          canPost: true,
          canEdit: true,
          canDelete: true,
          canManage: true,
          notificationLevel: "all",
          joinedAt: Date.now(),
          addedBy: userProfile._id,
          isDeleted: false,
        });
      }
    }

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Remove co-coordinator from event
 * Only main coordinator can remove co-coordinators
 */
export const removeCoCoordinator = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.coordinatorId !== userProfile._id) {
      throw new Error("Only the main coordinator can remove co-coordinators");
    }

    const currentCoCoordinators = event.coCoordinatorIds || [];
    const updated = currentCoCoordinators.filter((id) => id !== args.userId);

    await ctx.db.patch(args.eventId, {
      coCoordinatorIds: updated,
      updatedAt: Date.now(),
    });

    // Remove from all event rooms (they lose coordinator-level access)
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const room of rooms) {
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", room._id).eq("userId", args.userId)
        )
        .first();

      if (participant) {
        await ctx.db.delete(participant._id);
      }
    }

    return await ctx.db.get(args.eventId);
  },
});

/**
 * Archive event
 * Only coordinators and co-coordinators can archive
 */
export const archive = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is coordinator or co-coordinator
    const canManage = await canManageEvent(ctx, args.eventId, userProfile._id);
    if (!canManage) {
      throw new Error(
        "Forbidden: Only coordinators and co-coordinators can archive events"
      );
    }

    await ctx.db.patch(args.eventId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete event (soft delete via cancelled status)
 * Only main coordinator can delete
 * @deprecated Use softDelete instead for cascade deletion
 */
export const remove = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Only main coordinator can delete
    if (event.coordinatorId !== userProfile._id) {
      throw new Error("Only the main coordinator can delete events");
    }

    // In production, you might want hard delete or keep forever
    await ctx.db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Soft delete event with cascade
 * Only main coordinator can delete
 * Cascades to: rooms → roomParticipants, messages
 *              eventMembers, eventInvitations, tasks, expenses, polls → pollVotes, dashboards
 */
export const softDelete = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Only main coordinator can delete
    if (event.coordinatorId !== userProfile._id) {
      throw new Error("Only the main coordinator can delete events");
    }

    // Prevent double deletion
    if (event.isDeleted) {
      throw new Error("Event is already deleted");
    }

    const now = Date.now();

    // Cascade delete all related data using helper function
    await softDeleteEventCascade(ctx, args.eventId, now);

    // Finally, soft delete the event itself
    await ctx.db.patch(args.eventId, {
      isDeleted: true,
      deletedAt: now,
      status: "cancelled",
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Get event statistics
 * Returns task, expense, room, and participant counts
 */
export const getStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Use helper function for access control
    const event = await requireEventAccess(ctx, args.eventId, userProfile._id);

    // Count tasks
    // Note: Limited to 5000 for performance. For events with more tasks,
    // consider implementing incremental counter pattern or cached stats.
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(5000);

    const tasks = allTasks.filter((t) => !t.isDeleted);

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      notStarted: tasks.filter((t) => t.status === "not_started").length,
      isPartial: allTasks.length === 5000, // Flag if stats may be incomplete
    };

    // Count expenses
    // Note: Limited to 5000 for performance.
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(5000);

    const expenses = allExpenses.filter((e) => !e.isDeleted);

    const expenseStats = {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      count: expenses.length,
      isPartial: allExpenses.length === 5000, // Flag if stats may be incomplete
    };

    // Count rooms and participants
    const allRooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const rooms = allRooms.filter((r) => !r.isDeleted);

    const participantIds = new Set<Id<"users">>();
    let hitParticipantLimit = false;

    for (const room of rooms) {
      // Limit to 500 participants per room to prevent memory issues
      const allParticipants = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .take(500);

      const participants = allParticipants.filter((p) => !p.isDeleted);

      if (allParticipants.length === 500) {
        hitParticipantLimit = true;
      }

      participants.forEach((p) => participantIds.add(p.userId));
    }

    return {
      tasks: taskStats,
      expenses: expenseStats,
      rooms: rooms.length,
      participants: participantIds.size,
      participantCountIsPartial: hitParticipantLimit, // Flag if count may be incomplete
    };
  },
});
