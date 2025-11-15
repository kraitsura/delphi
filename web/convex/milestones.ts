import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function createMilestone(
  ctx: MutationCtx,
  args: {
    name: string;
    description?: string;
    eventId: Id<"events">;
    category: string;
    targetDate: number;
    status?: string;
    criticality: string;
    dependsOnMilestones?: Id<"milestones">[];
    blocksTasks?: Id<"tasks">[];
    completionCriteria?: string[];
    industryStandardTiming?: string;
    risks?: string[];
    createdBy: Id<"users">;
  }
): Promise<Id<"milestones">> {
  const now = Date.now();

  const milestoneId = await ctx.db.insert("milestones", {
    ...args,
    status: (args.status || "not_started") as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  return milestoneId;
}

export async function getMilestone(
  ctx: QueryCtx,
  args: { milestoneId: Id<"milestones"> }
) {
  return await ctx.db.get(args.milestoneId);
}

export async function listMilestonesByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    status?: string;
    criticality?: string;
  }
) {
  let query = ctx.db
    .query("milestones")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  if (args.criticality) {
    query = query.filter((q) => q.eq(q.field("criticality"), args.criticality));
  }

  return await query.collect();
}

export async function getCriticalPathMilestones(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const milestones = await ctx.db
    .query("milestones")
    .withIndex("by_criticality", (q) =>
      q.eq("eventId", args.eventId).eq("criticality", "critical")
    )
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  return milestones.sort((a, b) => a.targetDate - b.targetDate);
}

export async function updateMilestone(
  ctx: MutationCtx,
  args: {
    milestoneId: Id<"milestones">;
    name?: string;
    description?: string;
    targetDate?: number;
    status?: string;
    criticality?: string;
    completionCriteria?: string[];
  }
): Promise<Id<"milestones">> {
  const { milestoneId, ...updates } = args;

  const milestone = await ctx.db.get(milestoneId);
  if (!milestone) throw new Error("Milestone not found");

  // Auto-set completed date if status changes to completed
  if (updates.status === "completed" && milestone.status !== "completed") {
    (updates as any).completedDate = Date.now();
  }

  await ctx.db.patch(milestoneId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return milestoneId;
}

export async function deleteMilestoneHelper(
  ctx: MutationCtx,
  args: { milestoneId: Id<"milestones"> }
): Promise<Id<"milestones">> {
  await ctx.db.patch(args.milestoneId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return args.milestoneId;
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
    category: v.string(),
    targetDate: v.number(),
    status: v.optional(v.string()),
    criticality: v.string(),
    dependsOnMilestones: v.optional(v.array(v.id("milestones"))),
    blocksTasks: v.optional(v.array(v.id("tasks"))),
    completionCriteria: v.optional(v.array(v.string())),
    industryStandardTiming: v.optional(v.string()),
    risks: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => createMilestone(ctx, args),
});

// GET
export const get = query({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => getMilestone(ctx, args),
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
    criticality: v.optional(v.string()),
  },
  handler: async (ctx, args) => listMilestonesByEvent(ctx, args),
});

// GET CRITICAL PATH
export const getCriticalPath = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => getCriticalPathMilestones(ctx, args),
});

// UPDATE
export const update = mutation({
  args: {
    milestoneId: v.id("milestones"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    status: v.optional(v.string()),
    criticality: v.optional(v.string()),
    completionCriteria: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => updateMilestone(ctx, args),
});

// DELETE
export const deleteMilestone = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => deleteMilestoneHelper(ctx, args),
});
