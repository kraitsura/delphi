import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// CREATE
export async function createTaskGroup(
  ctx: MutationCtx,
  args: {
    name: string;
    description?: string;
    eventId: Id<"events">;
    roomId?: Id<"rooms">;
    color?: string;
    icon?: string;
    createdBy: Id<"users">;
  }
): Promise<Id<"taskGroups">> {
  const now = Date.now();

  // Get current max order
  const groups = await ctx.db
    .query("taskGroups")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .collect();

  const maxOrder = Math.max(...groups.map((g) => g.order), -1);

  const groupId = await ctx.db.insert("taskGroups", {
    ...args,
    order: maxOrder + 1,
    taskCount: 0,
    completedCount: 0,
    createdAt: now,
    updatedAt: now,
  } as any);

  return groupId;
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => createTaskGroup(ctx, args),
});

// GET
export async function getTaskGroup(
  ctx: QueryCtx,
  args: {
    groupId: Id<"taskGroups">;
  }
) {
  return await ctx.db.get(args.groupId);
}

export const get = query({
  args: { groupId: v.id("taskGroups") },
  handler: async (ctx, args) => getTaskGroup(ctx, args),
});

// LIST BY EVENT
export async function listTaskGroupsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
  }
) {
  return await ctx.db
    .query("taskGroups")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .order("asc") // By order field
    .collect();
}

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => listTaskGroupsByEvent(ctx, args),
});

// UPDATE
export async function updateTaskGroup(
  ctx: MutationCtx,
  args: {
    groupId: Id<"taskGroups">;
    name?: string;
    description?: string;
    color?: string;
    order?: number;
  }
): Promise<Id<"taskGroups">> {
  const { groupId, ...updates } = args;

  await ctx.db.patch(groupId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return groupId;
}

export const update = mutation({
  args: {
    groupId: v.id("taskGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => updateTaskGroup(ctx, args),
});

// DELETE
export async function removeTaskGroup(
  ctx: MutationCtx,
  args: {
    groupId: Id<"taskGroups">;
  }
): Promise<Id<"taskGroups">> {
  // Move tasks out of group
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
    .collect();

  for (const task of tasks) {
    await ctx.db.patch(task._id, {
      groupId: undefined,
      updatedAt: Date.now(),
    });
  }

  // Soft delete group
  await ctx.db.patch(args.groupId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return args.groupId;
}

export const deleteGroup = mutation({
  args: { groupId: v.id("taskGroups") },
  handler: async (ctx, args) => removeTaskGroup(ctx, args),
});
