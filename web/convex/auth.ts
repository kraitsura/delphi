import { createClient, type GenericCtx, type AuthFunctions } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

// Define auth functions reference for triggers
const authFunctions: AuthFunctions = internal.auth;

// Create the auth component client with triggers
export const authComponent = createClient<DataModel>(
  components.betterAuth,
  {
    authFunctions,
    triggers: {
      user: {
        onCreate: async (ctx, user) => {
          // Automatically create user profile when Better Auth user is created
          console.log(`[Better Auth Trigger] onCreate fired for user: ${user.email}`);

          try {
            await ctx.runMutation(internal.users.createUserProfile, {
              email: user.email,
              name: user.name || undefined,
              image: user.image || undefined,
            });
            console.log(`[Better Auth Trigger] Profile created successfully for ${user.email}`);
          } catch (error) {
            console.error(`[Better Auth Trigger] Failed to create profile for ${user.email}:`, error);
            // Don't throw - we have ProfileCreator as fallback
          }
        },
      },
    },
  }
);

// Export triggers API (required for Better Auth Convex component)
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

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
      requireEmailVerification: true, // Block sign-in until email verified
    },
    emailVerification: {
      sendOnSignUp: true, // Automatically send verification email on signup
      autoSignInAfterVerification: true, // Auto sign-in after email verification
      sendVerificationEmail: async ({ user, url }, request) => {
        // Send verification email via Resend
        // Better Auth runs in HTTP/action context, so we send email synchronously
        // using Resend's HTTP API directly
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
          console.error("RESEND_API_KEY not set");
          return;
        }

        // Modify URL to redirect to dashboard after verification
        const verificationUrl = new URL(url);
        verificationUrl.searchParams.set("callbackURL", `${siteUrl}/dashboard`);

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Delphi <noreply@delphi.kraitsura.com>",
              to: user.email,
              subject: "Verify your email - Delphi",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #4F46E5;">Welcome to Delphi!</h1>
                  <p>Hi ${user.name || "there"},</p>
                  <p>Please verify your email address to complete your registration and access your account.</p>

                  <div style="margin: 30px 0;">
                    <a href="${verificationUrl.toString()}"
                       style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Verify Email Address
                    </a>
                  </div>

                  <p style="color: #6B7280; font-size: 14px;">
                    If you didn't create an account, you can safely ignore this email.
                  </p>

                  <p style="color: #6B7280; font-size: 14px;">
                    Or copy and paste this link: <br/>
                    <a href="${verificationUrl.toString()}" style="color: #4F46E5;">${verificationUrl.toString()}</a>
                  </p>

                  <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
                  <p style="color: #9CA3AF; font-size: 12px;">
                    Delphi Event Management Platform
                  </p>
                </div>
              `,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            console.error("Failed to send verification email:", error);
          }
        } catch (error) {
          console.error("Error sending verification email:", error);
          // Don't throw - we don't want to block signup if email fails
        }
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [convex()], // Required for Convex integration
    // Note: User profile creation happens via authComponent onCreate trigger
    // The trigger fires when a Better Auth user is created and automatically
    // creates the extended user profile in the users table
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
// Profile is created automatically via onCreate trigger when Better Auth user is created
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    // Get Better Auth user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    // Get extended profile from users table
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();
  },
});
