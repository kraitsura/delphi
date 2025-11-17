# Delphi MVP Master Implementation Prompt

**Version:** 1.0
**Date:** November 16, 2025
**Timeline:** 3 weeks to MVP-ready
**Coordination:** 6 parallel tracks for simultaneous development

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| `/docs/mvp/MVP_QUICK_START.md` | Overview & getting started |
| `/docs/mvp/MVP_COMPONENT_SPECS.md` | Component specifications |
| `/docs/mvp/MVP_CODE_PATTERNS.md` | Implementation patterns |
| `/docs/mvp/MVP_TEST_SCENARIOS.md` | Testing requirements |
| `/docs/mvp/MVP_DB_COMPONENT_MATRIX.md` | Component inventory |
| `/docs/delphi-v3.1-refined-architecture.md` | System architecture |
| `/docs/FLUID_UI_INTEGRATION_PLAN.md` | Full UI plan (72 components) |

---

## Current Status

**Overall Progress:** 70% complete
**Critical Path:** 15 hours
**Blockers:** 5 components (InlinePoll, VendorsList, InventoryCard, KPIDashboard, ProgressSummary)

**System Health:**
- ✅ Backend: UnifiedDelphiAgent, RoomOrchestratorDO functional
- ✅ Database: All tables defined in `/web/convex/schema.ts`
- ✅ Proposal System: TaskProposalCard, BudgetProposalCard, VendorProposalCard working
- ✅ Zustand Store: `/web/src/lib/fluid-ui/store.ts` (lines 1-350) fully implemented
- 🚧 FluidUIMessageRenderer: Supports proposals, needs all render types
- 🚧 Component Library: 31/37 components functional, 5 blockers

---

## Parallel Development Tracks

### Track Dependencies
```
Track 1 (Interactive) ─┐
Track 2 (Display)     ─┤
Track 3 (Dashboard)   ─┼─→ Track 6 (Integration Testing)
Track 4 (Rendering)   ─┤
Track 5 (Zustand)     ─┘

Independent: Tracks 1-5 can run in parallel
Final: Track 6 requires Tracks 1-5 complete
```

---

## TRACK 1: Interactive Components (AI Prompts)

**Priority:** P0 (CRITICAL BLOCKER)
**Effort:** 8 hours
**Assignee:** Agent or Developer A
**Dependencies:** None

### Objectives
Implement AI interactive components that enable agent to collect user input inline in chat.

### Tasks

#### Task 1.1: InlinePoll Component (4 hours)

**Reference:** `/docs/mvp/MVP_COMPONENT_SPECS.md` lines 14-83

**File to Create:** `/web/src/components/fluid-ui/cards/InlinePoll.tsx`

**Specification:**
```typescript
interface InlinePollProps {
  pollId: Id<"polls">;
  question: string;
  options: Array<{ id: string; text: string; description?: string; }>;
  allowMultipleChoices: boolean;
  deadline?: number;
  eventId: Id<"events">;
  roomId: Id<"rooms">;
}
```

**Convex Queries:**
- `api.polls.getById` - Fetch poll (already exists in `/web/convex/polls.ts`)
- `api.pollVotes.listByPoll` - Get votes (already exists in `/web/convex/pollVotes.ts`)
- `api.pollVotes.create` - Submit vote (mutation, already exists)

**Implementation Checklist:**
- [ ] Create component file with props interface
- [ ] Implement Convex query hooks
- [ ] Build vote submission handler with error handling
- [ ] Add deadline countdown timer (reference: `/web/src/components/fluid-ui/cards/TaskProposalCard.tsx` lines 45-62)
- [ ] Implement UI states: voting, voted, expired
- [ ] Add real-time vote count updates via Convex subscription
- [ ] Style with ultra-minimal aesthetic (reference: existing cards)
- [ ] Add ARIA labels and keyboard navigation
- [ ] Handle loading/empty/error states

**Code Pattern Reference:** `/docs/mvp/MVP_CODE_PATTERNS.md` lines 1-60 (Component Structure)

**Test Scenarios:** `/docs/mvp/MVP_TEST_SCENARIOS.md` lines 179-234 (InlinePoll tests)

**Acceptance Criteria:**
- [ ] Poll renders with question and options
- [ ] User can vote (single or multi-choice)
- [ ] Vote mutation executes successfully
- [ ] Real-time updates show vote counts
- [ ] Deadline countdown displays correctly
- [ ] Expired state disables voting
- [ ] Component passes unit tests

---

#### Task 1.2: QuickActions Component (2 hours)

**File to Create:** `/web/src/components/fluid-ui/interactive/QuickActions.tsx`

**Purpose:** Display AI-suggested action buttons inline

**Specification:**
```typescript
interface QuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    action: string; // "create_task", "add_expense", etc.
    variant: "primary" | "secondary" | "danger";
  }>;
  onAction: (actionId: string) => void;
}
```

**Implementation Checklist:**
- [ ] Create component with action button grid
- [ ] Handle action click with callback
- [ ] Support 3 button variants (primary, secondary, danger)
- [ ] Add hover/active states
- [ ] Limit max 4 buttons (per architecture)
- [ ] Keyboard navigation support

**Reference:** `/docs/delphi-v3.1-refined-architecture.md` lines 1350-1455 (Contextual Quick Actions)

**Acceptance Criteria:**
- [ ] Renders 2-4 action buttons
- [ ] Clicks trigger onAction callback
- [ ] Keyboard navigation works
- [ ] Matches design system

---

#### Task 1.3: ConfirmationPrompt Component (2 hours)

**File to Create:** `/web/src/components/fluid-ui/interactive/ConfirmationPrompt.tsx`

**Purpose:** Yes/No confirmations from AI

**Specification:**
```typescript
interface ConfirmationPromptProps {
  question: string;
  yesLabel?: string;
  noLabel?: string;
  variant?: "default" | "warning" | "danger";
  onConfirm: (confirmed: boolean) => void;
}
```

**Implementation Checklist:**
- [ ] Create component with question + 2 buttons
- [ ] Handle yes/no clicks
- [ ] Support variant styling (danger = red theme)
- [ ] Auto-focus on primary action
- [ ] Keyboard shortcuts (Enter = yes, Esc = no)

**Acceptance Criteria:**
- [ ] Renders question and buttons
- [ ] Yes/No trigger correct callbacks
- [ ] Keyboard shortcuts work
- [ ] Variant styling applies

---

### Track 1 Deliverables

**Files Created:**
- `/web/src/components/fluid-ui/cards/InlinePoll.tsx`
- `/web/src/components/fluid-ui/interactive/QuickActions.tsx`
- `/web/src/components/fluid-ui/interactive/ConfirmationPrompt.tsx`

**Tests Created:**
- `/web/src/components/fluid-ui/cards/InlinePoll.test.tsx`
- `/web/src/components/fluid-ui/interactive/QuickActions.test.tsx`
- `/web/src/components/fluid-ui/interactive/ConfirmationPrompt.test.tsx`

**Integration Point:**
Must register components in `/web/src/lib/fluid-ui/registerMessageComponents.ts` (see Track 6)

---

## TRACK 2: Data Display Components

**Priority:** P1 (HIGH)
**Effort:** 5 hours
**Assignee:** Agent or Developer B
**Dependencies:** None

### Objectives
Complete data display components for vendors and inventory.

### Tasks

#### Task 2.1: VendorsList Component (2 hours)

**Reference:** `/docs/mvp/MVP_COMPONENT_SPECS.md` lines 85-130

**File to Upgrade:** `/web/src/components/fluid-ui/cards/VendorsList.tsx` (currently placeholder)

**Specification:**
```typescript
interface VendorsListProps {
  eventId: Id<"events">;
  category?: string;
  status?: string;
  limit?: number;
  title?: string;
}
```

**Convex Query:**
- `api.vendors.listByEvent` - Already exists in `/web/convex/vendors.ts` lines 120-150

**Zustand Integration (Master Component):**
Reference: `/docs/mvp/MVP_CODE_PATTERNS.md` lines 92-145

```typescript
const select = useDashboardStore(state => state.select);
const selectedVendor = useDashboardStore(state => state.selections.vendorId);

const handleVendorClick = (id: string) => {
  select("vendorId", id);
};
```

**Implementation Checklist:**
- [ ] Replace placeholder with full implementation
- [ ] Add Convex query for vendors
- [ ] Implement grid layout (reference: `/web/src/components/dashboard/TasksByVendor.tsx` lines 30-80)
- [ ] Add Zustand master component pattern (emit vendorId on click)
- [ ] Use VendorCard for each item (already exists at `/web/src/components/fluid-ui/cards/VendorCard.tsx`)
- [ ] Add category/status filtering
- [ ] Handle loading/empty states
- [ ] Add quick actions: "View Tasks", "View Expenses"

**Acceptance Criteria:**
- [ ] Displays vendor list from Convex
- [ ] Clicking vendor emits selection to Zustand
- [ ] Filters by category/status work
- [ ] Quick actions functional
- [ ] Integrates with detail components (ExpensesList filters)

---

#### Task 2.2: InventoryCard Component (3 hours)

**Reference:** `/docs/mvp/MVP_COMPONENT_SPECS.md` lines 132-186

**File to Create:** `/web/src/components/fluid-ui/cards/InventoryCard.tsx`

**PREREQUISITE: Add Inventory Table to Schema**

**Schema Addition Required:**
Edit `/web/convex/schema.ts` around line 800 (after existing tables):

```typescript
inventory: defineTable({
  eventId: v.id("events"),
  name: v.string(),
  category: v.string(), // "rentals", "decorations", "equipment"
  quantity: v.number(),
  source: v.union(
    v.literal("rental"),
    v.literal("purchased"),
    v.literal("borrowed")
  ),
  cost: v.optional(v.number()),
  returnDate: v.optional(v.number()),
  notes: v.optional(v.string()),

  // Standard fields
  isDeleted: v.boolean(),
  createdAt: v.number(),
  createdBy: v.id("users"),
  updatedAt: v.number(),
  updatedBy: v.id("users"),
})
  .index("by_event", ["eventId", "isDeleted"])
  .index("by_category", ["eventId", "category", "isDeleted"]),
```

**Convex Mutations to Create:**
Create file `/web/convex/inventory.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByEvent = query({
  args: { eventId: v.id("events"), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("inventory")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId).eq("isDeleted", false));

    const items = await q.collect();

    if (args.category) {
      return items.filter(i => i.category === args.category);
    }
    return items;
  },
});

export const create = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    category: v.string(),
    quantity: v.number(),
    source: v.union(v.literal("rental"), v.literal("purchased"), v.literal("borrowed")),
    cost: v.optional(v.number()),
    returnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("inventory", {
      ...args,
      isDeleted: false,
      createdAt: Date.now(),
      createdBy: userId.subject as any,
      updatedAt: Date.now(),
      updatedBy: userId.subject as any,
    });
  },
});

export const patch = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    cost: v.optional(v.number()),
    returnDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
      updatedBy: userId.subject as any,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});
```

**Component Specification:**
```typescript
interface InventoryCardProps {
  eventId: Id<"events">;
  category?: string;
  showForm?: boolean;
  limit?: number;
}
```

**Implementation Checklist:**
- [ ] Add inventory table to schema
- [ ] Create `/web/convex/inventory.ts` with CRUD operations
- [ ] Create InventoryCard component
- [ ] Add Convex query hooks
- [ ] Build item list view with edit/delete actions
- [ ] Add quick form for creating items (name, category, quantity, source)
- [ ] Handle loading/empty states
- [ ] Add category filtering

**Acceptance Criteria:**
- [ ] Schema migration successful (check Convex dashboard)
- [ ] CRUD operations work via Convex
- [ ] Component displays inventory items
- [ ] Can create new items via form
- [ ] Can edit/delete items
- [ ] Category filtering works

---

### Track 2 Deliverables

**Files Modified:**
- `/web/convex/schema.ts` (add inventory table)
- `/web/src/components/fluid-ui/cards/VendorsList.tsx` (upgrade from placeholder)

**Files Created:**
- `/web/convex/inventory.ts` (CRUD operations)
- `/web/src/components/fluid-ui/cards/InventoryCard.tsx`

**Tests Created:**
- `/web/src/components/fluid-ui/cards/VendorsList.test.tsx`
- `/web/src/components/fluid-ui/cards/InventoryCard.test.tsx`

---

## TRACK 3: Dashboard Summary Components

**Priority:** P1 (HIGH)
**Effort:** 6 hours
**Assignee:** Agent or Developer C
**Dependencies:** None

### Objectives
Implement high-level dashboard components for event overview and progress tracking.

### Tasks

#### Task 3.1: KPIDashboard Component (4 hours)

**Reference:** `/docs/mvp/MVP_COMPONENT_SPECS.md` lines 188-251

**File to Create:** `/web/src/components/dashboard/KPIDashboard.tsx`

**Purpose:** Display 4 key metrics at a glance (Budget, Tasks, Days, RSVP)

**Specification:**
```typescript
interface KPIDashboardProps {
  eventId: Id<"events">;
}

interface KPIMetrics {
  budget: { spent: number; total: number; percentage: number; status: "good" | "warning" | "danger" };
  tasks: { complete: number; total: number; percentage: number; status: "good" | "warning" | "danger" };
  days: { remaining: number; status: "good" | "warning" | "danger" };
  rsvp: { confirmed: number; expected: number; percentage: number; status: "good" | "warning" | "danger" };
}
```

**Convex Queries:**
- `api.events.getById` (already exists)
- `api.tasks.listByEvent` (already exists)
- `api.expenses.listByEvent` (already exists)
- `api.guests.listByEvent` (already exists)

**Metric Computation Logic:**
```typescript
const metrics = useMemo(() => {
  const spent = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const total = event?.budget ?? 0;
  const budgetPct = total > 0 ? (spent / total) * 100 : 0;

  const tasksComplete = tasks?.filter(t => t.status === "complete").length ?? 0;
  const tasksTotal = tasks?.length ?? 0;
  const tasksPct = tasksTotal > 0 ? (tasksComplete / tasksTotal) * 100 : 0;

  const daysRemaining = event?.date
    ? Math.floor((event.date - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const rsvpConfirmed = guests?.filter(g => g.status === "confirmed").length ?? 0;
  const rsvpExpected = event?.guestCount ?? 0;
  const rsvpPct = rsvpExpected > 0 ? (rsvpConfirmed / rsvpExpected) * 100 : 0;

  return {
    budget: {
      spent,
      total,
      percentage: budgetPct,
      status: budgetPct < 80 ? "good" : budgetPct < 95 ? "warning" : "danger"
    },
    tasks: {
      complete: tasksComplete,
      total: tasksTotal,
      percentage: tasksPct,
      status: tasksPct >= 70 ? "good" : tasksPct >= 40 ? "warning" : "danger"
    },
    days: {
      remaining: daysRemaining,
      status: daysRemaining > 90 ? "good" : daysRemaining > 30 ? "warning" : "danger"
    },
    rsvp: {
      confirmed: rsvpConfirmed,
      expected: rsvpExpected,
      percentage: rsvpPct,
      status: rsvpPct >= 60 ? "good" : rsvpPct >= 30 ? "warning" : "danger"
    }
  };
}, [event, tasks, expenses, guests]);
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Budget          Tasks         Days        RSVP      │
│ $3.5K/$10K      12/47        237        23/150      │
│ 35%            26%          Days       15%          │
│ [green bar]    [red bar]    [yellow]   [red bar]   │
└─────────────────────────────────────────────────────┘
```

**Implementation Checklist:**
- [ ] Create component with responsive grid (4 columns on desktop, 2x2 on mobile)
- [ ] Implement all 4 Convex queries
- [ ] Build metric computation logic
- [ ] Create MetricCard sub-component
- [ ] Implement color coding (green/yellow/red)
- [ ] Add progress bars for percentages
- [ ] Handle loading state (show skeleton)
- [ ] Handle missing data (graceful defaults)

**Reference Implementations:**
- Card grid layout: `/web/src/components/dashboard/TasksByPhase.tsx` lines 20-50
- Metric computation: `/web/src/components/fluid-ui/cards/BudgetSummaryCard.tsx` lines 30-60

**Acceptance Criteria:**
- [ ] Displays 4 metrics accurately
- [ ] Color coding reflects status correctly
- [ ] Responsive layout works on mobile
- [ ] Loading skeleton displays
- [ ] Updates in real-time via Convex

---

#### Task 3.2: ProgressSummary Component (2 hours)

**Reference:** `/docs/mvp/MVP_COMPONENT_SPECS.md` lines 253-293

**File to Create:** `/web/src/components/dashboard/ProgressSummary.tsx`

**Purpose:** Show overall event completion percentage with breakdown

**Specification:**
```typescript
interface ProgressSummaryProps {
  eventId: Id<"events">;
  showBreakdown?: boolean;
}
```

**Convex Queries:**
- `api.tasks.listByEvent`
- `api.milestones.listByEvent`

**Progress Computation:**
```typescript
const progress = useMemo(() => {
  const taskProgress =
    (tasks?.filter(t => t.status === "complete").length ?? 0) /
    (tasks?.length || 1);

  const milestoneProgress =
    (milestones?.filter(m => m.status === "complete").length ?? 0) /
    (milestones?.length || 1);

  // Weighted: Tasks 70%, Milestones 30%
  const overall = (taskProgress * 0.7 + milestoneProgress * 0.3) * 100;

  return {
    overall: Math.round(overall),
    tasks: Math.round(taskProgress * 100),
    milestones: Math.round(milestoneProgress * 100)
  };
}, [tasks, milestones]);
```

**UI Design:**
```
┌─────────────────────────┐
│  Overall Progress       │
│                         │
│      ████░░░░░░         │
│         42%             │
│                         │
│  Tasks: 26% (12/47)     │
│  Milestones: 75% (3/4)  │
└─────────────────────────┘
```

**Implementation Checklist:**
- [ ] Create component with circular progress indicator
- [ ] Compute weighted progress
- [ ] Show breakdown (tasks + milestones)
- [ ] Add color coding based on overall %
- [ ] Handle edge case: no tasks/milestones
- [ ] Add optional detail view toggle

**Reference:** Circular progress - use shadcn/ui Progress component or build custom SVG

**Acceptance Criteria:**
- [ ] Displays overall percentage correctly
- [ ] Shows task/milestone breakdown
- [ ] Progress bar fills appropriately
- [ ] Color reflects completion level
- [ ] Updates in real-time

---

### Track 3 Deliverables

**Files Created:**
- `/web/src/components/dashboard/KPIDashboard.tsx`
- `/web/src/components/dashboard/ProgressSummary.tsx`

**Tests Created:**
- `/web/src/components/dashboard/KPIDashboard.test.tsx`
- `/web/src/components/dashboard/ProgressSummary.test.tsx`

---

## TRACK 4: Message Rendering Pipeline

**Priority:** P1 (HIGH)
**Effort:** 6 hours
**Assignee:** Agent or Developer D
**Dependencies:** None

### Objectives
Extend message schema and FluidUIMessageRenderer to support all AI rendering capabilities.

### Tasks

#### Task 4.1: Extend Message Schema (1 hour)

**File to Modify:** `/web/convex/schema.ts`

**Current State:** Lines 200-250 (messages table with `aiMetadata`)

**Add Fields:**
```typescript
messages: defineTable({
  // ... existing fields (roomId, eventId, content, authorType, etc.)

  aiMetadata: v.optional(v.object({
    intent: v.optional(v.string()),
    confidence: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),

    // EXISTING
    structuredData: v.optional(v.any()),

    // NEW: Add these fields
    renderType: v.optional(v.union(
      v.literal("text"),
      v.literal("component_grid"),
      v.literal("interactive_prompt"),
      v.literal("mixed")
    )),

    componentConfig: v.optional(v.object({
      sections: v.array(v.union(
        v.object({
          type: v.literal("text"),
          content: v.string()
        }),
        v.object({
          type: v.literal("grid"),
          components: v.array(v.any())
        })
      ))
    })),

    interactivePrompt: v.optional(v.object({
      promptType: v.union(
        v.literal("poll"),
        v.literal("confirmation"),
        v.literal("quickActions"),
        v.literal("multiChoice")
      ),
      data: v.any(),
      responses: v.optional(v.array(v.any()))
    }))
  })),

  // ... rest of fields
})
```

**Implementation Checklist:**
- [ ] Add new fields to messages schema
- [ ] Deploy schema to Convex (automatic on save)
- [ ] Verify migration in Convex dashboard

**Acceptance Criteria:**
- [ ] Schema deployed without errors
- [ ] Existing messages still load
- [ ] New fields available for writes

---

#### Task 4.2: Update FluidUIMessageRenderer (5 hours)

**File to Modify:** `/web/src/components/messages/FluidUIMessageRenderer.tsx`

**Current State:** Lines 1-197 (handles "proposal" and "task_result" types)

**New Structure:**
```typescript
export function FluidUIMessageRenderer({ message }: Props) {
  const { aiMetadata } = message;

  // No AI metadata -> render as markdown
  if (!aiMetadata) {
    return <MarkdownRenderer content={message.content} />;
  }

  // Route based on renderType
  const { renderType, structuredData, componentConfig, interactivePrompt } = aiMetadata;

  switch (renderType) {
    case "text":
      return <MarkdownRenderer content={message.content} />;

    case "component_grid":
      return <ComponentGridRenderer config={componentConfig!} />;

    case "interactive_prompt":
      return <InteractivePromptRenderer prompt={interactivePrompt!} />;

    case "mixed":
      return <MixedRenderer config={componentConfig!} text={message.content} />;

    default:
      // Fallback: Legacy structuredData handling + hybrid mode
      if (structuredData) {
        return <LegacyStructuredDataRenderer data={structuredData} />;
      }
      return <HybridRenderer content={message.content} metadata={aiMetadata} />;
  }
}
```

**Sub-Renderers to Create:**

**4.2.1 ComponentGridRenderer** (2 hours)
```typescript
// /web/src/components/messages/renderers/ComponentGridRenderer.tsx

interface ComponentGridRendererProps {
  config: {
    sections: Array<
      | { type: "text"; content: string }
      | { type: "grid"; components: Array<ComponentSpec> }
    >;
  };
}

export function ComponentGridRenderer({ config }: ComponentGridRendererProps) {
  return (
    <div className="space-y-4">
      {config.sections.map((section, idx) => {
        if (section.type === "text") {
          return <MarkdownRenderer key={idx} content={section.content} />;
        }

        if (section.type === "grid") {
          return (
            <DashboardStoreProvider key={idx}>
              <LayoutController
                config={{ sections: [section] }}
                eventId={message.eventId}
                roomId={message.roomId}
              />
            </DashboardStoreProvider>
          );
        }
      })}
    </div>
  );
}
```

**Reference:** `/web/src/components/fluid-ui/layout-controller.tsx` lines 1-150

**4.2.2 InteractivePromptRenderer** (2 hours)
```typescript
// /web/src/components/messages/renderers/InteractivePromptRenderer.tsx

interface InteractivePromptRendererProps {
  prompt: {
    promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
    data: any;
    responses?: any[];
  };
}

export function InteractivePromptRenderer({ prompt }: InteractivePromptRendererProps) {
  const { promptType, data } = prompt;

  switch (promptType) {
    case "poll":
      return <InlinePoll {...data} />; // From Track 1

    case "confirmation":
      return <ConfirmationPrompt {...data} />; // From Track 1

    case "quickActions":
      return <QuickActions {...data} />; // From Track 1

    case "multiChoice":
      return <MultiChoicePrompt {...data} />; // Future component

    default:
      return <div>Unknown prompt type: {promptType}</div>;
  }
}
```

**4.2.3 MixedRenderer** (1 hour)
```typescript
// /web/src/components/messages/renderers/MixedRenderer.tsx

interface MixedRendererProps {
  config: ComponentConfig;
  text: string;
}

export function MixedRenderer({ config, text }: MixedRendererProps) {
  return (
    <div className="space-y-4">
      <MarkdownRenderer content={text} />
      <ComponentGridRenderer config={config} />
    </div>
  );
}
```

**Implementation Checklist:**
- [ ] Create renderers directory: `/web/src/components/messages/renderers/`
- [ ] Implement ComponentGridRenderer
- [ ] Implement InteractivePromptRenderer
- [ ] Implement MixedRenderer
- [ ] Update FluidUIMessageRenderer with routing logic
- [ ] Add error boundaries for each renderer
- [ ] Handle missing components gracefully

**Acceptance Criteria:**
- [ ] All renderType values handled
- [ ] Backward compatible with existing messages
- [ ] Error boundaries prevent crashes
- [ ] Components render correctly in grid layout

---

#### Task 4.3: Update Agent Response Formatting (Optional - Post-MVP)

**File to Modify:** `/agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Current:** Lines 255-288 (buildProposal method returns structuredData)

**Enhancement:** Enable agent to send dashboard configs

```typescript
// Example: Agent returns component grid
return {
  text: "Here's your task overview:",
  aiMetadata: {
    renderType: "component_grid",
    componentConfig: {
      sections: [{
        type: "grid",
        components: [
          { type: "TaskListCard", props: { eventId, limit: 5 } },
          { type: "BudgetSummaryCard", props: { eventId } }
        ]
      }]
    }
  }
};
```

**Note:** This can be deferred to post-MVP. Focus on enabling the renderer first.

---

### Track 4 Deliverables

**Files Modified:**
- `/web/convex/schema.ts` (extend messages table)
- `/web/src/components/messages/FluidUIMessageRenderer.tsx` (add routing)

**Files Created:**
- `/web/src/components/messages/renderers/ComponentGridRenderer.tsx`
- `/web/src/components/messages/renderers/InteractivePromptRenderer.tsx`
- `/web/src/components/messages/renderers/MixedRenderer.tsx`

**Tests Created:**
- `/web/src/components/messages/renderers/ComponentGridRenderer.test.tsx`
- `/web/src/components/messages/renderers/InteractivePromptRenderer.test.tsx`

---

## TRACK 5: Zustand Integration Fixes

**Priority:** P2 (MEDIUM)
**Effort:** 4 hours
**Assignee:** Agent or Developer E
**Dependencies:** None

### Objectives
Complete Zustand integration for 4 partially implemented components.

### Background

**Zustand Store:** `/web/src/lib/fluid-ui/store.ts` lines 1-350 (fully functional)

**Master-Detail Pattern:**
- **Master components** write selections: `select("vendorId", id)`
- **Detail components** read selections: `const vendorId = useDashboardStore(s => s.selections.vendorId)`
- **Reference:** `/docs/mvp/MVP_CODE_PATTERNS.md` lines 92-180

### Tasks

#### Task 5.1: Fix TasksKanban (1 hour)

**File to Modify:** `/web/src/components/dashboard/TasksKanban.tsx`

**Current Issue:** Component doesn't read Zustand selections for filtering

**Fix Required:**
```typescript
// ADD: Read selections from Zustand
const selectedPhase = useDashboardStore(state => state.selections.phase);
const selectedVendor = useDashboardStore(state => state.selections.vendorId);
const isHighlighted = useIsHighlighted(useDashboardStore, "tasks-kanban");

// MODIFY: Filter tasks based on selections
const filteredTasks = useMemo(() => {
  if (!tasks) return { todo: [], inProgress: [], blocked: [], done: [] };

  let filtered = tasks;

  if (selectedPhase) {
    filtered = filtered.filter(t => t.phase === selectedPhase);
  }

  if (selectedVendor) {
    filtered = filtered.filter(t => t.vendorId === selectedVendor);
  }

  // Group by status
  return {
    todo: filtered.filter(t => t.status === "todo"),
    inProgress: filtered.filter(t => t.status === "in_progress"),
    blocked: filtered.filter(t => t.status === "blocked"),
    done: filtered.filter(t => t.status === "complete")
  };
}, [tasks, selectedPhase, selectedVendor]);

// ADD: Highlight class
<div
  data-testid="tasks-kanban"
  className={isHighlighted ? "highlighted" : ""}
>
  {/* Kanban columns */}
</div>
```

**Acceptance Criteria:**
- [ ] Filters by phase selection from TasksByPhase
- [ ] Filters by vendor selection from TasksByVendor
- [ ] Highlights when selection changes
- [ ] Works with multiple selections simultaneously

---

#### Task 5.2: Fix TaskGanttChart (1 hour)

**File to Modify:** `/web/src/components/dashboard/TaskGanttChart.tsx`

**Similar to TasksKanban:** Add Zustand selection reading

```typescript
const selectedPhase = useDashboardStore(state => state.selections.phase);
const selectedVendor = useDashboardStore(state => state.selections.vendorId);
const selectedMilestone = useDashboardStore(state => state.selections.milestoneId);

const filteredTasks = useMemo(() => {
  let filtered = tasks ?? [];

  if (selectedPhase) filtered = filtered.filter(t => t.phase === selectedPhase);
  if (selectedVendor) filtered = filtered.filter(t => t.vendorId === selectedVendor);
  if (selectedMilestone) filtered = filtered.filter(t => t.milestoneId === selectedMilestone);

  return filtered.sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity));
}, [tasks, selectedPhase, selectedVendor, selectedMilestone]);
```

**Acceptance Criteria:**
- [ ] Filters by phase/vendor/milestone
- [ ] Highlights on selection
- [ ] Timeline updates correctly

---

#### Task 5.3: Fix VendorTaskBoard (1 hour)

**File to Modify:** `/web/src/components/dashboard/VendorTaskBoard.tsx`

**Current Issue:** Doesn't filter by vendorId selection

```typescript
const selectedVendor = useDashboardStore(state => state.selections.vendorId);
const isHighlighted = useIsHighlighted(useDashboardStore, "vendor-task-board");

const vendorTasks = useMemo(() => {
  if (!tasks || !selectedVendor) return [];
  return tasks.filter(t => t.vendorId === selectedVendor);
}, [tasks, selectedVendor]);

// Show empty state if no vendor selected
if (!selectedVendor) {
  return <EmptyState message="Select a vendor to see their tasks" />;
}
```

**Acceptance Criteria:**
- [ ] Shows empty state if no vendor selected
- [ ] Filters to selected vendor's tasks
- [ ] Highlights on vendor selection

---

#### Task 5.4: Fix ExpensesSummary (1 hour)

**File to Modify:** `/web/src/components/dashboard/ExpensesSummary.tsx`

**Current State:** Shows category breakdown but doesn't emit selection

**Fix Required:** Add master component pattern

```typescript
const select = useDashboardStore(state => state.select);
const selectedCategory = useDashboardStore(state => state.selections.category);

const handleCategoryClick = (category: string) => {
  if (selectedCategory === category) {
    clearSelection("category");
  } else {
    select("category", category);
  }
};

// In render:
{categories.map(cat => (
  <div
    key={cat.name}
    onClick={() => handleCategoryClick(cat.name)}
    className={selectedCategory === cat.name ? "selected" : ""}
  >
    {cat.name}: ${cat.total}
  </div>
))}
```

**Acceptance Criteria:**
- [ ] Clicking category emits selection
- [ ] ExpensesList filters when category selected
- [ ] Visual selection indicator
- [ ] Toggle off works

---

### Track 5 Deliverables

**Files Modified:**
- `/web/src/components/dashboard/TasksKanban.tsx`
- `/web/src/components/dashboard/TaskGanttChart.tsx`
- `/web/src/components/dashboard/VendorTaskBoard.tsx`
- `/web/src/components/dashboard/ExpensesSummary.tsx`

**Tests Created:**
- `/web/src/components/dashboard/master-detail-integration.test.tsx` (integration tests)

---

## TRACK 6: Integration, Testing & Production Setup

**Priority:** P0 (CRITICAL - FINAL STEP)
**Effort:** 8 hours
**Assignee:** Agent or Developer F
**Dependencies:** Tracks 1-5 must be complete

### Objectives
Integrate all components, run comprehensive tests, and prepare for production deployment.

### Tasks

#### Task 6.1: Component Registration (1 hour)

**File to Modify:** `/web/src/lib/fluid-ui/registerMessageComponents.ts`

**Add New Components:**
```typescript
import { InlinePoll } from "@/components/fluid-ui/cards/InlinePoll";
import { QuickActions } from "@/components/fluid-ui/interactive/QuickActions";
import { ConfirmationPrompt } from "@/components/fluid-ui/interactive/ConfirmationPrompt";
import { VendorsList } from "@/components/fluid-ui/cards/VendorsList";
import { InventoryCard } from "@/components/fluid-ui/cards/InventoryCard";
import { KPIDashboard } from "@/components/dashboard/KPIDashboard";
import { ProgressSummary } from "@/components/dashboard/ProgressSummary";

export function registerAllComponents() {
  // Existing registrations...

  // Track 1: Interactive Components
  registerComponent("InlinePoll", InlinePoll, {
    category: "interactive",
    description: "AI-generated poll with voting",
    requiredProps: ["pollId", "question", "options", "eventId", "roomId"]
  });

  registerComponent("QuickActions", QuickActions, {
    category: "interactive",
    description: "Suggested action buttons",
    requiredProps: ["actions", "onAction"]
  });

  registerComponent("ConfirmationPrompt", ConfirmationPrompt, {
    category: "interactive",
    description: "Yes/No confirmation",
    requiredProps: ["question", "onConfirm"]
  });

  // Track 2: Data Display
  registerComponent("VendorsList", VendorsList, {
    category: "master",
    description: "Vendor directory with selection",
    requiredProps: ["eventId"],
    emits: ["vendorId"]
  });

  registerComponent("InventoryCard", InventoryCard, {
    category: "data_display",
    description: "Inventory management",
    requiredProps: ["eventId"]
  });

  // Track 3: Dashboard
  registerComponent("KPIDashboard", KPIDashboard, {
    category: "dashboard",
    description: "Key metrics overview",
    requiredProps: ["eventId"]
  });

  registerComponent("ProgressSummary", ProgressSummary, {
    category: "dashboard",
    description: "Event completion progress",
    requiredProps: ["eventId"]
  });
}
```

**Acceptance Criteria:**
- [ ] All new components registered
- [ ] Metadata complete (category, description, props)
- [ ] Registry accessible at runtime

---

#### Task 6.2: Integration Testing (4 hours)

**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md`

**Test Suite 1: Component Isolation** (1.5 hours)

Run unit tests for each new component:
```bash
npm test InlinePoll.test.tsx
npm test QuickActions.test.tsx
npm test ConfirmationPrompt.test.tsx
npm test VendorsList.test.tsx
npm test InventoryCard.test.tsx
npm test KPIDashboard.test.tsx
npm test ProgressSummary.test.tsx
```

**Acceptance Criteria:**
- [ ] All unit tests passing
- [ ] 80%+ code coverage per component
- [ ] Loading/empty/error states tested

**Test Suite 2: Master-Detail Integration** (1.5 hours)

**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md` lines 295-390

Test scenarios:
1. VendorsList → ExpensesList (vendor selection filters expenses)
2. TasksByPhase → TasksKanban (phase selection filters kanban)
3. TasksByVendor → VendorTaskBoard (vendor selection shows tasks)
4. ExpensesSummary → ExpensesList (category selection filters)

**Create:** `/web/src/components/dashboard/master-detail-integration.test.tsx`

```typescript
describe("Master-Detail Integration", () => {
  it("VendorsList → ExpensesList", async () => {
    const { store } = renderWithDashboardStore(
      <>
        <VendorsList eventId="evt_123" />
        <ExpensesList eventId="evt_123" />
      </>
    );

    // Click vendor
    await userEvent.click(screen.getByText("Photographer"));

    // Zustand updated
    expect(store.getState().selections.vendorId).toBe("vendor_1");

    // ExpensesList filtered
    expect(screen.getByTestId("expenses-list").querySelectorAll(".expense")).toHaveLength(2);

    // ExpensesList highlighted
    expect(screen.getByTestId("expenses-list")).toHaveClass("highlighted");
  });

  // ... more test scenarios
});
```

**Acceptance Criteria:**
- [ ] All master-detail patterns tested
- [ ] Zustand state propagates correctly
- [ ] Visual highlights work
- [ ] Multiple selections work

**Test Suite 3: AI Rendering E2E** (1 hour)

**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md` lines 392-480

Test full flow:
1. User sends message → Agent generates proposal → TaskProposalCard renders → User accepts → Tasks created
2. Agent sends poll → InlinePoll renders → User votes → Vote saved → Results update

```typescript
describe("AI Rendering E2E", () => {
  it("renders InlinePoll from agent message", async () => {
    // Mock agent response with poll
    const message = {
      _id: "msg_123",
      authorType: "agent",
      content: "Let's vote on the caterer",
      aiMetadata: {
        renderType: "interactive_prompt",
        interactivePrompt: {
          promptType: "poll",
          data: {
            pollId: "poll_123",
            question: "Which caterer?",
            options: [
              { id: "opt1", text: "Option A" },
              { id: "opt2", text: "Option B" }
            ],
            allowMultipleChoices: false,
            eventId: "evt_123",
            roomId: "room_123"
          }
        }
      }
    };

    render(<FluidUIMessageRenderer message={message} />);

    // InlinePoll renders
    expect(screen.getByText("Which caterer?")).toBeInTheDocument();
    expect(screen.getByLabelText("Option A")).toBeInTheDocument();
  });
});
```

**Acceptance Criteria:**
- [ ] All renderType values render correctly
- [ ] Interactive components functional
- [ ] Proposals work end-to-end
- [ ] Real-time updates work

---

#### Task 6.3: Production Setup (2 hours)

**Dashboard Route**

**Create:** `/web/src/routes/_authed/events.$eventId.dashboard.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { DashboardStoreProvider } from '@/lib/fluid-ui/DashboardStoreContext';
import { LayoutController } from '@/components/fluid-ui/layout-controller';
import { KPIDashboard } from '@/components/dashboard/KPIDashboard';
import { ProgressSummary } from '@/components/dashboard/ProgressSummary';
import { TasksByPhase } from '@/components/dashboard/TasksByPhase';
import { ExpensesList } from '@/components/dashboard/ExpensesList';

export const Route = createFileRoute('/_authed/events/$eventId/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { eventId } = Route.useParams();

  const dashboardConfig = {
    sections: [
      {
        type: "grid",
        components: [
          { type: "KPIDashboard", props: { eventId } },
          { type: "ProgressSummary", props: { eventId } }
        ]
      },
      {
        type: "grid",
        components: [
          { type: "TasksByPhase", props: { eventId } },
          { type: "ExpensesList", props: { eventId } }
        ]
      }
    ]
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Event Dashboard</h1>

      <DashboardStoreProvider>
        <LayoutController config={dashboardConfig} eventId={eventId} />
      </DashboardStoreProvider>
    </div>
  );
}
```

**Performance Audit**

Run Lighthouse:
```bash
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run audit
```

**Targets:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

**Accessibility Audit**

Install axe-core:
```bash
npm install -D @axe-core/react
```

Run in dev:
```typescript
// /web/src/main.tsx
if (import.meta.env.DEV) {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

**Fix violations:** ARIA labels, keyboard nav, color contrast

**Acceptance Criteria:**
- [ ] Dashboard route accessible
- [ ] Lighthouse score > 90
- [ ] axe-core 0 violations
- [ ] No console errors

---

#### Task 6.4: Final Verification (1 hour)

**MVP Functionality Checklist:**

- [ ] **Agent invocation works**
  - User sends "Create tasks for photographer, caterer, DJ"
  - TaskProposalCard displays with 3 tasks
  - User accepts → 3 tasks created in Convex

- [ ] **Poll creation works**
  - Agent sends poll
  - InlinePoll renders
  - User votes → vote saved
  - Other users see updated results

- [ ] **Vendor search works**
  - User asks "search photographers"
  - Agent returns VendorsList component
  - Clicking vendor filters ExpensesList

- [ ] **Inventory management works**
  - InventoryCard displays items
  - User adds item → saved to Convex
  - Item appears in list

- [ ] **Dashboard displays**
  - KPIDashboard shows 4 metrics
  - ProgressSummary shows completion %
  - Real-time updates when data changes

- [ ] **Master-detail patterns work**
  - TasksByVendor → VendorTaskBoard filters
  - ExpensesSummary → ExpensesList filters
  - Visual highlights appear

**Production Readiness Checklist:**

- [ ] All components registered
- [ ] All tests passing (unit + integration)
- [ ] Dashboard route live
- [ ] Lighthouse > 90
- [ ] axe-core 0 violations
- [ ] No console errors
- [ ] Error boundaries in place
- [ ] Loading states handle slow networks
- [ ] Empty states informative

---

### Track 6 Deliverables

**Files Modified:**
- `/web/src/lib/fluid-ui/registerMessageComponents.ts` (register new components)

**Files Created:**
- `/web/src/routes/_authed/events.$eventId.dashboard.tsx` (dashboard route)
- `/web/src/components/dashboard/master-detail-integration.test.tsx` (integration tests)

**Verification:**
- All 5 MVP blockers resolved
- System passes all acceptance criteria
- Ready for user testing

---

## Success Criteria (MVP Definition of Done)

### Functional Requirements ✅

- [x] Agent generates task proposals → user accepts → tasks created
- [x] Agent generates budget proposals → user accepts → expenses created
- [x] Agent generates vendor suggestions → user saves → vendors added
- [ ] **Agent creates polls → users vote → results display** (Track 1)
- [ ] **User requests task list → TaskListCard renders** (Existing ✅)
- [ ] **User requests budget → BudgetSummaryCard renders** (Existing ✅)
- [ ] **User requests vendors → VendorsList renders** (Track 2)
- [ ] **User adds inventory → InventoryCard CRUD works** (Track 2)
- [ ] **Dashboard shows KPIs + progress** (Track 3)

### Technical Requirements ✅

- [ ] **All components registered** (Track 6)
- [ ] **Message schema supports all render types** (Track 4)
- [ ] **FluidUIMessageRenderer handles all types** (Track 4)
- [x] Convex subscriptions real-time sync (Working ✅)
- [ ] **Zustand master-detail patterns functional** (Track 5)
- [ ] **No console errors in production** (Track 6)
- [ ] **Lighthouse score > 90** (Track 6)
- [ ] **axe-core 0 violations** (Track 6)

### Testing Requirements ✅

- [ ] **80%+ component test coverage** (Track 6)
- [ ] **Integration tests for master-detail** (Track 6)
- [ ] **E2E tests for AI → proposal flow** (Track 6)
- [ ] **Real-time sync tested with multiple users** (Track 6)
- [x] Error scenarios handled gracefully (Existing patterns ✅)

---

## Coordination Protocol

### Daily Standup (Async)

**Each track reports:**
1. Completed yesterday
2. Planning today
3. Blockers

**Template:**
```
Track [N]: [Component Name]
✅ Completed: [tasks done]
🏗️ In Progress: [current task]
🚧 Blocked: [none / issue description]
ETA: [hours remaining]
```

### Integration Points

**Track 1 → Track 4:** InlinePoll must be available before InteractivePromptRenderer can use it
**Track 1 → Track 6:** All interactive components needed for registration

**Track 2 → Track 5:** VendorsList needed for master-detail testing
**Track 2 → Track 6:** InventoryCard needed for final verification

**Track 3 → Track 6:** KPIDashboard, ProgressSummary needed for dashboard route

**Track 4 → Track 6:** Renderers needed for E2E testing

**Track 5 → Track 6:** Zustand fixes needed for master-detail tests

### Conflict Resolution

**File Conflicts:**
- `/web/src/lib/fluid-ui/registerMessageComponents.ts` - Track 6 modifies last
- `/web/convex/schema.ts` - Track 2 (inventory) and Track 4 (messages) coordinate

**Protocol:** Track 4 commits schema changes first, Track 2 pulls before adding inventory table

### Testing Before Merge

**Each track:**
1. Run `npm test` - all tests pass
2. Run `npm run build` - no TypeScript errors
3. Test in browser - component renders
4. Open PR with track number in title: `[Track 1] InlinePoll Component`

**Track 6 (Final):**
1. Pull all tracks
2. Run full test suite
3. Fix any integration issues
4. Deploy to staging
5. User acceptance testing

---

## Timeline Estimate

**Week 1:** Tracks 1-5 (parallel)
- Day 1-2: Track 1 (InlinePoll focus)
- Day 1-2: Track 2 (VendorsList + Inventory)
- Day 1-2: Track 3 (KPIDashboard)
- Day 1-3: Track 4 (Rendering pipeline)
- Day 2-3: Track 5 (Zustand fixes)

**Week 2:** Track 6 + Polish
- Day 1: Component registration
- Day 2-3: Integration testing
- Day 4: Production setup
- Day 5: Final verification

**Week 3:** Buffer + User Testing
- Day 1-2: Bug fixes from testing
- Day 3-4: Polish based on feedback
- Day 5: Deploy to production

---

## Appendix: Quick Commands

### Run Tests
```bash
# All tests
npm test

# Specific component
npm test InlinePoll.test.tsx

# Coverage report
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Build & Deploy
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview

# Convex deployment
npx convex dev  # Development
npx convex deploy  # Production
```

### Code Quality
```bash
# TypeScript check
npm run typecheck

# Linting
npm run lint

# Format
npm run format
```

---

## Support Resources

- **Architecture:** `/docs/delphi-v3.1-refined-architecture.md`
- **Component Specs:** `/docs/mvp/MVP_COMPONENT_SPECS.md`
- **Code Patterns:** `/docs/mvp/MVP_CODE_PATTERNS.md`
- **Test Scenarios:** `/docs/mvp/MVP_TEST_SCENARIOS.md`
- **Component Matrix:** `/docs/mvp/MVP_DB_COMPONENT_MATRIX.md`
- **Convex Docs:** https://docs.convex.dev
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **shadcn/ui:** https://ui.shadcn.com

---

**END OF MASTER IMPLEMENTATION PROMPT**

*Version 1.0 | Last Updated: November 16, 2025*
*For questions or issues, tag @agent-Explore for codebase analysis*
