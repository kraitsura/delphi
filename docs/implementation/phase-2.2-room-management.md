# Phase 2.2: Room Management & Navigation

> **Status:** Phase 2.2 - Multi-Room Support
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0 & 2.1 Complete (Messaging + Pagination)
> **Next:** Phase 2.3 - Rich Messaging Features

---

## Overview

Transform your single-room chat into a multi-room application with room navigation, unread count tracking, and participant management. Users can switch between multiple chat rooms within an event, see unread message counts, and track room activity.

### What You'll Build

- ✅ Room list sidebar with live updates
- ✅ Unread count badges per room
- ✅ Room switching with state management
- ✅ Room header with metadata
- ✅ Mark messages as read
- ✅ Room type indicators (main, topic, private)
- ✅ Last message timestamp display

### UX Improvements

- See all available rooms at a glance
- Know which rooms have unread messages
- Quick navigation between rooms
- Persistent room selection across page reloads

---

## Backend Implementation

### 1. Unread Count Tracking

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Mark room as read for current user
 * Updates lastReadAt timestamp to clear unread count
 */
export const markAsRead = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
  }) => {
    // Find user's room participant record
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a room member");
    }

    // Update lastReadAt to current time
    await db.patch(membership._id, {
      lastReadAt: Date.now(),
      unreadCount: 0, // Reset unread count
    });
  }
);

/**
 * Get unread count summary across all rooms
 * Used for sidebar badges and notification counts
 */
export const getUnreadSummary = authenticatedQuery(
  async ({ db, user }, args: {
    eventId?: Id<"events">;
  }) => {
    // Get user's memberships
    const memberships = await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect();

    // Filter by event if specified
    let filteredMemberships = memberships;
    if (args.eventId) {
      const roomIds = memberships.map(m => m.roomId);
      const rooms = await Promise.all(roomIds.map(id => db.get(id)));

      filteredMemberships = memberships.filter((m, i) =>
        rooms[i]?.eventId === args.eventId
      );
    }

    // Calculate unread counts for each room
    const unreadCounts = await Promise.all(
      filteredMemberships.map(async (m) => {
        const room = await db.get(m.roomId);
        if (!room) return { roomId: m.roomId, unreadCount: 0 };

        const lastReadAt = m.lastReadAt || 0;

        // Count messages created after last read
        const unreadCount = (await db
          .query("messages")
          .withIndex("by_room_and_created", q =>
            q.eq("roomId", m.roomId)
          )
          .filter(q =>
            q.and(
              q.gt(q.field("createdAt"), lastReadAt),
              q.neq(q.field("authorId"), user.id), // Don't count own messages
              q.eq(q.field("isDeleted"), false)
            )
          )
          .collect()
        ).length;

        return {
          roomId: m.roomId,
          unreadCount,
        };
      })
    );

    const totalUnread = unreadCounts.reduce((sum, c) => sum + c.unreadCount, 0);

    return {
      totalUnread,
      byRoom: unreadCounts,
    };
  }
);
```

### 2. Enhanced Room Queries

Add to `mono/packages/backend/convex/rooms.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { authenticatedQuery, authenticatedMutation } from "./authHelpers";

/**
 * List all rooms in an event with metadata
 * Includes last message info for sorting and preview
 */
export const listByEvent = authenticatedQuery(
  async ({ db, user }, args: {
    eventId: Id<"events">;
  }) => {
    // Get all rooms in event
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with metadata
    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        // Get participant count
        const participantCount = (await db
          .query("roomParticipants")
          .withIndex("by_room", q => q.eq("roomId", room._id))
          .collect()
        ).length;

        // Get user's membership
        const membership = await db
          .query("roomParticipants")
          .withIndex("by_room_and_user", q =>
            q.eq("roomId", room._id).eq("userId", user.id)
          )
          .first();

        // Get last message for preview
        const lastMessage = await db
          .query("messages")
          .withIndex("by_room_and_created", q =>
            q.eq("roomId", room._id)
          )
          .order("desc")
          .filter(q => q.eq(q.field("isDeleted"), false))
          .first();

        return {
          ...room,
          participantCount,
          isMember: !!membership,
          canPost: membership?.canPost || false,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            authorName: lastMessage.authorName,
            createdAt: lastMessage.createdAt,
          } : null,
        };
      })
    );

    // Sort: main rooms first, then by last activity
    return enrichedRooms.sort((a, b) => {
      // Main room always first
      if (a.type === "main") return -1;
      if (b.type === "main") return 1;

      // Then by last message time
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return bTime - aTime;
    });
  }
);

/**
 * Get room details with participant list
 */
export const getDetails = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
  }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Get participants with user details
    const participantRecords = await db
      .query("roomParticipants")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();

    const participants = await Promise.all(
      participantRecords.map(async (p) => {
        const userProfile = await db.get(p.userId);
        return {
          userId: p.userId,
          name: userProfile?.name || "Unknown",
          avatar: userProfile?.avatar,
          canPost: p.canPost,
          canManage: p.canManage,
          joinedAt: p.joinedAt,
        };
      })
    );

    // Get current user's membership
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    return {
      ...room,
      participants,
      participantCount: participants.length,
      membership,
      isMember: !!membership,
    };
  }
);
```

### 3. Update Schema

Ensure `mono/packages/backend/convex/schema.ts` includes:

```typescript
roomParticipants: defineTable({
  roomId: v.id("rooms"),
  userId: v.id("users"),

  // Permissions
  canPost: v.boolean(),
  canEdit: v.boolean(),
  canDelete: v.boolean(),
  canManage: v.boolean(),

  // Unread tracking
  lastReadAt: v.optional(v.number()),
  unreadCount: v.optional(v.number()),

  // Metadata
  notificationLevel: v.union(
    v.literal("all"),
    v.literal("mentions"),
    v.literal("none")
  ),
  joinedAt: v.number(),
  addedBy: v.optional(v.id("users")),
})
  .index("by_room", ["roomId"])
  .index("by_user", ["userId"])
  .index("by_room_and_user", ["roomId", "userId"]),
```

---

## Frontend Implementation

### 1. Room List Sidebar Component

Create `mono/apps/web/src/components/chat/room-list.tsx`:

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Hash, Lock, Users, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface RoomListProps {
  eventId: Id<"events">;
  currentRoomId?: Id<"rooms">;
  onRoomSelect: (roomId: Id<"rooms">) => void;
}

export function RoomList({
  eventId,
  currentRoomId,
  onRoomSelect,
}: RoomListProps) {
  // Get rooms with metadata
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId })
  );

  // Get unread summary
  const { data: unreadSummary } = useSuspenseQuery(
    convexQuery(api.messages.getUnreadSummary, { eventId })
  );

  const getRoomIcon = (type: string) => {
    switch (type) {
      case "main":
        return <Hash className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      case "topic":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Channels</h2>
          <Button size="sm" variant="ghost">+</Button>
        </div>

        {unreadSummary && unreadSummary.totalUnread > 0 && (
          <div className="text-xs text-muted-foreground">
            {unreadSummary.totalUnread} unread messages
          </div>
        )}
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {rooms.map((room) => {
          const unread = unreadSummary?.byRoom.find(
            (u) => u.roomId === room._id
          )?.unreadCount || 0;

          const isActive = currentRoomId === room._id;

          return (
            <button
              key={room._id}
              onClick={() => onRoomSelect(room._id)}
              className={cn(
                "w-full flex flex-col gap-1 px-3 py-2 rounded-md text-sm transition-colors text-left",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {/* Room Name & Icon */}
              <div className="flex items-center gap-2">
                {getRoomIcon(room.type)}
                <span className="flex-1 truncate font-medium">
                  {room.name}
                </span>
                {unread > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                )}
              </div>

              {/* Last Message Preview */}
              {room.lastMessage && (
                <div className="text-xs text-muted-foreground truncate pl-6">
                  <span className="font-medium">
                    {room.lastMessage.authorName}:
                  </span>{" "}
                  {room.lastMessage.text}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                <Users className="h-3 w-3" />
                <span>{room.participantCount}</span>
                {room.lastMessageAt && (
                  <>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(room.lastMessageAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Room Header Component

Create `mono/apps/web/src/components/chat/room-header.tsx`:

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Users, Settings, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RoomHeaderProps {
  roomId: Id<"rooms">;
  onShowParticipants?: () => void;
  onShowSearch?: () => void;
  onShowSettings?: () => void;
}

export function RoomHeader({
  roomId,
  onShowParticipants,
  onShowSearch,
  onShowSettings,
}: RoomHeaderProps) {
  const { data: room } = useSuspenseQuery(
    convexQuery(api.rooms.getDetails, { roomId })
  );

  return (
    <div className="border-b p-4 flex items-center justify-between">
      {/* Room Info */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-semibold text-lg">{room.name}</h2>
          {room.description && (
            <p className="text-sm text-muted-foreground">
              {room.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Participant Avatars */}
        <div className="flex items-center -space-x-2">
          {room.participants.slice(0, 5).map((participant) => (
            <Avatar key={participant.userId} className="h-8 w-8 border-2 border-background">
              {participant.avatar && (
                <AvatarImage src={participant.avatar} alt={participant.name} />
              )}
              <AvatarFallback className="text-xs">
                {participant.name[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {room.participantCount > 5 && (
            <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
              +{room.participantCount - 5}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowParticipants}
        >
          <Users className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowSearch}
        >
          <Search className="h-4 w-4" />
        </Button>

        {room.membership?.canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 3. Enhanced Chat Room with Room Selection

Update `mono/apps/web/src/routes/events.$eventId.chat.tsx`:

```typescript
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState, useEffect } from "react";
import { requireAuth } from "@/lib/route-guards";
import { ChatRoom } from "@/components/chat/chat-room";
import { RoomList } from "@/components/chat/room-list";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { Id } from "convex/_generated/dataModel";

export const Route = createFileRoute("/events/$eventId/chat")({
  beforeLoad: async () => {
    await requireAuth();
  },
  component: EventChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      roomId: search.roomId as string | undefined,
    };
  },
});

function EventChatPage() {
  const { eventId } = Route.useParams();
  const { roomId: queryRoomId } = Route.useSearch();
  const navigate = useNavigate();

  // Get current user
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.getCurrentProfile)
  );

  // Get event rooms
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId })
  );

  // Mark as read mutation
  const markAsRead = useConvexMutation(api.messages.markAsRead);

  // Determine current room
  const currentRoomId = queryRoomId || rooms[0]?._id;

  // Mark room as read when selected
  useEffect(() => {
    if (currentRoomId) {
      markAsRead({ roomId: currentRoomId as Id<"rooms"> });
    }
  }, [currentRoomId, markAsRead]);

  // Handle room selection
  const handleRoomSelect = (roomId: Id<"rooms">) => {
    navigate({
      search: { roomId },
    });
  };

  if (!currentRoomId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No rooms available</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Room List Sidebar */}
      <Suspense fallback={<div className="w-64 border-r bg-muted/10" />}>
        <RoomList
          eventId={eventId as Id<"events">}
          currentRoomId={currentRoomId as Id<"rooms">}
          onRoomSelect={handleRoomSelect}
        />
      </Suspense>

      {/* Chat Room */}
      <div className="flex-1">
        <Suspense fallback={<div className="h-full bg-background" />}>
          <ChatRoom
            key={currentRoomId} // Remount on room change
            roomId={currentRoomId as Id<"rooms">}
            currentUserId={user._id}
            currentUserName={user.name}
          />
        </Suspense>
      </div>
    </div>
  );
}
```

---

## Testing

### Manual Testing Checklist

1. **Room Navigation**
   - Switch between rooms → Content updates immediately
   - Unread badge clears when entering room
   - URL updates with room ID
   - Refresh page → Stays on same room

2. **Unread Counts**
   - Send message in Room A while viewing Room B
   - Badge appears on Room B in sidebar
   - Enter Room B → Badge disappears
   - Total unread count accurate

3. **Room List**
   - Main room always appears first
   - Rooms sorted by recent activity
   - Last message preview shows correctly
   - Participant count accurate

4. **Responsive Design**
   - Sidebar collapses on mobile
   - Room header adapts to small screens
   - Touch-friendly room selection

---

## Next Steps

Once room management is working:

1. ✅ **Phase 2.2 Complete** - Multi-room navigation with unread tracking!
2. ➡️ **Phase 2.3** - Add @mentions, reactions, and message editing
3. ➡️ **Phase 2.4** - Add image uploads and media handling

---

## Success Criteria

Before moving to Phase 2.3, verify:

- [ ] Can switch between multiple rooms
- [ ] Unread counts display correctly
- [ ] Badges clear when viewing room
- [ ] Room list sorted correctly
- [ ] Last message previews shown
- [ ] Room header shows participants
- [ ] URL persists room selection
- [ ] All rooms accessible

**Phase 2.2 Complete = Multi-room chat with smart navigation!** 🗂️
