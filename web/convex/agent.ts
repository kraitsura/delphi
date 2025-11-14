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
    metadata: v.any(),
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
        doInstanceId: `chat-${args.roomId}`,
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
