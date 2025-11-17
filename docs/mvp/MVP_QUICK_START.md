# MVP Quick Start Guide

**Last Updated:** November 16, 2025
**Status:** 70% Complete → MVP Ready in 3 weeks

---

## Documents Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **MVP_COMPONENT_SPECS.md** | Detailed specs for 5 critical components | Implementing components |
| **MVP_IMPLEMENTATION_ROADMAP.md** | 3-week sprint plan | Planning work |
| **MVP_TEST_SCENARIOS.md** | Comprehensive test cases | Writing tests |
| **MVP_CODE_PATTERNS.md** | Code examples & patterns | Coding reference |
| **MVP_DB_COMPONENT_MATRIX.md** | DB object to component mapping | Architecture overview |

---

## Current Status

### ✅ What's Working (70%)

**Backend (95%)**
- UnifiedDelphiAgent with multi-create detection
- RoomOrchestratorDO with state management
- Complete Convex schema (all tables)
- Proposal system backend (`proposals.confirm`)
- Intent detection & context building

**Frontend (40%)**
- TaskProposalCard, BudgetProposalCard, VendorProposalCard ✅
- TaskListCard, BudgetSummaryCard, VendorCard ✅
- FluidUIMessageRenderer (partial)
- Zustand store architecture ✅
- Component registry ✅
- 31 dashboard components (many functional)

---

## MVP Blockers (15 hours)

### P0 - Critical
1. **InlinePoll** (4h) - AI can't create polls → `/docs/mvp/MVP_COMPONENT_SPECS.md#1-inlinepoll-p0---critical`

### P1 - High Priority
2. **VendorsList** (2h) - Can't display vendor search → `/docs/mvp/MVP_COMPONENT_SPECS.md#2-vendorslist-p1`
3. **InventoryCard** (3h) - Can't manage inventory → `/docs/mvp/MVP_COMPONENT_SPECS.md#3-inventorycard-p1`
4. **KPIDashboard** (4h) - No event overview → `/docs/mvp/MVP_COMPONENT_SPECS.md#4-kpidashboard-p1`
5. **ProgressSummary** (2h) - No completion tracking → `/docs/mvp/MVP_COMPONENT_SPECS.md#5-progresssummary-p1`

---

## 3-Week Plan

**Reference:** `/docs/mvp/MVP_IMPLEMENTATION_ROADMAP.md`

### Week 1: Message Schema + Rendering
- Extend message schema with `renderType`, `componentConfig`
- Update FluidUIMessageRenderer for all types
- Update agent response formatting

### Week 2: Interactive Components
- Implement InlinePoll (P0)
- Implement QuickActions
- Implement ConfirmationPrompt
- Register all components

### Week 3: Dashboard Components + Testing
- Implement VendorsList, InventoryCard
- Implement KPIDashboard, ProgressSummary
- Integration testing
- Production setup

---

## How to Implement a Component

**Reference:** `/docs/mvp/MVP_CODE_PATTERNS.md`

### Step 1: Create Component File
```typescript
// /web/src/components/fluid-ui/cards/ExampleCard.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ExampleCardProps {
  eventId: Id<"events">;
  // ... other props
}

export function ExampleCard({ eventId }: ExampleCardProps) {
  // 1. Convex queries
  const data = useQuery(api.items.listByEvent, { eventId });

  // 2. Loading/empty states
  if (data === undefined) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState />;

  // 3. Render
  return <Card>{/* ... */}</Card>;
}
```

### Step 2: Register Component
```typescript
// /web/src/lib/fluid-ui/registerMessageComponents.ts
import { ExampleCard } from "@/components/fluid-ui/cards/ExampleCard";

registerComponent("ExampleCard", ExampleCard, {
  category: "data_display",
  requiredProps: ["eventId"]
});
```

### Step 3: Test Component
**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md`

```typescript
describe("ExampleCard", () => {
  it("renders data correctly", () => {
    mockData.mockReturnValue([{ _id: "1", name: "Item 1" }]);
    render(<ExampleCard eventId="evt_123" />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });
});
```

---

## Key Patterns

### Convex Real-time
```typescript
// Automatic re-render on data changes
const tasks = useQuery(api.tasks.listByEvent, { eventId });
// No polling needed - updates pushed from server
```

### Zustand Master-Detail
```typescript
// Master: Emit selection
const select = useDashboardStore(state => state.select);
const handleClick = (id) => select("vendorId", id);

// Detail: Read selection
const selectedVendor = useDashboardStore(state => state.selections.vendorId);
const filtered = data?.filter(d => d.vendorId === selectedVendor);
```

### Proposal Confirmation
```typescript
const confirm = useMutation(api.proposals.confirm);
await confirm({ proposalId, action: "accept_all" });
```

**Full patterns:** `/docs/mvp/MVP_CODE_PATTERNS.md`

---

## Testing Strategy

**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md`

1. **Component Isolation** - Unit test each component
2. **Master-Detail Integration** - Test Zustand orchestration
3. **AI Rendering E2E** - Test user message → proposal → acceptance
4. **Real-time Sync** - Test multi-user Convex subscriptions

---

## Database Objects

**Reference:** `/docs/mvp/MVP_DB_COMPONENT_MATRIX.md`

| DB Object | Components | Status |
|-----------|------------|--------|
| tasks | TaskProposalCard, TaskListCard, TasksList | ✅ |
| expenses | BudgetProposalCard, BudgetSummaryCard, ExpensesList | ✅ |
| vendors | VendorProposalCard, VendorCard, VendorsList | 🔨 VendorsList |
| polls | InlinePoll, PollsList, PollResults | ❌ InlinePoll |
| inventory | InventoryCard | ❌ Missing |

---

## Architecture References

- **v3.1 Architecture:** `/docs/delphi-v3.1-refined-architecture.md`
- **Full UI Plan (72 components):** `/docs/FLUID_UI_INTEGRATION_PLAN.md`
- **Project Scope:** `/docs/delphi-scope.md`

---

## Common Questions

### Q: How does AI decide what to display?
A: Agent returns `structuredData.type` in response → FluidUIMessageRenderer routes to appropriate component

### Q: How do components get data?
A: Convex `useQuery` hooks create real-time subscriptions → auto-update when data changes

### Q: How do components communicate?
A: Zustand store for cross-component state (master-detail pattern) → selections propagate automatically

### Q: How do proposals work?
A: Agent detects multi-create → returns proposal → user confirms → batch mutation executes

---

## Next Actions

1. **Read:** `/docs/mvp/MVP_COMPONENT_SPECS.md` for InlinePoll spec
2. **Implement:** InlinePoll component (4 hours)
3. **Test:** Poll voting flow (reference test scenarios)
4. **Repeat:** For remaining 4 components
5. **Ship:** MVP in 3 weeks

---

## Support

- **Codebase exploration:** Use `@agent-Explore` for deep dives
- **Architecture questions:** Reference `/docs/delphi-v3.1-refined-architecture.md`
- **Component examples:** Check `/web/src/components/fluid-ui/cards/TaskProposalCard.tsx`
- **Pattern reference:** `/docs/mvp/MVP_CODE_PATTERNS.md`
