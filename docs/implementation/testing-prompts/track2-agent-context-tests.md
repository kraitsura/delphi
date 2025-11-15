# Track 2: Agent Context Tests (HIGH PRIORITY - BLOCKING PHASE 2)

## Objective
Create comprehensive tests for `web/convex/agentContext.ts` - the critical queries that power the multi-agent system.

## Context
- **File to test**: `web/convex/agentContext.ts`
- **Test file to create**: `web/convex/agentContext.test.ts`
- **Testing framework**: Vitest with convex-test
- **Pattern reference**: `web/convex/authHelpers.test.ts` (1123 lines of examples)
- **Schema**: `web/convex/schema.ts`

## Background
These queries are CRITICAL for Phase 2 multi-agent system. They must:
1. Return complete event context in < 200ms
2. Handle edge cases gracefully (missing data, large datasets)
3. Calculate statistics accurately across all entities

## Queries to Test

### 1. `getEventContext(eventId)`
**Purpose**: Fetch complete event snapshot for AI agents

**Test Cases to Write:**

#### Basic Functionality
- ✅ Returns complete event data with all fields
- ✅ Returns null if event doesn't exist
- ✅ Fetches all related entities (tasks, expenses, vendors, guests, payments, milestones)
- ✅ Excludes soft-deleted entities (deletedAt !== undefined)

#### Statistics Calculation
- ✅ Calculates task stats correctly (total, completed, by_status, by_priority)
- ✅ Calculates budget stats correctly (total spent, by category)
- ✅ Calculates vendor stats correctly (by status)
- ✅ Calculates guest stats correctly (total, by RSVP status)
- ✅ Calculates milestone stats correctly (total, by status, by criticality)
- ✅ Calculates daysUntilEvent correctly (handles optional eventDate)

#### Edge Cases
- ✅ Handles empty event (no tasks, expenses, vendors, etc.)
- ✅ Handles partial data (some entities present, others empty)
- ✅ Handles large dataset (100+ tasks, 50+ guests, 30+ expenses)
- ✅ Handles missing eventDate (daysUntilEvent should be null)

#### Performance
- ✅ Query completes in < 200ms (measure with Date.now())
- ✅ Test with realistic dataset size
- ✅ Uses proper indexes (verify no full table scans)

### 2. `getRoomContext(roomId, limit?)`
**Purpose**: Fetch recent messages with author enrichment

**Test Cases to Write:**

#### Basic Functionality
- ✅ Returns messages for room
- ✅ Returns empty array if room has no messages
- ✅ Returns null if room doesn't exist
- ✅ Respects limit parameter (default 10)

#### Message Enrichment
- ✅ Enriches messages with author info (user profile)
- ✅ Handles agent messages (authorId = "agent") gracefully
- ✅ Handles deleted users gracefully

#### Ordering & Filtering
- ✅ Returns messages in chronological order (oldest first)
- ✅ Custom limit works (test with 5, 20, 50)
- ✅ Handles very large message history (1000+ messages)

### 3. `getTaskDependencies(taskId)`
**Purpose**: Analyze task dependency graph

**Test Cases to Write:**

#### Basic Functionality
- ✅ Returns task with dependencies and blockers
- ✅ Returns null if task doesn't exist
- ✅ Returns empty arrays if no dependencies/blockers

#### Dependency Resolution
- ✅ Fetches all tasks in `dependsOn` array
- ✅ Fetches all tasks in `blockedBy` array
- ✅ Finds reverse dependencies (tasks that depend on this one)

#### canStart Calculation
- ✅ Returns `canStart: true` if all blockers are completed
- ✅ Returns `canStart: false` if any blocker is not completed
- ✅ Returns `canStart: true` if no blockers exist
- ✅ Handles missing blocker tasks gracefully

#### Edge Cases
- ✅ Handles circular dependencies (A depends on B, B depends on A)
- ✅ Handles deep dependency chains (A → B → C → D)
- ✅ Handles tasks that are both dependencies and blockers

## Test Structure Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("agentContext", () => {
  describe("getEventContext", () => {
    it("should return complete event snapshot", async () => {
      const t = convexTest(schema);

      // Create test event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event",
          // ... all required fields
        });
      });

      // Create related entities (tasks, expenses, vendors)
      // ...

      // Query event context
      const context = await t.query(api.agentContext.getEventContext, {
        eventId,
      });

      // Assertions
      expect(context).toBeDefined();
      expect(context?.event.name).toBe("Test Event");
      expect(context?.tasks).toHaveLength(expectedCount);
      expect(context?.stats.tasks.total).toBe(expectedCount);
      // ... more assertions
    });

    it("should complete in < 200ms", async () => {
      const t = convexTest(schema);
      // Create realistic dataset
      // ...

      const start = Date.now();
      await t.query(api.agentContext.getEventContext, { eventId });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe("getRoomContext", () => {
    // ... tests
  });

  describe("getTaskDependencies", () => {
    // ... tests
  });
});
```

## Test Data Setup

Use factories from Track 1:
```typescript
import { factories } from "../src/test/factories";

// Create complete test scenario
const userId = await t.run(async (ctx) => {
  return await ctx.db.insert("users", factories.user());
});

const eventId = await t.run(async (ctx) => {
  return await ctx.db.insert("events", factories.event({ coordinatorId: userId }));
});

// Create related entities
const taskIds = await Promise.all([
  t.run(async (ctx) => ctx.db.insert("tasks", factories.task({ eventId, roomId }))),
  // ... more tasks
]);
```

## Performance Benchmarking

Include performance tests:
```typescript
describe("Performance Benchmarks", () => {
  it("getEventContext with 100 tasks should be < 200ms", async () => {
    // Create 100 tasks, 50 expenses, 20 vendors, 50 guests
    const start = Date.now();
    const context = await t.query(api.agentContext.getEventContext, { eventId });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
    console.log(`getEventContext took ${duration}ms`);
  });
});
```

## Acceptance Criteria

- ✅ `web/convex/agentContext.test.ts` created with all 3 query test suites
- ✅ All basic functionality tests pass
- ✅ All edge case tests pass
- ✅ Performance benchmarks meet targets (< 200ms for getEventContext)
- ✅ Statistics calculations verified accurate
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 90% on agentContext.ts

## Deliverable

Complete test file `web/convex/agentContext.test.ts` with:
- 3 describe blocks (one per query)
- 30-40 total test cases
- Performance benchmarks
- Edge case coverage
- All tests passing
