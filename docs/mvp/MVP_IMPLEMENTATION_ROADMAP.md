# MVP Implementation Roadmap

**Timeline:** 3 weeks to MVP-ready
**Component Specs:** `/docs/mvp/MVP_COMPONENT_SPECS.md`
**Test Scenarios:** `/docs/mvp/MVP_TEST_SCENARIOS.md`

---

## Week 1: Message Schema + Rendering Pipeline

### Day 1-2: Extend Message Schema

**File:** `/web/convex/schema.ts`

```typescript
// ADD to messages table
messages: defineTable({
  // ... existing fields

  // NEW: Full rendering capabilities
  renderType: v.optional(v.union(
    v.literal("text"),
    v.literal("component_grid"),
    v.literal("interactive_prompt"),
    v.literal("mixed")
  )),

  componentConfig: v.optional(v.object({
    sections: v.array(v.union(
      v.object({ type: v.literal("text"), content: v.string() }),
      v.object({ type: v.literal("grid"), components: v.array(v.any()) })
    ))
  })),

  interactivePrompt: v.optional(v.object({
    promptType: v.union(v.literal("poll"), v.literal("confirmation"), v.literal("quickActions")),
    data: v.any(),
    responses: v.optional(v.array(v.any()))
  }))
})
```

### Day 3-4: Update FluidUIMessageRenderer

**File:** `/web/src/components/messages/FluidUIMessageRenderer.tsx`

Add handlers for all render types:
```typescript
switch (message.renderType) {
  case "text": return <MarkdownRenderer />;
  case "component_grid": return <ComponentGridRenderer />;
  case "interactive_prompt": return <InteractivePromptRenderer />;
  case "mixed": return <MixedRenderer />;
  default: return <HybridRenderer />; // Fallback
}
```

### Day 5: Update Agent Response Formatting

**File:** `/agent-worker/src/agents/UnifiedDelphiAgent.ts`

Enable agent to send all render types:
```typescript
// For dashboard configs
return {
  text: "Here's your task overview:",
  structuredData: {
    type: "dashboard",
    renderType: "component_grid",
    componentConfig: {
      sections: [
        { type: "grid", components: [
          { type: "TaskListCard", props: {...} },
          { type: "BudgetSummaryCard", props: {...} }
        ]}
      ]
    }
  }
};
```

**Deliverables Week 1:**
- ✅ Extended message schema
- ✅ Full rendering pipeline
- ✅ Agent integration updated

---

## Week 2: AI Interactive Components

### Day 1-2: InlinePoll (P0)

**File:** `/web/src/components/fluid-ui/cards/InlinePoll.tsx`

**Implementation checklist:**
- [ ] Component structure
- [ ] Convex queries (`polls.getById`, `pollVotes.listByPoll`)
- [ ] Vote submission mutation
- [ ] Real-time vote updates
- [ ] Deadline countdown
- [ ] UI states (voting, voted, expired)
- [ ] Accessibility (keyboard nav, ARIA)

**Convex backend:**
```typescript
// /web/convex/polls.ts - Already exists
export const getById = query({ ... });

// /web/convex/pollVotes.ts - Already exists
export const create = mutation({ ... });
export const listByPoll = query({ ... });
```

### Day 3: QuickActions Component

**File:** `/web/src/components/fluid-ui/interactive/QuickActions.tsx` (new)

**Purpose:** AI-suggested action buttons

```typescript
interface QuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    action: string; // e.g., "create_task", "add_expense"
    variant: "primary" | "secondary" | "danger";
  }>;
  onAction: (actionId: string) => void;
}
```

### Day 4: ConfirmationPrompt Component

**File:** `/web/src/components/fluid-ui/interactive/ConfirmationPrompt.tsx` (new)

**Purpose:** Yes/No confirmations from AI

```typescript
interface ConfirmationPromptProps {
  question: string;
  yesLabel?: string;
  noLabel?: string;
  onConfirm: (confirmed: boolean) => void;
}
```

### Day 5: Component Registration + Testing

**File:** `/web/src/lib/fluid-ui/registerMessageComponents.ts`

Register all new components:
```typescript
registerComponent("InlinePoll", InlinePoll, { category: "interactive" });
registerComponent("QuickActions", QuickActions, { category: "interactive" });
registerComponent("ConfirmationPrompt", ConfirmationPrompt, { category: "interactive" });
```

**Deliverables Week 2:**
- ✅ InlinePoll functional
- ✅ QuickActions functional
- ✅ ConfirmationPrompt functional
- ✅ All registered
- ✅ Integration tests passing

---

## Week 3: MVP Dashboard Components + Polish

### Day 1: VendorsList + InventoryCard

**VendorsList:** `/web/src/components/fluid-ui/cards/VendorsList.tsx`
- Upgrade from placeholder
- Add Zustand master component pattern
- Grid layout with VendorCard items

**InventoryCard:** `/web/src/components/fluid-ui/cards/InventoryCard.tsx`
- New component
- Add `inventory` table to schema
- CRUD operations

### Day 2: KPIDashboard

**File:** `/web/src/components/dashboard/KPIDashboard.tsx`

- Compute 4 metrics (budget, tasks, days, RSVP)
- Responsive grid layout
- Color-coded status indicators

### Day 3: ProgressSummary + Component Polish

**ProgressSummary:** `/web/src/components/dashboard/ProgressSummary.tsx`
- Circular progress indicator
- Weighted calculation (tasks 70%, milestones 30%)

**Polish all components:**
- Consistent styling (ultra-minimal aesthetic)
- Loading states
- Empty states
- Error boundaries

### Day 4: Integration Testing

**Reference:** `/docs/mvp/MVP_TEST_SCENARIOS.md`

Run all test scenarios:
- Component isolation tests
- Master-detail integration
- AI rendering end-to-end
- Real-time sync
- Multi-user flows

### Day 5: Production Setup

**Tasks:**
1. Component registration complete
2. Dashboard route (`/events/:eventId/dashboard`)
3. LayoutController wired to production
4. Performance audit (Lighthouse > 90)
5. Accessibility audit (axe-core)

**Deliverables Week 3:**
- ✅ All 5 MVP components functional
- ✅ Integration tests passing
- ✅ Production-ready system
- ✅ Dashboard page live

---

## Definition of Done (MVP)

### Functional Requirements
- [ ] Agent can generate task proposals → accepted → tasks created
- [ ] Agent can generate budget proposals → accepted → expenses created
- [ ] Agent can generate vendor suggestions → saved
- [ ] Agent can create polls → users vote → results display
- [ ] User can "show me tasks" → TaskListCard renders
- [ ] User can "show budget" → BudgetSummaryCard renders
- [ ] User can "search vendors" → VendorsList renders
- [ ] User can add inventory items → InventoryCard CRUD works
- [ ] Dashboard shows KPIs + progress

### Technical Requirements
- [ ] All components registered in registry
- [ ] Message schema supports all render types
- [ ] FluidUIMessageRenderer handles all types
- [ ] Convex subscriptions real-time sync working
- [ ] Zustand master-detail patterns functional
- [ ] No console errors in production
- [ ] Lighthouse score > 90
- [ ] axe-core 0 violations

### Testing Requirements
- [ ] 80%+ component test coverage
- [ ] Integration tests for master-detail
- [ ] E2E tests for AI → proposal → acceptance flow
- [ ] Real-time sync tested with multiple users
- [ ] Error scenarios handled gracefully

---

## Post-MVP Backlog

**Not required for MVP launch:**
- Remaining 67 components from FLUID_UI_INTEGRATION_PLAN.md
- Background regex triggers
- Advanced AI features (predictive suggestions)
- Mobile apps
- Vendor marketplace
- Payment processing

**Priority order:**
1. User feedback from MVP testing
2. Performance optimizations
3. Remaining dashboard components
4. Advanced AI interactive components
5. Mobile responsive polish

---

## References

- Architecture: `/docs/delphi-v3.1-refined-architecture.md`
- Full component plan: `/docs/FLUID_UI_INTEGRATION_PLAN.md`
- Component specs: `/docs/mvp/MVP_COMPONENT_SPECS.md`
- Test scenarios: `/docs/mvp/MVP_TEST_SCENARIOS.md`
- Code patterns: `/docs/mvp/MVP_CODE_PATTERNS.md`
