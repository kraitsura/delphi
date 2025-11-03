# Phase 2.1: Message History & Pagination

> **Status:** Phase 2.1 - Message History & Performance
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0 Complete (Basic Messaging)
> **Next:** Phase 2.2 - Room Management & Navigation

---

## Overview

Phase 2.0 gave you real-time messaging with the latest 50 messages. Now you'll add the ability to load older messages on demand, implement virtual scrolling for performance, and handle large message histories efficiently.

### What You'll Build

- ✅ "Load More" button for older messages
- ✅ Infinite scroll pagination
- ✅ Virtual scrolling for 1000+ messages
- ✅ Smooth scroll position management
- ✅ Loading states and skeletons
- ✅ Smart caching strategy

### Why This Matters

- **Performance:** Only load messages as needed
- **UX:** Instant access to recent messages, quick access to history
- **Scalability:** Support rooms with 10,000+ messages
- **Network:** Reduce initial load time

---

## Backend Implementation

### 1. Load Older Messages Query

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Load older messages (pagination)
 *
 * Use case: User clicks "Load More" or scrolls to top
 *
 * @param roomId - Room to load messages from
 * @param before - Load messages created before this timestamp
 * @param limit - Number of messages to load (default 50)
 * @returns Older messages and pagination metadata
 */
export const loadOlder = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    before: number; // createdAt timestamp
    limit?: number;
  }) => {
    // Security: Verify membership
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    const limit = args.limit || 50;

    // Query messages created before the given timestamp
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc") // Newest first
      .filter(q =>
        q.and(
          q.lt(q.field("createdAt"), args.before),
          q.eq(q.field("isDeleted"), false)
        )
      )
      .take(limit);

    return {
      messages: messages.reverse(), // Reverse to chronological order
      hasMore: messages.length === limit, // If we got a full page, there might be more
      oldestTimestamp: messages[0]?.createdAt, // For next pagination
    };
  }
);
```

### 2. Enhanced Subscribe Query

Update `subscribe` in `mono/packages/backend/convex/messages.ts` to return pagination metadata:

```typescript
/**
 * Real-time message subscription with pagination metadata
 */
export const subscribe = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    limit?: number;
  }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this room");
    }

    const limit = args.limit || 50;

    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc")
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(limit);

    // Get total count for UI (optional, can be expensive)
    const totalCount = (await db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .filter(q => q.eq(q.field("isDeleted"), false))
      .collect()
    ).length;

    return {
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      oldestTimestamp: messages[0]?.createdAt,
      totalCount,
      membership,
    };
  }
);
```

---

## Frontend Implementation

### 1. Load More Button Component

Create `mono/apps/web/src/components/chat/load-more-button.tsx`:

```typescript
import { useState } from "react";
import { useConvexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  roomId: Id<"rooms">;
  oldestMessageTime?: number;
  onMessagesLoaded?: () => void;
}

export function LoadMoreButton({
  roomId,
  oldestMessageTime,
  onMessagesLoaded,
}: LoadMoreButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!oldestMessageTime) return;

    setIsLoading(true);
    try {
      // Trigger load older messages
      // This will be handled by the message list component
      onMessagesLoaded?.();
    } finally {
      setIsLoading(false);
    }
  };

  if (!oldestMessageTime) {
    return null;
  }

  return (
    <div className="flex justify-center py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          "Load older messages"
        )}
      </Button>
    </div>
  );
}
```

### 2. Enhanced Message List with Pagination

Update `mono/apps/web/src/components/chat/message-list.tsx`:

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { MessageItem } from "./message-item";
import { LoadMoreButton } from "./load-more-button";
import { useConvex } from "convex/react";

interface MessageListProps {
  roomId: Id<"rooms">;
}

export function MessageList({ roomId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageCountRef = useRef(0);

  // Track loaded message pages
  const [messagePages, setMessagePages] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const convex = useConvex();

  // Real-time subscription to latest messages
  const { data } = useSuspenseQuery(
    convexQuery(api.messages.subscribe, { roomId, limit: 50 })
  );

  const { messages: latestMessages, hasMore, oldestTimestamp, membership } = data;

  // Combine latest messages with loaded history
  const allMessages = [
    ...messagePages.flatMap(page => page.messages),
    ...latestMessages,
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      const isNewMessage = allMessages.length > prevMessageCountRef.current;

      if (isNewMessage) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }

    prevMessageCountRef.current = allMessages.length;
  }, [allMessages.length, shouldAutoScroll]);

  // Detect if user scrolled up (disable auto-scroll)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);

    // Trigger load more when scrolled near top
    const isNearTop = scrollTop < 200;
    if (isNearTop && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    if (!oldestTimestamp || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      // Save current scroll position to restore after loading
      const scrollElement = scrollRef.current;
      const previousScrollHeight = scrollElement?.scrollHeight || 0;

      // Load older messages
      const olderMessages = await convex.query(api.messages.loadOlder, {
        roomId,
        before: messagePages[0]?.oldestTimestamp || oldestTimestamp,
        limit: 50,
      });

      // Add to message pages
      setMessagePages(prev => [olderMessages, ...prev]);

      // Restore scroll position (prevent jumping)
      setTimeout(() => {
        if (scrollElement) {
          const newScrollHeight = scrollElement.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeight;
          scrollElement.scrollTop += scrollDiff;
        }
      }, 0);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {/* Load More Button */}
      {hasMore && (
        <LoadMoreButton
          roomId={roomId}
          oldestMessageTime={messagePages[0]?.oldestTimestamp || oldestTimestamp}
          onMessagesLoaded={loadMoreMessages}
        />
      )}

      {/* Loading Indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      )}

      {/* Messages */}
      {allMessages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        allMessages.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))
      )}
    </div>
  );
}
```

### 3. Virtual Scrolling (Optional, for 1000+ messages)

Install virtualization library:

```bash
bun add @tanstack/react-virtual
```

Create `mono/apps/web/src/components/chat/virtualized-message-list.tsx`:

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { MessageItem } from "./message-item";
import { Id } from "convex/_generated/dataModel";

interface Message {
  _id: Id<"messages">;
  text: string;
  authorId: Id<"users">;
  authorName: string;
  authorAvatar?: string;
  createdAt: number;
  isEdited: boolean;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function VirtualizedMessageList({
  messages,
  onLoadMore,
  hasMore,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated message height in pixels
    overscan: 10, // Render 10 extra items above/below viewport
  });

  // Trigger load more when scrolled near top
  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems[0];

  if (firstItem?.index === 0 && hasMore && onLoadMore) {
    onLoadMore();
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto p-4"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageItem message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4. Infinite Scroll with React Query

Alternative approach using React Query's `useInfiniteQuery`:

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { MessageItem } from "./message-item";

interface InfiniteMessageListProps {
  roomId: Id<"rooms">;
}

export function InfiniteMessageList({ roomId }: InfiniteMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const convex = useConvex();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", roomId],
    queryFn: async ({ pageParam }) => {
      return await convex.query(api.messages.loadOlder, {
        roomId,
        before: pageParam || Date.now(),
        limit: 50,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.oldestTimestamp : undefined;
    },
    initialPageParam: Date.now(),
  });

  // Flatten all pages into single array
  const allMessages = data?.pages.flatMap(page => page.messages) || [];

  // Load more on scroll to top
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop } = scrollElement;

      if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {isFetchingNextPage && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading more messages...
        </div>
      )}

      {allMessages.map((message) => (
        <MessageItem key={message._id} message={message} />
      ))}

      {allMessages.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No messages yet. Start the conversation!
        </div>
      )}
    </div>
  );
}
```

---

## Performance Optimization

### 1. Message Caching Strategy

```typescript
// Cache messages in memory for quick access
const messageCache = new Map<string, Message[]>();

function getCachedMessages(roomId: string) {
  return messageCache.get(roomId) || [];
}

function setCachedMessages(roomId: string, messages: Message[]) {
  messageCache.set(roomId, messages);
}
```

### 2. Debounced Scroll Handler

```typescript
import { useDebouncedCallback } from "use-debounce";

const handleScroll = useDebouncedCallback(
  (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;

    if (scrollTop < 200 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  },
  150 // 150ms debounce
);
```

### 3. Intersection Observer for Load More

```typescript
import { useEffect, useRef } from "react";

function useLoadMoreOnView(callback: () => void, enabled: boolean) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [callback, enabled]);

  return observerRef;
}

// Usage
const loadMoreRef = useLoadMoreOnView(loadMoreMessages, hasMore);

return (
  <div>
    <div ref={loadMoreRef} className="h-4" />
    {/* Messages */}
  </div>
);
```

---

## Testing

### Manual Testing Checklist

1. **Load More Button**
   - Click "Load More" → Older messages appear above
   - Scroll position maintained (no jump)
   - Button disappears when no more messages

2. **Infinite Scroll**
   - Scroll to top → Automatically loads older messages
   - Smooth loading without stuttering
   - Works with fast scrolling

3. **Virtual Scrolling (if implemented)**
   - Load 1000+ messages → Smooth scrolling
   - Memory usage stable
   - No lag when scrolling quickly

4. **Edge Cases**
   - Room with 0 messages → Shows empty state
   - Room with exactly 50 messages → No "Load More" button
   - Load more with slow network → Shows loading indicator

### Unit Test

```typescript
describe("Message Pagination", () => {
  it("should load older messages", async () => {
    const t = convexTest(schema);

    // Create room with 100 messages
    const roomId = await createRoomWithMessages(t, 100);

    // Subscribe to latest 50
    const { messages: latest, hasMore, oldestTimestamp } = await t.query(
      api.messages.subscribe,
      { roomId, limit: 50 }
    );

    expect(latest).toHaveLength(50);
    expect(hasMore).toBe(true);

    // Load older 50
    const { messages: older } = await t.query(
      api.messages.loadOlder,
      { roomId, before: oldestTimestamp!, limit: 50 }
    );

    expect(older).toHaveLength(50);

    // Verify no overlap
    const latestIds = new Set(latest.map(m => m._id));
    const olderIds = new Set(older.map(m => m._id));
    const intersection = [...latestIds].filter(id => olderIds.has(id));

    expect(intersection).toHaveLength(0);
  });
});
```

---

## Common Issues & Solutions

### Issue: Scroll jumps when loading more messages

**Solution:** Save and restore scroll position:

```typescript
const previousScrollHeight = scrollElement.scrollHeight;

// Load messages...

setTimeout(() => {
  const newScrollHeight = scrollElement.scrollHeight;
  scrollElement.scrollTop += (newScrollHeight - previousScrollHeight);
}, 0);
```

### Issue: Loading more triggers multiple times

**Solution:** Add loading state guard:

```typescript
const [isLoadingMore, setIsLoadingMore] = useState(false);

const loadMore = async () => {
  if (isLoadingMore) return; // Prevent duplicate calls
  setIsLoadingMore(true);
  try {
    // Load...
  } finally {
    setIsLoadingMore(false);
  }
};
```

### Issue: Virtual scrolling shows blank space

**Solution:** Use dynamic size measurement:

```typescript
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  measureElement: (el) => el?.getBoundingClientRect().height ?? 80,
});
```

---

## Performance Benchmarks

### Target Metrics

- **Initial Load:** < 500ms for 50 messages
- **Load More:** < 300ms for 50 older messages
- **Scroll FPS:** 60 FPS with 1000+ messages (virtual scroll)
- **Memory:** < 100MB for 10,000 messages

### Monitoring

```typescript
console.time("loadMessages");
const messages = await convex.query(api.messages.loadOlder, { ... });
console.timeEnd("loadMessages");

console.log("Memory:", performance.memory?.usedJSHeapSize);
```

---

## Next Steps

Once pagination is working smoothly:

1. ✅ **Phase 2.1 Complete** - You can load message history efficiently!
2. ➡️ **Phase 2.2** - Add room list, navigation, and unread counts
3. ➡️ **Phase 2.3** - Add @mentions, reactions, and message editing

---

## Success Criteria

Before moving to Phase 2.2, verify:

- [ ] Can load older messages smoothly
- [ ] Scroll position maintained when loading more
- [ ] "Load More" button works correctly
- [ ] Infinite scroll triggers at right point
- [ ] Virtual scrolling works for 1000+ messages
- [ ] No performance issues or lag
- [ ] Loading states display correctly
- [ ] Edge cases handled (0 messages, exactly 1 page, etc.)

**Phase 2.1 Complete = Efficient message history with smooth UX!** 📜
