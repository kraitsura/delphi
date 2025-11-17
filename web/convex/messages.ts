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
  requireRoomAccess,
  isRoomEventCoordinator,
  isEventCoordinator,
} from "./authHelpers";

// ==========================================
// MESSAGE MUTATIONS
// ==========================================

/**
 * Send a new message in a room
 * Requires: User must be event coordinator OR room participant
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
    parentMessageId: v.optional(v.id("messages")), // Phase 2: Threading support
    // Track 4: AI message support
    isAIGenerated: v.optional(v.boolean()),
    aiMetadata: v.optional(v.any()), // Structured AI metadata for Track 4
  },
  handler: async (ctx, args) => {
    // Validate message text early (before any DB queries)
    if (!args.text.trim()) {
      throw new Error("Message text cannot be empty");
    }

    if (args.text.length > 10000) {
      throw new Error("Message text cannot exceed 10,000 characters");
    }

    // Parallelize authentication and room fetch
    const [{ userProfile }, room] = await Promise.all([
      getAuthenticatedUser(ctx),
      ctx.db.get(args.roomId),
    ]);

    if (!room) {
      throw new Error("Room not found");
    }

    // Simplified permission check: user is coordinator OR room participant
    // If they're in the room, they can post - that's the whole point!
    const event = await ctx.db.get(room.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const isCoordinator = isEventCoordinator(event, userProfile._id);

    if (!isCoordinator) {
      // Check if user is a room participant
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", userProfile._id)
        )
        .unique();

      if (!participant) {
        throw new Error("Forbidden: You are not a member of this room");
      }
    }

    // Phase 2: Determine threadId for threading support
    let threadId: string | undefined = undefined;
    if (args.parentMessageId) {
      const parentMsg = await ctx.db.get(args.parentMessageId);
      if (!parentMsg) {
        throw new Error("Parent message not found");
      }

      // Verify parent message is in the same room
      if (parentMsg.roomId !== args.roomId) {
        throw new Error("Parent message must be in the same room");
      }

      // Determine threadId: inherit from parent or use parentMessageId as root
      threadId = parentMsg.threadId || args.parentMessageId;

      // Increment reply count on parent message
      await ctx.db.patch(args.parentMessageId, {
        replyCount: (parentMsg.replyCount || 0) + 1,
      });
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
      isAIGenerated: args.isAIGenerated ?? false, // Track 4: Support AI messages
      aiMetadata: args.aiMetadata, // Track 4: Store AI metadata
      parentMessageId: args.parentMessageId, // Phase 2: Threading
      threadId, // Phase 2: Threading
      replyCount: 0, // Phase 2: Initialize reply count
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

    // Check edit permission in the room (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, message.roomId, userProfile._id);

    if (!isCoordinator) {
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", message.roomId).eq("userId", userProfile._id)
        )
        .unique();

      if (!participant?.canEdit) {
        throw new Error("Forbidden: You don't have permission to edit messages in this room");
      }
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

    // Check delete permission in the room (coordinators have implicit access)
    const isCoordinator = await isRoomEventCoordinator(ctx, message.roomId, userProfile._id);

    if (!isCoordinator) {
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", message.roomId).eq("userId", userProfile._id)
        )
        .unique();

      if (!participant?.canDelete) {
        throw new Error("Forbidden: You don't have permission to delete messages in this room");
      }
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
 * Coordinators with implicit access don't need to update (no participant record)
 */
export const markRoomAsRead = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Ensure user has access to the room (coordinator or participant)
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

    // Get the participant record
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userProfile._id)
      )
      .unique();

    // If no participant record, user is a coordinator with implicit access
    // No lastReadAt to update, just return success
    if (!participant) {
      return { success: true, isCoordinator: true };
    }

    // Update lastReadAt to current time
    await ctx.db.patch(participant._id, {
      lastReadAt: Date.now(),
    });

    return { success: true, isCoordinator: false };
  },
});

// ==========================================
// MESSAGE QUERIES
// ==========================================

/**
 * List messages in a room with pagination
 * Returns messages in reverse chronological order (newest first)
 * Coordinators have implicit access
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // timestamp - for pagination
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user has access to the room (coordinator or participant)
    await requireRoomAccess(ctx, args.roomId, userProfile._id);

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

    // Batch fetch all root messages for replies (to prevent loading flash)
    const rootMessageIds = Array.from(
      new Set(
        messages
          .filter((m) => m.parentMessageId || m.threadId)
          .map((m) => {
            // Get the thread root: threadId if exists, otherwise parentMessageId
            if (m.threadId) {
              return m.threadId;
            }
            return m.parentMessageId;
          })
          .filter((id): id is string => id !== undefined)
      )
    );

    const rootMessages = await Promise.all(
      rootMessageIds.map(async (id) => {
        const msg = await ctx.db.get(id as any);
        if (!msg || !("authorId" in msg)) return null;
        return {
          ...msg,
          author: authorMap.get(msg.authorId),
        };
      })
    );
    const rootMessageMap = new Map(
      rootMessages.filter((m) => m !== null).map((m) => [m!._id, m])
    );

    // Combine messages with author data and root message data
    return messages.map((m) => ({
      ...m,
      author: authorMap.get(m.authorId),
      rootMessage:
        m.threadId
          ? rootMessageMap.get(m.threadId as any)
          : m.parentMessageId
            ? rootMessageMap.get(m.parentMessageId)
            : undefined,
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
 * Coordinators have implicit access
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

    // Verify user has access to the room (coordinator or participant)
    await requireRoomAccess(ctx, message.roomId, userProfile._id);

    // Get author details
    const author = await ctx.db.get(message.authorId);

    return {
      ...message,
      author,
    };
  },
});

/**
 * Get recent messages across all rooms in an event
 * Used for activity feeds and dashboards
 */
export const getRecentByEvent = query({
  args: {
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get all rooms for this event
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event_and_deleted", (q) =>
        q.eq("eventId", args.eventId).eq("isDeleted", false)
      )
      .collect();

    // Filter rooms user has access to (coordinator or participant)
    const accessibleRoomIds: typeof rooms[number]["_id"][] = [];
    for (const room of rooms) {
      try {
        await requireRoomAccess(ctx, room._id, userProfile._id);
        accessibleRoomIds.push(room._id);
      } catch {
        // User doesn't have access to this room, skip it
        continue;
      }
    }

    // Get recent messages from all accessible rooms
    const messagesPerRoom = await Promise.all(
      accessibleRoomIds.map((roomId) =>
        ctx.db
          .query("messages")
          .withIndex("by_room_and_created", (q) => q.eq("roomId", roomId))
          .order("desc")
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .take(5) // Get last 5 messages per room
      )
    );

    // Flatten and sort all messages by creation time
    const allMessages = messagesPerRoom
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit || 20);

    // Batch fetch authors and rooms
    const authorIds = Array.from(new Set(allMessages.map((m) => m.authorId)));
    const roomIds = Array.from(new Set(allMessages.map((m) => m.roomId)));

    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const roomDetails = await Promise.all(roomIds.map((id) => ctx.db.get(id)));

    const authorMap = new Map(authors.filter((a) => a !== null).map((a) => [a!._id, a]));
    const roomMap = new Map(roomDetails.filter((r) => r !== null).map((r) => [r!._id, r]));

    // Combine messages with author and room data
    return allMessages.map((m) => ({
      ...m,
      author: authorMap.get(m.authorId),
      room: roomMap.get(m.roomId),
    }));
  },
});

/**
 * Get all messages in a thread (Phase 2: Threading)
 * Returns all messages in a thread, ordered chronologically
 * Includes the root message and all replies
 */
export const getThread = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get the root message
    const rootMessage = await ctx.db.get(args.messageId);
    if (!rootMessage) {
      throw new Error("Message not found");
    }

    // Verify user has access to the room
    await requireRoomAccess(ctx, rootMessage.roomId, userProfile._id);

    // Determine thread root: if message has threadId, use it; otherwise this message is the root
    const threadId = rootMessage.threadId || args.messageId;

    // Fetch all messages in thread using the by_thread index
    const threadMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc") // Chronological order (oldest first)
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // If the root message doesn't have threadId set (it's the original message),
    // we need to include it separately since it won't be in the by_thread query
    let allThreadMessages = threadMessages;
    if (!rootMessage.threadId && threadMessages.length > 0) {
      // Only include root if there are actual replies
      allThreadMessages = [rootMessage, ...threadMessages];
    } else if (!rootMessage.threadId && threadMessages.length === 0) {
      // This message has no thread yet, just return the single message
      allThreadMessages = [rootMessage];
    }

    // Batch fetch all authors
    const authorIds = Array.from(new Set(allThreadMessages.map((m) => m.authorId)));
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const authorMap = new Map(authors.filter((a) => a !== null).map((a) => [a!._id, a]));

    // Return messages with author data
    return allThreadMessages.map((m) => ({
      ...m,
      author: authorMap.get(m.authorId),
    }));
  },
});
