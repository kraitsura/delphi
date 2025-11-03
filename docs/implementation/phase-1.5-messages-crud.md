# Phase 1.5: Messages & Real-time Chat

> **Status:** Phase 1.5 - Real-time Messaging
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1.4 (Rooms CRUD) completed
> **Estimated Time:** 3-4 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Backend: Message Operations](#backend-message-operations)
3. [Real-time Subscriptions](#real-time-subscriptions)
4. [Frontend Components](#frontend-components)
5. [Testing](#testing)
6. [Next Steps](#next-steps)

---

## Overview

This phase implements real-time chat messaging within rooms. Users can send, edit, delete messages, and see real-time updates.

**What You'll Build:**
- ✅ Send messages
- ✅ List messages (paginated)
- ✅ Edit messages
- ✅ Delete messages (soft delete)
- ✅ Mark room as read
- ✅ Get unread counts
- ✅ Real-time message subscriptions

---

## Backend: Message Operations

Create `mono/packages/backend/convex/messages.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireCanPostInRoom,
} from "./auth-helpers";

export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    mentions?: Id<"users">[];
    attachments?: Array<{
      type: "image" | "file";
      url: string;
      name: string;
      size: number;
    }>;
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      mentions: args.mentions,
      attachments: args.attachments,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);

export const listByRoom = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    limit?: number;
    before?: number;
  }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    let query = db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc");

    if (args.before) {
      query = query.filter(q => q.lt(q.field("createdAt"), args.before));
    }

    const messages = await query
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 50);

    const authorIds = [...new Set(messages.map(m => m.authorId))];
    const authors = await Promise.all(authorIds.map(id => db.get(id)));
    const authorMap = new Map(authors.map(a => [a!._id, a]));

    return messages.map(m => ({
      ...m,
      author: authorMap.get(m.authorId),
    }));
  }
);

export const edit = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
    text: string;
  }) => {
    const message = await db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.authorId !== user.id) {
      throw new Error("Forbidden: Can only edit own messages");
    }

    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canEdit) {
      throw new Error("Forbidden: No edit permission");
    }

    await db.patch(args.messageId, {
      text: args.text,
      isEdited: true,
      editedAt: Date.now(),
    });

    return await db.get(args.messageId);
  }
);

export const remove = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
  }) => {
    const message = await db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.authorId !== user.id) {
      throw new Error("Forbidden: Can only delete own messages");
    }

    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canDelete) {
      throw new Error("Forbidden: No delete permission");
    }

    await db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
      text: "[Message deleted]",
    });
  }
);

export const markRead = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
  }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a room member");
    }

    await db.patch(membership._id, {
      lastReadAt: Date.now(),
    });
  }
);

export const getUnreadCounts = authenticatedQuery(
  async ({ db, user }, args: {
    eventId?: Id<"events">;
  }) => {
    const memberships = await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect();

    let roomIds = memberships.map(m => m.roomId);

    if (args.eventId) {
      const rooms = await Promise.all(roomIds.map(id => db.get(id)));
      roomIds = rooms
        .filter(r => r?.eventId === args.eventId)
        .map(r => r!._id);
    }

    const unreadCounts = await Promise.all(
      roomIds.map(async (roomId) => {
        const membership = memberships.find(m => m.roomId === roomId);
        const lastReadAt = membership?.lastReadAt || 0;

        const unreadCount = (await db
          .query("messages")
          .withIndex("by_room_and_created", q =>
            q.eq("roomId", roomId)
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

        return { roomId, unreadCount };
      })
    );

    return unreadCounts;
  }
);
```

---

## Real-time Subscriptions

### Chat Room Component with Real-time Updates

```typescript
import { useConvexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

export function ChatRoom({ roomId }: { roomId: Id<"rooms"> }) {
  const queryClient = useQueryClient();

  // Real-time subscription to messages
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.messages.listByRoom, { roomId, limit: 50 })
  );

  const sendMessage = useConvexMutation(api.messages.send);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      return await sendMessage({ roomId, text });
    },

    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] });

      const previous = queryClient.getQueryData(["messages", roomId]);

      // Optimistic update
      queryClient.setQueryData(["messages", roomId], (old: any) => [
        {
          _id: `temp-${Date.now()}`,
          text,
          roomId,
          createdAt: Date.now(),
          isOptimistic: true,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (err, text, context) => {
      queryClient.setQueryData(["messages", roomId], context?.previous);
    },
  });

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={mutation.mutate} />
    </div>
  );
}
```

---

## Frontend Components

### Message Input Component

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" disabled={!text.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
```

---

## Testing

**Manual Testing:**
- [ ] Send message successfully
- [ ] Messages appear in real-time
- [ ] Edit message
- [ ] Delete message
- [ ] Mark room as read
- [ ] Unread count updates

---

## Next Steps

**Phase 1.6: Advanced Patterns & Optimization**

---

**Previous:** [Phase 1.4: Rooms CRUD](./phase-1.4-rooms-crud.md)

**Next:** [Phase 1.6: Advanced Patterns](./phase-1.6-advanced-patterns.md)
