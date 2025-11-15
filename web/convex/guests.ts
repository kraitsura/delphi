import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function createGuest(
  ctx: MutationCtx,
  args: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    eventId: Id<"events">;
    invitedBy: Id<"users">;
    guestType: string;
    rsvpStatus?: string;
    plusOneAllowed: boolean;
    dietaryRestrictions?: string[];
    allergies?: string[];
    tags?: string[];
  }
): Promise<Id<"guests">> {
  const now = Date.now();

  const guestId = await ctx.db.insert("guests", {
    ...args,
    rsvpStatus: (args.rsvpStatus || "pending") as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  // Update event guest count
  const event = await ctx.db.get(args.eventId);
  if (event) {
    const currentCount = event.guestCount || { confirmed: 0, expected: 0 };
    await ctx.db.patch(args.eventId, {
      guestCount: {
        confirmed: currentCount.confirmed,
        expected: currentCount.expected + 1,
      },
      updatedAt: now,
    });
  }

  return guestId;
}

export async function getGuest(ctx: QueryCtx, args: { guestId: Id<"guests"> }) {
  return await ctx.db.get(args.guestId);
}

export async function listGuestsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    rsvpStatus?: string;
    guestType?: string;
  }
) {
  let query = ctx.db
    .query("guests")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.rsvpStatus) {
    query = query.filter((q) => q.eq(q.field("rsvpStatus"), args.rsvpStatus));
  }

  if (args.guestType) {
    query = query.filter((q) => q.eq(q.field("guestType"), args.guestType));
  }

  return await query.collect();
}

export async function getGuestRsvpSummary(
  ctx: QueryCtx,
  args: { eventId: Id<"events"> }
) {
  const guests = await ctx.db
    .query("guests")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  return {
    total: guests.length,
    attending: guests.filter((g) => g.rsvpStatus === "attending").length,
    declined: guests.filter((g) => g.rsvpStatus === "declined").length,
    pending: guests.filter((g) => g.rsvpStatus === "pending").length,
    maybe: guests.filter((g) => g.rsvpStatus === "maybe").length,
    dietaryRestrictions: guests
      .flatMap((g) => g.dietaryRestrictions || [])
      .reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
  };
}

export async function updateGuest(
  ctx: MutationCtx,
  args: {
    guestId: Id<"guests">;
    rsvpStatus?: string;
    rsvpDate?: number;
    tableNumber?: number;
    seatNumber?: number;
    plusOneName?: string;
    thankYouSent?: boolean;
    notes?: string;
  }
): Promise<Id<"guests">> {
  const { guestId, ...updates } = args;

  await ctx.db.patch(guestId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return guestId;
}

export async function removeGuest(
  ctx: MutationCtx,
  args: { guestId: Id<"guests"> }
): Promise<Id<"guests">> {
  const guest = await ctx.db.get(args.guestId);
  if (!guest) throw new Error("Guest not found");

  await ctx.db.patch(args.guestId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Update event guest count
  const event = await ctx.db.get(guest.eventId);
  if (event && event.guestCount) {
    await ctx.db.patch(guest.eventId, {
      guestCount: {
        confirmed: event.guestCount.confirmed,
        expected: Math.max(0, event.guestCount.expected - 1),
      },
      updatedAt: Date.now(),
    });
  }

  return args.guestId;
}

// ============================================================================
// CONVEX API HANDLERS
// ============================================================================

// CREATE
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    eventId: v.id("events"),
    invitedBy: v.id("users"),
    guestType: v.string(),
    rsvpStatus: v.optional(v.string()),
    plusOneAllowed: v.boolean(),
    dietaryRestrictions: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => createGuest(ctx, args),
});

// GET
export const get = query({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => getGuest(ctx, args),
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    rsvpStatus: v.optional(v.string()),
    guestType: v.optional(v.string()),
  },
  handler: async (ctx, args) => listGuestsByEvent(ctx, args),
});

// GET RSVP SUMMARY
export const getRsvpSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => getGuestRsvpSummary(ctx, args),
});

// UPDATE
export const update = mutation({
  args: {
    guestId: v.id("guests"),
    rsvpStatus: v.optional(v.string()),
    rsvpDate: v.optional(v.number()),
    tableNumber: v.optional(v.number()),
    seatNumber: v.optional(v.number()),
    plusOneName: v.optional(v.string()),
    thankYouSent: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => updateGuest(ctx, args),
});

// DELETE
export const deleteGuest = mutation({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => removeGuest(ctx, args),
});
