import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./authHelpers";
import { rateLimiter } from "./rateLimits";

/**
 * Demo mutation that is rate limited
 * Allows 10 requests per minute with burst capacity of 3 extra
 */
export const testAction = mutation({
	args: {},
	handler: async (ctx) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		// Check and consume rate limit (throws error if rate limited)
		await rateLimiter.limit(ctx, "demoAction", {
			key: userProfile._id,
			count: 1,
			throws: true, // Throw error if rate limited
		});

		// If we get here, rate limit passed
		return {
			success: true,
			message: "Action executed successfully!",
			timestamp: Date.now(),
		};
	},
});

/**
 * Demo mutation with session isolation support
 * Uses sessionId to create isolated rate limit buckets for testing
 */
export const testActionWithSession = mutation({
	args: {
		sessionId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		// Create isolated key using sessionId if provided
		const key = args.sessionId
			? `${userProfile._id}-session-${args.sessionId}`
			: userProfile._id;

		// Check and consume rate limit
		await rateLimiter.limit(ctx, "demoAction", {
			key,
			count: 1,
			throws: true, // Throw error if rate limited
		});

		// If we get here, rate limit passed
		return {
			success: true,
			message: "Action executed successfully!",
			timestamp: Date.now(),
			sessionId: args.sessionId,
		};
	},
});

/**
 * Query to check rate limit status without consuming tokens
 */
export const getRateLimitStatus = query({
	args: {},
	handler: async (ctx) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		const status = await rateLimiter.check(ctx, "demoAction", {
			key: userProfile._id,
		});

		return {
			ok: status.ok,
			remaining: "value" in status ? status.value : 0,
			retryAfter: status.retryAfter ?? 0,
		};
	},
});

/**
 * Query to check rate limit status with session isolation
 */
export const getRateLimitStatusWithSession = query({
	args: {
		sessionId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		// Create isolated key using sessionId if provided
		const key = args.sessionId
			? `${userProfile._id}-session-${args.sessionId}`
			: userProfile._id;

		const status = await rateLimiter.check(ctx, "demoAction", {
			key,
		});

		return {
			ok: status.ok,
			remaining: "value" in status ? status.value : 0,
			retryAfter: status.retryAfter ?? 0,
			sessionId: args.sessionId,
		};
	},
});

/**
 * Mutation to reset the rate limit for testing purposes
 */
export const resetRateLimit = mutation({
	args: {},
	handler: async (ctx) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		await rateLimiter.reset(ctx, "demoAction", {
			key: userProfile._id,
		});

		return { success: true, message: "Rate limit reset successfully!" };
	},
});

/**
 * Mutation to reset rate limit with session isolation
 */
export const resetRateLimitWithSession = mutation({
	args: {
		sessionId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { userProfile } = await getAuthenticatedUser(ctx);

		// Create isolated key using sessionId if provided
		const key = args.sessionId
			? `${userProfile._id}-session-${args.sessionId}`
			: userProfile._id;

		await rateLimiter.reset(ctx, "demoAction", {
			key,
		});

		return {
			success: true,
			message: "Rate limit reset successfully!",
			sessionId: args.sessionId,
		};
	},
});
