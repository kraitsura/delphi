/**
 * Presence Tracking
 *
 * Provides real-time user presence tracking across the application.
 * Presence is context-aware and can track users at room, event, or global levels.
 */

import { components } from "./_generated/api";
import { Presence } from "@convex-dev/presence";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getAuthenticatedUser,
  requireRoomParticipant,
  requireEventMember,
} from "./authHelpers";

// Initialize the Presence component with new API (only takes component parameter)
export const presence = new Presence(components.presence);

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Presence context types
 * - room: User is in a specific room
 * - event: User is viewing an event (but not in a specific room)
 * - global: User is in the app but not in an event context
 */
export type PresenceContext =
  | { type: "room"; roomId: string }
  | { type: "event"; eventId: string }
  | { type: "global" };

/**
 * User status within a location
 */
export type UserStatus = "active" | "idle" | "typing";

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Update user presence in a location
 * Sends a heartbeat to indicate the user is active
 *
 * @param context - The presence context (room/event/global)
 * @param status - Optional status indicator (active/idle/typing)
 * @param sessionId - Unique session identifier for this client
 */
export const updatePresence = mutation({
  args: {
    context: v.union(
      v.object({
        type: v.literal("room"),
        roomId: v.id("rooms"),
      }),
      v.object({
        type: v.literal("event"),
        eventId: v.id("events"),
      }),
      v.object({
        type: v.literal("global"),
      })
    ),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("idle"),
      v.literal("typing")
    )),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user has access to the context
    if (args.context.type === "room") {
      await requireRoomParticipant(ctx, args.context.roomId, userProfile._id);
    } else if (args.context.type === "event") {
      await requireEventMember(ctx, args.context.eventId, userProfile._id);
    }

    // Generate roomId string for presence tracking (encode context in the ID)
    const roomId =
      args.context.type === "room" ? `room:${args.context.roomId}` :
      args.context.type === "event" ? `event:${args.context.eventId}` :
      "global";

    // Send heartbeat with new API (5 parameters)
    const tokens = await presence.heartbeat(
      ctx,
      roomId,
      userProfile._id,
      args.sessionId,
      HEARTBEAT_INTERVAL
    );

    // Store typing status in our custom table for easy querying
    const existing = await ctx.db
      .query("typingStatus")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", roomId).eq("userId", userProfile._id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status || "active",
        userName: userProfile.name,
        userAvatar: userProfile.avatar,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingStatus", {
        roomId,
        userId: userProfile._id,
        userName: userProfile.name,
        userAvatar: userProfile.avatar,
        status: args.status || "active",
        updatedAt: Date.now(),
      });
    }

    return tokens;
  },
});

/**
 * Remove user from a specific location
 * Called when user leaves a room/event
 */
export const leaveLocation = mutation({
  args: {
    context: v.union(
      v.object({
        type: v.literal("room"),
        roomId: v.id("rooms"),
      }),
      v.object({
        type: v.literal("event"),
        eventId: v.id("events"),
      }),
      v.object({
        type: v.literal("global"),
      })
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    // Disconnect using session token (new API)
    await presence.disconnect(ctx, args.sessionToken);
  },
});

// ==========================================
// QUERIES
// ==========================================

/**
 * List all users present in a specific context
 *
 * @param context - The presence context to query
 * @returns Array of present users with their data
 */
export const listPresenceByContext = query({
  args: {
    context: v.union(
      v.object({
        type: v.literal("room"),
        roomId: v.id("rooms"),
      }),
      v.object({
        type: v.literal("event"),
        eventId: v.id("events"),
      }),
      v.object({
        type: v.literal("global"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user has access to the context
    if (args.context.type === "room") {
      await requireRoomParticipant(ctx, args.context.roomId, userProfile._id);
    } else if (args.context.type === "event") {
      await requireEventMember(ctx, args.context.eventId, userProfile._id);
    }

    const roomId =
      args.context.type === "room" ? `room:${args.context.roomId}` :
      args.context.type === "event" ? `event:${args.context.eventId}` :
      "global";

    // Get present users from presence component
    const presentUsers = await presence.listRoom(ctx, roomId, true);

    // Get typing status for all users in this room
    const typingStatuses = await ctx.db
      .query("typingStatus")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    // Create a map for quick lookup
    const statusMap = new Map(
      typingStatuses.map((status) => [status.userId, status])
    );

    // Combine presence data with typing status
    return presentUsers.map((user) => {
      const statusData = statusMap.get(user.userId as any);
      return {
        userId: user.userId,
        userName: statusData?.userName || "Unknown User",
        userAvatar: statusData?.userAvatar,
        data: { status: statusData?.status || "active" as const },
      };
    });
  },
});

/**
 * Get presence for a specific user across all contexts
 * Useful for checking if a user is online anywhere in the app
 */
export const getUserPresence = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    const userPresence = await presence.listUser(ctx, args.userId, true);

    return userPresence;
  },
});

/**
 * Get aggregated presence statistics for an event
 * Shows which rooms have active users and total unique users
 */
export const getEventPresenceStats = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is an event member
    await requireEventMember(ctx, args.eventId, userProfile._id);

    // Get all rooms for this event
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get presence for each room
    const roomPresence = await Promise.all(
      rooms.map(async (room) => {
        const present = await presence.listRoom(ctx, `room:${room._id}`, true);
        return {
          roomId: room._id,
          roomName: room.name,
          activeUsers: present,
          activeCount: present.length,
        };
      })
    );

    // Get event-level presence (users viewing event but not in a room)
    const eventPresent = await presence.listRoom(ctx, `event:${args.eventId}`, true);

    // Count unique users across all contexts
    const allUsers = [
      ...eventPresent,
      ...roomPresence.flatMap((rp) => rp.activeUsers),
    ];
    const uniqueUsers = new Set(allUsers.map((u) => u.userId));

    return {
      eventPresence: eventPresent,
      rooms: roomPresence,
      totalActiveUsers: uniqueUsers.size,
    };
  },
});
