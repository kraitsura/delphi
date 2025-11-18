/**
 * Auth Triggers
 *
 * Separate file for auth trigger handlers to avoid circular dependencies
 * These are called by Better Auth when auth events occur
 */

import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// onCreate trigger - called when a new user is created
export const onCreate = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This will be called by Better Auth when a user is created
    // The actual user creation logic is handled by Better Auth
    // We just need to create the extended profile here
    console.log("[Auth Trigger] onCreate handler called");
  },
});

// onUpdate trigger - called when a user is updated
export const onUpdate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Auth Trigger] onUpdate handler called");
  },
});

// onDelete trigger - called when a user is deleted
export const onDelete = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Auth Trigger] onDelete handler called");
  },
});