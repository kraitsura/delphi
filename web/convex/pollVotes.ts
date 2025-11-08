import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventMember,
} from "./authHelpers";

/**
 * List all votes for a poll
 */
export const listByPoll = query({
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

    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_and_deleted", (q) =>
        q.eq("pollId", args.pollId).eq("isDeleted", false)
      )
      .collect();

    return votes;
  },
});

/**
 * Get a user's vote for a specific poll
 */
export const getByUserAndPoll = query({
  args: {
    pollId: v.id("polls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    const vote = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_and_user", (q) =>
        q.eq("pollId", args.pollId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    return vote ?? null;
  },
});

/**
 * Cast or update a vote on a poll
 */
export const cast = mutation({
  args: {
    pollId: v.id("polls"),
    optionIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const poll = await ctx.db.get(args.pollId);
    if (!poll || poll.isDeleted) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    // Check if poll is closed
    if (poll.isClosed) {
      throw new Error("This poll is closed");
    }

    // Check if deadline has passed
    if (poll.deadline && poll.deadline < Date.now()) {
      throw new Error("The deadline for this poll has passed");
    }

    // Validate: if multiple choices not allowed, ensure only one option
    if (!poll.allowMultipleChoices && args.optionIds.length > 1) {
      throw new Error("This poll only allows selecting one option");
    }

    // Validate: all option IDs are valid
    const validOptionIds = poll.options.map((opt) => opt.id);
    for (const optionId of args.optionIds) {
      if (!validOptionIds.includes(optionId)) {
        throw new Error(`Invalid option ID: ${optionId}`);
      }
    }

    // Check if user has already voted
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_and_user", (q) =>
        q.eq("pollId", args.pollId).eq("userId", userProfile._id)
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    const now = Date.now();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        optionIds: args.optionIds,
        updatedAt: now,
      });
      return existingVote._id;
    } else {
      // Create new vote
      const voteId = await ctx.db.insert("pollVotes", {
        pollId: args.pollId,
        userId: userProfile._id,
        optionIds: args.optionIds,
        createdAt: now,
        isDeleted: false,
      });
      return voteId;
    }
  },
});

/**
 * Remove a vote from a poll
 */
export const remove = mutation({
  args: {
    voteId: v.id("pollVotes"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const vote = await ctx.db.get(args.voteId);
    if (!vote || vote.isDeleted) {
      throw new Error("Vote not found");
    }

    // Only allow users to remove their own votes
    if (vote.userId !== userProfile._id) {
      throw new Error("You can only remove your own votes");
    }

    const poll = await ctx.db.get(vote.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    await requireEventMember(ctx, poll.eventId, userProfile._id);

    await ctx.db.patch(args.voteId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return vote.pollId;
  },
});
