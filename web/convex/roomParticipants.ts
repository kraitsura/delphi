import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireRoomParticipant,
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
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if requester has manage permission
    const requesterMembership = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to add participants");
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
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if requester has manage permission
    const requesterMembership = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to remove participants");
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
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    // Check if requester has manage permission
    const requesterMembership = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to update permissions");
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
    const { user, userProfile } = await getAuthenticatedUser(ctx);

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
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    // Verify requester is a participant
    await requireRoomParticipant(ctx, args.roomId, userProfile._id);

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
        };
      })
    );

    // Sort by join date (most recent first)
    return participantsWithUsers.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

/**
 * Get current user's access level in a room
 */
export const getUserRoomAccess = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

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
    const { user, userProfile } = await getAuthenticatedUser(ctx);

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
