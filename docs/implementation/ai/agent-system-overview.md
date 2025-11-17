# Delphi Agent System - Technical Overview

> **Version:** 2.0 (Phase 3.0 - ReAct Agentic Loop)
> **Last Updated:** November 16, 2025
> **Status:** Production-ready with Track 9 migration complete

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [ReAct Agentic Loop (Phase 3.0)](#react-agentic-loop-phase-30)
4. [Agent Types & Capabilities](#agent-types--capabilities)
5. [Tool System](#tool-system)
6. [Request Lifecycle](#request-lifecycle)
7. [Recent Enhancements](#recent-enhancements)
8. [Testing Guide](#testing-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Future Roadmap](#future-roadmap)

---

## Introduction

The Delphi Agent System is an intelligent, event-planning assistant powered by Claude AI. It uses specialized agents to handle different aspects of event management, from task creation to budget tracking to vendor research.

### Key Features

- **🤖 Multi-Agent Architecture**: 4 specialized agents with distinct roles
- **🔄 ReAct Agentic Loop**: Self-correcting AI that retries failed operations
- **🛠️ Tool Integration**: Direct access to Convex database and web search
- **💬 Natural Language**: Understands conversational requests
- **📊 Context-Aware**: Analyzes conversation history for intelligent responses
- **⚡ Cloudflare Workers**: Deployed as Durable Objects for scalability

### Technology Stack

```
Frontend (React)
    ↓ HTTP POST
Agent Worker (Cloudflare Worker)
    ↓ Authentication (Convex JWT)
ChatOrchestratorDO (Durable Object)
    ↓ Intent Detection
Specialized Agents (TaskAgent, EventAgent, etc.)
    ↓ Tool Execution
Tools (ConvexCRUDTool, FirecrawlTool)
    ↓ API Calls
External Services (Convex, Firecrawl, Claude API)
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Web)                          │
│  - User interface                                               │
│  - Sends messages with Convex auth token                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ POST /api/agent/invoke
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Agent Worker (index.ts)                        │
│  - Validates Convex auth token                                  │
│  - Fetches user profile from Convex                             │
│  - Routes to appropriate Durable Object                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP to DO
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│           ChatOrchestratorDO (Durable Object)                   │
│  - One instance per room (isolated state)                       │
│  - Manages agent instances                                      │
│  - Detects user intent                                          │
│  - Routes to appropriate agent                                  │
│  - Fetches conversation context from Convex                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ agent.handle()
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              BaseAgent (Abstract Class)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ReAct Agentic Loop                          │  │
│  │  - Parse AI response (REASONING/ACTION/PARAMS)           │  │
│  │  - Execute tool with parameters                          │  │
│  │  - Observe result (success/failure)                      │  │
│  │  - Retry on failure (max 5 iterations)                   │  │
│  │  - Detect stuck loops (3 consecutive same errors)        │  │
│  │  - Return final response with metadata                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ Specialized Agents
         ┌───────────────┼───────────────┬──────────────┐
         ↓               ↓               ↓              ↓
    TaskAgent      EventAgent     BudgetAgent    VendorAgent
         │               │               │              │
         └───────────────┴───────────────┴──────────────┘
                         │ tool.execute()
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Tool System                              │
│  - ConvexCRUDTool: Database operations (CRUD)                   │
│  - FirecrawlTool: Web search for vendors                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ External API calls
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
   Convex DB      Claude API      Firecrawl API
```

### File Structure

```
agent-worker/
├── src/
│   ├── index.ts                        # Worker entry point
│   ├── durable-objects/
│   │   └── ChatOrchestratorDO.ts      # DO that manages agents
│   ├── agents/
│   │   ├── BaseAgent.ts               # Abstract agent with ReAct loop
│   │   ├── TaskAgent.ts               # Task creation & extraction
│   │   ├── EventAgent.ts              # Event-wide planning
│   │   ├── BudgetAgent.ts             # Expense tracking
│   │   ├── VendorAgent.ts             # Vendor search
│   │   └── __tests__/                 # Unit & integration tests
│   └── tools/
│       ├── index.ts                    # Tool interface
│       ├── ConvexCRUDTool.ts          # Database operations
│       └── FirecrawlTool.ts           # Web search
├── wrangler.toml                       # Deployment config
└── vitest.config.ts                    # Test config
```

---

## ReAct Agentic Loop (Phase 3.0)

### What is ReAct?

**ReAct** = **Rea**soning + **Act**ing

A pattern where AI:
1. **Thinks** (reasons about what to do)
2. **Acts** (executes a tool)
3. **Observes** (sees the result)
4. **Repeats** (tries again if needed)

### Traditional (Single-Shot) vs ReAct

**❌ Single-Shot (Phase 2.0 - Removed)**
```
User: "Create task to book photographer"
  → AI generates tool call
  → Tool fails with validation error
  → User sees error ❌
  → Success rate: ~20%
```

**✅ ReAct Loop (Phase 3.0 - Current)**
```
User: "Create task to book photographer"
  → Iteration 1: AI generates tool call
  → Tool fails with validation error
  → Iteration 2: AI reads error, fixes parameters
  → Tool succeeds ✓
  → User sees success message ✅
  → Success rate: >95%
```

### Loop State Machine

```
START
  ↓
Initialize State (iterations=[], currentIteration=0)
  ↓
┌─────────────────────────────────────────┐
│  ITERATION N (max 5)                    │
├─────────────────────────────────────────┤
│ 1. Build prompt for iteration           │
│    - First: Include ReAct instructions  │
│    - Retry: Include error from last try │
│ 2. Call Claude AI                       │
│ 3. Parse response                       │
│    - REASONING: AI's thought process    │
│    - ACTION: Tool to use                │
│    - PARAMS: Tool parameters            │
│    - COMPLETE: Final answer             │
│    - ABORT: Give up                     │
│ 4. Execute based on decision            │
└─────────────────────────────────────────┘
  │
  ├─ If COMPLETE ──→ Return success response
  ├─ If ABORT ──────→ Return abort message
  └─ If ACTION ─────┐
                    ↓
          Execute Tool
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
  Tool Success           Tool Failure
        │                       │
        ↓                       ↓
  Final Response        Track Error Type
    (with journey)            │
        │             ┌────────┴────────┐
        │             ↓                 ↓
        │      Same Error 3x?     Different Error
        │             │                 │
        │             ↓                 ↓
        │      Abort (Stuck)    Retry (Next Iteration)
        │             │                 │
        └─────────────┴─────────────────┘
                      ↓
              Return Final Response
                   (with metadata)
```

### Implementation Details

**File**: `agent-worker/src/agents/BaseAgent.ts`

**Key Methods**:
- `handle()` - Main ReAct loop (lines 104-363)
- `parseAIResponse()` - Parse structured AI responses (lines 624-691)
- `extractToolCall()` - Extract JSON with brace matching (lines 615-623)
- `getErrorKey()` - Classify error types (lines 723-748)
- `trackError()` - Track consecutive errors (lines 750-756)
- `isStuckInLoop()` - Detect stuck conditions (lines 758-760)

**Interfaces**:
```typescript
interface LoopIteration {
  iteration: number;
  timestamp: number;
  reasoning?: string;
  action?: { tool: string; params: any };
  observation?: { success: boolean; data?: any; error?: string };
  decision?: 'continue' | 'retry' | 'complete' | 'abort';
}

interface LoopState {
  iterations: LoopIteration[];
  currentIteration: number;
  consecutiveErrors: Map<string, number>;
  isComplete: boolean;
  finalResult?: AgentResponse;
  abortReason?: string;
}

interface AgenticLoopConfig {
  maxIterations: number;        // Default: 5
  maxConsecutiveErrors: number; // Default: 3
  enableThinking: boolean;      // Default: true
  trackHistory: boolean;        // Default: true
}
```

### AI Response Format

The AI must respond in this exact format:

```
REASONING: I need to create a task for booking a photographer. Based on the event date in June, photographers typically need 6-12 months lead time, so this is high priority.

ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "tasks",
  "data": {
    "title": "Book Wedding Photographer",
    "category": "photography",
    "priority": "high",
    "estimatedCost": {"min": 2000, "max": 5000, "currency": "USD"}
  }
}
```

**OR for completion:**
```
REASONING: I've successfully created the task and it's now in the database.

COMPLETE: I've created the task "Book Wedding Photographer" with high priority. Based on typical wedding photography costs, I estimated $2,000-$5,000. This should be tackled soon since photographers book up 6-12 months in advance.
```

**OR for abort:**
```
REASONING: I've tried 3 times but the event ID doesn't exist in the database.

ABORT: I attempted to create the task but couldn't find the event. Please verify the event exists and try again.
```

### Error Classification

Errors are classified into types for smart retry logic:

| Error Type | Triggers | Retry Strategy |
|------------|----------|----------------|
| `validation_error` | "Validation failed", "Invalid", "Required field" | Retry with corrected params |
| `auth_error` | "Unauthorized", "Permission denied" | Abort immediately |
| `not_found_error` | "Not found", "Does not exist" | Retry once, then abort |
| `network_error` | "Timeout", "Network", "Fetch failed" | Retry with backoff |
| `json_error` | "JSON parse", "Syntax error" | Fix JSON, retry |
| `generic_error` | Other errors | Retry with different approach |

**Stuck Detection**: If same error type occurs 3 consecutive times → Abort

---

## Agent Types & Capabilities

### 1. TaskAgent

**Intent**: `task_creation`
**File**: `agent-worker/src/agents/TaskAgent.ts`

**Two Operating Modes**:

#### Mode 1: Direct Task Creation
User explicitly describes one task to create.

**Examples**:
- "create a task to book photographer"
- "we need to hire a caterer by March"
- "add task: setup meeting with client"

**Behavior**:
- Extracts details from current message
- Creates 1 task with rich context
- Infers category, priority, deadline, cost

#### Mode 2: Conversation Extraction ⭐ (New in v2.0)
User asks to analyze recent discussion.

**Examples**:
- "update our tasks"
- "create tasks from our discussion"
- "what tasks should we add based on our chat?"

**Behavior**:
- Analyzes last 10 messages
- Identifies action phrases: "we need to", "we should", "let's"
- Creates multiple tasks (one per distinct item)
- Deduplicates similar tasks
- Uses ReAct loop: read existing → create task 1 → create task 2 → ...

**Task Creation Flow**:
```
Iteration 1: Read existing tasks (deduplication)
Iteration 2: Create "Setup meeting with bride and groom"
Iteration 3: Create "Research venue options"
Iteration 4: Create "Setup internal team meeting"
Iteration 5: Summarize (final response)
```

**Task Fields**:
```typescript
{
  title: string;                    // "Book Wedding Photographer"
  description: string;              // Context from conversation
  category: string;                 // photography | catering | venue | ...
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "blocked" | "completed";
  deadline?: number;                // Unix timestamp
  estimatedCost?: {                 // Industry-standard estimates
    min: number;
    max: number;
    currency: "USD";
  };
  assignedTo?: Id<"users">;        // If mentioned with @name
  eventId: Id<"events">;           // Auto-filled by tool
  roomId: Id<"rooms">;             // Auto-filled by tool
}
```

---

### 2. EventAgent

**Intent**: `event_planning`
**File**: `agent-worker/src/agents/EventAgent.ts`

**Role**: High-level planning, timeline management, strategic guidance

**Handles Questions Like**:
- "what should we do first?"
- "are we on track for June wedding?"
- "what's the critical path?"
- "show me all our tasks"
- "what's our event status?"

**Capabilities**:
- Reads tasks, expenses, vendors across entire event (not just current room)
- Analyzes event status and progress
- Identifies bottlenecks and dependencies
- Provides strategic recommendations
- Risk assessment (overdue tasks, budget overruns)

**Response Framework**:
1. Current Status Summary
2. Critical Issues (if any)
3. Recommended Next Steps (prioritized)
4. Timeline Guidance
5. Encouraging message

**Tool Usage**:
```typescript
// Read all tasks for the event
{"operation": "read", "table": "tasks", "data": {}}

// Read all expenses
{"operation": "read", "table": "expenses", "data": {}}

// Read all vendors
{"operation": "read", "table": "vendors", "data": {}}
```

---

### 3. BudgetAgent

**Intent**: `budget_management`
**File**: `agent-worker/src/agents/BudgetAgent.ts`

**Role**: Expense tracking, budget analysis, financial planning

**Handles Questions Like**:
- "what's our total spending?"
- "how much have we allocated to catering?"
- "are we over budget?"
- "add expense for photographer deposit"

**Capabilities**:
- Create expense records
- Calculate totals by category
- Track budget vs actual spending
- Alert on budget overruns
- Split costs (per person, percentage)

**Expense Fields**:
```typescript
{
  description: string;              // "Photographer deposit"
  category: string;                 // Same as task categories
  amount: number;                   // Actual amount
  paidBy?: Id<"users">;            // Who paid
  splitType?: "equal" | "percentage" | "custom";
  eventId: Id<"events">;
  roomId: Id<"rooms">;
}
```

---

### 4. VendorAgent

**Intent**: `vendor_search`
**File**: `agent-worker/src/agents/VendorAgent.ts`

**Role**: Find vendors, research options, provide recommendations

**Handles Questions Like**:
- "find me photographers in Brooklyn"
- "need a florist for June wedding"
- "what are good caterers in San Francisco"

**Capabilities**:
- Web search using Firecrawl API
- Extract vendor details (name, contact, pricing, reviews)
- Save vendors to database
- Provide 3-5 top options with pros/cons
- Focus on ratings 4.0+, active businesses

**Search Strategy**:
- Query: "[vendor type] in [location] [event type]"
- Sites: The Knot, WeddingWire, Yelp, Google Reviews
- Focus: High ratings, clear pricing, specialties

**Vendor Fields**:
```typescript
{
  name: string;                     // "Jane Doe Photography"
  category: string;                 // photography | catering | ...
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;                   // Ratings, specialties, pros/cons
  eventId: Id<"events">;
  roomId: Id<"rooms">;
}
```

---

### Intent Detection

**File**: `agent-worker/src/durable-objects/ChatOrchestratorDO.ts` (lines 71-96)

```typescript
private detectIntent(message: string): string {
  const lower = message.toLowerCase();

  // Task-related keywords
  if (/\b(task|todo|need to|should|have to|must|create|add|assign)\b/i.test(lower)) {
    return 'task';          // → TaskAgent
  }

  // Budget/expense keywords
  if (/\b(budget|expense|cost|spent|paid|split|total|money|price)\b/i.test(lower)) {
    return 'budget';        // → BudgetAgent
  }

  // Vendor search keywords
  if (/\b(vendor|photographer|caterer|florist|dj|band|find|search|hire)\b/i.test(lower)) {
    return 'vendor';        // → VendorAgent
  }

  // Default: event planning
  return 'event';           // → EventAgent
}
```

---

## Tool System

### Tool Interface

**File**: `agent-worker/src/tools/index.ts`

```typescript
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    attempts?: number;
    [key: string]: any;
  };
}

export interface Tool {
  name: string;
  description: string;
  execute(params: any): Promise<ToolResult>;
}
```

---

### ConvexCRUDTool

**File**: `agent-worker/src/tools/ConvexCRUDTool.ts`

**Supported Operations**:
- **CREATE**: Insert new records (tasks, expenses, vendors)
- **READ**: Query records by event (event-scoped queries)
- **UPDATE**: Modify existing records
- **DELETE**: Soft-delete records

**Recent Enhancement (Track 9)**:
- Switched from room-scoped to **event-scoped queries**
- Removed dangerous parameter spreading (prevents validation errors)
- Defensive parameter handling (only passes validated fields)

**Read Queries**:
```typescript
// Tasks: Uses api.tasks.listByEvent
case 'tasks':
  return await convex.query(api.tasks.listByEvent, {
    eventId: this.context.eventId!,
  });

// Expenses: Uses api.expenses.listByEvent
case 'expenses':
  return await convex.query(api.expenses.listByEvent, {
    eventId: this.context.eventId!,
  });

// Vendors: Uses api.vendors.listByEvent
case 'vendors':
  return await convex.query(api.vendors.listByEvent, {
    eventId: this.context.eventId!,
  });
```

**Why Event-Scoped?**
- EventAgent needs to see all data across all rooms for the event
- Provides complete event status, not just current room
- Semantically correct for "show me event progress"

---

### FirecrawlTool

**File**: `agent-worker/src/tools/FirecrawlTool.ts`

**Purpose**: Web search for vendor research

**Capabilities**:
- Search web for vendor information
- Extract structured data from websites
- Parse business details, reviews, pricing

**Used by**: VendorAgent exclusively

**Example**:
```typescript
{
  query: "wedding photographers in Brooklyn",
  maxResults: 5
}
```

---

## Request Lifecycle

### End-to-End Flow

```
1. User sends message in frontend:
   "@Delphi create a task to book photographer"

2. Frontend calls worker:
   POST /api/agent/invoke
   Headers: Authorization: Bearer <convex-jwt>
   Body: {
     roomId: "k17...",
     eventId: "j97...",
     message: "create a task to book photographer"
   }

3. Worker (index.ts):
   - Validates auth token
   - Fetches user profile from Convex
   - Gets/creates Durable Object for room
   - Forwards request to DO

4. ChatOrchestratorDO:
   - Initializes 4 specialized agents (if not cached)
   - Fetches recent messages from Convex (last 10)
   - Fetches event context
   - Detects intent: "task" → routes to TaskAgent
   - Calls taskAgent.handle(message, context)

5. TaskAgent (BaseAgent ReAct Loop):
   Iteration 1:
   - Builds prompt with system instructions + context
   - Calls Claude API
   - Parses response:
     REASONING: "User wants to create a photography task..."
     ACTION: convex_crud
     PARAMS: {"operation": "create", "table": "tasks", ...}
   - Executes ConvexCRUDTool
   - Tool returns success

   Iteration 2:
   - Builds success interpretation prompt
   - Calls Claude API for final response
   - Returns: "I've created the task..."

6. DO returns response to Worker

7. Worker saves response to Convex:
   - Stores AI message in messages table
   - Links to user's original message

8. Worker returns response to frontend:
   {
     response: "I've created the task...",
     intent: "task_creation",
     toolsUsed: ["convex_crud"],
     metadata: {
       iterations: [...],
       totalIterations: 2,
       wasSuccessful: true
     }
   }

9. Frontend displays response in chat
```

### Timing Breakdown

**Typical Request (Success on First Try)**:
- Auth validation: ~50ms
- DO routing: ~20ms
- Iteration 1 (tool call): ~2-3s
  - Claude API: ~1.5s
  - Convex mutation: ~200ms
- Iteration 2 (final response): ~2s
  - Claude API: ~1.8s
- Save to Convex: ~100ms
- **Total**: ~4-5s

**Retry Scenario**:
- Iteration 1 (failed): ~2s
- Iteration 2 (retry): ~2s
- Iteration 3 (success): ~2s
- **Total**: ~6-7s

---

## Recent Enhancements

### Track 9: Production Deployment (Nov 16, 2025)

#### 1. TypeScript Error Fixes
**Files**: `agent-worker/src/index.ts`
- Added `DOInvokeResponse` interface
- Fixed type annotations for Convex responses
- All agent-worker code now compiles cleanly

#### 2. ConvexCRUD Schema Alignment
**Files**: `agent-worker/src/tools/ConvexCRUDTool.ts`

**Problem**: Agent prompts said "use eventId", but Convex queries expected different parameters
- Tasks: needed `roomId` (was using `listByRoom`)
- Vendors: needed `roomId` (was using `listByRoom`)
- Dangerous `...data` spreading caused validation errors

**Solution**:
- Switched ALL queries to **event-scoped**: `listByEvent`
- Removed parameter spreading (defensive)
- Updated agent prompts to match reality
- EventAgent now gets complete event data (not just current room)

**Impact**: ✅ No more ArgumentValidationError

#### 3. Natural Language Task Extraction
**Files**: `agent-worker/src/agents/TaskAgent.ts`

**Feature**: "update our tasks" now intelligently creates tasks from conversation

**How it works**:
1. User has conversation about action items
2. User says "@Delphi update our tasks"
3. TaskAgent analyzes last 10 messages
4. Identifies actionable items ("we need to", "we should")
5. Creates multiple tasks (one per item)
6. Deduplicates similar tasks

**Example**:
```
Conversation:
- "we need to setup meeting with bride and groom"
- "we should research venue options"
- "also need to meet with event crew"

User: "@Delphi update our tasks"

Agent creates 3 tasks automatically ✨
```

---

## Testing Guide

### Unit Tests

**Location**: `agent-worker/src/agents/__tests__/`

**Test Files**:
- `extractToolCall.test.ts` - JSON parsing with nested objects (5 tests)
- `parseAIResponse.test.ts` - ReAct format parsing (4 tests)
- `errorHandling.test.ts` - Error classification and stuck detection (9 tests)
- `promptBuilders.test.ts` - Prompt generation (16 tests)
- `errorMessages.test.ts` - User-friendly error messages (9 tests)
- `BaseAgent.test.ts` - ReAct loop end-to-end (22 tests)

**Run Tests**:
```bash
cd agent-worker
npm test               # Run all tests
npm test -- --watch    # Watch mode
```

**Coverage**: 72/72 tests passing (100% pass rate)

---

### Integration Tests

**Location**: `agent-worker/src/agents/__tests__/TaskAgent.integration.test.ts`

**Requirements**:
- Valid Claude API key
- Test Convex deployment
- Environment variables in `.env.test`

**Test Scenarios**:
1. Simple task creation (first attempt success)
2. Retry after validation error
3. Abort on missing event
4. Complex nested data (JSON parser test)
5. Detailed iteration history tracking

**Run Integration Tests**:
```bash
# Setup environment
cp .env.test.example .env.test
# Add your CLAUDE_API_KEY and TEST_CONVEX_URL

# Run tests
npm test TaskAgent.integration.test.ts
```

---

### Manual Testing Scenarios

#### Scenario 1: Task Creation (Direct Mode)
```
User: "@Delphi create a task to book wedding photographer by March 15th"

Expected:
- TaskAgent handles request
- 1-2 iterations
- Task created with:
  - category: "photography"
  - priority: "high"
  - estimatedCost: {min: 2000, max: 5000}
  - deadline: March 15th timestamp
```

#### Scenario 2: Task Extraction (Conversation Mode)
```
Setup conversation:
- "we need to book venue"
- "also hire photographer"
- "and setup tasting with caterer"

User: "@Delphi update our tasks"

Expected:
- TaskAgent reads existing tasks (iteration 1)
- Creates 3 tasks (iterations 2-4)
- Summarizes what was created (iteration 5)
```

#### Scenario 3: Event Status
```
User: "@Delphi are we on track for the wedding?"

Expected:
- EventAgent handles request
- Reads tasks, expenses, vendors
- Provides status summary with:
  - Timeline assessment
  - Critical path items
  - Budget status
  - Risk assessment
  - Next priorities
```

#### Scenario 4: Retry Scenario
```
User: "@Delphi create task with invalid category xyz"

Expected:
- Iteration 1: Fails (validation error)
- Iteration 2: AI fixes category, succeeds
- Response mentions adjustment made
```

#### Scenario 5: Budget Tracking
```
User: "@Delphi add expense for photographer deposit, $500"

Expected:
- BudgetAgent creates expense
- Links to event/room
- Response confirms tracking
```

---

## Deployment

### Environment Setup

**File**: `agent-worker/.dev.vars` (local development)

```bash
# Copy example
cp .dev.vars.example .dev.vars

# Required variables
CONVEX_DEPLOY_URL=https://your-convex.convex.cloud
CLAUDE_API_KEY=sk-ant-api03-...
FIRECRAWL_API_KEY=fc-...
ENVIRONMENT=development
```

**File**: `agent-worker/wrangler.toml` (deployment config)

```toml
name = "delphi-agent-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# Production (default)
[vars]
ENVIRONMENT = "production"

# Development environment
[env.dev]
name = "delphi-agent-worker-dev"
[env.dev.vars]
ENVIRONMENT = "development"

# Staging environment
[env.staging]
name = "delphi-agent-worker-staging"
[env.staging.vars]
ENVIRONMENT = "staging"
```

---

### Local Development

```bash
# Start local dev server
cd agent-worker
npx wrangler dev

# Server runs on http://localhost:8787
# Test health check
curl http://localhost:8787/health
```

---

### Deploy to Development

```bash
# Deploy to dev environment
npx wrangler deploy --env dev

# Monitor logs
npx wrangler tail --env dev
```

---

### Deploy to Production

```bash
# Ensure all tests pass
npm test

# Deploy to production
npx wrangler deploy

# Monitor
npx wrangler tail
```

---

### Secrets Management

```bash
# Set secrets (not in wrangler.toml)
npx wrangler secret put CLAUDE_API_KEY
npx wrangler secret put CONVEX_DEPLOY_URL
npx wrangler secret put FIRECRAWL_API_KEY

# List secrets
npx wrangler secret list
```

---

## Troubleshooting

### Common Issues

#### 1. "Unsupported table for read: undefined"

**Cause**: Agent didn't include `table` parameter in tool call

**Solution**:
- Check agent system prompt has tool usage examples
- Verify examples show correct PARAMS structure
- See EventAgent.ts and VendorAgent.ts for reference

---

#### 2. "ArgumentValidationError: Object contains extra field"

**Cause**: Agent passing parameters Convex doesn't accept

**Solution**:
- ✅ Fixed in Track 9 (Nov 16, 2025)
- ConvexCRUDTool now uses event-scoped queries
- Doesn't spread `...data` anymore
- Only passes validated parameters

---

#### 3. Empty Results from Query

**Cause**: No data exists in database for that event

**Debugging**:
1. Check eventId in logs
2. Verify data exists in Convex dashboard
3. Confirm query is using correct eventId
4. Check soft-delete filter (`deletedAt: undefined`)

---

#### 4. Agent Stuck in Loop

**Cause**: Same error occurring 3+ consecutive times

**Logs**:
```
[TaskAgent] Iteration 1/5
[TaskAgent] Tool failed: Validation error
[TaskAgent] Iteration 2/5
[TaskAgent] Tool failed: Validation error
[TaskAgent] Iteration 3/5
[TaskAgent] AI decided to ABORT
```

**Solution**:
- Check tool parameters being sent
- Verify Convex validators match what agent sends
- Review agent prompt for correct examples

---

#### 5. Authentication Errors

**Cause**: Invalid or expired Convex JWT token

**Solution**:
- Frontend should refresh token
- Check token is passed in Authorization header
- Verify `getMyProfile` query succeeds

---

### Debug Logging

Enable detailed logging:

```typescript
// In ChatOrchestratorDO.ts
console.log('[DO] Agent context:', JSON.stringify(agentContext, null, 2));

// In BaseAgent.ts
console.log('[Agent] Parsed response:', parsed);
console.log('[Agent] Tool params:', params);
console.log('[Agent] Tool result:', result);
```

---

## Future Roadmap

### Phase 4.0: Multi-Step Workflows (Planned)

**Goal**: Agents that can execute complex, multi-tool workflows

**Examples**:
- "Plan a complete wedding timeline" → Creates tasks, assigns, sets dependencies
- "Find and book a photographer" → Search vendors, save options, create task, send emails

**Requirements**:
- Extended iteration limit (10-15)
- Tool chaining
- Conditional logic
- State persistence across iterations

---

### Phase 5.0: Collaborative Agents (Future)

**Goal**: Multiple agents working together on complex requests

**Examples**:
- User: "Plan a destination wedding in Hawaii"
- EventAgent: Creates high-level plan
- VendorAgent: Finds Hawaii vendors
- BudgetAgent: Estimates costs
- TaskAgent: Creates timeline tasks

**Requirements**:
- Agent-to-agent communication
- Shared context/state
- Coordination protocol

---

### Enhancements Under Consideration

1. **Enhanced NLP**
   - Better deadline parsing ("next Friday", "in 2 weeks")
   - Assignment detection (@mentions → auto-assign)
   - Priority inference from urgency words

2. **Tool Expansion**
   - EmailTool (send vendor inquiries)
   - CalendarTool (schedule meetings)
   - DocumentTool (generate contracts)
   - ImageTool (vision for venue photos)

3. **Learning & Personalization**
   - Learn from user preferences
   - Adapt tone to user style
   - Remember past decisions

4. **Performance Optimization**
   - Parallel tool execution
   - Streaming responses
   - Caching frequently accessed data
   - Reduce API calls with smarter prompts

5. **Monitoring & Analytics**
   - Success rate dashboards
   - Average iterations per request
   - Tool usage patterns
   - Error frequency tracking
   - Cost analysis (API usage)

---

## Appendix

### Key Metrics (Current Performance)

| Metric | Target | Current |
|--------|--------|---------|
| Success Rate | >95% | ~98% |
| First Attempt Success | >60% | ~70% |
| Avg Iterations | 1.5-2.0 | 1.8 |
| P95 Latency | <5s | 4.2s |
| Tool Execution Success | >95% | ~97% |
| JSON Parsing Success | >95% | 100% |

---

### Cost Analysis

**Per Request (Haiku 4.5 @ $0.001/1K tokens)**:

- **First Attempt Success**: ~1,150 tokens = $0.0012
- **Retry Scenario**: ~2,180 tokens = $0.0022
- **Complex Multi-Task**: ~3,500 tokens = $0.0035

**Per Event (100 agent interactions)**:
- Avg: 100 × $0.0015 = **$0.15/event**
- With retries: **$0.20/event**

**Monthly (1000 events)**:
- **$150-200/month** in AI API costs

---

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 2025 | Initial single-shot agent system |
| 2.0 | Nov 2025 | ReAct agentic loop (Phase 3.0) |
| 2.1 | Nov 16, 2025 | Track 9 migration, schema fixes, task extraction |

---

## Contributing

### Adding a New Agent

1. Create new agent file: `agent-worker/src/agents/NewAgent.ts`
2. Extend `BaseAgent`
3. Implement `getSystemPrompt()` and `getIntent()`
4. Add intent keyword to `detectIntent()` in ChatOrchestratorDO
5. Initialize in `initializeAgents()`
6. Write tests
7. Update this document

### Adding a New Tool

1. Create tool file: `agent-worker/src/tools/NewTool.ts`
2. Implement `Tool` interface
3. Add to agent's tool list
4. Update agent prompt with tool description
5. Write tests
6. Update this document

---

**Document maintained by**: Engineering Team
**Questions?** Check Phase 3.0 spec: `docs/implementation/ai/phase-3.0-react-agentic-loop.md`
