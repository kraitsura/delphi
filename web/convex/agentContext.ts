import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Type guard to filter out null values and properly narrow types
 * TypeScript's .filter(Boolean) doesn't narrow (T | null)[] to T[]
 */
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Helper function to fetch complete event context for AI agents
 * Returns everything an agent needs to make informed decisions
 *
 * Performance target: < 200ms
 * No authentication required - internal agent use only
 */
export async function fetchEventContext(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const event = await ctx.db.get(args.eventId);
  if (!event) return null;

  // Get all core entities
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_event_and_deleted", (q) =>
      q.eq("eventId", args.eventId).eq("deletedAt", undefined)
    )
    .collect();

  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_event_and_deleted", (q) =>
      q.eq("eventId", args.eventId).eq("deletedAt", undefined)
    )
    .collect();

  const vendors = await ctx.db
    .query("vendors")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  // Get extended entities
  const guests = await ctx.db
    .query("guests")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const paymentSchedules = await ctx.db
    .query("paymentSchedules")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const milestones = await ctx.db
    .query("milestones")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter(
      (t) => t.deadline && t.deadline < Date.now() && t.status !== "completed"
    ).length,
    byCategory: tasks.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Calculate budget statistics
  const budgetStats = {
    total: event.budget.total,
    spent: expenses.reduce((sum, e) => sum + e.amount, 0),
    remaining: event.budget.total - expenses.reduce((sum, e) => sum + e.amount, 0),
    scheduled: paymentSchedules
      .filter((p) => p.status !== "paid")
      .reduce((sum, p) => sum + p.amount, 0),
    byCategory: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>),
  };

  // Calculate vendor statistics
  const vendorStats = {
    total: vendors.length,
    contracted: vendors.filter((v) => v.status === "contracted").length,
    byCategory: vendors.reduce((acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Calculate guest statistics
  const guestStats = {
    total: guests.length,
    attending: guests.filter((g) => g.rsvpStatus === "attending").length,
    pending: guests.filter((g) => g.rsvpStatus === "pending").length,
    declined: guests.filter((g) => g.rsvpStatus === "declined").length,
  };

  // Calculate milestone statistics
  const milestoneStats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "completed").length,
    critical: milestones.filter(
      (m) => m.criticality === "critical" && m.status !== "completed"
    ).length,
    atRisk: milestones.filter((m) => m.status === "at_risk").length,
  };

  return {
    event,
    tasks: tasks.slice(0, 20), // Limit to most recent 20
    expenses: expenses.slice(0, 20), // Limit to most recent 20
    vendors: vendors.slice(0, 20), // Limit to most recent 20
    guests: guests.slice(0, 50), // More guests for context
    upcomingPayments: paymentSchedules
      .filter((p) => p.status !== "paid")
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 10),
    criticalMilestones: milestones
      .filter((m) => m.criticality === "critical" && m.status !== "completed")
      .sort((a, b) => a.targetDate - b.targetDate),
    stats: {
      tasks: taskStats,
      budget: budgetStats,
      vendors: vendorStats,
      guests: guestStats,
      milestones: milestoneStats,
    },
    daysUntilEvent: event.eventDate
      ? Math.ceil((event.eventDate - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  };
}

/**
 * Get complete event context for AI agents
 * Thin API wrapper around fetchEventContext helper
 */
export const getEventContext = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => fetchEventContext(ctx, args),
});

/**
 * Helper function to fetch room-specific context (last N messages + room data)
 * Used by agents to understand conversation history
 *
 * No authentication required - internal agent use only
 */
export async function fetchRoomContext(
  ctx: QueryCtx,
  args: {
    roomId: Id<"rooms">;
    messageLimit?: number;
  }
) {
  const room = await ctx.db.get(args.roomId);
  if (!room) return null;

  // Get recent messages
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .order("desc")
    .take(args.messageLimit || 10);

  // Enrich with authors
  const enrichedMessages = await Promise.all(
    messages.map(async (msg) => ({
      ...msg,
      author:
        msg.authorId === "agent"
          ? ({ _id: "agent", name: "Delphi", email: "agent@delphi.ai" } as const)
          : await ctx.db.get(msg.authorId as Id<"users">),
    }))
  );

  return {
    room,
    messages: enrichedMessages.reverse(), // Chronological order
  };
}

/**
 * Get room-specific context (last N messages + room data)
 * Thin API wrapper around fetchRoomContext helper
 */
export const getRoomContext = query({
  args: {
    roomId: v.id("rooms"),
    messageLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => fetchRoomContext(ctx, args),
});

/**
 * Helper function to fetch task dependencies and blocking analysis
 * Helps agents understand task readiness and relationships
 *
 * No authentication required - internal agent use only
 */
export async function fetchTaskDependencies(
  ctx: QueryCtx,
  args: { taskId: Id<"tasks"> }
) {
  const task = await ctx.db.get(args.taskId);
  if (!task) return null;

  const dependencies = task.dependsOn
    ? (await Promise.all(task.dependsOn.map((id) => ctx.db.get(id)))).filter(isNotNull)
    : [];

  const blockers = task.blockedBy
    ? (await Promise.all(task.blockedBy.map((id) => ctx.db.get(id)))).filter(isNotNull)
    : [];

  // Find tasks that depend on this one
  const allTasks = await ctx.db
    .query("tasks")
    .withIndex("by_event_and_deleted", (q) =>
      q.eq("eventId", task.eventId).eq("deletedAt", undefined)
    )
    .collect();

  const dependents = allTasks.filter(
    (t) => t.dependsOn && t.dependsOn.includes(args.taskId)
  );

  return {
    task,
    dependencies,
    blockers,
    dependents,
    canStart: blockers.every((b) => b.status === "completed"),
  };
}

/**
 * Get task dependencies and blocking analysis
 * Thin API wrapper around fetchTaskDependencies helper
 */
export const getTaskDependencies = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => fetchTaskDependencies(ctx, args),
});
