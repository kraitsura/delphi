/**
 * User Profile Management
 *
 * Handles CRUD operations for extended user profiles
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Internal mutation called by Better Auth trigger on user creation
 * Creates user profile automatically when Better Auth user is created
 */
export const createUserProfile = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists (idempotent)
    const existingProfile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingProfile) {
      console.log(`Profile already exists for ${args.email}, skipping creation`);
      return existingProfile._id;
    }

    // Create new extended profile
    const profileId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name || args.email.split("@")[0],
      avatar: args.image || undefined,
      role: "guest", // Default role for new users
      preferences: {
        notifications: true,
        themeSet: "default", // Monochrome theme
        accent: "amber", // Warm amber accent
        themeMode: "light", // Light mode by default
        timezone: "UTC", // Default to UTC, user can update later
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
      isActive: true,
    });

    console.log(`Created user profile for ${args.email} with ID ${profileId}`);
    return profileId;
  },
});

/**
 * Create or update extended user profile
 * Note: Profile is automatically created via Better Auth onCreate trigger
 * This function serves as a fallback for existing users or manual profile updates
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
        themeSet: "default", // Monochrome theme
        accent: "amber", // Warm amber accent
        themeMode: "light", // Light mode by default
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
          v.literal("redwood"),
          v.literal("flare"),
          v.literal("ocean"),
          v.literal("twilight"),
          v.literal("moss")
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
      v.literal("redwood"),
      v.literal("flare"),
      v.literal("ocean"),
      v.literal("twilight"),
      v.literal("moss")
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

    // Use search index for efficient name search
    // Note: This searches by name only. For email search, consider adding a separate search index.
    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm).eq("isActive", true)
      )
      .take(limit);

    // Return public fields
    return results.map((user) => ({
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
