# MVP Critical Component Specifications

**Status:** 5 components blocking MVP
**Reference:** `/docs/FLUID_UI_INTEGRATION_PLAN.md` for full 72-component plan

---

## 1. InlinePoll (P0 - CRITICAL)

**Purpose:** AI-generated polls for group decision-making in chat

**File:** `/web/src/components/fluid-ui/cards/InlinePoll.tsx`

### Props
```typescript
interface InlinePollProps {
  pollId: Id<"polls">;
  question: string;
  options: Array<{
    id: string;
    text: string;
    description?: string;
  }>;
  allowMultipleChoices: boolean;
  deadline?: number;
  eventId: Id<"events">;
  roomId: Id<"rooms">;
}
```

### Convex Integration
```typescript
// Queries
const poll = useQuery(api.polls.getById, { pollId });
const votes = useQuery(api.pollVotes.listByPoll, { pollId });
const myVote = useQuery(api.pollVotes.getMyVote, { pollId });

// Mutation
const vote = useMutation(api.pollVotes.create);
```

### User Interactions
1. View question + options
2. Select (radio for single, checkbox for multi)
3. Click "Vote" → `vote({ pollId, optionIds })`
4. See real-time results (vote counts, percentages)
5. View voters (if not anonymous)

### State Management
- **Zustand:** None needed (self-contained)
- **Convex:** Real-time subscription auto-updates

### UI Requirements
- Deadline countdown timer (like TaskProposalCard)
- Progress bars for vote percentages
- Disabled state after voting
- "Poll Closed" state after deadline

**Estimated Effort:** 4 hours

---

## 2. VendorsList (P1)

**Purpose:** Display vendor search results or vendor directory

**File:** `/web/src/components/fluid-ui/cards/VendorsList.tsx` (upgrade from placeholder)

### Props
```typescript
interface VendorsListProps {
  eventId: Id<"events">;
  category?: string;
  status?: string;
  limit?: number;
  title?: string;
}
```

### Convex Integration
```typescript
const vendors = useQuery(api.vendors.listByEvent, { eventId });
```

### Zustand Integration (Master Component)
```typescript
const select = useDashboardStore(state => state.select);
const selectedVendor = useDashboardStore(state => state.selections.vendorId);

const handleVendorClick = (id: string) => {
  select("vendorId", id);
};
```

### User Interactions
1. View vendor cards in grid
2. Click vendor → emit `vendorId` selection
3. Quick actions: "View Tasks", "View Expenses", "Contact"

**Estimated Effort:** 2 hours

---

## 3. InventoryCard (P1)

**Purpose:** Add/manage inventory items (rentals, decorations, etc.)

**File:** `/web/src/components/fluid-ui/cards/InventoryCard.tsx` (new)

### Props
```typescript
interface InventoryCardProps {
  eventId: Id<"events">;
  category?: string;
  showForm?: boolean;
  limit?: number;
}
```

### Schema Addition Needed
```typescript
// Add to /web/convex/schema.ts
inventory: defineTable({
  eventId: v.id("events"),
  name: v.string(),
  category: v.string(),
  quantity: v.number(),
  source: v.union(v.literal("rental"), v.literal("purchased"), v.literal("borrowed")),
  cost: v.optional(v.number()),
  returnDate: v.optional(v.number()),
  notes: v.optional(v.string()),
  isDeleted: v.boolean(),
})
```

### Convex Integration
```typescript
const items = useQuery(api.inventory.listByEvent, { eventId });
const create = useMutation(api.inventory.create);
const update = useMutation(api.inventory.patch);
```

### User Interactions
1. View inventory list
2. Add item (quick form: name, category, quantity, source)
3. Mark as returned
4. Edit/delete items

**Estimated Effort:** 3 hours

---

## 4. KPIDashboard (P1)

**Purpose:** Key metrics overview (budget, tasks, days, RSVP)

**File:** `/web/src/components/dashboard/KPIDashboard.tsx` (new)

### Props
```typescript
interface KPIDashboardProps {
  eventId: Id<"events">;
}
```

### Metrics
```typescript
interface KPIMetrics {
  budget: { spent: number; total: number; percentage: number };
  tasks: { complete: number; total: number; percentage: number };
  days: number; // Until event
  rsvp: { confirmed: number; expected: number; percentage: number };
}
```

### Convex Integration
```typescript
const event = useQuery(api.events.getById, { eventId });
const tasks = useQuery(api.tasks.listByEvent, { eventId });
const expenses = useQuery(api.expenses.listByEvent, { eventId });
const guests = useQuery(api.guests.listByEvent, { eventId });

// Compute metrics in component
const metrics = useMemo(() => ({
  budget: {
    spent: expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0,
    total: event?.budget ?? 0,
    percentage: ...
  },
  tasks: {
    complete: tasks?.filter(t => t.status === "complete").length ?? 0,
    total: tasks?.length ?? 0,
    percentage: ...
  },
  days: event?.date ? Math.floor((event.date - Date.now()) / (1000*60*60*24)) : 0,
  rsvp: {
    confirmed: guests?.filter(g => g.status === "confirmed").length ?? 0,
    expected: event?.guestCount ?? 0,
    percentage: ...
  }
}), [event, tasks, expenses, guests]);
```

### UI Design
- 4 metric cards in horizontal row
- Large number for primary value
- Secondary text for context
- Color coding: green (good), yellow (warning), red (alert)

**Estimated Effort:** 4 hours

---

## 5. ProgressSummary (P1)

**Purpose:** Overall event completion percentage

**File:** `/web/src/components/dashboard/ProgressSummary.tsx` (new)

### Props
```typescript
interface ProgressSummaryProps {
  eventId: Id<"events">;
  showBreakdown?: boolean;
}
```

### Convex Integration
```typescript
const tasks = useQuery(api.tasks.listByEvent, { eventId });
const milestones = useQuery(api.milestones.listByEvent, { eventId });
```

### Computation
```typescript
const progress = useMemo(() => {
  const taskProgress = (tasks?.filter(t => t.status === "complete").length ?? 0) / (tasks?.length || 1);
  const milestoneProgress = (milestones?.filter(m => m.status === "complete").length ?? 0) / (milestones?.length || 1);

  return {
    overall: (taskProgress * 0.7 + milestoneProgress * 0.3) * 100, // Weighted
    tasks: taskProgress * 100,
    milestones: milestoneProgress * 100
  };
}, [tasks, milestones]);
```

### UI Design
- Large circular progress indicator
- Breakdown: Tasks (70%), Milestones (30%)
- Optional phase breakdown

**Estimated Effort:** 2 hours

---

## Total Estimated Effort

| Component | Priority | Effort |
|-----------|----------|--------|
| InlinePoll | P0 | 4h |
| VendorsList | P1 | 2h |
| InventoryCard | P1 | 3h |
| KPIDashboard | P1 | 4h |
| ProgressSummary | P1 | 2h |
| **TOTAL** | | **15h** |

**Timeline:** 2 weeks (including testing)

---

## References

- Full component catalog: `/docs/FLUID_UI_INTEGRATION_PLAN.md`
- Existing implementations: `/web/src/components/fluid-ui/cards/`
- Zustand patterns: `/web/src/lib/fluid-ui/store.ts`
- Convex schema: `/web/convex/schema.ts`
