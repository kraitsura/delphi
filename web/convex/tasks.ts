import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * List all tasks for an event (excluding deleted)
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event_and_deleted", (q) =>
        q.eq("eventId", args.eventId).eq("isDeleted", false)
      )
      .collect();

    return tasks;
  },
});

/**
 * Get a single task by ID
 */
export const getById = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.isDeleted) {
      throw new Error("Task not found");
    }

    await requireEventMember(ctx, task.eventId, userProfile._id);

    return task;
  },
});

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    category: v.optional(
      v.union(
        v.literal("venue"),
        v.literal("catering"),
        v.literal("photography"),
        v.literal("music"),
        v.literal("flowers"),
        v.literal("attire"),
        v.literal("invitations"),
        v.literal("travel"),
        v.literal("other")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("in_progress"),
        v.literal("blocked"),
        v.literal("completed")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    dueDate: v.optional(v.number()),
    estimatedCost: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      })
    ),
    estimatedTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
      eventId: args.eventId,
      title: args.title,
      description: args.description,
      assigneeId: args.assigneeId,
      assignedBy: userProfile._id,
      category: args.category,
      status: args.status ?? "not_started",
      priority: args.priority ?? "medium",
      dueDate: args.dueDate,
      estimatedCost: args.estimatedCost,
      estimatedTime: args.estimatedTime,
      aiEnriched: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userProfile._id,
      isDeleted: false,
    });

    return taskId;
  },
});

/**
 * Update an existing task
 */
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    category: v.optional(
      v.union(
        v.literal("venue"),
        v.literal("catering"),
        v.literal("photography"),
        v.literal("music"),
        v.literal("flowers"),
        v.literal("attire"),
        v.literal("invitations"),
        v.literal("travel"),
        v.literal("other")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("in_progress"),
        v.literal("blocked"),
        v.literal("completed")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedCost: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      })
    ),
    estimatedTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.isDeleted) {
      throw new Error("Task not found");
    }

    await requireEventMember(ctx, task.eventId, userProfile._id);

    const updates: Partial<typeof task> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.category !== undefined) updates.category = args.category;
    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "completed" && !task.completedAt) {
        updates.completedAt = Date.now();
      }
    }
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
    if (args.estimatedCost !== undefined) updates.estimatedCost = args.estimatedCost;
    if (args.estimatedTime !== undefined) updates.estimatedTime = args.estimatedTime;

    await ctx.db.patch(args.taskId, updates);

    return task.eventId;
  },
});

/**
 * Update task status (convenience mutation)
 */
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.isDeleted) {
      throw new Error("Task not found");
    }

    await requireEventMember(ctx, task.eventId, userProfile._id);

    const updates: Partial<typeof task> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "completed" && !task.completedAt) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.taskId, updates);

    return task.eventId;
  },
});

/**
 * Soft delete a task
 */
export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.isDeleted) {
      throw new Error("Task not found");
    }

    await requireEventMember(ctx, task.eventId, userProfile._id);

    await ctx.db.patch(args.taskId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return task.eventId;
  },
});
