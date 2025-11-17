/**
 * Authentication and Authorization Helpers
 *
 * This file provides wrapper functions for Convex queries and mutations
 * that automatically handle authentication and role-based authorization.
 */

import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type UserRole = "coordinator" | "collaborator" | "guest" | "vendor";

export type AuthenticatedQueryCtx = QueryCtx & {
  user: NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>;
  userProfile: Doc<"users">;
};

export type AuthenticatedMutationCtx = MutationCtx & {
  user: NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>;
  userProfile: Doc<"users">;
};

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

/**
 * Get the current authenticated user and their extended profile
 * Throws an error if the user is not authenticated
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  // Get Better Auth user
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Unauthorized: No authenticated user");
  }

  // Get extended profile from users table
  const userProfile = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", authUser.email))
    .unique();

  if (!userProfile) {
    throw new Error(
      "User profile not found. Please contact support."
    );
  }

  if (!userProfile.isActive) {
    throw new Error("Account is inactive. Please contact support.");
  }

  return { user: authUser, userProfile };
}

/**
 * Get the current user if authenticated, or null if not
 * Does not throw an error if the user is not authenticated
 */
export async function getOptionalUser(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;

  const userProfile = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", authUser.email))
    .unique();

  if (!userProfile || !userProfile.isActive) return null;

  return { user: authUser, userProfile };
}

// ==========================================
// AUTHENTICATED WRAPPERS
// ==========================================

/**
 * Wrapper for queries that require authentication
 * Automatically provides authenticated user in the handler
 *
 * @example
 * export const myQuery = authenticatedQuery({
 *   args: { eventId: v.id("events") },
 *   handler: async ({ db, userProfile }, args) => {
 *     // userProfile is automatically available
 *     return await db.get(args.eventId);
 *   },
 * });
 */
export function authenticatedQuery<Args, Output>(config: {
  args?: Args;
  handler: (
    ctx: AuthenticatedQueryCtx,
    args: Args extends Record<string, any> ? Args : Record<string, never>
  ) => Promise<Output>;
}) {
  return query({
    args: config.args || ({} as any),
    handler: async (ctx, args) => {
      const { user, userProfile } = await getAuthenticatedUser(ctx);

      const authenticatedCtx = {
        ...ctx,
        user,
        userProfile,
      } as AuthenticatedQueryCtx;

      return config.handler(authenticatedCtx, args as any);
    },
  });
}

/**
 * Wrapper for mutations that require authentication
 * Automatically provides authenticated user in the handler
 *
 * @example
 * export const createEvent = authenticatedMutation({
 *   args: { name: v.string() },
 *   handler: async ({ db, userProfile }, args) => {
 *     // userProfile is automatically available
 *     return await db.insert("events", {
 *       name: args.name,
 *       coordinatorId: userProfile._id,
 *       // ...
 *     });
 *   },
 * });
 */
export function authenticatedMutation<Args, Output>(config: {
  args?: Args;
  handler: (
    ctx: AuthenticatedMutationCtx,
    args: Args extends Record<string, any> ? Args : Record<string, never>
  ) => Promise<Output>;
}) {
  return mutation({
    args: config.args || ({} as any),
    handler: async (ctx, args) => {
      const { user, userProfile } = await getAuthenticatedUser(ctx);

      const authenticatedCtx = {
        ...ctx,
        user,
        userProfile,
      } as AuthenticatedMutationCtx;

      return config.handler(authenticatedCtx, args as any);
    },
  });
}

// ==========================================
// ROLE-BASED AUTHORIZATION
// ==========================================

/**
 * Check if user has a specific role
 */
export function hasRole(userProfile: Doc<"users">, role: UserRole): boolean {
  return userProfile.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  userProfile: Doc<"users">,
  roles: UserRole[]
): boolean {
  return roles.includes(userProfile.role);
}

/**
 * Require user to have a specific role
 * Throws an error if the user doesn't have the role
 */
export function requireRole(userProfile: Doc<"users">, role: UserRole): void {
  if (!hasRole(userProfile, role)) {
    throw new Error(
      `Forbidden: This action requires ${role} role. Your role: ${userProfile.role}`
    );
  }
}

/**
 * Require user to have any of the specified roles
 * Throws an error if the user doesn't have any of the roles
 */
export function requireAnyRole(
  userProfile: Doc<"users">,
  roles: UserRole[]
): void {
  if (!hasAnyRole(userProfile, roles)) {
    throw new Error(
      `Forbidden: This action requires one of these roles: ${roles.join(", ")}. Your role: ${userProfile.role}`
    );
  }
}

// ==========================================
// PERMISSION HELPERS
// ==========================================

/**
 * Check if user is the coordinator of an event
 */
export function isEventCoordinator(
  event: Doc<"events">,
  userId: Id<"users">
): boolean {
  return (
    event.coordinatorId === userId ||
    event.coCoordinatorIds?.includes(userId) ||
    false
  );
}

/**
 * Check if user can manage an event (coordinator or co-coordinator)
 */
export async function canManageEvent(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<boolean> {
  const doc = await ctx.db.get(eventId);
  if (!doc) return false;

  // Type guard: ensure this is an events document
  const event = doc as Doc<"events">;
  return isEventCoordinator(event, userId);
}

/**
 * Require user to be coordinator of an event
 */
export async function requireEventCoordinator(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<Doc<"events">> {
  const doc = await ctx.db.get(eventId);
  if (!doc) {
    throw new Error("Event not found");
  }

  // Type guard: ensure this is an events document
  const event = doc as Doc<"events">;

  if (!isEventCoordinator(event, userId)) {
    throw new Error(
      "Forbidden: Only event coordinators can perform this action"
    );
  }

  return event;
}

/**
 * Check if user is a member of an event (any role)
 * Checks both coordinators and eventMembers table
 */
export async function requireEventMember(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<{ event: Doc<"events">; membership: Doc<"eventMembers"> | null; isCoordinator: boolean }> {
  const doc = await ctx.db.get(eventId);
  if (!doc) {
    throw new Error("Event not found");
  }

  const event = doc as Doc<"events">;

  // Check if user is coordinator first (bypass membership table)
  if (isEventCoordinator(event, userId)) {
    return { event, membership: null, isCoordinator: true };
  }

  // Check eventMembers table
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_event_and_user", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Forbidden: Not a member of this event");
  }

  return { event, membership, isCoordinator: false };
}

/**
 * Get user's role in an event
 * Returns "coordinator", "collaborator", "guest", "vendor", or null if not a member
 */
export async function getUserEventRole(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<"coordinator" | "collaborator" | "guest" | "vendor" | null> {
  const event = await ctx.db.get(eventId);
  if (!event) return null;

  // Check if coordinator
  if (isEventCoordinator(event as Doc<"events">, userId)) {
    return "coordinator";
  }

  // Check eventMembers table
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_event_and_user", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .first();

  return membership?.role || null;
}

/**
 * Check if user is a participant in a room
 */
export async function isRoomParticipant(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<boolean> {
  const participant = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", (q) =>
      q.eq("roomId", roomId).eq("userId", userId)
    )
    .unique();

  return participant !== null;
}

/**
 * Require user to be a participant in a room
 */
export async function requireRoomParticipant(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<Doc<"roomParticipants">> {
  const participant = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", (q) =>
      q.eq("roomId", roomId).eq("userId", userId)
    )
    .unique();

  if (!participant) {
    throw new Error("Forbidden: You are not a participant in this room");
  }

  return participant;
}

/**
 * Require user to have access to a room (either as coordinator or participant)
 * Returns the room document
 */
export async function requireRoomAccess(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<Doc<"rooms">> {
  const room = await ctx.db.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  // Check if user is event coordinator (implicit access to all rooms)
  const event = await ctx.db.get(room.eventId);
  if (event && isEventCoordinator(event as Doc<"events">, userId)) {
    return room;
  }

  // Check if user is a participant
  const participant = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", (q) =>
      q.eq("roomId", roomId).eq("userId", userId)
    )
    .unique();

  if (!participant) {
    throw new Error("Forbidden: You don't have access to this room");
  }

  return room;
}

/**
 * Get coordinator's implicit room permissions
 * Coordinators have full permissions in all rooms
 */
export function getCoordinatorRoomPermissions() {
  return {
    canPost: true,
    canEdit: true,
    canDelete: true,
    canManage: true,
  };
}

/**
 * Check if user is coordinator of the event that owns a room
 */
export async function isRoomEventCoordinator(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<boolean> {
  const room = await ctx.db.get(roomId);
  if (!room) return false;

  const event = await ctx.db.get(room.eventId);
  if (!event) return false;

  return isEventCoordinator(event as Doc<"events">, userId);
}

/**
 * Check if user has permission to post in a room
 * Includes implicit access for event coordinators
 */
export async function canPostInRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<boolean> {
  // Check if user is event coordinator first (implicit access)
  if (await isRoomEventCoordinator(ctx, roomId, userId)) {
    return true;
  }

  const participant = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", (q) =>
      q.eq("roomId", roomId).eq("userId", userId)
    )
    .unique();

  return participant?.canPost || false;
}

/**
 * Require user to have permission to post in a room
 */
export async function requireCanPostInRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">
): Promise<void> {
  const canPost = await canPostInRoom(ctx, roomId, userId);
  if (!canPost) {
    throw new Error("Forbidden: You don't have permission to post in this room");
  }
}

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * Update user's last active timestamp
 * Call this on important user actions to track activity
 */
export async function updateLastActive(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<void> {
  await ctx.db.patch(userId, {
    lastActiveAt: Date.now(),
    updatedAt: Date.now(),
  });
}
