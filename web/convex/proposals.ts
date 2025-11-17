/**
 * Proposals CRUD Operations
 * Track 1: Proposal System Foundation
 *
 * Handles AI-generated proposals for batch operations.
 * When agent detects multi-create scenarios (e.g., "Create tasks for photographer, caterer, DJ"),
 * it returns a proposal for user review instead of executing immediately.
 */

import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  getAuthenticatedUser,
  requireRoomAccess,
  requireEventMember,
} from "./authHelpers";
import { createTask } from "./tasks";
import { createExpense } from "./expenses";
import { createVendor } from "./vendors";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create a new proposal
 * Called by the agent when it detects multi-create scenarios
 */
export async function createProposal(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    roomId: Id<"rooms">;
    proposalType: "tasks" | "budget_entries" | "vendor_suggestions" | "venue_suggestions";
    items: Array<{
      type: string;
      data: any;
      reasoning?: string;
    }>;
    messageId?: Id<"messages">;
    aiMetadata?: {
      intent: string;
      confidence: number;
      agentType: string;
      reasoning?: string;
    };
    createdBy: Id<"users">;
  }
): Promise<Id<"proposals">> {
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes expiration

  const proposalId = await ctx.db.insert("proposals", {
    eventId: args.eventId,
    roomId: args.roomId,
    proposalType: args.proposalType,
    items: args.items,
    status: "pending",
    messageId: args.messageId,
    expiresAt,
    aiMetadata: args.aiMetadata,
    createdBy: args.createdBy,
    createdAt: now,
  });

  return proposalId;
}

/**
 * Get a proposal by ID with validation
 */
export async function getProposal(
  ctx: QueryCtx,
  args: { proposalId: Id<"proposals"> }
) {
  const proposal = await ctx.db.get(args.proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  // Check if expired
  const now = Date.now();
  if (proposal.status === "pending" && proposal.expiresAt < now) {
    // Note: Can't update in a query, but we can return the expired status
    return { ...proposal, status: "expired" as const };
  }

  return proposal;
}

/**
 * List proposals by room
 */
export async function listProposalsByRoom(
  ctx: QueryCtx,
  args: {
    roomId: Id<"rooms">;
    includeExpired?: boolean;
  }
) {
  const now = Date.now();

  const proposals = await ctx.db
    .query("proposals")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .order("desc")
    .collect();

  if (!args.includeExpired) {
    return proposals.filter((p) => {
      if (p.status !== "pending") return true;
      return p.expiresAt >= now;
    });
  }

  return proposals;
}

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Confirm a proposal (accept/edit/reject)
 * This is the main user action on proposals
 */
export const confirm = mutation({
  args: {
    proposalId: v.id("proposals"),
    action: v.union(
      v.literal("accept_all"),
      v.literal("edit"),
      v.literal("reject")
    ),
    editedItems: v.optional(
      v.array(
        v.object({
          type: v.string(),
          data: v.any(),
          reasoning: v.optional(v.string()),
        })
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get the proposal
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    // Check if expired
    const now = Date.now();
    if (proposal.expiresAt < now && proposal.status === "pending") {
      await ctx.db.patch(args.proposalId, {
        status: "expired",
      });
      throw new Error("Proposal has expired");
    }

    // Check if already processed
    if (proposal.status !== "pending") {
      // Idempotency check: If already processed, return existing entities
      const existingTasks = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("sourceProposalId"), args.proposalId))
        .collect();

      const existingExpenses = await ctx.db
        .query("expenses")
        .filter((q) => q.eq(q.field("sourceProposalId"), args.proposalId))
        .collect();

      const existingVendors = await ctx.db
        .query("vendors")
        .filter((q) => q.eq(q.field("sourceProposalId"), args.proposalId))
        .collect();

      const createdEntities = [
        ...existingTasks.map((t) => ({ type: "task", id: t._id, itemIndex: 0 })),
        ...existingExpenses.map((e) => ({ type: "expense", id: e._id, itemIndex: 0 })),
        ...existingVendors.map((v) => ({ type: "vendor", id: v._id, itemIndex: 0 })),
      ];

      return {
        success: true,
        proposalId: args.proposalId,
        createdEntities,
        failedEntities: [],
        message: `Proposal already ${proposal.status}. Returning existing entities.`,
        isIdempotent: true,
      };
    }

    // Verify user has access to the room
    await requireRoomAccess(ctx, proposal.roomId, userProfile._id);

    // Verify user is an event member
    await requireEventMember(ctx, proposal.eventId, userProfile._id);

    // Update proposal status based on action
    let newStatus: "accepted" | "rejected";
    let itemsToExecute: typeof proposal.items;

    if (args.action === "reject") {
      newStatus = "rejected";
      itemsToExecute = [];
    } else if (args.action === "accept_all") {
      newStatus = "accepted";
      itemsToExecute = proposal.items;
    } else {
      // edit
      if (!args.editedItems || args.editedItems.length === 0) {
        throw new Error("Edited items must be provided for edit action");
      }
      newStatus = "accepted";
      itemsToExecute = args.editedItems;
    }

    // Update the proposal
    await ctx.db.patch(args.proposalId, {
      status: newStatus,
      reviewedBy: userProfile._id,
      reviewedAt: now,
      acceptanceNotes: args.notes,
    });

    // If accepted, execute the proposal items
    if (newStatus === "accepted" && itemsToExecute.length > 0) {
      const createdEntities: Array<{
        type: string;
        id: Id<"tasks"> | Id<"expenses"> | Id<"vendors">;
        itemIndex: number;
      }> = [];

      const failedEntities: Array<{
        type: string;
        itemIndex: number;
        error: string;
      }> = [];

      // Execute all items in parallel with graceful error handling
      const results = await Promise.allSettled(
        itemsToExecute.map(async (item, index) => {
          if (item.type === "task") {
            const taskId = await createTask(ctx, {
              ...item.data,
              eventId: proposal.eventId,
              roomId: proposal.roomId,
              sourceMessageId: proposal.messageId,
              sourceProposalId: args.proposalId, // Add traceability
            });
            return { type: "task", id: taskId, itemIndex: index };
          } else if (item.type === "expense") {
            const expenseId = await createExpense(ctx, {
              ...item.data,
              eventId: proposal.eventId,
              roomId: proposal.roomId,
              paidBy: userProfile._id,
              createdBy: userProfile._id,
              sourceMessageId: proposal.messageId,
              sourceProposalId: args.proposalId, // Add traceability
              status: item.data.status || "pending", // Default to pending if not specified
            });
            return { type: "expense", id: expenseId, itemIndex: index };
          } else if (item.type === "vendor" || item.type === "venue") {
            // Filter out null values to avoid schema validation errors
            const cleanedData = Object.fromEntries(
              Object.entries(item.data).filter(([_, value]) => value !== null)
            ) as any;
            const vendorId = await createVendor(ctx, {
              ...cleanedData,
              eventId: proposal.eventId,
              roomId: proposal.roomId,
              addedBy: userProfile._id,
              sourceMessageId: proposal.messageId,
              sourceProposalId: args.proposalId, // Add traceability
            });
            return { type: item.type, id: vendorId, itemIndex: index };
          }
          throw new Error(`Unknown item type: ${item.type}`);
        })
      );

      // Process results
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          createdEntities.push(result.value);
        } else {
          const item = itemsToExecute[index];
          failedEntities.push({
            type: item.type,
            itemIndex: index,
            error: result.reason?.message || String(result.reason),
          });
          console.error(`Failed to create ${item.type} at index ${index}:`, result.reason);
        }
      });

      // Determine overall success
      const allSucceeded = failedEntities.length === 0;
      const partialSuccess = createdEntities.length > 0 && failedEntities.length > 0;

      return {
        success: allSucceeded,
        partialSuccess,
        proposalId: args.proposalId,
        createdEntities,
        failedEntities,
        message: allSucceeded
          ? `Successfully created ${createdEntities.length} ${
              proposal.proposalType === "tasks"
                ? "tasks"
                : proposal.proposalType === "budget_entries"
                ? "expenses"
                : proposal.proposalType === "venue_suggestions"
                ? "venues"
                : "vendors"
            }`
          : partialSuccess
          ? `Created ${createdEntities.length} items, but ${failedEntities.length} failed`
          : `Failed to create all ${failedEntities.length} items`,
      };
    }

    return {
      success: true,
      proposalId: args.proposalId,
      createdEntities: [],
      message: "Proposal rejected",
    };
  },
});

/**
 * Create a proposal (called by agent)
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    proposalType: v.union(
      v.literal("tasks"),
      v.literal("budget_entries"),
      v.literal("vendor_suggestions"),
      v.literal("venue_suggestions")
    ),
    items: v.array(
      v.object({
        type: v.string(),
        data: v.any(),
        reasoning: v.optional(v.string()),
      })
    ),
    messageId: v.optional(v.id("messages")),
    aiMetadata: v.optional(
      v.object({
        intent: v.string(),
        confidence: v.number(),
        agentType: v.string(),
        reasoning: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user has access to the room
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

    // Verify user is an event member
    await requireEventMember(ctx, args.eventId, userProfile._id);

    return await createProposal(ctx, {
      ...args,
      createdBy: userProfile._id,
    });
  },
});

/**
 * Expire old pending proposals
 * This should be called periodically or on-demand
 */
export const expireOldProposals = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const pendingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) =>
        q.eq("eventId", undefined as any).eq("status", "pending")
      )
      .collect();

    let expiredCount = 0;

    for (const proposal of pendingProposals) {
      if (proposal.expiresAt < now && proposal.status === "pending") {
        await ctx.db.patch(proposal._id, {
          status: "expired",
        });
        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

// ==========================================
// QUERIES
// ==========================================

/**
 * Get a single proposal by ID
 */
export const getById = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const proposal = await getProposal(ctx, args);

    // Verify user has access to the room
    await requireRoomAccess(ctx, proposal.roomId, userProfile._id);

    return proposal;
  },
});

/**
 * List proposals for a room
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user has access to the room
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

    return await listProposalsByRoom(ctx, args);
  },
});

/**
 * List pending proposals for an event
 */
export const listPendingByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is an event member
    await requireEventMember(ctx, args.eventId, userProfile._id);

    const now = Date.now();

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    // Filter out expired proposals
    return proposals.filter((p) => p.expiresAt >= now);
  },
});
