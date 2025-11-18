import { createClient, type AuthFunctions } from "@convex-dev/better-auth";
import { DataModel } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";

// Create the auth component client with inline triggers
// We define triggers inline to keep user creation logic in one place
// AuthFunctions reference will be lazily evaluated to avoid circular dependency
export const authComponent = createClient<DataModel>(
  components.betterAuth,
  {
    // Use a getter to lazily evaluate authFunctions
    // This avoids accessing internal.authTriggers at module initialization time
    get authFunctions(): AuthFunctions {
      return internal.authTriggers;
    },
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