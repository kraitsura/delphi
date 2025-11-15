# Convex Helper Functions Refactoring Checklist

## Convex Best Practice Convention

### The Problem
Tests are calling exported Convex functions (mutations/queries) directly, which violates Convex best practices:

```typescript
// ❌ ANTI-PATTERN - Do NOT do this
import { create, get } from "./checkpoints";
await create(ctx, { roomId, doInstanceId, ... });
await get(ctx, { checkpointId });
```

### The Solution
Extract business logic into helper functions and call those from both API handlers and tests:

```typescript
// ✅ CORRECT PATTERN

// In checkpoints.ts - Extract helper function
export async function createCheckpoint(
  ctx: MutationCtx,
  args: {
    roomId: Id<"rooms">;
    doInstanceId: string;
    snapshot: string;
    messageCount: number;
    memorySize: number;
    checksum?: string;
  }
): Promise<Id<"checkpoints">> {
  // Business logic here
  const checkpointId = await ctx.db.insert("checkpoints", {...});
  return checkpointId;
}

// Thin API wrapper
export const create = mutation({
  args: {
    roomId: v.id("rooms"),
    doInstanceId: v.string(),
    snapshot: v.string(),
    messageCount: v.number(),
    memorySize: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, args) => createCheckpoint(ctx, args),
});

// In checkpoints.test.ts - Call helper directly
import { createCheckpoint } from "./checkpoints";
const checkpointId = await createCheckpoint(ctx, { roomId, doInstanceId, ... });
```

### Refactoring Steps (for each module)

1. **Extract helper functions** from each mutation/query handler
   - Move all business logic into a standalone async function
   - Name it descriptively (e.g., `createCheckpoint`, `getCheckpoint`, `listCheckpointsByRoom`)
   - Export the helper function
   - Keep the exact same logic, just moved out

2. **Update mutation/query handlers**
   - Replace handler logic with a call to the helper function
   - Keep args validation and structure unchanged
   - Handler becomes: `handler: async (ctx, args) => helperFunction(ctx, args)`

3. **Update test file**
   - Change imports from exported mutations/queries to helper functions
   - Update all function calls to use helper names
   - Keep all test logic and assertions the same

4. **Verify**
   - Run `bun run test` for that specific file
   - Ensure tests pass and no warnings appear

## Refactoring Tracks

### Track 1: Checkpoints & Decisions
**Files:**
- `convex/checkpoints.ts`
- `convex/checkpoints.test.ts`
- `convex/decisions.ts`
- `convex/decisions.test.ts`

**Functions to extract (checkpoints):**
- `create` → `createCheckpoint`
- `get` → `getCheckpoint`
- `getLatest` → `getLatestCheckpoint`
- `listByRoom` → `listCheckpointsByRoom`
- `listByDO` → `listCheckpointsByDO`

**Functions to extract (decisions):**
- `create` → `createDecision`
- `get` → `getDecision`
- `listByEvent` → `listDecisionsByEvent`
- `listByRoom` → `listDecisionsByRoom`
- `vote` → `voteOnDecision`
- `close` → `closeDecision`
- `update` → `updateDecision`
- `deleteDecision` → `deleteDecisionHelper`

---

### Track 2: Tasks & Task Groups
**Files:**
- `convex/tasks.ts`
- `convex/tasks.test.ts`
- `convex/taskGroups.ts`
- `convex/taskGroups.test.ts`

**Functions to extract (tasks):**
- `create` → `createTask`
- `getById` → `getTaskById`
- `listByEvent` → `listTasksByEvent`
- `listByRoom` → `listTasksByRoom`
- `update` → `updateTask`
- `updateStatus` → `updateTaskStatus`
- `remove` → `removeTask`
- `search` → `searchTasks`

**Functions to extract (taskGroups):**
- `create` → `createTaskGroup`
- `get` → `getTaskGroup`
- `listByEvent` → `listTaskGroupsByEvent`
- `listByRoom` → `listTaskGroupsByRoom`
- `update` → `updateTaskGroup`
- `remove` → `removeTaskGroup`

---

### Track 3: Expenses & Payment Schedules
**Files:**
- `convex/expenses.ts`
- `convex/expenses.test.ts`
- `convex/paymentSchedules.ts`
- `convex/paymentSchedules.test.ts`

**Functions to extract (expenses):**
- `create` → `createExpense`
- `getById` → `getExpenseById`
- `listByEvent` → `listExpensesByEvent`
- `update` → `updateExpense`
- `updateSplitPayment` → `updateExpenseSplitPayment`
- `remove` → `removeExpense`
- `getBudgetSummary` → `getEventBudgetSummary`

**Functions to extract (paymentSchedules):**
- `create` → `createPaymentSchedule`
- `get` → `getPaymentSchedule`
- `listByExpense` → `listPaymentSchedulesByExpense`
- `update` → `updatePaymentSchedule`
- `markPaid` → `markPaymentSchedulePaid`
- `remove` → `removePaymentSchedule`

---

### Track 4: Milestones & Timeline Events
**Files:**
- `convex/milestones.ts`
- `convex/milestones.test.ts`
- `convex/timelineEvents.ts`
- `convex/timelineEvents.test.ts`

**Functions to extract (milestones):**
- `create` → `createMilestone`
- `get` → `getMilestone`
- `listByEvent` → `listMilestonesByEvent`
- `listByRoom` → `listMilestonesByRoom`
- `update` → `updateMilestone`
- `complete` → `completeMilestone`
- `remove` → `removeMilestone`

**Functions to extract (timelineEvents):**
- `create` → `createTimelineEvent`
- `get` → `getTimelineEvent`
- `listByEvent` → `listTimelineEventsByEvent`
- `listByRoom` → `listTimelineEventsByRoom`
- `update` → `updateTimelineEvent`
- `remove` → `removeTimelineEvent`

---

### Track 5: Inventory & Announcements
**Files:**
- `convex/inventory.ts`
- `convex/inventory.test.ts`
- `convex/announcements.ts`
- `convex/announcements.test.ts`

**Functions to extract (inventory):**
- `create` → `createInventoryItem`
- `get` → `getInventoryItem`
- `listByEvent` → `listInventoryByEvent`
- `listByRoom` → `listInventoryByRoom`
- `update` → `updateInventoryItem`
- `remove` → `removeInventoryItem`

**Functions to extract (announcements):**
- `create` → `createAnnouncement`
- `get` → `getAnnouncement`
- `listByEvent` → `listAnnouncementsByEvent`
- `listByRoom` → `listAnnouncementsByRoom`
- `update` → `updateAnnouncement`
- `remove` → `removeAnnouncement`

---

### Track 6: Guests & Vendors
**Files:**
- `convex/guests.ts`
- `convex/guests.test.ts`
- `convex/vendors.ts`
- `convex/vendors.test.ts`

**Functions to extract (guests):**
- `create` → `createGuest`
- `get` → `getGuest`
- `listByEvent` → `listGuestsByEvent`
- `listByRoom` → `listGuestsByRoom`
- `update` → `updateGuest`
- `updateRsvpStatus` → `updateGuestRsvpStatus`
- `remove` → `removeGuest`

**Functions to extract (vendors):**
- `create` → `createVendor`
- `get` → `getVendor`
- `listByEvent` → `listVendorsByEvent`
- `listByRoom` → `listVendorsByRoom`
- `update` → `updateVendor`
- `remove` → `removeVendor`

---

### Track 7: Agent Context & Validators
**Files:**
- `convex/agentContext.ts`
- `convex/agentContext.test.ts`
- `convex/validators.ts`
- `convex/validators.test.ts`
- `convex/authHelpers.test.ts` (minor fixes only)

**Functions to extract (agentContext):**
- `create` → `createAgentContext`
- `get` → `getAgentContext`
- `listByRoom` → `listAgentContextsByRoom`
- `update` → `updateAgentContext`

**Functions to extract (validators):**
- Any exported mutations/queries being called in tests

**Note:** `authHelpers.ts` already uses the correct pattern (exports helpers), only test file needs minor updates if any.

---

## Agent Execution Instructions

To execute a track, use this prompt template:

```
Refactor the files in Track [NUMBER] of the CONVEX_REFACTOR_CHECKLIST.md document.

Follow the "Convex Best Practice Convention" and "Refactoring Steps" exactly as specified in the document.

For each module in your track:
1. Read both the .ts and .test.ts files
2. Extract helper functions from mutation/query handlers as specified
3. Update the handlers to call the helpers
4. Update the test file to import and call helpers instead of exported functions
5. Run `bun run test convex/[filename].test.ts` to verify
6. Move to the next module in your track

Report completion when all files in your track pass tests without warnings.
```

## Progress Tracking

- [ ] Track 1: Checkpoints & Decisions
- [ ] Track 2: Tasks & Task Groups
- [ ] Track 3: Expenses & Payment Schedules
- [ ] Track 4: Milestones & Timeline Events
- [ ] Track 5: Inventory & Announcements
- [ ] Track 6: Guests & Vendors
- [ ] Track 7: Agent Context & Validators

## Final Verification

After all tracks complete:
```bash
bun run test
```

Expected outcome:
- ✅ All tests pass
- ✅ No warnings about calling Convex functions directly
- ✅ Production API unchanged (no breaking changes)
