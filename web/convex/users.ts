/**
 * User Profile Management
 *
 * Handles CRUD operations for extended user profiles
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Create or update extended user profile
 * Should be called after user signs up via Better Auth
 */
export const createOrUpdateProfile = mutation({
  args: {},
  handler: async (ctx) => {
    // Get Better Auth user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized: No authenticated user");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (existingProfile) {
      // Update existing profile with latest auth data
      await ctx.db.patch(existingProfile._id, {
        name: authUser.name || existingProfile.name,
        avatar: authUser.image || existingProfile.avatar,
        updatedAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      return existingProfile._id;
    }

    // Create new extended profile
    const profileId = await ctx.db.insert("users", {
      email: authUser.email,
      name: authUser.name || authUser.email.split("@")[0],
      avatar: authUser.image || undefined,
      role: "guest", // Default role for new users
      preferences: {
        notifications: true,
        themeSet: "default",
        accent: "indigo",
        themeMode: "system",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
      isActive: true,
    });

    return profileId;
  },
});

/**
 * Get current user's profile
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();
  },
});

/**
 * Update current user's profile
 */
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        themeSet: v.optional(v.union(
          v.literal("default"),
          v.literal("patagonia"),
          v.literal("redwood")
        )),
        accent: v.optional(v.union(
          v.literal("indigo"),
          v.literal("rose"),
          v.literal("forest"),
          v.literal("amber"),
          v.literal("teal")
        )),
        themeMode: v.optional(v.union(
          v.literal("light"),
          v.literal("dark"),
          v.literal("system")
        )),
        // Legacy field for backwards compatibility
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
        timezone: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.avatar !== undefined && { avatar: args.avatar }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.location !== undefined && { location: args.location }),
      ...(args.preferences !== undefined && { preferences: args.preferences }),
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return profile._id;
  },
});

/**
 * Update current user's theme preferences
 * Optimized mutation for theme changes only
 */
export const updateThemePreferences = mutation({
  args: {
    themeSet: v.optional(v.union(
      v.literal("default"),
      v.literal("patagonia"),
      v.literal("redwood")
    )),
    accent: v.optional(v.union(
      v.literal("indigo"),
      v.literal("rose"),
      v.literal("forest"),
      v.literal("amber"),
      v.literal("teal")
    )),
    themeMode: v.optional(v.union(
      v.literal("light"),
      v.literal("dark"),
      v.literal("system")
    )),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get existing preferences or create defaults
    const currentPreferences = profile.preferences || {
      notifications: true,
      themeSet: "default" as const,
      accent: "indigo" as const,
      themeMode: "system" as const,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    // Update only the theme fields that are provided
    const updatedPreferences = {
      ...currentPreferences,
      ...(args.themeSet !== undefined && { themeSet: args.themeSet }),
      ...(args.accent !== undefined && { accent: args.accent }),
      ...(args.themeMode !== undefined && { themeMode: args.themeMode }),
    };

    await ctx.db.patch(profile._id, {
      preferences: updatedPreferences,
      updatedAt: Date.now(),
    });

    return profile._id;
  },
});

/**
 * Get user by ID (public fields only)
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user || !user.isActive) {
      return null;
    }

    // Return only public fields
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      location: user.location,
    };
  },
});

/**
 * Get multiple users by IDs (batch fetch for efficiency)
 */
export const getByIds = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map((id) => ctx.db.get(id))
    );

    // Filter out null/inactive users and return public fields only
    return users
      .filter((user) => user !== null && user.isActive)
      .map((user) => ({
        _id: user!._id,
        name: user!.name,
        email: user!.email,
        avatar: user!.avatar,
        role: user!.role,
        bio: user!.bio,
        location: user!.location,
      }));
  },
});

/**
 * Search users by name or email
 * Used for @mentions, room invitations, etc.
 */
export const searchByName = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    if (args.searchTerm.length < 2) {
      return []; // Require at least 2 characters
    }

    // Get all active users
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by name or email (case-insensitive)
    const searchLower = args.searchTerm.toLowerCase();
    const filtered = allUsers
      .filter((user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
      .slice(0, limit);

    // Return public fields
    return filtered.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    }));
  },
});

/**
 * Update last active timestamp
 * Call this periodically (e.g., every 5 minutes) to track user activity
 */
export const updateLastActive = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      lastActiveAt: Date.now(),
    });

    return profile._id;
  },
});

/**
 * Deactivate user account (soft delete)
 */
export const deactivate = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return profile._id;
  },
});

/**
 * Reactivate user account
 */
export const reactivate = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      isActive: true,
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return profile._id;
  },
});
