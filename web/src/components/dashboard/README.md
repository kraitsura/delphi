# Dashboard Component Library - Phase 2

This directory contains all 17 dashboard components for the Fluid UI system, organized by category.

## Implementation Status: ✅ Complete

All components have been implemented according to the Phase 2 specification.

## Component Categories

### 1. Event Components (2)
- ✅ **EventDetails** - `EventDetails.tsx` - Comprehensive event information with status and budget
- ✅ **UpcomingEvents** - `UpcomingEvents.tsx` - List multiple events with sorting and filtering

### 2. Task Components (2)
- ✅ **TasksList** - `TasksList.tsx` - Filterable task list with inline actions
- ✅ **TasksKanban** - `TasksKanban.tsx` - Kanban board view with status columns

### 3. Budget Components (3)
- ✅ **ExpensesSummary** - `ExpensesSummary.tsx` - Financial overview with budget tracking
- ✅ **ExpensesList** - `ExpensesList.tsx` - Detailed expense table
- ✅ **UpcomingPayments** - `UpcomingPayments.tsx` - Payment timeline and due dates

### 4. Timeline Components (2)
- ✅ **Timeline** - `Timeline.tsx` - Visual timeline of events and deadlines
- ✅ **MilestoneTracker** - `MilestoneTracker.tsx` - Progress tracker for key milestones

### 5. People Components (4)
- ⚠️ **VendorsList** - `VendorsList.tsx` - Vendor directory (placeholder - needs schema)
- ⚠️ **VendorDetails** - `VendorDetails.tsx` - Single vendor view (placeholder - needs schema)
- ⚠️ **GuestList** - `GuestList.tsx` - Guest management (placeholder - needs schema)
- ⚠️ **RSVPStatus** - `RSVPStatus.tsx` - RSVP summary (placeholder - needs schema)

### 6. Collaboration Components (3)
- ✅ **RoomActivity** - `RoomActivity.tsx` - Recent messages across event rooms
- ✅ **PollsList** - `PollsList.tsx` - Active polls requiring votes
- ✅ **PollResults** - `PollResults.tsx` - Poll results visualization

### 7. Calendar Component (1)
- ✅ **CalendarView** - `CalendarView.tsx` - Month/week calendar view

## Component Architecture

Each component follows this structure:

```typescript
// Props interface with typed eventId
interface ComponentProps {
  eventId: Id<"events">;
  // ... other props
}

// Main component with data fetching
export function Component(props) {
  const data = useQuery(api.entity.list, { eventId: props.eventId });

  if (data === undefined) return <Skeleton />;
  if (!data) return <EmptyState />;

  return <ComponentUI data={data} {...props} />;
}

// Metadata for Fluid UI registry
export const ComponentMetadata = {
  name: "ComponentName",
  description: "What it does",
  layoutRules: { ... },
  connections: { ... },
  props: { ... },
};
```

## Usage

### Import Components

```typescript
import {
  EventDetails,
  TasksList,
  ExpensesSummary,
  // ... other components
} from "@/components/dashboard";
```

### Register Components

```typescript
import { registerDashboardComponents } from "@/components/dashboard";

// Call on app initialization
registerDashboardComponents();
```

### Use in Fluid UI

```tsx
<EventDetails eventId={eventId} showBudget={true} />
<TasksList eventId={eventId} status="in_progress" sortBy="dueDate" />
<ExpensesSummary eventId={eventId} showChart={true} />
```

## Styling

All components use:
- Ultrathin font weight (300) as default
- Symbol library for consistent icons
- CSS variables from theme system
- Responsive grid layouts
- Status-based color coding

Custom styles are defined in `web/src/styles/fluid-ui.css`.

## Component States

Each component handles:
1. **Loading** - Skeleton UI while data fetches
2. **Empty** - User-friendly message when no data
3. **Error** - Graceful error handling
4. **Data** - Fully rendered with data

## Data Fetching

All components use Convex's `useQuery` for:
- Real-time updates
- Automatic re-rendering on data changes
- Optimistic UI updates (where applicable)

## Dependencies

### Backend Queries Required

Fully Implemented:
- ✅ `api.events.getById`
- ✅ `api.events.listUserEvents`
- ✅ `api.tasks.listByEvent`
- ✅ `api.expenses.listByEvent`
- ✅ `api.rooms.listByEvent`
- ✅ `api.messages.getRecentByEvent`
- ✅ `api.polls.listByEvent`
- ✅ `api.polls.getById`
- ✅ `api.pollVotes.listByPoll`

Placeholder (Need Implementation):
- ⚠️ `api.guests.*` - Guest management queries
- ⚠️ `api.users.getVendorsByEvent` - Vendor queries
- ⚠️ Vendor relationship schema

## Next Steps

### Phase 3: Component Communication
- Implement master-detail patterns
- Set up event bus for component interactions
- Enable components to emit/listen to selection events

### Schema Extensions Needed
1. **Guests Table** - For GuestList and RSVPStatus components
2. **Vendor Relationships** - Link users with vendor role to events
3. **Vendor Categories** - Vendor categorization system

### Enhancements (Phase 5)
- Drag-and-drop for TasksKanban
- Advanced charts for budget visualization
- Export functionality for all lists
- Inline editing for components

## Testing

Each component should have:
- Unit tests for data handling
- Loading state tests
- Empty state tests
- Integration tests in dashboard context

Test files should be created in:
`web/src/components/dashboard/__tests__/`

## Notes

- People components (Vendors, Guests) are implemented as placeholders
- They display informative messages about schema requirements
- Full functionality will be available once backend schemas are implemented
- All other components are fully functional and ready to use
- Components follow the ultrathin minimal aesthetic as specified
- Real-time updates work out of the box via Convex

## Component Metadata

All components export metadata for the Fluid UI registry:
- Layout rules (canShare, mustSpanFull, etc.)
- Connection capabilities (master/detail patterns)
- Prop definitions with types and descriptions

Access all metadata via:
```typescript
import { getDashboardComponentsMetadata } from "@/components/dashboard";
```

---

**Built:** Phase 2 Implementation
**Status:** Ready for Integration
**Total Components:** 17 (13 functional, 4 placeholders)
