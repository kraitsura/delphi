import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// HELPER: Calculate schedule status based on due date
export function calculateScheduleStatus(dueDate: number): string {
  const now = Date.now();
  const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0) {
    return "overdue";
  } else if (daysUntilDue <= 7) {
    return "due_soon";
  } else {
    return "upcoming";
  }
}

// HELPER: Create payment schedule
export async function createPaymentSchedule(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    vendorId?: Id<"vendors">;
    description: string;
    amount: number;
    currency: string;
    dueDate: number;
    createdBy: Id<"users">;
    notes?: string;
  }
): Promise<Id<"paymentSchedules">> {
  const now = Date.now();
  const status = calculateScheduleStatus(args.dueDate);

  const scheduleId = await ctx.db.insert("paymentSchedules", {
    ...args,
    status: status as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  return scheduleId;
}

// CREATE
export const create = mutation({
  args: {
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    description: v.string(),
    amount: v.number(),
    currency: v.string(),
    dueDate: v.number(),
    createdBy: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => createPaymentSchedule(ctx, args),
});

// HELPER: Get payment schedule
export async function getPaymentSchedule(
  ctx: QueryCtx,
  args: { scheduleId: Id<"paymentSchedules"> }
) {
  return await ctx.db.get(args.scheduleId);
}

// GET
export const get = query({
  args: { scheduleId: v.id("paymentSchedules") },
  handler: async (ctx, args) => getPaymentSchedule(ctx, args),
});

// HELPER: List payment schedules by event
export async function listPaymentSchedulesByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    status?: string;
  }
) {
  let query = ctx.db
    .query("paymentSchedules")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  const schedules = await query.collect();

  // Enrich with vendor info
  return await Promise.all(
    schedules.map(async (schedule) => ({
      ...schedule,
      vendor: schedule.vendorId ? await ctx.db.get(schedule.vendorId) : null,
    }))
  );
}

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => listPaymentSchedulesByEvent(ctx, args),
});

// HELPER: Get upcoming payment schedules
export async function getUpcomingPaymentSchedules(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    daysAhead?: number;
  }
) {
  const now = Date.now();
  const daysAhead = args.daysAhead || 30;
  const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

  const schedules = await ctx.db
    .query("paymentSchedules")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) =>
      q.and(
        q.eq(q.field("deletedAt"), undefined),
        q.neq(q.field("status"), "paid"),
        q.lte(q.field("dueDate"), futureDate)
      )
    )
    .collect();

  return schedules.sort((a, b) => a.dueDate - b.dueDate);
}

// GET UPCOMING PAYMENTS
export const getUpcoming = query({
  args: {
    eventId: v.id("events"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => getUpcomingPaymentSchedules(ctx, args),
});

// HELPER: Mark payment schedule as paid
export async function markPaymentSchedulePaid(
  ctx: MutationCtx,
  args: {
    scheduleId: Id<"paymentSchedules">;
    expenseId?: Id<"expenses">;
    paidDate?: number;
    confirmationNumber?: string;
  }
): Promise<Id<"paymentSchedules">> {
  const { scheduleId, ...updates } = args;

  await ctx.db.patch(scheduleId, {
    ...updates,
    paidDate: updates.paidDate || Date.now(),
    status: "paid" as any,
    updatedAt: Date.now(),
  } as any);

  return scheduleId;
}

// MARK AS PAID
export const markPaid = mutation({
  args: {
    scheduleId: v.id("paymentSchedules"),
    expenseId: v.optional(v.id("expenses")),
    paidDate: v.optional(v.number()),
    confirmationNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => markPaymentSchedulePaid(ctx, args),
});

// HELPER: Update payment schedule
export async function updatePaymentSchedule(
  ctx: MutationCtx,
  args: {
    scheduleId: Id<"paymentSchedules">;
    amount?: number;
    dueDate?: number;
    status?: string;
    notes?: string;
  }
): Promise<Id<"paymentSchedules">> {
  const { scheduleId, ...updates } = args;

  await ctx.db.patch(scheduleId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return scheduleId;
}

// UPDATE
export const update = mutation({
  args: {
    scheduleId: v.id("paymentSchedules"),
    amount: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => updatePaymentSchedule(ctx, args),
});

// HELPER: Delete payment schedule
export async function deletePaymentSchedule(
  ctx: MutationCtx,
  args: { scheduleId: Id<"paymentSchedules"> }
): Promise<Id<"paymentSchedules">> {
  await ctx.db.patch(args.scheduleId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return args.scheduleId;
}

// DELETE
export const deleteSchedule = mutation({
  args: { scheduleId: v.id("paymentSchedules") },
  handler: async (ctx, args) => deletePaymentSchedule(ctx, args),
});
