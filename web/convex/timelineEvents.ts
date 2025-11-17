import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function createTimelineEvent(
  ctx: MutationCtx,
  args: {
    name: string;
    description?: string;
    eventId: Id<"events">;
    startTime: number;
    endTime?: number;
    duration?: number;
    type: string;
    location?: string;
    responsiblePerson?: Id<"users">;
    vendorsInvolved?: Id<"vendors">[];
    participantsRequired?: Id<"guests">[];
    mustStartAfter?: Id<"timelineEvents">[];
    alertMinutesBefore?: number;
    notes?: string;
    createdBy: Id<"users">;
  }
): Promise<Id<"timelineEvents">> {
  const now = Date.now();

  // Get current max order for this event
  const events = await ctx.db
    .query("timelineEvents")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .collect();

  const maxOrder = Math.max(...events.map((e) => e.order), -1);

  const timelineEventId = await ctx.db.insert("timelineEvents", {
    ...args,
    status: "scheduled" as any,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  } as any);

  return timelineEventId;
}

export async function getTimelineEvent(
  ctx: QueryCtx,
  args: { timelineEventId: Id<"timelineEvents"> }
) {
  return await ctx.db.get(args.timelineEventId);
}

export async function listTimelineEventsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    status?: string;
  }
) {
  let query = ctx.db
    .query("timelineEvents")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  return await query.collect();
}

export async function getDayOfScheduleEvents(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const events = await ctx.db
    .query("timelineEvents")
    .withIndex("by_order", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .order("asc")
    .collect();

  return events;
}

export async function updateTimelineEventStatus(
  ctx: MutationCtx,
  args: {
    timelineEventId: Id<"timelineEvents">;
    status: string;
    actualStartTime?: number;
    actualEndTime?: number;
    liveUpdate?: {
      update: string;
      updatedBy: Id<"users">;
    };
  }
): Promise<Id<"timelineEvents">> {
  const { timelineEventId, liveUpdate, ...updates } = args;

  const event = await ctx.db.get(timelineEventId);
  if (!event) throw new Error("Timeline event not found");

  // Append live update if provided
  const newLiveUpdates = liveUpdate
    ? [
        ...(event.liveUpdates || []),
        {
          timestamp: Date.now(),
          update: liveUpdate.update,
          updatedBy: liveUpdate.updatedBy,
        },
      ]
    : event.liveUpdates;

  await ctx.db.patch(timelineEventId, {
    ...updates,
    liveUpdates: newLiveUpdates,
    updatedAt: Date.now(),
  } as any);

  return timelineEventId;
}

export async function updateTimelineEvent(
  ctx: MutationCtx,
  args: {
    timelineEventId: Id<"timelineEvents">;
    name?: string;
    description?: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
    location?: string;
    order?: number;
    notes?: string;
  }
): Promise<Id<"timelineEvents">> {
  const { timelineEventId, ...updates } = args;

  await ctx.db.patch(timelineEventId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return timelineEventId;
}

export async function deleteTimelineEventHelper(
  ctx: MutationCtx,
  args: { timelineEventId: Id<"timelineEvents"> }
): Promise<Id<"timelineEvents">> {
  await ctx.db.patch(args.timelineEventId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return args.timelineEventId;
}

// ============================================================================
// CONVEX API HANDLERS
// ============================================================================

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    type: v.string(),
    location: v.optional(v.string()),
    responsiblePerson: v.optional(v.id("users")),
    vendorsInvolved: v.optional(v.array(v.id("vendors"))),
    participantsRequired: v.optional(v.array(v.id("guests"))),
    mustStartAfter: v.optional(v.array(v.id("timelineEvents"))),
    alertMinutesBefore: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => createTimelineEvent(ctx, args),
});

// GET
export const get = query({
  args: { timelineEventId: v.id("timelineEvents") },
  handler: async (ctx, args) => getTimelineEvent(ctx, args),
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => listTimelineEventsByEvent(ctx, args),
});

// GET DAY-OF SCHEDULE
export const getDayOfSchedule = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => getDayOfScheduleEvents(ctx, args),
});

// UPDATE STATUS (Day-of tracking)
export const updateStatus = mutation({
  args: {
    timelineEventId: v.id("timelineEvents"),
    status: v.string(),
    actualStartTime: v.optional(v.number()),
    actualEndTime: v.optional(v.number()),
    liveUpdate: v.optional(v.object({
      update: v.string(),
      updatedBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => updateTimelineEventStatus(ctx, args),
});

// UPDATE
export const update = mutation({
  args: {
    timelineEventId: v.id("timelineEvents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    location: v.optional(v.string()),
    order: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => updateTimelineEvent(ctx, args),
});

// DELETE
export const deleteTimelineEvent = mutation({
  args: { timelineEventId: v.id("timelineEvents") },
  handler: async (ctx, args) => deleteTimelineEventHelper(ctx, args),
});
