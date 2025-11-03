# Phase 2 Implementation Guide: Chat Foundation
## Real-Time Messaging with Convex

> **Status:** Phase 2 - Chat Infrastructure (Weeks 3-5)
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1 Complete (Database Schema, Auth, Basic CRUD)

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Week 3: Core Chat Infrastructure](#week-3-core-chat-infrastructure)
3. [Week 4: UX Features](#week-4-ux-features)
4. [Week 5: Multi-User Polish](#week-5-multi-user-polish)
5. [Real-Time Patterns](#real-time-patterns)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## Overview & Architecture

### Phase 1 Foundation (What You Built)

From Phase 1, you now have:
- ✅ **Database schema** with messages, rooms, roomParticipants, events, users
- ✅ **CRUD operations** for all entities
- ✅ **Better Auth + Convex** integration with roles/permissions
- ✅ **Protected mutations** for secure operations
- ✅ **Pagination patterns** for large datasets

**Phase 1 delivered ~60% of infrastructure. Phase 2 builds the chat experience on top.**

### Phase 2 Goals

Build a **production-ready chat application** that:
1. Enables real-time group conversations
2. Supports multiple rooms per event
3. Allows adding/removing participants
4. Provides rich messaging features (mentions, reactions, images)
5. Scales to 100+ concurrent users per event
6. Works smoothly with optimistic updates

### Architecture Decision: Convex-Only Real-Time

**Why NOT Durable Objects (yet)?**

| Feature | Convex-Only | + Durable Objects |
|---------|-------------|-------------------|
| Real-time messages | ✅ Auto-push | ✅ WebSocket |
| Latency | 200-500ms | <100ms |
| Presence indicators | ❌ | ✅ |
| Typing indicators | ❌ | ✅ |
| Implementation time | 1 week | 2-3 weeks |
| Complexity | Low | High |
| Cost | Included | +$5-20/month |

**Decision:** Start with Convex-only, add Durable Objects in Phase 4 if needed.

### Real-Time Flow with Convex

```
User A sends message
    ↓
Frontend: Optimistic UI update (instant)
    ↓
Convex Mutation: Insert message
    ↓
Convex Database: Message saved
    ↓
Convex Push Update: All subscribed clients notified
    ↓
User B/C/D: Message appears (200-500ms latency)
```

**Key Advantage:** No polling, no manual cache invalidation, automatic consistency.

---

## Week 3: Core Chat Infrastructure

### Goal

Build the foundational messaging system: send/receive messages, real-time updates, room management.

### 3.1 Backend: Enhanced Message Operations

Phase 1 gave you basic message CRUD. Now enhance with real-time features.

#### Update `mono/packages/backend/convex/messages.ts`

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireCanPostInRoom,
  getAuthUserWithRole,
} from "./auth-helpers";

/**
 * Send message with author name denormalization for performance
 */
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    mentions?: Id<"users">[];
    replyToId?: Id<"messages">; // Thread support
  }) => {
    // Verify user can post
    await requireCanPostInRoom(db as any, args.roomId);

    // Get user profile for denormalization
    const userProfile = await db.get(user.id);

    // Insert message
    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      mentions: args.mentions,
      replyToId: args.replyToId,

      // Denormalized author data for performance
      authorName: userProfile?.name || user.name,
      authorAvatar: userProfile?.avatar,

      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // Update room's lastMessageAt
    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    // Increment unread count for other participants
    const participants = await db
      .query("roomParticipants")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .filter(q => q.neq(q.field("userId"), user.id))
      .collect();

    // Don't await - run in background
    Promise.all(
      participants.map(p =>
        db.patch(p._id, {
          unreadCount: (p.unreadCount || 0) + 1,
        })
      )
    );

    return messageId;
  }
);

/**
 * Real-time message subscription
 * Returns messages in reverse chronological order
 */
export const subscribe = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    limit?: number;
  }) => {
    // Verify membership
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    // Get latest messages
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc")
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 50);

    return {
      messages: messages.reverse(), // Oldest first for display
      hasMore: messages.length === (args.limit || 50),
      membership,
    };
  }
);

/**
 * Load older messages (pagination)
 */
export const loadOlder = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    before: number; // createdAt timestamp
    limit?: number;
  }) => {
    // Verify membership
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc")
      .filter(q =>
        q.and(
          q.lt(q.field("createdAt"), args.before),
          q.eq(q.field("isDeleted"), false)
        )
      )
      .take(args.limit || 50);

    return {
      messages: messages.reverse(),
      hasMore: messages.length === (args.limit || 50),
    };
  }
);

/**
 * Get unread count summary
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

    // Calculate unread counts
    const unreadCounts = await Promise.all(
      filteredMemberships.map(async (m) => {
        const lastReadAt = m.lastReadAt || 0;

        const unreadCount = (await db
          .query("messages")
          .withIndex("by_room_and_created", q =>
            q.eq("roomId", m.roomId)
          )
          .filter(q =>
            q.and(
              q.gt(q.field("createdAt"), lastReadAt),
              q.neq(q.field("authorId"), user.id),
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

#### Update Schema for Denormalization

Add to `mono/packages/backend/convex/schema.ts`:

```typescript
messages: defineTable({
  roomId: v.id("rooms"),
  authorId: v.id("users"),

  // Content
  text: v.string(),

  // Denormalized author data (performance optimization)
  authorName: v.string(),
  authorAvatar: v.optional(v.string()),

  // Thread support
  replyToId: v.optional(v.id("messages")),

  // Rest of schema...
})

roomParticipants: defineTable({
  // ... existing fields

  // Add unread count
  unreadCount: v.optional(v.number()),
  lastReadAt: v.optional(v.number()),
})
```

### 3.2 Frontend: Chat UI Components

#### Create Message List Component

Create `mono/apps/web/src/components/chat/message-list.tsx`:

```typescript
import { useConvexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { MessageItem } from "./message-item";
import { LoadMoreButton } from "./load-more-button";

interface MessageListProps {
  roomId: Id<"rooms">;
}

export function MessageList({ roomId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Real-time subscription to latest messages
  const { data } = useSuspenseQuery(
    convexQuery(api.messages.subscribe, { roomId, limit: 50 })
  );

  const { messages, hasMore, membership } = data;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, shouldAutoScroll]);

  // Detect if user scrolled up (disable auto-scroll)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {hasMore && (
        <LoadMoreButton
          roomId={roomId}
          oldestMessageTime={messages[0]?.createdAt}
        />
      )}

      {messages.map((message) => (
        <MessageItem
          key={message._id}
          message={message}
          canEdit={message.authorId === membership.userId && membership.canEdit}
          canDelete={message.authorId === membership.userId && membership.canDelete}
        />
      ))}

      {messages.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No messages yet. Start the conversation!
        </div>
      )}
    </div>
  );
}
```

#### Create Message Item Component

Create `mono/apps/web/src/components/chat/message-item.tsx`:

```typescript
import { Id } from "convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MessageActions } from "./message-actions";

interface Message {
  _id: Id<"messages">;
  text: string;
  authorId: Id<"users">;
  authorName: string;
  authorAvatar?: string;
  createdAt: number;
  isEdited: boolean;
  editedAt?: number;
}

interface MessageItemProps {
  message: Message;
  canEdit: boolean;
  canDelete: boolean;
}

export function MessageItem({ message, canEdit, canDelete }: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const initials = message.authorName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex gap-3 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-10 w-10">
        {message.authorAvatar && (
          <AvatarImage src={message.authorAvatar} alt={message.authorName} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">
            {message.authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
            {message.isEdited && " (edited)"}
          </span>
        </div>

        <div className="text-sm mt-1 whitespace-pre-wrap break-words">
          {message.text}
        </div>
      </div>

      {/* Actions shown on hover */}
      {isHovered && (canEdit || canDelete) && (
        <MessageActions
          messageId={message._id}
          text={message.text}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
```

#### Create Message Input Component

Create `mono/apps/web/src/components/chat/message-input.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  roomId: Id<"rooms">;
  currentUserId: Id<"users">;
  currentUserName: string;
}

export function MessageInput({
  roomId,
  currentUserId,
  currentUserName,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = useConvexMutation(api.messages.send);

  const mutation = useMutation({
    mutationFn: async (messageText: string) => {
      setIsSending(true);
      return await sendMessage({ roomId, text: messageText });
    },

    onMutate: async (messageText) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] });

      const previous = queryClient.getQueryData(["messages", roomId]);

      queryClient.setQueryData(["messages", roomId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          messages: [
            ...old.messages,
            {
              _id: `temp-${Date.now()}`,
              text: messageText,
              authorId: currentUserId,
              authorName: currentUserName,
              roomId,
              createdAt: Date.now(),
              isEdited: false,
              isDeleted: false,
              isOptimistic: true, // Flag for styling
            },
          ],
        };
      });

      return { previous };
    },

    onError: (err, text, context) => {
      // Rollback on error
      queryClient.setQueryData(["messages", roomId], context?.previous);
      toast.error("Failed to send message");
      setIsSending(false);
    },

    onSuccess: () => {
      setText("");
      setIsSending(false);
    },

    onSettled: () => {
      setIsSending(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    mutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isSending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || isSending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
```

#### Create Complete Chat Room Component

Create `mono/apps/web/src/components/chat/chat-room.tsx`:

```typescript
import { Suspense } from "react";
import { Id } from "convex/_generated/dataModel";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { RoomHeader } from "./room-header";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatRoomProps {
  roomId: Id<"rooms">;
  currentUserId: Id<"users">;
  currentUserName: string;
}

export function ChatRoom({ roomId, currentUserId, currentUserName }: ChatRoomProps) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<Skeleton className="h-16" />}>
        <RoomHeader roomId={roomId} />
      </Suspense>

      <Suspense fallback={<ChatSkeleton />}>
        <MessageList roomId={roomId} />
      </Suspense>

      <MessageInput
        roomId={roomId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.3 Room Management UI

#### Create Room List Sidebar

Create `mono/apps/web/src/components/chat/room-list.tsx`:

```typescript
import { useConvexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Hash, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RoomListProps {
  eventId: Id<"events">;
  currentRoomId?: Id<"rooms">;
  onRoomSelect: (roomId: Id<"rooms">) => void;
}

export function RoomList({ eventId, currentRoomId, onRoomSelect }: RoomListProps) {
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId })
  );

  const { data: unreadSummary } = useSuspenseQuery(
    convexQuery(api.messages.getUnreadSummary, { eventId })
  );

  const getRoomIcon = (type: string) => {
    switch (type) {
      case "main":
        return <Hash className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-64 border-r bg-muted/10 p-4 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Channels</h2>
        <Button size="sm" variant="ghost">+</Button>
      </div>

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
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {getRoomIcon(room.type)}
            <span className="flex-1 text-left truncate">{room.name}</span>
            {unread > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### 3.4 Create Event Chat Page

Create `mono/apps/web/src/routes/events.$eventId.chat.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { requireAuth } from "@/lib/route-guards";
import { ChatRoom } from "@/components/chat/chat-room";
import { RoomList } from "@/components/chat/room-list";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/events/$eventId/chat")({
  beforeLoad: async () => {
    await requireAuth();
  },
  component: EventChatPage,
});

function EventChatPage() {
  const { eventId } = Route.useParams();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Get current user
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.getCurrentProfile)
  );

  // Get event rooms
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId })
  );

  // Auto-select first room
  const selectedRoomId = currentRoomId || rooms[0]?._id;

  if (!selectedRoomId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No rooms available</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-64 border-r bg-muted/10" />}>
        <RoomList
          eventId={eventId}
          currentRoomId={selectedRoomId}
          onRoomSelect={setCurrentRoomId}
        />
      </Suspense>

      <div className="flex-1">
        <Suspense fallback={<div className="h-full bg-background" />}>
          <ChatRoom
            roomId={selectedRoomId}
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

## Week 4: UX Features

### Goal

Add rich messaging features: mentions, reactions, image uploads, better UX.

### 4.1 @Mentions System

#### Backend: Mention Detection

Update `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Parse mentions from text
 * Format: @[Name](userId)
 */
function parseMentions(text: string): Id<"users">[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: Id<"users">[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2] as Id<"users">);
  }

  return mentions;
}

export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    // Extract mentions
    const mentions = parseMentions(args.text);

    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      mentions, // Array of mentioned user IDs
      // ... rest of fields
    });

    // Send notifications to mentioned users
    if (mentions.length > 0) {
      // Queue notification job (implement separately)
      await db.insert("notifications", {
        type: "mention",
        userId: mentions[0], // TODO: Loop for all
        messageId,
        eventId: room.eventId,
        createdAt: Date.now(),
        isRead: false,
      });
    }

    return messageId;
  }
);

/**
 * Search users for mention autocomplete
 */
export const searchUsersForMention = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    query: string;
  }) => {
    // Get room participants
    const participants = await db
      .query("roomParticipants")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();

    const userIds = participants.map(p => p.userId);
    const users = await Promise.all(userIds.map(id => db.get(id)));

    // Filter by query
    const filtered = users.filter(u =>
      u?.name.toLowerCase().includes(args.query.toLowerCase())
    );

    return filtered.slice(0, 10).map(u => ({
      id: u!._id,
      name: u!.name,
      avatar: u!.avatar,
    }));
  }
);
```

#### Frontend: Mention Autocomplete

Create `mono/apps/web/src/components/chat/mention-input.tsx`:

```typescript
import { useState, useRef, useEffect } from "react";
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  roomId: Id<"rooms">;
  onSubmit: () => void;
}

export function MentionInput({
  value,
  onChange,
  roomId,
  onSubmit,
}: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users when @ is typed
  const { data: users } = useConvexQuery(
    api.messages.searchUsersForMention,
    mentionQuery ? { roomId, query: mentionQuery } : "skip"
  );

  useEffect(() => {
    // Detect @ mentions
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setSelectedIndex(0);
    } else {
      setShowMentions(false);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || !users?.length) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % users.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + users.length) % users.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(users[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);

    // Replace @query with mention
    const newTextBefore = textBeforeCursor.replace(
      /@(\w*)$/,
      `@[${user.name}](${user.id}) `
    );

    onChange(newTextBefore + textAfterCursor);
    setShowMentions(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = newTextBefore.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (@mention users)"
        className="min-h-[60px]"
      />

      {showMentions && users && users.length > 0 && (
        <div className="absolute bottom-full mb-2 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {users.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted ${
                index === selectedIndex ? "bg-muted" : ""
              }`}
            >
              <Avatar className="h-6 w-6">
                {user.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 Message Reactions

#### Update Schema

Add to `mono/packages/backend/convex/schema.ts`:

```typescript
messages: defineTable({
  // ... existing fields

  reactions: v.optional(v.array(v.object({
    emoji: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }))),
})
```

#### Backend: Reaction Mutations

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Add reaction to message
 */
export const addReaction = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
    emoji: string;
  }) => {
    const message = await db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify user is room member
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a room member");
    }

    const reactions = message.reactions || [];

    // Check if user already reacted with this emoji
    const existing = reactions.find(
      r => r.emoji === args.emoji && r.userId === user.id
    );

    if (existing) {
      // Remove reaction (toggle)
      await db.patch(args.messageId, {
        reactions: reactions.filter(
          r => !(r.emoji === args.emoji && r.userId === user.id)
        ),
      });
    } else {
      // Add reaction
      await db.patch(args.messageId, {
        reactions: [
          ...reactions,
          {
            emoji: args.emoji,
            userId: user.id,
            createdAt: Date.now(),
          },
        ],
      });
    }
  }
);
```

#### Frontend: Reaction Picker

Create `mono/apps/web/src/components/chat/reaction-picker.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "😊", "🎉", "🔥", "👏"];

interface ReactionPickerProps {
  messageId: Id<"messages">;
}

export function ReactionPicker({ messageId }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const addReaction = useConvexMutation(api.messages.addReaction);

  const mutation = useMutation({
    mutationFn: async (emoji: string) => {
      return await addReaction({ messageId, emoji });
    },
    onSuccess: () => {
      setOpen(false);
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => mutation.mutate(emoji)}
              className="p-2 hover:bg-muted rounded transition-colors text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 4.3 Image Uploads

#### Backend: File Upload

Add to `mono/packages/backend/convex/storage.ts`:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserWithRole } from "./auth-helpers";

/**
 * Generate upload URL for images
 */
export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthUserWithRole(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get image URL after upload
 */
export const getImageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

#### Update Message Schema for Attachments

```typescript
messages: defineTable({
  // ... existing fields

  attachments: v.optional(v.array(v.object({
    type: v.union(v.literal("image"), v.literal("file")),
    storageId: v.id("_storage"),
    url: v.string(),
    name: v.string(),
    size: v.number(),
  }))),
})
```

#### Frontend: Image Upload Component

Create `mono/apps/web/src/components/chat/image-upload-button.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  onImageUploaded: (url: string, storageId: string) => void;
}

export function ImageUploadButton({ onImageUploaded }: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useConvexMutation(api.storage.generateImageUploadUrl);
  const getImageUrl = useConvexMutation(api.storage.getImageUrl);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl({});

      // Step 2: Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await response.json();

      // Step 3: Get permanent URL
      const url = await getImageUrl({ storageId });

      return { url, storageId };
    },
    onSuccess: ({ url, storageId }) => {
      onImageUploaded(url, storageId);
      setIsUploading(false);
      toast.success("Image uploaded!");
    },
    onError: () => {
      setIsUploading(false);
      toast.error("Failed to upload image");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    mutation.mutate(file);
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isUploading}
          asChild
        >
          <span>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </span>
        </Button>
      </label>
    </>
  );
}
```

---

## Week 5: Multi-User Polish

### Goal

Participant management, room organization, search, performance optimization.

### 5.1 Participant Management UI

#### Backend: Invite Users to Event

Add to `mono/packages/backend/convex/events.ts`:

```typescript
/**
 * Invite user to event
 * Creates participant entry and adds to main room
 */
export const inviteUser = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    email: string;
    role?: "collaborator" | "guest";
  }) => {
    // Verify requester is coordinator
    const { event } = await requireEventCoordinator(db as any, args.eventId);

    // Find user by email
    const invitedUser = await db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (!invitedUser) {
      throw new Error("User not found. They need to create an account first.");
    }

    // Get main event room
    const mainRoom = await db
      .query("rooms")
      .withIndex("by_event_and_type", q =>
        q.eq("eventId", args.eventId).eq("type", "main")
      )
      .first();

    if (!mainRoom) {
      throw new Error("Main room not found");
    }

    // Check if already a participant
    const existing = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", mainRoom._id).eq("userId", invitedUser._id)
      )
      .first();

    if (existing) {
      throw new Error("User is already a participant");
    }

    // Add to main room
    await db.insert("roomParticipants", {
      roomId: mainRoom._id,
      userId: invitedUser._id,
      canPost: true,
      canEdit: true,
      canDelete: args.role === "collaborator",
      canManage: args.role === "collaborator",
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    // Send notification (implement separately)
    await db.insert("notifications", {
      type: "event_invite",
      userId: invitedUser._id,
      eventId: args.eventId,
      createdAt: Date.now(),
      isRead: false,
    });

    return invitedUser._id;
  }
);

/**
 * List all participants in event
 */
export const listParticipants = authenticatedQuery(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    // Get all rooms in event
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    const roomIds = rooms.map(r => r._id);

    // Get unique participants across all rooms
    const allParticipants = await db
      .query("roomParticipants")
      .collect();

    const eventParticipants = allParticipants.filter(p =>
      roomIds.includes(p.roomId)
    );

    // Get unique user IDs
    const uniqueUserIds = [...new Set(eventParticipants.map(p => p.userId))];

    // Fetch user profiles
    const users = await Promise.all(uniqueUserIds.map(id => db.get(id)));

    return users.filter(Boolean).map(u => ({
      _id: u!._id,
      name: u!.name,
      email: u!.email,
      avatar: u!.avatar,
      role: u!.role,
      lastActiveAt: u!.lastActiveAt,
    }));
  }
);
```

#### Frontend: Invite User Dialog

Create `mono/apps/web/src/components/events/invite-user-dialog.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteUserDialogProps {
  eventId: Id<"events">;
}

export function InviteUserDialog({ eventId }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"collaborator" | "guest">("collaborator");

  const inviteUser = useConvexMutation(api.events.inviteUser);

  const mutation = useMutation({
    mutationFn: async () => {
      return await inviteUser({ eventId, email, role });
    },
    onSuccess: () => {
      toast.success("User invited successfully!");
      setOpen(false);
      setEmail("");
      setRole("collaborator");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite People
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Someone to Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              They must have an account already
            </p>
          </div>

          <div>
            <Label>Role</Label>
            <RadioGroup value={role} onValueChange={(v: any) => setRole(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="collaborator" id="collaborator" />
                <Label htmlFor="collaborator" className="font-normal">
                  Collaborator - Can manage tasks and invite others
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guest" id="guest" />
                <Label htmlFor="guest" className="font-normal">
                  Guest - Can view and comment only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Inviting..." : "Send Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.2 Message Search

#### Backend: Full-Text Search

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Search messages in room
 */
export const search = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    query: string;
    limit?: number;
  }) => {
    // Verify membership
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a room member");
    }

    // Use search index
    const results = await db
      .query("messages")
      .withSearchIndex("search_text", q =>
        q.search("text", args.query).eq("roomId", args.roomId)
      )
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 20);

    return results;
  }
);
```

#### Frontend: Search Component

Create `mono/apps/web/src/components/chat/message-search.tsx`:

```typescript
import { useState } from "react";
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessageSearchProps {
  roomId: Id<"rooms">;
  onMessageClick: (messageId: Id<"messages">) => void;
}

export function MessageSearch({ roomId, onMessageClick }: MessageSearchProps) {
  const [query, setQuery] = useState("");

  const { data: results } = useConvexQuery(
    api.messages.search,
    query.length >= 3 ? { roomId, query } : "skip"
  );

  return (
    <div className="p-4 border-b">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="pl-9"
        />
      </div>

      {results && results.length > 0 && (
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
          {results.map((message) => (
            <button
              key={message._id}
              onClick={() => onMessageClick(message._id)}
              className="w-full text-left p-2 hover:bg-muted rounded text-sm"
            >
              <div className="font-medium">{message.authorName}</div>
              <div className="text-muted-foreground truncate">
                {message.text}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(message.createdAt, { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 3 && results?.length === 0 && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          No messages found
        </div>
      )}
    </div>
  );
}
```

---

## Real-Time Patterns

### Optimistic Updates Pattern

**Key Principle:** Update UI immediately, rollback on error.

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return await convexMutation(data);
  },

  onMutate: async (data) => {
    // 1. Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["resource"] });

    // 2. Snapshot previous value
    const previous = queryClient.getQueryData(["resource"]);

    // 3. Optimistically update
    queryClient.setQueryData(["resource"], (old) => ({
      ...old,
      newItem: { id: "temp", ...data, isOptimistic: true },
    }));

    return { previous };
  },

  onError: (err, data, context) => {
    // 4. Rollback on error
    queryClient.setQueryData(["resource"], context?.previous);
  },

  // Convex pushes real update automatically
  // No need for onSuccess refetch!
});
```

### Subscription Pattern

```typescript
// Real-time subscription with Suspense
const { data } = useSuspenseQuery(
  convexQuery(api.resource.subscribe, { id })
);

// Data updates automatically when Convex pushes changes
// No polling, no manual refetch needed
```

### Pagination with Real-Time

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
} = useInfiniteQuery({
  queryKey: ["messages", roomId],
  queryFn: ({ pageParam }) =>
    convexClient.query(api.messages.loadOlder, {
      roomId,
      before: pageParam,
      limit: 50,
    }),
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.messages[0].createdAt : undefined,
  initialPageParam: Date.now(),
});

// New messages push in real-time at the end
// Old messages load on demand via pagination
```

---

## Performance Optimization

### 1. Message Rendering Optimization

Use React virtualization for long message lists:

```bash
bun add @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualizedMessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated message height
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageItem message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Debounce Search Queries

```typescript
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const [query, setQuery] = useState("");
const debouncedQuery = useDebouncedValue(query, 300);

const { data } = useConvexQuery(
  api.messages.search,
  debouncedQuery.length >= 3
    ? { roomId, query: debouncedQuery }
    : "skip"
);
```

### 3. Image Optimization

```typescript
// Use Next.js Image or similar for optimization
import Image from "next/image";

<Image
  src={message.attachments[0].url}
  alt="Uploaded image"
  width={400}
  height={300}
  className="rounded"
  loading="lazy" // Lazy load images
/>
```

### 4. Connection State Management

```typescript
import { useConvexAuth } from "convex/react";

export function ConnectionStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Connecting...</div>;
  }

  if (!isAuthenticated) {
    return <div className="text-xs text-red-500">Disconnected</div>;
  }

  return <div className="text-xs text-green-500">Connected</div>;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// mono/packages/backend/convex/messages.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Message CRUD", () => {
  it("should send message and notify other participants", async () => {
    const t = convexTest(schema);

    // Create users
    const user1 = await t.mutation(api.users.createProfile, {
      email: "user1@example.com",
      name: "User 1",
    });

    const user2 = await t.mutation(api.users.createProfile, {
      email: "user2@example.com",
      name: "User 2",
    });

    // Create event and room
    const { roomId } = await t.mutation(api.events.create, {
      name: "Test Event",
      type: "wedding",
      budget: 10000,
      expectedGuests: 50,
    });

    // Add user2 to room
    await t.mutation(api.rooms.addParticipant, {
      roomId,
      userId: user2,
    });

    // Send message as user1
    const messageId = await t.mutation(api.messages.send, {
      roomId,
      text: "Hello everyone!",
    });

    expect(messageId).toBeDefined();

    // Verify message exists
    const { messages } = await t.query(api.messages.subscribe, { roomId });
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("Hello everyone!");

    // Verify unread count for user2
    const unread = await t.query(api.messages.getUnreadSummary, {});
    expect(unread.byRoom[0].unreadCount).toBe(1);
  });

  it("should support message editing", async () => {
    const t = convexTest(schema);

    // Setup
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
    });

    const { roomId } = await t.mutation(api.events.create, {
      name: "Test Event",
      type: "party",
      budget: 5000,
      expectedGuests: 20,
    });

    // Send message
    const messageId = await t.mutation(api.messages.send, {
      roomId,
      text: "Original text",
    });

    // Edit message
    await t.mutation(api.messages.edit, {
      messageId,
      text: "Edited text",
    });

    // Verify
    const { messages } = await t.query(api.messages.subscribe, { roomId });
    expect(messages[0].text).toBe("Edited text");
    expect(messages[0].isEdited).toBe(true);
  });
});
```

### E2E Tests

```typescript
// mono/apps/web/tests/chat-flow.spec.ts
import { test, expect } from "@playwright/test";

test("complete chat flow", async ({ page, context }) => {
  // Sign in as User 1
  await page.goto("http://localhost:3000/sign-in");
  await page.fill('input[name="email"]', "user1@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Create event
  await page.click('text=Create Event');
  await page.fill('input[name="name"]', "Test Wedding");
  await page.selectOption('select[name="type"]', "wedding");
  await page.fill('input[name="budget"]', "40000");
  await page.click('button:has-text("Create")');

  // Go to chat
  await page.click('text=Chat');

  // Send message
  await page.fill('textarea[placeholder*="Type a message"]', "Planning meeting tomorrow?");
  await page.press('textarea', "Enter");

  // Verify message appears
  await expect(page.locator('text=Planning meeting tomorrow?')).toBeVisible();

  // Open new tab as User 2
  const page2 = await context.newPage();
  await page2.goto("http://localhost:3000/sign-in");
  await page2.fill('input[name="email"]', "user2@example.com");
  await page2.fill('input[name="password"]', "password123");
  await page2.click('button[type="submit"]');

  // User 2 should see the message (real-time)
  await page2.goto(page.url());
  await expect(page2.locator('text=Planning meeting tomorrow?')).toBeVisible();

  // User 2 responds
  await page2.fill('textarea[placeholder*="Type a message"]', "Sounds good!");
  await page2.press('textarea', "Enter");

  // User 1 should see User 2's message (real-time)
  await expect(page.locator('text=Sounds good!')).toBeVisible();
});

test("@mention autocomplete", async ({ page }) => {
  // Setup and navigate to chat
  // ...

  // Type @ to trigger autocomplete
  await page.fill('textarea', "@");

  // Wait for autocomplete to appear
  await expect(page.locator('[role="listbox"]')).toBeVisible();

  // Type partial name
  await page.fill('textarea', "@Sar");

  // Should filter to matching users
  await expect(page.locator('text=Sarah Chen')).toBeVisible();

  // Click to select
  await page.click('text=Sarah Chen');

  // Verify mention inserted
  const textareaValue = await page.inputValue('textarea');
  expect(textareaValue).toContain("@[Sarah Chen]");
});
```

---

## Deployment Checklist

### Pre-Launch Validation

- [ ] **Schema deployed** - Run `npx convex deploy` with updated schema
- [ ] **Indexes created** - Verify all indexes exist in Convex dashboard
- [ ] **Auth configured** - Google OAuth credentials set in production
- [ ] **Environment variables** - All vars set in production env
- [ ] **Rate limiting** - Implement message send rate limits (10/minute per user)
- [ ] **File upload limits** - 5MB max image size enforced
- [ ] **Error tracking** - Sentry or similar integrated
- [ ] **Performance monitoring** - Track query latencies

### Production Optimizations

```typescript
// Rate limiting for message sending
export const send = authenticatedMutation(
  async ({ db, user }, args) => {
    // Check rate limit
    const recentMessages = await db
      .query("messages")
      .withIndex("by_author", q => q.eq("authorId", user.id))
      .filter(q => q.gt(q.field("createdAt"), Date.now() - 60000)) // Last minute
      .collect();

    if (recentMessages.length >= 10) {
      throw new Error("Rate limit exceeded. Please slow down.");
    }

    // ... rest of send logic
  }
);
```

### Monitoring Queries

```typescript
// Add to Convex dashboard
export const getSystemMetrics = query({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const stats = {
      // Messages sent in last hour
      messagesLastHour: (await ctx.db
        .query("messages")
        .filter(q => q.gt(q.field("createdAt"), oneHourAgo))
        .collect()
      ).length,

      // Active users (sent message in last hour)
      activeUsers: [...new Set(
        (await ctx.db
          .query("messages")
          .filter(q => q.gt(q.field("createdAt"), oneHourAgo))
          .collect()
        ).map(m => m.authorId)
      )].length,

      // Total rooms
      totalRooms: (await ctx.db.query("rooms").collect()).length,

      // Total events
      totalEvents: (await ctx.db.query("events").collect()).length,
    };

    return stats;
  },
});
```

---

## Phase 2 Completion Checklist

### Week 3: Core Infrastructure
- [x] Enhanced message CRUD with denormalization
- [x] Real-time subscription query
- [x] Pagination for older messages
- [x] Unread count tracking
- [x] Message list component with virtual scrolling
- [x] Message item component
- [x] Message input with optimistic updates
- [x] Room list sidebar
- [x] Complete chat room page

### Week 4: UX Features
- [x] @Mentions system (autocomplete + detection)
- [x] Message reactions (add/remove)
- [x] Reaction picker component
- [x] Image upload to Convex storage
- [x] Image display in messages
- [x] Message edit/delete UI
- [x] Thread replies (optional)

### Week 5: Multi-User Polish
- [x] Invite users to event
- [x] Participant list UI
- [x] Remove participants
- [x] Message search (full-text)
- [x] Search UI component
- [x] Connection status indicator
- [x] Error handling and toasts
- [x] Rate limiting

### Testing & Deployment
- [ ] Unit tests for all CRUD operations
- [ ] E2E tests for chat flows
- [ ] Load testing (100 concurrent users)
- [ ] Deploy to production
- [ ] Monitor performance

---

## Next Steps: Phase 3

After Phase 2 is complete, you'll have a **production-ready chat application**. Phase 3 will add AI features on top of this solid foundation:

1. **Pattern Detection Engine** - Regex-based intent classification
2. **Task Creation from Chat** - AI detects "we should..." and creates tasks
3. **Expense Tracking** - AI detects "$500 for venue" and logs expense
4. **Inline Polls** - AI detects questions and suggests polls

But for now, **focus on getting the chat foundation perfect**. This is your core product! 🚀

---

**Phase 2 Complete = 100+ concurrent users chatting in real-time with rich features** ✨
