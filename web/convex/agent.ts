/**
 * Agent System Functions - Direct Access Architecture
 *
 * ARCHITECTURE UPDATE (v0.2.0):
 * Frontend → Worker (with Convex token) → DO → AI → Convex
 *
 * Phase 1: Direct Worker access (no Convex action hop)
 * - Frontend calls Worker directly with Convex auth token
 * - Worker validates token using Convex client
 * - Worker fetches context data from Convex
 * - Worker saves responses back to Convex
 *
 * Benefits:
 * - 2 fewer hops (faster response time)
 * - Simpler architecture
 * - Better security (token validation at Worker)
 * - Type-safe Convex queries in Worker
 *
 * Phase 2+: Will add specialized agents, pattern detection, etc.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==========================================
// NOTE: No invokeAgent ACTION needed!
// ==========================================
//
// In the direct access architecture, the frontend calls
// the Worker directly, not via a Convex action.
//
// Frontend code example:
// ```typescript
// const token = await convex.auth.getToken();
// const response = await fetch(`${WORKER_URL}/api/agent/invoke`, {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${token}`,
//   },
//   body: JSON.stringify({
//     roomId,
//     eventId,
//     message,
//   }),
// });
// ```
//
// The Worker will:
// 1. Validate the token using Convex client
// 2. Fetch user and context data from Convex
// 3. Process with AI
// 4. Save response using saveResponse mutation below
// ==========================================

// ==========================================
// MUTATIONS (Worker → Convex)
// ==========================================

/**
 * Save Agent Response - Called by Worker via HTTP action
 * Stores agent response in messages and agentResponses tables
 */
export const saveResponse = mutation({
  args: {
    roomId: v.id("rooms"),
    eventId: v.id("events"),
    text: v.string(),
    metadata: v.object({
      invokedBy: v.id("users"),
      userMessage: v.string(),
      timestamp: v.optional(v.number()),
      messagesFetched: v.optional(v.number()),
      conversationTurns: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Save to messages table as agent message
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: args.metadata.invokedBy,
      text: args.text,
      isAIGenerated: true,
      isEdited: false,
      isDeleted: false,
      aiIntentDetected: "agent_invocation",
      createdAt: Date.now(),
    });

    // Save to agentResponses table for tracking
    await ctx.db.insert("agentResponses", {
      roomId: args.roomId,
      eventId: args.eventId,
      invokedBy: args.metadata.invokedBy,
      userMessage: args.metadata.userMessage || "",
      agentResponse: args.text,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    // Update or create agent state
    const existingState = await ctx.db
      .query("agentState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (existingState) {
      await ctx.db.patch(existingState._id, {
        lastInvoked: Date.now(),
        invocationCount: existingState.invocationCount + 1,
      });
    } else {
      await ctx.db.insert("agentState", {
        roomId: args.roomId,
        doInstanceId: `room-${args.roomId}`,
        lastInvoked: Date.now(),
        invocationCount: 1,
      });
    }

    return messageId;
  },
});

// ==========================================
// QUERIES (Read agent data)
// ==========================================

/**
 * Get agent responses for a room
 */
export const getResponses = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const responses = await ctx.db
      .query("agentResponses")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);

    return responses.reverse();
  },
});

/**
 * Get agent state for a room
 */
export const getState = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentState")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
  },
});

// ==========================================
// BATCH SYNC (EventOrchestratorDO State Sync)
// ==========================================

/**
 * Validator for state changes from EventOrchestratorDO
 */
const stateChangeValidator = v.object({
  table: v.union(v.literal("tasks"), v.literal("expenses"), v.literal("vendors")),
  operation: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
  id: v.optional(v.string()),
  data: v.optional(v.any()),
});

/**
 * Batch Sync Mutation - Syncs state changes from EventOrchestratorDO
 * Used by Durable Objects to batch sync their state changes to Convex
 */
export const batchSync = mutation({
  args: {
    eventId: v.id("events"),
    changes: v.array(stateChangeValidator),
  },
  handler: async (ctx, { eventId, changes }) => {
    // Verify event exists
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const results: Array<{ index: number; success: boolean; id?: string; error?: string }> = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];

      try {
        switch (change.operation) {
          case "create":
            const newId = await ctx.db.insert(change.table as any, {
              ...change.data,
              eventId,
              createdAt: Date.now(),
            });
            results.push({ index: i, success: true, id: newId });
            break;

          case "update":
            if (!change.id) throw new Error("Missing id for update");
            await ctx.db.patch(change.id as any, {
              ...change.data,
              updatedAt: Date.now(),
            });
            results.push({ index: i, success: true, id: change.id });
            break;

          case "delete":
            if (!change.id) throw new Error("Missing id for delete");
            await ctx.db.patch(change.id as any, {
              deletedAt: Date.now(),
            });
            results.push({ index: i, success: true, id: change.id });
            break;
        }
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Update event's lastSyncedAt
    await ctx.db.patch(eventId, {
      lastSyncedAt: Date.now(),
    } as any);

    return {
      eventId,
      processed: changes.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

/**
 * Get Sync State - Returns sync metadata and entity counts for an event
 * Used by EventOrchestratorDO to check current state
 */
export const getSyncState = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) return null;

    // Get counts for each table
    const [taskCount, expenseCount, vendorCount] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect()
        .then((t) => t.length),
      ctx.db
        .query("expenses")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect()
        .then((e) => e.length),
      ctx.db
        .query("vendors")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect()
        .then((v) => v.length),
    ]);

    return {
      eventId,
      lastSyncedAt: (event as any).lastSyncedAt || 0,
      counts: {
        tasks: taskCount,
        expenses: expenseCount,
        vendors: vendorCount,
      },
    };
  },
});
