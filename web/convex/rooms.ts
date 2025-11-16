import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireEventCoordinator,
  requireRoomAccess,
  isRoomEventCoordinator,
  getCoordinatorRoomPermissions,
  isEventCoordinator,
} from "./authHelpers";
import { softDeleteRoomCascade } from "./cascadeHelpers";

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
    const { userProfile } = await getAuthenticatedUser(ctx);

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
      isDeleted: false,
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
      isDeleted: false,
    });

    return roomId;
  },
});

/**
 * Get room by ID with membership check
 * Coordinators have implicit access to all rooms
 */
export const getById = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if user is event coordinator (implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (isCoordinator) {
      // Return coordinator with implicit permissions
      return {
        ...room,
        membership: {
          ...getCoordinatorRoomPermissions(),
          notificationLevel: "all" as const,
          isCoordinator: true,
        },
      };
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
      membership: {
        ...membership,
        isCoordinator: false,
      },
    };
  },
});

/**
 * List all rooms in an event that the user is a participant of
 * Coordinators have access to all rooms
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user is coordinator (implicit access to all rooms)
    const isCoordinator = isEventCoordinator(event as Doc<"events">, userProfile._id);

    // Get all rooms in the event
    let roomsQuery = ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    const allRooms = await roomsQuery.collect();

    // Filter out soft-deleted rooms and by archived status if specified
    const filteredRooms = allRooms.filter((room) => {
      if (room.isDeleted) return false;
      if (!args.includeArchived && room.isArchived) return false;
      return true;
    });

    // Get user's room memberships (excluding soft-deleted)
    const allParticipations = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .collect();

    const userParticipations = allParticipations.filter((p) => !p.isDeleted);
    const userRoomIds = new Set(userParticipations.map((p) => p.roomId));

    // For coordinators: return all rooms. For others: only rooms they're participants of
    const userRooms = isCoordinator
      ? filteredRooms
      : filteredRooms.filter((room) => userRoomIds.has(room._id));

    // Attach membership info to each room
    return Promise.all(
      userRooms.map(async (room) => {
        const membership = userParticipations.find(
          (p) => p.roomId === room._id
        );

        // If coordinator but not explicit participant, use implicit permissions
        if (isCoordinator && !membership) {
          return {
            ...room,
            membership: {
              ...getCoordinatorRoomPermissions(),
              notificationLevel: "all" as const,
              isCoordinator: true,
            },
          };
        }

        return {
          ...room,
          membership: {
            ...membership,
            isCoordinator,
          },
        };
      })
    );
  },
});

/**
 * Update room settings
 * Requires canManage permission (coordinators have implicit access)
 */
export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    allowGuestMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Check if user is coordinator (implicit manage access)
    const isCoordinator = await isRoomEventCoordinator(ctx, args.roomId, userProfile._id);

    if (!isCoordinator) {
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
    const { userProfile } = await getAuthenticatedUser(ctx);

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
 * @deprecated Use softDelete instead for cascade soft deletion
 */
export const deleteRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

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
 * Soft delete a room with cascade
 * Requires event coordinator permission
 * Cascades to: roomParticipants, messages
 */
export const softDelete = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

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

    // Prevent double deletion
    if (room.isDeleted) {
      throw new Error("Room is already deleted");
    }

    const now = Date.now();

    // Cascade delete all related data using helper function
    await softDeleteRoomCascade(ctx, args.roomId, now);

    // Soft delete the room itself
    await ctx.db.patch(args.roomId, {
      isDeleted: true,
      deletedAt: now,
    });

    return { success: true };
  },
});

/**
 * Get room statistics
 * Coordinators have implicit access
 */
export const getStats = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

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
 * Coordinators have access to all rooms
 */
export const listAccessibleForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user is coordinator (implicit access to all rooms)
    const isCoordinator = isEventCoordinator(event as Doc<"events">, userProfile._id);

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

    // For coordinators: include all rooms. For others: only rooms they're participants of
    const accessibleRooms = isCoordinator
      ? activeRooms
      : activeRooms.filter((room) => userRoomIds.has(room._id));

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

        // Get author's first name if there's a latest message
        let latestMessageAuthorFirstName: string | null = null;
        if (latestMessage?.authorId) {
          const author = await ctx.db.get(latestMessage.authorId);
          if (author?.name) {
            // Extract first name from full name
            latestMessageAuthorFirstName = author.name.split(" ")[0];
          }
        }

        // Get membership info
        const membership = userParticipations.find(
          (p) => p.roomId === room._id
        );

        // Determine permissions (coordinator implicit or explicit membership)
        const permissions = isCoordinator && !membership
          ? getCoordinatorRoomPermissions()
          : {
              canPost: membership?.canPost ?? false,
              canEdit: membership?.canEdit ?? false,
              canDelete: membership?.canDelete ?? false,
              canManage: membership?.canManage ?? false,
            };

        // Get unread count (messages after lastReadAt, excluding own messages)
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
                  q.eq(q.field("isDeleted"), false),
                  q.neq(q.field("authorId"), userProfile._id) // Exclude own messages
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

          // Membership permissions (coordinator implicit or explicit)
          ...permissions,
          notificationLevel: membership?.notificationLevel ?? "all",
          lastReadAt: membership?.lastReadAt,
          joinedAt: membership?.joinedAt,
          isCoordinator,

          // Latest message (flattened)
          latestMessageId: latestMessage?._id ?? null,
          latestMessageText: latestMessage?.text ?? null,
          latestMessageAuthorId: latestMessage?.authorId ?? null,
          latestMessageAuthorFirstName: latestMessageAuthorFirstName,
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
