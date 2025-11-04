# Phase 1: Foundation & Layout System
## Fluid UI Implementation

**Duration:** 2 weeks (10 working days)
**Priority:** Critical
**Status:** Not Started

---

## Table of Contents

1. [Overview](#overview)
2. [Objectives](#objectives)
3. [Architecture Design](#architecture-design)
4. [Technical Specifications](#technical-specifications)
5. [Implementation Guide](#implementation-guide)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Overview

### What We're Building

Phase 1 establishes the foundational infrastructure for the Fluid UI system - a dynamic dashboard generation system that creates contextual interfaces on-demand. This phase focuses on the core layout engine that enables composition of smart components without requiring major refactoring of existing features.

### Current State Analysis

**Existing Foundation:**
- React 18+ with TanStack Router
- 16 shadcn/ui components (Card, Button, Input, Tabs, Dialog, etc.)
- Card-based layout patterns (2-col, 3-col, 4-col grids)
- Convex real-time backend with BetterAuth
- Database schema complete (Events, Rooms, Tasks, Expenses, Polls)

**What's Missing:**
- Dynamic layout system (current layouts are hardcoded)
- Component registry and metadata system
- Declarative layout controller
- Ultrathin minimal aesthetic
- Symbol library (■●▲▼→←⚡⬢━✓)
- Emergent border system

### Design Philosophy

**Ultrathin Minimalism:**
- Borderless components with emergent borders only at intersections
- Font weight: 300-400 (ultrathin base), 600 for emphasis only
- No shadows, no gradients, sharp edges
- Pure black on white (dark mode: white on black)
- Generous whitespace

**Two-Row Architecture:**
- Maximum 2 component rows per dashboard section
- Text rows for narrative and context
- Component rows for data visualization
- Reduces cognitive load and ensures mobile responsiveness

---

## Objectives

### Primary Goals

1. **Build Layout Engine** - Create a declarative layout controller that renders dashboards from JSON configuration
2. **Establish Component Registry** - Implement registration system with metadata for smart components
3. **Define Type System** - Complete TypeScript interfaces and validation
4. **Implement Visual Design** - Create ultrathin minimal aesthetic with emergent borders
5. **Enable Real-Time Updates** - Integrate with Convex for reactive dashboard state

### Non-Goals (Deferred to Later Phases)

- ❌ AI agent integration (Phase 4)
- ❌ Master-detail communication (Phase 3)
- ❌ Advanced animations (Phase 5)
- ❌ Building smart components (Phase 2)

---

## Architecture Design

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard Data                          │
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
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Component Registry                         │
│  { componentType → { component, metadata } }                 │
│  • Lookup components by type                                 │
│  • Provide metadata for layout decisions                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Static JSON Config or Convex State
     │
     ▼
Validation Layer (Zod schemas)
     │
     ▼
Layout Controller
     │
     ├─→ TextRow Renderer (Markdown/HTML)
     │
     └─→ GridRow Renderer
           │
           └─→ ComponentRenderer (looks up in registry)
                 │
                 └─→ Smart Component (renders with props)
```

### Layout Structure

Each dashboard configuration follows this structure:

```typescript
{
  sections: [
    // Text Row
    {
      type: "text",
      content: "<h1>■ Budget Overview</h1><p>Total: <strong>$40k</strong></p>",
      spacing: "comfortable" // comfortable | tight | flush
    },

    // Component Row
    {
      type: "row",
      layout: "2:1", // auto | 1:1 | 2:1 | 3:1 | sidebar | custom
      components: [
        {
          type: "ExpensesSummary",
          props: { eventId: "abc123" },
          id: "expense-summary-1"
        },
        {
          type: "UpcomingPayments",
          props: { eventId: "abc123", daysAhead: 30 },
          id: "payments-1"
        }
      ]
    }
  ]
}
```

### Component Metadata System

Each registered component includes metadata:

```typescript
interface ComponentMetadata {
  name: string;
  description: string;

  // Layout constraints
  layoutRules: {
    canShare: boolean;         // Can appear with other components?
    mustSpanFull: boolean;      // Requires full row width?
    preferredRatio: string;     // "1fr", "2fr", "300px"
    minWidth?: string;          // Minimum width constraint
    minHeight?: string;         // Minimum height constraint
  };

  // Connection capabilities (Phase 3)
  connections?: {
    canBeMaster: boolean;       // Can emit events to control others
    canBeDetail: boolean;       // Can listen to master events
    emits?: string[];           // Event types this component emits
    listensTo?: string[];       // Event types this component listens to
  };

  // Props definition
  props: Record<string, PropDefinition>;
}
```

---

## Technical Specifications

### File Structure

```
web/src/
├── lib/fluid-ui/
│   ├── types.ts                    # Core TypeScript interfaces
│   ├── validators.ts               # Zod validation schemas
│   ├── registry.ts                 # Component registry core
│   ├── component-metadata.ts       # Metadata type definitions
│   ├── layout-calculator.ts        # Layout ratio calculation
│   ├── symbols.ts                  # Symbol library constants
│   └── typography.ts               # Typography utilities
│
├── components/fluid-ui/
│   ├── LayoutController.tsx        # Main orchestrator
│   ├── TextRow.tsx                 # Text section renderer
│   ├── GridRow.tsx                 # Component row with CSS Grid
│   ├── ComponentRenderer.tsx       # Component lookup & instantiation
│   ├── ComponentSkeleton.tsx       # Loading states
│   └── DashboardError.tsx          # Error boundaries
│
├── styles/
│   └── fluid-ui.css                # Ultrathin minimal aesthetic
│
└── hooks/
    └── useDashboard.ts             # Hook for dashboard state

web/convex/
├── dashboards.ts                   # Dashboard CRUD operations
└── schema.ts                       # Updated with dashboards table
```

### Type Definitions

Create `web/src/lib/fluid-ui/types.ts`:

```typescript
/**
 * Core Types for Fluid UI System
 */

// Spacing options for text rows
export type Spacing = "comfortable" | "tight" | "flush";

// Layout ratios for component rows
export type LayoutRatio =
  | "auto"      // Smart default based on component metadata
  | "1:1"       // Equal split
  | "2:1"       // Primary + secondary
  | "3:1"       // Dominant primary
  | "sidebar"   // Fixed sidebar (300px + flex)
  | string[];   // Custom like ["300px", "1fr", "2fr"]

// Text section
export interface TextSection {
  type: "text";
  content: string;        // HTML/Markdown string
  spacing?: Spacing;
}

// Component instance
export interface ComponentInstance {
  type: string;           // Component type from registry
  props: Record<string, any>;
  id?: string;            // Optional ID for connections
}

// Component row
export interface RowSection {
  type: "row";
  layout?: LayoutRatio;
  components: ComponentInstance[];
}

// Dashboard section (union type)
export type DashboardSection = TextSection | RowSection;

// Complete dashboard configuration
export interface DashboardConfig {
  sections: DashboardSection[];
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: number;
    updatedAt?: number;
  };
}

// Component metadata
export interface ComponentMetadata {
  name: string;
  description: string;

  layoutRules: {
    canShare: boolean;
    mustSpanFull: boolean;
    preferredRatio: string;
    minWidth?: string;
    minHeight?: string;
  };

  connections?: {
    canBeMaster: boolean;
    canBeDetail: boolean;
    emits?: string[];
    listensTo?: string[];
  };

  props: Record<string, PropDefinition>;
}

// Prop definition for validation
export interface PropDefinition {
  type: "string" | "number" | "boolean" | "object" | "array" | "enum";
  required: boolean;
  default?: any;
  description?: string;
  values?: string[]; // For enum type
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string[];
  details?: any;
}

// Registry entry
export interface RegistryEntry {
  component: React.ComponentType<any>;
  metadata: ComponentMetadata;
}
```

### Validation Schemas

Create `web/src/lib/fluid-ui/validators.ts`:

```typescript
import { z } from "zod";
import { getComponentMetadata } from "./registry";

/**
 * Zod schemas for runtime validation
 */

// Text section schema
const textSectionSchema = z.object({
  type: z.literal("text"),
  content: z.string().min(1, "Content cannot be empty"),
  spacing: z.enum(["comfortable", "tight", "flush"]).optional().default("comfortable"),
});

// Component instance schema (basic)
const componentInstanceSchema = z.object({
  type: z.string(),
  props: z.record(z.any()),
  id: z.string().optional(),
});

// Row section schema (basic structure)
const rowSectionSchema = z.object({
  type: z.literal("row"),
  layout: z.union([
    z.literal("auto"),
    z.literal("1:1"),
    z.literal("2:1"),
    z.literal("3:1"),
    z.literal("sidebar"),
    z.array(z.string()),
  ]).optional().default("auto"),
  components: z.array(componentInstanceSchema).min(1).max(3),
});

// Dashboard config schema
export const dashboardConfigSchema = z.object({
  sections: z.array(z.union([textSectionSchema, rowSectionSchema])),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
  }).optional(),
});

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(config: any): ValidationResult {
  try {
    // Basic schema validation
    dashboardConfigSchema.parse(config);

    // Custom validations
    const errors: ValidationError[] = [];

    // Check component count constraint (max 2 rows)
    const rowSections = config.sections.filter((s: any) => s.type === "row");
    if (rowSections.length > 2) {
      errors.push({
        code: "MAX_ROWS_EXCEEDED",
        message: "Maximum 2 component rows allowed per dashboard",
        details: { found: rowSections.length, max: 2 },
      });
    }

    // Validate each component
    config.sections.forEach((section: any, sectionIdx: number) => {
      if (section.type === "row") {
        section.components.forEach((comp: any, compIdx: number) => {
          // Check component exists in registry
          const metadata = getComponentMetadata(comp.type);
          if (!metadata) {
            errors.push({
              code: "INVALID_COMPONENT",
              message: `Component "${comp.type}" not found in registry`,
              path: ["sections", sectionIdx, "components", compIdx],
            });
            return;
          }

          // Check layout rules
          if (metadata.layoutRules.mustSpanFull && section.components.length > 1) {
            errors.push({
              code: "LAYOUT_CONFLICT",
              message: `Component "${comp.type}" requires full row width but is placed with other components`,
              path: ["sections", sectionIdx, "components", compIdx],
            });
          }

          // Validate props
          const propErrors = validateComponentProps(comp.type, comp.props);
          errors.push(...propErrors);
        });
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => ({
          code: "SCHEMA_VALIDATION_ERROR",
          message: e.message,
          path: e.path.map(String),
        })),
      };
    }

    return {
      valid: false,
      errors: [{
        code: "UNKNOWN_ERROR",
        message: String(error),
      }],
    };
  }
}

/**
 * Validate component props against metadata
 */
function validateComponentProps(componentType: string, props: Record<string, any>): ValidationError[] {
  const metadata = getComponentMetadata(componentType);
  if (!metadata) return [];

  const errors: ValidationError[] = [];

  // Check required props
  Object.entries(metadata.props).forEach(([propName, propDef]) => {
    if (propDef.required && !(propName in props)) {
      errors.push({
        code: "MISSING_REQUIRED_PROP",
        message: `Component "${componentType}" requires prop "${propName}"`,
        details: { componentType, propName },
      });
    }
  });

  // Check prop types (basic validation)
  Object.entries(props).forEach(([propName, propValue]) => {
    const propDef = metadata.props[propName];
    if (!propDef) {
      errors.push({
        code: "UNKNOWN_PROP",
        message: `Component "${componentType}" does not accept prop "${propName}"`,
        details: { componentType, propName },
      });
      return;
    }

    // Type validation
    const actualType = Array.isArray(propValue) ? "array" : typeof propValue;
    if (propDef.type !== actualType && propValue !== null && propValue !== undefined) {
      errors.push({
        code: "INVALID_PROP_TYPE",
        message: `Prop "${propName}" on component "${componentType}" expected ${propDef.type} but got ${actualType}`,
        details: { componentType, propName, expected: propDef.type, actual: actualType },
      });
    }
  });

  return errors;
}
```

### Component Registry

Create `web/src/lib/fluid-ui/registry.ts`:

```typescript
import type { ComponentMetadata, RegistryEntry } from "./types";

/**
 * Component Registry
 * Central registry for all dashboard components
 */

const registry = new Map<string, RegistryEntry>();

/**
 * Register a component with metadata
 */
export function registerComponent(
  type: string,
  component: React.ComponentType<any>,
  metadata: ComponentMetadata
) {
  if (registry.has(type)) {
    console.warn(`Component "${type}" is already registered. Overwriting.`);
  }

  registry.set(type, { component, metadata });
}

/**
 * Get component by type
 */
export function getComponent(type: string): React.ComponentType<any> | null {
  return registry.get(type)?.component || null;
}

/**
 * Get component metadata
 */
export function getComponentMetadata(type: string): ComponentMetadata | null {
  return registry.get(type)?.metadata || null;
}

/**
 * Get all registered component types
 */
export function getAllComponentTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Check if component exists
 */
export function hasComponent(type: string): boolean {
  return registry.has(type);
}

/**
 * Calculate grid layout from components and layout preference
 */
export function calculateGridLayout(
  components: any[],
  layoutPreference: string = "auto"
): string {
  // If only one component, always full width
  if (components.length === 1) {
    return "1fr";
  }

  // Check if any component must span full
  const hasFullSpanRequired = components.some(comp => {
    const metadata = getComponentMetadata(comp.type);
    return metadata?.layoutRules.mustSpanFull;
  });

  if (hasFullSpanRequired) {
    throw new Error("Cannot place full-span component with other components");
  }

  // Handle layout preference
  if (layoutPreference === "auto") {
    // Use preferred ratios from metadata
    const ratios = components.map(comp => {
      const metadata = getComponentMetadata(comp.type);
      return metadata?.layoutRules.preferredRatio || "1fr";
    });
    return ratios.join(" ");
  }

  if (layoutPreference === "1:1") {
    return components.map(() => "1fr").join(" ");
  }

  if (layoutPreference === "2:1") {
    return components.length === 2 ? "2fr 1fr" : "2fr 1fr 1fr";
  }

  if (layoutPreference === "3:1") {
    return components.length === 2 ? "3fr 1fr" : "3fr 1fr 1fr";
  }

  if (layoutPreference === "sidebar") {
    return `300px ${components.slice(1).map(() => "1fr").join(" ")}`;
  }

  // Custom array
  if (Array.isArray(layoutPreference)) {
    return layoutPreference.join(" ");
  }

  // Default to equal split
  return components.map(() => "1fr").join(" ");
}
```

### Symbol Library

Create `web/src/lib/fluid-ui/symbols.ts`:

```typescript
/**
 * Symbol Library for Fluid UI
 * Curated set of Unicode symbols for visual hierarchy
 */

export const SYMBOLS = {
  // Primary sections and categories
  BLACK_SQUARE: "■",

  // Bullets and status markers
  BLACK_CIRCLE: "●",

  // Trends and priorities
  TRIANGLE_UP: "▲",
  TRIANGLE_DOWN: "▼",

  // Actions and flow
  ARROW_RIGHT: "→",
  ARROW_LEFT: "←",

  // Urgency and importance
  THUNDERBOLT: "⚡",

  // Unique items
  HEXAGON: "⬢",

  // Visual separators
  HEAVY_LINE: "━",

  // Completion
  CHECK_MARK: "✓",
} as const;

/**
 * Helper to format section headers
 */
export function formatSectionHeader(symbol: keyof typeof SYMBOLS, text: string): string {
  return `${SYMBOLS[symbol]} ${text}`;
}

/**
 * Helper to create list items
 */
export function formatListItem(text: string): string {
  return `${SYMBOLS.BLACK_CIRCLE} ${text}`;
}

/**
 * Helper to indicate trends
 */
export function formatTrend(value: number, text: string): string {
  const symbol = value > 0 ? SYMBOLS.TRIANGLE_UP : value < 0 ? SYMBOLS.TRIANGLE_DOWN : SYMBOLS.BLACK_CIRCLE;
  return `${symbol} ${text}`;
}
```

---

## Implementation Guide

### Step 1: Install Dependencies

```bash
cd web
bun add zod marked dompurify
bun add -D @types/marked @types/dompurify
```

### Step 2: Create Type System

1. Create all files in `web/src/lib/fluid-ui/`:
   - `types.ts` (copy from Technical Specifications above)
   - `validators.ts` (copy from Technical Specifications above)
   - `registry.ts` (copy from Technical Specifications above)
   - `symbols.ts` (copy from Technical Specifications above)

2. Create `typography.ts` for typography utilities:

```typescript
/**
 * Typography utilities for Fluid UI
 */

export const FONT_WEIGHTS = {
  ultrathin: 300,
  regular: 400,
  emphasis: 600,
} as const;

export const FONT_SIZES = {
  h1: "2rem",        // 32px
  h2: "1.5rem",      // 24px
  h3: "1.25rem",     // 20px
  body: "1rem",      // 16px
  small: "0.875rem", // 14px
} as const;

export const LINE_HEIGHTS = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const LETTER_SPACING = {
  tight: "-0.02em",
  normal: "0",
  wide: "0.05em",
} as const;
```

### Step 3: Create Layout Controller

Create `web/src/components/fluid-ui/LayoutController.tsx`:

```typescript
import React from "react";
import { DashboardConfig } from "@/lib/fluid-ui/types";
import { validateDashboardConfig } from "@/lib/fluid-ui/validators";
import { TextRow } from "./TextRow";
import { GridRow } from "./GridRow";
import { DashboardError } from "./DashboardError";

interface LayoutControllerProps {
  config: DashboardConfig;
  eventId?: string;
}

export function LayoutController({ config, eventId }: LayoutControllerProps) {
  // Validate configuration
  const validation = validateDashboardConfig(config);

  if (!validation.valid) {
    return (
      <DashboardError
        title="Invalid Dashboard Configuration"
        errors={validation.errors || []}
      />
    );
  }

  return (
    <div className="fluid-dashboard" data-event-id={eventId}>
      {config.sections.map((section, index) => {
        if (section.type === "text") {
          return <TextRow key={`text-${index}`} section={section} />;
        }

        if (section.type === "row") {
          return <GridRow key={`row-${index}`} section={section} eventId={eventId} />;
        }

        return null;
      })}
    </div>
  );
}
```

### Step 4: Create TextRow Component

Create `web/src/components/fluid-ui/TextRow.tsx`:

```typescript
import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { TextSection } from "@/lib/fluid-ui/types";

interface TextRowProps {
  section: TextSection;
}

export function TextRow({ section }: TextRowProps) {
  // Parse and sanitize HTML/Markdown
  const html = useMemo(() => {
    const raw = marked.parse(section.content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [section.content]);

  const spacing = section.spacing || "comfortable";

  return (
    <div
      className={`fluid-text-row fluid-text-row--${spacing}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Step 5: Create GridRow Component

Create `web/src/components/fluid-ui/GridRow.tsx`:

```typescript
import React from "react";
import { RowSection } from "@/lib/fluid-ui/types";
import { calculateGridLayout } from "@/lib/fluid-ui/registry";
import { ComponentRenderer } from "./ComponentRenderer";

interface GridRowProps {
  section: RowSection;
  eventId?: string;
}

export function GridRow({ section, eventId }: GridRowProps) {
  // Calculate grid template columns
  const gridTemplateColumns = calculateGridLayout(
    section.components,
    section.layout
  );

  return (
    <div
      className="fluid-grid-row"
      style={{ gridTemplateColumns }}
    >
      {section.components.map((component, index) => (
        <ComponentRenderer
          key={component.id || `comp-${index}`}
          component={component}
          eventId={eventId}
          isLast={index === section.components.length - 1}
        />
      ))}
    </div>
  );
}
```

### Step 6: Create ComponentRenderer

Create `web/src/components/fluid-ui/ComponentRenderer.tsx`:

```typescript
import React, { Suspense } from "react";
import { ComponentInstance } from "@/lib/fluid-ui/types";
import { getComponent } from "@/lib/fluid-ui/registry";
import { ComponentSkeleton } from "./ComponentSkeleton";

interface ComponentRendererProps {
  component: ComponentInstance;
  eventId?: string;
  isLast: boolean;
}

export function ComponentRenderer({ component, eventId, isLast }: ComponentRendererProps) {
  const Component = getComponent(component.type);

  if (!Component) {
    return (
      <div className="fluid-component-error">
        <p>Component "{component.type}" not found</p>
      </div>
    );
  }

  // Merge eventId if not in props
  const props = {
    ...component.props,
    ...(eventId && !component.props.eventId ? { eventId } : {}),
  };

  return (
    <div className={`fluid-component ${isLast ? "fluid-component--last" : ""}`}>
      <Suspense fallback={<ComponentSkeleton type={component.type} />}>
        <Component {...props} />
      </Suspense>
    </div>
  );
}
```

### Step 7: Create Loading Skeleton

Create `web/src/components/fluid-ui/ComponentSkeleton.tsx`:

```typescript
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ComponentSkeletonProps {
  type: string;
}

export function ComponentSkeleton({ type }: ComponentSkeletonProps) {
  // Customize skeleton based on component type
  // For now, generic skeleton

  return (
    <div className="fluid-component-skeleton">
      <Skeleton className="h-8 w-1/3 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

### Step 8: Create Error Component

Create `web/src/components/fluid-ui/DashboardError.tsx`:

```typescript
import React from "react";
import { ValidationError } from "@/lib/fluid-ui/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DashboardErrorProps {
  title: string;
  errors: ValidationError[];
}

export function DashboardError({ title, errors }: DashboardErrorProps) {
  return (
    <Card className="border-red-500">
      <CardHeader>
        <CardTitle className="text-red-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {errors.map((error, index) => (
            <li key={index} className="text-sm">
              <span className="font-semibold">{error.code}:</span> {error.message}
              {error.path && (
                <span className="text-muted-foreground ml-2">
                  (at {error.path.join(".")})
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

### Step 9: Create Visual Design System

Create `web/src/styles/fluid-ui.css`:

```css
/**
 * Fluid UI Visual Design System
 * Ultrathin minimal aesthetic with emergent borders
 */

/* Base dashboard container */
.fluid-dashboard {
  @apply w-full;
  font-weight: 300; /* Ultrathin base */
}

/* Text rows */
.fluid-text-row {
  @apply w-full;
}

.fluid-text-row--comfortable {
  @apply py-8;
}

.fluid-text-row--tight {
  @apply py-4;
}

.fluid-text-row--flush {
  @apply py-2;
}

/* Typography */
.fluid-text-row h1 {
  @apply text-4xl;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.fluid-text-row h2 {
  @apply text-2xl;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.fluid-text-row h3 {
  @apply text-xl;
  font-weight: 400;
  line-height: 1.4;
}

.fluid-text-row p {
  font-weight: 300;
  line-height: 1.6;
  @apply text-base;
}

.fluid-text-row strong {
  font-weight: 600; /* Selective emphasis only */
}

.fluid-text-row em {
  font-style: italic;
  font-weight: 300;
}

/* Grid rows */
.fluid-grid-row {
  @apply w-full grid gap-0; /* No gap - borders emerge naturally */
}

/* Component cells */
.fluid-component {
  @apply p-6;
  /* Emergent borders - only where components meet */
  border-right: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
}

/* Remove border on last component in row */
.fluid-component--last {
  border-right: none;
}

/* Remove bottom border on last row (TODO: needs row tracking) */
.fluid-grid-row:last-child .fluid-component {
  border-bottom: none;
}

/* Component error state */
.fluid-component-error {
  @apply p-6 text-red-600 text-sm;
  border-right: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
}

/* Skeleton loader */
.fluid-component-skeleton {
  @apply p-6;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .fluid-grid-row {
    @apply grid-cols-1 !important; /* Force single column */
  }

  .fluid-component {
    border-right: none;
  }

  .fluid-component:last-child {
    border-bottom: none;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .fluid-dashboard {
    /* Pure white on black in dark mode */
  }
}
```

### Step 10: Update Convex Schema

Add to `web/convex/schema.ts`:

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
  .index("by_event", ["eventId"]),
```

### Step 11: Create Convex CRUD Operations

Create `web/convex/dashboards.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./auth-helpers";

/**
 * Create dashboard configuration
 */
export const create = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: string;
    config: any;
    name?: string;
    description?: string;
  }) => {
    const dashboardId = await db.insert("dashboards", {
      eventId: args.eventId as any,
      userId: user.id,
      config: args.config,
      name: args.name,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return dashboardId;
  }
);

/**
 * Get dashboard by ID
 */
export const getById = authenticatedQuery(
  async ({ db, user }, args: { dashboardId: string }) => {
    const dashboard = await db.get(args.dashboardId as any);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    // Verify user has access
    if (dashboard.userId !== user.id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    return dashboard;
  }
);

/**
 * List user's dashboards
 */
export const listUserDashboards = authenticatedQuery(
  async ({ db, user }, args: { eventId?: string }) => {
    let query = db
      .query("dashboards")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .filter(q => q.eq(q.field("isActive"), true));

    const dashboards = await query.collect();

    if (args.eventId) {
      return dashboards.filter(d => d.eventId === args.eventId);
    }

    return dashboards;
  }
);

/**
 * Update dashboard configuration
 */
export const update = authenticatedMutation(
  async ({ db, user }, args: {
    dashboardId: string;
    config?: any;
    name?: string;
    description?: string;
  }) => {
    const dashboard = await db.get(args.dashboardId as any);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    if (dashboard.userId !== user.id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    await db.patch(args.dashboardId as any, {
      ...(args.config && { config: args.config }),
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      updatedAt: Date.now(),
    });

    return await db.get(args.dashboardId as any);
  }
);

/**
 * Delete dashboard (soft delete)
 */
export const remove = authenticatedMutation(
  async ({ db, user }, args: { dashboardId: string }) => {
    const dashboard = await db.get(args.dashboardId as any);

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    if (dashboard.userId !== user.id) {
      throw new Error("Forbidden: Not your dashboard");
    }

    await db.patch(args.dashboardId as any, {
      isActive: false,
      updatedAt: Date.now(),
    });
  }
);
```

---

## Testing Strategy

### Unit Tests

Create `web/src/lib/fluid-ui/__tests__/validators.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateDashboardConfig } from "../validators";

describe("Dashboard Config Validation", () => {
  it("should validate valid configuration", () => {
    const config = {
      sections: [
        {
          type: "text",
          content: "<h1>Test</h1>",
          spacing: "comfortable",
        },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(true);
  });

  it("should reject more than 2 component rows", () => {
    const config = {
      sections: [
        { type: "row", components: [{ type: "Test", props: {} }] },
        { type: "row", components: [{ type: "Test", props: {} }] },
        { type: "row", components: [{ type: "Test", props: {} }] },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0].code).toBe("MAX_ROWS_EXCEEDED");
  });

  it("should reject empty content in text section", () => {
    const config = {
      sections: [
        { type: "text", content: "" },
      ],
    };

    const result = validateDashboardConfig(config);
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

Create test page at `web/src/routes/_authed/test-dashboard.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { LayoutController } from "@/components/fluid-ui/LayoutController";

export const Route = createFileRoute("/_authed/test-dashboard")({
  component: TestDashboardPage,
});

function TestDashboardPage() {
  const testConfig = {
    sections: [
      {
        type: "text",
        content: "<h1>■ Test Dashboard</h1><p>This is a <strong>test</strong> of the layout system.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          { type: "TestCard", props: { title: "Component 1" } },
          { type: "TestCard", props: { title: "Component 2" } },
        ],
      },
    ],
  };

  return (
    <div className="container mx-auto p-6">
      <LayoutController config={testConfig} />
    </div>
  );
}
```

---

## Success Criteria

### Functional Requirements
- ✅ Render dashboard from JSON configuration
- ✅ Two-row constraint enforced (validation error for >2 rows)
- ✅ Text rows support Markdown and HTML
- ✅ Component rows use CSS Grid with calculated ratios
- ✅ Component lookup from registry functional
- ✅ Validation catches common errors with helpful messages
- ✅ Mobile responsive (collapses to single column <768px)

### Visual Requirements
- ✅ Emergent borders appear only at component intersections
- ✅ Typography matches ultrathin minimal aesthetic
- ✅ Font weights: 300 (base), 400 (headings), 600 (emphasis)
- ✅ No shadows, no gradients, sharp edges
- ✅ Symbol library integrated in text rows

### Performance Requirements
- ✅ Layout controller renders in <100ms
- ✅ No layout shift during component loading
- ✅ Smooth skeleton transitions

### Code Quality
- ✅ 100% TypeScript type coverage
- ✅ Zero eslint/tsc errors
- ✅ All functions have JSDoc comments
- ✅ Test coverage >80%

---

## Next Steps

After Phase 1 completion:

1. **Phase 2: Component Library** - Build smart data-fetching components for Events, Tasks, Expenses, etc.
2. **Phase 3: Component Communication** - Implement master-detail patterns and event bus
3. **Phase 5: Polish** - Performance optimization and advanced visual features

---

## Appendix

### Example Dashboard Configurations

**Budget Overview:**
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
        { "type": "ExpensesSummary", "props": { "eventId": "evt_123" } },
        { "type": "UpcomingPayments", "props": { "eventId": "evt_123" } }
      ]
    }
  ]
}
```

**Tasks Dashboard:**
```json
{
  "sections": [
    {
      "type": "text",
      "content": "<h2>● Today's Tasks</h2><p>5 pending items</p>",
      "spacing": "tight"
    },
    {
      "type": "row",
      "layout": "auto",
      "components": [
        {
          "type": "TasksList",
          "props": {
            "eventId": "evt_123",
            "status": "pending",
            "dueDate": "2025-11-03"
          }
        }
      ]
    }
  ]
}
```

---

**Status:** Ready for Implementation
**Next Review:** After Week 1 (Type System & Layout Components)
**Estimated Completion:** End of Week 2
