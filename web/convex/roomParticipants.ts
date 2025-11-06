import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  isRoomEventCoordinator,
  getCoordinatorRoomPermissions,
  requireRoomAccess,
  getUserEventRole,
} from "./authHelpers";

/**
 * Add a participant to a room
 * Requires canManage permission
 */
export const addParticipant = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    permissions: v.optional(
      v.object({
        canPost: v.optional(v.boolean()),
        canEdit: v.optional(v.boolean()),
        canDelete: v.optional(v.boolean()),
        canManage: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if requester has manage permission (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (!isCoordinator) {
      const requesterMembership = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", userProfile._id)
        )
        .first();

      if (!requesterMembership?.canManage) {
        throw new Error("Forbidden: No permission to add participants");
      }
    }

    // Check if user is already a participant
    const existing = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a participant");
    }

    // Verify the user to add exists
    const userToAdd = await ctx.db.get(args.userId);
    if (!userToAdd) {
      throw new Error("User not found");
    }

    // Create participant with specified or default permissions
    const participantId = await ctx.db.insert("roomParticipants", {
      roomId: args.roomId,
      userId: args.userId,
      canPost: args.permissions?.canPost ?? true,
      canEdit: args.permissions?.canEdit ?? true,
      canDelete: args.permissions?.canDelete ?? false,
      canManage: args.permissions?.canManage ?? false,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: userProfile._id,
      lastReadAt: undefined,
      isDeleted: false,
    });

    return participantId;
  },
});

/**
 * Remove a participant from a room
 * Requires canManage permission
 */
export const removeParticipant = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if requester has manage permission (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (!isCoordinator) {
      const requesterMembership = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", userProfile._id)
        )
        .first();

      if (!requesterMembership?.canManage) {
        throw new Error("Forbidden: No permission to remove participants");
      }
    }

    // Find the participant to remove
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw new Error("User is not a participant");
    }

    // Prevent removing the room creator if they're the only manager
    const allParticipants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const managers = allParticipants.filter((p) => p.canManage);

    if (managers.length === 1 && participant.canManage) {
      throw new Error("Cannot remove the last manager from the room");
    }

    await ctx.db.delete(participant._id);

    return { success: true };
  },
});

/**
 * Update participant permissions
 * Requires canManage permission
 */
export const updatePermissions = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    permissions: v.object({
      canPost: v.optional(v.boolean()),
      canEdit: v.optional(v.boolean()),
      canDelete: v.optional(v.boolean()),
      canManage: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Check if requester has manage permission (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (!isCoordinator) {
      const requesterMembership = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", userProfile._id)
        )
        .first();

      if (!requesterMembership?.canManage) {
        throw new Error("Forbidden: No permission to update permissions");
      }
    }

    // Find the participant
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw new Error("User is not a participant");
    }

    // If removing canManage, ensure there's at least one other manager
    if (
      args.permissions.canManage === false &&
      participant.canManage === true
    ) {
      const allParticipants = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      const managers = allParticipants.filter((p) => p.canManage);

      if (managers.length === 1) {
        throw new Error("Cannot remove the last manager from the room");
      }
    }

    // Build update object
    const updates: Partial<{
      canPost: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canManage: boolean;
    }> = {};

    if (args.permissions.canPost !== undefined)
      updates.canPost = args.permissions.canPost;
    if (args.permissions.canEdit !== undefined)
      updates.canEdit = args.permissions.canEdit;
    if (args.permissions.canDelete !== undefined)
      updates.canDelete = args.permissions.canDelete;
    if (args.permissions.canManage !== undefined)
      updates.canManage = args.permissions.canManage;

    await ctx.db.patch(participant._id, updates);

    return await ctx.db.get(participant._id);
  },
});

/**
 * Update notification preferences for current user
 */
export const updateNotificationLevel = mutation({
  args: {
    roomId: v.id("rooms"),
    notificationLevel: v.union(
      v.literal("all"),
      v.literal("mentions"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Find user's participation
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!participant) {
      throw new Error("Not a participant of this room");
    }

    await ctx.db.patch(participant._id, {
      notificationLevel: args.notificationLevel,
    });

    return await ctx.db.get(participant._id);
  },
});

/**
 * List all participants in a room with user details
 * Includes coordinators with implicit access
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify requester has access (either as coordinator or participant)
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const event = await ctx.db.get(room.eventId);
    if (!event) throw new Error("Event not found");

    // Get regular participants
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Fetch user details for each participant
    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        return {
          ...participant,
          user,
          isCoordinator: false,
        };
      })
    );

    // Add coordinators (main + co-coordinators) if not already in participants
    const coordinatorIds = [
      event.coordinatorId,
      ...(event.coCoordinatorIds || []),
    ];

    const participantUserIds = new Set(participants.map(p => p.userId));

    const coordinatorsToAdd = await Promise.all(
      coordinatorIds
        .filter(coordId => !participantUserIds.has(coordId))
        .map(async (coordId) => {
          const user = await ctx.db.get(coordId);
          return {
            _id: `coordinator_${coordId}` as any,
            _creationTime: Date.now(),
            roomId: args.roomId,
            userId: coordId,
            ...getCoordinatorRoomPermissions(),
            notificationLevel: "all" as const,
            joinedAt: event.createdAt,
            addedBy: event.coordinatorId,
            lastReadAt: undefined,
            user,
            isCoordinator: true,
          };
        })
    );

    // Combine and sort by join date (most recent first)
    return [...participantsWithUsers, ...coordinatorsToAdd]
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

/**
 * Get current user's access level in a room
 * Includes implicit coordinator permissions
 */
export const getUserRoomAccess = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Check if user is event coordinator first (implicit full access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);
    if (isCoordinator) {
      return {
        ...getCoordinatorRoomPermissions(),
        notificationLevel: "all" as const,
        isCoordinator: true,
      };
    }

    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!participant) {
      return null;
    }

    return {
      canPost: participant.canPost,
      canEdit: participant.canEdit,
      canDelete: participant.canDelete,
      canManage: participant.canManage,
      notificationLevel: participant.notificationLevel,
      isCoordinator: false,
    };
  },
});

/**
 * Add multiple event members to a room at once
 * Automatically sets permissions based on their event role
 * Requires canManage permission (coordinators have implicit access)
 */
export const addMultipleMembersToRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if requester has manage permission (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (!isCoordinator) {
      const requesterMembership = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", userProfile._id)
        )
        .first();

      if (!requesterMembership?.canManage) {
        throw new Error("Forbidden: No permission to add participants");
      }
    }

    // Get existing participants to avoid duplicates
    const existingParticipants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const existingUserIds = new Set(existingParticipants.map(p => p.userId));

    const results = [];

    for (const userId of args.userIds) {
      // Skip if already a participant
      if (existingUserIds.has(userId)) {
        results.push({ userId, status: "already_exists" });
        continue;
      }

      // Skip if user is a coordinator (they have implicit access)
      if (await isRoomEventCoordinator(ctx, args.roomId, userId)) {
        results.push({ userId, status: "is_coordinator" });
        continue;
      }

      // Verify user exists
      const userToAdd = await ctx.db.get(userId);
      if (!userToAdd) {
        results.push({ userId, status: "user_not_found" });
        continue;
      }

      // Get user's event role to determine default permissions
      const eventRole = await getUserEventRole(ctx, room.eventId, userId);

      let permissions = {
        canPost: true,
        canEdit: true,
        canDelete: false,
        canManage: false,
      };

      // Set permissions based on event role
      if (eventRole === "coordinator") {
        // Coordinators have full permissions (though they shouldn't be added explicitly)
        permissions = { canPost: true, canEdit: true, canDelete: true, canManage: true };
      } else if (eventRole === "collaborator") {
        // Collaborators can post and edit
        permissions = { canPost: true, canEdit: true, canDelete: false, canManage: false };
      } else if (eventRole === "guest") {
        // Guests are read-only by default
        permissions = { canPost: false, canEdit: false, canDelete: false, canManage: false };
      }

      // Create participant
      const participantId = await ctx.db.insert("roomParticipants", {
        roomId: args.roomId,
        userId: userId,
        ...permissions,
        notificationLevel: "all",
        joinedAt: Date.now(),
        addedBy: userProfile._id,
        lastReadAt: undefined,
        isDeleted: false,
      });

      results.push({ userId, status: "added", participantId });
    }

    return {
      total: args.userIds.length,
      added: results.filter(r => r.status === "added").length,
      skipped: results.filter(r => r.status !== "added").length,
      results,
    };
  },
});

/**
 * Leave a room (remove self as participant)
 */
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Prevent leaving main room
    if (room.type === "main") {
      throw new Error("Cannot leave the main room");
    }

    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!participant) {
      throw new Error("Not a participant of this room");
    }

    // If user is a manager, check if there's at least one other manager
    if (participant.canManage) {
      const allParticipants = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      const managers = allParticipants.filter((p) => p.canManage);

      if (managers.length === 1) {
        throw new Error(
          "Cannot leave: You are the last manager. Transfer management first."
        );
      }
    }

    await ctx.db.delete(participant._id);

    return { success: true };
  },
});
