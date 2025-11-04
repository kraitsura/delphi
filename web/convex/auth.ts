import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";

const siteUrl = process.env.SITE_URL!;

// Create the auth component client
export const authComponent = createClient<DataModel>(components.betterAuth);

// Create Better Auth instance
export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Disabled for development
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [convex()], // Required for Convex integration
    hooks: {
      after: createAuthMiddleware(async (hookCtx) => {
        // Create extended profile after signup (email or OAuth)
        if (hookCtx.path.startsWith("/sign-up")) {
          const newSession = hookCtx.context.newSession;
          if (newSession?.user) {
            const user = newSession.user;
            // Check if profile already exists
            const existing = await ctx.db
              .query("users")
              .withIndex("by_email", (q) => q.eq("email", user.email))
              .first();

            if (!existing) {
              // Create extended profile
              await ctx.db.insert("users", {
                email: user.email,
                name: user.name,
                role: "collaborator", // Default role for new users
                preferences: {
                  notifications: true,
                  theme: "light",
                  timezone: "UTC",
                },
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now(),
              });
            }
          }
        }
      }),
    },
  });
};

// Helper query to get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Helper query to get current user's extended profile
// NOTE: Profile creation happens via createOrUpdateProfile mutation
// Frontend should call createOrUpdateProfile after signup to ensure profile exists
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    // Get Better Auth user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    // Get extended profile from users table
    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    // If profile doesn't exist, user needs to call createOrUpdateProfile
    // This will be handled by the frontend after signup/signin
    return profile;
  },
});
