import { createClient } from "@convex-dev/better-auth";
import { DataModel } from "./_generated/dataModel";

// IMPORTANT: We don't import from _generated/api at the top level
// to avoid circular dependency issues in production bundling

// Lazy-load the components to break circular dependency
function getComponents() {
  // Using require() instead of import() for synchronous loading
  // This is evaluated at runtime, not at module initialization
  const api = require("./_generated/api");
  return api.components;
}

// Create the auth component client
// components.betterAuth is accessed via getter, not at module load time
export const authComponent = createClient<DataModel>(
  getComponents().betterAuth,
  {
    // No authFunctions needed - triggers are defined inline
    triggers: {
      user: {
        onCreate: async (ctx, user) => {
          // Lazy import 'internal' only when the trigger executes
          // This avoids the circular dependency initialization issue in production
          const { internal } = await import("./_generated/api");

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