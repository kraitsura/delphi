# Track 3: Core CRUD Tests - Batch 1

## Objective
Create comprehensive test files for 4 core CRUD modules: vendors, taskGroups, guests, paymentSchedules

## Context
- **Files to test**:
  - `web/convex/vendors.ts`
  - `web/convex/taskGroups.ts`
  - `web/convex/guests.ts`
  - `web/convex/paymentSchedules.ts`
- **Test files to create**: Same path with `.test.ts` extension
- **Testing framework**: Vitest with convex-test
- **Pattern reference**: `web/convex/authHelpers.test.ts`
- **Factories**: Use `factories.vendor()`, `factories.taskGroup()`, etc. from Track 1

## Test Template Structure

Each test file should follow this structure:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { factories } from "../src/test/factories";

describe("[Module] CRUD Operations", () => {
  describe("create", () => {
    it("should create with valid args");
    it("should set timestamps (createdAt, updatedAt)");
    it("should validate required fields");
    it("should handle optional fields");
  });

  describe("get", () => {
    it("should return entity by ID");
    it("should return null for non-existent ID");
  });

  describe("listByEvent", () => {
    it("should return all entities for event");
    it("should exclude soft-deleted entities");
    it("should filter by optional parameters");
    it("should return empty array if none found");
  });

  describe("update", () => {
    it("should update specified fields");
    it("should update updatedAt timestamp");
    it("should preserve unchanged fields");
    it("should throw error for non-existent entity");
  });

  describe("delete", () => {
    it("should soft delete (set deletedAt)");
    it("should update updatedAt on delete");
    it("should exclude from list queries after delete");
  });

  // Module-specific tests
  describe("special operations", () => {
    // Custom queries/mutations per module
  });
});
```

---

## 1. vendors.test.ts

**File to test**: `web/convex/vendors.ts`
**Schema reference**: Lines 414-491 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates vendor with all required fields (name, category, addedBy)
- ✅ Sets default status to "researching"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles optional fields (email, phone, website, pricing, rating)
- ✅ Stores AI metadata (matchScore, pros, cons)
- ✅ Links to event and room if provided

#### `get` query
- ✅ Returns vendor by ID
- ✅ Returns null for non-existent vendor

#### `listByEvent` query
- ✅ Returns all vendors for event
- ✅ Filters by category if provided
- ✅ Filters by status if provided
- ✅ Excludes soft-deleted vendors
- ✅ Returns empty array if no vendors

#### `listByRoom` query
- ✅ Returns all vendors for room
- ✅ Excludes soft-deleted vendors

#### `searchByCategory` query
- ✅ Returns vendors by category
- ✅ Filters by minRating if provided
- ✅ Excludes soft-deleted vendors

#### `update` mutation
- ✅ Updates vendor fields (name, status, email, phone, pricing)
- ✅ Updates contract fields (contractUrl, contractSignedAt)
- ✅ Updates updatedAt timestamp
- ✅ Throws error for non-existent vendor

#### `deleteVendor` mutation
- ✅ Soft deletes vendor (sets deletedAt)
- ✅ Updates updatedAt timestamp
- ✅ Vendor excluded from list queries after deletion

### Special Tests
- ✅ Status workflow (researching → contacted → negotiating → contracted → active → completed)
- ✅ AI metadata structure (matchScore, pros, cons, specialties)
- ✅ Rating filtering works correctly

---

## 2. taskGroups.test.ts

**File to test**: `web/convex/taskGroups.ts`
**Schema reference**: Lines 301-331 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates task group with name and eventId
- ✅ Auto-increments order field (max + 1)
- ✅ Initializes taskCount to 0
- ✅ Initializes completedCount to 0
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Handles optional fields (description, color, icon)

#### `get` query
- ✅ Returns task group by ID
- ✅ Returns null for non-existent group

#### `listByEvent` query
- ✅ Returns all groups for event
- ✅ Orders by order field (ascending)
- ✅ Excludes soft-deleted groups

#### `update` mutation
- ✅ Updates group fields (name, description, color, order)
- ✅ Updates updatedAt timestamp

#### `deleteGroup` mutation
- ✅ Soft deletes group
- ✅ Removes groupId from all tasks in the group (orphan tasks)
- ✅ Updates task updatedAt timestamps

### Special Tests
- ✅ Order field auto-increments correctly with multiple groups
- ✅ Task count tracking (verify manual updates work - actual increment tested in integration)
- ✅ Deletion orphans tasks correctly

---

## 3. guests.test.ts

**File to test**: `web/convex/guests.ts`
**Schema reference**: Lines 578-649 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates guest with required fields (firstName, lastName, eventId, invitedBy)
- ✅ Sets default rsvpStatus to "pending"
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Updates event guestCount.expected (increment by 1)
- ✅ Handles optional fields (email, phone, dietary restrictions, allergies)
- ✅ Handles plus-one fields

#### `get` query
- ✅ Returns guest by ID
- ✅ Returns null for non-existent guest

#### `listByEvent` query
- ✅ Returns all guests for event
- ✅ Filters by rsvpStatus if provided
- ✅ Filters by guestType if provided
- ✅ Excludes soft-deleted guests

#### `getRsvpSummary` query
- ✅ Returns total guest count
- ✅ Returns counts by RSVP status (attending, declined, pending, maybe)
- ✅ Returns dietary restrictions aggregation
- ✅ Excludes soft-deleted guests from counts

#### `update` mutation
- ✅ Updates guest fields (rsvpStatus, tableNumber, seatNumber, notes)
- ✅ Updates RSVP date when status changes
- ✅ Updates plus-one fields
- ✅ Updates thank you fields

#### `deleteGuest` mutation
- ✅ Soft deletes guest
- ✅ Updates event guestCount.expected (decrement by 1)
- ✅ Handles case when guestCount doesn't exist

### Special Tests
- ✅ RSVP workflow (pending → attending/declined/maybe)
- ✅ Plus-one management (plusOneName, plusOneRsvp)
- ✅ Dietary restrictions array handling
- ✅ Seating assignment (tableNumber, seatNumber)
- ✅ Gift tracking (giftReceived, thankYouSent)

---

## 4. paymentSchedules.test.ts

**File to test**: `web/convex/paymentSchedules.ts`
**Schema reference**: Lines 651-700 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates payment schedule with required fields
- ✅ Auto-calculates status based on dueDate:
  - overdue if dueDate < now
  - due_soon if dueDate within 7 days
  - upcoming if dueDate > 7 days
- ✅ Sets createdAt and updatedAt timestamps
- ✅ Links to vendor and expense if provided

#### `get` query
- ✅ Returns payment schedule by ID
- ✅ Returns null for non-existent schedule

#### `listByEvent` query
- ✅ Returns all schedules for event
- ✅ Filters by status if provided
- ✅ Enriches with vendor info (joins vendor data)
- ✅ Excludes soft-deleted schedules

#### `getUpcoming` query
- ✅ Returns schedules due within X days (default 30)
- ✅ Excludes paid schedules
- ✅ Excludes soft-deleted schedules
- ✅ Sorts by dueDate (ascending)

#### `markPaid` mutation
- ✅ Sets status to "paid"
- ✅ Sets paidDate (uses provided or Date.now())
- ✅ Links to expense if provided
- ✅ Stores confirmation number if provided

#### `update` mutation
- ✅ Updates amount, dueDate, status, notes
- ✅ Updates updatedAt timestamp

#### `deleteSchedule` mutation
- ✅ Soft deletes schedule
- ✅ Updates updatedAt timestamp

### Special Tests
- ✅ Status auto-calculation logic:
  - Test with dueDate in past (overdue)
  - Test with dueDate in 3 days (due_soon)
  - Test with dueDate in 30 days (upcoming)
- ✅ Upcoming schedules filtering (7, 14, 30, 60 day windows)
- ✅ Vendor enrichment includes correct data
- ✅ Payment workflow (upcoming → due_soon → overdue → paid)

---

## Acceptance Criteria

For each of the 4 test files:
- ✅ Test file created with comprehensive coverage
- ✅ All CRUD operations tested (create, get, list, update, delete)
- ✅ All special queries tested (getRsvpSummary, getUpcoming, etc.)
- ✅ Edge cases covered (null checks, empty arrays, soft deletes)
- ✅ Integration points verified (event count updates, vendor enrichment)
- ✅ 40-60 test cases per file
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 80% on each CRUD file

## Deliverables

4 complete test files:
1. `web/convex/vendors.test.ts` (~400-500 lines)
2. `web/convex/taskGroups.test.ts` (~350-400 lines)
3. `web/convex/guests.test.ts` (~500-600 lines)
4. `web/convex/paymentSchedules.test.ts` (~450-500 lines)

Total: ~1700-2000 lines of comprehensive tests
