# Phase 1.6: Advanced Patterns & Optimization

> **Status:** Phase 1.6 - Performance Optimization
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1.5 (Messages CRUD) completed
> **Estimated Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Real-time Subscriptions](#real-time-subscriptions)
3. [Pagination Patterns](#pagination-patterns)
4. [Denormalization Strategy](#denormalization-strategy)
5. [Avoiding N+1 Queries](#avoiding-n1-queries)
6. [Performance Best Practices](#performance-best-practices)

---

## Overview

This phase covers advanced patterns for optimizing Convex applications, including real-time subscriptions, pagination, denormalization, and avoiding common performance pitfalls.

---

## Real-time Subscriptions

### Optimistic Updates Pattern

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";

export function useOptimisticMessage() {
  const queryClient = useQueryClient();
  const sendMessage = useConvexMutation(api.messages.send);

  return useMutation({
    mutationFn: async (data: { roomId: string; text: string }) => {
      return await sendMessage(data);
    },

    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", data.roomId]
      });

      const previous = queryClient.getQueryData(["messages", data.roomId]);

      queryClient.setQueryData(["messages", data.roomId], (old: any) => [
        {
          _id: `temp-${Date.now()}`,
          text: data.text,
          createdAt: Date.now(),
          isOptimistic: true,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (err, data, context) => {
      queryClient.setQueryData(
        ["messages", data.roomId],
        context?.previous
      );
    },
  });
}
```

---

## Pagination Patterns

### Infinite Scroll for Messages

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex-client";
import { api } from "convex/_generated/api";

export function useInfiniteMessages(roomId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", roomId],
    queryFn: async ({ pageParam = undefined }) => {
      return await convexClient.query(api.messages.listByRoom, {
        roomId: roomId as any,
        limit: 50,
        before: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].createdAt;
    },
    initialPageParam: undefined,
  });
}
```

### Usage in Component

```typescript
export function MessageList({ roomId }: { roomId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMessages(roomId);

  const messages = data?.pages.flat() || [];

  return (
    <div>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
      {messages.map(message => (
        <MessageItem key={message._id} message={message} />
      ))}
    </div>
  );
}
```

---

## Denormalization Strategy

### When to Denormalize

**Scenario:** Displaying message author names

**Option 1: Join on Read (Recommended for most cases)**
```typescript
export const listMessages = query({
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();

    // Batch fetch authors
    const authorIds = [...new Set(messages.map(m => m.authorId))];
    const authors = await Promise.all(authorIds.map(id => ctx.db.get(id)));
    const authorMap = new Map(authors.map(a => [a!._id, a]));

    return messages.map(m => ({
      ...m,
      author: authorMap.get(m.authorId),
    }));
  },
});
```

**Option 2: Denormalize (For high read volume)**
```typescript
messages: defineTable({
  authorId: v.id("users"),
  authorName: v.string(),      // Denormalized
  authorAvatar: v.string(),    // Denormalized
  text: v.string(),
})

// Update on name change:
export const updateName = mutation({
  handler: async (ctx, { userId, newName }) => {
    await ctx.db.patch(userId, { name: newName });

    // Update all messages (background job)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_author", q => q.eq("authorId", userId))
      .collect();

    await Promise.all(
      messages.map(m => ctx.db.patch(m._id, { authorName: newName }))
    );
  },
});
```

### Decision Matrix

| Factor | Join on Read | Denormalize |
|--------|-------------|-------------|
| Read frequency | Low-Medium | High |
| Write frequency | Any | Low |
| Data volatility | High | Low |
| Consistency | Strong | Eventual OK |

---

## Avoiding N+1 Queries

### ❌ Bad: N+1 Query Pattern

```typescript
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(20);

    // N+1 problem: 20 separate queries!
    return await Promise.all(
      posts.map(async (post) => ({
        ...post,
        author: await ctx.db.get(post.authorId),
      }))
    );
  },
});
```

### ✅ Good: Batch Fetch Pattern

```typescript
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(20);

    // Single batch: get unique authors
    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = await Promise.all(authorIds.map(id => ctx.db.get(id)));
    const authorMap = new Map(authors.map(a => [a!._id, a]));

    // Map posts to authors (O(1) lookup)
    return posts.map(post => ({
      ...post,
      author: authorMap.get(post.authorId),
    }));
  },
});
```

---

## Performance Best Practices

### 1. Use Indexes for Large Queries

**✅ Good:**
```typescript
const events = await ctx.db
  .query("events")
  .withIndex("by_coordinator", q => q.eq("coordinatorId", userId))
  .collect();
```

**❌ Bad:**
```typescript
const allEvents = await ctx.db.query("events").collect();
const userEvents = allEvents.filter(e => e.coordinatorId === userId);
```

### 2. Limit Query Results

```typescript
// Instead of collecting all
const messages = await ctx.db.query("messages").take(50);
```

### 3. Separate Hot/Cold Data

```typescript
// Instead of mixing in one table
users: defineTable({
  email: v.string(),
  lastActiveAt: v.number(), // Updates frequently, causes rerenders
})

// Split into two tables
users: defineTable({
  email: v.string(),
})

userActivity: defineTable({
  userId: v.id("users"),
  lastActiveAt: v.number(),
})
```

### 4. Use Compound Indexes for Common Patterns

```typescript
// Good: Single compound index
.index("by_room_and_created", ["roomId", "createdAt"])

// Then query efficiently
const messages = await ctx.db
  .query("messages")
  .withIndex("by_room_and_created", q => q.eq("roomId", roomId))
  .order("desc")
  .take(50);
```

---

## Next Steps

**Phase 1.7: Testing & Validation**

**Estimated Time:** 2-3 hours

---

**Previous:** [Phase 1.5: Messages CRUD](./phase-1.5-messages-crud.md)

**Next:** [Phase 1.7: Testing & Validation](./phase-1.7-testing.md)
