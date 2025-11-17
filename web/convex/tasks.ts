import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * List all tasks for an event (excluding deleted)
 */
export async function listTasksByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
  }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_event_and_deleted", (q) =>
      q.eq("eventId", args.eventId).eq("deletedAt", undefined)
    )
    .collect();

  return tasks;
}

export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => listTasksByEvent(ctx, args),
});

/**
 * Get a single task by ID
 */
export async function getTaskById(
  ctx: QueryCtx,
  args: {
    taskId: Id<"tasks">;
  }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const task = await ctx.db.get(args.taskId);
  if (!task || task.deletedAt !== undefined) {
    throw new Error("Task not found");
  }

  await requireEventMember(ctx, task.eventId, userProfile._id);

  return task;
}

export const getById = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => getTaskById(ctx, args),
});

/**
 * Create a new task
 */
export async function createTask(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    roomId: Id<"rooms">;
    title: string;
    description?: string;
    assignedTo?: Id<"users">;
    category?: "venue" | "catering" | "photography" | "music" | "decor" | "other" | "invitations" | "transportation";
    status?: "todo" | "in_progress" | "blocked" | "completed";
    priority?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    estimatedCost?: {
      min: number;
      max: number;
      currency: string;
      confidence: number;
    };
    groupId?: Id<"taskGroups">;
    dependsOn?: Id<"tasks">[];
    blockedBy?: Id<"tasks">[];
    sourceMessageId?: Id<"messages">;
  }
): Promise<Id<"tasks">> {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  const now = Date.now();

  const taskId = await ctx.db.insert("tasks", {
    eventId: args.eventId,
    roomId: args.roomId,
    title: args.title,
    description: args.description,
    assignedTo: args.assignedTo,
    category: args.category || "other",
    status: args.status ?? "todo",
    priority: args.priority ?? "medium",
    deadline: args.deadline,
    estimatedCost: args.estimatedCost,
    groupId: args.groupId,
    dependsOn: args.dependsOn,
    blockedBy: args.blockedBy,
    sourceMessageId: args.sourceMessageId,
    createdAt: now,
    updatedAt: now,
    createdBy: userProfile._id,
  });

  // Update task group count if task is in a group
  if (args.groupId) {
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(args.groupId, {
        taskCount: (group.taskCount || 0) + 1,
        updatedAt: now,
      });
    }
  }

  return taskId;
}

export const create = mutation({
  args: {
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    category: v.optional(
      v.union(
        v.literal("venue"),
        v.literal("catering"),
        v.literal("photography"),
        v.literal("music"),
        v.literal("decor"),
        v.literal("other"),
        v.literal("invitations"),
        v.literal("transportation"),
        v.literal("other")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("todo"),
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
    deadline: v.optional(v.number()),
    estimatedCost: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        currency: v.string(),
        confidence: v.number(),
      })
    ),
    groupId: v.optional(v.id("taskGroups")),
    dependsOn: v.optional(v.array(v.id("tasks"))),
    blockedBy: v.optional(v.array(v.id("tasks"))),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => createTask(ctx, args),
});

/**
 * Update an existing task
 */
export async function updateTask(
  ctx: MutationCtx,
  args: {
    taskId: Id<"tasks">;
    title?: string;
    description?: string;
    assignedTo?: Id<"users">;
    category?: "venue" | "catering" | "photography" | "music" | "decor" | "other" | "invitations" | "transportation";
    status?: "todo" | "in_progress" | "blocked" | "completed";
    priority?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    completedAt?: number;
    estimatedCost?: {
      min: number;
      max: number;
      currency: string;
      confidence: number;
    };
  }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const task = await ctx.db.get(args.taskId);
  if (!task || task.deletedAt !== undefined) {
    throw new Error("Task not found");
  }

  await requireEventMember(ctx, task.eventId, userProfile._id);

  const updates: Partial<typeof task> = {
    updatedAt: Date.now(),
  };

  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.assignedTo !== undefined) updates.assignedTo = args.assignedTo;
  if (args.category !== undefined) updates.category = args.category;

  // Track status change for group completedCount update
  const wasCompleted = task.status === "completed";
  const isNowCompleted = args.status === "completed";

  if (args.status !== undefined) {
    updates.status = args.status;
    if (args.status === "completed" && !task.completedAt) {
      updates.completedAt = Date.now();
    }
  }
  if (args.priority !== undefined) updates.priority = args.priority;
  if (args.deadline !== undefined) updates.deadline = args.deadline;
  if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
  if (args.estimatedCost !== undefined) updates.estimatedCost = args.estimatedCost;

  await ctx.db.patch(args.taskId, updates);

  // Update task group completedCount if status changed
  if (task.groupId && args.status !== undefined && wasCompleted !== isNowCompleted) {
    const group = await ctx.db.get(task.groupId);
    if (group) {
      const completedCount = group.completedCount || 0;
      await ctx.db.patch(task.groupId, {
        completedCount: isNowCompleted ? completedCount + 1 : Math.max(0, completedCount - 1),
        updatedAt: Date.now(),
      });
    }
  }

  return task.eventId;
}

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    category: v.optional(
      v.union(
        v.literal("venue"),
        v.literal("catering"),
        v.literal("photography"),
        v.literal("music"),
        v.literal("decor"),
        v.literal("other"),
        v.literal("invitations"),
        v.literal("transportation"),
        v.literal("other")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("todo"),
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
    deadline: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedCost: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        currency: v.string(),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => updateTask(ctx, args),
});

/**
 * Update task status (convenience mutation)
 */
export async function updateTaskStatus(
  ctx: MutationCtx,
  args: {
    taskId: Id<"tasks">;
    status: "todo" | "in_progress" | "blocked" | "completed";
  }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const task = await ctx.db.get(args.taskId);
  if (!task || task.deletedAt !== undefined) {
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
}

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => updateTaskStatus(ctx, args),
});

/**
 * Soft delete a task
 */
export async function removeTask(
  ctx: MutationCtx,
  args: {
    taskId: Id<"tasks">;
  }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const task = await ctx.db.get(args.taskId);
  if (!task || task.deletedAt !== undefined) {
    throw new Error("Task not found");
  }

  await requireEventMember(ctx, task.eventId, userProfile._id);

  await ctx.db.patch(args.taskId, {
    deletedAt: Date.now(),
  });

  // Update task group counts if task was in a group
  if (task.groupId) {
    const group = await ctx.db.get(task.groupId);
    if (group) {
      const updates: any = {
        taskCount: Math.max(0, (group.taskCount || 0) - 1),
        updatedAt: Date.now(),
      };

      // Also decrement completedCount if task was completed
      if (task.status === "completed") {
        updates.completedCount = Math.max(0, (group.completedCount || 0) - 1);
      }

      await ctx.db.patch(task.groupId, updates);
    }
  }

  return task.eventId;
}

export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => removeTask(ctx, args),
});

/**
 * List tasks by room
 */
export async function listTasksByRoom(
  ctx: QueryCtx,
  args: {
    roomId: Id<"rooms">;
    limit?: number;
  }
) {
  await getAuthenticatedUser(ctx);

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .order("desc")
    .take(args.limit || 50);

  return tasks;
}

export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => listTasksByRoom(ctx, args),
});

/**
 * Search tasks by text
 */
export async function searchTasks(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    searchTerm: string;
  }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  const allTasks = await ctx.db
    .query("tasks")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const searchLower = args.searchTerm.toLowerCase();

  return allTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
  );
}

export const search = query({
  args: {
    eventId: v.id("events"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => searchTasks(ctx, args),
});
