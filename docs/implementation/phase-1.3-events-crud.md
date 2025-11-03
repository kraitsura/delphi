# Phase 1.3: Events CRUD Operations

> **Status:** Phase 1.3 - Event Management
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1.2 (Users CRUD) completed
> **Estimated Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Backend: Event Queries & Mutations](#backend-event-queries--mutations)
3. [Frontend Components](#frontend-components)
4. [Event Access Control](#event-access-control)
5. [Testing Event Operations](#testing-event-operations)
6. [Next Steps](#next-steps)

---

## Overview

This phase implements complete event management functionality. Events are the core entity in Delphi, representing weddings, parties, corporate events, etc. Each event has a coordinator (owner) and can have multiple co-coordinators and collaborators.

**What You'll Build:**
- ✅ Create event (with automatic main room)
- ✅ Get event by ID (with access control)
- ✅ List user's events (as coordinator or collaborator)
- ✅ Update event details
- ✅ Archive event
- ✅ Delete event (soft delete via status)
- ✅ Add co-coordinators

**Key Features:**
- Events automatically create a main chat room
- Coordinators have full event control
- Co-coordinators share coordination permissions
- Collaborators can view and participate
- Budget and guest count tracking

---

## Backend: Event Queries & Mutations

Create `mono/packages/backend/convex/events.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireEventCoordinator
} from "./auth-helpers";

/**
 * Create new event
 * Automatically creates main room and adds coordinator as participant
 */
export const create = authenticatedMutation(
  async ({ db, user }, args: {
    name: string;
    description?: string;
    type: "wedding" | "corporate" | "party" | "destination" | "other";
    date?: number;
    budget: number;
    expectedGuests: number;
    location?: {
      address: string;
      city: string;
      state: string;
      country: string;
    };
  }) => {
    // Create event
    const eventId = await db.insert("events", {
      name: args.name,
      description: args.description,
      type: args.type,
      date: args.date,
      location: args.location,
      budget: {
        total: args.budget,
        spent: 0,
        committed: 0,
      },
      guestCount: {
        expected: args.expectedGuests,
        confirmed: 0,
      },
      coordinatorId: user.id,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user.id,
    });

    // Create main event room automatically
    const roomId = await db.insert("rooms", {
      eventId,
      name: `${args.name} - Main Chat`,
      type: "main",
      isArchived: false,
      allowGuestMessages: false,
      createdAt: Date.now(),
      createdBy: user.id,
    });

    // Add coordinator as room participant with full permissions
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

    return { eventId, roomId };
  }
);

/**
 * Get event by ID with access control
 */
export const getById = authenticatedQuery(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    const event = await db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Check user has access (coordinator, co-coordinator, or collaborator via room)
    const isCoordinator =
      event.coordinatorId === user.id ||
      event.coCoordinatorIds?.includes(user.id);

    // For non-coordinators, check if they're in any room
    if (!isCoordinator) {
      const rooms = await db
        .query("rooms")
        .withIndex("by_event", q => q.eq("eventId", args.eventId))
        .collect();

      const roomIds = rooms.map(r => r._id);

      if (roomIds.length > 0) {
        const membership = await db
          .query("roomParticipants")
          .withIndex("by_user", q => q.eq("userId", user.id))
          .filter(q =>
            roomIds.some(roomId => q.eq(q.field("roomId"), roomId))
          )
          .first();

        if (!membership) {
          throw new Error("Forbidden: Not a member of this event");
        }
      } else {
        throw new Error("Forbidden: Not a member of this event");
      }
    }

    return event;
  }
);

/**
 * List user's events
 * Returns events where user is coordinator or has room access
 */
export const listUserEvents = authenticatedQuery(
  async ({ db, user }, args: {
    status?: "planning" | "in_progress" | "completed" | "cancelled" | "archived";
  }) => {
    // Events where user is coordinator
    let query = db
      .query("events")
      .withIndex("by_coordinator", q => q.eq("coordinatorId", user.id));

    if (args.status) {
      query = query.filter(q => q.eq(q.field("status"), args.status));
    }

    const coordinatorEvents = await query.collect();

    // Events where user is co-coordinator
    const allEvents = await db.query("events").collect();
    const coCoordinatorEvents = allEvents.filter(event =>
      event.coCoordinatorIds?.includes(user.id) &&
      (!args.status || event.status === args.status)
    );

    // Events where user is a room participant
    const userRooms = await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect();

    const roomEventIds = new Set<Id<"events">>();
    for (const participant of userRooms) {
      const room = await db.get(participant.roomId);
      if (room) {
        roomEventIds.add(room.eventId);
      }
    }

    const collaboratorEvents = await Promise.all(
      Array.from(roomEventIds).map(id => db.get(id))
    );

    const validCollaboratorEvents = collaboratorEvents
      .filter(event =>
        event !== null &&
        event.coordinatorId !== user.id &&
        !event.coCoordinatorIds?.includes(user.id) &&
        (!args.status || event.status === args.status)
      );

    // Combine and deduplicate
    const allUserEvents = [
      ...coordinatorEvents,
      ...coCoordinatorEvents,
      ...validCollaboratorEvents,
    ];

    // Sort by creation date (most recent first)
    return allUserEvents.sort((a, b) => b.createdAt - a.createdAt);
  }
);

/**
 * Update event
 * Only coordinators and co-coordinators can update
 */
export const update = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    name?: string;
    description?: string;
    date?: number;
    location?: {
      address: string;
      city: string;
      state: string;
      country: string;
    };
    budget?: { total: number };
    guestCount?: { expected: number };
  }) => {
    // Verify user is coordinator or co-coordinator
    await requireEventCoordinator(db as any, args.eventId);

    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.date) updates.date = args.date;
    if (args.location) updates.location = args.location;

    if (args.budget) {
      updates.budget = {
        ...event.budget,
        total: args.budget.total,
      };
    }

    if (args.guestCount) {
      updates.guestCount = {
        ...event.guestCount,
        expected: args.guestCount.expected,
      };
    }

    await db.patch(args.eventId, updates);

    return await db.get(args.eventId);
  }
);

/**
 * Update event status
 */
export const updateStatus = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    status: "planning" | "in_progress" | "completed" | "cancelled" | "archived";
  }) => {
    await requireEventCoordinator(db as any, args.eventId);

    await db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return await db.get(args.eventId);
  }
);

/**
 * Add co-coordinator to event
 */
export const addCoCoordinator = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    userId: Id<"users">;
  }) => {
    // Verify requester is coordinator
    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.coordinatorId !== user.id) {
      throw new Error("Only the main coordinator can add co-coordinators");
    }

    // Add to co-coordinators list
    const currentCoCoordinators = event.coCoordinatorIds || [];

    if (currentCoCoordinators.includes(args.userId)) {
      throw new Error("User is already a co-coordinator");
    }

    await db.patch(args.eventId, {
      coCoordinatorIds: [...currentCoCoordinators, args.userId],
      updatedAt: Date.now(),
    });

    // Add to all event rooms with manage permissions
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    for (const room of rooms) {
      // Check if already a participant
      const existing = await db
        .query("roomParticipants")
        .withIndex("by_room_and_user", q =>
          q.eq("roomId", room._id).eq("userId", args.userId)
        )
        .first();

      if (!existing) {
        await db.insert("roomParticipants", {
          roomId: room._id,
          userId: args.userId,
          canPost: true,
          canEdit: true,
          canDelete: true,
          canManage: true,
          notificationLevel: "all",
          joinedAt: Date.now(),
          addedBy: user.id,
        });
      }
    }

    return await db.get(args.eventId);
  }
);

/**
 * Remove co-coordinator from event
 */
export const removeCoCoordinator = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    userId: Id<"users">;
  }) => {
    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.coordinatorId !== user.id) {
      throw new Error("Only the main coordinator can remove co-coordinators");
    }

    const currentCoCoordinators = event.coCoordinatorIds || [];
    const updated = currentCoCoordinators.filter(id => id !== args.userId);

    await db.patch(args.eventId, {
      coCoordinatorIds: updated,
      updatedAt: Date.now(),
    });

    return await db.get(args.eventId);
  }
);

/**
 * Archive event
 */
export const archive = authenticatedMutation(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    await requireEventCoordinator(db as any, args.eventId);

    await db.patch(args.eventId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  }
);

/**
 * Delete event (soft delete via cancelled status)
 */
export const remove = authenticatedMutation(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    await requireEventCoordinator(db as any, args.eventId);

    // In production, you might want hard delete or keep forever
    await db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  }
);

/**
 * Get event statistics
 */
export const getStats = authenticatedQuery(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Count tasks
    const tasks = await db
      .query("tasks")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      notStarted: tasks.filter(t => t.status === "not_started").length,
    };

    // Count expenses
    const expenses = await db
      .query("expenses")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    const expenseStats = {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      count: expenses.length,
    };

    // Count rooms and participants
    const rooms = await db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect();

    const participantIds = new Set<Id<"users">>();
    for (const room of rooms) {
      const participants = await db
        .query("roomParticipants")
        .withIndex("by_room", q => q.eq("roomId", room._id))
        .collect();
      participants.forEach(p => participantIds.add(p.userId));
    }

    return {
      tasks: taskStats,
      expenses: expenseStats,
      rooms: rooms.length,
      participants: participantIds.size,
    };
  }
);
```

---

## Frontend Components

### Event Creation Form

Create `mono/apps/web/src/components/event-create-form.tsx`:

```typescript
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function EventCreateForm() {
  const navigate = useNavigate();
  const createEvent = useConvexMutation(api.events.create);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"wedding" | "corporate" | "party" | "destination" | "other">("wedding");
  const [budget, setBudget] = useState("");
  const [expectedGuests, setExpectedGuests] = useState("");
  const [date, setDate] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return await createEvent({
        name,
        description: description || undefined,
        type,
        budget: parseFloat(budget) || 0,
        expectedGuests: parseInt(expectedGuests) || 0,
        date: date ? new Date(date).getTime() : undefined,
      });
    },
    onSuccess: ({ eventId }) => {
      toast.success("Event created!");
      navigate({ to: `/events/${eventId}` });
    },
    onError: (error) => {
      toast.error(`Failed to create event: ${error.message}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sarah & John's Wedding"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Event Type *</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full rounded-md border p-2"
          required
        >
          <option value="wedding">Wedding</option>
          <option value="corporate">Corporate Event</option>
          <option value="party">Party</option>
          <option value="destination">Destination Event</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your event..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Event Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Total Budget</Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000"
            min="0"
            step="100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guests">Expected Guests</Label>
        <Input
          id="guests"
          type="number"
          value={expectedGuests}
          onChange={(e) => setExpectedGuests(e.target.value)}
          placeholder="150"
          min="0"
        />
      </div>

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating..." : "Create Event"}
      </Button>
    </form>
  );
}
```

### Event List Component

Create `mono/apps/web/src/components/event-list.tsx`:

```typescript
import { useConvexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, DollarSign } from "lucide-react";

export function EventList({ status }: { status?: string }) {
  const { data: events } = useSuspenseQuery(
    convexQuery(api.events.listUserEvents, {
      status: status as any,
    })
  );

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No events found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link
          key={event._id}
          to={`/events/${event._id}`}
          className="block rounded-lg border p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg">{event.name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              event.status === "planning" ? "bg-blue-100 text-blue-700" :
              event.status === "in_progress" ? "bg-green-100 text-green-700" :
              event.status === "completed" ? "bg-gray-100 text-gray-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {event.status}
            </span>
          </div>

          {event.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="mt-4 space-y-2 text-sm text-gray-500">
            {event.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(event.date).toLocaleDateString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {event.guestCount.expected} guests expected
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ${event.budget.spent.toLocaleString()} / ${event.budget.total.toLocaleString()}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            <span className="capitalize">{event.type}</span> •
            Created {new Date(event.createdAt).toLocaleDateString()}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

### Event Detail Page

Create `mono/apps/web/src/routes/events.$eventId.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Calendar, MapPin, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/events/$eventId")({
  beforeLoad: async () => {
    await requireAuth();
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();

  const { data: event } = useSuspenseQuery(
    convexQuery(api.events.getById, { eventId: eventId as any })
  );

  const { data: stats } = useSuspenseQuery(
    convexQuery(api.events.getStats, { eventId: eventId as any })
  );

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="mt-2 text-gray-600">{event.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            event.status === "planning" ? "bg-blue-100 text-blue-700" :
            event.status === "in_progress" ? "bg-green-100 text-green-700" :
            event.status === "completed" ? "bg-gray-100 text-gray-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {event.status}
          </span>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Event Information</h2>
          <div className="space-y-3">
            {event.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <div>{event.location.address}</div>
                  <div className="text-sm text-gray-500">
                    {event.location.city}, {event.location.state}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span>
                {event.guestCount.confirmed} / {event.guestCount.expected} guests confirmed
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Budget</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Spent</span>
                <span>${event.budget.spent.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(event.budget.spent / event.budget.total) * 100}%`
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span>Total Budget</span>
              <span className="font-semibold">${event.budget.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Remaining</span>
              <span>${(event.budget.total - event.budget.spent).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.tasks.total}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{stats.tasks.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.rooms}</div>
            <div className="text-sm text-gray-600">Chat Rooms</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">{stats.participants}</div>
            <div className="text-sm text-gray-600">Team Members</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Event Access Control

### Permission Levels

**Coordinator (Owner):**
- Full control over event
- Can edit all event details
- Can add/remove co-coordinators
- Can archive/delete event
- Can manage all rooms and participants

**Co-Coordinator:**
- Can edit event details
- Can manage rooms and participants
- Cannot add/remove co-coordinators
- Cannot delete event

**Collaborator (Room Member):**
- Can view event details
- Can participate in assigned rooms
- Cannot edit event details
- Limited to assigned rooms

**Guest:**
- Read-only access if added to rooms
- Cannot post messages (unless room allows)

---

## Testing Event Operations

### Manual Testing Checklist

**Event Creation:**
- [ ] Create event with all fields
- [ ] Create event with minimal fields
- [ ] Main room created automatically
- [ ] Coordinator added as room participant
- [ ] Event appears in user's event list

**Event Access:**
- [ ] Coordinator can view event
- [ ] Co-coordinator can view event
- [ ] Collaborator (room member) can view event
- [ ] Non-member cannot view event (403)

**Event Updates:**
- [ ] Coordinator can update all fields
- [ ] Co-coordinator can update event
- [ ] Non-coordinator cannot update (403)
- [ ] Updated timestamp changes

**Co-Coordinators:**
- [ ] Add co-coordinator successfully
- [ ] Co-coordinator added to all rooms
- [ ] Co-coordinator can edit event
- [ ] Remove co-coordinator successfully
- [ ] Duplicate co-coordinator rejected

**Event Status:**
- [ ] Update status to "in_progress"
- [ ] Update status to "completed"
- [ ] Archive event
- [ ] Archived events don't show in default list

---

## Next Steps

With event management complete, you're ready to proceed to:

**Phase 1.4: Rooms & Participants CRUD**
- Create and manage chat rooms
- Add/remove participants
- Room permissions
- Participant notifications

**Estimated Time to Complete Phase 1.3:** 2-3 hours
- Backend CRUD operations: 1.5 hours
- Frontend components: 1 hour
- Testing: 30 minutes

---

**Previous Document:** [Phase 1.2: Users CRUD Operations](./phase-1.2-users-crud.md)

**Next Document:** [Phase 1.4: Rooms & Participants CRUD](./phase-1.4-rooms-crud.md)
