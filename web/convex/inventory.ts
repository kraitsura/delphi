import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new inventory item
 */
export async function createInventoryItem(
  ctx: MutationCtx,
  args: {
    name: string;
    description?: string;
    category: string;
    eventId: Id<"events">;
    vendorId?: Id<"vendors">;
    quantity: number;
    unit: string;
    acquisitionType: string;
    rentalDetails?: any;
    costPerUnit: number;
    totalCost: number;
    expenseId?: Id<"expenses">;
    status?: string;
    conditionNotes?: string;
    photoUrl?: string;
    storageLocation?: string;
    createdBy: Id<"users">;
  }
): Promise<Id<"inventory">> {
  const now = Date.now();

  const inventoryId = await ctx.db.insert("inventory", {
    ...args,
    status: (args.status || "ordered") as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  return inventoryId;
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(
  ctx: QueryCtx,
  inventoryId: Id<"inventory">
) {
  return await ctx.db.get(inventoryId);
}

/**
 * List inventory items for an event with optional filters
 */
export async function listInventoryByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    category?: string;
    status?: string;
  }
) {
  let query = ctx.db
    .query("inventory")
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

/**
 * Update general inventory item fields
 */
export async function updateInventoryItem(
  ctx: MutationCtx,
  args: {
    inventoryId: Id<"inventory">;
    name?: string;
    description?: string;
    quantity?: number;
    costPerUnit?: number;
    totalCost?: number;
    storageLocation?: string;
    conditionNotes?: string;
  }
): Promise<Id<"inventory">> {
  const { inventoryId, ...updates } = args;

  await ctx.db.patch(inventoryId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return inventoryId;
}

/**
 * Soft delete an inventory item
 */
export async function removeInventoryItem(
  ctx: MutationCtx,
  inventoryId: Id<"inventory">
): Promise<Id<"inventory">> {
  await ctx.db.patch(inventoryId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return inventoryId;
}

/**
 * Get rentals due for return within a specified timeframe
 */
export async function getRentalsDueForReturnHelper(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    daysAhead?: number;
  }
) {
  const now = Date.now();
  const daysAhead = args.daysAhead || 7;
  const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

  // Get all rentals for the event
  const allInventory = await ctx.db
    .query("inventory")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) =>
      q.and(
        q.eq(q.field("deletedAt"), undefined),
        q.eq(q.field("acquisitionType"), "rented")
      )
    )
    .collect();

  // Filter by return date (runtime filtering since we can't index nested fields)
  return allInventory
    .filter((item) => {
      if (!item.rentalDetails?.returnDate) return false;
      return item.rentalDetails.returnDate <= futureDate;
    })
    .sort((a, b) => {
      const aDate = a.rentalDetails?.returnDate || 0;
      const bDate = b.rentalDetails?.returnDate || 0;
      return aDate - bDate;
    });
}

/**
 * Update inventory item status
 */
export async function updateStatusHelper(
  ctx: MutationCtx,
  args: {
    inventoryId: Id<"inventory">;
    status: string;
    conditionNotes?: string;
  }
): Promise<Id<"inventory">> {
  const { inventoryId, ...updates } = args;

  await ctx.db.patch(inventoryId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return inventoryId;
}

// ============================================================================
// MUTATION & QUERY HANDLERS
// ============================================================================

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    quantity: v.number(),
    unit: v.string(),
    acquisitionType: v.string(),
    rentalDetails: v.optional(v.any()),
    costPerUnit: v.number(),
    totalCost: v.number(),
    expenseId: v.optional(v.id("expenses")),
    status: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await createInventoryItem(ctx, args);
  },
});

// GET
export const get = query({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, args) => {
    return await getInventoryItem(ctx, args.inventoryId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await listInventoryByEvent(ctx, args);
  },
});

// GET RENTALS DUE FOR RETURN
export const getRentalsDueForReturn = query({
  args: {
    eventId: v.id("events"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await getRentalsDueForReturnHelper(ctx, args);
  },
});

// UPDATE STATUS
export const updateStatus = mutation({
  args: {
    inventoryId: v.id("inventory"),
    status: v.string(),
    conditionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await updateStatusHelper(ctx, args);
  },
});

// UPDATE
export const update = mutation({
  args: {
    inventoryId: v.id("inventory"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    quantity: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    storageLocation: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await updateInventoryItem(ctx, args);
  },
});

// DELETE
export const deleteInventoryItem = mutation({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, args) => {
    return await removeInventoryItem(ctx, args.inventoryId);
  },
});
