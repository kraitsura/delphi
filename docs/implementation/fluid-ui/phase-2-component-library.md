# Phase 2: Component Library
## Smart Data-Fetching Components

**Duration:** 3 weeks (15 working days)
**Priority:** High
**Status:** Not Started
**Dependencies:** Phase 1 complete

---

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Component Specifications](#component-specifications)
4. [Implementation Guide](#implementation-guide)
5. [Data Fetching Patterns](#data-fetching-patterns)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Overview

### What We're Building

Phase 2 creates the complete library of smart, self-contained components that render event planning data. Each component:
- Fetches its own data from Convex
- Handles loading and error states
- Responds to prop changes reactively
- Follows the ultrathin minimal aesthetic
- Includes complete metadata for registry

### Database Entities Covered

Based on the existing schema from `phase-1-database-and-crud.md`:

**Primary Entities:**
- **Events** - Event information, status, dates, location
- **Tasks** - Task management with assignees and deadlines
- **Expenses** - Budget tracking and payment management
- **Vendors** - Vendor directory and contracts (future: via users table)
- **Guests** - Guest list and RSVP tracking (future)
- **Rooms** - Chat channels and activity (for context)
- **Polls** - Decision-making and voting
- **Messages** - Communication timeline (for activity feed)

### Component Categories

**1. Event Components (2)**
- EventDetails - Comprehensive event information
- UpcomingEvents - Multi-event list view

**2. Task Components (2)**
- TasksList - Filterable task list
- TasksKanban - Board view with status columns

**3. Budget Components (3)**
- ExpensesSummary - Financial overview with charts
- ExpensesList - Detailed expense table
- UpcomingPayments - Payment timeline

**4. Timeline Components (2)**
- Timeline - Visual timeline of events and deadlines
- MilestoneTracker - Progress tracker

**5. People Components (4)**
- VendorsList - Vendor directory
- VendorDetails - Single vendor deep-dive
- GuestList - Guest management
- RSVPStatus - RSVP summary

**6. Collaboration Components (3)**
- RoomActivity - Recent room messages
- PollsList - Active polls
- PollResults - Poll results visualization

**7. Calendar Component (1)**
- CalendarView - Month/week calendar view

**Total: 17 components**

---

## Component Architecture

### Smart Component Pattern

Each component follows this structure:

```typescript
interface SmartComponentProps {
  // Core identifier
  eventId: string;

  // Filters (all optional)
  status?: string;
  category?: string;
  assignee?: string;
  dateRange?: { start: number; end: number };

  // Display options
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;

  // Master-detail (Phase 3)
  onSelect?: (item: any) => void;
  selectedId?: string;
}

function SmartComponent(props: SmartComponentProps) {
  // 1. Data fetching with Convex
  const data = useQuery(api.entities.list, {
    eventId: props.eventId,
    ...filters,
  });

  // 2. Loading state
  if (data === undefined) {
    return <ComponentSkeleton />;
  }

  // 3. Error state
  if (data === null) {
    return <ErrorState />;
  }

  // 4. Empty state
  if (data.length === 0) {
    return <EmptyState />;
  }

  // 5. Render data
  return <DataView data={data} {...props} />;
}
```

### Metadata Template

```typescript
const metadata: ComponentMetadata = {
  name: "ComponentName",
  description: "What this component displays",

  layoutRules: {
    canShare: true,           // Can be placed with others?
    mustSpanFull: false,      // Requires full width?
    preferredRatio: "1fr",    // Preferred grid ratio
    minWidth: "300px",        // Minimum width
    minHeight: "200px",       // Minimum height
  },

  connections: {
    canBeMaster: false,       // Emits selection events?
    canBeDetail: false,       // Listens to filter events?
    emits: [],                // Event types emitted
    listensTo: [],            // Event types listened to
  },

  props: {
    eventId: {
      type: "string",
      required: true,
      description: "Event identifier",
    },
    status: {
      type: "enum",
      required: false,
      values: ["pending", "completed"],
      description: "Filter by status",
    },
    // ... other props
  },
};
```

### Visual Design Standards

**Card Structure:**
```tsx
<div className="fluid-component-card">
  {/* Header */}
  <div className="fluid-component-header">
    <h3 className="fluid-component-title">
      {SYMBOLS.BLACK_SQUARE} Title
    </h3>
    <div className="fluid-component-actions">
      {/* Filter toggles, actions */}
    </div>
  </div>

  {/* Content */}
  <div className="fluid-component-content">
    {/* Data visualization */}
  </div>

  {/* Footer (optional) */}
  <div className="fluid-component-footer">
    {/* Summary stats, actions */}
  </div>
</div>
```

**Color Usage:**
- Use CSS variables from theme
- Status colors: success (green), warning (yellow), error (red), info (blue)
- Minimal color - only for status and emphasis
- Ultrathin font weight (300) as default

---

## Component Specifications

### 1. Event Components

#### 1.1 EventDetails

**Purpose:** Display comprehensive event information including status, dates, location, and budget overview.

**Props:**
```typescript
interface EventDetailsProps {
  eventId: string;
  showStatus?: boolean;      // Default: true
  showBudget?: boolean;      // Default: true
  showLocation?: boolean;    // Default: true
  compact?: boolean;         // Default: false
}
```

**Data Fetching:**
```typescript
const event = useQuery(api.events.getById, { eventId: props.eventId });
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: false,
    mustSpanFull: true,     // Needs full width for layout
    preferredRatio: "1fr",
    minHeight: "250px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Hero section with event name and type badge
- 3-column grid: Date | Location | Guest Count
- Budget overview bar (if showBudget)
- Status indicator with color coding
- Quick actions: Edit, Archive, View Rooms

**Implementation File:** `web/src/components/dashboard/EventDetails.tsx`

---

#### 1.2 UpcomingEvents

**Purpose:** List multiple events with sorting and filtering.

**Props:**
```typescript
interface UpcomingEventsProps {
  status?: "planning" | "in_progress" | "completed" | "all";
  limit?: number;            // Default: 5
  sortBy?: "date" | "name" | "status";
  compact?: boolean;
}
```

**Data Fetching:**
```typescript
const events = useQuery(api.events.listUserEvents, {
  status: props.status || "all",
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "350px",
  },
  connections: {
    canBeMaster: true,
    emits: ["eventSelected"],
  },
}
```

**Visual Structure:**
- Scrollable list of event cards
- Each card: Name, Date, Type badge, Status
- Hover effect for selection
- Empty state: "No events yet. Create one!"

**Implementation File:** `web/src/components/dashboard/UpcomingEvents.tsx`

---

### 2. Task Components

#### 2.1 TasksList

**Purpose:** Filterable list view of tasks with inline actions.

**Props:**
```typescript
interface TasksListProps {
  eventId: string;
  status?: "not_started" | "in_progress" | "blocked" | "completed" | "all";
  assignee?: string;         // User ID
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent" | "all";
  dueDate?: number;          // Filter by due date
  limit?: number;
  sortBy?: "dueDate" | "priority" | "status" | "createdAt";
  showFilters?: boolean;     // Default: false
}
```

**Data Fetching:**
```typescript
const tasks = useQuery(api.tasks.listByEvent, {
  eventId: props.eventId,
  status: props.status,
  assignee: props.assignee,
  category: props.category,
  priority: props.priority,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "350px",
  },
  connections: {
    canBeMaster: true,
    canBeDetail: true,
    emits: ["taskSelected", "statusChanged"],
    listensTo: ["categorySelected", "assigneeSelected"],
  },
}
```

**Visual Structure:**
- Header with title, count, filter toggle
- List items with:
  - Task title
  - Status badge (color-coded)
  - Priority indicator (▲ high, ● medium, ▼ low)
  - Assignee avatar
  - Due date (with overdue warning)
  - Quick actions: Complete, Edit, Delete
- Footer with "Add Task" button

**Implementation File:** `web/src/components/dashboard/TasksList.tsx`

---

#### 2.2 TasksKanban

**Purpose:** Kanban board view with drag-and-drop (Phase 5 for drag-drop).

**Props:**
```typescript
interface TasksKanbanProps {
  eventId: string;
  columns?: string[];        // Custom status columns
  groupBy?: "status" | "priority" | "assignee" | "category";
  showCounts?: boolean;      // Default: true
}
```

**Data Fetching:**
```typescript
const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
// Group tasks by status in component
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: false,
    mustSpanFull: true,       // Needs horizontal space
    preferredRatio: "1fr",
    minWidth: "100%",
    minHeight: "400px",
  },
  connections: {
    canBeMaster: true,
    emits: ["taskSelected"],
  },
}
```

**Visual Structure:**
- Horizontal columns: Not Started | In Progress | Blocked | Completed
- Each column shows count
- Task cards with minimal info (title, assignee, due date)
- Overflow scrolling per column
- Drag-and-drop handles (Phase 5)

**Implementation File:** `web/src/components/dashboard/TasksKanban.tsx`

---

### 3. Budget Components

#### 3.1 ExpensesSummary

**Purpose:** Financial overview with total, spent, committed, remaining.

**Props:**
```typescript
interface ExpensesSummaryProps {
  eventId: string;
  showChart?: boolean;       // Default: true
  showCategories?: boolean;  // Default: true
}
```

**Data Fetching:**
```typescript
const event = useQuery(api.events.getById, { eventId: props.eventId });
const expenses = useQuery(api.expenses.listByEvent, { eventId: props.eventId });

// Calculate totals in component
const summary = useMemo(() => ({
  total: event.budget.total,
  spent: event.budget.spent,
  committed: event.budget.committed,
  remaining: event.budget.total - event.budget.spent - event.budget.committed,
  categoryBreakdown: groupByCategory(expenses),
}), [event, expenses]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "2fr",    // Prefers more space
    minWidth: "400px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Header: "■ Budget Overview"
- Progress bar: Spent | Committed | Remaining
- 3 stat cards: Total, Spent, Remaining
- Category breakdown (if showCategories):
  - Bar chart or simple list with percentages
- Health indicator: "On track" / "Over budget" / "At risk"

**Implementation File:** `web/src/components/dashboard/ExpensesSummary.tsx`

---

#### 3.2 ExpensesList

**Purpose:** Detailed expense table with filtering and sorting.

**Props:**
```typescript
interface ExpensesListProps {
  eventId: string;
  category?: string;
  vendor?: string;          // User ID
  paymentStatus?: "pending" | "paid" | "overdue" | "all";
  dateRange?: { start: number; end: number };
  limit?: number;
  sortBy?: "date" | "amount" | "category" | "vendor";
  showFilters?: boolean;
}
```

**Data Fetching:**
```typescript
const expenses = useQuery(api.expenses.listByEvent, {
  eventId: props.eventId,
  category: props.category,
  vendor: props.vendor,
  paymentStatus: props.paymentStatus,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "2fr",
    minWidth: "400px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: true,
    listensTo: ["vendorSelected", "categorySelected"],
  },
}
```

**Visual Structure:**
- Header with filter controls
- Table columns:
  - Date
  - Description
  - Category
  - Amount (with currency formatting)
  - Paid By
  - Status badge
  - Actions (View Receipt, Edit, Delete)
- Footer with total and "Add Expense" button

**Implementation File:** `web/src/components/dashboard/ExpensesList.tsx`

---

#### 3.3 UpcomingPayments

**Purpose:** Timeline of payment due dates.

**Props:**
```typescript
interface UpcomingPaymentsProps {
  eventId: string;
  daysAhead?: number;        // Default: 30
  showOnlyOverdue?: boolean;
  groupBy?: "date" | "vendor";
}
```

**Data Fetching:**
```typescript
const expenses = useQuery(api.expenses.listByEvent, {
  eventId: props.eventId,
  paymentStatus: "pending",
});

// Filter to upcoming in component
const upcoming = useMemo(() => {
  const cutoff = Date.now() + (props.daysAhead || 30) * 24 * 60 * 60 * 1000;
  return expenses.filter(e => e.dueDate && e.dueDate <= cutoff);
}, [expenses, props.daysAhead]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Header: "→ Upcoming Payments" (next 30 days)
- Grouped timeline:
  - Overdue (red)
  - This Week
  - Next Week
  - Later
- Each payment:
  - Vendor name
  - Amount
  - Due date (relative: "in 3 days")
  - Quick pay action

**Implementation File:** `web/src/components/dashboard/UpcomingPayments.tsx`

---

### 4. Timeline Components

#### 4.1 Timeline

**Purpose:** Visual timeline of tasks, events, and deadlines.

**Props:**
```typescript
interface TimelineProps {
  eventId: string;
  startDate?: number;        // Default: today
  endDate?: number;          // Default: event date
  showTasks?: boolean;       // Default: true
  showMilestones?: boolean;  // Default: true
  showEvents?: boolean;      // Default: true
}
```

**Data Fetching:**
```typescript
const event = useQuery(api.events.getById, { eventId: props.eventId });
const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

// Build timeline items in component
const timelineItems = useMemo(() => {
  const items = [];
  // Add tasks with due dates
  // Add milestones
  // Add event date
  return sortByDate(items);
}, [event, tasks]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: false,
    mustSpanFull: true,       // Horizontal layout needs space
    preferredRatio: "1fr",
    minHeight: "300px",
  },
  connections: {
    canBeMaster: true,
    emits: ["taskSelected", "dateSelected"],
  },
}
```

**Visual Structure:**
- Horizontal timeline with date markers
- Items positioned along timeline:
  - Tasks (colored by status)
  - Milestones (hexagon markers)
  - Event date (star marker)
- Hover shows item details
- Click emits selection event

**Implementation File:** `web/src/components/dashboard/Timeline.tsx`

---

#### 4.2 MilestoneTracker

**Purpose:** Track progress through key event milestones.

**Props:**
```typescript
interface MilestoneTrackerProps {
  eventId: string;
  customMilestones?: Array<{
    name: string;
    targetDate: number;
    category: string;
  }>;
}
```

**Data Fetching:**
```typescript
const event = useQuery(api.events.getById, { eventId: props.eventId });
const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

// Define standard milestones
const milestones = [
  { name: "Venue Booked", category: "venue", targetDate: eventDate - 180 },
  { name: "Save-the-Dates Sent", category: "invitations", targetDate: eventDate - 120 },
  { name: "Vendors Confirmed", category: "vendor", targetDate: eventDate - 60 },
  // ...
];
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "350px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Vertical progress bar with milestones
- Each milestone:
  - Name
  - Target date
  - Status: Complete (✓) | In Progress (●) | Not Started
  - Tasks associated with milestone
- Progress percentage at top

**Implementation File:** `web/src/components/dashboard/MilestoneTracker.tsx`

---

### 5. People Components

#### 5.1 VendorsList

**Purpose:** Directory of vendors with contact info and status.

**Props:**
```typescript
interface VendorsListProps {
  eventId: string;
  category?: string;         // Filter by vendor type
  status?: "contacted" | "contracted" | "paid" | "all";
  sortBy?: "name" | "category" | "totalCost";
}
```

**Data Fetching:**
```typescript
// Note: Vendors are users with role="vendor" linked to event
const rooms = useQuery(api.rooms.listByEvent, {
  eventId: props.eventId,
  type: "vendor",
});

// Get vendor users from room participants
const vendors = useQuery(api.users.getVendorsByEvent, {
  eventId: props.eventId,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: true,
    canBeDetail: false,
    emits: ["vendorSelected"],
  },
}
```

**Visual Structure:**
- Searchable/filterable list
- Each vendor card:
  - Name
  - Category badge (catering, photography, etc.)
  - Contact info (phone, email)
  - Total spent
  - Status indicator
- Click emits `vendorSelected` event

**Implementation File:** `web/src/components/dashboard/VendorsList.tsx`

---

#### 5.2 VendorDetails

**Purpose:** Deep-dive into single vendor with contracts and expenses.

**Props:**
```typescript
interface VendorDetailsProps {
  eventId: string;
  vendorId: string;
}
```

**Data Fetching:**
```typescript
const vendor = useQuery(api.users.getById, { userId: props.vendorId });
const expenses = useQuery(api.expenses.listByEvent, {
  eventId: props.eventId,
  paidBy: props.vendorId, // Or vendor field when added
});
const room = useQuery(api.rooms.getVendorRoom, {
  eventId: props.eventId,
  vendorId: props.vendorId,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: false,
    mustSpanFull: true,
    preferredRatio: "1fr",
    minHeight: "400px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: true,
    listensTo: ["vendorSelected"],
  },
}
```

**Visual Structure:**
- Header: Vendor name, category, contact
- Tabs: Overview | Expenses | Communication | Contract
- Overview tab:
  - Total amount
  - Payment schedule
  - Recent activity
- Communication tab shows room messages

**Implementation File:** `web/src/components/dashboard/VendorDetails.tsx`

---

#### 5.3 GuestList

**Purpose:** Guest management with RSVP tracking.

**Props:**
```typescript
interface GuestListProps {
  eventId: string;
  rsvpStatus?: "pending" | "accepted" | "declined" | "all";
  searchQuery?: string;
  sortBy?: "name" | "rsvpStatus" | "groupName";
  showFilters?: boolean;
}
```

**Data Fetching:**
```typescript
// Note: Guests are stored as separate entity (to be added to schema)
const guests = useQuery(api.guests.listByEvent, {
  eventId: props.eventId,
  rsvpStatus: props.rsvpStatus,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "2fr",
    minWidth: "400px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Search and filter controls
- Table/grid view toggle
- Columns:
  - Name
  - RSVP status badge
  - Plus one (Y/N)
  - Dietary restrictions
  - Group/family
  - Actions (Edit, Send Reminder)
- Footer: Guest count summary

**Implementation File:** `web/src/components/dashboard/GuestList.tsx`

---

#### 5.4 RSVPStatus

**Purpose:** RSVP summary and statistics.

**Props:**
```typescript
interface RSVPStatusProps {
  eventId: string;
  showChart?: boolean;
  showBreakdown?: boolean;
}
```

**Data Fetching:**
```typescript
const guests = useQuery(api.guests.listByEvent, { eventId: props.eventId });

const stats = useMemo(() => ({
  total: guests.length,
  accepted: guests.filter(g => g.rsvpStatus === "accepted").length,
  declined: guests.filter(g => g.rsvpStatus === "declined").length,
  pending: guests.filter(g => g.rsvpStatus === "pending").length,
  percentageConfirmed: (accepted / total) * 100,
}), [guests]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Donut chart showing RSVP distribution
- Stats: Total | Accepted | Declined | Pending
- Progress bar for confirmation rate
- "Send Reminders" action for pending

**Implementation File:** `web/src/components/dashboard/RSVPStatus.tsx`

---

### 6. Collaboration Components

#### 6.1 RoomActivity

**Purpose:** Recent messages across all event rooms.

**Props:**
```typescript
interface RoomActivityProps {
  eventId: string;
  roomId?: string;          // Filter to specific room
  limit?: number;           // Default: 10
  showRoomName?: boolean;   // Default: true
}
```

**Data Fetching:**
```typescript
const rooms = useQuery(api.rooms.listByEvent, { eventId: props.eventId });
const messages = useQuery(api.messages.getRecentByEvent, {
  eventId: props.eventId,
  limit: props.limit || 10,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "350px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
}
```

**Visual Structure:**
- Header: "■ Recent Activity"
- Message list (reverse chronological):
  - Author avatar + name
  - Room name (if showRoomName)
  - Message preview (truncated)
  - Timestamp (relative)
- "View All Messages" link

**Implementation File:** `web/src/components/dashboard/RoomActivity.tsx`

---

#### 6.2 PollsList

**Purpose:** Show active polls requiring votes.

**Props:**
```typescript
interface PollsListProps {
  eventId: string;
  status?: "active" | "closed" | "all";
  sortBy?: "deadline" | "createdAt";
  limit?: number;
}
```

**Data Fetching:**
```typescript
const polls = useQuery(api.polls.listByEvent, {
  eventId: props.eventId,
  isClosed: props.status === "closed" ? true : props.status === "active" ? false : undefined,
});
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: true,
    emits: ["pollSelected"],
  },
}
```

**Visual Structure:**
- Header with status toggle (Active | Closed)
- Each poll card:
  - Question
  - Option count
  - Vote count / Participation rate
  - Deadline (if set)
  - Status badge (Active | Closed)
  - Quick vote action

**Implementation File:** `web/src/components/dashboard/PollsList.tsx`

---

#### 6.3 PollResults

**Purpose:** Visualize poll results.

**Props:**
```typescript
interface PollResultsProps {
  pollId: string;
  showVoters?: boolean;      // Default: false
  showPercentages?: boolean; // Default: true
}
```

**Data Fetching:**
```typescript
const poll = useQuery(api.polls.getById, { pollId: props.pollId });
const votes = useQuery(api.pollVotes.listByPoll, { pollId: props.pollId });

const results = useMemo(() => {
  // Calculate vote counts per option
  // Calculate percentages
  return computePollResults(poll, votes);
}, [poll, votes]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "350px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: true,
    listensTo: ["pollSelected"],
  },
}
```

**Visual Structure:**
- Poll question
- Horizontal bar chart for each option:
  - Option text
  - Vote count
  - Percentage bar
  - Winner indicator (✓)
- Footer: Total votes, closed date

**Implementation File:** `web/src/components/dashboard/PollResults.tsx`

---

### 7. Calendar Component

#### 7.1 CalendarView

**Purpose:** Month/week calendar showing event dates and deadlines.

**Props:**
```typescript
interface CalendarViewProps {
  eventId: string;
  view?: "month" | "week";
  currentDate?: number;      // Default: today
  showTasks?: boolean;
  showMilestones?: boolean;
}
```

**Data Fetching:**
```typescript
const event = useQuery(api.events.getById, { eventId: props.eventId });
const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

// Build calendar events
const calendarEvents = useMemo(() => {
  const events = [];
  // Add event date
  events.push({ date: event.date, type: "event", title: event.name });
  // Add task due dates
  tasks.forEach(task => {
    if (task.dueDate) {
      events.push({ date: task.dueDate, type: "task", title: task.title });
    }
  });
  return events;
}, [event, tasks]);
```

**Metadata:**
```typescript
{
  layoutRules: {
    canShare: false,
    mustSpanFull: true,        // Calendar needs width
    preferredRatio: "1fr",
    minHeight: "400px",
  },
  connections: {
    canBeMaster: true,
    emits: ["dateSelected"],
  },
}
```

**Visual Structure:**
- Month/week toggle
- Navigation arrows (← previous, next →)
- Calendar grid:
  - Day numbers
  - Event markers (colored dots)
  - Today indicator
- Hover shows event details
- Click day emits `dateSelected`

**Implementation File:** `web/src/components/dashboard/CalendarView.tsx`

---

## Implementation Guide

### Step 1: Component Registration Setup

Create `web/src/components/dashboard/index.ts` to export all components and register them:

```typescript
import { registerComponent } from "@/lib/fluid-ui/registry";
import { EventDetails, EventDetailsMetadata } from "./EventDetails";
import { UpcomingEvents, UpcomingEventsMetadata } from "./UpcomingEvents";
// ... import all components

/**
 * Register all dashboard components
 */
export function registerDashboardComponents() {
  // Event components
  registerComponent("EventDetails", EventDetails, EventDetailsMetadata);
  registerComponent("UpcomingEvents", UpcomingEvents, UpcomingEventsMetadata);

  // Task components
  registerComponent("TasksList", TasksList, TasksListMetadata);
  registerComponent("TasksKanban", TasksKanban, TasksKanbanMetadata);

  // Budget components
  registerComponent("ExpensesSummary", ExpensesSummary, ExpensesSummaryMetadata);
  registerComponent("ExpensesList", ExpensesList, ExpensesListMetadata);
  registerComponent("UpcomingPayments", UpcomingPayments, UpcomingPaymentsMetadata);

  // ... register all 17 components
}
```

Call in app initialization:

```typescript
// web/src/routes/__root.tsx
import { registerDashboardComponents } from "@/components/dashboard";

// Register on app mount
useEffect(() => {
  registerDashboardComponents();
}, []);
```

### Step 2: Component Template

Use this template for each component:

```typescript
// web/src/components/dashboard/ComponentName.tsx
import React from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { ComponentMetadata } from "@/lib/fluid-ui/types";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ComponentNameProps {
  eventId: string;
  // ... other props
}

export function ComponentName(props: ComponentNameProps) {
  // Data fetching
  const data = useQuery(api.entity.list, { eventId: props.eventId });

  // Loading state
  if (data === undefined) {
    return <ComponentSkeleton />;
  }

  // Error/empty states
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // Render
  return (
    <Card className="fluid-component-card">
      <CardHeader className="fluid-component-header">
        <CardTitle className="fluid-component-title">
          {SYMBOLS.BLACK_SQUARE} Component Name
        </CardTitle>
      </CardHeader>
      <CardContent className="fluid-component-content">
        {/* Component content */}
      </CardContent>
    </Card>
  );
}

// Component skeleton
function ComponentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
    </Card>
  );
}

// Empty state
function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <p>No data available</p>
      </CardContent>
    </Card>
  );
}

// Component metadata
export const ComponentNameMetadata: ComponentMetadata = {
  name: "ComponentName",
  description: "What this component does",
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
  },
  props: {
    eventId: {
      type: "string",
      required: true,
      description: "Event identifier",
    },
  },
};
```

### Step 3: Styling Enhancements

Add component-specific styles to `web/src/styles/fluid-ui.css`:

```css
/* Component cards */
.fluid-component-card {
  @apply border-0 shadow-none;
}

/* Component headers */
.fluid-component-header {
  @apply flex items-center justify-between pb-4;
}

.fluid-component-title {
  @apply text-lg;
  font-weight: 400;
}

.fluid-component-actions {
  @apply flex items-center gap-2;
}

/* Component content */
.fluid-component-content {
  @apply space-y-4;
}

/* Component footer */
.fluid-component-footer {
  @apply pt-4 mt-4 border-t;
}

/* Status badges */
.status-badge {
  @apply inline-flex items-center px-2 py-1 text-xs rounded-sm;
}

.status-badge--planning {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.status-badge--in-progress {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.status-badge--completed {
  @apply bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200;
}

/* Priority indicators */
.priority-indicator {
  @apply inline-flex items-center;
}

.priority-indicator--high {
  @apply text-red-600;
}

.priority-indicator--medium {
  @apply text-yellow-600;
}

.priority-indicator--low {
  @apply text-blue-600;
}
```

---

## Data Fetching Patterns

### Real-Time Subscriptions

All components use Convex's reactive queries for real-time updates:

```typescript
// Automatically re-renders when data changes
const tasks = useQuery(api.tasks.listByEvent, { eventId });
```

### Optimistic Updates

For mutations with immediate feedback:

```typescript
const completeTask = useMutation(api.tasks.complete);

const handleComplete = async (taskId: string) => {
  // Optimistically update UI
  setTasks(prev => prev.map(t =>
    t._id === taskId ? { ...t, status: "completed" } : t
  ));

  try {
    await completeTask({ taskId });
  } catch (error) {
    // Rollback on error
    setTasks(prev => prev.map(t =>
      t._id === taskId ? { ...t, status: "in_progress" } : t
    ));
  }
};
```

### Computed Data

Calculate derived data in `useMemo` to avoid re-computation:

```typescript
const stats = useMemo(() => ({
  total: tasks.length,
  pending: tasks.filter(t => t.status === "pending").length,
  completed: tasks.filter(t => t.status === "completed").length,
  overdue: tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== "completed").length,
}), [tasks]);
```

### Conditional Fetching

Only fetch data when needed:

```typescript
const expenses = useQuery(
  props.showExpenses ? api.expenses.listByEvent : undefined,
  { eventId: props.eventId }
);
```

---

## Testing Strategy

### Unit Tests Per Component

Test structure for each component:

```typescript
// web/src/components/dashboard/__tests__/ComponentName.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComponentName } from "../ComponentName";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

describe("ComponentName", () => {
  it("shows loading state initially", () => {
    useQuery.mockReturnValue(undefined);
    render(<ComponentName eventId="test" />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("renders data correctly", () => {
    const mockData = [{ _id: "1", name: "Test Item" }];
    useQuery.mockReturnValue(mockData);
    render(<ComponentName eventId="test" />);
    expect(screen.getByText("Test Item")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    useQuery.mockReturnValue([]);
    render(<ComponentName eventId="test" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

Test components in dashboard layout:

```typescript
// web/src/components/fluid-ui/__tests__/dashboard-integration.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutController } from "../LayoutController";
import { registerDashboardComponents } from "@/components/dashboard";

describe("Dashboard Integration", () => {
  beforeAll(() => {
    registerDashboardComponents();
  });

  it("renders complete dashboard with multiple components", () => {
    const config = {
      sections: [
        {
          type: "text",
          content: "<h1>Test Dashboard</h1>",
        },
        {
          type: "row",
          components: [
            { type: "TasksList", props: { eventId: "evt_1" } },
            { type: "ExpensesSummary", props: { eventId: "evt_1" } },
          ],
        },
      ],
    };

    render(<LayoutController config={config} />);

    expect(screen.getByText("Test Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-list")).toBeInTheDocument();
    expect(screen.getByTestId("expenses-summary")).toBeInTheDocument();
  });
});
```

---

## Success Criteria

### Functional Requirements
- ✅ All 17 components implemented and working
- ✅ Each component registered with complete metadata
- ✅ Components fetch their own data from Convex
- ✅ Real-time updates working for all components
- ✅ Loading states using Skeleton components
- ✅ Error and empty states handled gracefully
- ✅ Props validation working

### Visual Requirements
- ✅ All components follow ultrathin minimal aesthetic
- ✅ Consistent use of symbol library
- ✅ Font weights: 300 (base), 400 (headings), 600 (emphasis)
- ✅ Status colors consistent across components
- ✅ Mobile responsive (tested on <768px)

### Performance Requirements
- ✅ Component load time <1s on 3G
- ✅ No memory leaks in real-time subscriptions
- ✅ Smooth scrolling in lists (60fps)
- ✅ Optimistic updates feel instant

### Code Quality
- ✅ TypeScript strict mode passing
- ✅ All components have tests (>80% coverage)
- ✅ No console errors or warnings
- ✅ Accessible (keyboard navigation, ARIA labels)

---

## Next Steps

After Phase 2 completion:

1. **Phase 3: Component Communication** - Implement master-detail patterns and event bus
2. **Phase 5: Polish** - Add advanced features (drag-drop, charts, exports)

---

**Status:** Ready for Implementation
**Next Review:** After Week 1 (Event + Task components complete)
**Estimated Completion:** End of Week 3
