# Track 1: Test Factories Extension

## Objective
Extend `web/src/test/factories/index.ts` with factory functions for all 10 new Phase 0 entities.

## Context
- **Existing factories file**: `web/src/test/factories/index.ts`
- **Pattern reference**: Look at existing `factories.user()`, `factories.event()`, `factories.task()`, `factories.expense()` for patterns
- **Testing framework**: Vitest with convex-test
- **Schema reference**: `web/convex/schema.ts` (lines for each table)

## Requirements

Create factory functions for these 10 entities:

### 1. `factories.vendor(overrides?)`
**Schema**: Lines 414-491 in phase0-convex-data-layer.md
- Generate realistic vendor data (name, category, contact, pricing, rating)
- Include AI metadata (matchScore, pros, cons)
- Support status workflow (researching/contacted/negotiating/contracted/active/completed/rejected)
- Auto-increment IDs with timestamp

### 2. `factories.taskGroup(overrides?)`
**Schema**: Lines 301-331 in phase0-convex-data-layer.md
- Generate group with name, description
- Auto-increment order field
- Initialize taskCount: 0, completedCount: 0
- Optional color/icon

### 3. `factories.guest(overrides?)`
**Schema**: Lines 578-649 in phase0-convex-data-layer.md
- Generate firstName, lastName, email
- RSVP status (pending/attending/declined/maybe)
- Guest type (vip/family/friend/colleague/plus_one)
- Optional dietary restrictions, allergies, seating

### 4. `factories.paymentSchedule(overrides?)`
**Schema**: Lines 651-700 in phase0-convex-data-layer.md
- Generate description, amount, currency, dueDate
- Auto-calculate status based on dueDate (upcoming/due_soon/overdue/paid)
- Optional vendor/expense links

### 5. `factories.milestone(overrides?)`
**Schema**: Lines 702-755 in phase0-convex-data-layer.md
- Generate name, category, targetDate
- Status (not_started/in_progress/at_risk/completed)
- Criticality (nice_to_have/important/critical)
- Optional dependencies array

### 6. `factories.timelineEvent(overrides?)`
**Schema**: Lines 757-831 in phase0-convex-data-layer.md
- Generate name, startTime, endTime, duration
- Type (setup/vendor_arrival/ceremony/reception/activity/meal/teardown)
- Auto-increment order field
- Status (scheduled/in_progress/completed/delayed/cancelled)

### 7. `factories.announcement(overrides?)`
**Schema**: Lines 833-906 in phase0-convex-data-layer.md
- Generate title, message
- Type (save_the_date/invitation/update/reminder/info/thank_you)
- Delivery method array (email/sms/in_app)
- Status (draft/scheduled/sent/failed)
- Optional delivery stats

### 8. `factories.inventoryItem(overrides?)`
**Schema**: Lines 908-974 in phase0-convex-data-layer.md
- Generate name, description, category
- Quantity, unit, costPerUnit, totalCost
- Acquisition type (rented/purchased/borrowed/owned)
- Status (ordered/delivered/in_use/returned/lost_damaged)
- Optional rental details for rented items

### 9. `factories.decision(overrides?)`
**Schema**: Lines 493-548 in phase0-convex-data-layer.md
- Generate question, description
- Type (binary/multiple_choice/ranked/budget_allocation)
- Options array with votes
- Status (active/closed/cancelled)
- Optional AI suggestion fields

### 10. `factories.checkpoint(overrides?)`
**Schema**: Lines 550-576 in phase0-convex-data-layer.md
- Generate roomId, doInstanceId
- Sequential checkpointId
- Snapshot (compressed JSON string - can be mock)
- Metadata: messageCount, memorySize, checksum

## Existing Pattern to Follow

```typescript
// From current factories/index.ts
export const factories = {
  user: (overrides?: Partial<UserData>): UserData => ({
    email: `user-${Date.now()}-${counter++}@example.com`,
    name: "Test User",
    username: generateUsername("Test User"),
    role: "coordinator",
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  // Add new factories here
};
```

## Acceptance Criteria

- ✅ All 10 factory functions added to `web/src/test/factories/index.ts`
- ✅ Each factory returns complete, valid test data matching schema
- ✅ All factories support `overrides` parameter for customization
- ✅ Auto-generated fields use timestamps/counters to ensure uniqueness
- ✅ Realistic default values (not just null/undefined)
- ✅ TypeScript types properly defined
- ✅ Follows existing factory patterns in the file
- ✅ No TypeScript errors after addition

## Deliverable

Updated `web/src/test/factories/index.ts` with all 10 new factory functions integrated into the existing `factories` object.
