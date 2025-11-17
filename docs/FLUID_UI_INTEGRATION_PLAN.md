# Fluid UI System: Integration Plan & Implementation Roadmap

**Version:** 1.0
**Date:** November 16, 2025
**Status:** Active Development Plan
**Purpose:** Comprehensive integration analysis of Fluid UI system with Delphi v3.1 architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Integration](#system-architecture-integration)
3. [Database Schema Status](#database-schema-status)
4. [Component Implementation Matrix](#component-implementation-matrix)
5. [Critical Path: AI Message Rendering](#critical-path-ai-message-rendering)
6. [Component Migration & Updates](#component-migration--updates)
7. [New Components Required](#new-components-required)
8. [Convex Backend Requirements](#convex-backend-requirements)
9. [Production Setup Tasks](#production-setup-tasks)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Testing Strategy](#testing-strategy)
12. [Appendices](#appendices)

---

## Executive Summary

### Current Implementation Status

**Overall Progress: 43% Complete**

| Component | Status | Completion |
|-----------|--------|------------|
| **Zustand Store System** | ✅ Complete | 100% |
| **Component Registry** | ✅ Complete | 100% |
| **Convex Backend (CRUD)** | ✅ Complete | 100% |
| **Dashboard Components** | ⚠️ Partial | 43% (31/72) |
| **Zustand Integration** | ⚠️ Minimal | 23% (3/13) |
| **AI Message Rendering** | ❌ Not Started | 0% |
| **Production Setup** | ❌ Not Started | 0% |
| **Proposal UI** | ❌ Not Started | 0% |

### Critical Blockers for AI Integration

**🚨 High Priority (Blocking AI-Driven UI):**

1. **Message Schema Missing AI Rendering Fields**
   - Impact: AI cannot inject interactive components into chat
   - Blocks: All AI interactive features, dynamic dashboards in chat
   - Effort: 2 days

2. **DynamicMessageRenderer Not Implemented**
   - Impact: No way to render AI-generated component configs
   - Blocks: Chat-based dashboard injection, proposal displays
   - Effort: 3 days

3. **13 AI Interactive Components Missing**
   - Impact: AI cannot ask questions or get user input inline
   - Blocks: InlinePoll, QuickActions, ConfirmationPrompt, etc.
   - Effort: 2 weeks

4. **Production Component Registration Missing**
   - Impact: Components can't be used outside testbed
   - Blocks: Dashboard pages, production deployment
   - Effort: 1 day

### Timeline Estimate

**Minimum Viable Product (AI-Driven UI):** 4 weeks
**Full Feature Completion (72 components):** 9 weeks
**Production Ready:** 10 weeks

---

## System Architecture Integration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELPHI v3.1 ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Cloudflare Durable Objects (Agent Worker)             │    │
│  │  • RoomOrchestratorDO (message handling)               │    │
│  │  • UnifiedDelphiAgent (AI decision making)             │    │
│  │  • Proposal generation & context-aware intent          │    │
│  └────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│                   Generates AI Responses                         │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Convex Backend (Source of Truth)                      │    │
│  │  • 38 tables (events, tasks, expenses, vendors, etc.)  │    │
│  │  • 53 API files with full CRUD operations              │    │
│  │  • Proposal system ✅                                   │    │
│  │  • Message threading ✅                                 │    │
│  │  • Real-time subscriptions ✅                           │    │
│  │                                                         │    │
│  │  ❌ MISSING: renderType, componentConfig fields         │    │
│  └────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│                   useQuery (reactive)                            │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Zustand Store (UI Orchestration) ✅                    │    │
│  │  • DashboardStoreContext (scoped instances)            │    │
│  │  • Cross-component selections                          │    │
│  │  • Visual state (highlights, animations)               │    │
│  │  • AI interaction state (activePrompts)                │    │
│  │  • DevTools integration                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│                   useDashboardStore (granular)                   │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Components (Fluid UI)                           │    │
│  │  • 31 implemented / 72 total                           │    │
│  │  • Component registry ✅                                │    │
│  │  • Grid layout system ✅                                │    │
│  │                                                         │    │
│  │  ❌ MISSING: DynamicMessageRenderer                     │    │
│  │  ❌ MISSING: AI Interactive components (13)             │    │
│  │  ❌ MISSING: Production registration                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Integration Points

**1. AI Message Flow (INCOMPLETE)**
```
User Message → RoomOrchestratorDO → UnifiedDelphiAgent
→ Generates AIMessageDecision with renderType + componentConfig
→ Saves to Convex messages table (❌ missing schema fields)
→ useQuery updates frontend
→ ❌ DynamicMessageRenderer (NOT IMPLEMENTED)
→ ❌ Renders inline component (NOT WORKING)
```

**2. Proposal Flow (BACKEND ONLY)**
```
User: "Create tasks for photographer, caterer, DJ"
→ Agent detects multi-create intent
→ Generates proposal (✅ works in backend)
→ Saves to Convex proposals table (✅ works)
→ ❌ ProposalCard component (NOT IMPLEMENTED)
→ ❌ User can't see/interact with proposal
```

**3. Dashboard Component Flow (WORKING)**
```
AI generates DashboardConfig
→ Saves to Convex dashboards table (✅ works)
→ useQuery loads config into Zustand (✅ works)
→ LayoutController renders components (❌ not wired to production)
→ Components fetch data via useQuery (✅ works for 31 components)
→ User interactions update Zustand selections (⚠️ only 3 components)
→ Detail components filter based on selections (⚠️ only 3 components)
```

### Integration Requirements

**To fully integrate Fluid UI with Delphi v3.1:**

1. ✅ Convex backend CRUD operations → **COMPLETE**
2. ✅ Zustand store system → **COMPLETE**
3. ✅ Component registry → **COMPLETE**
4. ❌ Message schema extensions → **REQUIRED**
5. ❌ DynamicMessageRenderer → **REQUIRED**
6. ❌ AI interactive components → **REQUIRED**
7. ⚠️ Zustand integration for all components → **PARTIAL**
8. ❌ Production component registration → **REQUIRED**

---

## Database Schema Status

### Schema Audit: 38 Tables Analyzed

**✅ Fully Implemented & Fluid UI Ready (35 tables):**

| Table | Purpose | Fluid UI Support |
|-------|---------|------------------|
| `users` | User profiles with roles | ✅ Ready |
| `events` | Event planning entity | ✅ Ready |
| `eventMembers` | Event membership | ✅ Ready |
| `eventInvitations` | Invitation system | ✅ Ready |
| `rooms` | Chat channels | ✅ Ready |
| `roomParticipants` | Room membership | ✅ Ready |
| `messages` | Real-time chat | ⚠️ **Needs AI fields** |
| `tasks` | Task management | ✅ Ready |
| `expenses` | Budget tracking | ✅ Ready |
| `vendors` | Vendor management | ✅ Ready |
| `taskGroups` | Task organization | ✅ Ready |
| `decisions` | Group decisions | ✅ Ready |
| `proposals` | AI batch operations | ✅ Ready |
| `checkpoints` | DO state snapshots | ✅ Ready |
| `guests` | Guest management | ✅ Ready |
| `paymentSchedules` | Payment tracking | ✅ Ready |
| `milestones` | Planning checkpoints | ✅ Ready |
| `timelineEvents` | Day-of schedule | ✅ Ready |
| `announcements` | Guest comms | ✅ Ready |
| `inventory` | Rentals/supplies | ✅ Ready |
| `polls` | Group voting | ✅ Ready |
| `pollVotes` | Poll responses | ✅ Ready |
| `dashboards` | Fluid UI configs | ✅ Ready |
| `agentResponses` | AI tracking | ✅ Ready |
| `agentState` | DO state | ✅ Ready |
| *(+10 more)* | Various entities | ✅ Ready |

### Critical Schema Updates Required

**❌ Messages Table - Missing AI Rendering Fields**

**Current Schema:**
```typescript
messages: defineTable({
  roomId: v.id("rooms"),
  authorId: v.id("users"),
  text: v.string(),
  threadId: v.optional(v.id("messages")),
  parentMessageId: v.optional(v.id("messages")),
  replyCount: v.number(),

  // ✅ HAS: AI metadata (intent, confidence, agentType, toolsUsed, structuredData)
  aiMetadata: v.optional(v.object({...})),

  // ❌ MISSING: Rendering instructions
  // renderType: v.optional(v.union(
  //   v.literal("text"),
  //   v.literal("component_grid"),
  //   v.literal("interactive_prompt"),
  //   v.literal("mixed")
  // )),

  // ❌ MISSING: Component configuration
  // componentConfig: v.optional(v.object({
  //   layout: v.string(),
  //   components: v.array(v.object({
  //     id: v.string(),
  //     type: v.string(),
  //     props: v.any(),
  //   })),
  // })),

  // ❌ MISSING: Interactive prompt data
  // interactivePrompt: v.optional(v.object({
  //   promptType: v.union(
  //     v.literal("poll"),
  //     v.literal("confirmation"),
  //     v.literal("quickActions"),
  //     v.literal("multiChoice")
  //   ),
  //   data: v.any(),
  //   expiresAt: v.optional(v.number()),
  //   responses: v.optional(v.array(v.object({
  //     userId: v.id("users"),
  //     response: v.any(),
  //     timestamp: v.number(),
  //   }))),
  // })),
})
```

**Schema Migration Checklist:**

- [ ] Add `renderType` field to messages table
- [ ] Add `componentConfig` field to messages table
- [ ] Add `interactivePrompt` field to messages table
- [ ] Update `messages.ts` mutations to accept new fields
- [ ] Create `messages:createAIMessage` mutation
- [ ] Create `messages:respondToInteractivePrompt` mutation
- [ ] Add indexes for `renderType` queries
- [ ] Update TypeScript types in convex/_generated/

**Impact:** Blocks all AI message rendering features

---

## Component Implementation Matrix

### Complete Catalog: 72 Components

**Legend:**
- ✅ **Complete** - Fully implemented, production-ready
- ⚠️ **Partial** - Exists but needs updates (Zustand, Convex, etc.)
- 🔨 **Placeholder** - Stub exists, needs full implementation
- ❌ **Missing** - Not implemented

### Category 1: Data Display (9 components)

| # | Component | Status | Zustand | Convex Query | Grid Size | Priority | Notes |
|---|-----------|--------|---------|--------------|-----------|----------|-------|
| 1 | EventDetails | ✅ Complete | None | `api.events.getById` | 1x1 | P0 | web/src/components/dashboard/EventDetails.tsx |
| 2 | BudgetSummary | ❌ Missing | - | Need `api.expenses.getSummary` | 1x1 | P0 | Spec defined, not implemented |
| 3 | TaskSummary | ❌ Missing | - | Need `api.tasks.getSummary` | 1x1 | P1 | Spec defined, not implemented |
| 4 | VendorDirectory | 🔨 Placeholder | None | `api.vendors.listByEvent` | 1x2 | P1 | web/src/components/dashboard/VendorsList.tsx |
| 5 | GuestList | 🔨 Placeholder | None | `api.guests.listByEvent` | 2x2 | P2 | web/src/components/dashboard/GuestList.tsx |
| 6 | ActivityFeed | ✅ Complete | None | `api.messages.getRecentByEvent` | 1x2 | P1 | web/src/components/dashboard/RoomActivity.tsx |
| 7 | DecisionLog | ❌ Missing | - | Need `api.decisions.listByEvent` | 1x2 | P2 | Spec defined, not implemented |
| 8 | PaymentSchedule | ✅ Complete | None | `api.paymentSchedules.*` | 1x1 | P1 | web/src/components/dashboard/UpcomingPayments.tsx |
| 9 | DocumentLibrary | ❌ Missing | - | Need file storage queries | 2x2 | P2 | Spec defined, not implemented |

**Category Summary:** 3/9 complete (33%), 2 placeholders, 4 missing

---

### Category 2: Interactive Selection (9 components)

| # | Component | Status | Updates Zustand | Reads Convex | Grid Size | Priority | Notes |
|---|-----------|--------|-----------------|--------------|-----------|----------|-------|
| 1 | TasksByPhase | ✅ Complete | `phase`, `taskId` | `api.tasks.listByEvent` | 1x2 | P0 | web/src/components/dashboard/TasksByPhase.tsx |
| 2 | TasksByVendor | ✅ Complete | `vendorId`, `taskId` | `api.tasks.listByEvent` | 1x2 | P0 | web/src/components/dashboard/TasksByVendor.tsx |
| 3 | ExpensesByCategory | ⚠️ Partial | **NEEDS** `category` | `api.expenses.listByEvent` | 1x2 | P0 | Exists as ExpensesSummary, needs Zustand write |
| 4 | VendorSelector | ❌ Missing | - | Need vendor query | 1x1 | P1 | Spec defined, not implemented |
| 5 | PhaseNavigator | ❌ Missing | - | Phase data from event | 2x1 | P1 | Spec defined, not implemented |
| 6 | CategoryFilter | ❌ Missing | - | Category list | 1x1 | P1 | Spec defined, not implemented |
| 7 | DateRangePicker | ❌ Missing | - | None (UI only) | 1x1 | P1 | Spec defined, not implemented |
| 8 | TeamRoster | ❌ Missing | - | `api.eventMembers.*` | 1x1 | P2 | Spec defined, not implemented |
| 9 | MilestoneTimeline | ✅ Complete | `milestoneId` | `api.milestones.*` | 2x1 | P1 | web/src/components/dashboard/MilestoneTimeline.tsx |

**Category Summary:** 3/9 complete (33%), 1 partial, 5 missing

---

### Category 3: Detail/Filter Components (8 components)

| # | Component | Status | Reads Zustand | Reads Convex | Grid Size | Priority | Notes |
|---|-----------|--------|---------------|--------------|-----------|----------|-------|
| 1 | ExpensesList | ✅ Complete | `category`, `vendorId` | `api.expenses.listByEvent` | 1x2 | P0 | web/src/components/dashboard/ExpensesList.tsx |
| 2 | TasksList | ✅ Complete | `phase`, `vendorId` | `api.tasks.listByEvent` | 1x2 | P0 | web/src/components/dashboard/TasksList.tsx |
| 3 | TasksKanban | ⚠️ Partial | **NEEDS** `phase`, `assigneeId` | `api.tasks.listByEvent` | 2x2 | P1 | Exists, needs Zustand read |
| 4 | TaskGanttChart | ⚠️ Partial | **NEEDS** `phase`, `dateRange` | `api.tasks.listByEvent` | 2x2 | P2 | Exists, needs Zustand read |
| 5 | VendorTaskBoard | ⚠️ Partial | **NEEDS** `vendorId` | `api.tasks.listByEvent` | 1x2 | P1 | Exists, needs Zustand read |
| 6 | ExpenseDetails | ❌ Missing | - | `api.expenses.getById` | 1x2 | P2 | Spec defined, not implemented |
| 7 | TaskDetails | ❌ Missing | - | `api.tasks.getById` | 1x2 | P2 | Spec defined, not implemented |
| 8 | VendorProfile | 🔨 Placeholder | `vendorId` | `api.vendors.getById` | 1x1 | P2 | web/src/components/dashboard/VendorDetails.tsx |

**Category Summary:** 2/8 complete (25%), 3 partial, 2 missing, 1 placeholder

---

### Category 4: AI Interactive Components (13 components)

**❌ ALL MISSING - Critical for AI Integration**

| # | Component | Purpose | Interaction | Grid Size | Priority | Implementation Spec |
|---|-----------|---------|-------------|-----------|----------|---------------------|
| 1 | InlinePoll | AI-generated polls | User votes, results update | 1x1 | P0 | Poll options, vote tracking, real-time results |
| 2 | ConfirmationPrompt | Yes/No/Maybe questions | User confirms/denies | 1x1 | P0 | Action description, confirm/deny/defer buttons |
| 3 | PermissionRequest | AI access requests | User grants/denies | 1x1 | P0 | Permission scope, grant/deny buttons |
| 4 | QuickActions | AI-suggested actions | User clicks action | 1x1 | P0 | Action list, icon support, callback handlers |
| 5 | MultiChoice | 2-5 choice selection | User selects options | 1x1 | P0 | Option list, single/multi select, submit |
| 6 | SliderInput | Numeric range | User adjusts slider | 1x1 | P1 | Min/max/step, value display, onChange |
| 7 | DateSelector | Date/time picker | User picks date | 1x1 | P1 | Calendar UI, time selection, timezone |
| 8 | FileUploadPrompt | File requests | User uploads file | 1x1 | P1 | File type filter, upload progress, preview |
| 9 | TextPrompt | Open-ended input | User types response | 1x1 | P1 | Text area, character limit, submit |
| 10 | RatingInput | 1-5 star rating | User clicks stars | 1x1 | P2 | Star UI, half-star support, submit |
| 11 | LocationPicker | Address input | User enters location | 1x1 | P2 | Address autocomplete, map preview |
| 12 | ColorPicker | Color selection | User picks color | 1x1 | P2 | Color palette, hex input, preview |
| 13 | BudgetSplitSelector | Split adjustment | User drags percentages | 1x2 | P1 | Drag UI, percentage display, validation |

**Category Summary:** 0/13 complete (0%) - **Highest Priority Work**

**Required for Each Component:**
- Props interface with base fields (`id`, `eventId`, `messageId`)
- Zustand integration (add/remove from `activePrompts`)
- Convex mutation to save response
- Response validation
- Expired state handling
- Multi-user synchronization (see responses from others)

---

### Category 5: Input/Form Components (7 components)

| # | Component | Status | Convex Mutation | Grid Size | Priority | Notes |
|---|-----------|--------|-----------------|-----------|----------|-------|
| 1 | TaskCreator | ❌ Missing | `api.tasks.create` | 1x1 | P1 | Quick task entry form |
| 2 | ExpenseCreator | ❌ Missing | `api.expenses.create` | 1x1 | P1 | Quick expense form |
| 3 | VendorContactForm | ❌ Missing | `api.vendors.sendMessage` | 1x2 | P2 | Contact vendor UI |
| 4 | GuestInviteForm | ❌ Missing | `api.guests.create` | 1x1 | P2 | Add guest form |
| 5 | BudgetEditor | ❌ Missing | `api.events.updateBudget` | 1x2 | P2 | Budget allocation editor |
| 6 | TaskEditor | ❌ Missing | `api.tasks.update` | 1x2 | P2 | Edit task form |
| 7 | NotesTaker | ❌ Missing | `api.notes.save` | 1x2 | P2 | Free-form notes |

**Category Summary:** 0/7 complete (0%)

---

### Category 6: Visualization Components (10 components)

| # | Component | Status | Data Source | Grid Size | Priority | Notes |
|---|-----------|--------|-------------|-----------|----------|-------|
| 1 | BudgetPieChart | ❌ Missing | `api.expenses.listByEvent` | 1x1 | P1 | Category breakdown chart |
| 2 | SpendingTrendChart | ❌ Missing | `api.expenses.listByEvent` | 2x1 | P1 | Time series line chart |
| 3 | TaskProgressBar | ❌ Missing | `api.tasks.listByEvent` | 1x1 | P0 | Simple progress bar |
| 4 | PhaseProgress | ✅ Complete | `api.tasks.listByEvent` | 2x1 | P0 | web/src/components/dashboard/PhaseProgress.tsx |
| 5 | MilestoneTimeline | ✅ Complete | `api.milestones.*` | 2x1 | P1 | web/src/components/dashboard/MilestoneTimeline.tsx |
| 6 | DeadlineCalendar | ✅ Complete | `api.tasks.listByEvent` | 1x2 | P1 | web/src/components/dashboard/DeadlineCalendar.tsx |
| 7 | GuestRSVPChart | 🔨 Placeholder | `api.guests.listByEvent` | 1x1 | P2 | web/src/components/dashboard/RSVPStatus.tsx |
| 8 | VendorSpendingChart | ❌ Missing | `api.expenses.listByEvent` | 1x1 | P2 | Vendor comparison chart |
| 9 | CalendarView | ✅ Complete | `api.events.get` | 2x2 | P1 | web/src/components/dashboard/CalendarView.tsx |
| 10 | RunOfShowTimeline | ✅ Complete | `api.timelineEvents.*` | 2x2 | P1 | web/src/components/dashboard/RunOfShowTimeline.tsx |

**Category Summary:** 5/10 complete (50%), 1 placeholder, 4 missing

---

### Category 7: Status/Summary Components (8 components)

| # | Component | Status | Metrics | Grid Size | Priority | Notes |
|---|-----------|--------|---------|-----------|----------|-------|
| 1 | KPIDashboard | ❌ Missing | Budget, tasks, days, RSVP | 2x1 | P0 | 4-6 key metrics display |
| 2 | ProgressSummary | ❌ Missing | Overall completion % | 1x1 | P0 | Single progress indicator |
| 3 | UrgentAlerts | ❌ Missing | Overdue tasks, late payments | 1x1 | P0 | Alert list with priority |
| 4 | NextSteps | ❌ Missing | AI-prioritized actions | 1x1 | P0 | Top 3-5 actions |
| 5 | BudgetHealth | ❌ Missing | Budget status | 1x1 | P1 | Over/under/on track |
| 6 | TimelineHealth | ❌ Missing | Schedule status | 1x1 | P1 | Behind/on track/ahead |
| 7 | VendorStatus | ❌ Missing | Vendor responses | 1x1 | P2 | Pending vendor list |
| 8 | CollaboratorActivity | ❌ Missing | User activity | 1x1 | P2 | Active/inactive users |

**Category Summary:** 0/8 complete (0%) - **High Value for AI**

---

### Category 8: Layout/Container Components (8 components)

| # | Component | Status | Purpose | Grid Size | Priority | Notes |
|---|-----------|--------|---------|-----------|----------|-------|
| 1 | GridRow | ✅ Complete | Horizontal layout | Full | P0 | web/src/components/fluid-ui/grid-row.tsx |
| 2 | TextSection | ✅ Complete | Markdown sections | Full | P0 | web/src/components/fluid-ui/text-row.tsx |
| 3 | TabContainer | ❌ Missing | Tabbed panels | Full | P1 | Multi-view switcher |
| 4 | AccordionSection | ❌ Missing | Collapsible sections | Full | P1 | Progressive disclosure |
| 5 | SplitPane | ❌ Missing | Resizable split | Full | P2 | Master-detail layout |
| 6 | ModalOverlay | ❌ Missing | Full-screen modal | Full | P1 | Detail view modal |
| 7 | SidePanel | ❌ Missing | Slide-in panel | 1x Full | P1 | Quick actions panel |
| 8 | FloatingCard | ❌ Missing | Draggable card | Floating | P2 | Persistent info card |

**Category Summary:** 2/8 complete (25%), 6 missing

---

### Component Implementation Summary

**Total: 72 Components**

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Complete | 16 | 22% |
| ⚠️ Partial | 4 | 6% |
| 🔨 Placeholder | 3 | 4% |
| ❌ Missing | 49 | 68% |

**By Priority:**
- **P0 (Critical):** 20 components → 5 complete (25%)
- **P1 (High):** 31 components → 9 complete (29%)
- **P2 (Medium):** 21 components → 2 complete (10%)

**Zustand Integration:**
- **Integrated:** 3 components (TasksList, ExpensesSummary, PollResults)
- **Needs Integration:** 13 components
- **Not Applicable:** 15 components (display only)

---

## Critical Path: AI Message Rendering

### Overview

The AI Message Rendering system is the **#1 blocker** for AI-driven UI features. It enables the AI to:
- Inject interactive components into chat (polls, confirmations, quick actions)
- Display dashboard components inline with messages
- Create proposals that users can review and accept
- Ask questions and collect responses from multiple users

**Current Status:** 0% implemented
**Impact:** Blocks all AI interactive features
**Estimated Effort:** 2 weeks

---

### Implementation Phases

#### Phase 1: Schema Updates (2 days)

**Task 1.1: Add AI Rendering Fields to Messages Table**

Update `web/convex/schema.ts`:

```typescript
messages: defineTable({
  // ... existing fields ...

  // NEW FIELDS:
  renderType: v.optional(v.union(
    v.literal("text"),
    v.literal("component_grid"),
    v.literal("interactive_prompt"),
    v.literal("mixed")
  )),

  componentConfig: v.optional(v.object({
    layout: v.string(),
    components: v.array(v.object({
      id: v.string(),
      type: v.string(),
      props: v.any(),
    })),
  })),

  interactivePrompt: v.optional(v.object({
    promptType: v.union(
      v.literal("poll"),
      v.literal("confirmation"),
      v.literal("quickActions"),
      v.literal("multiChoice")
    ),
    data: v.any(),
    expiresAt: v.optional(v.number()),
    responses: v.optional(v.array(v.object({
      userId: v.id("users"),
      response: v.any(),
      timestamp: v.number(),
    }))),
  })),
})
```

**Task 1.2: Create New Mutations**

In `web/convex/messages.ts`:
- `messages:createAIMessage` - Save AI response with rendering config
- `messages:respondToInteractivePrompt` - Save user responses to prompts

**Task 1.3: Update Agent Worker**

In `agent-worker/src/durable-objects/RoomOrchestratorDO.ts`:
- Update message creation to include `renderType`, `componentConfig`, `interactivePrompt`
- Wire agent response to new schema fields

---

#### Phase 2: DynamicMessageRenderer (3 days)

**Task 2.1: Create Base Renderer Component**

File: `web/src/components/messages/DynamicMessageRenderer.tsx`

**Requirements:**
- Accept `message` prop with new schema fields
- Switch on `renderType` to determine rendering strategy
- Render text, components, interactive prompts, or mixed layouts
- Wrap component grids in `DashboardStoreProvider` (scoped Zustand)
- Handle errors gracefully (show text fallback)

**Task 2.2: Create Sub-Renderers**

Files needed:
- `TextMessageRenderer.tsx` - Simple text display
- `ComponentGridMessageRenderer.tsx` - Render component grid inline
- `InteractivePromptMessageRenderer.tsx` - Render interactive components
- `MixedMessageRenderer.tsx` - Text + components

**Task 2.3: Integrate with MessageList**

Update `web/src/components/messages/message-list.tsx`:
- Replace current message rendering with `DynamicMessageRenderer`
- Pass full message object with new fields
- Handle real-time updates to `interactivePrompt.responses`

---

#### Phase 3: AI Interactive Components (2 weeks)

**P0 Components (Week 1):**

1. **InlinePoll** (`web/src/components/dashboard/ai-interactive/InlinePoll.tsx`)
   - Props: question, options, allowMultiple, deadline, responses
   - UI: Option list with radio/checkbox inputs
   - Actions: Submit vote, view results
   - Backend: `api.messages.respondToInteractivePrompt`

2. **QuickActions** (`web/src/components/dashboard/ai-interactive/QuickActions.tsx`)
   - Props: actions array (label, icon, callback)
   - UI: Horizontal button row
   - Actions: Execute action, mark as responded
   - Backend: `api.messages.respondToInteractivePrompt`

3. **ConfirmationPrompt** (`web/src/components/dashboard/ai-interactive/ConfirmationPrompt.tsx`)
   - Props: question, description
   - UI: Yes/No/Maybe buttons
   - Actions: Confirm/deny/defer
   - Backend: `api.messages.respondToInteractivePrompt`

4. **MultiChoice** (`web/src/components/dashboard/ai-interactive/MultiChoice.tsx`)
   - Props: question, options (2-5), allowMultiple
   - UI: Option cards with descriptions
   - Actions: Select options, submit
   - Backend: `api.messages.respondToInteractivePrompt`

5. **PermissionRequest** (`web/src/components/dashboard/ai-interactive/PermissionRequest.tsx`)
   - Props: permission scope, reason
   - UI: Permission details with grant/deny buttons
   - Actions: Grant/deny permission
   - Backend: `api.messages.respondToInteractivePrompt`

**P1 Components (Week 2):**

6. **SliderInput** - Numeric range selector
7. **DateSelector** - Calendar date picker
8. **TextPrompt** - Open-ended text input
9. **BudgetSplitSelector** - Percentage allocation UI

**P2 Components (Future):**

10-13. RatingInput, FileUploadPrompt, LocationPicker, ColorPicker

**Common Patterns for All Interactive Components:**

```typescript
interface BaseInteractiveProps {
  id: string;
  messageId: Id<"messages">;
  hasResponded: boolean;
  expiresAt?: number;
}

// Each component:
// 1. Checks hasResponded - show results if true
// 2. Handles expiration - disable if expired
// 3. Saves response via mutation
// 4. Updates Zustand activePrompts
// 5. Shows real-time responses from other users
```

---

#### Phase 4: Component Grid Rendering (2 days)

**Task 4.1: Update ComponentGridMessageRenderer**

Requirements:
- Read `componentConfig.layout` (e.g., "2:1", "1:1")
- Read `componentConfig.components` array
- Use existing `GridRow` component to render layout
- Wrap in `DashboardStoreProvider` for isolated Zustand state

**Task 4.2: Test Component Rendering in Chat**

Test scenarios:
- Single component (1x1)
- Two components side-by-side (2:1 or 1:1)
- Multiple rows of components
- Components with Zustand interactions (master-detail)
- Ensure Zustand isolation (multiple component grids don't conflict)

---

### Success Criteria

**Phase 1 Complete:**
- ✅ Message schema includes `renderType`, `componentConfig`, `interactivePrompt`
- ✅ Mutations exist to create AI messages and save responses
- ✅ Agent worker sends new schema fields to Convex

**Phase 2 Complete:**
- ✅ DynamicMessageRenderer switches on `renderType`
- ✅ Text messages render normally
- ✅ Component grids render inline with isolated Zustand state
- ✅ Interactive prompts render appropriate component
- ✅ MessageList uses DynamicMessageRenderer

**Phase 3 Complete:**
- ✅ 5 P0 AI interactive components functional
- ✅ Users can respond to polls, confirmations, quick actions
- ✅ Responses saved to Convex
- ✅ Real-time updates show other users' responses
- ✅ Expired prompts handled gracefully

**Phase 4 Complete:**
- ✅ AI can inject dashboard components into chat
- ✅ Multiple component grids coexist without state conflicts
- ✅ Master-detail patterns work within chat components

---

## Component Migration & Updates

### Components Needing Zustand Integration

**10 components need Zustand read/write integration:**

#### Master Components (Need to WRITE to Zustand)

1. **ExpensesByCategory** (currently ExpensesSummary)
   - File: `web/src/components/dashboard/ExpensesSummary.tsx`
   - Current: ✅ Already writes `selections.category`
   - Status: **COMPLETE** ✅

2. **VendorSelector** (not implemented)
   - Status: **MISSING** ❌
   - Needs: Write `selections.vendorId` on click

3. **PhaseNavigator** (not implemented)
   - Status: **MISSING** ❌
   - Needs: Write `selections.phase` on click

4. **CategoryFilter** (not implemented)
   - Status: **MISSING** ❌
   - Needs: Write `selections.category` on click

5. **DateRangePicker** (not implemented)
   - Status: **MISSING** ❌
   - Needs: Write `selections.dateRange` on change

6. **TeamRoster** (not implemented)
   - Status: **MISSING** ❌
   - Needs: Write `selections.assigneeId` on click

---

#### Detail Components (Need to READ from Zustand)

7. **TasksKanban**
   - File: `web/src/components/dashboard/TasksKanban.tsx`
   - Current: No Zustand integration
   - Needs: Read `selections.phase`, `selections.assigneeId`
   - Filter tasks based on selections
   - **Effort:** 30 minutes

8. **TaskGanttChart**
   - File: `web/src/components/dashboard/TaskGanttChart.tsx`
   - Current: No Zustand integration
   - Needs: Read `selections.phase`, `selections.dateRange`
   - Filter tasks based on selections
   - **Effort:** 30 minutes

9. **VendorTaskBoard**
   - File: `web/src/components/dashboard/VendorTaskBoard.tsx`
   - Current: No Zustand integration
   - Needs: Read `selections.vendorId`
   - Filter tasks to selected vendor
   - **Effort:** 20 minutes

10. **VendorProfile** (placeholder)
    - File: `web/src/components/dashboard/VendorDetails.tsx`
    - Current: Placeholder
    - Needs: Read `selections.vendorId`
    - Show vendor details for selected vendor
    - **Effort:** 1 hour

---

### Migration Pattern Template

**For Master Components:**

```typescript
export function MasterComponent(props: MasterComponentProps) {
  // Zustand integration
  const selectedItem = useDashboardStore((state) => state.selections.itemId);
  const select = useDashboardStore((state) => state.select);
  const clearSelection = useDashboardStore((state) => state.clearSelection);

  // Convex query
  const items = useQuery(api.items.listByEvent, { eventId: props.eventId });

  // Handle selection
  const handleItemClick = (itemId: string) => {
    const newSelection = selectedItem === itemId ? null : itemId;
    if (newSelection) {
      select("itemId", newSelection);
    } else {
      clearSelection("itemId");
    }
  };

  // Render with visual feedback
  return (
    <div>
      {items?.map((item) => {
        const isSelected = selectedItem === item._id;
        return (
          <div
            key={item._id}
            className={isSelected ? "border-primary bg-primary/5" : ""}
            onClick={() => handleItemClick(item._id)}
          >
            {isSelected && "→ "}
            {item.name}
          </div>
        );
      })}
    </div>
  );
}
```

**For Detail Components:**

```typescript
export function DetailComponent(props: DetailComponentProps) {
  // Zustand integration
  const selectedItem = useDashboardStore((state) => state.selections.itemId);
  const selectedCategory = useDashboardStore((state) => state.selections.category);

  // Convex query
  const items = useQuery(api.items.listByEvent, { eventId: props.eventId });

  // Filter based on selections
  const filtered = useMemo(() => {
    if (!items) return [];
    let result = items;

    if (selectedItem) {
      result = result.filter(i => i._id === selectedItem);
    }

    if (selectedCategory) {
      result = result.filter(i => i.category === selectedCategory);
    }

    return result;
  }, [items, selectedItem, selectedCategory]);

  // Render filtered results
  return (
    <div>
      {filtered.map((item) => (
        <div key={item._id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

### Selection Highlighting Standards

**Visual feedback for selected items:**

```css
/* Selected state */
.selected-item {
  border: 1px solid hsl(var(--accent));
  background: hsl(var(--accent) / 0.05);
}

/* Hover state */
.selectable-item:hover {
  border-color: hsl(var(--accent) / 0.5);
  background: hsl(var(--accent) / 0.02);
}

/* Selection indicator */
.selection-arrow {
  display: inline-block;
  margin-right: 8px;
  color: hsl(var(--accent));
}
```

**Zustand-driven highlights:**

```typescript
// In master component
const highlightComponent = useDashboardStore((state) => state.highlightComponent);

// When selection changes, highlight related detail component
useEffect(() => {
  if (selectedVendor) {
    highlightComponent("vendor-expenses-list", 2000); // 2 second highlight
  }
}, [selectedVendor, highlightComponent]);
```

---

### Migration Checklist

**For Each Component:**

- [ ] Add Zustand imports
- [ ] Add selection state hooks (read or write)
- [ ] Implement selection handlers (master) or filtering (detail)
- [ ] Add visual feedback for selected state
- [ ] Export updated metadata with Zustand integration details
- [ ] Test in isolation (testbed)
- [ ] Test with connected components (master-detail pairs)
- [ ] Update component registry
- [ ] Document in component catalog

---

## New Components Required

### Summary: 49 Missing Components

**By Priority:**
- **P0:** 15 components (needed for MVP)
- **P1:** 22 components (needed for full feature set)
- **P2:** 12 components (nice-to-have)

**By Category:**
- **AI Interactive:** 13 components (highest priority)
- **Status/Summary:** 8 components
- **Input/Form:** 7 components
- **Layout/Container:** 6 components
- **Data Display:** 4 components
- **Interactive Selection:** 5 components
- **Detail/Filter:** 2 components
- **Visualization:** 4 components

---

### High-Priority New Components (P0 - 15 components)

#### AI Interactive (5 components) - **CRITICAL**

1. **InlinePoll**
   - Purpose: AI-generated polls in chat
   - Props: `question`, `options`, `allowMultiple`, `deadline`
   - Convex: `api.messages.respondToInteractivePrompt`
   - Complexity: Medium

2. **QuickActions**
   - Purpose: AI-suggested action buttons
   - Props: `actions` (array of {label, icon, callback})
   - Convex: `api.messages.respondToInteractivePrompt`
   - Complexity: Low

3. **ConfirmationPrompt**
   - Purpose: Yes/No/Maybe confirmations
   - Props: `question`, `description`
   - Convex: `api.messages.respondToInteractivePrompt`
   - Complexity: Low

4. **MultiChoice**
   - Purpose: 2-5 choice selection
   - Props: `question`, `options`, `allowMultiple`
   - Convex: `api.messages.respondToInteractivePrompt`
   - Complexity: Medium

5. **PermissionRequest**
   - Purpose: AI access requests
   - Props: `permission`, `reason`
   - Convex: `api.messages.respondToInteractivePrompt`
   - Complexity: Low

---

#### Status/Summary (4 components) - **HIGH VALUE**

6. **KPIDashboard**
   - Purpose: 4-6 key metrics at a glance
   - Metrics: Budget (spent/total), Tasks (complete/total), Days remaining, RSVP count
   - Grid: 2x1
   - Convex: Multiple queries (events, tasks, expenses, guests)
   - Complexity: Medium

7. **ProgressSummary**
   - Purpose: Overall event completion percentage
   - Display: Single large percentage with breakdown
   - Grid: 1x1
   - Convex: `api.tasks.listByEvent`, `api.expenses.listByEvent`
   - Complexity: Low

8. **UrgentAlerts**
   - Purpose: Overdue tasks and late payments
   - Display: Prioritized alert list with action buttons
   - Grid: 1x1
   - Convex: `api.tasks.listByEvent`, `api.paymentSchedules.listByEvent`
   - Complexity: Medium

9. **NextSteps**
   - Purpose: AI-prioritized action items
   - Display: Top 3-5 recommended actions
   - Grid: 1x1
   - Convex: AI-generated from current event state
   - Complexity: High (requires AI analysis)

---

#### Data Display (2 components)

10. **BudgetSummary**
    - Purpose: Budget overview with pie chart
    - Display: Total/spent/remaining + category breakdown
    - Grid: 1x1
    - Convex: `api.expenses.listByEvent`, `api.events.getById`
    - Complexity: Medium

11. **TaskSummary**
    - Purpose: Task counts by status
    - Display: Compact card with status badges
    - Grid: 1x1
    - Convex: `api.tasks.listByEvent`
    - Complexity: Low

---

#### Visualization (2 components)

12. **TaskProgressBar**
    - Purpose: Simple task completion progress
    - Display: Progress bar with percentage
    - Grid: 1x1
    - Convex: `api.tasks.listByEvent`
    - Complexity: Low

13. **BudgetPieChart**
    - Purpose: Category spending breakdown
    - Display: Pie chart with legend
    - Grid: 1x1
    - Convex: `api.expenses.listByEvent`
    - Complexity: Medium (charting library)

---

#### Interactive Selection (2 components)

14. **VendorSelector**
    - Purpose: Clickable vendor cards
    - Updates: `selections.vendorId`
    - Grid: 1x1
    - Convex: `api.vendors.listByEvent`
    - Complexity: Low

15. **PhaseNavigator**
    - Purpose: Event phase timeline
    - Updates: `selections.phase`
    - Grid: 2x1
    - Convex: Event data (phases from config)
    - Complexity: Medium

---

### Medium-Priority New Components (P1 - 22 components)

*(Full specs available in Fluid UI System Spec - listing summary only)*

**AI Interactive (4):** SliderInput, DateSelector, TextPrompt, BudgetSplitSelector

**Status/Summary (2):** BudgetHealth, TimelineHealth

**Input/Form (4):** TaskCreator, ExpenseCreator, TaskEditor, BudgetEditor

**Layout/Container (4):** TabContainer, AccordionSection, ModalOverlay, SidePanel

**Visualization (2):** SpendingTrendChart, VendorSpendingChart

**Interactive Selection (3):** CategoryFilter, DateRangePicker, MilestoneTimeline

**Detail/Filter (0):** None

**Data Display (3):** VendorDirectory, ActivityFeed, PaymentSchedule

---

### Low-Priority New Components (P2 - 12 components)

*(Future enhancements - listing summary only)*

**AI Interactive (4):** RatingInput, FileUploadPrompt, LocationPicker, ColorPicker

**Status/Summary (2):** VendorStatus, CollaboratorActivity

**Input/Form (3):** VendorContactForm, GuestInviteForm, NotesTaker

**Layout/Container (2):** SplitPane, FloatingCard

**Detail/Filter (2):** ExpenseDetails, TaskDetails

**Data Display (3):** GuestList, DecisionLog, DocumentLibrary

**Visualization (2):** GuestRSVPChart (partial exists), VendorSpendingChart

---

### Implementation Complexity Ratings

**Low Complexity (1-2 hours each):** 15 components
- QuickActions, ConfirmationPrompt, PermissionRequest
- ProgressSummary, TaskProgressBar
- TaskSummary, VendorSelector
- *(+8 more)*

**Medium Complexity (3-6 hours each):** 25 components
- InlinePoll, MultiChoice
- KPIDashboard, UrgentAlerts, BudgetSummary
- BudgetPieChart, PhaseNavigator
- *(+18 more)*

**High Complexity (1-2 days each):** 9 components
- NextSteps (requires AI integration)
- BudgetSplitSelector (complex drag UI)
- TabContainer, ModalOverlay (advanced layout)
- DocumentLibrary (file management)
- *(+4 more)*

---

## Convex Backend Requirements

### API Completeness Analysis

**✅ Fully Implemented (90% of needs):**

All core CRUD operations exist across 53 Convex API files:
- Events, Tasks, Expenses, Vendors, Guests, Polls, Milestones, etc.
- Proposal system with accept/edit/reject
- Helper functions for AI agents
- Real-time subscriptions

**❌ Missing Queries for Component Support:**

1. **Dashboard Summary Queries (Need for KPIDashboard, ProgressSummary)**
   ```typescript
   // web/convex/dashboard.ts (NEW FILE)

   export const getSummaryMetrics = query({
     args: { eventId: v.id("events") },
     handler: async (ctx, args) => {
       // Aggregate:
       // - Budget: spent, committed, remaining, percent
       // - Tasks: total, complete, in-progress, blocked
       // - Days: daysUntilEvent, daysInPlanning
       // - RSVP: confirmed, pending, declined
       return { budget, tasks, timeline, rsvp };
     }
   });
   ```

2. **Urgent Items Query (Need for UrgentAlerts)**
   ```typescript
   // web/convex/alerts.ts (NEW FILE)

   export const getUrgentItems = query({
     args: { eventId: v.id("events") },
     handler: async (ctx, args) => {
       // Return:
       // - Overdue tasks (dueDate < now, status != completed)
       // - Late payments (dueDate < now, status != paid)
       // - Expiring decisions (deadline approaching, low votes)
       return { overdueTasks, latePayments, expiringDecisions };
     }
   });
   ```

3. **Next Steps AI Query (Need for NextSteps component)**
   ```typescript
   // Requires AI integration - agent generates recommendations
   // Based on: current event state, incomplete tasks, budget, timeline
   ```

4. **Category Aggregation (Need for charts)**
   ```typescript
   // web/convex/expenses.ts (ADD TO EXISTING)

   export const getCategoryBreakdown = query({
     args: { eventId: v.id("events") },
     handler: async (ctx, args) => {
       const expenses = await ctx.db
         .query("expenses")
         .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
         .collect();

       // Group by category, sum amounts
       return categoryTotals;
     }
   });
   ```

5. **Vendor Aggregation (Need for vendor charts)**
   ```typescript
   // web/convex/vendors.ts (ADD TO EXISTING)

   export const getVendorSpending = query({
     args: { eventId: v.id("events") },
     handler: async (ctx, args) => {
       // Join vendors with expenses, sum by vendor
       return vendorSpending;
     }
   });
   ```

---

### Performance Optimizations Needed

**Current Issues:**
- No aggregation queries (components compute in frontend)
- No caching for expensive calculations
- No indexes for common query patterns

**Recommended Optimizations:**

1. **Add Aggregation Queries**
   - Move computation from frontend to backend
   - Cache results in Convex
   - Use scheduled functions to pre-compute

2. **Add Indexes**
   ```typescript
   // web/convex/schema.ts

   tasks: defineTable({...})
     .index("by_event_and_status", ["eventId", "status"])
     .index("by_event_and_phase", ["eventId", "phase"])
     .index("by_event_and_vendor", ["eventId", "vendorId"])
     .index("by_due_date", ["dueDate"])  // For overdue queries

   expenses: defineTable({...})
     .index("by_event_and_category", ["eventId", "category"])
     .index("by_event_and_vendor", ["eventId", "vendorId"])
   ```

3. **Scheduled Aggregations**
   ```typescript
   // Run every 5 minutes to update dashboard cache
   crons.hourly("update-dashboard-metrics", async (ctx) => {
     const activeEvents = await getActiveEvents(ctx);
     for (const event of activeEvents) {
       await updateCachedMetrics(ctx, event._id);
     }
   });
   ```

---

### Proposal UI Backend Needs

**✅ Backend Complete:**
- `proposals:create` - Create proposal
- `proposals:getById` - Get proposal
- `proposals:listByRoom` - List room proposals
- `proposals:confirm` - Accept/edit/reject

**❌ Frontend Exposure Missing:**
- No UI components to display proposals
- No inline rendering in chat
- No editing modal

**Solution:**
- Build ProposalCard component (AI Interactive category)
- Integrate with DynamicMessageRenderer
- Use existing backend mutations

---

## Production Setup Tasks

### Component Registration

**Current State:**
- ✅ Testbed registration exists: `web/src/lib/testbed/register-components.ts`
- ❌ Production registration missing

**Required: Production Registration File**

File: `web/src/lib/fluid-ui/register-production-components.ts`

```typescript
import { registerComponent } from './registry';

// Import all production components
import EventDetails, { EventDetailsMetadata } from '../components/dashboard/EventDetails';
import TasksList, { TasksListMetadata } from '../components/dashboard/TasksList';
// ... import all 31+ components

// Register all components
export function registerAllComponents() {
  registerComponent('EventDetails', EventDetails, EventDetailsMetadata);
  registerComponent('TasksList', TasksList, TasksListMetadata);
  // ... register all components
}
```

**Usage:**
```typescript
// In app entry point (main.tsx or layout)
import { registerAllComponents } from './lib/fluid-ui/register-production-components';

registerAllComponents();
```

---

### Dashboard Page Setup

**Required: Dashboard Route with Fluid UI**

File: `web/src/routes/_authed/events.$eventId.dashboard.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { DashboardStoreProvider } from '../../../lib/fluid-ui/DashboardStoreContext';
import { LayoutController } from '../../../components/fluid-ui/layout-controller';

export const Route = createFileRoute('/_authed/events/$eventId/dashboard')({
  component: EventDashboard,
});

function EventDashboard() {
  const { eventId } = Route.useParams();

  // Load dashboard config from Convex
  const dashboardConfig = useQuery(api.dashboards.getByEvent, {
    eventId: eventId as Id<"events">,
  });

  if (!dashboardConfig) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardStoreProvider>
      <LayoutController config={dashboardConfig} eventId={eventId} />
    </DashboardStoreProvider>
  );
}
```

---

### LayoutController Integration

**Current State:**
- ✅ LayoutController exists: `web/src/components/fluid-ui/layout-controller.tsx`
- ⚠️ Not wired to any production routes

**Requirements:**
- Connect to dashboard route
- Load config from Zustand (populated by useQuery)
- Render GridRow and TextSection components
- Handle empty state (no dashboard config)

**Integration Checklist:**
- [ ] Create dashboard route
- [ ] Wire LayoutController to route
- [ ] Create default dashboard config (if none exists)
- [ ] Add dashboard navigation to event page
- [ ] Test with sample dashboard config

---

### AI-Generated Dashboard Flow

**End-to-End Flow:**

```
User in chat: "Show me vendor tasks and expenses"
→ Message sent to RoomOrchestratorDO
→ UnifiedDelphiAgent analyzes intent
→ Agent generates DashboardConfig:
  {
    sections: [
      { type: "text", content: "# Vendor Overview" },
      { type: "row", layout: "2:1", components: [
          { type: "TasksByVendor", props: {...} },
          { type: "ExpensesList", props: {...} }
        ]
      }
    ]
  }
→ Agent saves config: api.dashboards.create()
→ Agent responds with message:
  {
    renderType: "mixed",
    text: "Here's your vendor dashboard:",
    componentConfig: { ... }  // Same as dashboard config
  }
→ Frontend receives message
→ DynamicMessageRenderer renders inline components
→ User clicks "View Full Dashboard" button
→ Navigate to /events/{eventId}/dashboard
→ Dashboard page loads same config, renders full view
```

**Required Integration Points:**
1. Agent must generate dashboard configs
2. Message rendering must support inline components
3. Dashboard route must load configs
4. Navigation between chat and dashboard view

---

### Testing & Validation

**Production Setup Tests:**

1. **Component Registration Test**
   - Verify all components registered
   - Verify metadata correct
   - Verify no duplicate registrations

2. **Dashboard Route Test**
   - Dashboard page loads
   - Config query works
   - LayoutController renders
   - Navigation works

3. **AI Dashboard Generation Test**
   - Agent generates valid config
   - Config saves to Convex
   - Dashboard renders from config
   - Components fetch data correctly

4. **Inline Chat Rendering Test**
   - Message with componentConfig renders
   - Components appear inline
   - Zustand state isolated
   - Multiple component grids don't conflict

---

## Implementation Roadmap

### Phase-by-Phase Breakdown

**Total Timeline: 10 weeks**

---

### Phase 1: Message Schema & AI Rendering Foundation (Week 1)

**Goal:** Enable AI to send rendering instructions

**Tasks:**
- [ ] Add `renderType`, `componentConfig`, `interactivePrompt` to messages schema
- [ ] Create `messages:createAIMessage` mutation
- [ ] Create `messages:respondToInteractivePrompt` mutation
- [ ] Update agent worker to send new schema fields
- [ ] Test schema changes with sample data

**Deliverables:**
- Extended message schema
- New Convex mutations
- Agent integration

**Success Criteria:**
- AI can save messages with rendering config
- No breaking changes to existing messages
- Agent tests pass

**Estimated Effort:** 2 days

---

### Phase 2: DynamicMessageRenderer (Week 1)

**Goal:** Frontend can interpret AI rendering instructions

**Tasks:**
- [ ] Create DynamicMessageRenderer component
- [ ] Create TextMessageRenderer
- [ ] Create ComponentGridMessageRenderer
- [ ] Create InteractivePromptMessageRenderer
- [ ] Create MixedMessageRenderer
- [ ] Integrate with MessageList
- [ ] Test all render types

**Deliverables:**
- 5 renderer components
- MessageList integration
- Render type switching logic

**Success Criteria:**
- Text messages render correctly
- Component grids render inline
- Interactive prompts render (even if components don't exist yet)
- No console errors

**Estimated Effort:** 3 days

---

### Phase 3: AI Interactive Components P0 (Week 2)

**Goal:** Build critical interactive components for AI

**Tasks:**
- [ ] InlinePoll component
- [ ] QuickActions component
- [ ] ConfirmationPrompt component
- [ ] MultiChoice component
- [ ] PermissionRequest component
- [ ] Register all 5 components
- [ ] Test response saving
- [ ] Test real-time response updates

**Deliverables:**
- 5 AI interactive components
- Response saving logic
- Multi-user synchronization

**Success Criteria:**
- Users can respond to polls
- Users can click quick actions
- Users can confirm/deny prompts
- Responses save to Convex
- Other users see responses in real-time
- Expired prompts handled gracefully

**Estimated Effort:** 5 days

---

### Phase 4: Production Setup (Week 3)

**Goal:** Wire Fluid UI to production routes

**Tasks:**
- [ ] Create production component registration file
- [ ] Register all existing components
- [ ] Create dashboard route
- [ ] Wire LayoutController to dashboard route
- [ ] Create default dashboard config
- [ ] Add dashboard navigation
- [ ] Test end-to-end flow

**Deliverables:**
- Production registration
- Dashboard route
- Navigation UI
- Default configs

**Success Criteria:**
- All components registered
- Dashboard page loads
- Config-driven rendering works
- Navigation between chat and dashboard works

**Estimated Effort:** 3 days

---

### Phase 5: Component Zustand Migration (Week 3)

**Goal:** Complete Zustand integration for existing components

**Tasks:**
- [ ] Migrate TasksKanban (add Zustand read)
- [ ] Migrate TaskGanttChart (add Zustand read)
- [ ] Migrate VendorTaskBoard (add Zustand read)
- [ ] Migrate VendorProfile (add Zustand read)
- [ ] Test master-detail connections
- [ ] Add selection highlighting
- [ ] Update component metadata

**Deliverables:**
- 4 components migrated
- Selection highlighting
- Updated metadata

**Success Criteria:**
- TasksByVendor → VendorTaskBoard connection works
- TasksByPhase → TasksKanban connection works
- ExpensesSummary → ExpensesList connection works
- Selection highlights detail components

**Estimated Effort:** 2 days

---

### Phase 6: Status & Summary Components (Week 4)

**Goal:** Build high-value dashboard summaries

**Tasks:**
- [ ] KPIDashboard component
- [ ] ProgressSummary component
- [ ] UrgentAlerts component
- [ ] NextSteps component (with AI integration)
- [ ] BudgetSummary component
- [ ] TaskSummary component
- [ ] Create dashboard summary queries
- [ ] Create alerts query
- [ ] Register all components

**Deliverables:**
- 6 status/summary components
- Dashboard summary Convex queries
- Component registration

**Success Criteria:**
- Metrics display correctly
- Urgent items flagged
- AI-generated next steps work
- Real-time updates on data changes

**Estimated Effort:** 5 days

---

### Phase 7: Visualization Components (Week 5)

**Goal:** Build charts and visual progress indicators

**Tasks:**
- [ ] TaskProgressBar component
- [ ] BudgetPieChart component
- [ ] SpendingTrendChart component
- [ ] Add charting library (recharts or visx)
- [ ] Create category aggregation query
- [ ] Create vendor spending query
- [ ] Register all components
- [ ] Test real-time data updates

**Deliverables:**
- 3 visualization components
- Charting library integration
- Aggregation queries

**Success Criteria:**
- Charts render correctly
- Data updates in real-time
- Responsive on different screen sizes
- No performance issues

**Estimated Effort:** 4 days

---

### Phase 8: Interactive Selection Components (Week 6)

**Goal:** Build master components for filtering

**Tasks:**
- [ ] VendorSelector component
- [ ] PhaseNavigator component
- [ ] CategoryFilter component
- [ ] DateRangePicker component
- [ ] Connect to existing detail components
- [ ] Test master-detail flows
- [ ] Register all components

**Deliverables:**
- 4 master selection components
- Master-detail connections
- Component registration

**Success Criteria:**
- Clicking vendor filters all related components
- Clicking phase filters task views
- Category selection filters expenses
- Date range filters timeline views

**Estimated Effort:** 3 days

---

### Phase 9: AI Interactive P1 & Input Forms (Week 7-8)

**Goal:** Complete AI interactive components and input forms

**Tasks:**
- [ ] SliderInput component
- [ ] DateSelector component
- [ ] TextPrompt component
- [ ] BudgetSplitSelector component
- [ ] TaskCreator form
- [ ] ExpenseCreator form
- [ ] TaskEditor form
- [ ] BudgetEditor form
- [ ] Register all components

**Deliverables:**
- 4 AI interactive P1 components
- 4 input/form components
- Component registration

**Success Criteria:**
- AI can request numeric input (slider)
- AI can request dates
- AI can request text responses
- Users can create/edit tasks and expenses quickly

**Estimated Effort:** 8 days

---

### Phase 10: Layout & Container Components (Week 9)

**Goal:** Build advanced layout components

**Tasks:**
- [ ] TabContainer component
- [ ] AccordionSection component
- [ ] ModalOverlay component
- [ ] SidePanel component
- [ ] Test nested component rendering
- [ ] Register all components

**Deliverables:**
- 4 layout/container components
- Nested rendering support
- Component registration

**Success Criteria:**
- Tabs switch correctly
- Accordions expand/collapse
- Modals overlay properly
- Side panels slide in/out

**Estimated Effort:** 4 days

---

### Phase 11: Remaining Components (Week 9-10)

**Goal:** Build P2 components for feature completeness

**Tasks:**
- [ ] Implement remaining 12 P2 components
- [ ] RatingInput, FileUploadPrompt, LocationPicker, ColorPicker (AI interactive)
- [ ] VendorStatus, CollaboratorActivity (status)
- [ ] VendorContactForm, GuestInviteForm, NotesTaker (input)
- [ ] SplitPane, FloatingCard (layout)
- [ ] ExpenseDetails, TaskDetails (detail)
- [ ] Register all components

**Deliverables:**
- 12 P2 components
- Full component catalog (72/72)
- Complete registration

**Success Criteria:**
- All 72 components implemented
- All registered and functional
- Testbed shows full catalog
- No critical bugs

**Estimated Effort:** 6 days

---

### Phase 12: Polish & Optimization (Week 10)

**Goal:** Performance, accessibility, and final testing

**Tasks:**
- [ ] Performance audit (React DevTools Profiler)
- [ ] Accessibility audit (keyboard nav, ARIA, contrast)
- [ ] Mobile responsiveness testing
- [ ] Dark mode testing
- [ ] Cross-browser testing
- [ ] Aggregation query optimization
- [ ] Index optimization
- [ ] Component lazy loading
- [ ] Documentation updates

**Deliverables:**
- Performance optimizations
- Accessibility improvements
- Mobile support
- Complete documentation

**Success Criteria:**
- 90+ Lighthouse score
- WCAG AA compliance
- Works on mobile
- No critical console errors
- Documentation complete

**Estimated Effort:** 4 days

---

### Critical Path

**Fastest path to AI-driven UI (4 weeks):**

```
Week 1: Schema + Renderer → Phase 1 + 2
Week 2: AI Interactive P0 → Phase 3
Week 3: Production Setup + Zustand Migration → Phase 4 + 5
Week 4: Status/Summary Components → Phase 6

Result: AI can inject interactive components into chat, users can respond,
        dashboards work with master-detail selection
```

**Full Feature Completion (10 weeks):**

```
Week 1-4: Critical Path (above)
Week 5: Visualizations → Phase 7
Week 6: Interactive Selection → Phase 8
Week 7-8: AI P1 + Forms → Phase 9
Week 9: Layout Components → Phase 10
Week 9-10: Remaining P2 + Polish → Phase 11 + 12

Result: All 72 components, full AI integration, production-ready
```

---

### Dependencies

**Phase Dependencies:**
- Phase 2 depends on Phase 1 (schema must exist before renderer)
- Phase 3 depends on Phase 2 (renderer must exist before interactive components)
- Phase 4 can run in parallel with Phase 3
- Phase 5 can run in parallel with Phase 4
- Phase 6-12 can run in any order (independent)

**Resource Requirements:**
- 1 frontend developer: Phases 2, 3, 4, 6-12
- 1 backend developer: Phase 1, 5 (can assist with queries)
- Shared: Phase 4 (registration), Phase 5 (Zustand patterns)

---

## Testing Strategy

### Component Testing Approach

**Level 1: Isolation Testing (Testbed)**

File: `web/src/routes/_authed/testbed.tsx`

**Current Status:** ✅ Exists and functional

**Usage:**
- Each component tested in isolation
- Sample data provided via props
- No Convex queries required
- Visual inspection of UI
- Interaction testing (clicks, selections)

**Checklist per Component:**
- [ ] Component renders without errors
- [ ] Props are respected
- [ ] Loading state handled
- [ ] Empty state handled
- [ ] Error state handled
- [ ] Responsive on different sizes
- [ ] Matches design spec (ultra-minimal aesthetic)

---

**Level 2: Integration Testing (Master-Detail)**

**Purpose:** Test Zustand-based component communication

**Test Scenarios:**

1. **Master → Detail Selection**
   - Click item in master component (e.g., TasksByVendor)
   - Verify Zustand `selections.vendorId` updated
   - Verify detail component (e.g., ExpensesList) filters
   - Verify visual highlight on detail component

2. **Multiple Detail Listeners**
   - Click item in master
   - Verify all connected detail components filter
   - Verify no components lose selection state

3. **Selection Clearing**
   - Click selected item again
   - Verify selection cleared in Zustand
   - Verify all detail components show full data

**Test Framework:**
```typescript
// web/src/__tests__/integration/master-detail.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardStoreProvider } from '../../lib/fluid-ui/DashboardStoreContext';
import TasksByVendor from '../../components/dashboard/TasksByVendor';
import ExpensesList from '../../components/dashboard/ExpensesList';

test('clicking vendor filters expenses', () => {
  render(
    <DashboardStoreProvider>
      <TasksByVendor eventId="test" />
      <ExpensesList eventId="test" />
    </DashboardStoreProvider>
  );

  // Click vendor "Acme Photography"
  fireEvent.click(screen.getByText('Acme Photography'));

  // Verify only Acme expenses shown
  expect(screen.queryByText('Other Vendor Expense')).not.toBeInTheDocument();
  expect(screen.getByText('Acme Deposit')).toBeInTheDocument();
});
```

---

**Level 3: AI Rendering End-to-End Testing**

**Purpose:** Test full AI → Convex → Zustand → Component flow

**Test Scenarios:**

1. **AI Generates Component Grid**
   - Mock AI response with `componentConfig`
   - Save to Convex messages table
   - Verify DynamicMessageRenderer receives message
   - Verify components render inline in chat
   - Verify Zustand isolated per component grid

2. **AI Generates Interactive Prompt**
   - Mock AI response with `interactivePrompt` (poll)
   - Save to Convex
   - Verify InlinePoll component renders
   - Submit response
   - Verify response saved to Convex
   - Verify other users see response

3. **AI Generates Proposal**
   - Mock proposal creation
   - Verify ProposalCard renders inline
   - Accept proposal
   - Verify batch operations execute
   - Verify confirmation message posted

**Test Framework:**
```typescript
// web/src/__tests__/e2e/ai-rendering.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider } from 'convex/react';
import MessageList from '../../components/messages/message-list';

test('AI message with component grid renders components', async () => {
  // Mock Convex query returning message with componentConfig
  const mockMessage = {
    _id: "test",
    renderType: "component_grid",
    componentConfig: {
      layout: "1:1",
      components: [
        { type: "TasksList", props: { eventId: "test" } }
      ]
    }
  };

  render(
    <ConvexProvider client={mockConvexClient}>
      <MessageList roomId="test" />
    </ConvexProvider>
  );

  // Verify TasksList component rendered
  await waitFor(() => {
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument();
  });
});
```

---

### Performance Testing

**Metrics to Track:**

1. **Component Render Time**
   - Target: < 100ms initial render
   - Tool: React DevTools Profiler

2. **Zustand Update Propagation**
   - Target: < 16ms (1 frame)
   - Measure: selection update → component re-render

3. **Convex Query Response Time**
   - Target: < 200ms for simple queries
   - Target: < 500ms for aggregations
   - Tool: Convex dashboard

4. **Bundle Size**
   - Target: < 500KB for dashboard code
   - Tool: Vite bundle analyzer

**Performance Optimization Checklist:**
- [ ] Use `useMemo` for expensive filtering
- [ ] Use `useCallback` for event handlers
- [ ] Lazy load components not in viewport
- [ ] Virtualize long lists (react-window)
- [ ] Debounce Zustand updates
- [ ] Use Convex indexes for queries
- [ ] Cache aggregation results

---

### Accessibility Testing

**WCAG AA Compliance Checklist:**

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states visible (outline or border)
- [ ] ARIA labels on interactive elements
- [ ] ARIA live regions for dynamic updates
- [ ] Color contrast meets 4.5:1 ratio
- [ ] No keyboard traps
- [ ] Screen reader tested (VoiceOver/NVDA)

**Keyboard Shortcuts:**
- `Tab` - Navigate between components
- `Enter` - Activate selected item
- `Escape` - Clear selection, close modals
- `Arrow keys` - Navigate within component
- `/` - Focus search/filter

---

### Test Coverage Goals

**Target Coverage:**
- **Unit Tests:** 80% of component logic
- **Integration Tests:** 100% of master-detail pairs
- **E2E Tests:** 100% of AI rendering flows
- **Accessibility:** 100% of interactive components

**Testing Tools:**
- Vitest (unit/integration)
- React Testing Library (component testing)
- Playwright (E2E testing)
- axe-core (accessibility auditing)

---

## Appendices

### Appendix A: Component Quick Reference

**Complete Component Catalog by Status**

**✅ Complete & Production Ready (16):**
1. EventDetails - Event summary card
2. UpcomingEvents - Event list
3. TasksList - Filterable task table
4. TasksKanban - Kanban board
5. ExpensesSummary - Budget overview with category selection
6. ExpensesList - Filterable expense list
7. UpcomingPayments - Payment schedule
8. Timeline - Event timeline
9. MilestoneTracker - Milestone progress
10. RoomActivity - Recent message feed
11. PollsList - Active polls
12. PollResults - Poll result visualization
13. CalendarView - Calendar UI
14. TasksByPhase - Phase-grouped tasks
15. TasksByVendor - Vendor-grouped tasks
16. MilestoneTimeline - Milestone timeline

**⚠️ Partial/Needs Updates (4):**
1. TasksKanban - Needs Zustand read integration
2. TaskGanttChart - Needs Zustand read integration
3. VendorTaskBoard - Needs Zustand read integration
4. ExpensesByCategory - Needs Zustand write integration

**🔨 Placeholders (3):**
1. VendorsList - Needs full implementation
2. VendorDetails - Needs full implementation
3. GuestList - Needs full implementation

**❌ Missing (49):**
- 13 AI Interactive components
- 8 Status/Summary components
- 7 Input/Form components
- 6 Layout/Container components
- 4 Data Display components
- 5 Interactive Selection components
- 2 Detail/Filter components
- 4 Visualization components

---

### Appendix B: Zustand Selector Patterns

**Master Component Pattern (Writes Selection):**

```typescript
const selectedItem = useDashboardStore((state) => state.selections.itemId);
const select = useDashboardStore((state) => state.select);
const clearSelection = useDashboardStore((state) => state.clearSelection);

const handleClick = (id: string) => {
  if (selectedItem === id) {
    clearSelection("itemId");
  } else {
    select("itemId", id);
  }
};
```

**Detail Component Pattern (Reads Selection):**

```typescript
const selectedVendor = useDashboardStore((state) => state.selections.vendorId);
const selectedCategory = useDashboardStore((state) => state.selections.category);

const filtered = useMemo(() => {
  let result = data || [];
  if (selectedVendor) result = result.filter(i => i.vendorId === selectedVendor);
  if (selectedCategory) result = result.filter(i => i.category === selectedCategory);
  return result;
}, [data, selectedVendor, selectedCategory]);
```

**Highlight Pattern (Visual Feedback):**

```typescript
const highlightComponent = useDashboardStore((state) => state.highlightComponent);

useEffect(() => {
  if (selectedItem) {
    highlightComponent("detail-component-id", 2000); // 2s pulse
  }
}, [selectedItem, highlightComponent]);
```

---

### Appendix C: Convex Query Patterns

**Simple Query Pattern:**

```typescript
const data = useQuery(api.table.listByEvent, { eventId });
```

**Filtered Query Pattern:**

```typescript
const data = useQuery(
  api.table.listByEventAndStatus,
  { eventId, status: "active" }
);
```

**Aggregation Query Pattern:**

```typescript
const summary = useQuery(
  api.dashboard.getSummaryMetrics,
  { eventId }
);
// Returns: { budget, tasks, timeline, rsvp }
```

**Real-Time Subscription Pattern:**

```typescript
// Component automatically re-renders when data changes
const messages = useQuery(api.messages.listByRoom, { roomId });

useEffect(() => {
  // Scroll to bottom on new message
  if (messages && messages.length > prevCount) {
    scrollToBottom();
  }
}, [messages]);
```

---

### Appendix D: Schema Field Reference

**Messages Table - AI Rendering Fields:**

| Field | Type | Purpose | Required |
|-------|------|---------|----------|
| `renderType` | `"text" \| "component_grid" \| "interactive_prompt" \| "mixed"` | How to render message | Optional |
| `componentConfig` | `{ layout, components[] }` | Dashboard components to show inline | Optional |
| `interactivePrompt` | `{ promptType, data, responses[] }` | Interactive component config | Optional |

**DashboardConfig Structure:**

```typescript
interface DashboardConfig {
  sections: Array<{
    type: "row" | "text";
    layout?: string;
    content?: string;
    components?: ComponentInstance[];
  }>;
  metadata?: {
    name: string;
    description: string;
    createdBy: "ai" | "user";
  };
}
```

---

### Appendix E: Component Metadata Schema

```typescript
interface ComponentMetadata {
  name: string;
  description: string;
  category: string;

  layoutRules: {
    canShare: boolean;          // Can share row with others
    mustSpanFull: boolean;      // Must span full width
    preferredRatio: string;     // "1fr", "2fr", etc.
    minHeight?: string;
  };

  props: {
    [key: string]: {
      type: string;
      required: boolean;
      default?: any;
    };
  };

  zustandIntegration?: {
    role: "master" | "detail" | "none";
    writes?: string[];          // Zustand keys written
    reads?: string[];           // Zustand keys read
  };

  convexQueries?: string[];     // Required Convex queries
}
```

---

### Appendix F: Implementation Priorities Summary

**Phase 1 (Week 1): Foundation - CRITICAL**
- Message schema updates
- DynamicMessageRenderer
- Blockers removed for AI integration

**Phase 2-3 (Week 2-3): AI Interactive - HIGH PRIORITY**
- 5 P0 AI interactive components
- Production setup
- Zustand migration

**Phase 4-5 (Week 4-5): Dashboard Value - MEDIUM PRIORITY**
- Status/summary components
- Visualizations
- High user value, visible impact

**Phase 6-8 (Week 6-8): Feature Completion - MEDIUM PRIORITY**
- Interactive selection
- AI P1 components
- Input forms
- Full master-detail coverage

**Phase 9-10 (Week 9-10): Polish - LOW PRIORITY**
- Layout components
- P2 components
- Performance optimization
- Accessibility

---

## Summary & Next Steps

### Current State

**Strong Foundations:**
- ✅ Zustand store (100% complete)
- ✅ Component registry (100% complete)
- ✅ Convex backend (90% complete)
- ✅ 16 production-ready components
- ✅ EventBus successfully removed

**Critical Gaps:**
- ❌ AI message rendering (0% complete)
- ❌ AI interactive components (0% complete)
- ❌ Production setup (0% complete)
- ⚠️ Zustand integration (23% complete)
- ⚠️ Component catalog (43% complete)

---

### Recommended Immediate Actions

**This Week (Week 1):**
1. Start Phase 1: Message schema updates
2. Start Phase 2: DynamicMessageRenderer
3. Goal: Enable AI to inject components into chat

**Next Week (Week 2):**
1. Complete Phase 2
2. Start Phase 3: Build 5 P0 AI interactive components
3. Goal: Users can respond to AI polls and confirmations

**Week 3:**
1. Complete Phase 3
2. Start Phase 4: Production setup
3. Start Phase 5: Zustand migration
4. Goal: Dashboard page works, master-detail connected

**Week 4:**
1. Complete Phase 4-5
2. Start Phase 6: Status/summary components
3. Goal: Full AI-driven UI functional, high-value dashboards

---

### Success Metrics

**4-Week MVP (AI-Driven UI):**
- ✅ AI can inject interactive components into chat
- ✅ Users can respond to polls, confirmations, quick actions
- ✅ Dashboard page loads from AI-generated configs
- ✅ Master-detail selection works across components
- ✅ Production deployment ready

**10-Week Full Feature:**
- ✅ All 72 components implemented
- ✅ Full Zustand integration (master-detail coverage)
- ✅ Complete AI interactive suite (13 components)
- ✅ Performance optimized (aggregation queries, indexes)
- ✅ Accessibility compliant (WCAG AA)
- ✅ Mobile responsive
- ✅ Production deployed

---

### Resources & Support

**Documentation:**
- This document: Integration plan and component catalog
- Fluid UI System Spec: Design system and patterns
- Delphi v3.1 Architecture: Agent system and DO architecture
- Delphi Scope: Product vision and requirements

**Code References:**
- Zustand Store: `web/src/lib/fluid-ui/store.ts`
- Component Registry: `web/src/lib/fluid-ui/registry.ts`
- Testbed: `web/src/routes/_authed/testbed.tsx`
- Components: `web/src/components/dashboard/`

**Questions or Blockers:**
- Refer to this document for specs
- Check Convex schema for data structure
- Review existing components for patterns
- Test in isolation using testbed

---

**End of Integration Plan**

*This document serves as the comprehensive integration plan for the Delphi Fluid UI system. All implementation work should reference this plan for component specs, priorities, and timelines.*
