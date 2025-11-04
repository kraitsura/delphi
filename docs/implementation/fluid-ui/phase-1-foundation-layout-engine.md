# Fluid UI Phase 1: Foundation & Layout Engine
## Agentic Dashboard System - Core Infrastructure

> **Status:** Phase 1 - Foundation (Weeks 1-2)
> **Last Updated:** November 3, 2025
> **Prerequisites:** Phase 3 Complete (AI Intelligence, Pattern Detection, Agent System)

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Prerequisites Check](#prerequisites-check)
3. [Architecture Decisions](#architecture-decisions)
4. [Core Layout System](#core-layout-system)
5. [Component Registry](#component-registry)
6. [Border Generation System](#border-generation-system)
7. [Typography & Design System](#typography--design-system)
8. [Integration Points](#integration-points)
9. [Testing Strategy](#testing-strategy)
10. [Completion Checklist](#completion-checklist)

---

## Overview & Goals

### What is Fluid UI?

The Fluid UI system enables **AI agents to dynamically generate contextual dashboards** in response to natural language queries. Instead of static views, users get relevant, on-demand interfaces that adapt to their immediate needs.

### Phase 1 Objectives

Build the **core infrastructure** that enables dashboard generation:

1. **Layout Controller Component** - React component that renders AI-generated layouts
2. **Two-Row Grid System** - CSS Grid implementation with constraint enforcement
3. **Component Registry** - Centralized metadata and component mapping
4. **Border Generation Logic** - Emergent borders at component intersections
5. **Typography System** - Ultrathin minimalist type scale
6. **Basic Metadata System** - Component configuration and layout rules

### Success Criteria

By end of Phase 1, you should be able to:
- ✅ Render a simple dashboard from a JSON configuration
- ✅ Display 2-3 basic components in grid layout
- ✅ See emergent borders at component intersections
- ✅ Typography follows ultrathin minimal aesthetic
- ✅ Component registry validates component existence
- ✅ Layout enforces two-row maximum constraint

### What Phase 1 Does NOT Include

- ❌ AI tool interface (Phase 4)
- ❌ Master-detail connections (Phase 3)
- ❌ Smart component interactivity (Phase 3)
- ❌ All 14 components (Phase 2 + Phase 5)
- ❌ Advanced features like lazy loading (Phase 5)

---

## Prerequisites Check

### From Phase 3: AI Intelligence

Ensure these are complete from Phase 3:

**Backend (Convex):**
- ✅ `tasks`, `expenses`, `polls` tables in schema
- ✅ AI pattern detection in messages
- ✅ Claude API integration
- ✅ Agent orchestration system
- ✅ Context assembly functions

**Frontend (React):**
- ✅ Real-time chat with rooms
- ✅ Message display with intents
- ✅ Event management UI
- ✅ Protected routes with auth

**Data Available via Convex Queries:**
- ✅ `api.events.get` - Event details
- ✅ `api.tasks.list` - Tasks for event
- ✅ `api.expenses.listByEvent` - Expenses
- ✅ `api.rooms.listByEvent` - Rooms

### Tech Stack Verification

```bash
# Verify dependencies
cd /web
bun list | grep -E "react|tanstack|convex"

# Should see:
# react@18+
# @tanstack/react-router@^1.x
# @tanstack/react-query@^5.x
# convex@^1.x
```

### File Structure Setup

```
web/
├── src/
│   ├── components/
│   │   ├── fluid-ui/               # NEW: Fluid UI components
│   │   │   ├── LayoutController.tsx
│   │   │   ├── ComponentRegistry.tsx
│   │   │   ├── GridRow.tsx
│   │   │   └── TextRow.tsx
│   │   └── dashboard/              # NEW: Dashboard components
│   │       ├── EventDetails.tsx
│   │       ├── TasksList.tsx
│   │       └── ExpensesSummary.tsx
│   ├── lib/
│   │   └── fluid-ui/               # NEW: Core utilities
│   │       ├── types.ts
│   │       ├── registry.ts
│   │       └── validators.ts
│   └── styles/
│       └── fluid-ui.css            # NEW: Fluid UI styles
└── convex/
    └── dashboards.ts               # NEW: Dashboard config storage
```

---

## Architecture Decisions

### Why React Component-Based (Not Code Generation)?

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **AI generates HTML/CSS** | Flexible, creative | Unsafe, inconsistent, hard to validate | ❌ |
| **AI generates React code** | Type-safe, composable | Security risk, slow, requires eval() | ❌ |
| **AI calls structured tool → Component registry** | Safe, fast, maintainable | Limited to predefined components | ✅ **CHOSEN** |

**Rationale:** AI agents use a **declarative tool interface** to compose dashboards from pre-built, data-aware components. This ensures:
- Security (no code execution)
- Performance (components are compiled)
- Reliability (validation at tool call time)
- Maintainability (components evolve independently)

### Why Two-Row Maximum?

**Cognitive Load Research:**
- Miller's Law: Humans can hold 7±2 items in working memory
- Dashboard studies show >3 sections = 40% drop in comprehension
- Mobile-first design requires vertical scrolling, not complex grids

**Implementation Benefits:**
- Simpler agent decision-making (fewer layout combinations)
- Faster rendering (less DOM complexity)
- Better mobile responsiveness
- Clearer visual hierarchy

### Why CSS Grid (Not Flexbox)?

```css
/* CSS Grid provides precise 2D control */
.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Equal columns */
  grid-template-rows: auto auto;  /* Two rows, content-sized */
  gap: 0; /* No gap, borders are emergent */
}

/* Flexbox would require nested containers */
```

**Grid advantages:**
- Explicit row/column control
- Easier to enforce layout constraints
- Better for emergent border system
- Simpler responsive breakpoints

### Why Emergent Borders?

**Traditional approach:**
```css
.component {
  border: 1px solid #e5e5e5; /* All sides */
  border-radius: 8px; /* Rounded */
}
/* Result: Visual clutter, "card" aesthetic */
```

**Emergent border approach:**
```css
.component {
  border: none; /* No default border */
  border-right: 1px solid var(--border); /* Only where meets neighbor */
  border-bottom: 1px solid var(--border); /* Only where meets row below */
}
.component:last-child {
  border-right: none; /* Remove redundant borders */
}
```

**Benefits:**
- Cleaner, more modern aesthetic
- Reduces visual noise
- Emphasizes content over containers
- Aligns with ultrathin minimal philosophy

---

## Core Layout System

### 1. Type Definitions

Create `web/src/lib/fluid-ui/types.ts`:

```typescript
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Layout section types
 */
export type SectionType = "text" | "row";

/**
 * Text section for headers, descriptions
 */
export interface TextSection {
  type: "text";
  content: string; // HTML/Markdown
  spacing?: "comfortable" | "tight" | "flush";
}

/**
 * Component row section
 */
export interface RowSection {
  type: "row";
  layout?: string; // "auto", "1:1", "2:1", "sidebar", or custom like "300px 1fr"
  components: ComponentInstance[];
}

/**
 * Component instance in a row
 */
export interface ComponentInstance {
  type: ComponentType;
  props: Record<string, any>;
  id?: string; // Optional ID for master-detail connections
}

/**
 * Complete dashboard configuration
 */
export interface DashboardConfig {
  sections: (TextSection | RowSection)[];
  metadata?: {
    generatedBy?: "agent";
    userQuery?: string;
    eventContext?: Id<"events">[];
    timestamp?: number;
  };
}

/**
 * Component types available in registry
 */
export type ComponentType =
  | "EventDetails"
  | "TasksList"
  | "TasksKanban"
  | "ExpensesSummary"
  | "ExpensesList"
  | "UpcomingPayments"
  | "Timeline"
  | "MilestoneTracker"
  | "VendorsList"
  | "VendorDetails"
  | "GuestList"
  | "RSVPStatus"
  | "UpcomingEvents"
  | "CalendarView";

/**
 * Component metadata for layout and connections
 */
export interface ComponentMetadata {
  name: string;
  description: string;
  layoutRules: {
    canShare: boolean;       // Can appear with other components in row
    mustSpanFull: boolean;   // Requires full row width
    preferredRatio: string;  // "1fr", "2fr", etc.
    minWidth?: string;
    minHeight?: string;
  };
  connections?: {
    canBeMaster: boolean;    // Can control other components
    canBeDetail: boolean;    // Can be controlled by masters
    emits?: string[];        // Events this component broadcasts
    listensTo?: string[];    // Events this component subscribes to
  };
  props: Record<string, PropDefinition>;
}

/**
 * Prop definition for validation
 */
export interface PropDefinition {
  type: "string" | "number" | "boolean" | "enum" | "object" | "array";
  required?: boolean;
  default?: any;
  description?: string;
  values?: any[]; // For enum type
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  type: "INVALID_COMPONENT" | "LAYOUT_CONFLICT" | "MISSING_REQUIRED_PROP" | "INVALID_PROP_TYPE";
  message: string;
  details?: any;
}
```

### 2. Layout Controller Component

Create `web/src/components/fluid-ui/LayoutController.tsx`:

```typescript
import { DashboardConfig, RowSection, TextSection } from "@/lib/fluid-ui/types";
import { validateDashboardConfig } from "@/lib/fluid-ui/validators";
import { GridRow } from "./GridRow";
import { TextRow } from "./TextRow";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LayoutControllerProps {
  config: DashboardConfig;
  onError?: (errors: string[]) => void;
}

/**
 * ■ Layout Controller
 * 
 * Core component that renders AI-generated dashboard layouts.
 * Validates configuration, enforces constraints, renders sections.
 * 
 * Why this exists:
 * - Central point of validation and error handling
 * - Enforces two-row maximum constraint
 * - Provides consistent wrapper for all dashboards
 * - Handles loading/error states uniformly
 */
export function LayoutController({ config, onError }: LayoutControllerProps) {
  // STEP 1: Validate configuration
  const validation = validateDashboardConfig(config);
  
  if (!validation.valid) {
    const errorMessages = validation.errors?.map(e => e.message) || [];
    onError?.(errorMessages);
    
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Invalid Dashboard Configuration</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {validation.errors?.map((err, i) => (
              <li key={i} className="text-sm">{err.message}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  // STEP 2: Count component rows (enforce two-row max)
  const componentRows = config.sections.filter(s => s.type === "row");
  if (componentRows.length > 2) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Too Many Component Rows</AlertTitle>
        <AlertDescription>
          Dashboard has {componentRows.length} component rows. Maximum is 2 for cognitive load reduction.
        </AlertDescription>
      </Alert>
    );
  }

  // STEP 3: Render sections in order
  return (
    <div className="fluid-ui-layout">
      {config.sections.map((section, index) => {
        if (section.type === "text") {
          return (
            <TextRow
              key={`text-${index}`}
              content={section.content}
              spacing={section.spacing}
            />
          );
        } else {
          return (
            <GridRow
              key={`row-${index}`}
              components={section.components}
              layout={section.layout}
            />
          );
        }
      })}
    </div>
  );
}
```

### 3. Text Row Component

Create `web/src/components/fluid-ui/TextRow.tsx`:

```typescript
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { marked } from "marked";

interface TextRowProps {
  content: string;
  spacing?: "comfortable" | "tight" | "flush";
}

/**
 * Text Row Component
 * 
 * Renders agent-generated text with symbol library support.
 * Handles HTML/Markdown safely, applies spacing rules.
 * 
 * Spacing guide:
 * - comfortable: 2rem vertical padding (major sections)
 * - tight: 1rem vertical padding (related content)
 * - flush: 0.5rem vertical padding (minimal separation)
 */
export function TextRow({ content, spacing = "comfortable" }: TextRowProps) {
  // Parse markdown to HTML
  const htmlContent = marked.parse(content) as string;
  
  // Sanitize HTML to prevent XSS
  const sanitizedContent = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "p", "strong", "em", "ul", "ol", "li", "br"],
    ALLOWED_ATTR: [],
  });

  const spacingClass = {
    comfortable: "py-8",
    tight: "py-4",
    flush: "py-2",
  }[spacing];

  return (
    <div
      className={cn(
        "fluid-ui-text-row px-6",
        spacingClass
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
```

### 4. Grid Row Component

Create `web/src/components/fluid-ui/GridRow.tsx`:

```typescript
import { ComponentInstance } from "@/lib/fluid-ui/types";
import { calculateGridLayout } from "@/lib/fluid-ui/registry";
import { ComponentRenderer } from "./ComponentRenderer";
import { cn } from "@/lib/utils";

interface GridRowProps {
  components: ComponentInstance[];
  layout?: string;
}

/**
 * Grid Row Component
 * 
 * Renders component row with CSS Grid layout.
 * Calculates column ratios, applies emergent borders.
 * 
 * Layout options:
 * - "auto": Use component metadata to calculate optimal ratio
 * - "1:1": Equal split (1fr 1fr)
 * - "2:1": Two-thirds / one-third (2fr 1fr)
 * - "sidebar": Fixed sidebar + flex content (300px 1fr)
 * - Custom: "300px 1fr 1fr" (exact grid-template-columns)
 */
export function GridRow({ components, layout = "auto" }: GridRowProps) {
  // Calculate grid template columns
  const gridTemplateColumns = calculateGridLayout(components, layout);

  return (
    <div
      className="fluid-ui-grid-row"
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: 0, // No gap, borders are emergent
      }}
    >
      {components.map((component, index) => (
        <div
          key={component.id || `${component.type}-${index}`}
          className={cn(
            "fluid-ui-component-cell",
            // Emergent border logic
            index < components.length - 1 && "border-r border-border",
            "border-b border-border"
          )}
        >
          <ComponentRenderer
            type={component.type}
            props={component.props}
            componentId={component.id}
          />
        </div>
      ))}
    </div>
  );
}
```

### 5. Component Renderer

Create `web/src/components/fluid-ui/ComponentRenderer.tsx`:

```typescript
import { ComponentType } from "@/lib/fluid-ui/types";
import { getComponent } from "@/lib/fluid-ui/registry";
import { Suspense } from "react";
import { ComponentSkeleton } from "./ComponentSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ComponentRendererProps {
  type: ComponentType;
  props: Record<string, any>;
  componentId?: string;
}

/**
 * Component Renderer
 * 
 * Looks up component in registry and renders it.
 * Handles loading states, errors, missing components.
 */
export function ComponentRenderer({ type, props, componentId }: ComponentRendererProps) {
  try {
    const ComponentFromRegistry = getComponent(type);

    if (!ComponentFromRegistry) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Component "{type}" not found in registry
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Suspense fallback={<ComponentSkeleton type={type} />}>
        <ComponentFromRegistry {...props} componentId={componentId} />
      </Suspense>
    );
  } catch (error) {
    console.error(`Error rendering component ${type}:`, error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to render {type}
        </AlertDescription>
      </Alert>
    );
  }
}
```

### 6. Component Skeleton

Create `web/src/components/fluid-ui/ComponentSkeleton.tsx`:

```typescript
import { ComponentType } from "@/lib/fluid-ui/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ComponentSkeletonProps {
  type: ComponentType;
}

/**
 * Component Loading Skeleton
 * 
 * Type-aware loading states for components.
 */
export function ComponentSkeleton({ type }: ComponentSkeletonProps) {
  // Customize skeleton based on component type
  const isListType = type.includes("List") || type.includes("Timeline");
  const isSummaryType = type.includes("Summary") || type.includes("Details");

  if (isListType) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (isSummaryType) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
```

---

## Component Registry

### 1. Registry Core

Create `web/src/lib/fluid-ui/registry.ts`:

```typescript
import { ComponentType, ComponentMetadata, ComponentInstance } from "./types";
import type { ComponentType as ReactComponentType } from "react";

/**
 * Component registry map
 * Maps component type string → React component + metadata
 */
const COMPONENT_REGISTRY: Record<
  ComponentType,
  {
    component: ReactComponentType<any>;
    metadata: ComponentMetadata;
  }
> = {} as any; // Will be populated below

/**
 * Register a component with metadata
 */
export function registerComponent(
  type: ComponentType,
  component: ReactComponentType<any>,
  metadata: ComponentMetadata
) {
  COMPONENT_REGISTRY[type] = { component, metadata };
}

/**
 * Get component from registry
 */
export function getComponent(type: ComponentType): ReactComponentType<any> | null {
  return COMPONENT_REGISTRY[type]?.component || null;
}

/**
 * Get component metadata
 */
export function getComponentMetadata(type: ComponentType): ComponentMetadata | null {
  return COMPONENT_REGISTRY[type]?.metadata || null;
}

/**
 * Get all registered component types
 */
export function getRegisteredComponents(): ComponentType[] {
  return Object.keys(COMPONENT_REGISTRY) as ComponentType[];
}

/**
 * Calculate grid layout based on components and layout string
 */
export function calculateGridLayout(
  components: ComponentInstance[],
  layout: string = "auto"
): string {
  // Handle custom layout strings
  if (layout !== "auto") {
    switch (layout) {
      case "1:1":
        return "1fr 1fr";
      case "2:1":
        return "2fr 1fr";
      case "1:2":
        return "1fr 2fr";
      case "sidebar":
        return "300px 1fr";
      default:
        // Assume it's a valid grid-template-columns value
        return layout;
    }
  }

  // Auto-calculate based on component metadata
  const metadata = components.map(c => getComponentMetadata(c.type));

  // Check if any component must span full
  if (metadata.some(m => m?.layoutRules.mustSpanFull)) {
    return "1fr";
  }

  // Use preferred ratios
  if (metadata.every(m => m?.layoutRules.canShare)) {
    const ratios = metadata.map(m => m?.layoutRules.preferredRatio || "1fr");
    return ratios.join(" ");
  }

  // Default: equal split
  return components.map(() => "1fr").join(" ");
}
```

### 2. Component Metadata Definitions

Create `web/src/lib/fluid-ui/component-metadata.ts`:

```typescript
import { ComponentMetadata } from "./types";

/**
 * ■ EventDetails Metadata
 */
export const EventDetailsMetadata: ComponentMetadata = {
  name: "EventDetails",
  description: "Displays event name, date, venue, guest count, and status",
  layoutRules: {
    canShare: false,        // Cannot share row with other components
    mustSpanFull: true,     // Requires full row width
    preferredRatio: "1fr",
    minHeight: "200px",
  },
  props: {
    eventId: {
      type: "string",
      required: true,
      description: "Unique identifier for the event",
    },
    showStatus: {
      type: "boolean",
      default: true,
      description: "Whether to display planning status",
    },
  },
};

/**
 * ● TasksList Metadata
 */
export const TasksListMetadata: ComponentMetadata = {
  name: "TasksList",
  description: "Displays tasks with status, assignee, and due dates. Can filter by status, assignee, or date range.",
  layoutRules: {
    canShare: true,         // Can share row
    mustSpanFull: false,
    preferredRatio: "1fr",
    minWidth: "300px",
  },
  connections: {
    canBeMaster: true,      // Can control other components
    emits: ["taskSelected", "statusChanged"],
  },
  props: {
    eventId: {
      type: "string",
      required: true,
    },
    status: {
      type: "enum",
      values: ["pending", "in-progress", "completed", "all"],
      default: "all",
    },
    assignee: {
      type: "string",
      required: false,
    },
    dueDate: {
      type: "string",
      required: false,
      description: "ISO date string for filtering by due date",
    },
  },
};

/**
 * ● ExpensesSummary Metadata
 */
export const ExpensesSummaryMetadata: ComponentMetadata = {
  name: "ExpensesSummary",
  description: "Shows budget overview, spending breakdown, and remaining budget",
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "2fr", // Prefers more space
    minWidth: "400px",
  },
  props: {
    eventId: {
      type: "string",
      required: true,
    },
  },
};

// Export all metadata
export const COMPONENT_METADATA_MAP = {
  EventDetails: EventDetailsMetadata,
  TasksList: TasksListMetadata,
  ExpensesSummary: ExpensesSummaryMetadata,
  // Phase 2+ will add more
};
```

---

## Border Generation System

### CSS Implementation

Create `web/src/styles/fluid-ui.css`:

```css
/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * FLUID UI DESIGN SYSTEM
 * Ultrathin Minimalist Aesthetic
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:root {
  /* Border colors */
  --fluid-border: hsl(0 0% 90%);
  --fluid-border-dark: hsl(0 0% 20%);
  
  /* Spacing scale */
  --fluid-spacing-comfortable: 2rem;
  --fluid-spacing-tight: 1rem;
  --fluid-spacing-flush: 0.5rem;
}

.dark {
  --fluid-border: hsl(0 0% 20%);
}

/**
 * Layout Container
 */
.fluid-ui-layout {
  width: 100%;
  background: hsl(0 0% 100%);
}

.dark .fluid-ui-layout {
  background: hsl(0 0% 5%);
}

/**
 * Text Row Styling
 */
.fluid-ui-text-row {
  font-weight: 300; /* Ultrathin base */
  line-height: 1.6;
}

.fluid-ui-text-row h1 {
  font-weight: 300;
  font-size: 2rem;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.fluid-ui-text-row h2 {
  font-weight: 400;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.5rem;
}

.fluid-ui-text-row h3 {
  font-weight: 400;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.fluid-ui-text-row p {
  font-weight: 300;
  margin-bottom: 0.75rem;
}

.fluid-ui-text-row strong {
  font-weight: 600; /* Only for emphasis */
}

.fluid-ui-text-row em {
  font-style: italic;
  font-weight: 300;
}

/**
 * Grid Row with Emergent Borders
 */
.fluid-ui-grid-row {
  /* Grid is set inline via style prop */
  min-height: 300px;
}

/**
 * Component Cell with Emergent Borders
 * 
 * Key concept: Borders only appear WHERE COMPONENTS MEET
 * - Right border: Only if not last in row
 * - Bottom border: Always (creates separation from next row)
 * - No top/left borders: Emergent from adjacent cells
 */
.fluid-ui-component-cell {
  position: relative;
  padding: 1.5rem;
  border-style: solid;
  border-color: var(--fluid-border);
  border-width: 0; /* Start with no borders */
  
  /* Background for contrast */
  background: hsl(0 0% 100%);
}

.dark .fluid-ui-component-cell {
  background: hsl(0 0% 5%);
  border-color: var(--fluid-border-dark);
}

/**
 * Last row component: Remove bottom border
 */
.fluid-ui-grid-row:last-child .fluid-ui-component-cell {
  border-bottom: none;
}

/**
 * Component inner content
 */
.fluid-ui-component-cell > * {
  font-weight: 300; /* Ultrathin default */
}

/**
 * Responsive adjustments
 */
@media (max-width: 768px) {
  .fluid-ui-grid-row {
    grid-template-columns: 1fr !important; /* Single column on mobile */
  }
  
  .fluid-ui-component-cell {
    border-right: none !important;
  }
  
  .fluid-ui-component-cell:not(:last-child) {
    border-bottom: 1px solid var(--fluid-border);
  }
}
```

---

## Typography & Design System

### Symbol Library Integration

Create `web/src/lib/fluid-ui/symbols.ts`:

```typescript
/**
 * Curated symbol library for Fluid UI
 * 
 * Usage in text rows:
 * <h1>■ Budget Overview</h1>
 * <p>● Total spent: <strong>$42,350</strong></p>
 * <p>▲ Trending up this month</p>
 */
export const SYMBOLS = {
  // Section markers
  SQUARE: "■",           // Primary sections
  CIRCLE: "●",           // Subsections, bullets
  
  // Directional
  ARROW_RIGHT: "→",      // Actions, next steps
  ARROW_LEFT: "←",       // Back, previous
  TRIANGLE_UP: "▲",      // Increase, up-trend
  TRIANGLE_DOWN: "▼",    // Decrease, down-trend
  
  // Status
  CHECK: "✓",            // Completed, confirmed
  LIGHTNING: "⚡",       // Urgent, important
  HEXAGON: "⬢",          // Special items
  
  // Separators
  HEAVY_LINE: "━",       // Visual separator
} as const;

/**
 * Helper to insert symbols in text
 */
export function withSymbol(symbol: keyof typeof SYMBOLS, text: string): string {
  return `${SYMBOLS[symbol]} ${text}`;
}

/**
 * Common symbol patterns
 */
export const SYMBOL_PATTERNS = {
  section: (title: string) => `■ ${title}`,
  subsection: (title: string) => `● ${title}`,
  action: (text: string) => `→ ${text}`,
  urgent: (text: string) => `⚡ ${text}`,
  completed: (text: string) => `✓ ${text}`,
  separator: () => "━".repeat(50),
};
```

### Typography Utilities

Create `web/src/lib/fluid-ui/typography.ts`:

```typescript
/**
 * Typography scale for Fluid UI
 */
export const TYPOGRAPHY = {
  h1: {
    fontSize: "2rem",
    fontWeight: 300,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  h2: {
    fontSize: "1.5rem",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    lineHeight: 1.3,
  },
  h3: {
    fontSize: "1.25rem",
    fontWeight: 400,
    lineHeight: 1.4,
  },
  body: {
    fontSize: "1rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  small: {
    fontSize: "0.875rem",
    fontWeight: 300,
    lineHeight: 1.5,
  },
  emphasis: {
    fontWeight: 600, // Only for strong emphasis
  },
} as const;

/**
 * Apply typography preset
 */
export function applyTypography(
  element: keyof typeof TYPOGRAPHY
): React.CSSProperties {
  return TYPOGRAPHY[element] as React.CSSProperties;
}
```

---

## Integration Points

### 1. Convex Backend: Dashboard Storage

Create `web/convex/dashboards.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Store dashboard configuration
 * 
 * Used to persist user-customized dashboards or
 * cache AI-generated configurations.
 */
export const save = mutation({
  args: {
    eventId: v.id("events"),
    config: v.any(), // DashboardConfig JSON
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;

    const dashboardId = await ctx.db.insert("dashboards", {
      eventId: args.eventId,
      userId,
      config: args.config,
      name: args.name || "Untitled Dashboard",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return dashboardId;
  },
});

/**
 * Load dashboard configuration
 */
export const load = query({
  args: { dashboardId: v.id("dashboards") },
  handler: async (ctx, args) => {
    const dashboard = await ctx.db.get(args.dashboardId);
    return dashboard;
  },
});

/**
 * List dashboards for event
 */
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject as Id<"users">;

    const dashboards = await ctx.db
      .query("dashboards")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", userId)
      )
      .order("desc")
      .collect();

    return dashboards;
  },
});
```

### 2. Add Dashboard Schema

Update `web/convex/schema.ts`:

```typescript
// Add to existing schema:

dashboards: defineTable({
  eventId: v.id("events"),
  userId: v.id("users"),
  
  // Dashboard configuration (JSON)
  config: v.any(),
  
  // Metadata
  name: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_event_and_user", ["eventId", "userId"])
  .index("by_user", ["userId"]),
```

### 3. React Route Integration

Update `web/src/routes/_authed/events.$eventId.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LayoutController } from "@/components/fluid-ui/LayoutController";
import { DashboardConfig } from "@/lib/fluid-ui/types";
import { useState } from "react";

export const Route = createFileRoute("/_authed/events/$eventId")({
  component: EventDashboard,
});

function EventDashboard() {
  const { eventId } = Route.useParams();
  const event = useQuery(api.events.get, { eventId });

  // Example: Static dashboard config for Phase 1 testing
  const [dashboardConfig] = useState<DashboardConfig>({
    sections: [
      {
        type: "text",
        content: `<h1>■ ${event?.name || "Event"} Planning</h1><p>Overview and current status</p>`,
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "EventDetails",
            props: { eventId },
          },
          {
            type: "TasksList",
            props: { eventId, status: "pending" },
          },
        ],
      },
      {
        type: "text",
        content: "<h2>● Budget Status</h2>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesSummary",
            props: { eventId },
          },
        ],
      },
    ],
    metadata: {
      generatedBy: "agent",
      timestamp: Date.now(),
    },
  });

  if (!event) {
    return <div>Loading event...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <LayoutController
        config={dashboardConfig}
        onError={(errors) => console.error("Dashboard errors:", errors)}
      />
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

Create `web/src/lib/fluid-ui/__tests__/validators.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateDashboardConfig } from "../validators";
import { DashboardConfig } from "../types";

describe("Dashboard Config Validation", () => {
  it("validates correct config", () => {
    const config: DashboardConfig = {
      sections: [
        {
          type: "text",
          content: "Test header",
        },
        {
          type: "row",
          components: [
            { type: "EventDetails", props: { eventId: "123" } },
          ],
        },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects more than 2 component rows", () => {
    const config: DashboardConfig = {
      sections: [
        { type: "row", components: [{ type: "EventDetails", props: {} }] },
        { type: "row", components: [{ type: "TasksList", props: {} }] },
        { type: "row", components: [{ type: "ExpensesSummary", props: {} }] },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0].type).toBe("LAYOUT_CONFLICT");
  });

  it("rejects invalid component types", () => {
    const config: DashboardConfig = {
      sections: [
        {
          type: "row",
          components: [
            { type: "NonExistentComponent" as any, props: {} },
          ],
        },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0].type).toBe("INVALID_COMPONENT");
  });
});
```

### Integration Test

Create `web/src/components/fluid-ui/__tests__/LayoutController.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutController } from "../LayoutController";
import { DashboardConfig } from "@/lib/fluid-ui/types";

describe("LayoutController", () => {
  it("renders text rows", () => {
    const config: DashboardConfig = {
      sections: [
        {
          type: "text",
          content: "<h1>Test Header</h1>",
        },
      ],
    };

    render(<LayoutController config={config} />);
    expect(screen.getByText("Test Header")).toBeInTheDocument();
  });

  it("shows error for invalid config", () => {
    const config: DashboardConfig = {
      sections: [
        {
          type: "row",
          components: [] as any, // Empty components array (invalid)
        },
      ],
    };

    render(<LayoutController config={config} />);
    expect(screen.getByText(/Invalid Dashboard Configuration/i)).toBeInTheDocument();
  });
});
```

---

## Completion Checklist

### Week 1: Core Infrastructure

- [ ] **Day 1-2: Type System**
  - [ ] Create `types.ts` with all interfaces
  - [ ] Create `validators.ts` with validation functions
  - [ ] Write unit tests for validators

- [ ] **Day 3-4: Layout System**
  - [ ] Implement `LayoutController.tsx`
  - [ ] Implement `TextRow.tsx` with markdown support
  - [ ] Implement `GridRow.tsx` with CSS Grid
  - [ ] Create `fluid-ui.css` with emergent borders

- [ ] **Day 5: Component Infrastructure**
  - [ ] Implement `ComponentRenderer.tsx`
  - [ ] Implement `ComponentSkeleton.tsx`
  - [ ] Create `registry.ts` core functions

### Week 2: First Components & Integration

- [ ] **Day 1-2: Basic Components (Phase 2 preview)**
  - [ ] Implement `EventDetails.tsx`
  - [ ] Implement `TasksList.tsx` (read-only for now)
  - [ ] Implement `ExpensesSummary.tsx` (read-only)
  - [ ] Register components with metadata

- [ ] **Day 3-4: Backend Integration**
  - [ ] Create `dashboards.ts` Convex functions
  - [ ] Update schema with `dashboards` table
  - [ ] Test dashboard save/load

- [ ] **Day 5: Route Integration & Testing**
  - [ ] Update event route to use `LayoutController`
  - [ ] Create test dashboard configs
  - [ ] Manual testing of all layouts
  - [ ] Write integration tests

### Validation Criteria

✅ **Phase 1 Complete When:**
1. Can render a dashboard from JSON config
2. Two-row constraint is enforced
3. Emergent borders appear correctly
4. Typography matches ultrathin minimal aesthetic
5. All 3 basic components render with real Convex data
6. Mobile responsive (1 column on mobile)
7. Loading skeletons work
8. Error states handled gracefully
9. Unit tests pass (>90% coverage)
10. Integration tests pass

---

## Next Steps: Phase 2

Phase 2 will build the remaining **Smart Component System**:

**Week 3-4 Focus:**
- Implement 6 essential components:
  - Timeline component with milestone visualization
  - VendorsList with contact info
  - GuestList with RSVP tracking
  - UpcomingPayments with due dates
  - TasksKanban board view
  - CalendarView widget

- Self-fetching data patterns:
  - Each component queries Convex directly
  - Handles own loading/error states
  - Props control filtering/sorting

- Component interactivity:
  - Click handlers
  - Local state management
  - Optimistic updates

**Phase 2 will enable:**
- More diverse dashboard compositions
- Richer event management UX
- Foundation for master-detail connections (Phase 3)

---

## Appendix: File Checklist

Create these files for Phase 1:

```
web/src/
├── lib/fluid-ui/
│   ├── types.ts                     # Core type definitions
│   ├── registry.ts                  # Component registry
│   ├── validators.ts                # Config validation
│   ├── symbols.ts                   # Symbol library
│   ├── typography.ts                # Typography utilities
│   └── component-metadata.ts        # Component metadata
│
├── components/fluid-ui/
│   ├── LayoutController.tsx         # Main layout component
│   ├── TextRow.tsx                  # Text section renderer
│   ├── GridRow.tsx                  # Component row renderer
│   ├── ComponentRenderer.tsx        # Component lookup
│   └── ComponentSkeleton.tsx        # Loading states
│
├── components/dashboard/
│   ├── EventDetails.tsx             # Event info component
│   ├── TasksList.tsx                # Tasks list component
│   └── ExpensesSummary.tsx          # Budget summary component
│
└── styles/
    └── fluid-ui.css                 # Fluid UI styles

web/convex/
└── dashboards.ts                    # Dashboard CRUD operations
```

Install additional dependencies:

```bash
cd web
bun add dompurify marked
bun add -D @types/dompurify
```

---

**Phase 1 Status:** Ready to Implement
**Estimated Time:** 2 weeks (10 working days)
**Next Review:** After Phase 1 completion, before Phase 2 kickoff
