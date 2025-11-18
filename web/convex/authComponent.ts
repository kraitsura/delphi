import { createClient } from "@convex-dev/better-auth";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";

// Create the auth component client WITHOUT onCreate trigger
// Profile creation is handled by the ProfileCreator component in _authed.tsx
// This avoids the circular dependency that was causing "Cannot access 'I' before initialization" in production
export const authComponent = createClient<DataModel>(
  components.betterAuth,
  {
    // No triggers or authFunctions - this avoids circular dependencies entirely
    // User profile creation is handled by ProfileCreator component after authentication
  }
);

// Export triggers API (required for Better Auth Convex component)
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();