import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * HELPER: List all expenses for an event (excluding deleted)
 */
export async function listExpensesByEvent(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_event_and_deleted", (q) =>
      q.eq("eventId", args.eventId).eq("deletedAt", undefined)
    )
    .collect();

  return expenses;
}

/**
 * List all expenses for an event (excluding deleted)
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => listExpensesByEvent(ctx, args),
});

/**
 * HELPER: Get a single expense by ID
 */
export async function getExpenseById(
  ctx: QueryCtx,
  args: { expenseId: Id<"expenses"> }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const expense = await ctx.db.get(args.expenseId);
  if (!expense || expense.deletedAt !== undefined) {
    throw new Error("Expense not found");
  }

  await requireEventMember(ctx, expense.eventId, userProfile._id);

  return expense;
}

/**
 * Get a single expense by ID
 */
export const getById = query({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => getExpenseById(ctx, args),
});

/**
 * HELPER: Create a new expense
 */
export async function createExpense(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    roomId?: Id<"rooms">;
    description: string;
    amount: number;
    category?: "venue" | "catering" | "photography" | "music" | "decor" | "supplies" | "transportation" | "accommodation" | "other";
    paidBy: Id<"users">;
    paidAt: number;
    paymentMethod?: "cash" | "card" | "transfer" | "check" | "other";
    receiptUrl?: string;
    split?: Array<{
      userId: Id<"users">;
      amount: number;
      isPaid: boolean;
      paidAt?: number;
    }>;
    vendorId?: Id<"vendors">;
    sourceMessageId?: Id<"messages">;
  }
): Promise<Id<"expenses">> {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  // Validate amount is positive
  if (args.amount <= 0) {
    throw new Error("Expense amount must be positive");
  }

  // Validate splits if provided
  if (args.split) {
    const totalSplit = args.split.reduce((sum, split) => sum + split.amount, 0);
    // Allow small rounding differences
    if (Math.abs(totalSplit - args.amount) > 0.01) {
      throw new Error("Split amounts must sum to total expense amount");
    }
  }

  const now = Date.now();

  const expenseId = await ctx.db.insert("expenses", {
    eventId: args.eventId,
    roomId: args.roomId,
    description: args.description,
    amount: args.amount,
    currency: "USD", // Default currency
    category: args.category || "other",
    paidBy: args.paidBy,
    paidAt: args.paidAt,
    paymentMethod: args.paymentMethod,
    receiptUrl: args.receiptUrl,
    split: args.split ? {
      type: "custom" as const,
      participants: args.split.map(s => ({
        userId: s.userId,
        amount: s.amount,
        paid: s.isPaid || false,
      })),
    } : undefined,
    vendorId: args.vendorId,
    sourceMessageId: args.sourceMessageId,
    createdAt: now,
    createdBy: userProfile._id,
    updatedAt: now,
  });

  // Update event budget
  const event = await ctx.db.get(args.eventId);
  if (event && event.budget) {
    await ctx.db.patch(args.eventId, {
      budget: {
        ...event.budget,
        spent: (event.budget.spent || 0) + args.amount,
        remaining: (event.budget.remaining !== undefined ? event.budget.remaining : event.budget.total) - args.amount,
      },
      updatedAt: now,
    });
  }

  return expenseId;
}

/**
 * Create a new expense
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("decor"),
      v.literal("supplies"),
      v.literal("transportation"),
      v.literal("accommodation"),
      v.literal("other")
    )),
    paidBy: v.id("users"),
    paidAt: v.number(),
    paymentMethod: v.optional(v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("transfer"),
      v.literal("check"),
      v.literal("other")
    )),
    receiptUrl: v.optional(v.string()),
    split: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          amount: v.number(),
          isPaid: v.boolean(),
          paidAt: v.optional(v.number()),
        })
      )
    ),
    vendorId: v.optional(v.id("vendors")),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => createExpense(ctx, args),
});

/**
 * HELPER: Update an existing expense
 */
export async function updateExpense(
  ctx: MutationCtx,
  args: {
    expenseId: Id<"expenses">;
    description?: string;
    amount?: number;
    category?: "venue" | "catering" | "photography" | "music" | "decor" | "supplies" | "transportation" | "accommodation" | "other";
    paidBy?: Id<"users">;
    paidAt?: number;
    paymentMethod?: "cash" | "card" | "transfer" | "check" | "other";
    receiptUrl?: string;
    split?: Array<{
      userId: Id<"users">;
      amount: number;
      isPaid: boolean;
      paidAt?: number;
    }>;
  }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const expense = await ctx.db.get(args.expenseId);
  if (!expense || expense.deletedAt !== undefined) {
    throw new Error("Expense not found");
  }

  await requireEventMember(ctx, expense.eventId, userProfile._id);

  const updates: Partial<typeof expense> = {};

  if (args.description !== undefined) updates.description = args.description;
  if (args.amount !== undefined) {
    if (args.amount <= 0) {
      throw new Error("Expense amount must be positive");
    }
    updates.amount = args.amount;
  }
  if (args.category !== undefined) updates.category = args.category;
  if (args.paidBy !== undefined) updates.paidBy = args.paidBy;
  if (args.paidAt !== undefined) updates.paidAt = args.paidAt;
  if (args.paymentMethod !== undefined) updates.paymentMethod = args.paymentMethod;
  if (args.receiptUrl !== undefined) updates.receiptUrl = args.receiptUrl;
  if (args.split !== undefined) {
    const amount = args.amount ?? expense.amount;
    const totalSplit = args.split.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      throw new Error("Split amounts must sum to total expense amount");
    }
    updates.split = {
      type: "custom" as const,
      participants: args.split.map(s => ({
        userId: s.userId,
        amount: s.amount,
        paid: s.isPaid || false,
      })),
    };
  }

  await ctx.db.patch(args.expenseId, updates);

  // Update event budget if amount changed
  if (args.amount !== undefined && args.amount !== expense.amount) {
    const amountDiff = args.amount - expense.amount;
    const event = await ctx.db.get(expense.eventId);
    if (event && event.budget) {
      await ctx.db.patch(expense.eventId, {
        budget: {
          ...event.budget,
          spent: (event.budget.spent || 0) + amountDiff,
          remaining: (event.budget.remaining !== undefined ? event.budget.remaining : event.budget.total) - amountDiff,
        },
        updatedAt: Date.now(),
      });
    }
  }

  return expense.eventId;
}

/**
 * Update an existing expense
 */
export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("decor"),
      v.literal("supplies"),
      v.literal("transportation"),
      v.literal("accommodation"),
      v.literal("other")
    )),
    paidBy: v.optional(v.id("users")),
    paidAt: v.optional(v.number()),
    paymentMethod: v.optional(v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("transfer"),
      v.literal("check"),
      v.literal("other")
    )),
    receiptUrl: v.optional(v.string()),
    split: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          amount: v.number(),
          isPaid: v.boolean(),
          paidAt: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => updateExpense(ctx, args),
});

/**
 * HELPER: Update split payment status
 */
export async function updateExpenseSplitPayment(
  ctx: MutationCtx,
  args: {
    expenseId: Id<"expenses">;
    userId: Id<"users">;
    isPaid: boolean;
  }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const expense = await ctx.db.get(args.expenseId);
  if (!expense || expense.deletedAt !== undefined) {
    throw new Error("Expense not found");
  }

  await requireEventMember(ctx, expense.eventId, userProfile._id);

  if (!expense.split) {
    throw new Error("This expense does not have splits");
  }

  // Update the specific split
  const updatedParticipants = expense.split.participants.map((participant) => {
    if (participant.userId === args.userId) {
      return {
        ...participant,
        paid: args.isPaid,
      };
    }
    return participant;
  });

  await ctx.db.patch(args.expenseId, {
    split: {
      type: expense.split.type,
      participants: updatedParticipants,
    },
  });

  return expense.eventId;
}

/**
 * Update split payment status
 */
export const updateSplitPayment = mutation({
  args: {
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    isPaid: v.boolean(),
  },
  handler: async (ctx, args) => updateExpenseSplitPayment(ctx, args),
});

/**
 * HELPER: Soft delete an expense
 */
export async function removeExpense(
  ctx: MutationCtx,
  args: { expenseId: Id<"expenses"> }
): Promise<Id<"events">> {
  const { userProfile } = await getAuthenticatedUser(ctx);

  const expense = await ctx.db.get(args.expenseId);
  if (!expense || expense.deletedAt !== undefined) {
    throw new Error("Expense not found");
  }

  await requireEventMember(ctx, expense.eventId, userProfile._id);

  const now = Date.now();

  await ctx.db.patch(args.expenseId, {
    deletedAt: now,
  });

  // Update event budget to restore the amount
  const event = await ctx.db.get(expense.eventId);
  if (event && event.budget) {
    await ctx.db.patch(expense.eventId, {
      budget: {
        ...event.budget,
        spent: Math.max(0, (event.budget.spent || 0) - expense.amount),
        remaining: (event.budget.remaining !== undefined ? event.budget.remaining : event.budget.total) + expense.amount,
      },
      updatedAt: now,
    });
  }

  return expense.eventId;
}

/**
 * Soft delete an expense
 */
export const remove = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => removeExpense(ctx, args),
});

/**
 * HELPER: Get budget summary for an event
 * Aggregates expenses by category and returns totals
 */
export async function getEventBudgetSummary(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const { userProfile } = await getAuthenticatedUser(ctx);
  await requireEventMember(ctx, args.eventId, userProfile._id);

  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  const byCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || "other";
    if (!acc[category]) {
      acc[category] = {
        total: 0,
        count: 0,
        expenses: [],
      };
    }
    acc[category].total += expense.amount;
    acc[category].count += 1;
    acc[category].expenses.push(expense);
    return acc;
  }, {} as Record<string, any>);

  const event = await ctx.db.get(args.eventId);

  return {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory,
    budget: event?.budget,
  };
}

/**
 * Get budget summary for an event
 * Aggregates expenses by category and returns totals
 */
export const getBudgetSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => getEventBudgetSummary(ctx, args),
});
