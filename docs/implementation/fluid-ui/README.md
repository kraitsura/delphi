# Fluid UI System - Implementation Overview

**Version:** 1.0
**Last Updated:** November 2025
**Status:** Planning Phase

---

## Executive Summary

The Fluid UI System is a dynamic dashboard generation framework that creates contextual interfaces on-demand for event planning. Unlike traditional static dashboards, Fluid UI composes smart, self-contained components into responsive layouts based on user needs and data context.

### Core Innovation

Instead of hardcoded layouts, the system uses:
- **Declarative Configuration** - Dashboards defined as JSON
- **Component Registry** - Library of smart, data-aware components
- **Layout Engine** - Automatic grid composition with emergent borders
- **Component Communication** - Master-detail patterns via event bus
- **Ultrathin Aesthetic** - Minimal design with emergent borders and symbols

### Technology Stack

**Frontend:**
- React 18+ with TanStack Router
- TypeScript (strict mode)
- Tailwind CSS + Custom CSS Grid
- shadcn/ui component primitives
- Convex real-time backend

**Key Libraries:**
- Zod - Runtime validation
- marked + DOMPurify - Safe HTML rendering
- react-window - List virtualization
- @dnd-kit - Drag-and-drop
- recharts - Data visualization

---

## Implementation Phases

### Phase 1: Foundation & Layout System
**Duration:** 2 weeks | **Priority:** Critical

Build the core infrastructure for dynamic dashboard generation.

**Key Deliverables:**
- Type system and validation (Zod schemas)
- Layout Controller component
- Component registry system
- Ultrathin minimal CSS design
- Convex dashboard storage

**Success Criteria:**
✅ Render dashboard from JSON config
✅ Two-row constraint enforced
✅ Emergent borders working
✅ Mobile responsive
✅ Component registry functional

**[Read Full Documentation →](./phase-1-foundation-layout-system.md)**

---

### Phase 2: Component Library
**Duration:** 3 weeks | **Priority:** High

Create 17 smart, self-contained components covering all database entities.

**Component Breakdown:**
- **Event Components (2):** EventDetails, UpcomingEvents
- **Task Components (2):** TasksList, TasksKanban
- **Budget Components (3):** ExpensesSummary, ExpensesList, UpcomingPayments
- **Timeline Components (2):** Timeline, MilestoneTracker
- **People Components (4):** VendorsList, VendorDetails, GuestList, RSVPStatus
- **Collaboration Components (3):** RoomActivity, PollsList, PollResults
- **Calendar Component (1):** CalendarView

**Key Features:**
- Self-fetching with Convex queries
- Loading, error, and empty states
- Complete metadata definitions
- Real-time reactive updates

**Success Criteria:**
✅ All 17 components implemented
✅ Each component self-fetches data
✅ Props validation working
✅ Follows ultrathin aesthetic

**[Read Full Documentation →](./phase-2-component-library.md)**

---

### Phase 3: Component Communication
**Duration:** 2 weeks | **Priority:** High

Enable components to communicate via event bus for master-detail relationships.

**Key Deliverables:**
- Event bus implementation (pub/sub)
- React hooks (useComponentEvents)
- Connection auto-detection
- Visual connection indicators
- Filter coordination

**Master-Detail Pairs:**
- VendorsList → ExpensesList
- TasksList → TaskDetails
- CategoryPicker → Multiple details
- PollsList → PollResults

**Success Criteria:**
✅ Event bus functional
✅ 3+ master-detail pairs working
✅ Connection detection automatic
✅ No memory leaks
✅ <50ms event propagation

**[Read Full Documentation →](./phase-3-component-communication.md)**

---

### Phase 5: Polish & Advanced Features
**Duration:** 2 weeks | **Priority:** Medium

Optimize performance, enhance visuals, and add advanced capabilities.

**Key Deliverables:**

**Performance:**
- Component lazy loading
- List virtualization (react-window)
- Memoization strategy
- Convex query optimization
- Bundle size optimization

**Visual Design:**
- Enhanced typography system
- Smooth animations (fade-in, shimmer, pulse)
- Micro-interactions
- Perfect dark mode

**Advanced Features:**
- Drag-and-drop (TasksKanban)
- Interactive charts (recharts)
- PDF export (jsPDF + html2canvas)
- CSV export

**User Personalization:**
- Preference storage (theme, density, animations)
- Favorite components
- Default dashboards per event type

**Production Readiness:**
- Error boundaries
- Performance monitoring (Sentry)
- Analytics (PostHog/Mixpanel)
- Documentation (TypeDoc)

**Success Criteria:**
✅ <500ms dashboard render
✅ 60fps animations
✅ Drag-drop working smoothly
✅ Export functionality complete
✅ Error boundaries catching failures

**[Read Full Documentation →](./phase-5-polish-advanced-features.md)**

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard Config (JSON)                 │
│  { sections: [ TextSection | RowSection ] }                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Layout Controller (React)                       │
│  • Validates configuration                                   │
│  • Renders grid structure                                    │
│  • Instantiates components from registry                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│   TextRow        │        │    GridRow       │
│  (Markdown/HTML) │        │  (CSS Grid)      │
└──────────────────┘        └────────┬─────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  ComponentRenderer   │
                          │  (Registry Lookup)   │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Smart Component     │
                          │  (Fetches own data)  │
                          └──────────────────────┘
```

### Data Flow

```
User/Agent creates dashboard config
         │
         ▼
    Validation Layer (Zod schemas)
         │
         ▼
    Layout Controller
         │
         ├─→ TextRow Renderer
         │
         └─→ GridRow Renderer
               │
               └─→ ComponentRenderer
                     │
                     └─→ Smart Component
                           │
                           └─→ Convex Query (real-time)
```

### Component Communication

```
Master Component                Detail Component
    │                                │
    │ User selects item              │
    ├───────────────────────────────▶│
    │  emit("vendorSelected")        │ Listen to event
    │                                 │
    │                                 ├─→ Update filters
    │                                 │
    │                                 └─→ Re-fetch data
```

---

## Design Philosophy

### Ultrathin Minimal Aesthetic

**Visual Principles:**
- Borderless components with emergent borders only at intersections
- Font weight: 300-400 (ultrathin base), 600 for emphasis only
- No shadows, no gradients, sharp edges
- Pure black on white (dark mode: white on black)
- Generous whitespace with 8px grid system

**Symbol Library:**
```
■ Black Square       - Primary sections, categories
● Black Circle       - Bullets, status markers
▲ Triangle Up        - Increase, priority, up-trend
▼ Triangle Down      - Decrease, down-trend
→ Arrow Right        - Actions, next steps, flow
← Arrow Left         - Back, previous
⚡ Thunderbolt       - Urgent, important, high-priority
⬢ Hexagon           - Unique items, special designations
━ Heavy Line        - Visual separators
✓ Check Mark        - Completed, confirmed
```

**Typography Scale:**
```
H1: 2rem (32px) | Weight: 300 | Letter-spacing: -0.02em
H2: 1.5rem (24px) | Weight: 400 | Letter-spacing: -0.01em
H3: 1.25rem (20px) | Weight: 400
Body: 1rem (16px) | Weight: 300 | Line-height: 1.6
Small: 0.875rem (14px) | Weight: 300
```

### Two-Row Architecture

Maximum 2 component rows per dashboard section:
- Reduces cognitive load
- Ensures mobile responsiveness
- Simplifies agent decision-making
- Maintains performance

**Layout Structure:**
```
┌─────────────────────────────────────────────┐
│  Text Row: Agent-generated header           │
├─────────────────────────────────────────────┤
│  Component Row 1: Full or split (1-3 cols)  │
├─────────────────────────────────────────────┤
│  Text Row: Section separator                │
├─────────────────────────────────────────────┤
│  Component Row 2: Full or split (1-3 cols)  │
└─────────────────────────────────────────────┘
```

---

## File Structure

```
web/src/
├── lib/fluid-ui/
│   ├── types.ts                    # Core TypeScript interfaces
│   ├── validators.ts               # Zod validation schemas
│   ├── registry.ts                 # Component registry
│   ├── component-metadata.ts       # Metadata types
│   ├── layout-calculator.ts        # Layout logic
│   ├── symbols.ts                  # Symbol library
│   ├── typography.ts               # Typography utils
│   ├── event-bus.ts                # Pub/sub system
│   ├── EventBusContext.tsx         # React context
│   ├── connections.ts              # Connection detection
│   └── hooks/
│       └── useComponentEvents.ts   # Event hooks
│
├── components/fluid-ui/
│   ├── LayoutController.tsx        # Main orchestrator
│   ├── TextRow.tsx                 # Text section renderer
│   ├── GridRow.tsx                 # Component row
│   ├── ComponentRenderer.tsx       # Component lookup
│   ├── ComponentSkeleton.tsx       # Loading states
│   ├── DashboardError.tsx          # Error display
│   ├── ConnectionIndicator.tsx     # Visual feedback
│   └── PreferencesPanel.tsx        # User settings
│
├── components/dashboard/
│   ├── index.ts                    # Component registration
│   ├── EventDetails.tsx
│   ├── UpcomingEvents.tsx
│   ├── TasksList.tsx
│   ├── TasksKanban.tsx
│   ├── ExpensesSummary.tsx
│   ├── ExpensesList.tsx
│   ├── UpcomingPayments.tsx
│   ├── Timeline.tsx
│   ├── MilestoneTracker.tsx
│   ├── VendorsList.tsx
│   ├── VendorDetails.tsx
│   ├── GuestList.tsx
│   ├── RSVPStatus.tsx
│   ├── RoomActivity.tsx
│   ├── PollsList.tsx
│   ├── PollResults.tsx
│   ├── CalendarView.tsx
│   └── CategoryPicker.tsx
│
├── styles/
│   ├── fluid-ui.css                # Core styles
│   └── fluid-ui-animations.css     # Animations
│
└── hooks/
    ├── useDashboard.ts             # Dashboard state
    ├── useUserPreferences.ts       # User settings
    └── use-debounced-value.ts      # Debounce utility

web/convex/
├── dashboards.ts                   # Dashboard CRUD
├── userPreferences.ts              # User preferences
└── schema.ts                       # Updated schema
```

---

## Implementation Timeline

| Phase | Duration | Start | End | Priority |
|-------|----------|-------|-----|----------|
| Phase 1: Foundation | 2 weeks | Week 1 | Week 2 | Critical |
| Phase 2: Components | 3 weeks | Week 3 | Week 5 | High |
| Phase 3: Communication | 2 weeks | Week 6 | Week 7 | High |
| Phase 5: Polish | 2 weeks | Week 8 | Week 9 | Medium |

**Total Timeline:** 9 weeks (~2 months)

---

## Database Schema Updates

### New Tables

**dashboards:**
```typescript
dashboards: defineTable({
  eventId: v.id("events"),
  userId: v.id("users"),
  config: v.any(), // DashboardConfig JSON
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_event_and_user", ["eventId", "userId"])
  .index("by_user", ["userId"])
  .index("by_event", ["eventId"])
```

**userPreferences:**
```typescript
userPreferences: defineTable({
  userId: v.id("users"),
  displayDensity: v.union(v.literal("compact"), v.literal("comfortable"), v.literal("spacious")),
  favoriteComponents: v.array(v.string()),
  defaultDashboards: v.record(v.string(), v.string()),
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  enableAnimations: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
```

---

## Example Dashboard Configurations

### Budget Overview Dashboard

```json
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>■ Wedding Budget Overview</h1><p>Total allocated: <strong>$40,000</strong></p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "2:1",
      "components": [
        {
          "type": "ExpensesSummary",
          "props": { "eventId": "evt_123", "showChart": true },
          "id": "expenses-summary"
        },
        {
          "type": "UpcomingPayments",
          "props": { "eventId": "evt_123", "daysAhead": 30 },
          "id": "upcoming-payments"
        }
      ]
    },
    {
      "type": "text",
      "content": "<h2>● Expense Breakdown</h2><p>Detailed view by category</p>",
      "spacing": "tight"
    },
    {
      "type": "row",
      "layout": "auto",
      "components": [
        {
          "type": "ExpensesList",
          "props": { "eventId": "evt_123", "showFilters": true },
          "id": "expenses-list"
        }
      ]
    }
  ]
}
```

### Vendor Management Dashboard

```json
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>■ Vendor Management</h1><p>Select a vendor to view their expenses and communication</p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "sidebar",
      "components": [
        {
          "type": "VendorsList",
          "props": { "eventId": "evt_123" },
          "id": "vendors-master"
        },
        {
          "type": "ExpensesList",
          "props": { "eventId": "evt_123" },
          "id": "expenses-detail"
        }
      ]
    }
  ]
}
```

### Task Planning Dashboard

```json
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>■ Task Planning</h1><p><strong>25 tasks</strong> total • 8 pending • 12 in progress • 5 completed</p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "1:1",
      "components": [
        {
          "type": "CategoryPicker",
          "props": {},
          "id": "category-picker"
        },
        {
          "type": "TasksList",
          "props": { "eventId": "evt_123", "showFilters": true },
          "id": "tasks-list"
        }
      ]
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests
- Validation schemas (Zod)
- Layout calculations
- Event bus functionality
- Component metadata
- Connection detection

### Integration Tests
- Dashboard rendering from config
- Master-detail communication
- Real-time data updates
- Component lifecycle

### E2E Tests
- Complete user workflows
- Dashboard creation and editing
- Component interactions
- Filter coordination
- Export functionality

### Performance Tests
- Dashboard render time
- Component load time
- Real-time update latency
- Memory leak detection
- Bundle size monitoring

---

## Success Metrics

### Phase 1
✅ Layout controller renders <100ms
✅ 100% validation coverage
✅ Zero TypeScript errors

### Phase 2
✅ All 17 components functional
✅ <2s component load time
✅ Real-time updates working

### Phase 3
✅ Event bus latency <50ms
✅ 3+ master-detail pairs
✅ Zero memory leaks

### Phase 5
✅ Dashboard render <500ms
✅ 60fps animations
✅ User satisfaction >90%

---

## Risk Mitigation

### High-Risk Areas

**1. Performance at Scale**
- Risk: Dashboard slow with many components
- Mitigation: Lazy loading, virtualization, memoization
- Fallback: Pagination, data limits

**2. Component Complexity**
- Risk: Components become tightly coupled
- Mitigation: Strict metadata, clear interfaces
- Fallback: Refactor as services

**3. Browser Compatibility**
- Risk: CSS Grid issues in older browsers
- Mitigation: Progressive enhancement
- Fallback: Flexbox layouts

### Medium-Risk Areas

**1. Event Bus Memory Leaks**
- Mitigation: Proper cleanup, automated tests

**2. Mobile Responsiveness**
- Mitigation: Mobile-first CSS, device testing

**3. Dark Mode Consistency**
- Mitigation: CSS variables, systematic testing

---

## Future Enhancements (Post-Launch)

### Advanced Agent Integration
- Natural language dashboard generation
- Query understanding and intent detection
- Conversational refinement
- Self-improving recommendations

### Real-Time Collaboration
- Multiple users on same dashboard
- Live cursor tracking
- Collaborative filtering

### Advanced Visualizations
- Gantt charts for timeline
- Heatmaps for activity
- Network graphs for relationships

### Mobile App
- Native iOS/Android apps
- Offline support
- Push notifications

### Export & Sharing
- Public dashboard sharing
- Scheduled email reports
- Embedded dashboards

---

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Convex account
- Git

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd delphi/web

# Install dependencies
bun install

# Start Convex dev
cd ../packages/backend
bunx convex dev

# Start web app
cd ../../web
bun run dev
```

### First Dashboard

1. Navigate to `/dashboard`
2. Create new event
3. Add first dashboard
4. Select components from registry
5. Configure layout
6. Save and view!

---

## Support & Resources

**Documentation:**
- [Phase 1: Foundation](./phase-1-foundation-layout-system.md)
- [Phase 2: Components](./phase-2-component-library.md)
- [Phase 3: Communication](./phase-3-component-communication.md)
- [Phase 5: Polish](./phase-5-polish-advanced-features.md)

**References:**
- [FLUiD Architecture Design](../../architecure/FLUiD_UI_ARCHITECTURE_DESIGN.md)
- [AI Features Plan](../../architecure/features/ai-powered-feature-implementation-plan.md)
- [Database & CRUD](../phase-1-database-and-crud.md)

**Community:**
- GitHub Issues (bug reports)
- GitHub Discussions (questions)
- Team Slack (internal)

---

## Contributing

### Development Workflow

1. Create feature branch
2. Implement changes
3. Write tests
4. Update documentation
5. Submit PR with detailed description

### Code Standards

- TypeScript strict mode
- Prettier formatting
- ESLint rules
- Component tests required
- Documentation required for new features

### Commit Convention

```
feat: Add TasksKanban drag-drop
fix: Correct event bus memory leak
docs: Update Phase 2 component specs
perf: Optimize ExpensesList rendering
test: Add integration tests for master-detail
```

---

**Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 - Foundation & Layout System
**Target Launch:** 9 weeks from start
**Maintainers:** Engineering Team

---

*This is a living document. Update as implementation progresses and requirements evolve.*
