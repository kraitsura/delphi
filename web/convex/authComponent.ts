import { createClient, type AuthFunctions } from "@convex-dev/better-auth";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

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
