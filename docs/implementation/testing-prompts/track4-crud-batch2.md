# Track 4: Core CRUD Tests - Batch 2

## Objective
Create comprehensive test files for 4 extended CRUD modules: milestones, timelineEvents, announcements, inventory

## Context
- **Files to test**:
  - `web/convex/milestones.ts`
  - `web/convex/timelineEvents.ts`
  - `web/convex/announcements.ts`
  - `web/convex/inventory.ts`
- **Test files to create**: Same path with `.test.ts` extension
- **Testing framework**: Vitest with convex-test
- **Pattern reference**: `web/convex/authHelpers.test.ts`
- **Factories**: Use `factories.milestone()`, `factories.timelineEvent()`, etc.

---

## 1. milestones.test.ts

**File to test**: `web/convex/milestones.ts`
**Schema reference**: Lines 702-755 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates milestone with required fields (name, eventId, category, targetDate)
- ✅ Sets default status to "not_started"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles optional fields (description, dependencies, criticality)
- ✅ Stores completion criteria array
- ✅ Stores AI fields (industryStandardTiming, risks)

#### `get` query
- ✅ Returns milestone by ID
- ✅ Returns null for non-existent milestone

#### `listByEvent` query
- ✅ Returns all milestones for event
- ✅ Filters by status if provided
- ✅ Filters by criticality if provided
- ✅ Excludes soft-deleted milestones
- ✅ Orders by targetDate

#### `getCriticalPath` query
- ✅ Returns only critical milestones (criticality = "critical")
- ✅ Excludes completed milestones
- ✅ Orders by targetDate
- ✅ Excludes soft-deleted milestones

#### `update` mutation
- ✅ Updates milestone fields (name, status, targetDate)
- ✅ Auto-sets completedDate when status changes to "completed"
- ✅ Updates updatedAt timestamp

#### `deleteMilestone` mutation
- ✅ Soft deletes milestone
- ✅ Updates updatedAt timestamp

### Special Tests
- ✅ Status workflow (not_started → in_progress → completed / at_risk)
- ✅ Criticality levels (nice_to_have, important, critical)
- ✅ Dependency tracking (dependsOnMilestones, blocksTasks arrays)
- ✅ Critical path filtering returns only critical items
- ✅ Completion criteria array handling

---

## 2. timelineEvents.test.ts

**File to test**: `web/convex/timelineEvents.ts`
**Schema reference**: Lines 757-831 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates timeline event with required fields (name, eventId, startTime)
- ✅ Auto-increments order field
- ✅ Sets default status to "scheduled"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles optional fields (endTime, duration, location, type)
- ✅ Stores people involved (responsiblePerson, vendorsInvolved, participantsRequired)

#### `get` query
- ✅ Returns timeline event by ID
- ✅ Returns null for non-existent event

#### `listByEvent` query
- ✅ Returns all timeline events for event
- ✅ Filters by status if provided
- ✅ Filters by type if provided
- ✅ Excludes soft-deleted events

#### `getDayOfSchedule` query
- ✅ Returns all timeline events for event
- ✅ Orders by order field (ascending)
- ✅ Excludes soft-deleted events
- ✅ Proper sequence for day-of coordination

#### `updateStatus` mutation
- ✅ Updates status field
- ✅ Sets actualStartTime when status → "in_progress"
- ✅ Sets actualEndTime when status → "completed"
- ✅ Appends live update to liveUpdates array
- ✅ Updates updatedAt timestamp

#### `update` mutation
- ✅ Updates timeline event fields (name, startTime, endTime, location)
- ✅ Updates updatedAt timestamp

#### `deleteTimelineEvent` mutation
- ✅ Soft deletes timeline event
- ✅ Updates updatedAt timestamp

### Special Tests
- ✅ Order field auto-increments correctly
- ✅ Status workflow (scheduled → in_progress → completed / delayed)
- ✅ Actual time tracking (actualStartTime, actualEndTime)
- ✅ Live updates array appending works correctly
- ✅ Event types (setup, vendor_arrival, ceremony, reception, activity, meal, teardown)
- ✅ Dependencies (mustStartAfter array)
- ✅ Alert timing (alertMinutesBefore)

---

## 3. announcements.test.ts

**File to test**: `web/convex/announcements.ts`
**Schema reference**: Lines 833-906 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates announcement with required fields (title, message, eventId)
- ✅ Sets default status to "draft"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles type (save_the_date, invitation, update, reminder, info, thank_you)
- ✅ Stores delivery method array (email, sms, in_app)
- ✅ Stores recipient targeting (sendToAll, sendToRsvpStatus, sendToTags, customRecipients)

#### `get` query
- ✅ Returns announcement by ID
- ✅ Returns null for non-existent announcement

#### `listByEvent` query
- ✅ Returns all announcements for event
- ✅ Filters by status if provided
- ✅ Filters by type if provided
- ✅ Excludes soft-deleted announcements

#### `schedule` mutation
- ✅ Sets scheduledSendTime field
- ✅ Changes status to "scheduled"
- ✅ Updates updatedAt timestamp

#### `markSent` mutation
- ✅ Sets sentAt timestamp
- ✅ Changes status to "sent"
- ✅ Updates deliveryStats object (totalSent, delivered, opened, clicked, bounced)
- ✅ Updates updatedAt timestamp

#### `update` mutation
- ✅ Updates announcement fields (title, message, recipients)
- ✅ Updates updatedAt timestamp

#### `deleteAnnouncement` mutation
- ✅ Soft deletes announcement
- ✅ Updates updatedAt timestamp

### Special Tests
- ✅ Status workflow (draft → scheduled → sent / failed)
- ✅ Delivery method array handling
- ✅ Recipient targeting logic (sendToAll vs custom)
- ✅ RSVP status targeting
- ✅ Tag-based targeting
- ✅ Delivery stats structure
- ✅ Attachments array handling

---

## 4. inventory.test.ts

**File to test**: `web/convex/inventory.ts`
**Schema reference**: Lines 908-974 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates inventory item with required fields (name, eventId, quantity, unit)
- ✅ Sets default status to "ordered"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles acquisition types (rented, purchased, borrowed, owned)
- ✅ Stores rental details for rented items (pickupDate, returnDate, deposit)
- ✅ Calculates totalCost from costPerUnit * quantity

#### `get` query
- ✅ Returns inventory item by ID
- ✅ Returns null for non-existent item

#### `listByEvent` query
- ✅ Returns all inventory items for event
- ✅ Filters by category if provided
- ✅ Filters by status if provided
- ✅ Excludes soft-deleted items

#### `getRentalsDueForReturn` query
- ✅ Returns only rented items (acquisitionType = "rented")
- ✅ Filters by return date within X days
- ✅ Excludes already returned items (status !== "returned")
- ✅ Excludes soft-deleted items
- ✅ Sorts by return date (ascending)

#### `updateStatus` mutation
- ✅ Updates status field
- ✅ Updates updatedAt timestamp
- ✅ Optionally updates condition notes

#### `update` mutation
- ✅ Updates inventory fields (quantity, status, storageLocation)
- ✅ Recalculates totalCost if quantity or costPerUnit changes
- ✅ Updates updatedAt timestamp

#### `deleteInventoryItem` mutation
- ✅ Soft deletes inventory item
- ✅ Updates updatedAt timestamp

### Special Tests
- ✅ Acquisition types (rented, purchased, borrowed, owned)
- ✅ Status workflow (ordered → delivered → in_use → returned / lost_damaged)
- ✅ Rental details structure (pickupDate, returnDate, deposit, damagePolicy)
- ✅ Cost calculation (totalCost = costPerUnit * quantity)
- ✅ Return date filtering (7, 14, 30 day windows)
- ✅ Condition tracking (conditionNotes, photoUrl)
- ✅ Storage location management
- ✅ Link to expense record

---

## Acceptance Criteria

For each of the 4 test files:
- ✅ Test file created with comprehensive coverage
- ✅ All CRUD operations tested (create, get, list, update, delete)
- ✅ All special queries tested (getCriticalPath, getDayOfSchedule, getRentalsDueForReturn)
- ✅ Edge cases covered (null checks, empty arrays, soft deletes)
- ✅ Status workflows verified
- ✅ 40-60 test cases per file
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 80% on each CRUD file

## Deliverables

4 complete test files:
1. `web/convex/milestones.test.ts` (~400-450 lines)
2. `web/convex/timelineEvents.test.ts` (~500-550 lines)
3. `web/convex/announcements.test.ts` (~450-500 lines)
4. `web/convex/inventory.test.ts` (~450-500 lines)

Total: ~1800-2000 lines of comprehensive tests
