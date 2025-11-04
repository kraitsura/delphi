import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventCoordinator,
  requireRoomParticipant,
} from "./authHelpers";

/**
 * Create a new room within an event
 * Automatically adds creator as participant with full permissions
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("main"),
      v.literal("vendor"),
      v.literal("topic"),
      v.literal("guest_announcements"),
      v.literal("private")
    ),
    vendorId: v.optional(v.id("users")),
    allowGuestMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, args.eventId, userProfile._id);

    // Validate vendor room has vendorId
    if (args.type === "vendor" && !args.vendorId) {
      throw new Error("Vendor rooms require a vendorId");
    }

    // Create the room
    const roomId = await ctx.db.insert("rooms", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      type: args.type,
      vendorId: args.vendorId,
      isArchived: false,
      allowGuestMessages: args.allowGuestMessages ?? false,
      createdAt: Date.now(),
      createdBy: userProfile._id,
      lastMessageAt: undefined,
    });

    // Add creator as participant with full permissions
    await ctx.db.insert("roomParticipants", {
      roomId,
      userId: userProfile._id,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: userProfile._id,
      lastReadAt: undefined,
    });

    return roomId;
  },
});

/**
 * Get room by ID with membership check
 */
export const getById = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify user is a participant
    const membership = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    return {
      ...room,
      membership,
    };
  },
});

/**
 * List all rooms in an event that the user is a participant of
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all rooms in the event
    let roomsQuery = ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    const allRooms = await roomsQuery.collect();

    // Filter by archived status if specified
    const filteredRooms = args.includeArchived
      ? allRooms
      : allRooms.filter((room) => !room.isArchived);

    // Get user's room memberships
    const userParticipations = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .collect();

    const userRoomIds = new Set(userParticipations.map((p) => p.roomId));

    // Return only rooms user is a participant of
    const userRooms = filteredRooms.filter((room) =>
      userRoomIds.has(room._id)
    );

    // Attach membership info to each room
    return Promise.all(
      userRooms.map(async (room) => {
        const membership = userParticipations.find(
          (p) => p.roomId === room._id
        );
        return {
          ...room,
          membership,
        };
      })
    );
  },
});

/**
 * Update room settings
 * Requires canManage permission
 */
export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    allowGuestMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    // Check if user can manage this room
    const membership = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .first();

    if (!membership?.canManage) {
      throw new Error("Forbidden: No permission to update room");
    }

    // Build update object
    const updates: Partial<{
      name: string;
      description: string | undefined;
      allowGuestMessages: boolean;
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.allowGuestMessages !== undefined)
      updates.allowGuestMessages = args.allowGuestMessages;

    await ctx.db.patch(args.roomId, updates);

    return await ctx.db.get(args.roomId);
  },
});

/**
 * Archive a room
 * Requires event coordinator permission
 */
export const archive = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, room.eventId, userProfile._id);

    // Prevent archiving main room
    if (room.type === "main") {
      throw new Error("Cannot archive main room");
    }

    await ctx.db.patch(args.roomId, {
      isArchived: true,
    });

    return { success: true };
  },
});

/**
 * Delete a room (hard delete)
 * Requires event coordinator permission
 * Note: This also cascades to delete all participants and messages
 */
export const deleteRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, room.eventId, userProfile._id);

    // Prevent deleting main room
    if (room.type === "main") {
      throw new Error("Cannot delete main room");
    }

    // Delete all participants
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete the room
    await ctx.db.delete(args.roomId);

    return { success: true };
  },
});

/**
 * Get room statistics
 */
export const getStats = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireRoomParticipant(ctx, args.roomId, userProfile._id);

    const participantCount = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()
      .then((participants) => participants.length);

    // Message count will be implemented in Phase 1.5
    const messageCount = 0;

    return {
      participantCount,
      messageCount,
    };
  },
});
