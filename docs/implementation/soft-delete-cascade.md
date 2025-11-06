# Event Delete Flow Implementation

## Overview

This document describes the comprehensive soft delete and hard delete cascade system implemented for the event management platform.

## Architecture

**IMPORTANT:** Convex does NOT support automatic database triggers or CASCADE constraints like traditional SQL databases. All cascade deletions must be manually implemented in mutation handlers.

The delete system uses **reusable helper functions** to ensure related data is properly handled when parent entities are deleted, maintaining data integrity and code reusability.

### Key Components

1. **Cascade Helpers** (`web/convex/cascadeHelpers.ts`): Reusable functions for cascade operations
2. **Mutation Handlers** (`events.ts`, `rooms.ts`, etc.): Call helpers to perform cascades
3. **Manual Cleanup Mutations**: Internal mutations for Convex dashboard cleanup

## Schema Changes

### Added Soft Delete Fields

All tables now include soft delete support:

```typescript
{
  isDeleted: boolean,
  deletedAt?: number
}
```

**Updated Tables:**
- `events`
- `eventMembers`
- `eventInvitations`
- `rooms`
- `roomParticipants`
- `tasks`
- `expenses`
- `polls`
- `pollVotes`
- `dashboards`
- `messages` (already had soft delete)

### New Indexes

Added indexes for efficient soft delete filtering:
- `by_deleted` on all tables with soft delete
- `by_[parent]_and_deleted` compound indexes (e.g., `by_event_and_deleted`)

## Cascade Helper Functions

### Soft Delete Helpers (Application Use)

Located in `web/convex/cascadeHelpers.ts`:

#### `softDeleteEventCascade(ctx, eventId, timestamp)`
Cascades soft delete for all event-related data. Used by `events.softDelete` mutation.

#### `softDeleteRoomCascade(ctx, roomId, timestamp)`
Cascades soft delete for all room-related data. Used by `rooms.softDelete` mutation and called by event cascade.

### Hard Delete Helpers (Manual Cleanup)

Internal functions for Convex dashboard cleanup:

#### `hardDeleteEventData(ctx, eventId)`
Hard deletes all event-related data. Used by `cascadeDeleteEvent` internal mutation.

#### `hardDeleteRoomData(ctx, roomId)`
Hard deletes all room-related data. Used by `cascadeDeleteRoom` internal mutation.

## Soft Delete Cascade Flow

### Event Soft Delete (`events.softDelete`)

**Location:** `web/convex/events.ts:435`
**Helper:** `softDeleteEventCascade()` from `cascadeHelpers.ts`

**Trigger Chain:**
```
DELETE EVENT
├─> SOFT DELETE rooms
│   ├─> SOFT DELETE roomParticipants
│   └─> SOFT DELETE messages
├─> SOFT DELETE eventMembers
├─> SOFT DELETE eventInvitations
├─> SOFT DELETE tasks
├─> SOFT DELETE expenses
├─> SOFT DELETE polls
│   └─> SOFT DELETE pollVotes
└─> SOFT DELETE dashboards
```

**Usage:**
```typescript
await ctx.runMutation(api.events.softDelete, { eventId });
```

**Permissions:** Only main coordinator can soft delete events

### Room Soft Delete (`rooms.softDelete`)

**Location:** `web/convex/rooms.ts:361`
**Helper:** `softDeleteRoomCascade()` from `cascadeHelpers.ts`

**Trigger Chain:**
```
DELETE ROOM
├─> SOFT DELETE roomParticipants
└─> SOFT DELETE messages
```

**Usage:**
```typescript
await ctx.runMutation(api.rooms.softDelete, { roomId });
```

**Permissions:** Event coordinators only
**Restrictions:** Cannot delete main room

### Event Member Removal (`eventMembers.removeMember`)

**Location:** `web/convex/eventMembers.ts:224`

**Trigger Chain:**
```
REMOVE EVENT MEMBER
├─> SOFT DELETE user's roomParticipants (in event's rooms)
├─> CANCEL eventInvitations (sent by this user)
└─> UNASSIGN or SOFT DELETE tasks
    ├─> Unassign incomplete tasks
    └─> Soft delete completed tasks
```

**Usage:**
```typescript
await ctx.runMutation(api.eventMembers.removeMember, {
  eventId,
  userId
});
```

**Permissions:** Event coordinators only
**Restrictions:** Cannot remove main coordinator

## Hard Delete Cascade (Convex Dashboard)

### Manual Cascade Helpers

**Location:** `web/convex/cascadeHelpers.ts`

When deleting records directly from the Convex dashboard, use these internal mutations to ensure cascade deletion:

#### 1. Cascade Delete Event
```bash
npx convex run cascadeHelpers:cascadeDeleteEvent --eventId "..."
```

Deletes the event and all related:
- Rooms → RoomParticipants, Messages
- EventMembers, EventInvitations
- Tasks, Expenses
- Polls → PollVotes
- Dashboards

#### 2. Cascade Delete Room
```bash
npx convex run cascadeHelpers:cascadeDeleteRoom --roomId "..."
```

Deletes the room and all related:
- RoomParticipants
- Messages

#### 3. Cascade Delete Poll
```bash
npx convex run cascadeHelpers:cascadeDeletePoll --pollId "..."
```

Deletes the poll and all related:
- PollVotes

## Query Filtering

### Automatic Soft Delete Filtering

All queries now automatically filter out soft-deleted records:

**Updated Queries:**
- `events.listUserEvents` - Filters soft-deleted events, rooms, and participants
- `events.getStats` - Excludes soft-deleted tasks, expenses, rooms, participants
- `rooms.listByEvent` - Filters soft-deleted rooms and participants
- `eventMembers.listByEvent` - Filters soft-deleted members

**Example:**
```typescript
// Before
const events = await ctx.db.query("events").collect();

// After (in model/events.ts)
const events = await ctx.db.query("events").collect();
const activeEvents = events.filter(e => !e.isDeleted);
```

## Data Consistency Rules

### Soft Delete Behavior

1. **Idempotent:** Soft deleting an already soft-deleted record is safe (checks `isDeleted` flag)
2. **Cascade Order:** Parent deleted first, then children in dependency order
3. **Timestamp Consistency:** All cascaded deletes use the same `deletedAt` timestamp
4. **Message Content:** Messages have their text replaced with `"[Message deleted]"`

### Junction Table Behavior

**Junction tables have mixed behavior:**
- `eventMembers`: **Hard deleted** when removing a member (direct removal from event)
- `roomParticipants`: **Soft deleted** during cascade operations (preserves history)

## Migration Considerations

### Default Values for New Records

All create mutations now include `isDeleted: false`:

**Updated Files:**
- `events.ts` - Event and room creation
- `rooms.ts` - Room creation
- `roomParticipants.ts` - Participant creation
- `eventMembers.ts` - Member backfill migration

### Existing Data

Existing records without soft delete fields will need a migration:

```typescript
// Run migration to add isDeleted to existing records
const records = await ctx.db.query("tableName").collect();
for (const record of records) {
  await ctx.db.patch(record._id, {
    isDeleted: false
  });
}
```

## Testing Checklist

### Soft Delete Flow
- [ ] Delete event triggers cascade to all child entities
- [ ] Soft deleted events don't appear in user event lists
- [ ] Soft deleted rooms don't appear in room lists
- [ ] Room participants properly cascade when room is deleted
- [ ] Messages show "[Message deleted]" text after deletion
- [ ] Tasks are properly handled when event member is removed
- [ ] Invitations are cancelled when event member is removed

### Hard Delete Flow
- [ ] `cascadeDeleteEvent` removes all related data
- [ ] `cascadeDeleteRoom` removes participants and messages
- [ ] `cascadeDeletePoll` removes all votes
- [ ] No orphaned records remain after cascade

### Query Filtering
- [ ] `listUserEvents` excludes soft-deleted events
- [ ] `listByEvent` excludes soft-deleted rooms
- [ ] Stats queries count only active records
- [ ] Soft-deleted participants don't appear in lists

## Performance Considerations

### Batch Operations

Large cascade deletes use batching for messages (100 at a time) to avoid transaction timeouts.

### Query Limits

Stats queries maintain existing limits (5000 tasks/expenses, 500 participants per room) and use filtering after retrieval.

### Future Optimizations

Consider these for large-scale deployments:
1. **Filtered Indexes:** Create indexes like `by_event_and_not_deleted` for better query performance
2. **Background Cleanup:** Implement scheduled jobs to permanently delete old soft-deleted records
3. **Counters:** Use incremental counters for stats instead of querying all records

## How It Works: Convex Cascade Architecture

### Understanding Convex Limitations

Unlike traditional SQL databases, **Convex does not support**:
- Database-level triggers (ON DELETE CASCADE)
- Automatic hooks that fire on record deletion
- Foreign key constraints with cascade behavior

### Our Manual Implementation

All cascade behavior is **manually implemented** using these patterns:

#### 1. Reusable Helper Functions
```typescript
// In cascadeHelpers.ts
export async function softDeleteRoomCascade(ctx, roomId, timestamp) {
  // Manually find and soft delete all related records
  const participants = await ctx.db.query("roomParticipants")...
  const messages = await ctx.db.query("messages")...
  // ... update each record
}
```

#### 2. Mutation Calls Helper
```typescript
// In rooms.ts
export const softDelete = mutation({
  handler: async (ctx, args) => {
    // Call the reusable helper
    await softDeleteRoomCascade(ctx, args.roomId, Date.now());
    // Then delete the parent
    await ctx.db.patch(args.roomId, { isDeleted: true });
  }
});
```

#### 3. Nested Cascades
Event cascade calls room cascade, which handles messages:
```typescript
softDeleteEventCascade() {
  // For each room in event
  await softDeleteRoomCascade(ctx, room._id, timestamp);
  // This automatically handles participants and messages
}
```

### Why This Architecture?

**Benefits:**
- ✅ Code reusability (same logic for soft and hard delete)
- ✅ Clear separation of concerns
- ✅ Easier to test and maintain
- ✅ Consistent cascade behavior
- ✅ Single source of truth for cascade logic

**Tradeoffs:**
- ❌ No automatic triggering (must call manually)
- ❌ More code than SQL CASCADE
- ❌ Risk of forgetting to call helpers

## API Reference

### Mutations

| Mutation | File | Permission | Cascade |
|----------|------|------------|---------|
| `events.softDelete` | events.ts:435 | Main coordinator | Full cascade |
| `rooms.softDelete` | rooms.ts:361 | Event coordinator | Room cascade |
| `eventMembers.removeMember` | eventMembers.ts:224 | Event coordinator | Member cascade |

### Cascade Helper Functions

| Helper | File | Type | Used By |
|--------|------|------|---------|
| `softDeleteEventCascade` | cascadeHelpers.ts | Soft | events.softDelete |
| `softDeleteRoomCascade` | cascadeHelpers.ts | Soft | rooms.softDelete, event cascade |
| `hardDeleteEventData` | cascadeHelpers.ts | Hard | Manual cleanup |
| `hardDeleteRoomData` | cascadeHelpers.ts | Hard | Manual cleanup |

### Internal Cleanup Mutations

| Mutation | File | Purpose |
|---------|------|---------|
| `cascadeHelpers:cascadeDeleteEvent` | cascadeHelpers.ts | Hard delete event + cascade |
| `cascadeHelpers:cascadeDeleteRoom` | cascadeHelpers.ts | Hard delete room + cascade |
| `cascadeHelpers:cascadeDeletePoll` | cascadeHelpers.ts | Hard delete poll + cascade |

## Known Limitations

1. **No Restore Functionality:** Soft deleted records cannot be restored (by design)
2. **Message Limit:** Room cascade deletion limited to 50,000 messages per room
3. **Main Room Protection:** Main room cannot be deleted (prevents event from becoming unusable)
4. **Co-coordinator Limit:** Co-coordinator event queries limited to 500 most recent events

## Future Enhancements

1. **Audit Log:** Track who deleted what and when
2. **Scheduled Cleanup:** Permanent deletion of old soft-deleted records
3. **Restore Functionality:** Optional restore for accidentally deleted events
4. **Cascade Progress:** Progress tracking for large cascade operations
5. **Webhook Notifications:** Notify external systems of deletions
