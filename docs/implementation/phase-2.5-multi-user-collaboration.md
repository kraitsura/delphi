# Phase 2.5: Multi-User Collaboration

> **Status:** Phase 2.5 - Participant Management
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0-2.4 Complete
> **Next:** Phase 2.6 - Search & Discovery

---

## Overview

Enable event coordinators to invite users, manage participants, set permissions, and organize team collaboration.

### What You'll Build

- ✅ Invite users to events
- ✅ Participant list UI
- ✅ Role-based permissions
- ✅ Remove participants
- ✅ Add users to specific rooms
- ✅ Participant search

---

## Backend Implementation

### 1. Invite User to Event

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
    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const isCoordinator = event.createdBy === user.id;
    if (!isCoordinator) {
      throw new Error("Only event coordinator can invite users");
    }

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
    }));
  }
);

/**
 * Remove participant from event
 */
export const removeParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    userId: Id<"users">;
  }) => {
    // Verify requester is coordinator
    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const isCoordinator = event.createdBy === user.id;
    if (!isCoordinator) {
      throw new Error("Only event coordinator can remove participants");
    }

    // Can't remove self
    if (args.userId === user.id) {
      throw new Error("Cannot remove yourself");
    }

    // Get all rooms in event
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    // Remove from all rooms
    for (const room of rooms) {
      const membership = await db
        .query("roomParticipants")
        .withIndex("by_room_and_user", q =>
          q.eq("roomId", room._id).eq("userId", args.userId)
        )
        .first();

      if (membership) {
        await db.delete(membership._id);
      }
    }
  }
);
```

### 2. Room Participant Management

Add to `mono/packages/backend/convex/rooms.ts`:

```typescript
/**
 * Add user to specific room
 */
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
    // Verify user has manage permission
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canManage) {
      throw new Error("No permission to manage room");
    }

    // Check if user already in room
    const existing = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User already in room");
    }

    // Add participant
    await db.insert("roomParticipants", {
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
  }
);

/**
 * Remove participant from room
 */
export const removeParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
  }) => {
    // Verify user has manage permission
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canManage) {
      throw new Error("No permission to manage room");
    }

    // Find participant to remove
    const target = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!target) {
      throw new Error("User not in room");
    }

    await db.delete(target._id);
  }
);
```

---

## Frontend Implementation

### 1. Invite User Dialog

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

### 2. Participant List Component

Create `mono/apps/web/src/components/events/participant-list.tsx`:

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface ParticipantListProps {
  eventId: Id<"events">;
  currentUserId: Id<"users">;
  canManage: boolean;
}

export function ParticipantList({
  eventId,
  currentUserId,
  canManage,
}: ParticipantListProps) {
  const { data: participants } = useSuspenseQuery(
    convexQuery(api.events.listParticipants, { eventId })
  );

  const removeParticipant = useConvexMutation(api.events.removeParticipant);

  const removeMutation = useMutation({
    mutationFn: async (userId: Id<"users">) => {
      return await removeParticipant({ eventId, userId });
    },
    onSuccess: () => {
      toast.success("Participant removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-2">
      {participants.map((participant) => (
        <div
          key={participant._id}
          className="flex items-center justify-between p-2 hover:bg-muted rounded"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              {participant.avatar && (
                <AvatarImage src={participant.avatar} alt={participant.name} />
              )}
              <AvatarFallback>{participant.name[0]}</AvatarFallback>
            </Avatar>

            <div>
              <div className="font-medium">{participant.name}</div>
              <div className="text-sm text-muted-foreground">
                {participant.email}
              </div>
            </div>
          </div>

          {canManage && participant._id !== currentUserId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeMutation.mutate(participant._id)}
              disabled={removeMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### Manual Testing Checklist

1. **Invite User**
   - Enter email → User added to event
   - Select role → Permissions applied correctly
   - Invalid email → Error message
   - Already invited → Error message

2. **Participant List**
   - All participants shown
   - Avatar and name display correctly
   - Can't remove self

3. **Remove Participant**
   - Click X → Participant removed
   - Removed from all rooms
   - No longer sees event

---

## Success Criteria

- [ ] Can invite users by email
- [ ] Role selection works (collaborator vs guest)
- [ ] Participant list displays correctly
- [ ] Can remove participants
- [ ] Permissions enforced correctly
- [ ] Real-time updates when participants added/removed

**Phase 2.5 Complete = Team collaboration ready!** 👥
