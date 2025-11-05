/**
 * Messages CRUD Operations
 * Phase 1.5: Real-time Chat Messaging
 *
 * Handles message creation, retrieval, editing, deletion, and read tracking.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedUser,
  requireCanPostInRoom,
  requireRoomParticipant,
} from "./authHelpers";

// ==========================================
// MESSAGE MUTATIONS
// ==========================================

/**
 * Send a new message in a room
 * Requires: User must be a room participant with canPost permission
 */
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    attachments: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal("image"), v.literal("file")),
          url: v.string(),
          name: v.string(),
          size: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Validate room exists
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check posting permission
    await requireCanPostInRoom(ctx, args.roomId, userProfile._id);

    // Validate message text
    if (!args.text.trim()) {
      throw new Error("Message text cannot be empty");
    }

    if (args.text.length > 10000) {
      throw new Error("Message text cannot exceed 10,000 characters");
    }

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: userProfile._id,
      text: args.text,
      mentions: args.mentions,
      attachments: args.attachments,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // Update room's last message timestamp
    await ctx.db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Edit an existing message
 * Requires: User must be the message author and have canEdit permission
 */
export const update = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author
    if (message.authorId !== userProfile._id) {
      throw new Error("Forbidden: You can only edit your own messages");
    }

    // Check edit permission in the room
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", message.roomId).eq("userId", userProfile._id)
      )
      .unique();

    if (!participant?.canEdit) {
      throw new Error("Forbidden: You don't have permission to edit messages in this room");
    }

    // Validate new text
    if (!args.text.trim()) {
      throw new Error("Message text cannot be empty");
    }

    if (args.text.length > 10000) {
      throw new Error("Message text cannot exceed 10,000 characters");
    }

    // Update the message
    await ctx.db.patch(args.messageId, {
      text: args.text,
      isEdited: true,
      editedAt: Date.now(),
    });

    return await ctx.db.get(args.messageId);
  },
});

/**
 * Soft delete a message
 * Requires: User must be the message author and have canDelete permission
 */
export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author
    if (message.authorId !== userProfile._id) {
      throw new Error("Forbidden: You can only delete your own messages");
    }

    // Check delete permission in the room
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", message.roomId).eq("userId", userProfile._id)
      )
      .unique();

    if (!participant?.canDelete) {
      throw new Error("Forbidden: You don't have permission to delete messages in this room");
    }

    // Soft delete the message
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
      text: "[Message deleted]",
    });

    return { success: true };
  },
});

/**
 * Mark a room as read (update lastReadAt timestamp)
 */
export const markRoomAsRead = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get the participant record
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .unique();

    if (!participant) {
      throw new Error("Forbidden: You are not a participant in this room");
    }

    // Update lastReadAt to current time
    await ctx.db.patch(participant._id, {
      lastReadAt: Date.now(),
    });

    return { success: true };
  },
});

// ==========================================
// MESSAGE QUERIES
// ==========================================

/**
 * List messages in a room with pagination
 * Returns messages in reverse chronological order (newest first)
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // timestamp - for pagination
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is a participant
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .unique();

    if (!participant) {
      throw new Error("Forbidden: You are not a participant in this room");
    }

    // Query messages
    let query = ctx.db
      .query("messages")
      .withIndex("by_room_and_created", (q) => q.eq("roomId", args.roomId))
      .order("desc");

    // Apply pagination (before timestamp)
    if (args.before) {
      query = query.filter((q) => q.lt(q.field("createdAt"), args.before!));
    }

    // Filter out deleted messages and apply limit
    const messages = await query
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 50);

    // Batch fetch all authors
    const authorIds = Array.from(new Set(messages.map((m) => m.authorId)));
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const authorMap = new Map(authors.filter((a) => a !== null).map((a) => [a!._id, a]));

    // Combine messages with author data
    return messages.map((m) => ({
      ...m,
      author: authorMap.get(m.authorId),
    }));
  },
});

/**
 * Get unread message counts for all rooms (or specific event)
 * Returns array of { roomId, unreadCount }
 */
export const getUnreadCounts = query({
  args: {
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get all rooms user is a participant in
    const memberships = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userProfile._id))
      .collect();

    let roomIds = memberships.map((m) => m.roomId);

    // Filter by event if specified
    if (args.eventId) {
      const rooms = await Promise.all(roomIds.map((id) => ctx.db.get(id)));
      roomIds = rooms
        .filter((r) => r !== null && r.eventId === args.eventId)
        .map((r) => r!._id);
    }

    // Calculate unread count for each room
    const unreadCounts = await Promise.all(
      roomIds.map(async (roomId) => {
        const membership = memberships.find((m) => m.roomId === roomId);
        const lastReadAt = membership?.lastReadAt || 0;

        // Count messages created after lastReadAt
        // Note: Capped at 100 for performance. UI can show "99+" if at limit.
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_room_and_created", (q) => q.eq("roomId", roomId))
          .filter((q) =>
            q.and(
              q.gt(q.field("createdAt"), lastReadAt),
              q.neq(q.field("authorId"), userProfile._id), // Don't count own messages
              q.eq(q.field("isDeleted"), false)
            )
          )
          .take(101); // Cap at 101 to detect if there are 100+

        const count = unreadMessages.length;
        return {
          roomId,
          unreadCount: Math.min(count, 99),
          hasMore: count > 100, // UI can show "99+" when true
        };
      })
    );

    return unreadCounts;
  },
});

/**
 * Get a single message by ID (for editing UI)
 */
export const getById = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify user is a participant in the room
    await requireRoomParticipant(ctx, message.roomId, userProfile._id);

    // Get author details
    const author = await ctx.db.get(message.authorId);

    return {
      ...message,
      author,
    };
  },
});
