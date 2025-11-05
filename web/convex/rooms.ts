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

    // Delete all messages in batches (cascade delete)
    let deletedMessageCount = 0;
    let hasMoreMessages = true;

    while (hasMoreMessages && deletedMessageCount < 10000) {
      // Safety limit
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .take(100); // Batch delete 100 at a time

      if (messages.length === 0) {
        hasMoreMessages = false;
      } else {
        for (const message of messages) {
          await ctx.db.delete(message._id);
          deletedMessageCount++;
        }
      }
    }

    // Delete the room
    await ctx.db.delete(args.roomId);

    return { success: true, messagesDeleted: deletedMessageCount };
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

    // Count messages in the room (excluding deleted)
    const messageCount = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect()
      .then((messages) => messages.length);

    return {
      participantCount,
      messageCount,
    };
  },
});

/**
 * List accessible rooms for an event with latest message preview
 * Designed for WhatsApp-like chat interface in sidebar
 * Returns only rooms user is a participant of, sorted by activity
 */
export const listAccessibleForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { user, userProfile } = await getAuthenticatedUser(ctx);

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all non-archived rooms in the event
    const allRooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const activeRooms = allRooms.filter((room) => !room.isArchived);

    // Get user's room memberships
    const userParticipations = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .collect();

    const userRoomIds = new Set(userParticipations.map((p) => p.roomId));

    // Filter to only rooms user is a participant of
    const accessibleRooms = activeRooms.filter((room) =>
      userRoomIds.has(room._id)
    );

    // For each room, get the latest message
    const roomsWithMessages = await Promise.all(
      accessibleRooms.map(async (room) => {
        // Get latest message for this room
        const latestMessage = await ctx.db
          .query("messages")
          .withIndex("by_room_and_created", (q) =>
            q.eq("roomId", room._id)
          )
          .order("desc")
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .first();

        // Get membership info
        const membership = userParticipations.find(
          (p) => p.roomId === room._id
        );

        // Get unread count (messages after lastReadAt)
        // Note: Capped at 100 unread messages for performance.
        // UI can show "99+" for counts at the limit.
        const unreadCount = membership?.lastReadAt
          ? await ctx.db
              .query("messages")
              .withIndex("by_room_and_created", (q) =>
                q.eq("roomId", room._id)
              )
              .filter((q) =>
                q.and(
                  q.gt(q.field("createdAt"), membership.lastReadAt!),
                  q.eq(q.field("isDeleted"), false)
                )
              )
              .take(100) // Limit for performance - show "99+" in UI if at limit
              .then((msgs) => msgs.length)
          : 0;

        // Flatten structure to reduce nesting depth and prevent deep instantiation errors
        return {
          // Room fields
          _id: room._id,
          eventId: room.eventId,
          name: room.name,
          description: room.description,
          type: room.type,
          vendorId: room.vendorId,
          isArchived: room.isArchived,
          allowGuestMessages: room.allowGuestMessages,
          createdAt: room.createdAt,
          createdBy: room.createdBy,
          lastMessageAt: room.lastMessageAt,

          // Membership permissions (flattened from membership object)
          canPost: membership?.canPost ?? false,
          canEdit: membership?.canEdit ?? false,
          canDelete: membership?.canDelete ?? false,
          canManage: membership?.canManage ?? false,
          notificationLevel: membership?.notificationLevel ?? "all",
          lastReadAt: membership?.lastReadAt,
          joinedAt: membership?.joinedAt,

          // Latest message (flattened)
          latestMessageId: latestMessage?._id ?? null,
          latestMessageText: latestMessage?.text ?? null,
          latestMessageAuthorId: latestMessage?.authorId ?? null,
          latestMessageCreatedAt: latestMessage?.createdAt ?? null,
          latestMessageIsAI: latestMessage?.isAIGenerated ?? false,

          // Unread count
          unreadCount,
        };
      })
    );

    // Sort by latest activity (rooms with recent messages first)
    roomsWithMessages.sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return bTime - aTime;
    });

    return roomsWithMessages;
  },
});
