# Track 7: Integration Tests

## Objective
Create comprehensive integration tests that verify cross-entity relationships and complex workflows across multiple CRUD modules.

## Context
- **Test file to create**: `web/convex/integration.test.ts`
- **Testing framework**: Vitest with convex-test
- **Pattern reference**: `web/convex/authHelpers.test.ts`
- **Dependencies**: All CRUD modules and factories from previous tracks

## Background
Integration tests verify that:
1. Related entities update correctly when linked entities change
2. Cascading operations work as expected
3. Complex workflows execute properly across multiple tables
4. Business logic constraints are enforced across entities

---

## Integration Test Categories

### 1. Task & Task Group Integration

#### Test: Task Creation Updates Group Count
**Scenario**: When a task is created with a groupId, the group's taskCount should increment

```typescript
describe("Task & Task Group Integration", () => {
  it("should increment group taskCount when task is created", async () => {
    const t = convexTest(schema);

    // Create event, room, user
    const { eventId, roomId, userId } = await createTestScenario(t);

    // Create task group
    const groupId = await t.mutation(api.taskGroups.create, {
      name: "Venue Tasks",
      eventId,
      createdBy: userId,
    });

    // Verify initial count
    let group = await t.query(api.taskGroups.get, { groupId });
    expect(group?.taskCount).toBe(0);

    // Create task in group
    await t.mutation(api.tasks.create, {
      title: "Book venue",
      eventId,
      roomId,
      groupId,
      createdBy: userId,
      category: "venue",
    });

    // Verify count incremented
    group = await t.query(api.taskGroups.get, { groupId });
    expect(group?.taskCount).toBe(1);
  });

  it("should increment group completedCount when task is completed", async () => {
    // Create task in group with status "todo"
    // Update task status to "completed"
    // Verify group.completedCount incremented
  });

  it("should decrement group taskCount when task is deleted", async () => {
    // Create task in group
    // Delete task
    // Verify group.taskCount decremented
  });

  it("should orphan tasks when group is deleted", async () => {
    // Create group with multiple tasks
    // Delete group
    // Verify all tasks have groupId set to undefined
    // Verify tasks are not deleted (soft delete)
  });
});
```

---

### 2. Expense & Event Budget Integration

#### Test: Expense Creation Updates Event Budget
**Scenario**: When an expense is created, event budget (spent, remaining) should update

```typescript
describe("Expense & Event Budget Integration", () => {
  it("should update event budget when expense is created", async () => {
    const t = convexTest(schema);

    // Create event with budget
    const eventId = await t.run(async (ctx) => {
      return await ctx.db.insert("events", {
        name: "Test Event",
        budget: {
          total: 10000,
          currency: "USD",
          spent: 0,
          remaining: 10000,
          committed: 0,
        },
        // ... other required fields
      });
    });

    // Create expense
    await t.mutation(api.expenses.create, {
      description: "Venue deposit",
      amount: 2000,
      currency: "USD",
      eventId,
      category: "venue",
      paidBy: userId,
    });

    // Verify budget updated
    const event = await t.run(async (ctx) => {
      return await ctx.db.get(eventId);
    });

    expect(event?.budget.spent).toBe(2000);
    expect(event?.budget.remaining).toBe(8000);
  });

  it("should update event budget when expense amount is changed", async () => {
    // Create expense with amount 2000
    // Update expense amount to 3000
    // Verify budget.spent increased by 1000
    // Verify budget.remaining decreased by 1000
  });

  it("should update event budget when expense is deleted", async () => {
    // Create expense with amount 2000
    // Delete expense
    // Verify budget.spent decreased by 2000
    // Verify budget.remaining increased by 2000
  });

  it("should aggregate expenses correctly in budget summary", async () => {
    // Create multiple expenses in different categories
    // Query getBudgetSummary
    // Verify totals by category match
    // Verify overall total matches
  });
});
```

---

### 3. Guest & Event Guest Count Integration

#### Test: Guest Operations Update Event Guest Count
**Scenario**: Guest CRUD operations should update event.guestCount

```typescript
describe("Guest & Event Guest Count Integration", () => {
  it("should increment event guestCount.expected when guest is created", async () => {
    const t = convexTest(schema);

    // Create event with guestCount
    const eventId = await t.run(async (ctx) => {
      return await ctx.db.insert("events", {
        name: "Test Event",
        guestCount: { confirmed: 0, expected: 0 },
        // ... other required fields
      });
    });

    // Create guest
    await t.mutation(api.guests.create, {
      firstName: "John",
      lastName: "Doe",
      eventId,
      invitedBy: userId,
      guestType: "family",
      plusOneAllowed: false,
    });

    // Verify guestCount.expected incremented
    const event = await t.run(async (ctx) => {
      return await ctx.db.get(eventId);
    });

    expect(event?.guestCount?.expected).toBe(1);
  });

  it("should decrement event guestCount.expected when guest is deleted", async () => {
    // Create guest (guestCount.expected = 1)
    // Delete guest
    // Verify guestCount.expected decremented to 0
  });

  it("should calculate RSVP summary correctly", async () => {
    // Create multiple guests with different RSVP statuses
    // Query getRsvpSummary
    // Verify counts by status match
    // Verify dietary restrictions aggregation
  });
});
```

---

### 4. Payment Schedule & Expense Linking

#### Test: Payment Schedule to Expense Workflow
**Scenario**: Payment schedule should link to expense when marked paid

```typescript
describe("Payment Schedule & Expense Integration", () => {
  it("should link payment schedule to expense when marked paid", async () => {
    const t = convexTest(schema);

    // Create payment schedule
    const scheduleId = await t.mutation(api.paymentSchedules.create, {
      eventId,
      description: "Venue final payment",
      amount: 5000,
      currency: "USD",
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      createdBy: userId,
    });

    // Create expense
    const expenseId = await t.mutation(api.expenses.create, {
      description: "Venue final payment",
      amount: 5000,
      currency: "USD",
      eventId,
      category: "venue",
      paidBy: userId,
    });

    // Mark payment as paid with expense link
    await t.mutation(api.paymentSchedules.markPaid, {
      scheduleId,
      expenseId,
    });

    // Verify link created
    const schedule = await t.query(api.paymentSchedules.get, { scheduleId });
    expect(schedule?.expenseId).toBe(expenseId);
    expect(schedule?.status).toBe("paid");
  });

  it("should auto-calculate payment status based on due date", async () => {
    // Create payment with dueDate in past → status "overdue"
    // Create payment with dueDate in 3 days → status "due_soon"
    // Create payment with dueDate in 30 days → status "upcoming"
  });
});
```

---

### 5. Vendor Linking Across Modules

#### Test: Vendor Relationships
**Scenario**: Vendors can be linked to expenses, payment schedules, and timeline events

```typescript
describe("Vendor Linking Integration", () => {
  it("should link vendor to expense", async () => {
    const t = convexTest(schema);

    // Create vendor
    const vendorId = await t.mutation(api.vendors.create, {
      name: "Best Catering Co",
      category: "catering",
      eventId,
      addedBy: userId,
    });

    // Create expense with vendor link
    const expenseId = await t.mutation(api.expenses.create, {
      description: "Catering deposit",
      amount: 3000,
      currency: "USD",
      eventId,
      vendorId,
      category: "catering",
      paidBy: userId,
    });

    // Verify link
    const expense = await t.query(api.expenses.get, { expenseId });
    expect(expense?.vendorId).toBe(vendorId);
  });

  it("should link vendor to payment schedule", async () => {
    // Create vendor
    // Create payment schedule with vendorId
    // Verify link and vendor enrichment in listByEvent
  });

  it("should link vendors to timeline events", async () => {
    // Create vendor
    // Create timeline event with vendorsInvolved array
    // Verify vendor appears in timeline event
  });
});
```

---

### 6. Task Dependencies Workflow

#### Test: Task Dependency Graph
**Scenario**: Tasks can depend on other tasks (dependsOn, blockedBy)

```typescript
describe("Task Dependencies Integration", () => {
  it("should handle task dependencies correctly", async () => {
    const t = convexTest(schema);

    // Create Task A (no dependencies)
    const taskAId = await t.mutation(api.tasks.create, {
      title: "Book venue",
      eventId,
      roomId,
      createdBy: userId,
      category: "venue",
    });

    // Create Task B (depends on Task A)
    const taskBId = await t.mutation(api.tasks.create, {
      title: "Send venue details to caterer",
      eventId,
      roomId,
      createdBy: userId,
      category: "catering",
      dependsOn: [taskAId],
      blockedBy: [taskAId],
    });

    // Get Task B dependencies
    const deps = await t.query(api.agentContext.getTaskDependencies, {
      taskId: taskBId,
    });

    expect(deps?.dependencies).toHaveLength(1);
    expect(deps?.blockers).toHaveLength(1);
    expect(deps?.canStart).toBe(false); // Task A not completed

    // Complete Task A
    await t.mutation(api.tasks.update, {
      taskId: taskAId,
      status: "completed",
    });

    // Verify Task B can now start
    const depsAfter = await t.query(api.agentContext.getTaskDependencies, {
      taskId: taskBId,
    });
    expect(depsAfter?.canStart).toBe(true);
  });

  it("should find reverse dependencies (dependent tasks)", async () => {
    // Create Task A
    // Create Task B that depends on Task A
    // Query dependencies for Task A
    // Verify dependentTasks includes Task B
  });
});
```

---

### 7. Milestone & Task Blocking

#### Test: Milestones Block Tasks
**Scenario**: Milestones can block tasks until completed

```typescript
describe("Milestone & Task Integration", () => {
  it("should track milestone blocking relationships", async () => {
    const t = convexTest(schema);

    // Create milestone
    const milestoneId = await t.mutation(api.milestones.create, {
      name: "Venue Booked",
      eventId,
      category: "venue",
      targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      criticality: "critical",
      createdBy: userId,
    });

    // Create task
    const taskId = await t.mutation(api.tasks.create, {
      title: "Order decorations",
      eventId,
      roomId,
      createdBy: userId,
      category: "decor",
    });

    // Update milestone to block task
    await t.mutation(api.milestones.update, {
      milestoneId,
      blocksTasks: [taskId],
    });

    // Verify relationship
    const milestone = await t.query(api.milestones.get, { milestoneId });
    expect(milestone?.blocksTasks).toContain(taskId);
  });

  it("should filter critical path correctly", async () => {
    // Create multiple milestones with different criticality
    // Query getCriticalPath
    // Verify only critical milestones returned
  });
});
```

---

### 8. Source Message Tracking

#### Test: Entities Link to Source Messages
**Scenario**: Tasks, expenses, and vendors can track which message created them

```typescript
describe("Source Message Tracking Integration", () => {
  it("should link task to source message", async () => {
    const t = convexTest(schema);

    // Create message
    const messageId = await t.run(async (ctx) => {
      return await ctx.db.insert("messages", {
        content: "We need to book the venue ASAP",
        roomId,
        authorId: userId,
        createdAt: Date.now(),
      });
    });

    // Create task from message
    const taskId = await t.mutation(api.tasks.create, {
      title: "Book venue",
      eventId,
      roomId,
      createdBy: userId,
      category: "venue",
      sourceMessageId: messageId,
    });

    // Verify link
    const task = await t.query(api.tasks.get, { taskId });
    expect(task?.sourceMessageId).toBe(messageId);
  });

  it("should link expense to source message", async () => {
    // Similar test for expense
  });

  it("should link vendor to source message", async () => {
    // Similar test for vendor
  });
});
```

---

### 9. Complete Event Context Assembly

#### Test: Agent Context Assembles Complete Picture
**Scenario**: getEventContext should return all related entities with accurate statistics

```typescript
describe("Complete Event Context Integration", () => {
  it("should assemble complete event context with all entities", async () => {
    const t = convexTest(schema);

    // Create comprehensive test scenario
    const { eventId, roomId, userId } = await createCompleteTestScenario(t, {
      tasks: 10,
      expenses: 5,
      vendors: 3,
      guests: 20,
      paymentSchedules: 4,
      milestones: 5,
    });

    // Query event context
    const context = await t.query(api.agentContext.getEventContext, {
      eventId,
    });

    // Verify all entities present
    expect(context?.tasks).toHaveLength(10);
    expect(context?.expenses).toHaveLength(5);
    expect(context?.vendors).toHaveLength(3);
    expect(context?.guests).toHaveLength(20);
    expect(context?.paymentSchedules).toHaveLength(4);
    expect(context?.milestones).toHaveLength(5);

    // Verify statistics
    expect(context?.stats.tasks.total).toBe(10);
    expect(context?.stats.vendors.total).toBe(3);
    expect(context?.stats.guests.total).toBe(20);
    expect(context?.stats.milestones.total).toBe(5);
  });
});
```

---

## Test Helper Functions

Create reusable test scenario builders:

```typescript
async function createTestScenario(t: ConvexTest) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", factories.user());
  });

  const eventId = await t.run(async (ctx) => {
    return await ctx.db.insert("events", factories.event({
      coordinatorId: userId,
    }));
  });

  const roomId = await t.run(async (ctx) => {
    return await ctx.db.insert("rooms", factories.room({
      eventId,
    }));
  });

  return { userId, eventId, roomId };
}

async function createCompleteTestScenario(
  t: ConvexTest,
  counts: {
    tasks: number;
    expenses: number;
    vendors: number;
    guests: number;
    paymentSchedules: number;
    milestones: number;
  }
) {
  const { userId, eventId, roomId } = await createTestScenario(t);

  // Create specified number of each entity
  // ...

  return { userId, eventId, roomId };
}
```

---

## Acceptance Criteria

- ✅ Integration test file created: `web/convex/integration.test.ts`
- ✅ All 9 integration categories tested
- ✅ Cross-entity relationships verified (task-group, expense-budget, guest-event)
- ✅ Cascading operations tested (group deletion, budget updates)
- ✅ Complex workflows tested (payment → expense linking, task dependencies)
- ✅ Test helper functions created for reusable scenarios
- ✅ 40-50 integration test cases
- ✅ All tests passing
- ✅ No TypeScript errors

---

## Deliverable

Complete integration test file `web/convex/integration.test.ts` with:
- ~800-1000 lines of comprehensive integration tests
- 9 describe blocks (one per integration category)
- 40-50 test cases covering all cross-entity relationships
- Reusable test helper functions
- All tests passing
