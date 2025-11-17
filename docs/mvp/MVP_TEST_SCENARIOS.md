# MVP Test Scenarios

**Component Specs:** `/docs/mvp/MVP_COMPONENT_SPECS.md`
**Code Patterns:** `/docs/mvp/MVP_CODE_PATTERNS.md`

---

## 1. Component Isolation Tests

### 1.1 TaskProposalCard

**Test:** Accept All Tasks
```typescript
describe("TaskProposalCard - Accept All", () => {
  it("creates all tasks when user accepts proposal", async () => {
    // Given: Proposal with 3 tasks
    const proposal = {
      proposalId: "prop_123",
      items: [
        { type: "task", data: { title: "Book photographer" } },
        { type: "task", data: { title: "Contact caterer" } },
        { type: "task", data: { title: "Hire DJ" } }
      ],
      expiresAt: Date.now() + 300000
    };

    // When: User clicks "Accept All"
    await userEvent.click(screen.getByText("Accept All"));

    // Then: api.proposals.confirm called
    expect(mockConfirm).toHaveBeenCalledWith({
      proposalId: "prop_123",
      action: "accept_all"
    });

    // And: 3 tasks created
    await waitFor(() => {
      expect(screen.getByText("✓ Created 3 tasks")).toBeInTheDocument();
    });
  });
});
```

**Test:** Edit Before Accepting
```typescript
it("allows editing tasks before acceptance", async () => {
  // When: Click "Edit"
  await userEvent.click(screen.getByText("Edit"));

  // Then: Edit mode active
  expect(screen.getByLabelText("Task 1 Title")).toBeEnabled();

  // When: Modify task 1
  await userEvent.clear(screen.getByLabelText("Task 1 Title"));
  await userEvent.type(screen.getByLabelText("Task 1 Title"), "Book wedding photographer");

  // When: Remove task 2
  await userEvent.click(screen.getAllByLabelText("Remove task")[1]);

  // When: Click "Save & Create"
  await userEvent.click(screen.getByText("Save & Create"));

  // Then: Only 2 tasks created
  expect(mockConfirm).toHaveBeenCalledWith({
    proposalId: "prop_123",
    action: "edit",
    editedItems: expect.arrayContaining([
      expect.objectContaining({ title: "Book wedding photographer" })
    ])
  });
});
```

**Test:** Proposal Expiration
```typescript
it("disables actions when proposal expires", () => {
  // Given: Expired proposal
  const expired = {
    ...proposal,
    expiresAt: Date.now() - 1000 // 1 second ago
  };

  render(<TaskProposalCard {...expired} />);

  // Then: Shows expired message
  expect(screen.getByText("This proposal has expired")).toBeInTheDocument();

  // And: All buttons disabled
  expect(screen.getByText("Accept All")).toBeDisabled();
});
```

### 1.2 InlinePoll

**Test:** Create Vote
```typescript
describe("InlinePoll - Voting", () => {
  it("submits vote and shows results", async () => {
    // Given: Poll with 3 options
    const poll = {
      pollId: "poll_123",
      question: "Caterer preference?",
      options: [
        { id: "opt1", text: "Option A" },
        { id: "opt2", text: "Option B" },
        { id: "opt3", text: "Option C" }
      ],
      allowMultipleChoices: false
    };

    render(<InlinePoll {...poll} />);

    // When: Select option B
    await userEvent.click(screen.getByLabelText("Option B"));

    // When: Click "Vote"
    await userEvent.click(screen.getByText("Vote"));

    // Then: Vote mutation called
    expect(mockVote).toHaveBeenCalledWith({
      pollId: "poll_123",
      optionIds: ["opt2"]
    });

    // And: Results shown
    await waitFor(() => {
      expect(screen.getByText("Your vote: Option B")).toBeInTheDocument();
    });
  });
});
```

**Test:** Real-time Updates
```typescript
it("updates vote counts in real-time", async () => {
  render(<InlinePoll {...poll} />);

  // Given: Initial state (0 votes)
  expect(screen.getByText("0 votes")).toBeInTheDocument();

  // When: Another user votes (simulated via Convex)
  act(() => {
    mockVotesQuery.mockReturnValue([
      { optionId: "opt1", userId: "user2" }
    ]);
  });

  // Then: Vote count updates
  await waitFor(() => {
    expect(screen.getByText("1 vote")).toBeInTheDocument();
  });
});
```

### 1.3 BudgetSummaryCard

**Test:** Display Budget Overview
```typescript
describe("BudgetSummaryCard - Display", () => {
  it("shows budget breakdown correctly", () => {
    // Given: Event with $10K budget, $3.5K spent
    const expenses = [
      { amount: 2000, category: "venue" },
      { amount: 1500, category: "catering" }
    ];
    const event = { budget: 10000 };

    mockExpenses.mockReturnValue(expenses);
    mockEvent.mockReturnValue(event);

    render(<BudgetSummaryCard eventId="evt_123" />);

    // Then: Shows correct totals
    expect(screen.getByText("$3,500")).toBeInTheDocument();
    expect(screen.getByText("/ $10,000")).toBeInTheDocument();

    // And: Progress bar at 35%
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "35");
  });
});
```

---

## 2. Master-Detail Integration Tests

### 2.1 TasksByVendor → ExpensesList

**Test:** Vendor Selection Filters Expenses
```typescript
describe("Master-Detail - Vendor Selection", () => {
  it("filters ExpensesList when vendor selected", async () => {
    // Given: Dashboard with TasksByVendor and ExpensesList
    const { store } = renderWithDashboardStore(
      <>
        <TasksByVendor eventId="evt_123" />
        <ExpensesList eventId="evt_123" />
      </>
    );

    // Given: 3 vendors, 6 expenses (2 per vendor)
    mockVendors.mockReturnValue([
      { _id: "v1", name: "Photographer" },
      { _id: "v2", name: "Caterer" },
      { _id: "v3", name: "DJ" }
    ]);
    mockExpenses.mockReturnValue([
      { _id: "e1", vendorId: "v1", amount: 500 },
      { _id: "e2", vendorId: "v1", amount: 2000 },
      { _id: "e3", vendorId: "v2", amount: 300 },
      { _id: "e4", vendorId: "v2", amount: 7500 },
      { _id: "e5", vendorId: "v3", amount: 1200 },
      { _id: "e6", vendorId: "v3", amount: 800 }
    ]);

    // When: Click "Photographer" in TasksByVendor
    await userEvent.click(screen.getByText("Photographer"));

    // Then: Zustand state updated
    expect(store.getState().selections.vendorId).toBe("v1");

    // And: ExpensesList shows only photographer expenses
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("$2,000")).toBeInTheDocument();
    expect(screen.queryByText("$300")).not.toBeInTheDocument(); // Caterer hidden
    expect(screen.queryByText("$7,500")).not.toBeInTheDocument();

    // And: ExpensesList is highlighted
    expect(screen.getByTestId("expenses-list")).toHaveClass("highlighted");
  });

  it("clears filter when vendor clicked again", async () => {
    // Given: Vendor selected
    await userEvent.click(screen.getByText("Photographer"));
    expect(store.getState().selections.vendorId).toBe("v1");

    // When: Click "Photographer" again
    await userEvent.click(screen.getByText("Photographer"));

    // Then: Selection cleared
    expect(store.getState().selections.vendorId).toBeNull();

    // And: ExpensesList shows all expenses
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.getByText("$1,200")).toBeInTheDocument();
  });
});
```

### 2.2 Multiple Detail Listeners

**Test:** Multiple Components React to Same Selection
```typescript
it("updates all detail components on selection", async () => {
  // Given: Dashboard with 1 master, 2 detail components
  renderWithDashboardStore(
    <>
      <TasksByVendor eventId="evt_123" />
      <ExpensesList eventId="evt_123" />
      <VendorTaskBoard eventId="evt_123" />
    </>
  );

  // When: Select vendor
  await userEvent.click(screen.getByText("Photographer"));

  // Then: Both detail components filter
  // ExpensesList
  expect(screen.getByTestId("expenses-list").querySelectorAll(".expense-item")).toHaveLength(2);

  // VendorTaskBoard
  expect(screen.getByTestId("vendor-task-board").querySelectorAll(".task-card")).toHaveLength(3);

  // And: Both are highlighted
  expect(screen.getByTestId("expenses-list")).toHaveClass("highlighted");
  expect(screen.getByTestId("vendor-task-board")).toHaveClass("highlighted");
});
```

---

## 3. AI Rendering End-to-End

### 3.1 Agent Generates Task Proposal

**Test:** Full Flow from User Message to Task Creation
```typescript
describe("E2E - Task Proposal Flow", () => {
  it("creates tasks from user message", async () => {
    // Given: User types message
    const user = userEvent.setup();
    render(<ChatRoom roomId="room_123" eventId="evt_123" />);

    // When: Type message
    await user.type(
      screen.getByPlaceholderText("Message"),
      "Create tasks for photographer, caterer, and DJ"
    );
    await user.keyboard("{Enter}");

    // Then: Message sent to agent worker
    await waitFor(() => {
      expect(mockAgentInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            content: "Create tasks for photographer, caterer, and DJ"
          })
        })
      );
    });

    // And: Agent returns proposal
    // (Simulated via mock)
    act(() => {
      mockMessages.mockReturnValue([
        ...existingMessages,
        {
          _id: "msg_456",
          authorType: "agent",
          content: "I found 3 tasks. Review and confirm:",
          aiMetadata: {
            structuredData: {
              type: "proposal",
              proposal: {
                proposalId: "prop_123",
                proposalType: "tasks",
                items: [
                  { type: "task", data: { title: "Book photographer" } },
                  { type: "task", data: { title: "Contact caterer" } },
                  { type: "task", data: { title: "Hire DJ" } }
                ]
              }
            }
          }
        }
      ]);
    });

    // Then: TaskProposalCard renders
    await waitFor(() => {
      expect(screen.getByText("3 tasks ready to create")).toBeInTheDocument();
    });

    // When: User accepts
    await user.click(screen.getByText("Accept All"));

    // Then: Confirmation mutation called
    expect(mockConfirm).toHaveBeenCalled();

    // And: Tasks created
    await waitFor(() => {
      expect(mockTasks).toHaveBeenCalled();
      expect(screen.getByText("✓ Created 3 tasks")).toBeInTheDocument();
    });
  });
});
```

### 3.2 Agent Generates Dashboard

**Test:** Dynamic Component Grid Rendering
```typescript
it("renders dashboard from agent config", async () => {
  // Given: Agent sends dashboard config
  const message = {
    _id: "msg_789",
    authorType: "agent",
    content: "Here's your task overview:",
    aiMetadata: {
      structuredData: {
        type: "dashboard",
        renderType: "component_grid",
        componentConfig: {
          sections: [{
            type: "grid",
            components: [
              { type: "TaskListCard", props: { eventId: "evt_123", limit: 5 } },
              { type: "BudgetSummaryCard", props: { eventId: "evt_123" } }
            ]
          }]
        }
      }
    }
  };

  // When: Message renders
  render(<FluidUIMessageRenderer message={message} />);

  // Then: Both components rendered
  expect(screen.getByTestId("task-list-card")).toBeInTheDocument();
  expect(screen.getByTestId("budget-summary-card")).toBeInTheDocument();

  // And: Each fetches data independently
  expect(mockTasksList).toHaveBeenCalledWith({ eventId: "evt_123" });
  expect(mockExpensesList).toHaveBeenCalledWith({ eventId: "evt_123" });
});
```

---

## 4. Real-time Convex Sync Tests

### 4.1 Multi-User Poll Voting

**Test:** User 1 Sees User 2's Vote
```typescript
describe("Real-time Sync - Polls", () => {
  it("updates poll results when another user votes", async () => {
    // Given: User 1 has poll open
    const { rerender } = render(<InlinePoll pollId="poll_123" />);

    // Initial state: 0 votes
    expect(screen.getByText("0 votes")).toBeInTheDocument();

    // When: User 2 votes (simulated via Convex subscription update)
    act(() => {
      mockPollVotes.mockReturnValue([
        { _id: "vote_1", optionId: "opt1", userId: "user2" }
      ]);
    });

    // Then: User 1 sees updated count
    await waitFor(() => {
      expect(screen.getByText("1 vote")).toBeInTheDocument();
    });

    // When: User 3 also votes
    act(() => {
      mockPollVotes.mockReturnValue([
        { _id: "vote_1", optionId: "opt1", userId: "user2" },
        { _id: "vote_2", optionId: "opt1", userId: "user3" }
      ]);
    });

    // Then: Count updates again
    await waitFor(() => {
      expect(screen.getByText("2 votes")).toBeInTheDocument();
    });
  });
});
```

### 4.2 Task Creation Sync

**Test:** TaskListCard Updates When Task Created
```typescript
it("adds new task to list when created elsewhere", async () => {
  // Given: TaskListCard with 5 tasks
  mockTasks.mockReturnValue([
    { _id: "t1", title: "Task 1" },
    { _id: "t2", title: "Task 2" },
    { _id: "t3", title: "Task 3" },
    { _id: "t4", title: "Task 4" },
    { _id: "t5", title: "Task 5" }
  ]);

  render(<TaskListCard eventId="evt_123" />);

  expect(screen.getAllByTestId("task-item")).toHaveLength(5);

  // When: New task created (simulated via Convex)
  act(() => {
    mockTasks.mockReturnValue([
      ...mockTasks(),
      { _id: "t6", title: "New Task" }
    ]);
  });

  // Then: TaskListCard updates
  await waitFor(() => {
    expect(screen.getAllByTestId("task-item")).toHaveLength(6);
    expect(screen.getByText("New Task")).toBeInTheDocument();
  });
});
```

---

## 5. Error Scenario Tests

### 5.1 Proposal Confirmation Failure

**Test:** Handle Network Error on Confirm
```typescript
it("shows error when confirmation fails", async () => {
  // Given: Proposal ready
  render(<TaskProposalCard {...proposal} />);

  // When: Accept All clicked but mutation fails
  mockConfirm.mockRejectedValueOnce(new Error("Network error"));
  await userEvent.click(screen.getByText("Accept All"));

  // Then: Error toast shown
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to accept proposal");
  });

  // And: Proposal still active (not marked as accepted)
  expect(screen.getByText("Accept All")).toBeEnabled();
});
```

### 5.2 Convex Query Loading States

**Test:** Show Loading Spinner
```typescript
it("shows loading state while fetching data", () => {
  // Given: Query pending
  mockTasks.mockReturnValue(undefined); // Convex query pending

  render(<TaskListCard eventId="evt_123" />);

  // Then: Loading spinner shown
  expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
});
```

**Test:** Show Empty State
```typescript
it("shows empty state when no tasks exist", () => {
  // Given: Query returns empty array
  mockTasks.mockReturnValue([]);

  render(<TaskListCard eventId="evt_123" />);

  // Then: Empty state shown
  expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  expect(screen.getByText("Create your first task to get started")).toBeInTheDocument();
});
```

---

## Test Coverage Goals

| Category | Target | Measurement |
|----------|--------|-------------|
| Component Unit Tests | 80%+ | Lines covered |
| Integration Tests | All master-detail patterns | Scenarios passing |
| E2E Tests | All MVP user flows | Playwright tests |
| Accessibility | 0 violations | axe-core audit |
| Performance | Lighthouse > 90 | Chrome DevTools |

---

## References

- Component implementations: `/web/src/components/fluid-ui/cards/`
- Convex queries: `/web/convex/`
- Zustand store: `/web/src/lib/fluid-ui/store.ts`
- Code patterns: `/docs/mvp/MVP_CODE_PATTERNS.md`
