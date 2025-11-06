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

		// Check and consume rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "demoAction", {
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
