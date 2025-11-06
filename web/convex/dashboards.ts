import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./authHelpers";

/**
 * Convex CRUD Operations for Fluid UI Dashboards
 */

/**
 * Create dashboard configuration
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    config: v.any(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const dashboardId = await ctx.db.insert("dashboards", {
      eventId: args.eventId,
      userId: userProfile._id,
      config: args.config,
      name: args.name,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    });

    return dashboardId;
  },
});

/**
 * Get dashboard by ID
 */
export const getById = query({
  args: { dashboardId: v.id("dashboards") },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const dashboard = await ctx.db.get(args.dashboardId);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    // Verify user has access
    if (dashboard.userId !== userProfile._id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    return dashboard;
  },
});

/**
 * List user's dashboards
 */
export const listUserDashboards = query({
  args: { eventId: v.optional(v.id("events")) },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    let query = ctx.db
      .query("dashboards")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .filter((q) => q.eq(q.field("isActive"), true));

    const dashboards = await query.collect();

    if (args.eventId) {
      return dashboards.filter((d) => d.eventId === args.eventId);
    }

    return dashboards;
  },
});

/**
 * Update dashboard configuration
 */
export const update = mutation({
  args: {
    dashboardId: v.id("dashboards"),
    config: v.optional(v.any()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const dashboard = await ctx.db.get(args.dashboardId);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    if (dashboard.userId !== userProfile._id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    await ctx.db.patch(args.dashboardId, {
      ...(args.config && { config: args.config }),
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.dashboardId);
  },
});

/**
 * Delete dashboard (soft delete)
 */
export const remove = mutation({
  args: { dashboardId: v.id("dashboards") },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const dashboard = await ctx.db.get(args.dashboardId);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    if (dashboard.userId !== userProfile._id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    await ctx.db.patch(args.dashboardId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});
