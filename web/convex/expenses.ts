import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * List all expenses for an event (excluding deleted)
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_event_and_deleted", (q) =>
        q.eq("eventId", args.eventId).eq("isDeleted", false)
      )
      .collect();

    return expenses;
  },
});

/**
 * Get a single expense by ID
 */
export const getById = query({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    await requireEventMember(ctx, expense.eventId, userProfile._id);

    return expense;
  },
});

/**
 * Create a new expense
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    paidBy: v.id("users"),
    paidAt: v.number(),
    paymentMethod: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    splits: v.optional(
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
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    // Validate amount is positive
    if (args.amount <= 0) {
      throw new Error("Expense amount must be positive");
    }

    // Validate splits if provided
    if (args.splits) {
      const totalSplit = args.splits.reduce((sum, split) => sum + split.amount, 0);
      // Allow small rounding differences
      if (Math.abs(totalSplit - args.amount) > 0.01) {
        throw new Error("Split amounts must sum to total expense amount");
      }
    }

    const now = Date.now();

    const expenseId = await ctx.db.insert("expenses", {
      eventId: args.eventId,
      description: args.description,
      amount: args.amount,
      category: args.category,
      paidBy: args.paidBy,
      paidAt: args.paidAt,
      paymentMethod: args.paymentMethod,
      receiptUrl: args.receiptUrl,
      splits: args.splits,
      createdAt: now,
      createdBy: userProfile._id,
      isDeleted: false,
    });

    return expenseId;
  },
});

/**
 * Update an existing expense
 */
export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.string()),
    paidBy: v.optional(v.id("users")),
    paidAt: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    splits: v.optional(
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
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.isDeleted) {
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
    if (args.splits !== undefined) {
      const amount = args.amount ?? expense.amount;
      const totalSplit = args.splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        throw new Error("Split amounts must sum to total expense amount");
      }
      updates.splits = args.splits;
    }

    await ctx.db.patch(args.expenseId, updates);

    return expense.eventId;
  },
});

/**
 * Update split payment status
 */
export const updateSplitPayment = mutation({
  args: {
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    isPaid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    await requireEventMember(ctx, expense.eventId, userProfile._id);

    if (!expense.splits) {
      throw new Error("This expense does not have splits");
    }

    // Update the specific split
    const updatedSplits = expense.splits.map((split) => {
      if (split.userId === args.userId) {
        return {
          ...split,
          isPaid: args.isPaid,
          paidAt: args.isPaid ? Date.now() : undefined,
        };
      }
      return split;
    });

    await ctx.db.patch(args.expenseId, {
      splits: updatedSplits,
    });

    return expense.eventId;
  },
});

/**
 * Soft delete an expense
 */
export const remove = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    await requireEventMember(ctx, expense.eventId, userProfile._id);

    await ctx.db.patch(args.expenseId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return expense.eventId;
  },
});
