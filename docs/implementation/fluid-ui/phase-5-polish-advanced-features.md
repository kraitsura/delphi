# Phase 5: Polish & Advanced Features
## Performance, Visual Design & Advanced Capabilities

**Duration:** 2 weeks (10 working days)
**Priority:** Medium
**Status:** Not Started
**Dependencies:** Phase 3 complete

---

## Table of Contents

1. [Overview](#overview)
2. [Performance Optimization](#performance-optimization)
3. [Visual Design Enhancement](#visual-design-enhancement)
4. [Advanced Component Features](#advanced-component-features)
5. [User Personalization](#user-personalization)
6. [Production Readiness](#production-readiness)
7. [Success Criteria](#success-criteria)

---

## Overview

### What We're Building

Phase 5 transforms the functional Fluid UI system into a polished, production-ready dashboard platform. This phase focuses on performance optimization, visual refinement, advanced interactions, and user customization.

### Key Goals

1. **Performance** - Sub-500ms dashboard render, smooth 60fps animations
2. **Visual Polish** - Perfect ultrathin minimal aesthetic across all components
3. **Advanced Features** - Drag-drop, interactive charts, export capabilities
4. **Personalization** - User preferences and dashboard customization
5. **Production Ready** - Error boundaries, monitoring, documentation

### Phase Breakdown

**Week 1:**
- Days 1-3: Performance optimization
- Days 4-5: Visual design enhancement

**Week 2:**
- Days 6-8: Advanced component features
- Days 9-10: User personalization & production prep

---

## Performance Optimization

### Objectives

- Dashboard render time <500ms
- Component load time <1s
- Real-time updates <100ms latency
- 60fps animations and transitions
- Memory usage stable over time

### 1. Component Lazy Loading

**Problem:** All components load upfront, even if not visible

**Solution:** Lazy load components with React.lazy()

```typescript
// web/src/lib/fluid-ui/registry.ts
import { lazy } from "react";

// Update registration to use lazy loading
export function registerComponent(
  type: string,
  componentLoader: () => Promise<{ default: React.ComponentType<any> }>,
  metadata: ComponentMetadata
) {
  const LazyComponent = lazy(componentLoader);

  registry.set(type, {
    component: LazyComponent,
    metadata,
  });
}

// Usage in dashboard registration
registerComponent(
  "TasksList",
  () => import("@/components/dashboard/TasksList"),
  TasksListMetadata
);
```

**Suspense Boundaries:**

```typescript
// web/src/components/fluid-ui/ComponentRenderer.tsx
export function ComponentRenderer({ component }: ComponentRendererProps) {
  const Component = getComponent(component.type);

  return (
    <Suspense fallback={<ComponentSkeleton type={component.type} />}>
      <ErrorBoundary FallbackComponent={ComponentError}>
        <Component {...component.props} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

**Benefits:**
- Reduce initial bundle size
- Faster initial page load
- Components load on-demand

### 2. List Virtualization

**Problem:** Large lists (500+ items) cause performance issues

**Solution:** Use react-window for virtual scrolling

```bash
bun add react-window
bun add -D @types/react-window
```

**Implementation in TasksList:**

```typescript
// web/src/components/dashboard/TasksList.tsx
import { FixedSizeList as List } from "react-window";

export function TasksList({ eventId, ...props }: TasksListProps) {
  const tasks = useQuery(api.tasks.listByEvent, { eventId });

  // Virtual list configuration
  const itemHeight = 80; // pixels
  const listHeight = 600; // max visible height

  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <TaskListItem task={tasks[index]} />
    </div>
  );

  return (
    <List
      height={listHeight}
      itemCount={tasks.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Apply to:**
- TasksList (>50 tasks)
- ExpensesList (>50 expenses)
- GuestList (>100 guests)
- VendorsList (>50 vendors)

### 3. Memoization Strategy

**Problem:** Unnecessary re-renders when parent updates

**Solution:** React.memo + useMemo + useCallback

**Component Memoization:**

```typescript
// web/src/components/dashboard/ExpensesList.tsx
export const ExpensesList = React.memo(function ExpensesList(props: ExpensesListProps) {
  // Component implementation
});

// Custom comparison for complex props
export const ExpensesList = React.memo(
  ExpensesListComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.eventId === nextProps.eventId &&
      prevProps.category === nextProps.category &&
      prevProps.vendor === nextProps.vendor
    );
  }
);
```

**Computed Data Memoization:**

```typescript
export function ExpensesSummary({ eventId }: Props) {
  const expenses = useQuery(api.expenses.listByEvent, { eventId });

  // Memoize expensive calculations
  const summary = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = groupBy(expenses, "category");
    const monthlyTrend = calculateMonthlyTrend(expenses);

    return { total, byCategory, monthlyTrend };
  }, [expenses]);

  return <SummaryView summary={summary} />;
}
```

**Callback Memoization:**

```typescript
export function TasksList({ eventId }: Props) {
  const updateTask = useMutation(api.tasks.update);

  // Memoize callback to prevent child re-renders
  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      await updateTask({ taskId, status: "completed" });
    },
    [updateTask]
  );

  return (
    <div>
      {tasks.map(task => (
        <TaskItem
          key={task._id}
          task={task}
          onComplete={handleTaskComplete}
        />
      ))}
    </div>
  );
}
```

### 4. Convex Query Optimization

**Problem:** Multiple components fetching same data

**Solution:** Convex handles deduplication automatically, but optimize query patterns

**Batch Queries:**

```typescript
// Instead of separate queries
const event = useQuery(api.events.getById, { eventId });
const tasks = useQuery(api.tasks.listByEvent, { eventId });
const expenses = useQuery(api.expenses.listByEvent, { eventId });

// Use a combined query
const dashboardData = useQuery(api.dashboards.getEventData, { eventId });
// Returns { event, tasks, expenses, rooms, polls }
```

**Conditional Queries:**

```typescript
// Only fetch when needed
const expenses = useQuery(
  showExpenses ? api.expenses.listByEvent : undefined,
  showExpenses ? { eventId } : undefined
);
```

**Paginated Queries:**

```typescript
// Load data in chunks
const { results, status, loadMore } = usePaginatedQuery(
  api.tasks.paginatedList,
  { eventId },
  { initialNumItems: 50 }
);
```

### 5. Debounced Filters

**Problem:** Filter changes trigger immediate queries

**Solution:** Debounce user input

```typescript
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function TasksList({ eventId }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search input (wait 300ms after typing stops)
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const tasks = useQuery(api.tasks.search, {
    eventId,
    query: debouncedSearch,
  });

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search tasks..."
      />
      <TaskList tasks={tasks} />
    </div>
  );
}
```

**Create hook:**

```typescript
// web/src/hooks/use-debounced-value.ts
import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 6. Bundle Size Optimization

**Analyze Bundle:**

```bash
bun add -D @next/bundle-analyzer
```

**Optimize Imports:**

```typescript
// ❌ Bad - imports entire library
import { format } from "date-fns";

// ✅ Good - tree-shakeable import
import format from "date-fns/format";

// ❌ Bad - imports all of lodash
import _ from "lodash";

// ✅ Good - import specific functions
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
```

**Code Splitting:**

```typescript
// Split large components into separate chunks
const TasksKanban = lazy(() => import("@/components/dashboard/TasksKanban"));
const CalendarView = lazy(() => import("@/components/dashboard/CalendarView"));
```

---

## Visual Design Enhancement

### Objectives

- Ultrathin minimal aesthetic perfected
- Consistent spacing and typography
- Smooth animations and transitions
- Perfect dark mode support
- Micro-interactions

### 1. Enhanced Typography System

**Update CSS with precise typography:**

```css
/* web/src/styles/fluid-ui.css */

/* Typography Scale */
.fluid-text-row h1 {
  font-size: 2rem; /* 32px */
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin-bottom: 0.75rem;
}

.fluid-text-row h2 {
  font-size: 1.5rem; /* 24px */
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin-bottom: 0.5rem;
}

.fluid-text-row h3 {
  font-size: 1.25rem; /* 20px */
  font-weight: 400;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.fluid-text-row p {
  font-size: 1rem; /* 16px */
  font-weight: 300;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.fluid-text-row strong {
  font-weight: 600; /* Only for emphasis */
}

.fluid-text-row em {
  font-style: italic;
  font-weight: 300;
}

/* Component Typography */
.fluid-component-title {
  font-size: 1.125rem; /* 18px */
  font-weight: 400;
  letter-spacing: -0.01em;
}

.fluid-component-subtitle {
  font-size: 0.875rem; /* 14px */
  font-weight: 300;
  color: hsl(var(--muted-foreground));
}

.fluid-component-caption {
  font-size: 0.75rem; /* 12px */
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}
```

### 2. Smooth Animations

**Add subtle animations:**

```css
/* web/src/styles/fluid-ui-animations.css */

/* Fade in animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fluid-component {
  animation: fadeIn 0.3s ease-out;
}

/* Skeleton shimmer */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.fluid-component-skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Hover transitions */
.fluid-component {
  transition: all 0.2s ease;
}

.fluid-component:hover {
  transform: translateY(-2px);
}

/* Connection highlight pulse */
@keyframes connectionPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.7);
  }
  50% {
    box-shadow: 0 0 0 4px hsl(var(--primary) / 0);
  }
}

.fluid-component--connected-active {
  animation: connectionPulse 1s ease-in-out;
}

/* Smooth filter changes */
.fluid-component-content {
  transition: opacity 0.2s ease;
}

.fluid-component-content--filtering {
  opacity: 0.5;
}
```

### 3. Micro-Interactions

**Button States:**

```css
/* Fluid button styles */
.fluid-button {
  font-weight: 400;
  transition: all 0.15s ease;
}

.fluid-button:hover {
  transform: scale(1.02);
}

.fluid-button:active {
  transform: scale(0.98);
}

.fluid-button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

**Status Badge Transitions:**

```css
.status-badge {
  transition: all 0.2s ease;
}

.status-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
}
```

**List Item Interactions:**

```typescript
// web/src/components/dashboard/TaskListItem.tsx
export function TaskListItem({ task, onComplete }: Props) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);

    // Animate out
    await new Promise(resolve => setTimeout(resolve, 300));

    await onComplete(task._id);
  };

  return (
    <div
      className={cn(
        "task-item",
        isCompleting && "task-item--completing"
      )}
    >
      {/* Task content */}
    </div>
  );
}
```

```css
.task-item {
  transition: all 0.3s ease;
}

.task-item--completing {
  opacity: 0;
  transform: translateX(20px);
}
```

### 4. Dark Mode Perfection

**Ensure all components support dark mode:**

```css
/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .fluid-dashboard {
    /* Pure white on black aesthetic */
  }

  .fluid-component {
    border-color: hsl(var(--border));
  }

  .status-badge--planning {
    background: hsl(210 100% 20%);
    color: hsl(210 100% 80%);
  }

  .status-badge--in-progress {
    background: hsl(142 100% 20%);
    color: hsl(142 100% 80%);
  }

  /* Ensure sufficient contrast */
  .fluid-component-title {
    color: hsl(var(--foreground));
  }
}
```

**Test dark mode with:**
- Chrome DevTools (toggle color scheme)
- System dark mode toggle
- All components rendered in both modes

---

## Advanced Component Features

### 1. Drag-and-Drop (TasksKanban)

**Install library:**

```bash
bun add @dnd-kit/core @dnd-kit/sortable
```

**Implementation:**

```typescript
// web/src/components/dashboard/TasksKanban.tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function TasksKanban({ eventId }: Props) {
  const tasks = useQuery(api.tasks.listByEvent, { eventId });
  const updateTask = useMutation(api.tasks.update);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    // Extract status from droppable container ID
    const newStatus = over.id;

    if (active.id !== over.id) {
      // Update task status
      await updateTask({
        taskId: active.id,
        status: newStatus,
      });
    }

    setActiveId(null);
  };

  const columns = [
    { id: "not_started", title: "Not Started", tasks: tasks.filter(t => t.status === "not_started") },
    { id: "in_progress", title: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
    { id: "blocked", title: "Blocked", tasks: tasks.filter(t => t.status === "blocked") },
    { id: "completed", title: "Completed", tasks: tasks.filter(t => t.status === "completed") },
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay>
        {activeId ? <TaskCard taskId={activeId} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ column }: { column: any }) {
  return (
    <div className="kanban-column">
      <h3 className="kanban-column-title">
        {column.title}
        <span className="kanban-column-count">{column.tasks.length}</span>
      </h3>

      <SortableContext
        items={column.tasks.map(t => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kanban-column-content">
          {column.tasks.map(task => (
            <DraggableTaskCard key={task._id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

### 2. Interactive Charts (ExpensesSummary)

**Install chart library:**

```bash
bun add recharts
```

**Implementation:**

```typescript
// web/src/components/dashboard/ExpensesSummary.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function ExpensesSummary({ eventId, showChart }: Props) {
  const expenses = useQuery(api.expenses.listByEvent, { eventId });

  const categoryData = useMemo(() => {
    const byCategory = groupBy(expenses, "category");

    return Object.entries(byCategory).map(([category, items]) => ({
      name: category,
      value: items.reduce((sum, e) => sum + e.amount, 0),
    }));
  }, [expenses]);

  const COLORS = {
    venue: "#3b82f6",
    catering: "#10b981",
    photography: "#f59e0b",
    music: "#8b5cf6",
    flowers: "#ec4899",
    attire: "#06b6d4",
    invitations: "#84cc16",
    travel: "#f97316",
    other: "#6b7280",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>■ Budget Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {showChart && (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Category list */}
        <div className="space-y-2 mt-6">
          {categoryData.map(cat => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[cat.name as keyof typeof COLORS] }}
                />
                <span className="text-sm capitalize">{cat.name}</span>
              </div>
              <span className="text-sm font-medium">
                ${cat.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Export Functionality

**PDF Export:**

```bash
bun add jspdf html2canvas
```

**Implementation:**

```typescript
// web/src/lib/fluid-ui/export.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportDashboardToPDF(
  dashboardElement: HTMLElement,
  filename: string = "dashboard.pdf"
) {
  // Capture dashboard as image
  const canvas = await html2canvas(dashboardElement, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  // Create PDF
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}
```

**Usage:**

```typescript
// web/src/components/fluid-ui/DashboardActions.tsx
export function DashboardActions() {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (dashboardRef.current) {
      await exportDashboardToPDF(dashboardRef.current, "event-dashboard.pdf");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} className="fluid-button">
        Export PDF
      </button>
    </div>
  );
}
```

---

## User Personalization

### 1. Dashboard Preferences

**Schema Update:**

```typescript
// web/convex/schema.ts
userPreferences: defineTable({
  userId: v.id("users"),
  displayDensity: v.union(v.literal("compact"), v.literal("comfortable"), v.literal("spacious")),
  favoriteComponents: v.array(v.string()),
  defaultDashboards: v.record(v.string(), v.string()), // eventType → dashboardId
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  enableAnimations: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]),
```

**Preferences Hook:**

```typescript
// web/src/hooks/use-user-preferences.ts
export function useUserPreferences() {
  const preferences = useQuery(api.userPreferences.get);
  const updatePreferences = useMutation(api.userPreferences.update);

  const update = useCallback(
    async (updates: Partial<UserPreferences>) => {
      await updatePreferences(updates);
    },
    [updatePreferences]
  );

  return { preferences, update };
}
```

**Preferences Panel:**

```typescript
// web/src/components/fluid-ui/PreferencesPanel.tsx
export function PreferencesPanel() {
  const { preferences, update } = useUserPreferences();

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">Display Density</label>
        <select
          value={preferences.displayDensity}
          onChange={(e) => update({ displayDensity: e.target.value })}
          className="mt-1 w-full"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Theme</label>
        <select
          value={preferences.theme}
          onChange={(e) => update({ theme: e.target.value })}
          className="mt-1 w-full"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Enable Animations</label>
        <Switch
          checked={preferences.enableAnimations}
          onCheckedChange={(checked) => update({ enableAnimations: checked })}
        />
      </div>
    </div>
  );
}
```

### 2. Favorite Components

**Quick Add Panel:**

```typescript
// web/src/components/fluid-ui/QuickAddPanel.tsx
export function QuickAddPanel({ eventId }: { eventId: string }) {
  const { preferences } = useUserPreferences();
  const addComponent = useMutation(api.dashboards.addComponent);

  const favoriteComponents = preferences.favoriteComponents || [];

  const handleAddComponent = async (componentType: string) => {
    await addComponent({
      eventId,
      componentType,
      props: { eventId },
    });
  };

  return (
    <div className="quick-add-panel">
      <h3>Quick Add</h3>
      <div className="grid grid-cols-2 gap-2">
        {favoriteComponents.map(type => (
          <button
            key={type}
            onClick={() => handleAddComponent(type)}
            className="p-3 rounded border hover:border-primary"
          >
            {getComponentMetadata(type)?.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Production Readiness

### 1. Error Boundaries

**Global Error Boundary:**

```typescript
// web/src/components/fluid-ui/ErrorBoundary.tsx
import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error("ErrorBoundary caught:", error, errorInfo);

    // Send to Sentry, LogRocket, etc.
    if (typeof window !== "undefined" && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { FallbackComponent } = this.props;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}
```

### 2. Performance Monitoring

**Setup:**

```bash
bun add @sentry/react
```

**Configuration:**

```typescript
// web/src/lib/monitoring.ts
import * as Sentry from "@sentry/react";

export function initializeMonitoring() {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.VITE_SENTRY_DSN,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

// Track custom metrics
export function trackDashboardRender(duration: number) {
  Sentry.metrics.distribution("dashboard.render.duration", duration, {
    unit: "millisecond",
  });
}

export function trackComponentLoad(componentType: string, duration: number) {
  Sentry.metrics.distribution("component.load.duration", duration, {
    unit: "millisecond",
    tags: { component: componentType },
  });
}
```

### 3. Analytics Integration

**User Behavior Tracking:**

```typescript
// web/src/lib/analytics.ts
import { useEffect } from "react";

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // PostHog, Mixpanel, etc.
  if (typeof window !== "undefined" && window.analytics) {
    window.analytics.track(eventName, properties);
  }
}

export function usePageView(pageName: string) {
  useEffect(() => {
    trackEvent("Page Viewed", { page: pageName });
  }, [pageName]);
}

// Track dashboard events
export function trackDashboardEvent(action: string, properties?: Record<string, any>) {
  trackEvent(`Dashboard ${action}`, properties);
}

// Usage
trackDashboardEvent("Created", { eventId, componentCount: 5 });
trackDashboardEvent("Component Added", { componentType: "TasksList" });
trackDashboardEvent("Exported", { format: "PDF" });
```

### 4. Documentation

**Component Library Documentation:**

Create `web/src/components/dashboard/README.md`:

```markdown
# Dashboard Component Library

## Available Components

### Event Components

#### EventDetails
Displays comprehensive event information.

**Props:**
- `eventId` (required): Event identifier
- `showStatus` (optional): Show status badge
- `showBudget` (optional): Show budget overview
- `compact` (optional): Compact layout

**Usage:**
\`\`\`tsx
<EventDetails eventId="evt_123" showBudget />
\`\`\`

...
```

**API Documentation:**

Generate TypeDoc for all exported functions:

```bash
bun add -D typedoc
npx typedoc --out docs/api src/lib/fluid-ui
```

---

## Success Criteria

### Performance
- ✅ Dashboard render time <500ms
- ✅ Component load time <1s
- ✅ 60fps animations confirmed
- ✅ Memory stable (no leaks)
- ✅ Bundle size <200KB gzipped

### Visual Design
- ✅ All components ultrathin minimal aesthetic
- ✅ Consistent spacing (8px grid)
- ✅ Smooth animations throughout
- ✅ Perfect dark mode support
- ✅ Micro-interactions polished

### Advanced Features
- ✅ Drag-drop working smoothly (TasksKanban)
- ✅ Interactive charts functional
- ✅ PDF export working
- ✅ CSV export for data tables

### User Experience
- ✅ Preferences persist across sessions
- ✅ Favorite components quick-add
- ✅ Theme switching instant
- ✅ No layout shifts

### Production
- ✅ Error boundaries catch all failures
- ✅ Performance monitoring active
- ✅ Analytics tracking events
- ✅ Documentation complete
- ✅ TypeScript strict mode passing
- ✅ Zero console errors/warnings

---

## Next Steps

After Phase 5 completion:

1. **User Testing** - Gather feedback from beta users
2. **Performance Profiling** - Use Chrome DevTools to identify bottlenecks
3. **Accessibility Audit** - Test with screen readers and keyboard navigation
4. **Mobile Testing** - Test on actual devices (iOS, Android)
5. **Production Launch** - Deploy to production environment

---

**Status:** Ready for Implementation
**Next Review:** After Week 1 (Performance optimization complete)
**Estimated Completion:** End of Week 2

---

## Appendix: Performance Checklist

**Pre-Launch Performance Audit:**

- [ ] Run Lighthouse audit (score >90)
- [ ] Test on 3G network (usable performance)
- [ ] Profile memory usage (no leaks)
- [ ] Check bundle size (acceptable limits)
- [ ] Verify real-time updates working
- [ ] Test with 1000+ items (virtualization working)
- [ ] Verify animations at 60fps
- [ ] Test error scenarios (graceful degradation)
- [ ] Check accessibility (WCAG AA compliance)
- [ ] Test keyboard navigation (all actions accessible)
- [ ] Verify mobile responsiveness (all screen sizes)
- [ ] Test dark mode (all components)
- [ ] Check print layouts (if applicable)
- [ ] Verify export functionality (PDF, CSV)
- [ ] Test cross-browser (Chrome, Firefox, Safari, Edge)

**Monitoring Metrics to Track:**

- Dashboard render time (p50, p95, p99)
- Component load time by type
- Real-time update latency
- Error rate by component
- User engagement (time on dashboard)
- Feature usage (component popularity)
- Export usage (PDF vs CSV)
- Theme preference distribution
- Performance by device type
- Bundle size over time
