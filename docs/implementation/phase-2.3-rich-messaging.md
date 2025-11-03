# Phase 2.3: Rich Messaging Features

> **Status:** Phase 2.3 - Enhanced Message Interactions
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0-2.2 Complete (Messaging + Rooms)
> **Next:** Phase 2.4 - Media & Attachments

---

## Overview

Add rich interaction features that make conversations more engaging: @mentions with autocomplete, emoji reactions, message editing/deletion, and optional thread support.

### What You'll Build

- ✅ @Mentions with autocomplete dropdown
- ✅ Emoji reactions on messages
- ✅ Message editing with history
- ✅ Message deletion (soft delete)
- ✅ Notification on mentions
- ✅ Thread replies (optional)

### UX Improvements

- Tag teammates with @ to notify them
- Quick emoji reactions for acknowledgment
- Fix typos with message editing
- Remove accidental messages
- Keep conversations organized with threads

---

## Backend Implementation

### 1. Message Schema Updates

Update `mono/packages/backend/convex/schema.ts`:

```typescript
messages: defineTable({
  roomId: v.id("rooms"),
  authorId: v.id("users"),

  // Content
  text: v.string(),

  // Denormalized author data
  authorName: v.string(),
  authorAvatar: v.optional(v.string()),

  // Rich features
  mentions: v.optional(v.array(v.id("users"))), // @mentioned users
  reactions: v.optional(v.array(v.object({
    emoji: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }))),
  replyToId: v.optional(v.id("messages")), // Thread support

  // Metadata
  isEdited: v.boolean(),
  editedAt: v.optional(v.number()),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  isAIGenerated: v.boolean(),
  createdAt: v.number(),
})
  .index("by_room_and_created", ["roomId", "createdAt"])
  .index("by_author", ["authorId"])
  .searchIndex("search_text", {
    searchField: "text",
    filterFields: ["roomId", "isDeleted"],
  }),
```

### 2. Mention Detection & Notifications

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Parse mentions from text
 * Format: @[Name](userId)
 * Example: "Hey @[John Doe](j4x8k9q2) check this out!"
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

/**
 * Enhanced send with mention support
 */
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    replyToId?: Id<"messages">; // Optional thread reply
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    const userProfile = await db.get(user.id);
    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Extract mentions from text
    const mentions = parseMentions(args.text);

    // Verify replyTo message exists
    if (args.replyToId) {
      const replyToMessage = await db.get(args.replyToId);
      if (!replyToMessage || replyToMessage.roomId !== args.roomId) {
        throw new Error("Invalid reply target");
      }
    }

    // Insert message
    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      mentions,
      replyToId: args.replyToId,

      authorName: userProfile.name,
      authorAvatar: userProfile.avatar,

      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // Update room
    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      const room = await db.get(args.roomId);
      const event = room ? await db.get(room.eventId) : null;

      for (const mentionedUserId of mentions) {
        // Don't notify self
        if (mentionedUserId === user.id) continue;

        await db.insert("notifications", {
          type: "mention",
          userId: mentionedUserId,
          messageId,
          eventId: room?.eventId,
          createdAt: Date.now(),
          isRead: false,
          metadata: {
            roomId: args.roomId,
            authorName: userProfile.name,
            messagePreview: args.text.slice(0, 100),
          },
        });
      }
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

    // Filter by query (case-insensitive)
    const filtered = users.filter(u =>
      u?.name.toLowerCase().includes(args.query.toLowerCase())
    );

    return filtered.slice(0, 10).map(u => ({
      id: u!._id,
      name: u!.name,
      avatar: u!.avatar,
      email: u!.email,
    }));
  }
);
```

### 3. Message Editing

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Edit message
 * Only author can edit, within time limit
 */
export const edit = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
    text: string;
  }) => {
    const message = await db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify author
    if (message.authorId !== user.id) {
      throw new Error("Only author can edit message");
    }

    // Verify not deleted
    if (message.isDeleted) {
      throw new Error("Cannot edit deleted message");
    }

    // Optional: Enforce edit time limit (e.g., 15 minutes)
    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    if (Date.now() - message.createdAt > EDIT_WINDOW_MS) {
      throw new Error("Edit window expired");
    }

    // Update message
    await db.patch(args.messageId, {
      text: args.text,
      mentions: parseMentions(args.text), // Re-parse mentions
      isEdited: true,
      editedAt: Date.now(),
    });
  }
);

/**
 * Delete message (soft delete)
 */
export const deleteMessage = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
  }) => {
    const message = await db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check permissions
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    const canDelete =
      message.authorId === user.id || // Author can delete
      membership?.canDelete; // Or user has delete permission

    if (!canDelete) {
      throw new Error("No permission to delete message");
    }

    // Soft delete
    await db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
      text: "[deleted]", // Optional: Clear text
    });
  }
);
```

### 4. Reactions

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Add or remove reaction (toggle)
 */
export const addReaction = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
    emoji: string;
  }) => {
    const message = await db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify room membership
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
    const existingIndex = reactions.findIndex(
      r => r.emoji === args.emoji && r.userId === user.id
    );

    if (existingIndex >= 0) {
      // Remove reaction (toggle off)
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({
        emoji: args.emoji,
        userId: user.id,
        createdAt: Date.now(),
      });
    }

    await db.patch(args.messageId, { reactions });
  }
);

/**
 * Get reactions grouped by emoji
 */
export const getReactionSummary = (reactions?: Array<{
  emoji: string;
  userId: Id<"users">;
  createdAt: number;
}>) => {
  if (!reactions || reactions.length === 0) return [];

  const grouped = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userIds: [],
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.userId);
    return acc;
  }, {} as Record<string, { emoji: string; count: number; userIds: Id<"users">[] }>);

  return Object.values(grouped);
};
```

---

## Frontend Implementation

### 1. Mention Autocomplete Input

Create `mono/apps/web/src/components/chat/mention-input.tsx`:

```typescript
import { useState, useRef, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  roomId: Id<"rooms">;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MentionInput({
  value,
  onChange,
  roomId,
  onSubmit,
  disabled,
  placeholder,
}: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users when @ is typed
  const { data: users } = useSuspenseQuery(
    mentionQuery
      ? convexQuery(api.messages.searchUsersForMention, {
          roomId,
          query: mentionQuery,
        })
      : { data: [] }
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
    if (!showMentions || !users || users.length === 0) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    // Handle autocomplete navigation
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

    // Replace @query with mention format
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
        placeholder={placeholder || "Type a message... (@mention users)"}
        className="min-h-[60px] max-h-[200px] resize-none"
        disabled={disabled}
      />

      {/* Autocomplete Dropdown */}
      {showMentions && users && users.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
          {users.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors",
                index === selectedIndex && "bg-muted"
              )}
            >
              <Avatar className="h-6 w-6">
                {user.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="text-xs">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Reaction Picker

Create `mono/apps/web/src/components/chat/reaction-picker.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "😊", "🎉", "🔥", "👏", "✅", "🤔"];

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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => mutation.mutate(emoji)}
              className="p-2 hover:bg-muted rounded transition-colors text-2xl"
              disabled={mutation.isPending}
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

### 3. Reaction Display

Create `mono/apps/web/src/components/chat/reaction-display.tsx`:

```typescript
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Reaction {
  emoji: string;
  userId: Id<"users">;
  createdAt: number;
}

interface ReactionDisplayProps {
  reactions?: Reaction[];
  currentUserId: Id<"users">;
  onReactionClick: (emoji: string) => void;
}

export function ReactionDisplay({
  reactions,
  currentUserId,
  onReactionClick,
}: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userIds: [],
        hasCurrentUser: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.userId);
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, {
    emoji: string;
    count: number;
    userIds: Id<"users">[];
    hasCurrentUser: boolean;
  }>);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(grouped).map((group) => (
        <TooltipProvider key={group.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={group.hasCurrentUser ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-sm"
                onClick={() => onReactionClick(group.emoji)}
              >
                <span>{group.emoji}</span>
                <span className="ml-1 text-xs">{group.count}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {group.count} {group.count === 1 ? "reaction" : "reactions"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
```

### 4. Enhanced Message Item

Update `mono/apps/web/src/components/chat/message-item.tsx`:

```typescript
import { useState } from "react";
import { Id } from "convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Reply } from "lucide-react";
import { ReactionPicker } from "./reaction-picker";
import { ReactionDisplay } from "./reaction-display";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

interface Message {
  _id: Id<"messages">;
  text: string;
  authorId: Id<"users">;
  authorName: string;
  authorAvatar?: string;
  createdAt: number;
  isEdited: boolean;
  editedAt?: number;
  reactions?: Array<{
    emoji: string;
    userId: Id<"users">;
    createdAt: number;
  }>;
  replyToId?: Id<"messages">;
}

interface MessageItemProps {
  message: Message;
  currentUserId: Id<"users">;
  canEdit: boolean;
  canDelete: boolean;
  onReply?: (messageId: Id<"messages">) => void;
}

export function MessageItem({
  message,
  currentUserId,
  canEdit,
  canDelete,
  onReply,
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const editMessage = useConvexMutation(api.messages.edit);
  const deleteMessage = useConvexMutation(api.messages.deleteMessage);
  const addReaction = useConvexMutation(api.messages.addReaction);

  const editMutation = useMutation({
    mutationFn: async () => {
      await editMessage({ messageId: message._id, text: editText });
    },
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteMessage({ messageId: message._id });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      await addReaction({ messageId: message._id, emoji });
    },
  });

  const initials = message.authorName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Render mention highlights
  const renderText = (text: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add mention with styling
      parts.push(
        <span key={match.index} className="text-primary font-medium">
          @{match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

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

        {/* Message Content */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm mt-1 whitespace-pre-wrap break-words">
            {renderText(message.text)}
          </div>
        )}

        {/* Reactions */}
        <ReactionDisplay
          reactions={message.reactions}
          currentUserId={currentUserId}
          onReactionClick={(emoji) => reactionMutation.mutate(emoji)}
        />
      </div>

      {/* Hover Actions */}
      {isHovered && !isEditing && (
        <div className="flex items-start gap-1">
          <ReactionPicker messageId={message._id} />

          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onReply(message._id)}
            >
              <Reply className="h-4 w-4" />
            </Button>
          )}

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Testing

### Manual Testing Checklist

1. **@Mentions**
   - Type @ → Autocomplete appears
   - Search works (filters users)
   - Arrow keys navigate list
   - Enter/Tab inserts mention
   - Mention highlights in message
   - Notification sent to mentioned user

2. **Reactions**
   - Click emoji → Adds reaction
   - Click again → Removes reaction (toggle)
   - Multiple users can react with same emoji
   - Reaction count displays correctly
   - Hover shows who reacted

3. **Message Editing**
   - Click edit → Text becomes editable
   - Save → Updates message, shows "(edited)"
   - Cancel → Reverts changes
   - Edit window enforced (15 min)
   - Can't edit deleted messages

4. **Message Deletion**
   - Author can delete own messages
   - Admins can delete any message
   - Deleted messages show "[deleted]"
   - Can't edit deleted messages

---

## Next Steps

Once rich messaging features are working:

1. ✅ **Phase 2.3 Complete** - Rich interactive messaging!
2. ➡️ **Phase 2.4** - Add image uploads and media handling
3. ➡️ **Phase 2.5** - Add participant management

---

## Success Criteria

Before moving to Phase 2.4, verify:

- [ ] @Mentions work with autocomplete
- [ ] Mentioned users receive notifications
- [ ] Reactions add/remove correctly
- [ ] Multiple users can react with same emoji
- [ ] Message editing works with time limit
- [ ] Message deletion works (soft delete)
- [ ] Edited messages show "(edited)" tag
- [ ] All features work in real-time across clients

**Phase 2.3 Complete = Engaging, interactive conversations!** 💬
