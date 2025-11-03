import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

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
      after: [
        {
          matcher: (context) => {
            // Trigger on any signup event (email/password or OAuth)
            return context.action === "signUp.email" || context.action === "signUp.social";
          },
          handler: async (context) => {
            // Extended profile creation is handled by createOrUpdateProfile mutation
            // which should be called from the frontend after signup completes
            console.log("User signed up:", context.user?.email);
          },
        },
      ],
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
