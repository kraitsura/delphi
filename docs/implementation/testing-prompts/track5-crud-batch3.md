# Track 5: Core CRUD Tests - Batch 3 + Enhanced Files

## Objective
Create comprehensive test files for: decisions, checkpoints, plus enhance tests for tasks and expenses

## Context
- **Files to test**:
  - `web/convex/decisions.ts`
  - `web/convex/checkpoints.ts`
  - `web/convex/tasks.ts` (enhance existing)
  - `web/convex/expenses.ts` (enhance existing)
- **Test files to create**: Same path with `.test.ts` extension
- **Testing framework**: Vitest with convex-test
- **Factories**: Use appropriate factories

---

## 1. decisions.test.ts

**File to test**: `web/convex/decisions.ts`
**Schema reference**: Lines 493-548 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates decision with required fields (question, eventId, roomId, type)
- ✅ Sets default status to "active"
- ✅ Sets createdAt timestamp
- ✅ Handles decision types (binary, multiple_choice, ranked, budget_allocation)
- ✅ Initializes options array with votes: 0
- ✅ Stores AI fields (suggestedByAI, aiReasoning)

#### `get` query
- ✅ Returns decision by ID
- ✅ Returns null for non-existent decision

#### `listByEvent` query
- ✅ Returns all decisions for event
- ✅ Filters by status if provided
- ✅ Excludes soft-deleted decisions

#### `listByRoom` query
- ✅ Returns all decisions for room
- ✅ Excludes soft-deleted decisions

#### `vote` mutation
- ✅ Increments vote count for selected option
- ✅ Adds userId to voters array for that option
- ✅ Prevents duplicate voting (same user voting twice)
- ✅ Throws error for invalid optionId
- ✅ Throws error if decision is closed

#### `close` mutation
- ✅ Sets status to "closed"
- ✅ Sets closedAt timestamp
- ✅ Determines winning option (most votes)
- ✅ Sets selectedOption field
- ✅ Prevents reopening closed decisions

#### `update` mutation
- ✅ Updates decision fields (question, description)
- ✅ Cannot update if status is "closed"

#### `deleteDecision` mutation
- ✅ Soft deletes decision
- ✅ Sets deletedAt timestamp

### Special Tests
- ✅ Decision types (binary, multiple_choice, ranked, budget_allocation)
- ✅ Voting logic (increment, prevent duplicates)
- ✅ Vote counting and winner determination
- ✅ Status workflow (active → closed / cancelled)
- ✅ AI suggestion fields
- ✅ Option structure (id, text, votes, voters array)

---

## 2. checkpoints.test.ts

**File to test**: `web/convex/checkpoints.ts`
**Schema reference**: Lines 550-576 in phase0-convex-data-layer.md

### Operations to Test

#### `create` mutation
- ✅ Creates checkpoint with required fields (roomId, doInstanceId, snapshot)
- ✅ Auto-increments checkpointId (sequential per room)
- ✅ Sets createdAt timestamp
- ✅ Stores metadata (messageCount, memorySize)
- ✅ Generates checksum if provided

#### `get` query
- ✅ Returns checkpoint by ID
- ✅ Returns null for non-existent checkpoint

#### `getLatest` query
- ✅ Returns latest checkpoint for room (highest checkpointId)
- ✅ Returns null if no checkpoints exist
- ✅ Filters by doInstanceId if provided

#### `listByRoom` query
- ✅ Returns all checkpoints for room
- ✅ Orders by checkpointId (descending)
- ✅ Limits results (default 10)

#### `deleteOldCheckpoints` mutation (if exists)
- ✅ Deletes checkpoints older than retention period
- ✅ Keeps minimum number of recent checkpoints

### Special Tests
- ✅ CheckpointId auto-increment (sequential per room)
- ✅ Snapshot storage (compressed JSON string)
- ✅ Checksum validation
- ✅ Latest checkpoint retrieval
- ✅ Multiple DO instances per room handling
- ✅ Memory size tracking
- ✅ Message count tracking

---

## 3. tasks.test.ts (Enhanced)

**File to test**: `web/convex/tasks.ts`
**Schema reference**: Lines 209-299 and 989-1203 in phase0-convex-data-layer.md

### New Operations to Test (added in Phase 0)

#### Enhanced `create` mutation
- ✅ Creates task with new required fields (roomId, createdBy)
- ✅ Handles new optional fields (groupId, dependsOn, blockedBy)
- ✅ Stores AI metadata (suggestedVendors, nextSteps, reasoning, relatedTasks)
- ✅ Links to source message (sourceMessageId)
- ✅ Updates group taskCount if groupId provided

#### Enhanced `listByEvent` query
- ✅ Filters by status
- ✅ Filters by category
- ✅ Enriches with assignee and creator info

#### New `listByRoom` query
- ✅ Returns tasks for room
- ✅ Respects limit parameter
- ✅ Excludes soft-deleted tasks
- ✅ Orders by creation date (descending)

#### New `search` query
- ✅ Searches tasks by title
- ✅ Searches tasks by description
- ✅ Case-insensitive search
- ✅ Returns matching tasks for event

#### Enhanced `update` mutation
- ✅ Handles status change to "completed"
- ✅ Sets completedAt timestamp
- ✅ Updates group completedCount when task completed

#### Enhanced `deleteTask` mutation
- ✅ Soft deletes task
- ✅ Updates group taskCount (decrement)

### Special Tests
- ✅ Task dependencies (dependsOn, blockedBy arrays)
- ✅ Group membership and count tracking
- ✅ AI enrichment structure
- ✅ Source message linking
- ✅ Cost estimation with confidence
- ✅ Status workflow with completion tracking

---

## 4. expenses.test.ts (Enhanced)

**File to test**: `web/convex/expenses.ts`
**Schema reference**: Lines 334-412 and 1205-1400 in phase0-convex-data-layer.md

### New Operations to Test (added in Phase 0)

#### Enhanced `create` mutation
- ✅ Creates expense with new required fields (currency)
- ✅ Handles new optional fields (roomId, taskId, vendorId)
- ✅ Stores enhanced split structure ({ type, participants })
- ✅ Stores AI metadata (categoryConfidence, suggestedBudgetImpact, extractedFrom)
- ✅ Links to source message (sourceMessageId)
- ✅ Updates event budget (spent, remaining)

#### Enhanced `listByEvent` query
- ✅ Filters by category
- ✅ Enriches with payer info
- ✅ Orders by paidAt date

#### New `getBudgetSummary` query
- ✅ Calculates total expenses
- ✅ Aggregates by category (total, count, expenses array)
- ✅ Returns event budget info
- ✅ Excludes soft-deleted expenses

#### Enhanced `update` mutation
- ✅ Updates expense fields
- ✅ Recalculates event budget if amount changes
- ✅ Handles split updates

#### Enhanced `deleteExpense` mutation
- ✅ Soft deletes expense
- ✅ Updates event budget (subtract amount from spent)

### Special Tests
- ✅ Event budget updates (create, update, delete)
- ✅ Budget recalculation accuracy
- ✅ Split structure (equal, custom, percentage types)
- ✅ Split participant tracking (userId, amount, paid)
- ✅ Category aggregation in budget summary
- ✅ Link to task, vendor, room
- ✅ AI metadata structure
- ✅ Receipt storage (receiptUrl, receiptStorageId)

---

## Acceptance Criteria

For each of the 4 test files:
- ✅ Test file created or enhanced with comprehensive coverage
- ✅ All CRUD operations tested
- ✅ All new Phase 0 features tested
- ✅ Edge cases covered
- ✅ Integration points verified (budget updates, group counts)
- ✅ 40-60 test cases per file
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 80% on each file

## Deliverables

4 complete test files:
1. `web/convex/decisions.test.ts` (~400-450 lines)
2. `web/convex/checkpoints.test.ts` (~300-350 lines)
3. `web/convex/tasks.test.ts` (~600-700 lines - comprehensive)
4. `web/convex/expenses.test.ts` (~600-700 lines - comprehensive)

Total: ~1900-2200 lines of comprehensive tests
