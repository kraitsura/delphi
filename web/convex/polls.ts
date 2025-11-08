import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * List all polls for an event (excluding deleted)
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    const polls = await ctx.db
      .query("polls")
      .withIndex("by_event_and_deleted", (q) =>
        q.eq("eventId", args.eventId).eq("isDeleted", false)
      )
      .collect();

    return polls;
  },
});

/**
 * Get a single poll by ID with vote counts
 */
export const getById = query({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    return poll;
  },
});

/**
 * Create a new poll
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    question: v.string(),
    options: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        description: v.optional(v.string()),
      })
    ),
    allowMultipleChoices: v.optional(v.boolean()),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireEventMember(ctx, args.eventId, userProfile._id);

    // Validate: must have at least 2 options
    if (args.options.length < 2) {
      throw new Error("Poll must have at least 2 options");
    }

    const now = Date.now();

    const pollId = await ctx.db.insert("polls", {
      eventId: args.eventId,
      roomId: args.roomId,
      question: args.question,
      options: args.options,
      allowMultipleChoices: args.allowMultipleChoices ?? false,
      deadline: args.deadline,
      isClosed: false,
      createdAt: now,
      createdBy: userProfile._id,
      isDeleted: false,
    });

    return pollId;
  },
});

/**
 * Close a poll (prevent further voting)
 */
export const close = mutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    await ctx.db.patch(args.pollId, {
      isClosed: true,
      closedAt: Date.now(),
    });

    return poll.eventId;
  },
});

/**
 * Reopen a poll
 */
export const reopen = mutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    await ctx.db.patch(args.pollId, {
      isClosed: false,
      closedAt: undefined,
    });

    return poll.eventId;
  },
});

/**
 * Soft delete a poll
 */
export const remove = mutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    await ctx.db.patch(args.pollId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return poll.eventId;
  },
});
