# Phase 2.0: Real-Time Messaging Foundation

> **Status:** Phase 2.0 - Core Messaging Infrastructure
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1 Complete (Database Schema, Auth, Basic CRUD)
> **Next:** Phase 2.1 - Message History & Pagination

---

## Overview

This phase establishes the foundational real-time messaging system using Convex. You'll build the core send/receive functionality with automatic real-time updates, optimistic UI updates, and basic message display.

### What You'll Build

- ✅ Send messages with real-time delivery
- ✅ Receive messages via Convex subscriptions (no polling!)
- ✅ Optimistic UI updates for instant feedback
- ✅ Auto-scrolling message list
- ✅ Basic message display with author info
- ✅ Message input component with keyboard shortcuts

### Architecture Decision: Convex Real-Time

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

**Key Benefits:**
- No polling required
- No manual cache invalidation
- Automatic consistency across clients
- Built-in real-time subscriptions

---

## Backend Implementation

### 1. Message Send Mutation

Update `mono/packages/backend/convex/messages.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireCanPostInRoom,
} from "./authHelpers";

/**
 * Send message with author name denormalization for performance
 * Denormalization: Store author name directly to avoid join queries
 */
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
  }) => {
    // Security: Verify user can post in this room
    await requireCanPostInRoom(db as any, args.roomId);

    // Get user profile for denormalization
    const userProfile = await db.get(user.id);
    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Insert message
    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,

      // Denormalized author data (performance optimization)
      // Avoids need to join users table on every message query
      authorName: userProfile.name,
      authorAvatar: userProfile.avatar,

      // Metadata
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // Update room's lastMessageAt for room list sorting
    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);
```

### 2. Real-Time Message Subscription

Add subscription query to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Real-time message subscription
 * Returns latest 50 messages in chronological order
 *
 * This query is "live" - Convex automatically pushes updates
 * when new messages are inserted or existing messages change
 */
export const subscribe = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    limit?: number;
  }) => {
    // Security: Verify user is room member
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    // Get latest messages (newest first, then reverse for display)
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc")
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 50);

    return {
      messages: messages.reverse(), // Oldest first for chronological display
      membership, // Include permissions for UI
    };
  }
);
```

### 3. Schema Updates

Ensure your schema in `mono/packages/backend/convex/schema.ts` includes:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    roomId: v.id("rooms"),
    authorId: v.id("users"),

    // Content
    text: v.string(),

    // Denormalized author data (performance optimization)
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),

    // Metadata
    isEdited: v.boolean(),
    isDeleted: v.boolean(),
    isAIGenerated: v.boolean(),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
  })
    .index("by_room_and_created", ["roomId", "createdAt"])
    .index("by_author", ["authorId"]),

  rooms: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    type: v.union(
      v.literal("main"),
      v.literal("topic"),
      v.literal("private")
    ),
    description: v.optional(v.string()),

    // For sorting room list
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_type", ["eventId", "type"]),

  roomParticipants: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),

    // Permissions
    canPost: v.boolean(),
    canEdit: v.boolean(),
    canDelete: v.boolean(),
    canManage: v.boolean(),

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
});
```

### 4. Auth Helper Function

Create or update `mono/packages/backend/convex/authHelpers.ts`:

```typescript
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Verify user can post in room
 * Throws error if not authorized
 */
export async function requireCanPostInRoom(
  db: QueryCtx["db"],
  roomId: Id<"rooms">
) {
  // Get current user from auth
  const identity = await db.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await db
    .query("users")
    .withIndex("by_token", q =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  // Check room membership
  const membership = await db
    .query("roomParticipants")
    .withIndex("by_room_and_user", q =>
      q.eq("roomId", roomId).eq("userId", user._id)
    )
    .first();

  if (!membership) {
    throw new Error("Not a room member");
  }

  if (!membership.canPost) {
    throw new Error("No permission to post in this room");
  }

  return { user, membership };
}

/**
 * Wrapper for authenticated mutations
 */
export const authenticatedMutation = customMutation(
  async ({ db, auth }, args, handler) => {
    const identity = await auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .query("users")
      .withIndex("by_token", q =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return handler({ db, user }, args);
  }
);

/**
 * Wrapper for authenticated queries
 */
export const authenticatedQuery = customQuery(
  async ({ db, auth }, args, handler) => {
    const identity = await auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await db
      .query("users")
      .withIndex("by_token", q =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return handler({ db, user }, args);
  }
);
```

---

## Frontend Implementation

### 1. Message Item Component

Create `mono/apps/web/src/components/chat/message-item.tsx`:

```typescript
import { Id } from "convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  _id: Id<"messages">;
  text: string;
  authorId: Id<"users">;
  authorName: string;
  authorAvatar?: string;
  createdAt: number;
  isEdited: boolean;
}

interface MessageItemProps {
  message: Message;
  isOptimistic?: boolean; // Flag for messages pending server confirmation
}

export function MessageItem({ message, isOptimistic }: MessageItemProps) {
  // Generate initials for avatar fallback
  const initials = message.authorName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex gap-3 ${isOptimistic ? "opacity-60" : ""}`}
      data-message-id={message._id}
    >
      {/* Author Avatar */}
      <Avatar className="h-10 w-10">
        {message.authorAvatar && (
          <AvatarImage src={message.authorAvatar} alt={message.authorName} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Author & Timestamp */}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">
            {message.authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
            {message.isEdited && " (edited)"}
          </span>
        </div>

        {/* Message Text */}
        <div className="text-sm mt-1 whitespace-pre-wrap break-words">
          {message.text}
        </div>
      </div>
    </div>
  );
}
```

### 2. Message List Component

Create `mono/apps/web/src/components/chat/message-list.tsx`:

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { MessageItem } from "./message-item";

interface MessageListProps {
  roomId: Id<"rooms">;
}

export function MessageList({ roomId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageCountRef = useRef(0);

  // Real-time subscription to latest messages
  // This query automatically updates when new messages arrive!
  const { data } = useSuspenseQuery(
    convexQuery(api.messages.subscribe, { roomId, limit: 50 })
  );

  const { messages, membership } = data;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      const isNewMessage = messages.length > prevMessageCountRef.current;

      if (isNewMessage) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }

    prevMessageCountRef.current = messages.length;
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
      {messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))
      )}
    </div>
  );
}
```

### 3. Message Input Component

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
  const queryClient = useQueryClient();

  const sendMessage = useConvexMutation(api.messages.send);

  const mutation = useMutation({
    mutationFn: async (messageText: string) => {
      return await sendMessage({ roomId, text: messageText });
    },

    // Optimistic update: Show message immediately
    onMutate: async (messageText) => {
      // Cancel outgoing queries to prevent overwrites
      await queryClient.cancelQueries({
        queryKey: ["convex", api.messages.subscribe, { roomId, limit: 50 }]
      });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData([
        "convex",
        api.messages.subscribe,
        { roomId, limit: 50 }
      ]);

      // Optimistically update cache
      queryClient.setQueryData(
        ["convex", api.messages.subscribe, { roomId, limit: 50 }],
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            messages: [
              ...old.messages,
              {
                _id: `temp-${Date.now()}`, // Temporary ID
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
        }
      );

      return { previous };
    },

    // Rollback on error
    onError: (err, text, context) => {
      queryClient.setQueryData(
        ["convex", api.messages.subscribe, { roomId, limit: 50 }],
        context?.previous
      );
      toast.error("Failed to send message");
    },

    // Clear input on success
    onSuccess: () => {
      setText("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || mutation.isPending) return;

    mutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
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
          disabled={mutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || mutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
```

### 4. Complete Chat Room Component

Create `mono/apps/web/src/components/chat/chat-room.tsx`:

```typescript
import { Suspense } from "react";
import { Id } from "convex/_generated/dataModel";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatRoomProps {
  roomId: Id<"rooms">;
  currentUserId: Id<"users">;
  currentUserName: string;
}

export function ChatRoom({
  roomId,
  currentUserId,
  currentUserName
}: ChatRoomProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Room Header - Implement in Phase 2.2 */}
      <div className="border-b p-4">
        <h2 className="font-semibold">Chat Room</h2>
      </div>

      {/* Message List with Suspense for loading state */}
      <Suspense fallback={<ChatSkeleton />}>
        <MessageList roomId={roomId} />
      </Suspense>

      {/* Message Input */}
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

### 5. Basic Chat Page Route

Create `mono/apps/web/src/routes/events.$eventId.chat.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { requireAuth } from "@/lib/route-guards";
import { ChatRoom } from "@/components/chat/chat-room";
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

  // Get current user
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.getCurrentProfile)
  );

  // Get event's main room (for now, we'll use the main room)
  // Phase 2.2 will add room selection
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId })
  );

  const mainRoom = rooms.find(r => r.type === "main");

  if (!mainRoom) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No chat room found</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ChatRoom
        roomId={mainRoom._id}
        currentUserId={user._id}
        currentUserName={user.name}
      />
    </div>
  );
}
```

---

## Testing Your Implementation

### Manual Testing Checklist

1. **Send Message**
   - Type a message and press Enter
   - Message should appear instantly (optimistic update)
   - Message should have proper timestamp and author name

2. **Real-Time Updates**
   - Open chat in two browser tabs (or use incognito)
   - Send message from Tab 1
   - Should appear in Tab 2 within 500ms

3. **Auto-Scroll Behavior**
   - Scroll to bottom, send message → Should stay at bottom
   - Scroll up, send message → Should NOT scroll (stay in place)
   - Scroll back to bottom → Should resume auto-scrolling

4. **Keyboard Shortcuts**
   - Enter → Send message
   - Shift+Enter → New line in message

5. **Error Handling**
   - Disconnect network
   - Try to send message
   - Should show error toast
   - Message should disappear (rollback)

### Unit Test Example

```typescript
// mono/packages/backend/convex/messages.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Message Send", () => {
  it("should send message with author info", async () => {
    const t = convexTest(schema);

    // Create user
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
    });

    // Create event and room
    const eventId = await t.mutation(api.events.create, {
      name: "Test Event",
      type: "party",
    });

    const roomId = await t.mutation(api.rooms.create, {
      eventId,
      name: "Main",
      type: "main",
    });

    // Send message
    const messageId = await t.mutation(api.messages.send, {
      roomId,
      text: "Hello world!",
    });

    expect(messageId).toBeDefined();

    // Verify message
    const { messages } = await t.query(api.messages.subscribe, { roomId });
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("Hello world!");
    expect(messages[0].authorName).toBe("Test User");
  });
});
```

---

## Common Issues & Solutions

### Issue: Messages not updating in real-time

**Solution:** Check that you're using `useSuspenseQuery` with `convexQuery`, not regular React Query:

```typescript
// ❌ Wrong
const { data } = useQuery({
  queryKey: ["messages"],
  queryFn: () => convexClient.query(api.messages.subscribe, { roomId })
});

// ✅ Correct
const { data } = useSuspenseQuery(
  convexQuery(api.messages.subscribe, { roomId })
);
```

### Issue: Optimistic update not working

**Solution:** Ensure query key matches exactly:

```typescript
// Keys must match!
const queryKey = ["convex", api.messages.subscribe, { roomId, limit: 50 }];

// In useSuspenseQuery
convexQuery(api.messages.subscribe, { roomId, limit: 50 })

// In onMutate
queryClient.setQueryData(queryKey, ...)
```

### Issue: Auto-scroll jumping unexpectedly

**Solution:** Only scroll on new messages, not on every render:

```typescript
const prevMessageCountRef = useRef(0);

useEffect(() => {
  const isNewMessage = messages.length > prevMessageCountRef.current;

  if (shouldAutoScroll && isNewMessage && scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }

  prevMessageCountRef.current = messages.length;
}, [messages.length, shouldAutoScroll]);
```

---

## Next Steps

Once you have basic messaging working:

1. ✅ **Phase 2.0 Complete** - You can send/receive messages in real-time!
2. ➡️ **Phase 2.1** - Add message history pagination for older messages
3. ➡️ **Phase 2.2** - Add room management and navigation
4. ➡️ **Phase 2.3** - Add @mentions, reactions, editing

---

## Success Criteria

Before moving to Phase 2.1, verify:

- [ ] Can send messages that appear instantly
- [ ] Messages sync across multiple browser tabs
- [ ] Auto-scroll works correctly
- [ ] Enter sends, Shift+Enter adds new line
- [ ] Error handling works (network disconnect test)
- [ ] Messages show correct author name and avatar
- [ ] Timestamps display correctly
- [ ] UI feels snappy and responsive

**Phase 2.0 Complete = Real-time messaging foundation ready!** 🚀
