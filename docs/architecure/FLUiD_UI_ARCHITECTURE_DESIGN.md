# Agentic Event Planner Fluid UI System
## Comprehensive Architecture Design Document

**Version:** 1.0  
**Date:** November 2025  
**Purpose:** AI-driven on-demand dashboard generation for event planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Agentic AI Foundations](#agentic-ai-foundations)
4. [Architecture Design](#architecture-design)
5. [Component System](#component-system)
6. [Tool Interface Specification](#tool-interface-specification)
7. [Agent Decision Framework](#agent-decision-framework)
8. [Implementation Strategy](#implementation-strategy)
9. [Quality Assurance & Validation](#quality-assurance--validation)
10. [Future Enhancements](#future-enhancements)

---

## 1. Executive Summary

### 1.1 Problem Statement

Traditional event planning dashboards present static, one-size-fits-all interfaces that don't adapt to user queries or context. Users must navigate through multiple views to find information relevant to their immediate needs.

### 1.2 Solution

An **agentic fluid UI system** where an AI agent dynamically generates contextual dashboards in response to natural language queries. The agent reads chat conversations, understands user intent, and composes relevant UI components on-demand.

### 1.3 Core Innovation

Instead of agents generating CSS or HTML directly, they interact with a **structured tool interface** that:
- Enforces layout constraints (two-row system)
- Provides pre-built, data-aware components
- Uses declarative configuration over imperative code
- Guarantees valid, accessible UI outputs

### 1.4 Key Benefits

- **Contextual**: UI adapts to what user is asking about
- **Minimal**: Ultrathin aesthetic with emergent borders
- **Reliable**: Structured outputs prevent malformed UIs
- **Maintainable**: Component library independent of layout system
- **Accessible**: Built-in accessibility standards

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Layer                              │
│  Chat Interface → Natural Language Queries                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agent Layer (LLM)                          │
│  • Query Understanding (ReAct Pattern)                       │
│  • Context Retrieval (from event data)                       │
│  • Layout Planning                                           │
│  • Tool Selection & Execution                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Tool Interface Layer                          │
│  create_dashboard(sections)                                  │
│  → Validates against JSON Schema                             │
│  → Returns structured layout config                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Layout Controller (React)                       │
│  • Parses layout configuration                               │
│  • Renders grid structure                                    │
│  • Instantiates components                                   │
│  • Manages component connections                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Component Registry                                │
│  EventDetails, TasksList, Timeline, Expenses,                │
│  UpcomingEvents, VendorsList, GuestList, etc.                │
│  • Self-contained, data-fetching components                  │
│  • Responsive to filters and master-detail connections       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Query: "How's the wedding budget looking?"
     │
     ▼
Agent Reasoning:
  - Identifies: budget inquiry
  - Needs: expense breakdown, payment schedule
  - Context: specific event (wedding)
     │
     ▼
Tool Call:
create_dashboard({
  sections: [
    { type: 'text', content: '■ March Wedding Budget' },
    { type: 'row', components: [
        { type: 'ExpensesSummary', props: { eventId: 123 } },
        { type: 'UpcomingPayments', props: { eventId: 123 } }
      ]
    }
  ]
})
     │
     ▼
Layout Controller:
  - Validates configuration
  - Renders 2-column grid
  - Instantiates ExpensesSummary + UpcomingPayments
  - Components fetch their own data from backend
     │
     ▼
User sees contextual dashboard focused on budget
```

---

## 3. Agentic AI Foundations

### 3.1 Core Agentic Patterns Applied

Based on industry research and best practices, our system employs the following established agentic patterns:

#### 3.1.1 ReAct (Reasoning and Acting)

The ReAct pattern, where agents alternate between reasoning steps using LLMs and taking actions such as calling tools or querying services, serves as the baseline architecture for our agent implementation.

**Application in our system:**
```
Thought: User asked about budget, need to show expense data
Action: call create_dashboard with ExpensesSummary component
Observation: Dashboard rendered successfully
Thought: User might want to see breakdown by category
Action: Could offer to drill down or wait for next query
```

#### 3.1.2 Tool Use Pattern

Tool Use enables LLMs to call functions for gathering information, taking action, or manipulating data, making it a key design pattern for agentic workflows. The LLM generates structured requests to call tools with relevant parameters.

**Application in our system:**
- Agent has access to `create_dashboard` tool
- Tool has strict JSON Schema definition
- Agent generates parameters (sections array) based on reasoning
- System executes tool call and returns result

#### 3.1.3 Structured Outputs

JSON Schema enforces structure and validation, increasing reliability of LLM-powered applications. Structured Outputs ensure model-generated outputs exactly match JSON Schemas provided by developers, achieving 100% reliability.

**Application in our system:**
```json
{
  "type": "object",
  "properties": {
    "sections": {
      "type": "array",
      "items": {
        "oneOf": [
          { "$ref": "#/definitions/TextSection" },
          { "$ref": "#/definitions/RowSection" }
        ]
      }
    }
  }
}
```

This guarantees every dashboard configuration is valid and parseable.

#### 3.1.4 Human-in-the-Loop (Implicit)

The human-in-the-loop pattern integrates points for human intervention in an agent's workflow, allowing users to approve decisions, correct errors, or provide input before the agent continues.

**Application in our system:**
- User sees generated dashboard immediately
- Can provide feedback via follow-up queries
- Agent adapts based on user reactions
- Natural conversation loop maintains human control

### 3.2 Why These Patterns Matter

The most effective agentic solutions weave together tool use, reflection, planning, and adaptive reasoning—enabling automation that is faster, smarter, safer, and ready for the real world.

Our system prioritizes:
1. **Tool Use** - Core mechanism for UI generation
2. **ReAct** - Reasoning about user intent before acting
3. **Structured Outputs** - Ensuring reliability and safety
4. **Human-in-the-loop** - User maintains control through conversation

### 3.3 Agent Decision-Making Process

The agent follows this cognitive flow:

```
1. UNDERSTAND
   ├─ Parse user query semantically
   ├─ Identify entities (events, dates, people)
   ├─ Determine information need
   └─ Consider conversation context

2. RETRIEVE
   ├─ Query event database for relevant data
   ├─ Check user permissions
   └─ Load recent activity context

3. PLAN
   ├─ Select appropriate components
   ├─ Determine layout structure
   ├─ Plan text rows for narrative flow
   └─ Consider component connections

4. EXECUTE
   ├─ Construct tool call parameters
   ├─ Validate against schema mentally
   └─ Call create_dashboard tool

5. OBSERVE
   ├─ Receive success/error response
   ├─ Adjust if validation fails
   └─ Wait for user feedback
```

---

## 4. Architecture Design

### 4.1 Layout System Constraints

#### Two-Row Architecture

The system enforces a **maximum two-row layout** for component sections. This constraint:
- Reduces cognitive load on users
- Simplifies agent decision-making
- Ensures mobile responsiveness
- Maintains performance

```
┌─────────────────────────────────────────────┐
│  Text Row: Agent-generated header           │
├─────────────────────────────────────────────┤
│  Component Row 1: Full or split             │
├─────────────────────────────────────────────┤
│  Text Row: Section separator                │
├─────────────────────────────────────────────┤
│  Component Row 2: Full or split             │
└─────────────────────────────────────────────┘
```

#### Visual Design Philosophy

**Ultrathin Minimalism:**
- Borderless components
- Emergent borders at component intersections (1px solid)
- No shadows, no gradients
- Sharp, square edges
- Font weight: 300-400 (ultrathin to regular), 600 for emphasis only
- Pure black on white (dark mode: white on black)
- Generous whitespace

**Typography System:**
```css
h1: font-weight: 300; font-size: 2rem; letter-spacing: -0.02em;
h2: font-weight: 400; font-size: 1.5rem; letter-spacing: -0.01em;
h3: font-weight: 400; font-size: 1.25rem;
p:  font-weight: 300; line-height: 1.6;
strong: font-weight: 600; /* Selective emphasis only */
em: font-style: italic; font-weight: 300;
```

**Symbol Library (Curated):**
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

**Border System:**
```css
/* No explicit borders on components */
.component {
  border: none;
  border-right: 1px solid var(--border-color); /* Only where meets other component */
  border-bottom: 1px solid var(--border-color); /* Only where meets row below */
}

/* Last in row/column removes borders */
.component:last-child {
  border-right: none;
}
.component:last-row {
  border-bottom: none;
}
```

### 4.2 Component Metadata System

Each component in the registry includes layout metadata that guides agent decisions:

```typescript
interface ComponentMetadata {
  name: string;
  description: string;
  layoutRules: {
    canShare: boolean;          // Can appear alongside other components
    mustSpanFull: boolean;       // Requires full row width
    preferredRatio: string;      // e.g., '1fr', '2fr' for flex sizing
    minWidth?: string;           // Minimum width constraint
    minHeight?: string;          // Minimum height constraint
  };
  connections?: {
    canBeMaster: boolean;        // Can control other components
    canBeDetail: boolean;        // Can be controlled by masters
    emits?: string[];            // Events this component broadcasts
    listensTo?: string[];        // Events this component subscribes to
  };
  props: Record<string, PropDefinition>;
}
```

**Example Metadata:**

```json
{
  "EventDetails": {
    "description": "Displays event name, date, venue, guest count, and status",
    "layoutRules": {
      "canShare": false,
      "mustSpanFull": true,
      "preferredRatio": "1fr",
      "minHeight": "200px"
    },
    "props": {
      "eventId": { 
        "type": "number", 
        "required": true,
        "description": "Unique identifier for the event"
      },
      "showStatus": { 
        "type": "boolean", 
        "default": true,
        "description": "Whether to display planning status"
      }
    }
  },
  
  "TasksList": {
    "description": "Displays tasks with status, assignee, and due dates. Can filter by status, assignee, or date range.",
    "layoutRules": {
      "canShare": true,
      "mustSpanFull": false,
      "preferredRatio": "1fr",
      "minWidth": "300px"
    },
    "connections": {
      "canBeMaster": true,
      "emits": ["taskSelected", "statusChanged"]
    },
    "props": {
      "eventId": { "type": "number", "required": true },
      "status": { 
        "type": "enum", 
        "values": ["pending", "in-progress", "completed", "all"],
        "default": "all"
      },
      "assignee": { "type": "string", "optional": true }
    }
  },
  
  "ExpensesList": {
    "description": "Displays expenses with amount, category, vendor, and payment status",
    "layoutRules": {
      "canShare": true,
      "mustSpanFull": false,
      "preferredRatio": "2fr",  // Prefers more space
      "minWidth": "400px"
    },
    "connections": {
      "canBeDetail": true,
      "listensTo": ["vendorSelected", "categorySelected"]
    },
    "props": {
      "eventId": { "type": "number", "required": true },
      "category": { "type": "string", "optional": true },
      "vendor": { "type": "string", "optional": true },
      "paymentStatus": {
        "type": "enum",
        "values": ["pending", "paid", "overdue", "all"],
        "default": "all"
      }
    }
  }
}
```

### 4.3 Auto-Detection System

The system automatically resolves component connections and layout ratios:

**Connection Auto-Detection:**
```typescript
function detectConnections(components: Component[]): Connection[] {
  const connections: Connection[] = [];
  
  for (const master of components) {
    if (!master.metadata.connections?.canBeMaster) continue;
    
    for (const detail of components) {
      if (!detail.metadata.connections?.canBeDetail) continue;
      
      // Check if detail listens to any events master emits
      const sharedEvents = master.metadata.connections.emits.filter(
        event => detail.metadata.connections.listensTo.includes(event)
      );
      
      if (sharedEvents.length > 0) {
        connections.push({
          master: master.id,
          detail: detail.id,
          events: sharedEvents
        });
      }
    }
  }
  
  return connections;
}
```

**Layout Ratio Calculation:**
```typescript
function calculateLayout(components: Component[]): string[] {
  // Check if any component must span full
  if (components.some(c => c.metadata.layoutRules.mustSpanFull)) {
    if (components.length > 1) {
      throw new ValidationError("Cannot combine full-span component with others");
    }
    return ['1fr'];
  }
  
  // Use preferred ratios if all components can share
  if (components.every(c => c.metadata.layoutRules.canShare)) {
    return components.map(c => c.metadata.layoutRules.preferredRatio);
  }
  
  // Default to equal split
  return components.map(() => '1fr');
}
```

---

## 5. Component System

### 5.1 Component Architecture

Each component follows a consistent interface:

```typescript
interface SmartComponent {
  // Component metadata
  metadata: ComponentMetadata;
  
  // Data fetching
  fetchData(props: ComponentProps): Promise<Data>;
  
  // Rendering
  render(data: Data, props: ComponentProps): ReactElement;
  
  // Event handling
  onMasterEvent?(event: MasterEvent): void;
  emitEvent?(eventType: string, payload: any): void;
  
  // Lifecycle
  onMount?(): void;
  onUnmount?(): void;
}
```

### 5.2 Smart Components (Self-Fetching)

Components are **data-aware** and fetch their own information based on props:

```tsx
function ExpensesList({ eventId, category, vendor, paymentStatus }: Props) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchExpenses() {
      const data = await api.getExpenses({
        eventId,
        category,
        vendor,
        status: paymentStatus
      });
      setExpenses(data);
      setLoading(false);
    }
    
    fetchExpenses();
  }, [eventId, category, vendor, paymentStatus]);
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="expenses-list">
      {expenses.map(expense => (
        <ExpenseItem key={expense.id} {...expense} />
      ))}
    </div>
  );
}
```

**Benefits:**
- Agent doesn't marshal data, just specifies filters
- Components handle loading states independently
- Backend API centralized, not duplicated in agent logic
- Components can be reused in different contexts

### 5.3 Master-Detail Pattern Implementation

```tsx
// Master Component (VendorsList)
function VendorsList({ eventId }: Props) {
  const { emit } = useComponentEvents();
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState(null);
  
  const handleSelect = (vendor) => {
    setSelected(vendor.id);
    emit('vendorSelected', { vendorId: vendor.id, vendorName: vendor.name });
  };
  
  return (
    <div className="vendors-list">
      {vendors.map(vendor => (
        <VendorItem
          key={vendor.id}
          vendor={vendor}
          selected={selected === vendor.id}
          onSelect={() => handleSelect(vendor)}
        />
      ))}
    </div>
  );
}

// Detail Component (ExpensesList)
function ExpensesList({ eventId, ...props }: Props) {
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({});
  
  // Subscribe to master events
  useComponentEvents('vendorSelected', (event) => {
    setFilters(prev => ({ ...prev, vendor: event.payload.vendorId }));
  });
  
  useEffect(() => {
    // Fetch with merged filters
    fetchExpenses({ eventId, ...props, ...filters });
  }, [eventId, props, filters]);
  
  return <ExpensesListView expenses={expenses} />;
}
```

### 5.4 Component Registry Structure

```typescript
const ComponentRegistry = {
  // Event Information
  EventDetails: {
    component: EventDetailsComponent,
    metadata: EventDetailsMetadata
  },
  
  // Task Management
  TasksList: {
    component: TasksListComponent,
    metadata: TasksListMetadata
  },
  TasksKanban: {
    component: TasksKanbanComponent,
    metadata: TasksKanbanMetadata
  },
  
  // Budget & Expenses
  ExpensesSummary: {
    component: ExpensesSummaryComponent,
    metadata: ExpensesSummaryMetadata
  },
  ExpensesList: {
    component: ExpensesListComponent,
    metadata: ExpensesListMetadata
  },
  UpcomingPayments: {
    component: UpcomingPaymentsComponent,
    metadata: UpcomingPaymentsMetadata
  },
  
  // Timeline
  Timeline: {
    component: TimelineComponent,
    metadata: TimelineMetadata
  },
  MilestoneTracker: {
    component: MilestoneTrackerComponent,
    metadata: MilestoneTrackerMetadata
  },
  
  // Vendors
  VendorsList: {
    component: VendorsListComponent,
    metadata: VendorsListMetadata
  },
  VendorDetails: {
    component: VendorDetailsComponent,
    metadata: VendorDetailsMetadata
  },
  
  // Guests
  GuestList: {
    component: GuestListComponent,
    metadata: GuestListMetadata
  },
  RSVPStatus: {
    component: RSVPStatusComponent,
    metadata: RSVPStatusMetadata
  },
  
  // Schedule
  UpcomingEvents: {
    component: UpcomingEventsComponent,
    metadata: UpcomingEventsMetadata
  },
  CalendarView: {
    component: CalendarViewComponent,
    metadata: CalendarViewMetadata
  }
};
```

---

## 6. Tool Interface Specification

### 6.1 Primary Tool: `create_dashboard`

**Purpose:** Generates a complete dashboard layout with text rows and component rows.

**JSON Schema:**

```json
{
  "name": "create_dashboard",
  "description": "Creates a contextual dashboard in response to user query. Include descriptive text rows with symbols for visual hierarchy. Use smart defaults for component layout.",
  "strict": true,
  "parameters": {
    "type": "object",
    "properties": {
      "sections": {
        "type": "array",
        "description": "Ordered list of sections (text rows and component rows)",
        "items": {
          "oneOf": [
            {
              "type": "object",
              "description": "Text row for headers, descriptions, or separators",
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["text"]
                },
                "content": {
                  "type": "string",
                  "description": "HTML/Markdown content. Use symbols (■●▲→⚡), bold/italic, headings. Be creative and visual."
                },
                "spacing": {
                  "type": "string",
                  "enum": ["comfortable", "tight", "flush"],
                  "default": "comfortable",
                  "description": "Vertical padding: comfortable=2rem, tight=1rem, flush=0.5rem"
                }
              },
              "required": ["type", "content"],
              "additionalProperties": false
            },
            {
              "type": "object",
              "description": "Component row containing 1-2 components",
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["row"]
                },
                "layout": {
                  "type": "string",
                  "description": "Layout ratio: 'auto' (use smart defaults), '1:1' (equal split), '2:1', 'sidebar' (300px + flex), or custom like ['300px', '1fr', '1fr']",
                  "default": "auto"
                },
                "components": {
                  "type": "array",
                  "minItems": 1,
                  "maxItems": 3,
                  "items": {
                    "type": "object",
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Component type from registry",
                        "enum": [
                          "EventDetails", "TasksList", "TasksKanban",
                          "ExpensesSummary", "ExpensesList", "UpcomingPayments",
                          "Timeline", "MilestoneTracker",
                          "VendorsList", "VendorDetails",
                          "GuestList", "RSVPStatus",
                          "UpcomingEvents", "CalendarView"
                        ]
                      },
                      "props": {
                        "type": "object",
                        "description": "Component-specific props (eventId, filters, etc.)",
                        "additionalProperties": true
                      },
                      "id": {
                        "type": "string",
                        "description": "Optional ID for master-detail connections"
                      }
                    },
                    "required": ["type", "props"]
                  }
                }
              },
              "required": ["type", "components"],
              "additionalProperties": false
            }
          ]
        }
      }
    },
    "required": ["sections"],
    "additionalProperties": false
  }
}
```

### 6.2 Tool Call Examples

**Example 1: Simple Query**

```
User: "Show me today's tasks"

Agent Tool Call:
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>■ Today's Tasks</h1><p>Active items for November 3, 2025</p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "auto",
      "components": [
        {
          "type": "TasksList",
          "props": {
            "eventId": 123,
            "dueDate": "2025-11-03",
            "status": "pending"
          }
        }
      ]
    }
  ]
}
```

**Example 2: Budget Overview**

```
User: "How's the wedding budget?"

Agent Tool Call:
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>⚡ March Wedding Budget</h1><p>Financial overview • <strong>$45k allocated</strong></p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "2:1",
      "components": [
        {
          "type": "ExpensesSummary",
          "props": {
            "eventId": 123
          }
        },
        {
          "type": "UpcomingPayments",
          "props": {
            "eventId": 123,
            "daysAhead": 30
          }
        }
      ]
    },
    {
      "type": "text",
      "content": "**● Expense Breakdown** by category",
      "spacing": "tight"
    },
    {
      "type": "row",
      "layout": "auto",
      "components": [
        {
          "type": "ExpensesList",
          "props": {
            "eventId": 123,
            "sortBy": "category"
          }
        }
      ]
    }
  ]
}
```

**Example 3: Vendor Management (Master-Detail)**

```
User: "Show me vendors and their costs"

Agent Tool Call:
{
  "sections": [
    {
      "type": "text",
      "content": "<h1>■ Vendor Management</h1><p>Select a vendor to view associated expenses</p>",
      "spacing": "comfortable"
    },
    {
      "type": "row",
      "layout": "sidebar",
      "components": [
        {
          "type": "VendorsList",
          "id": "vendors",
          "props": {
            "eventId": 123
          }
        },
        {
          "type": "ExpensesList",
          "props": {
            "eventId": 123
          }
        }
      ]
    }
  ]
}
```

System auto-detects that `ExpensesList` listens to `vendorSelected` events from `VendorsList` and establishes the connection.

### 6.3 Validation & Error Handling

**Validation Steps:**

1. **Schema Validation**: Tool call must match JSON Schema exactly
2. **Component Existence**: All referenced components must exist in registry
3. **Layout Rules**: Components must comply with their `layoutRules`
4. **Props Validation**: Component props must match their schema
5. **Connection Compatibility**: Master-detail relationships must be valid

**Error Responses:**

```typescript
interface ValidationError {
  type: 'validation_error';
  code: string;
  message: string;
  details?: any;
}

// Examples:
{
  type: 'validation_error',
  code: 'INVALID_COMPONENT',
  message: 'Component "TaskList" not found. Did you mean "TasksList"?',
  details: { attemptedComponent: 'TaskList', suggestions: ['TasksList'] }
}

{
  type: 'validation_error',
  code: 'LAYOUT_CONFLICT',
  message: 'EventDetails requires full row width but was placed with other components',
  details: { component: 'EventDetails', rowComponents: ['EventDetails', 'Timeline'] }
}

{
  type: 'validation_error',
  code: 'MISSING_REQUIRED_PROP',
  message: 'ExpensesList requires "eventId" prop',
  details: { component: 'ExpensesList', missingProp: 'eventId' }
}
```

**Agent Retry Strategy:**

When validation fails, agent should:
1. Parse error message
2. Correct the specific issue
3. Retry tool call
4. Maximum 3 retries before explaining to user

---

## 7. Agent Decision Framework

### 7.1 Query Understanding Phase

The agent uses structured reasoning to understand user intent:

```
1. ENTITY EXTRACTION
   - Events mentioned (by name, date, or context)
   - Time references (today, this week, upcoming)
   - People (vendors, guests, team members)
   - Categories (budget, tasks, timeline)

2. INTENT CLASSIFICATION
   - Information seeking ("show me", "what's", "how's")
   - Action request ("add", "update", "schedule")
   - Comparison ("compare", "vs", "differences")
   - Analysis ("analyze", "trends", "summary")

3. CONTEXT INTEGRATION
   - Recent conversation history
   - Previously displayed components
   - User's role and permissions
   - Event planning stage (early planning vs. execution)
```

### 7.2 Component Selection Logic

**Decision Tree:**

```
Is query about specific event?
  ├─ YES: Include EventDetails if not recently shown
  └─ NO: Show UpcomingEvents or multi-event view

What information is requested?
  ├─ Tasks/Todo → TasksList or TasksKanban
  ├─ Budget/Money → ExpensesSummary, ExpensesList, UpcomingPayments
  ├─ Schedule/Timeline → Timeline, MilestoneTracker, CalendarView
  ├─ People → VendorsList, GuestList, RSVPStatus
  └─ Overview → Combine multiple components

How much detail is needed?
  ├─ Summary → Use *Summary components
  ├─ Detailed → Use *List components
  └─ Visual → Use graphical components (Timeline, Kanban)

Are there natural relationships?
  ├─ Vendors + Expenses → Master-detail
  ├─ Tasks + Timeline → Side-by-side
  └─ Budget Summary + Breakdown → Stacked
```

### 7.3 Layout Decision Matrix

| Components | Relationship | Layout | Rationale |
|-----------|--------------|--------|-----------|
| 1 full-width | - | `['1fr']` | Component requires or prefers full width |
| 2 equal importance | Side-by-side | `['1fr', '1fr']` | Equal visual weight |
| 2 unequal | Primary + secondary | `['2fr', '1fr']` | Primary gets more space |
| 2 related | Master-detail | `['300px', '1fr']` | Fixed sidebar for navigation |
| 3 items | Columns | `['1fr', '1fr', '1fr']` | Equal columns (rare, only for metrics) |

### 7.4 Text Row Strategy

Agent should create text rows that:

1. **Establish Hierarchy**
   - H1 for main dashboard purpose
   - H2 for section headers
   - P for context and descriptions

2. **Use Symbols Meaningfully**
   - ■ for major sections
   - ● for subsections or lists
   - ▲/▼ for trends or priorities
   - → for actions or next steps
   - ⚡ for urgency or importance

3. **Provide Context**
   - Date ranges
   - Summary statistics
   - Current status
   - What user can do

4. **Create Visual Rhythm**
   - `comfortable` spacing after headers
   - `tight` spacing for related groups
   - `flush` for minimal separation

**Example Progression:**

```html
<!-- Main Header (comfortable) -->
<h1>■ March 2025 Wedding Planning</h1>
<p>Downtown Hall • 150 guests • March 15, 2025</p>

<!-- Section Header (tight) -->
<h2>● Budget Status</h2>
<p><strong>$42,350</strong> spent of $45,000 allocated • <strong>$2,650</strong> remaining</p>

<!-- Subsection (flush) -->
<p>**▲ Top Expenses** • Venue, Catering, Photography</p>
```

### 7.5 Agent Prompt Template

```
You are an event planning assistant with the ability to generate contextual dashboards.

CURRENT CONTEXT:
- User: [name, role]
- Active Events: [list]
- Recent Conversation: [last 3 exchanges]
- Current Dashboard: [components currently displayed]

USER QUERY: [query]

TASK:
1. Understand what information the user needs
2. Select 1-3 relevant components from the registry
3. Create descriptive text rows with symbols for visual hierarchy
4. Use the create_dashboard tool with appropriate layout

COMPONENT REGISTRY:
[Full component metadata provided here]

STYLE GUIDELINES:
- Use ultrathin, minimal aesthetic
- Include symbols: ■●▲▼→←⚡⬢━✓
- Bold key numbers and dates
- Italic for emphasis
- No emojis, only solid black symbols
- Text should be crisp and informative

LAYOUT RULES:
- Maximum 2 component rows
- Full-width components cannot share rows
- Use 'auto' layout unless you have specific reason for custom ratio
- Master-detail connections will auto-detect based on component metadata

EXAMPLE OUTPUT:
create_dashboard({
  sections: [
    { type: 'text', content: '<h1>■ Budget Overview</h1>...', spacing: 'comfortable' },
    { type: 'row', layout: '2:1', components: [...] }
  ]
})
```

---

## 8. Implementation Strategy

### 8.1 Phase 1: Foundation (Weeks 1-2)

**Objectives:**
- Core layout system
- Basic component registry
- Tool interface with validation
- Simple agent integration

**Deliverables:**
1. React Layout Controller component
2. 5 essential components (EventDetails, TasksList, ExpensesList, Timeline, UpcomingEvents)
3. `create_dashboard` tool with JSON Schema validation
4. Integration with LLM for tool calling

**Success Criteria:**
- Agent can generate simple dashboards (1-2 components)
- Validation catches common errors
- Components render correctly in grid

### 8.2 Phase 2: Smart Features (Weeks 3-4)

**Objectives:**
- Master-detail connections
- Auto-layout system
- Enhanced component library
- Agent decision improvements

**Deliverables:**
1. Component event system for master-detail
2. Auto-layout ratio calculator
3. 10 additional components
4. Improved agent prompting with examples

**Success Criteria:**
- Master-detail filtering works seamlessly
- Agent consistently chooses appropriate layouts
- System handles edge cases gracefully

### 8.3 Phase 3: Polish & Scale (Weeks 5-6)

**Objectives:**
- Visual refinement
- Performance optimization
- Error recovery
- Agent evaluation

**Deliverables:**
1. Final visual design implementation
2. Component lazy loading
3. Comprehensive error handling
4. Agent quality metrics and testing

**Success Criteria:**
- Sub-second dashboard generation
- <5% validation error rate
- Visual design meets ultrathin minimal standard
- 90%+ user satisfaction with generated dashboards

### 8.4 Technology Stack

**Frontend:**
- React 18+ (hooks, suspense)
- CSS Grid for layout
- TailwindCSS for utility classes (minimal usage)
- React Query for data fetching

**Backend:**
- Node.js / Python (API server)
- PostgreSQL (event data)
- Redis (caching)
- REST or GraphQL API

**AI/Agent:**
- Claude Sonnet 4.5 or GPT-4o (LLM)
- Anthropic/OpenAI Tool Calling API
- LangChain or custom orchestration
- Structured outputs enforcement

**Infrastructure:**
- Vercel / AWS for hosting
- Real-time updates via WebSocket or Server-Sent Events
- CDN for static assets

### 8.5 Data Model

```typescript
// Core entities

interface Event {
  id: number;
  name: string;
  date: Date;
  venue: string;
  guestCount: number;
  budget: number;
  status: 'planning' | 'confirmed' | 'completed';
  userId: number;
}

interface Task {
  id: number;
  eventId: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
}

interface Expense {
  id: number;
  eventId: number;
  category: string;
  vendor: string;
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  dueDate: Date;
  description: string;
}

interface Vendor {
  id: number;
  name: string;
  category: string;
  contact: string;
  rating: number;
  totalSpent: number;
}

interface Guest {
  id: number;
  eventId: number;
  name: string;
  email: string;
  rsvpStatus: 'pending' | 'accepted' | 'declined';
  plusOne: boolean;
  dietaryRestrictions: string[];
}

// Dashboard configuration (stored per conversation)

interface DashboardState {
  conversationId: string;
  userId: number;
  currentLayout: LayoutConfig;
  timestamp: Date;
}

interface LayoutConfig {
  sections: Section[];
  metadata: {
    generatedBy: 'agent';
    userQuery: string;
    eventContext: number[];
  };
}
```

---

## 9. Quality Assurance & Validation

### 9.1 Agent Performance Metrics

Track these metrics to ensure agent reliability:

```typescript
interface AgentMetrics {
  // Accuracy
  validToolCalls: number;           // Tool calls that pass schema validation
  invalidToolCalls: number;         // Tool calls that fail validation
  validationErrorRate: number;      // invalidToolCalls / totalToolCalls
  
  // Relevance
  componentRelevanceScore: number;  // User feedback on component selection
  layoutAppropriatenessScore: number; // User feedback on layout choices
  
  // Performance
  averageResponseTime: number;      // Time from query to dashboard
  toolCallRetries: number;          // How often agent retries after errors
  
  // User Satisfaction
  thumbsUp: number;
  thumbsDown: number;
  userModifications: number;        // Times user asks to change dashboard
}
```

### 9.2 Testing Strategy

**Unit Tests:**
- Component rendering with various props
- Layout calculator with different component combinations
- Validation functions for all error cases
- Master-detail connection detection

**Integration Tests:**
- Full tool call → dashboard generation flow
- Component data fetching with filters
- Event bus for master-detail communication
- Error handling and recovery

**Agent Tests:**
- Query understanding accuracy
- Component selection appropriateness
- Layout decision quality
- Text row creativity and informativeness

**Example Agent Test:**

```typescript
describe('Agent Dashboard Generation', () => {
  test('Budget query generates appropriate dashboard', async () => {
    const query = "How's the wedding budget?";
    const context = { eventId: 123, events: [{ id: 123, name: 'Wedding' }] };
    
    const result = await agent.processQuery(query, context);
    
    expect(result.toolCall.name).toBe('create_dashboard');
    expect(result.toolCall.parameters.sections).toBeDefined();
    
    // Should include budget-related components
    const componentTypes = extractComponentTypes(result.toolCall.parameters);
    expect(componentTypes).toContain('ExpensesSummary');
    
    // Should have appropriate text row
    const textRows = result.toolCall.parameters.sections.filter(s => s.type === 'text');
    expect(textRows[0].content).toMatch(/budget|expense|cost/i);
    
    // Should validate
    const validation = validateToolCall(result.toolCall);
    expect(validation.valid).toBe(true);
  });
});
```

### 9.3 Monitoring & Observability

**Real-time Monitoring:**

```typescript
// Log every agent interaction
interface AgentLog {
  timestamp: Date;
  conversationId: string;
  userId: number;
  userQuery: string;
  agentReasoning: string;         // Agent's thought process
  toolCall: ToolCall;
  validationResult: ValidationResult;
  responseTime: number;
  userFeedback?: 'positive' | 'negative' | null;
}

// Dashboard for monitoring
- Total queries handled today
- Validation error rate (should be <5%)
- Average response time (should be <2s)
- User satisfaction rate (should be >90%)
- Most common components used
- Most common errors
```

**Alerts:**
- Validation error rate >10% for 1 hour
- Average response time >5s
- User satisfaction <80% for 1 day
- Specific component consistently failing

### 9.4 Continuous Improvement

**Feedback Loop:**

```
User Interaction → Agent Log → Analysis → Prompt Refinement
                                      ↓
                              Component Updates
                                      ↓
                              New Components Added
```

**Monthly Review Process:**
1. Analyze agent logs for patterns
2. Identify common user intents not well-handled
3. Review component usage statistics
4. Update agent prompt with better examples
5. Add new components for unmet needs
6. Refine validation rules based on false positives

---

## 10. Future Enhancements

### 10.1 Advanced Agent Capabilities

**Multi-Step Planning:**
Planning agents can break down complex tasks into intake, impact assessment, execution, and escalation phases, with the agent checking for next steps as each phase completes.

```
User: "Prepare me for the venue walkthrough tomorrow"

Agent Plans:
1. Show EventDetails
2. Check TasksList for venue-related items
3. Show VendorDetails for venue
4. Display MilestoneTracker to see what's next
5. Show preparation checklist

Generates multi-section dashboard with 4-5 components
```

**Self-Reflection:**
Reflection patterns have the model take a second look at its own output before finalizing, improving quality.

```typescript
async function generateDashboardWithReflection(query: string) {
  // First pass
  const initialDashboard = await agent.generateDashboard(query);
  
  // Reflection
  const critique = await agent.reflect({
    query,
    dashboard: initialDashboard,
    prompt: "Is this dashboard optimal? Are there better component choices? Is the layout appropriate?"
  });
  
  // Refinement if needed
  if (critique.needsImprovement) {
    return await agent.refineDashboard(initialDashboard, critique.suggestions);
  }
  
  return initialDashboard;
}
```

### 10.2 Conversational Refinement

**Follow-up Modifications:**

```
User: "Show me the budget"
Agent: [Generates ExpensesSummary + UpcomingPayments]

User: "Add the vendor breakdown"
Agent: [Adds VendorsList to existing layout]

User: "Actually, just show vendors and their expenses"
Agent: [Replaces entire dashboard with VendorsList + ExpensesList master-detail]
```

**Implementation:**
- Maintain dashboard state in conversation context
- Support `add_component`, `remove_component`, `replace_layout` tools
- Agent understands incremental vs. replace intents

### 10.3 Personalization & Learning

**User Preferences:**
```typescript
interface UserPreferences {
  favoriteComponents: string[];
  preferredLayouts: Record<string, LayoutPreference>;
  defaultFilters: Record<string, any>;
  displayDensity: 'compact' | 'comfortable' | 'spacious';
}

// Agent considers preferences when generating
const dashboard = await agent.generateDashboard(query, {
  context,
  preferences: userPreferences
});
```

**Learning from Feedback:**
- Track which dashboards get positive/negative feedback
- Adjust component selection probabilities
- Learn user-specific query patterns
- Suggest components proactively

### 10.4 Advanced UI Features

**Real-time Collaboration:**
- Multiple users viewing same event dashboard
- Real-time updates via WebSocket
- Collaborative filtering (one user selects vendor, others see filtered expenses)

**Export & Sharing:**
- Export dashboard as PDF report
- Share dashboard configuration via link
- Schedule automated dashboard emails

**Mobile Optimization:**
- Responsive grid adjusts to 1 column on mobile
- Swipeable sections
- Optimized touch interactions

### 10.5 Extended Component Library

**Future Components:**
- GanttChart (advanced timeline visualization)
- BudgetComparison (actual vs. planned)
- WeatherWidget (for outdoor events)
- SocialMediaFeed (event hashtag aggregation)
- DocumentGallery (contracts, invoices)
- CommunicationHub (email threads, messages)
- DecisionTracker (pending decisions with voting)
- PhotographyShots (must-have shot lists)

### 10.6 Multi-Event Orchestration

Support managing multiple events:

```typescript
// Cross-event queries
"Show me all weddings this year and their budget status"

// Comparative dashboards
"Compare the Johnson wedding vs. the Smith wedding"

// Portfolio view
"Give me an overview of all my active events"
```

Components would need multi-event support:
```typescript
interface EventsSummary {
  props: {
    eventIds: number[];
    metric: 'budget' | 'tasks' | 'timeline';
  }
}
```

---

## Conclusion

This architecture document provides a comprehensive blueprint for an **agentic fluid UI system** that leverages modern AI patterns to generate contextual, on-demand dashboards for event planning.

**Key Innovations:**

1. **Structured Tool Interface**: Agents use well-defined tools with JSON Schema validation, ensuring reliable UI generation
2. **Smart Components**: Self-fetching, data-aware components reduce agent complexity
3. **Master-Detail Auto-Detection**: System automatically establishes component relationships
4. **Constrained Creativity**: Two-row layout system balances flexibility with predictability
5. **Visual Minimalism**: Ultrathin aesthetic with emergent borders and curated symbol library

**Alignment with Agentic Best Practices:**

The most effective agentic solutions weave together tool use, reflection, planning, multi-agent collaboration, and adaptive reasoning. Our system implements:
- **Tool Use**: Core mechanism via `create_dashboard`
- **ReAct Pattern**: Reasoning before acting on user queries
- **Structured Outputs**: 100% reliability in UI generation
- **Human-in-the-loop**: Conversational control and refinement

**Expected Outcomes:**

- **User Experience**: Contextual, relevant dashboards generated in <2 seconds
- **Reliability**: <5% validation error rate with graceful error handling
- **Maintainability**: Clear separation between layout system, components, and agent logic
- **Scalability**: Easy to add new components and patterns as needs evolve

This system represents a new paradigm in UI generation where **AI agents compose interfaces declaratively** rather than generating code, resulting in more reliable, maintainable, and user-centric applications.

---

## References

1. Microsoft Azure Blog: "Agent Factory: The new era of agentic AI—common use cases and design patterns"
2. Dagworks Blog: "Agentic Design Pattern #1: Tool Calling"
3. DeepLearning.AI: "Agentic Design Patterns Part 3: Tool Use"
4. Google Cloud: "Choose a design pattern for your agentic AI system"
5. LogRocket Blog: "Your AI has agency — here's how to architect its frontend"
6. OpenAI: "Introducing Structured Outputs in the API"
7. PromptLayer Blog: "How JSON Schema Works for LLM Tools & Structured Outputs"
8. Codewave Insights: "Designing User Interfaces for Agentic AI"

---

**Document Status:** Draft v1.0  
**Next Review:** After Phase 1 Implementation  
**Maintainers:** Engineering Team + AI Research Team
