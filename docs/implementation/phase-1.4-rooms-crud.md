# Phase 1.4: Rooms & Participants CRUD

> **Status:** Phase 1.4 - Room & Participant Management
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1.3 (Events CRUD) completed
> **Estimated Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Backend: Room Operations](#backend-room-operations)
3. [Backend: Participant Operations](#backend-participant-operations)
4. [Frontend Components](#frontend-components)
5. [Testing](#testing)
6. [Next Steps](#next-steps)

---

## Overview

Rooms are chat channels within events. Each event can have multiple rooms for different purposes (main planning, vendor coordination, topics, announcements). This phase implements complete room and participant management.

**What You'll Build:**
- ✅ Create rooms (main, vendor, topic, private)
- ✅ Get room by ID
- ✅ List rooms by event
- ✅ Update room settings
- ✅ Archive rooms
- ✅ Add/remove participants
- ✅ Update participant permissions
- ✅ List participants in room

**Room Types:**
- **main** - Main event planning chat
- **vendor** - Vendor-specific coordination
- **topic** - Topic-based (catering, music, etc.)
- **guest_announcements** - Broadcast to guests
- **private** - Private coordinator chat

---

## Backend: Room Operations

The full implementation is in the source document at lines 1535-1827. Here's the complete `mono/packages/backend/convex/rooms.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireEventCoordinator,
} from "./auth-helpers";

export const create = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    name: string;
    description?: string;
    type: "main" | "vendor" | "topic" | "guest_announcements" | "private";
    vendorId?: Id<"users">;
    allowGuestMessages?: boolean;
  }) => {
    await requireEventCoordinator(db as any, args.eventId);

    const roomId = await db.insert("rooms", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      type: args.type,
      vendorId: args.vendorId,
      isArchived: false,
      allowGuestMessages: args.allowGuestMessages ?? false,
      createdAt: Date.now(),
      createdBy: user.id,
      lastMessageAt: undefined,
    });

    await db.insert("roomParticipants", {
      roomId,
      userId: user.id,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    return roomId;
  }
);

export const getById = authenticatedQuery(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    return { ...room, membership };
  }
);

export const listByEvent = authenticatedQuery(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    includeArchived?: boolean;
  }) => {
    await db.get(args.eventId);

    let query = db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId));

    if (!args.includeArchived) {
      query = query.filter(q => q.eq(q.field("isArchived"), false));
    }

    const rooms = await query.collect();

    const userRoomIds = (await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect()
    ).map(p => p.roomId);

    return rooms.filter(r => userRoomIds.includes(r._id));
  }
);

export const update = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    name?: string;
    description?: string;
    allowGuestMessages?: boolean;
  }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canManage) {
      throw new Error("Forbidden: No permission to update room");
    }

    await db.patch(args.roomId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.allowGuestMessages !== undefined && {
        allowGuestMessages: args.allowGuestMessages,
      }),
    });

    return await db.get(args.roomId);
  }
);

export const archive = authenticatedMutation(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    await requireEventCoordinator(db as any, room.eventId);

    await db.patch(args.roomId, {
      isArchived: true,
    });
  }
);
```

---

## Backend: Participant Operations

Add to `mono/packages/backend/convex/rooms.ts`:

```typescript
export const addParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
    permissions?: {
      canPost?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canManage?: boolean;
    };
  }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const requesterMembership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to add participants");
    }

    const existing = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a participant");
    }

    const participantId = await db.insert("roomParticipants", {
      roomId: args.roomId,
      userId: args.userId,
      canPost: args.permissions?.canPost ?? true,
      canEdit: args.permissions?.canEdit ?? true,
      canDelete: args.permissions?.canDelete ?? false,
      canManage: args.permissions?.canManage ?? false,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    return participantId;
  }
);

export const removeParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
  }) => {
    const requesterMembership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to remove participants");
    }

    const participant = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw new Error("User is not a participant");
    }

    await db.delete(participant._id);
  }
);

export const listParticipants = authenticatedQuery(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    const participants = await db
      .query("roomParticipants")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();

    const userIds = participants.map(p => p.userId);
    const users = await Promise.all(userIds.map(id => db.get(id)));

    return participants.map((p, i) => ({
      ...p,
      user: users[i],
    }));
  }
);

export const updateParticipantPermissions = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
    permissions: {
      canPost?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canManage?: boolean;
    };
  }) => {
    const requesterMembership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to update permissions");
    }

    const participant = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw new Error("User is not a participant");
    }

    await db.patch(participant._id, args.permissions);

    return await db.get(participant._id);
  }
);
```

---

## Frontend Components

### Room List Component

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Hash, Lock, Megaphone, Users } from "lucide-react";

export function RoomList({ eventId }: { eventId: string }) {
  const { data: rooms } = useSuspenseQuery(
    convexQuery(api.rooms.listByEvent, { eventId: eventId as any })
  );

  const getRoomIcon = (type: string) => {
    switch (type) {
      case "main": return <Hash className="h-5 w-5" />;
      case "private": return <Lock className="h-5 w-5" />;
      case "guest_announcements": return <Megaphone className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <Link
          key={room._id}
          to={`/events/${eventId}/rooms/${room._id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
        >
          {getRoomIcon(room.type)}
          <div className="flex-1">
            <div className="font-medium">{room.name}</div>
            {room.description && (
              <div className="text-sm text-gray-500">{room.description}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

---

## Testing

**Manual Testing Checklist:**
- [ ] Create room successfully
- [ ] List rooms for event
- [ ] Add participant to room
- [ ] Remove participant from room
- [ ] Update participant permissions
- [ ] Update room settings
- [ ] Archive room

---

## Next Steps

**Phase 1.5: Messages & Real-time Chat**

**Estimated Time:** 2-3 hours

---

**Previous:** [Phase 1.3: Events CRUD](./phase-1.3-events-crud.md)

**Next:** [Phase 1.5: Messages & Real-time Chat](./phase-1.5-messages-crud.md)
