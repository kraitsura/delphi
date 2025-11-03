# Phase 2.6: Search & Discovery

> **Status:** Phase 2.6 - Message Search
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0-2.5 Complete
> **Next:** Phase 2.7 - Production Readiness & Testing

---

## Overview

Add powerful search capabilities to help users find messages, jump to specific conversations, and discover content across rooms.

### What You'll Build

- ✅ Full-text message search
- ✅ Search within specific rooms
- ✅ Jump to message from search results
- ✅ Search highlighting
- ✅ Recent searches

---

## Backend Implementation

### 1. Add Search Index to Schema

Update `mono/packages/backend/convex/schema.ts`:

```typescript
messages: defineTable({
  // ... existing fields
})
  .index("by_room_and_created", ["roomId", "createdAt"])
  .index("by_author", ["authorId"])
  .searchIndex("search_text", {
    searchField: "text",
    filterFields: ["roomId", "isDeleted", "authorId"],
  }),
```

### 2. Search Query

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Search messages in room
 * Uses Convex's built-in search index
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

    // Search with index
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

/**
 * Search across all rooms in event
 */
export const searchInEvent = authenticatedQuery(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    query: string;
    limit?: number;
  }) => {
    // Get user's accessible rooms in event
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    const accessibleRooms = [];
    for (const room of rooms) {
      const membership = await db
        .query("roomParticipants")
        .withIndex("by_room_and_user", q =>
          q.eq("roomId", room._id).eq("userId", user.id)
        )
        .first();

      if (membership) {
        accessibleRooms.push(room._id);
      }
    }

    // Search across all accessible rooms
    const allResults = [];
    for (const roomId of accessibleRooms) {
      const results = await db
        .query("messages")
        .withSearchIndex("search_text", q =>
          q.search("text", args.query).eq("roomId", roomId)
        )
        .filter(q => q.eq(q.field("isDeleted"), false))
        .take(5); // Limit per room

      allResults.push(...results);
    }

    // Sort by relevance/recency
    const sorted = allResults.sort((a, b) => b.createdAt - a.createdAt);

    return sorted.slice(0, args.limit || 20);
  }
);
```

---

## Frontend Implementation

### 1. Search Component

Create `mono/apps/web/src/components/chat/message-search.tsx`:

```typescript
import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface MessageSearchProps {
  roomId: Id<"rooms">;
  onMessageClick: (messageId: Id<"messages">) => void;
  onClose?: () => void;
}

export function MessageSearch({
  roomId,
  onMessageClick,
  onClose,
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results } = useSuspenseQuery(
    debouncedQuery.length >= 3
      ? convexQuery(api.messages.search, { roomId, query: debouncedQuery })
      : { data: [] }
  );

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="border-b bg-background">
      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {query.length > 0 && query.length < 3 && (
          <p className="text-xs text-muted-foreground mt-2">
            Type at least 3 characters to search
          </p>
        )}
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          {results.map((message) => (
            <button
              key={message._id}
              onClick={() => {
                onMessageClick(message._id);
                onClose?.();
              }}
              className="w-full text-left p-4 hover:bg-muted border-t transition-colors"
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-sm">
                  {message.authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {highlightText(message.text, debouncedQuery)}
              </div>
            </button>
          ))}
        </div>
      )}

      {debouncedQuery.length >= 3 && results?.length === 0 && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No messages found
        </div>
      )}
    </div>
  );
}
```

### 2. Debounce Hook

Create `mono/apps/web/src/hooks/use-debounced-value.ts`:

```typescript
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 3. Jump to Message

Add to message list component:

```typescript
// Add ref to message elements
<div
  data-message-id={message._id}
  ref={(el) => {
    if (el && highlightedMessageId === message._id) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-yellow-100");
      setTimeout(() => el.classList.remove("bg-yellow-100"), 2000);
    }
  }}
>
  {/* Message content */}
</div>
```

### 4. Integration with Room Header

Update room header to include search button:

```typescript
import { useState } from "react";
import { MessageSearch } from "./message-search";

export function RoomHeader({ roomId }: { roomId: Id<"rooms"> }) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <h2>Room Name</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {showSearch && (
        <MessageSearch
          roomId={roomId}
          onMessageClick={(messageId) => {
            // Scroll to message
            const element = document.querySelector(
              `[data-message-id="${messageId}"]`
            );
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
```

---

## Testing

### Manual Testing Checklist

1. **Basic Search**
   - Type 3+ characters → Results appear
   - Results highlight search terms
   - Click result → Jumps to message

2. **Search Quality**
   - Partial word matches work
   - Case-insensitive search
   - Recent messages appear first

3. **Performance**
   - Search is fast (<200ms)
   - Debouncing prevents excessive queries
   - Large result sets paginated

---

## Success Criteria

- [ ] Can search messages in room
- [ ] Results highlight search terms
- [ ] Click result jumps to message
- [ ] Search is fast and responsive
- [ ] Debouncing works correctly
- [ ] Empty state shows helpful message

**Phase 2.6 Complete = Powerful search functionality!** 🔍
