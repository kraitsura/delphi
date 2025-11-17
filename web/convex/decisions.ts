import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// HELPER FUNCTIONS

export async function createDecision(
  ctx: MutationCtx,
  args: {
    question: string;
    description?: string;
    eventId: Id<"events">;
    roomId: Id<"rooms">;
    type: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      voters: Id<"users">[];
    }>;
    createdBy: Id<"users">;
    sourceMessageId?: Id<"messages">;
    suggestedByAI: boolean;
    aiReasoning?: string;
  }
): Promise<Id<"decisions">> {
  const now = Date.now();

  const decisionId = await ctx.db.insert("decisions", {
    ...args,
    status: "active" as any,
    createdAt: now,
  } as any);

  return decisionId;
}

export async function getDecision(
  ctx: QueryCtx,
  args: { decisionId: Id<"decisions"> }
) {
  return await ctx.db.get(args.decisionId);
}

export async function listDecisionsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    status?: string;
  }
) {
  let query = ctx.db
    .query("decisions")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  return await query.collect();
}

export async function listDecisionsByRoom(
  ctx: QueryCtx,
  args: {
    roomId: Id<"rooms">;
    limit?: number;
  }
) {
  return await ctx.db
    .query("decisions")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .order("desc")
    .take(args.limit || 50);
}

export async function voteOnDecision(
  ctx: MutationCtx,
  args: {
    decisionId: Id<"decisions">;
    optionId: string;
    userId: Id<"users">;
  }
): Promise<Id<"decisions">> {
  const decision = await ctx.db.get(args.decisionId);
  if (!decision) throw new Error("Decision not found");
  if (decision.status !== "active") throw new Error("Decision is not active");

  // Update the options array with the new vote
  const updatedOptions = decision.options.map((option) => {
    if (option.id === args.optionId) {
      // Check if user already voted for this option
      if (option.voters.includes(args.userId)) {
        return option; // Already voted
      }

      return {
        ...option,
        votes: option.votes + 1,
        voters: [...option.voters, args.userId],
      };
    }

    // Remove vote from other options if user voted elsewhere
    return {
      ...option,
      votes: option.voters.includes(args.userId) ? option.votes - 1 : option.votes,
      voters: option.voters.filter((id) => id !== args.userId),
    };
  });

  await ctx.db.patch(args.decisionId, {
    options: updatedOptions,
  });

  return args.decisionId;
}

export async function closeDecision(
  ctx: MutationCtx,
  args: {
    decisionId: Id<"decisions">;
    selectedOption?: string;
  }
): Promise<Id<"decisions">> {
  const decision = await ctx.db.get(args.decisionId);
  if (!decision) throw new Error("Decision not found");

  // If no option selected, pick the one with most votes
  let winningOption = args.selectedOption;
  if (!winningOption && decision.options.length > 0) {
    const sorted = [...decision.options].sort((a, b) => b.votes - a.votes);
    winningOption = sorted[0].id;
  }

  await ctx.db.patch(args.decisionId, {
    status: "closed" as any,
    selectedOption: winningOption,
    closedAt: Date.now(),
  });

  return args.decisionId;
}

export async function updateDecision(
  ctx: MutationCtx,
  args: {
    decisionId: Id<"decisions">;
    question?: string;
    description?: string;
    options?: Array<{
      id: string;
      text: string;
      votes: number;
      voters: Id<"users">[];
    }>;
  }
): Promise<Id<"decisions">> {
  const { decisionId, ...updates } = args;

  const decision = await ctx.db.get(decisionId);
  if (!decision) throw new Error("Decision not found");

  // Only allow updates if decision is active
  if (decision.status !== "active") {
    throw new Error("Cannot update closed or cancelled decision");
  }

  await ctx.db.patch(decisionId, updates as any);

  return decisionId;
}

export async function deleteDecisionHelper(
  ctx: MutationCtx,
  args: { decisionId: Id<"decisions"> }
): Promise<Id<"decisions">> {
  await ctx.db.patch(args.decisionId, {
    deletedAt: Date.now(),
  });

  return args.decisionId;
}

// API EXPORTS

// CREATE
export const create = mutation({
  args: {
    question: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    type: v.string(),
    options: v.array(v.object({
      id: v.string(),
      text: v.string(),
      votes: v.number(),
      voters: v.array(v.id("users")),
    })),
    createdBy: v.id("users"),
    sourceMessageId: v.optional(v.id("messages")),
    suggestedByAI: v.boolean(),
    aiReasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => createDecision(ctx, args),
});

// GET
export const get = query({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, args) => getDecision(ctx, args),
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => listDecisionsByEvent(ctx, args),
});

// LIST BY ROOM
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => listDecisionsByRoom(ctx, args),
});

// VOTE
export const vote = mutation({
  args: {
    decisionId: v.id("decisions"),
    optionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => voteOnDecision(ctx, args),
});

// CLOSE
export const close = mutation({
  args: {
    decisionId: v.id("decisions"),
    selectedOption: v.optional(v.string()),
  },
  handler: async (ctx, args) => closeDecision(ctx, args),
});

// UPDATE
export const update = mutation({
  args: {
    decisionId: v.id("decisions"),
    question: v.optional(v.string()),
    description: v.optional(v.string()),
    options: v.optional(v.array(v.object({
      id: v.string(),
      text: v.string(),
      votes: v.number(),
      voters: v.array(v.id("users")),
    }))),
  },
  handler: async (ctx, args) => updateDecision(ctx, args),
});

// DELETE
export const deleteDecision = mutation({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, args) => deleteDecisionHelper(ctx, args),
});
