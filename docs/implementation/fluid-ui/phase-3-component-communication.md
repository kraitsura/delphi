# Phase 3: Component Communication
## Master-Detail Patterns & Event Bus

**Duration:** 2 weeks (10 working days)
**Priority:** High
**Status:** Not Started
**Dependencies:** Phase 2 complete

---

## Table of Contents

1. [Overview](#overview)
2. [Event Bus Architecture](#event-bus-architecture)
3. [Master-Detail Pattern](#master-detail-pattern)
4. [Connection Detection](#connection-detection)
5. [Implementation Guide](#implementation-guide)
6. [Visual Feedback System](#visual-feedback-system)
7. [Testing Strategy](#testing-strategy)
8. [Success Criteria](#success-criteria)

---

## Overview

### What We're Building

Phase 3 enables components to communicate with each other through a pub/sub event bus, creating dynamic master-detail relationships. Users can click a vendor in `VendorsList` and see filtered expenses in `ExpensesList`, or select a task category and see filtered tasks automatically.

### Key Concepts

**Master Components:**
- Emit events when user selects/filters
- Examples: VendorsList, CategoryPicker, TasksList (when emitting selection)

**Detail Components:**
- Listen to events and update their filters
- Examples: ExpensesList, TaskDetails, VendorDetails

**Event Bus:**
- Central pub/sub system for component communication
- Scoped to dashboard instance (not global)
- Automatic subscription cleanup on unmount

### Communication Patterns

```
┌─────────────────┐         vendorSelected          ┌──────────────────┐
│  VendorsList    │──────────────────────────────────▶│  ExpensesList   │
│  (Master)       │   { vendorId, vendorName }       │  (Detail)        │
└─────────────────┘                                  └──────────────────┘
                                                              │
                                                              ▼
                                                    Filters expenses by
                                                    vendorId automatically
```

---

## Event Bus Architecture

### Design Philosophy

**Principles:**
1. **Scoped to Dashboard** - Events don't leak between dashboard instances
2. **Type-Safe** - TypeScript definitions for all event types
3. **Automatic Cleanup** - No memory leaks from stale subscriptions
4. **Devtools Integration** - Debug events in development

### Event Types

Standard event types used across components:

```typescript
// Selection events
export type SelectionEvent =
  | { type: "taskSelected"; payload: { taskId: string; taskData: any } }
  | { type: "vendorSelected"; payload: { vendorId: string; vendorName: string } }
  | { type: "categorySelected"; payload: { category: string } }
  | { type: "dateSelected"; payload: { date: number } }
  | { type: "pollSelected"; payload: { pollId: string } };

// Filter events
export type FilterEvent =
  | { type: "statusChanged"; payload: { status: string } }
  | { type: "assigneeSelected"; payload: { userId: string; userName: string } }
  | { type: "dateRangeChanged"; payload: { start: number; end: number } }
  | { type: "priorityChanged"; payload: { priority: string } };

// Action events
export type ActionEvent =
  | { type: "itemAdded"; payload: { itemType: string; itemId: string } }
  | { type: "itemUpdated"; payload: { itemType: string; itemId: string } }
  | { type: "itemDeleted"; payload: { itemType: string; itemId: string } }
  | { type: "filterCleared"; payload: { filterType?: string } };

export type ComponentEvent = SelectionEvent | FilterEvent | ActionEvent;
```

### Event Bus Implementation

Create `web/src/lib/fluid-ui/event-bus.ts`:

```typescript
import { useEffect, useRef, useCallback } from "react";

/**
 * Event callback function type
 */
type EventCallback<T = any> = (event: ComponentEvent) => void;

/**
 * Subscription object
 */
interface Subscription {
  eventType: string;
  callback: EventCallback;
  componentId?: string;
}

/**
 * Event Bus for component communication
 * Scoped to a single dashboard instance
 */
export class EventBus {
  private subscriptions: Map<string, Set<Subscription>> = new Map();
  private eventHistory: ComponentEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event type
   */
  subscribe(eventType: string, callback: EventCallback, componentId?: string): () => void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    const subscription: Subscription = { eventType, callback, componentId };
    this.subscriptions.get(eventType)!.add(subscription);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(eventType);
      if (subs) {
        subs.delete(subscription);
        if (subs.size === 0) {
          this.subscriptions.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: ComponentEvent): void {
    const { type, payload } = event;

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify subscribers
    const subs = this.subscriptions.get(type);
    if (subs) {
      subs.forEach(sub => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }

    // Development logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[EventBus] ${type}`, payload);
    }
  }

  /**
   * Get event history (for debugging)
   */
  getHistory(): ComponentEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear all subscriptions (cleanup)
   */
  clear(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
  }

  /**
   * Get active subscriptions (for debugging)
   */
  getSubscriptions(): Map<string, number> {
    const counts = new Map<string, number>();
    this.subscriptions.forEach((subs, eventType) => {
      counts.set(eventType, subs.size);
    });
    return counts;
  }
}

/**
 * Create event bus instance for a dashboard
 */
export function createEventBus(): EventBus {
  return new EventBus();
}
```

### React Context Provider

Create `web/src/lib/fluid-ui/EventBusContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useRef } from "react";
import { EventBus, createEventBus } from "./event-bus";
import type { ComponentEvent } from "./types";

/**
 * Event Bus Context
 */
const EventBusContext = createContext<EventBus | null>(null);

/**
 * Provider that creates event bus for dashboard
 */
export function EventBusProvider({ children }: { children: React.ReactNode }) {
  const eventBusRef = useRef<EventBus>();

  // Create event bus once
  if (!eventBusRef.current) {
    eventBusRef.current = createEventBus();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventBusRef.current?.clear();
    };
  }, []);

  return (
    <EventBusContext.Provider value={eventBusRef.current}>
      {children}
    </EventBusContext.Provider>
  );
}

/**
 * Hook to access event bus
 */
export function useEventBus(): EventBus {
  const eventBus = useContext(EventBusContext);
  if (!eventBus) {
    throw new Error("useEventBus must be used within EventBusProvider");
  }
  return eventBus;
}
```

### React Hooks for Components

Create `web/src/lib/fluid-ui/hooks/useComponentEvents.ts`:

```typescript
import { useCallback, useEffect, useRef } from "react";
import { useEventBus } from "../EventBusContext";
import type { ComponentEvent } from "../types";

/**
 * Hook for component event communication
 *
 * @example Master component:
 * const { emit } = useComponentEvents();
 * emit({ type: "vendorSelected", payload: { vendorId: "v1", vendorName: "Acme" } });
 *
 * @example Detail component:
 * useComponentEvents("vendorSelected", (event) => {
 *   setFilters(prev => ({ ...prev, vendor: event.payload.vendorId }));
 * });
 */
export function useComponentEvents(
  eventType?: string,
  callback?: (event: ComponentEvent) => void,
  componentId?: string
) {
  const eventBus = useEventBus();
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Subscribe to event type
  useEffect(() => {
    if (!eventType || !callbackRef.current) return;

    const unsubscribe = eventBus.subscribe(
      eventType,
      (event) => {
        callbackRef.current?.(event);
      },
      componentId
    );

    return unsubscribe;
  }, [eventBus, eventType, componentId]);

  // Emit function
  const emit = useCallback(
    (event: ComponentEvent) => {
      eventBus.emit(event);
    },
    [eventBus]
  );

  return { emit };
}

/**
 * Hook to listen to multiple event types
 */
export function useComponentEventListener(
  eventTypes: string[],
  callback: (event: ComponentEvent) => void,
  componentId?: string
) {
  const eventBus = useEventBus();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribes = eventTypes.map(eventType =>
      eventBus.subscribe(
        eventType,
        (event) => callbackRef.current(event),
        componentId
      )
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [eventBus, eventTypes, componentId]);
}
```

---

## Master-Detail Pattern

### Pattern Overview

Master-detail is a UI pattern where:
1. **Master component** displays a list of items
2. User selects an item in the master
3. **Detail component** shows filtered/related data for the selected item

### Example Implementations

#### Example 1: VendorsList → ExpensesList

**Master Component (VendorsList):**

```typescript
// web/src/components/dashboard/VendorsList.tsx
import { useComponentEvents } from "@/lib/fluid-ui/hooks/useComponentEvents";

export function VendorsList({ eventId }: VendorsListProps) {
  const { emit } = useComponentEvents();
  const [selected, setSelected] = useState<string | null>(null);

  const vendors = useQuery(api.vendors.listByEvent, { eventId });

  const handleVendorClick = (vendor: any) => {
    setSelected(vendor._id);

    // Emit vendor selection event
    emit({
      type: "vendorSelected",
      payload: {
        vendorId: vendor._id,
        vendorName: vendor.name,
      },
    });
  };

  return (
    <div className="space-y-2">
      {vendors.map(vendor => (
        <button
          key={vendor._id}
          onClick={() => handleVendorClick(vendor)}
          className={cn(
            "w-full text-left p-3 rounded hover:bg-accent transition-colors",
            selected === vendor._id && "bg-accent"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{vendor.name}</p>
              <p className="text-sm text-muted-foreground">{vendor.category}</p>
            </div>
            <span className="text-sm">${vendor.totalSpent}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**Detail Component (ExpensesList):**

```typescript
// web/src/components/dashboard/ExpensesList.tsx
import { useComponentEvents } from "@/lib/fluid-ui/hooks/useComponentEvents";

export function ExpensesList({ eventId, vendor, ...props }: ExpensesListProps) {
  const [filters, setFilters] = useState<{ vendor?: string }>({
    vendor: props.vendor,
  });

  // Listen to vendor selection events
  useComponentEvents("vendorSelected", (event) => {
    setFilters(prev => ({
      ...prev,
      vendor: event.payload.vendorId,
    }));
  });

  // Fetch expenses with filters
  const expenses = useQuery(api.expenses.listByEvent, {
    eventId,
    vendor: filters.vendor,
  });

  // Clear filter button
  const handleClearFilter = () => {
    setFilters(prev => ({ ...prev, vendor: undefined }));
  };

  return (
    <div>
      {filters.vendor && (
        <div className="mb-4 flex items-center justify-between bg-accent px-3 py-2 rounded">
          <p className="text-sm">
            Filtered by vendor
          </p>
          <button
            onClick={handleClearFilter}
            className="text-sm underline hover:no-underline"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="space-y-2">
        {expenses.map(expense => (
          <ExpenseItem key={expense._id} expense={expense} />
        ))}
      </div>
    </div>
  );
}
```

#### Example 2: TasksList → TaskDetails

**Master Component (TasksList):**

```typescript
export function TasksList({ eventId, ...props }: TasksListProps) {
  const { emit } = useComponentEvents();
  const [selected, setSelected] = useState<string | null>(null);

  const tasks = useQuery(api.tasks.listByEvent, { eventId });

  const handleTaskClick = (task: any) => {
    setSelected(task._id);

    emit({
      type: "taskSelected",
      payload: {
        taskId: task._id,
        taskData: task,
      },
    });
  };

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div
          key={task._id}
          onClick={() => handleTaskClick(task)}
          className={cn(
            "p-3 rounded border cursor-pointer hover:border-primary transition-colors",
            selected === task._id && "border-primary bg-accent"
          )}
        >
          <TaskListItem task={task} />
        </div>
      ))}
    </div>
  );
}
```

**Detail Component (TaskDetails):**

```typescript
export function TaskDetails({ eventId }: TaskDetailsProps) {
  const [taskId, setTaskId] = useState<string | null>(null);

  // Listen to task selection
  useComponentEvents("taskSelected", (event) => {
    setTaskId(event.payload.taskId);
  });

  const task = useQuery(
    taskId ? api.tasks.getById : undefined,
    taskId ? { taskId } : undefined
  );

  if (!taskId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <p>Select a task to view details</p>
      </div>
    );
  }

  if (!task) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{task.title}</h3>
        <p className="text-sm text-muted-foreground">{task.description}</p>
      </div>

      {/* Task details, comments, history, etc. */}
    </div>
  );
}
```

#### Example 3: CategoryPicker → Multiple Detail Components

One master can control multiple detail components:

```typescript
// CategoryPicker emits categorySelected
emit({
  type: "categorySelected",
  payload: { category: "catering" },
});

// Multiple components listen:
// - TasksList filters to catering tasks
// - ExpensesList filters to catering expenses
// - VendorsList filters to catering vendors
```

---

## Connection Detection

### Automatic Connection Discovery

The system automatically detects master-detail relationships based on component metadata.

Create `web/src/lib/fluid-ui/connections.ts`:

```typescript
import { getComponentMetadata } from "./registry";
import type { ComponentInstance, ComponentMetadata } from "./types";

/**
 * Connection between two components
 */
export interface Connection {
  masterId: string;
  detailId: string;
  masterType: string;
  detailType: string;
  eventTypes: string[];
}

/**
 * Detect connections between components in a dashboard
 */
export function detectConnections(components: ComponentInstance[]): Connection[] {
  const connections: Connection[] = [];

  // Find all potential master components
  const masters = components.filter(comp => {
    const metadata = getComponentMetadata(comp.type);
    return metadata?.connections?.canBeMaster;
  });

  // Find all potential detail components
  const details = components.filter(comp => {
    const metadata = getComponentMetadata(comp.type);
    return metadata?.connections?.canBeDetail;
  });

  // Match masters with details
  for (const master of masters) {
    const masterMetadata = getComponentMetadata(master.type);
    if (!masterMetadata?.connections?.emits) continue;

    for (const detail of details) {
      const detailMetadata = getComponentMetadata(detail.type);
      if (!detailMetadata?.connections?.listensTo) continue;

      // Find shared event types
      const sharedEvents = masterMetadata.connections.emits.filter(
        event => detailMetadata.connections!.listensTo!.includes(event)
      );

      if (sharedEvents.length > 0) {
        connections.push({
          masterId: master.id || `${master.type}-${masters.indexOf(master)}`,
          detailId: detail.id || `${detail.type}-${details.indexOf(detail)}`,
          masterType: master.type,
          detailType: detail.type,
          eventTypes: sharedEvents,
        });
      }
    }
  }

  return connections;
}

/**
 * Get all connections for a specific component
 */
export function getConnectionsForComponent(
  componentId: string,
  connections: Connection[]
): Connection[] {
  return connections.filter(
    conn => conn.masterId === componentId || conn.detailId === componentId
  );
}

/**
 * Check if component is a master in any connection
 */
export function isMasterComponent(
  componentId: string,
  connections: Connection[]
): boolean {
  return connections.some(conn => conn.masterId === componentId);
}

/**
 * Check if component is a detail in any connection
 */
export function isDetailComponent(
  componentId: string,
  connections: Connection[]
): boolean {
  return connections.some(conn => conn.detailId === componentId);
}
```

### Connection Visualization

Add connection detection to LayoutController:

```typescript
// web/src/components/fluid-ui/LayoutController.tsx
import { detectConnections } from "@/lib/fluid-ui/connections";

export function LayoutController({ config }: LayoutControllerProps) {
  // Detect connections
  const connections = useMemo(() => {
    const allComponents = config.sections
      .filter(s => s.type === "row")
      .flatMap(s => s.components);

    return detectConnections(allComponents);
  }, [config]);

  // Show connections in dev mode
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && connections.length > 0) {
      console.log("[Connections Detected]", connections);
    }
  }, [connections]);

  return (
    <EventBusProvider>
      <div className="fluid-dashboard">
        {/* Render sections */}
      </div>

      {/* Connection debugger (dev only) */}
      {process.env.NODE_ENV === "development" && (
        <ConnectionDebugger connections={connections} />
      )}
    </EventBusProvider>
  );
}
```

---

## Implementation Guide

### Step 1: Update Existing Components

Update Phase 2 components that have `connections` in their metadata to use the event bus.

**Components to Update:**

**Masters:**
- VendorsList (emits `vendorSelected`)
- TasksList (emits `taskSelected`, `statusChanged`)
- CategoryPicker (emits `categorySelected`) - new component
- PollsList (emits `pollSelected`)
- UpcomingEvents (emits `eventSelected`)

**Details:**
- ExpensesList (listens to `vendorSelected`, `categorySelected`)
- TaskDetails (listens to `taskSelected`)
- VendorDetails (listens to `vendorSelected`)
- PollResults (listens to `pollSelected`)

### Step 2: Add CategoryPicker Component

Create a new master component for category filtering:

```typescript
// web/src/components/dashboard/CategoryPicker.tsx
import { useComponentEvents } from "@/lib/fluid-ui/hooks/useComponentEvents";

const CATEGORIES = [
  { id: "venue", name: "Venue", icon: "🏛️" },
  { id: "catering", name: "Catering", icon: "🍽️" },
  { id: "photography", name: "Photography", icon: "📸" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "flowers", name: "Flowers", icon: "💐" },
  { id: "attire", name: "Attire", icon: "👔" },
  { id: "invitations", name: "Invitations", icon: "✉️" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "other", name: "Other", icon: "📦" },
];

export function CategoryPicker() {
  const { emit } = useComponentEvents();
  const [selected, setSelected] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    if (selected === category) {
      // Deselect
      setSelected(null);
      emit({
        type: "filterCleared",
        payload: { filterType: "category" },
      });
    } else {
      // Select
      setSelected(category);
      emit({
        type: "categorySelected",
        payload: { category },
      });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleCategoryClick(cat.id)}
          className={cn(
            "p-3 rounded border text-center transition-colors hover:border-primary",
            selected === cat.id && "border-primary bg-accent"
          )}
        >
          <div className="text-2xl mb-1">{cat.icon}</div>
          <div className="text-sm">{cat.name}</div>
        </button>
      ))}
    </div>
  );
}

export const CategoryPickerMetadata: ComponentMetadata = {
  name: "CategoryPicker",
  description: "Select category to filter tasks and expenses",
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: true,
    canBeDetail: false,
    emits: ["categorySelected", "filterCleared"],
  },
  props: {},
};
```

### Step 3: Handle Filter Clear Events

Update detail components to listen for `filterCleared`:

```typescript
export function ExpensesList({ eventId, ...props }: ExpensesListProps) {
  const [filters, setFilters] = useState<Filters>({});

  // Listen to filter events
  useComponentEvents("vendorSelected", (event) => {
    setFilters(prev => ({ ...prev, vendor: event.payload.vendorId }));
  });

  useComponentEvents("categorySelected", (event) => {
    setFilters(prev => ({ ...prev, category: event.payload.category }));
  });

  useComponentEvents("filterCleared", (event) => {
    const { filterType } = event.payload;

    if (!filterType) {
      // Clear all filters
      setFilters({});
    } else if (filterType === "vendor") {
      setFilters(prev => ({ ...prev, vendor: undefined }));
    } else if (filterType === "category") {
      setFilters(prev => ({ ...prev, category: undefined }));
    }
  });

  // Rest of component...
}
```

---

## Visual Feedback System

### Active Connection Indicators

Show visual feedback when components are connected and active.

Create `web/src/components/fluid-ui/ConnectionIndicator.tsx`:

```typescript
import { useMemo } from "react";
import { getConnectionsForComponent, isMasterComponent } from "@/lib/fluid-ui/connections";

interface ConnectionIndicatorProps {
  componentId: string;
  connections: Connection[];
  isActive?: boolean;
}

export function ConnectionIndicator({
  componentId,
  connections,
  isActive,
}: ConnectionIndicatorProps) {
  const componentConnections = getConnectionsForComponent(componentId, connections);

  if (componentConnections.length === 0) return null;

  const isMaster = isMasterComponent(componentId, connections);

  return (
    <div
      className={cn(
        "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isMaster ? (
        <>
          <span className="font-medium">Master</span>
          <span>→</span>
          <span>{componentConnections.length} connected</span>
        </>
      ) : (
        <>
          <span>← Listening</span>
        </>
      )}
    </div>
  );
}
```

### Highlight Connected Components

Add visual highlighting to GridRow when connection is active:

```typescript
// web/src/components/fluid-ui/GridRow.tsx
export function GridRow({ section, eventId, connections }: GridRowProps) {
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const eventBus = useEventBus();

  // Track active connections
  useEffect(() => {
    const unsubscribe = eventBus.subscribe("*", (event) => {
      // Set active for 2 seconds after event
      setActiveConnection(event.type);
      setTimeout(() => setActiveConnection(null), 2000);
    });

    return unsubscribe;
  }, [eventBus]);

  return (
    <div className="fluid-grid-row" style={{ gridTemplateColumns }}>
      {section.components.map((component, index) => {
        const componentId = component.id || `comp-${index}`;
        const isActive = connections.some(
          conn =>
            (conn.masterId === componentId || conn.detailId === componentId) &&
            conn.eventTypes.includes(activeConnection || "")
        );

        return (
          <div
            key={componentId}
            className={cn(
              "fluid-component relative",
              isActive && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <ConnectionIndicator
              componentId={componentId}
              connections={connections}
              isActive={isActive}
            />
            <ComponentRenderer component={component} eventId={eventId} />
          </div>
        );
      })}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

Test event bus functionality:

```typescript
// web/src/lib/fluid-ui/__tests__/event-bus.test.ts
import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../event-bus";

describe("EventBus", () => {
  it("should emit and receive events", () => {
    const bus = new EventBus();
    const callback = vi.fn();

    bus.subscribe("testEvent", callback);
    bus.emit({ type: "testEvent", payload: { data: "test" } });

    expect(callback).toHaveBeenCalledWith({
      type: "testEvent",
      payload: { data: "test" },
    });
  });

  it("should unsubscribe correctly", () => {
    const bus = new EventBus();
    const callback = vi.fn();

    const unsubscribe = bus.subscribe("testEvent", callback);
    unsubscribe();

    bus.emit({ type: "testEvent", payload: {} });
    expect(callback).not.toHaveBeenCalled();
  });

  it("should maintain event history", () => {
    const bus = new EventBus();

    bus.emit({ type: "event1", payload: {} });
    bus.emit({ type: "event2", payload: {} });

    const history = bus.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("event1");
    expect(history[1].type).toBe("event2");
  });
});
```

### Integration Tests

Test master-detail communication:

```typescript
// web/src/components/dashboard/__tests__/master-detail.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventBusProvider } from "@/lib/fluid-ui/EventBusContext";
import { VendorsList } from "../VendorsList";
import { ExpensesList } from "../ExpensesList";

describe("Master-Detail Communication", () => {
  it("should filter expenses when vendor is selected", async () => {
    const mockVendors = [
      { _id: "v1", name: "Vendor 1", category: "catering" },
      { _id: "v2", name: "Vendor 2", category: "photography" },
    ];

    const mockExpenses = [
      { _id: "e1", description: "Expense 1", vendor: "v1" },
      { _id: "e2", description: "Expense 2", vendor: "v2" },
    ];

    // Mock Convex queries
    useQuery.mockImplementation((endpoint) => {
      if (endpoint === api.vendors.listByEvent) return mockVendors;
      if (endpoint === api.expenses.listByEvent) return mockExpenses;
    });

    render(
      <EventBusProvider>
        <div className="grid grid-cols-2">
          <VendorsList eventId="evt_1" />
          <ExpensesList eventId="evt_1" />
        </div>
      </EventBusProvider>
    );

    // Initially shows all expenses
    expect(screen.getByText("Expense 1")).toBeInTheDocument();
    expect(screen.getByText("Expense 2")).toBeInTheDocument();

    // Click vendor 1
    fireEvent.click(screen.getByText("Vendor 1"));

    // Should filter to vendor 1 expenses
    await waitFor(() => {
      expect(screen.getByText("Filtered by vendor")).toBeInTheDocument();
    });

    // Expenses should be filtered (in actual implementation)
    // This would require mocking the filtered query response
  });
});
```

---

## Success Criteria

### Functional Requirements
- ✅ Event bus implemented with type-safe events
- ✅ At least 3 master-detail pairs working:
  - VendorsList → ExpensesList
  - TasksList → TaskDetails
  - CategoryPicker → TasksList + ExpensesList
- ✅ Connection detection automatic from metadata
- ✅ Clear filter functionality working
- ✅ Multiple details can listen to one master
- ✅ No memory leaks from subscriptions

### Visual Requirements
- ✅ Connection indicators visible on components
- ✅ Active connections highlighted
- ✅ Filter badges show in detail components
- ✅ Smooth transitions when filtering

### Performance Requirements
- ✅ Event propagation <50ms
- ✅ No layout shift when filtering
- ✅ Component updates optimized (no re-render cascades)

### Developer Experience
- ✅ TypeScript types for all events
- ✅ Development logging of events
- ✅ Connection debugger in dev mode
- ✅ Clear documentation and examples

---

## Next Steps

After Phase 3 completion:

1. **Phase 5: Polish** - Add advanced features (drag-drop, charts, animations)
2. **Production Testing** - Test all master-detail pairs with real data
3. **Performance Optimization** - Profile event bus performance at scale

---

**Status:** Ready for Implementation
**Next Review:** After Week 1 (Event bus and first master-detail pair)
**Estimated Completion:** End of Week 2
