# Database Object to Component Matrix

**Schema Reference:** `/web/convex/schema.ts`
**Component Specs:** `/docs/mvp/MVP_COMPONENT_SPECS.md`

---

## Component Status Legend

- ✅ **Functional** - Fully implemented and tested
- 🚧 **Partial** - Exists but needs Zustand integration or polish
- 🔨 **Placeholder** - Stub file exists, needs implementation
- ❌ **Missing** - Not yet created
- 🔮 **Future** - Post-MVP, not blocking

---

## 1. Tasks

**Schema:** `defineTable({ title, description, status, priority, dueDate, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| TaskProposalCard | Proposal | ✅ | `/cards/TaskProposalCard.tsx` | `proposals.confirm` |
| TaskListCard | Display | ✅ | `/cards/TaskListCard.tsx` | `tasks.list` |
| TasksList | Display | ✅ | `/dashboard/TasksList.tsx` | `tasks.listByEvent` |
| TasksByPhase | Master | ✅ | `/dashboard/TasksByPhase.tsx` | `tasks.listByEvent` |
| TasksByVendor | Master | ✅ | `/dashboard/TasksByVendor.tsx` | `tasks.listByEvent` |
| TasksKanban | Display | 🚧 | `/dashboard/TasksKanban.tsx` | `tasks.listByEvent` |
| TaskGanttChart | Display | 🚧 | `/dashboard/TaskGanttChart.tsx` | `tasks.listByEvent` |
| TaskDetails | Detail | ✅ | `/dashboard/TaskDetails.tsx` | `tasks.getById` |
| TaskEditor | Form | ✅ | `/dashboard/TaskEditor.tsx` | `tasks.patch` |
| TaskCreator | Form | ✅ | `/dashboard/TaskCreator.tsx` | `tasks.create` |
| TaskProgressBar | Viz | 🔮 | - | `tasks.listByEvent` |

**MVP Needs:**
- ✅ Proposal (TaskProposalCard)
- ✅ Display (TaskListCard, TasksList)
- 🚧 Fix Zustand in TasksKanban, TaskGanttChart

---

## 2. Expenses

**Schema:** `defineTable({ amount, category, paidBy, paidTo, date, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| BudgetProposalCard | Proposal | ✅ | `/cards/BudgetProposalCard.tsx` | `proposals.confirm` |
| BudgetSummaryCard | Display | ✅ | `/cards/BudgetSummaryCard.tsx` | `expenses.listByEvent` |
| ExpensesList | Detail | ✅ | `/dashboard/ExpensesList.tsx` | `expenses.listByEvent` |
| ExpensesSummary | Master | 🚧 | `/dashboard/ExpensesSummary.tsx` | `expenses.listByEvent` |
| ExpenseDetails | Detail | 🔮 | - | `expenses.getById` |
| ExpenseCreator | Form | 🔮 | - | `expenses.create` |
| BudgetPieChart | Viz | 🔮 | - | `expenses.listByEvent` |
| BudgetEditor | Form | 🔮 | - | `events.patch` |

**MVP Needs:**
- ✅ Proposal (BudgetProposalCard)
- ✅ Display (BudgetSummaryCard, ExpensesList)
- 🚧 Fix Zustand in ExpensesSummary

---

## 3. Vendors

**Schema:** `defineTable({ name, category, contact, rating, status, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| VendorProposalCard | Proposal | ✅ | `/cards/VendorProposalCard.tsx` | `proposals.confirm` |
| VendorCard | Display | ✅ | `/cards/VendorCard.tsx` | `vendors.getById` |
| VendorsList | Display | 🔨 | `/cards/VendorsList.tsx` | `vendors.listByEvent` |
| VendorDetails | Detail | 🔨 | `/dashboard/VendorDetails.tsx` | `vendors.getById` |
| VendorTaskBoard | Detail | 🚧 | `/dashboard/VendorTaskBoard.tsx` | `tasks.listByEvent` |
| VendorSelector | Form | 🔮 | - | `vendors.listByEvent` |
| VendorSpendingChart | Viz | 🔮 | - | `expenses.listByEvent` |

**MVP Needs:**
- ✅ Proposal (VendorProposalCard)
- ✅ Display (VendorCard)
- ❌ **BLOCKER:** VendorsList needs implementation

---

## 4. Polls

**Schema:** `defineTable({ question, options, allowMultipleChoices, deadline, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| InlinePoll | Interactive | ❌ | - | `polls.getById`, `pollVotes.create` |
| PollsList | Display | ✅ | `/dashboard/PollsList.tsx` | `polls.listByEvent` |
| PollResults | Display | ✅ | `/dashboard/PollResults.tsx` | `pollVotes.listByPoll` |

**MVP Needs:**
- ❌ **CRITICAL BLOCKER:** InlinePoll missing

---

## 5. Proposals

**Schema:** `defineTable({ proposalType, items, status, expiresAt, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| TaskProposalCard | Proposal | ✅ | `/cards/TaskProposalCard.tsx` | `proposals.confirm` |
| BudgetProposalCard | Proposal | ✅ | `/cards/BudgetProposalCard.tsx` | `proposals.confirm` |
| VendorProposalCard | Proposal | ✅ | `/cards/VendorProposalCard.tsx` | `proposals.confirm` |

**MVP Status:**
- ✅ All proposal types implemented

---

## 6. Messages

**Schema:** `defineTable({ content, authorType, aiMetadata, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| FluidUIMessageRenderer | Renderer | 🚧 | `/messages/FluidUIMessageRenderer.tsx` | - |
| RoomActivity | Display | ✅ | `/dashboard/RoomActivity.tsx` | `messages.listByRoom` |

**MVP Needs:**
- 🚧 Extend FluidUIMessageRenderer for all render types

---

## 7. Milestones

**Schema:** `defineTable({ title, phase, targetDate, status, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| MilestoneTimeline | Master | ✅ | `/dashboard/MilestoneTimeline.tsx` | `milestones.listByEvent` |
| MilestoneTracker | Display | ✅ | `/dashboard/MilestoneTracker.tsx` | `milestones.listByEvent` |
| PhaseProgress | Display | ✅ | `/dashboard/PhaseProgress.tsx` | `milestones.listByEvent` |
| PhaseNavigator | Nav | 🔮 | - | `milestones.listByEvent` |

**MVP Status:**
- ✅ Display components exist

---

## 8. Guests

**Schema:** `defineTable({ name, email, status, dietaryRestrictions, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| GuestList | Display | 🔨 | `/dashboard/GuestList.tsx` | `guests.listByEvent` |
| GuestRSVPChart | Viz | 🔮 | - | `guests.listByEvent` |
| GuestInviteForm | Form | 🔮 | - | `guests.create` |
| RSVPStatus | Display | 🔨 | - | `guests.listByEvent` |

**MVP Status:**
- 🔮 Low priority, post-MVP

---

## 9. Inventory (NEW for MVP)

**Schema:** `defineTable({ name, category, quantity, source, cost, ... })` - **Needs to be added**

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| InventoryCard | Display | ❌ | - | `inventory.listByEvent` |
| InventoryList | Display | 🔮 | - | `inventory.listByEvent` |

**MVP Needs:**
- ❌ **BLOCKER:** Add inventory table to schema
- ❌ **BLOCKER:** Implement InventoryCard

---

## 10. Events

**Schema:** `defineTable({ name, date, location, budget, guestCount, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| EventDetails | Display | ✅ | `/dashboard/EventDetails.tsx` | `events.getById` |
| KPIDashboard | Display | ❌ | - | `events.getById` + aggregations |
| ProgressSummary | Display | ❌ | - | `tasks.listByEvent` + `milestones.listByEvent` |

**MVP Needs:**
- ❌ **BLOCKER:** KPIDashboard
- ❌ **BLOCKER:** ProgressSummary

---

## 11. Payment Schedules

**Schema:** `defineTable({ amount, dueDate, vendorId, status, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| UpcomingPayments | Display | ✅ | `/dashboard/UpcomingPayments.tsx` | `paymentSchedules.listByEvent` |

**MVP Status:**
- ✅ Complete

---

## 12. Timeline Events

**Schema:** `defineTable({ time, activity, status, ... })`

| Component | Type | Status | File | Convex Query |
|-----------|------|--------|------|--------------|
| RunOfShowTimeline | Display | ✅ | `/dashboard/RunOfShowTimeline.tsx` | `timelineEvents.listByEvent` |
| DayOfChecklist | Display | ✅ | `/dashboard/DayOfChecklist.tsx` | `timelineEvents.listByEvent` |
| DeadlineCalendar | Display | ✅ | `/dashboard/DeadlineCalendar.tsx` | `tasks.listByEvent` |
| CalendarView | Display | ✅ | `/dashboard/CalendarView.tsx` | Multiple |

**MVP Status:**
- ✅ Complete

---

## MVP Blockers Summary

### Critical (P0) - Blocks Launch

| Component | DB Object | Reason | Effort |
|-----------|-----------|--------|--------|
| **InlinePoll** | polls | AI can't create polls | 4h |

### High Priority (P1) - Core Features

| Component | DB Object | Reason | Effort |
|-----------|-----------|--------|--------|
| **VendorsList** | vendors | Can't display vendor search results | 2h |
| **InventoryCard** | inventory | Can't manage inventory items | 3h |
| **KPIDashboard** | events | No high-level event overview | 4h |
| **ProgressSummary** | events/tasks | No completion tracking | 2h |

### Medium Priority (P2) - Polish

| Component | DB Object | Reason | Effort |
|-----------|-----------|--------|--------|
| TasksKanban Zustand | tasks | Master-detail incomplete | 1h |
| TaskGanttChart Zustand | tasks | Master-detail incomplete | 1h |
| VendorTaskBoard Zustand | vendors/tasks | Master-detail incomplete | 1h |
| ExpensesSummary Zustand | expenses | Master-detail incomplete | 1h |

**Total Critical Path: 15 hours**
**Total with Polish: 19 hours**

---

## Component Categories

### Data Display (Read-only)
- TaskListCard, TasksList, BudgetSummaryCard, ExpensesList, VendorCard, PollResults, etc.
- **Pattern:** `useQuery` + render data

### Master Components (Emit Selections)
- TasksByPhase, TasksByVendor, ExpensesSummary (partial)
- **Pattern:** `useQuery` + `select()` on click

### Detail Components (Read Selections)
- ExpensesList, VendorTaskBoard (partial)
- **Pattern:** `useQuery` + filter by `selections.*`

### Interactive Components (User Input)
- InlinePoll (missing), QuickActions (missing), ConfirmationPrompt (missing)
- **Pattern:** `useMutation` + state management

### Proposal Components (Batch Confirmation)
- TaskProposalCard, BudgetProposalCard, VendorProposalCard
- **Pattern:** `useMutation(api.proposals.confirm)`

### Form Components (CRUD)
- TaskCreator, TaskEditor
- **Pattern:** `useMutation(api.*.create|patch)`

---

## Convex Query Reference

**Common Patterns:**

```typescript
// List by event
api.tasks.listByEvent: (eventId, filter?, limit?) => Task[]
api.expenses.listByEvent: (eventId) => Expense[]
api.vendors.listByEvent: (eventId, category?) => Vendor[]
api.polls.listByEvent: (eventId) => Poll[]

// Get by ID
api.tasks.getById: (taskId) => Task | null
api.vendors.getById: (vendorId) => Vendor | null
api.events.getById: (eventId) => Event | null

// Proposals
api.proposals.confirm: (proposalId, action, editedItems?) => Result

// Mutations
api.tasks.create: (data) => Id<"tasks">
api.tasks.patch: (id, updates) => void
api.tasks.remove: (id) => void
```

---

## Next Steps

1. **Week 1:** Implement 5 MVP blockers (15h)
2. **Week 2:** Fix Zustand integration in partial components (4h)
3. **Week 3:** Polish + testing (8h)

**Total MVP Timeline: 3 weeks**

---

## References

- Schema: `/web/convex/schema.ts`
- Existing components: `/web/src/components/fluid-ui/cards/`, `/web/src/components/dashboard/`
- Component specs: `/docs/mvp/MVP_COMPONENT_SPECS.md`
- Full plan: `/docs/FLUID_UI_INTEGRATION_PLAN.md`
