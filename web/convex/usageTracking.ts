import { mutation, query, internalMutation } from "./_generated/server";
import { authComponent } from "./authComponent";

/**
 * Helper function to get the start of the current week (Monday 00:00 UTC)
 */
function getCurrentWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to days from Monday

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);

  return monday.getTime();
}

/**
 * Free plan weekly limit
 */
const FREE_PLAN_WEEKLY_LIMIT = 10;

/**
 * Check user's quota status
 * Returns current usage, limit, and whether they can invoke the agent
 */
export const checkQuota = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Get user's plan from Convex users table (linked by email)
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const plan = user.plan || "free"; // Default to free if not set

    // Unlimited plan has no restrictions
    if (plan === "unlimited") {
      return {
        allowed: true,
        used: 0,
        limit: null,
        plan: "unlimited",
      };
    }

    // Free plan: check weekly usage
    const weekStart = getCurrentWeekStart();
    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", user._id).eq("weekStart", weekStart)
      )
      .first();

    const used = usageRecord?.agentInvocations || 0;
    const allowed = used < FREE_PLAN_WEEKLY_LIMIT;

    return {
      allowed,
      used,
      limit: FREE_PLAN_WEEKLY_LIMIT,
      plan: "free",
    };
  },
});

/**
 * Increment user's usage count after successful agent invocation
 */
export const incrementUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Get user's plan from Convex users table (linked by email)
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const plan = user.plan || "free";

    // Only track usage for free plan users
    if (plan === "unlimited") {
      return { success: true, tracked: false };
    }

    const weekStart = getCurrentWeekStart();
    const now = Date.now();

    // Find or create usage record for current week
    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", user._id).eq("weekStart", weekStart)
      )
      .first();

    if (usageRecord) {
      // Update existing record
      await ctx.db.patch(usageRecord._id, {
        agentInvocations: usageRecord.agentInvocations + 1,
        updatedAt: now,
      });
    } else {
      // Create new record for this week
      await ctx.db.insert("usageTracking", {
        userId: user._id,
        weekStart,
        agentInvocations: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, tracked: true };
  },
});

/**
 * Get user's current usage for display
 */
export const getCurrentUsage = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!user) {
      return null;
    }

    const plan = user.plan || "free";

    if (plan === "unlimited") {
      return {
        plan: "unlimited",
        used: 0,
        limit: null,
        remaining: null,
      };
    }

    const weekStart = getCurrentWeekStart();
    const usageRecord = await ctx.db
      .query("usageTracking")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", user._id).eq("weekStart", weekStart)
      )
      .first();

    const used = usageRecord?.agentInvocations || 0;
    const remaining = Math.max(0, FREE_PLAN_WEEKLY_LIMIT - used);

    return {
      plan: "free",
      used,
      limit: FREE_PLAN_WEEKLY_LIMIT,
      remaining,
    };
  },
});

/**
 * Internal mutation to reset weekly usage
 * Called by cron job every Monday at 00:00 UTC
 *
 * Note: We don't actually need to delete old records since the getCurrentWeekStart()
 * function ensures we only look at the current week's data. Old records will naturally
 * become irrelevant. However, we could add cleanup logic here in the future if needed.
 */
export const resetWeeklyUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get the start of last week (the week that just ended)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const lastWeekMonday = new Date(now);
    lastWeekMonday.setUTCDate(now.getUTCDate() - daysFromMonday - 7);
    lastWeekMonday.setUTCHours(0, 0, 0, 0);

    const lastWeekStart = lastWeekMonday.getTime();

    // Archive old usage records (older than 4 weeks)
    const fourWeeksAgo = lastWeekStart - (4 * 7 * 24 * 60 * 60 * 1000);

    const oldRecords = await ctx.db
      .query("usageTracking")
      .filter((q) => q.lt(q.field("weekStart"), fourWeeksAgo))
      .collect();

    // Delete old records to keep database clean
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    console.log(`Weekly reset: Archived ${oldRecords.length} old usage records`);

    return {
      success: true,
      archivedRecords: oldRecords.length,
    };
  },
});
