import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function createVendor(
  ctx: MutationCtx,
  args: {
    name: string;
    category: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    country?: string;
    pricing?: any;
    rating?: number;
    reviewCount?: number;
    reviewSource?: string;
    eventId?: Id<"events">;
    roomId?: Id<"rooms">;
    status?: string;
    aiMetadata?: any;
    addedBy: Id<"users">;
    sourceMessageId?: Id<"messages">;
  }
): Promise<Id<"vendors">> {
  const now = Date.now();

  const vendorId = await ctx.db.insert("vendors", {
    ...args,
    status: (args.status || "researching") as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  return vendorId;
}

export async function getVendor(ctx: QueryCtx, args: { vendorId: Id<"vendors"> }) {
  return await ctx.db.get(args.vendorId);
}

export async function listVendorsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    category?: string;
    status?: string;
  }
) {
  let query = ctx.db
    .query("vendors")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.category) {
    query = query.filter((q) => q.eq(q.field("category"), args.category));
  }

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  return await query.collect();
}

export async function listVendorsByRoom(ctx: QueryCtx, args: { roomId: Id<"rooms"> }) {
  return await ctx.db
    .query("vendors")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();
}

export async function searchVendorsByCategory(
  ctx: QueryCtx,
  args: {
    category: string;
    minRating?: number;
  }
) {
  let query = ctx.db
    .query("vendors")
    .withIndex("by_category", (q) => q.eq("category", args.category))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  const vendors = await query.collect();

  if (args.minRating) {
    return vendors.filter((v) => (v.rating || 0) >= args.minRating!);
  }

  return vendors;
}

export async function updateVendor(
  ctx: MutationCtx,
  args: {
    vendorId: Id<"vendors">;
    name?: string;
    status?: string;
    email?: string;
    phone?: string;
    pricing?: any;
    contractUrl?: string;
    contractSignedAt?: number;
  }
): Promise<Id<"vendors">> {
  const { vendorId, ...updates } = args;

  await ctx.db.patch(vendorId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return vendorId;
}

export async function removeVendor(
  ctx: MutationCtx,
  args: { vendorId: Id<"vendors"> }
): Promise<Id<"vendors">> {
  await ctx.db.patch(args.vendorId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return args.vendorId;
}

// ============================================================================
// CONVEX API HANDLERS
// ============================================================================

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    pricing: v.optional(v.any()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    reviewSource: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    roomId: v.optional(v.id("rooms")),
    status: v.optional(v.string()),
    aiMetadata: v.optional(v.any()),
    addedBy: v.id("users"),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => createVendor(ctx, args),
});

// GET
export const get = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => getVendor(ctx, args),
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => listVendorsByEvent(ctx, args),
});

// LIST BY ROOM
export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => listVendorsByRoom(ctx, args),
});

// SEARCH by category
export const searchByCategory = query({
  args: {
    category: v.string(),
    minRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => searchVendorsByCategory(ctx, args),
});

// UPDATE
export const update = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    pricing: v.optional(v.any()),
    contractUrl: v.optional(v.string()),
    contractSignedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => updateVendor(ctx, args),
});

// DELETE
export const deleteVendor = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => removeVendor(ctx, args),
});
