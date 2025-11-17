# Delphi Agent System v3.0: Architecture Implementation Plan

**Version:** 3.0 - Unified Agent with Multi-Room Support  
**Date:** November 16, 2025  
**Purpose:** Master implementation guide for migration to stateful, room-based architecture  
**Target Audience:** AI agents exploring codebase and implementing features

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Components](#3-core-components)
4. [Message & Response Protocol](#4-message--response-protocol)
5. [Agent System Design](#5-agent-system-design)
6. [Background Processing](#6-background-processing)
7. [Migration Path](#7-migration-path)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Executive Summary

### 1.1 Current Problems

**Architectural Issues:**
- 4 specialized agents causing routing confusion
- No planning/reasoning layer
- No state persistence across conversations
- Fixed 5-iteration limit
- Brittle keyword-based intent detection

**Specific Failures:**
- "Update tasks" when no tasks exist → crashes
- Bulk operations exceed iteration limit
- Agents forget context between messages
- Cross-domain requests can't be handled

### 1.2 New Architecture Goals

**Stateful Multi-Room System:**
- One Durable Object per room (chat) for state persistence
- Unified agent with all capabilities
- Planning layer before execution
- Dynamic iteration budgets
- Background trigger system for proactive actions

**Key Capabilities:**
1. Multi-turn conversations with memory
2. Component-based UI responses
3. Polls and voting
4. Background pattern detection
5. Web search integration
6. Proactive suggestions

### 1.3 Core Principles

1. **Rooms are the unit of isolation** - Each chat room has independent DO state
2. **Events coordinate across rooms** - EventCoordinatorDO synthesizes cross-room data
3. **Messages drive everything** - All actions triggered by messages (user or system)
4. **Response flexibility** - Can return text, components, or hybrid layouts
5. **Stateful intelligence** - Agents remember context within room lifecycle

---

## 2. Architecture Overview

### 2.1 System Layers

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (TanStack Start)               │
│  • Convex subscriptions for real-time messages          │
│  • Component renderer based on message.responseType     │
│  • Grid layout engine for component positioning         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ↓
┌─────────────────────────────────────────────────────────┐
│           CLOUDFLARE WORKER (Entry Point)                │
│  • Auth validation (Convex JWT)                          │
│  • Route to appropriate DO                               │
│  • Background job scheduling                             │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ↓                          ↓
┌──────────────────┐    ┌──────────────────────┐
│  RoomOrchestratorDO   EventCoordinatorDO     │
│  (per chat room)      (per event)            │
│                                               │
│  STATE:                STATE:                 │
│  • Last 200 msgs      • Room summaries        │
│  • Active polls       • Global decisions      │
│  • Pending tasks      • Budget totals         │
│  • Agent context      • Cross-room patterns   │
│                                               │
│  CAPABILITIES:        CAPABILITIES:           │
│  • Intent detection   • Cross-room synthesis  │
│  • Agent invocation   • Periodic checks       │
│  • Poll management    • Timeline coordination │
│  • State checkpoint   • Event-wide decisions  │
└──────────┬───────┘    └──────────┬────────────┘
           │                       │
           └───────────┬───────────┘
                       ↓
           ┌───────────────────────┐
           │   UNIFIED DELPHI AGENT │
           │   (Stateless Service)  │
           │                        │
           │   CAPABILITIES:        │
           │   • Task operations    │
           │   • Budget analysis    │
           │   • Vendor search      │
           │   • Poll creation      │
           │   • Component assembly │
           │   • Web search         │
           └───────────┬────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ Convex  │  │  Claude  │  │Firecrawl │
   │   DB    │  │   API    │  │   API    │
   └─────────┘  └──────────┘  └──────────┘
```

### 2.2 Data Flow

**User Message Flow:**
```
1. User types message in frontend
2. Frontend → Convex mutation (messages:create)
3. Convex triggers webhook → Cloudflare Worker
4. Worker routes to RoomOrchestratorDO
5. DO analyzes message, updates state
6. DO invokes UnifiedDelphiAgent if needed
7. Agent returns structured response
8. DO writes response to Convex
9. Frontend receives via subscription
10. Frontend renders based on response.type
```

**Background Trigger Flow:**
```
1. Cloudflare Cron triggers every N minutes
2. Worker queries EventCoordinatorDO for all active events
3. DO checks for trigger patterns (deadlines, budgets, etc.)
4. Matching patterns → create system messages
5. System messages processed like user messages
6. Proactive suggestions appear in chat
```

### 2.3 Room Types

**Main Planning Room:**
- Primary coordination chat
- Full agent capabilities
- All participants can see
- Core decisions and timeline

**Vendor Rooms:**
- One per vendor relationship
- Scoped to vendor communication
- Contract tracking
- Payment coordination

**Brainstorm Rooms:**
- Idea collection
- Voting/polls
- Lower commitment threshold
- Can spawn tasks to main room

**Private Rooms:**
- Budget discussions
- Sensitive decisions
- Restricted membership

---

## 3. Core Components

### 3.1 RoomOrchestratorDO (per chat room)

**Purpose:** Stateful orchestrator for a single chat room

**State Schema:**
```typescript
interface RoomState {
  // Identity
  roomId: string;
  eventId: string;
  roomType: 'main' | 'vendor' | 'brainstorm' | 'private';
  
  // Hot Memory (last 200 messages)
  messageHistory: Message[];
  messageSummary: string;  // Compressed summary for context
  
  // Active Elements
  activePolls: Poll[];
  pendingActions: AgentAction[];
  
  // Agent Context
  agentMemory: {
    recentIntents: string[];
    activeWorkflows: Workflow[];
    contextDigest: string;
  };
  
  // Metadata
  lastActivity: timestamp;
  checkpointId: string;
  memoryUsage: number;  // Track for 128MB limit
}
```

**Key Methods:**
```typescript
class RoomOrchestratorDO {
  // Message handling
  async handleMessage(message: Message): Promise<Response>
  
  // Intent detection (Phase 1: simple tags)
  async detectIntent(message: Message): Promise<Intent>
  
  // Agent invocation
  async invokeAgent(intent: Intent, context: AgentContext): Promise<AgentResponse>
  
  // State management
  async checkpoint(): Promise<void>
  async recover(): Promise<void>
  
  // Poll management
  async createPoll(config: PollConfig): Promise<Poll>
  async recordVote(pollId: string, userId: string, choice: any): Promise<void>
  async closePoll(pollId: string): Promise<PollResult>
}
```

**Memory Management:**
- Keep last 200 messages in full detail (~10-15MB)
- Compress older messages into summary (~1MB)
- Checkpoint every 50 messages to Convex
- Recovery: Load latest checkpoint + recent messages

### 3.2 EventCoordinatorDO (per event)

**Purpose:** Cross-room coordination and event-level intelligence

**State Schema:**
```typescript
interface EventState {
  eventId: string;
  eventMetadata: EventInfo;
  
  // Cross-room summaries
  roomSummaries: Record<roomId, RoomSummary>;
  
  // Event-wide data
  globalTimeline: Milestone[];
  budgetOverview: BudgetSummary;
  allTasks: TaskDigest[];  // Lightweight refs, not full data
  
  // Decision history
  majorDecisions: Decision[];
  
  // Trigger state
  lastTriggerCheck: timestamp;
  activeAlerts: Alert[];
}
```

**Key Methods:**
```typescript
class EventCoordinatorDO {
  // Synthesis
  async synthesizeRoomData(): Promise<EventOverview>
  
  // Periodic checks (Phase 2: Background triggers)
  async checkTriggers(): Promise<SystemMessage[]>
  
  // Cross-room queries
  async queryAllRooms(question: string): Promise<Answer>
  
  // Event-level decisions
  async makeEventDecision(topic: string): Promise<Decision>
}
```

**Use Cases:**
- "Show me all tasks across all rooms"
- "What's our total budget vs spent?"
- "Are we on track for the event date?"
- Background: "Photography deadline is approaching, no task exists"

### 3.3 UnifiedDelphiAgent (stateless service)

**Purpose:** Single intelligent agent with all domain capabilities

**Core Workflow:**
```typescript
class UnifiedDelphiAgent {
  async handle(request: AgentRequest): Promise<AgentResponse> {
    // 1. PLANNING PHASE
    const plan = await this.createExecutionPlan(request);
    
    if (!plan.feasible) {
      return this.buildClarificationResponse(plan.missingInfo);
    }
    
    // 2. EXECUTION PHASE
    const state = new ExecutionState();
    
    for (const step of plan.steps) {
      const result = await this.executeStep(step, state);
      state.update(step, result);
      
      if (this.goalAchieved(state, plan.goal)) {
        break;
      }
    }
    
    // 3. RESPONSE ASSEMBLY
    return this.assembleResponse(state, plan);
  }
  
  private async createExecutionPlan(request: AgentRequest): Promise<ExecutionPlan> {
    // Use Claude to analyze request and create plan
    const planPrompt = this.buildPlanningPrompt(request);
    const response = await this.callClaude(planPrompt);
    return this.parseExecutionPlan(response);
  }
}
```

**Available Tools:**
```typescript
interface AgentTools {
  // Data operations
  convexCRUD: ConvexCRUDTool;      // Create/read/update tasks, budgets, vendors
  
  // External services
  webSearch: FirecrawlTool;        // Search for vendors, info
  
  // UI generation
  componentBuilder: ComponentTool;  // Build grid layouts
  
  // Voting
  pollManager: PollTool;           // Create and manage polls
  
  // Analysis
  budgetAnalyzer: BudgetTool;      // Calculate splits, forecasts
  timelineGenerator: TimelineTool;  // Suggest deadlines
}
```

**Response Types:**
```typescript
type AgentResponse = {
  success: boolean;
  
  // Content variants
  content: {
    type: 'text' | 'components' | 'hybrid';
    
    // Text response
    text?: string;
    
    // Component grid
    components?: ComponentLayout[];
    
    // Hybrid: text + components
    sections?: ResponseSection[];
  };
  
  // Actions taken
  actions: AgentAction[];
  
  // Metadata
  reasoning: string;
  confidence: number;
  suggestedFollowUps?: string[];
};
```

---

## 4. Message & Response Protocol

### 4.1 Message Schema

**Convex Schema:**
```typescript
// Tables: messages
{
  _id: Id<"messages">,
  _creationTime: number,
  
  // Core fields
  roomId: Id<"rooms">,
  eventId: Id<"events">,
  authorId: Id<"users">,
  authorType: "user" | "agent" | "system",
  
  // Content
  content: string,
  
  // Response structure (for agent/system messages)
  response?: {
    type: "text" | "components" | "hybrid",
    
    // Text
    text?: string,
    
    // Components
    components?: Array<{
      type: "TaskCard" | "BudgetSummary" | "PollCard" | "VendorList",
      position: { row: number, col: number, rowSpan: number, colSpan: number },
      data: any
    }>,
    
    // Actions
    actions?: Array<{
      actionType: "task_created" | "poll_created" | "budget_updated",
      entityId: string,
      data: any
    }>
  },
  
  // Metadata
  metadata?: {
    intent?: string,
    confidence?: number,
    processingTime?: number,
    agentReasoning?: string
  },
  
  // Relationships
  replyToId?: Id<"messages">,
  threadId?: Id<"messages">
}
```

### 4.2 Component Layout System

**Grid System:**
- 12-column grid (like Bootstrap)
- Components specify: `{ row, col, rowSpan, colSpan }`
- Frontend renders using CSS Grid

**Example Component Response:**
```typescript
{
  type: "components",
  components: [
    {
      type: "TaskCard",
      position: { row: 1, col: 1, rowSpan: 1, colSpan: 6 },
      data: {
        taskId: "task_123",
        title: "Book Photographer",
        dueDate: "2025-12-01",
        assignee: "user_456",
        priority: "high"
      }
    },
    {
      type: "BudgetImpact",
      position: { row: 1, col: 7, rowSpan: 1, colSpan: 6 },
      data: {
        category: "photography",
        estimatedCost: { min: 2500, max: 4000 },
        budgetRemaining: 35000
      }
    },
    {
      type: "VendorSuggestions",
      position: { row: 2, col: 1, rowSpan: 2, colSpan: 12 },
      data: {
        vendors: [
          { name: "Jane Doe Photography", rating: 4.8, price: "$3,200" },
          { name: "Brooklyn Shots", rating: 4.6, price: "$2,800" }
        ]
      }
    }
  ]
}
```

**Frontend Rendering:**
```typescript
// Component map
const COMPONENT_MAP = {
  TaskCard: TaskCardComponent,
  BudgetImpact: BudgetImpactComponent,
  VendorSuggestions: VendorSuggestionsComponent,
  PollCard: PollCardComponent,
  // ... etc
};

// Render function
function renderMessage(message: Message) {
  if (message.response?.type === 'text') {
    return <MessageBubble>{message.response.text}</MessageBubble>;
  }
  
  if (message.response?.type === 'components') {
    return (
      <ComponentGrid>
        {message.response.components.map(comp => {
          const Component = COMPONENT_MAP[comp.type];
          return (
            <GridCell 
              row={comp.position.row} 
              col={comp.position.col}
              rowSpan={comp.position.rowSpan}
              colSpan={comp.position.colSpan}
            >
              <Component data={comp.data} />
            </GridCell>
          );
        })}
      </ComponentGrid>
    );
  }
}
```

### 4.3 Poll System

**Poll Schema:**
```typescript
// Tables: polls
{
  _id: Id<"polls">,
  roomId: Id<"rooms">,
  eventId: Id<"events">,
  
  // Config
  question: string,
  type: "binary" | "multiple_choice" | "ranked" | "budget_allocation",
  options: string[] | number[],
  
  // State
  status: "active" | "closed",
  createdAt: timestamp,
  closesAt?: timestamp,
  
  // Results
  votes: Record<userId, any>,
  result?: any,
  
  // Metadata
  createdBy: "user" | "agent",
  messageId: Id<"messages">  // Link back to message that created it
}
```

**Poll Component:**
```typescript
{
  type: "PollCard",
  position: { row: 1, col: 1, rowSpan: 1, colSpan: 12 },
  data: {
    pollId: "poll_123",
    question: "Which venue should we choose?",
    options: ["Brooklyn Loft", "Manhattan Ballroom", "Garden Estate"],
    currentVotes: { 
      "Brooklyn Loft": 5, 
      "Manhattan Ballroom": 3, 
      "Garden Estate": 2 
    },
    userVote: "Brooklyn Loft",  // Current user's vote
    status: "active",
    closesAt: "2025-11-20T23:59:59Z"
  }
}
```

---

## 5. Agent System Design

### 5.1 Planning-First Architecture

**Planning Phase:**
```typescript
interface ExecutionPlan {
  goal: string;
  feasible: boolean;
  
  // If feasible
  steps?: ExecutionStep[];
  estimatedIterations?: number;
  
  // If not feasible
  missingInfo?: string[];
  clarificationNeeded?: string;
}

interface ExecutionStep {
  stepNumber: number;
  description: string;
  tool: string;
  params: any;
  dependsOn: number[];  // Step numbers
  rationale: string;
}
```

**Planning Prompt Template:**
```typescript
const planningPrompt = `
You are Delphi, an event planning assistant. Your job is to analyze user requests and create execution plans.

USER REQUEST: "${userMessage}"

ROOM CONTEXT:
- Event: ${eventName} (${eventType})
- Date: ${eventDate}
- Room Type: ${roomType}
- Recent Activity: ${recentSummary}

CURRENT STATE:
- Tasks: ${taskCount} exist
- Budget: ${budgetSet ? 'Set' : 'Not set'}
- Active Polls: ${pollCount}

YOUR TASK: Create an execution plan to fulfill the user's request.

ANALYSIS STEPS:
1. What is the user actually asking for?
2. What data/context do I need?
3. What tools should I use and in what order?
4. Are there any preconditions not met?
5. What could go wrong?

OUTPUT FORMAT (JSON):
{
  "goal": "Clear statement of what user wants",
  "feasible": true | false,
  
  // If feasible = true:
  "steps": [
    {
      "stepNumber": 1,
      "description": "Check if tasks already exist",
      "tool": "convex_crud",
      "params": { "operation": "query", "table": "tasks" },
      "dependsOn": [],
      "rationale": "Need to know current state before creating"
    },
    {
      "stepNumber": 2,
      "description": "Create task for photographer",
      "tool": "convex_crud",
      "params": { "operation": "create", "table": "tasks", "data": {...} },
      "dependsOn": [1],
      "rationale": "User explicitly requested this"
    }
  ],
  "estimatedIterations": 3,
  
  // If feasible = false:
  "missingInfo": ["event date", "total budget"],
  "clarificationNeeded": "I need to know your event date and budget to suggest appropriate vendors."
}

IMPORTANT RULES:
- If state is empty (no tasks, no budget), explain this and offer to help create
- If request is ambiguous, ask for clarification
- If request requires multiple steps, plan them all upfront
- Consider dependencies between steps
- Be realistic about feasibility
`;
```

### 5.2 Intent Detection (Phase 1: Simple Tags)

**Tag-Based Detection:**
```typescript
interface Intent {
  primaryIntent: IntentType;
  confidence: number;
  entities: Entity[];
  suggestedAction: Action;
}

type IntentType = 
  | 'create_task'
  | 'query_tasks'
  | 'update_task'
  | 'create_poll'
  | 'vote'
  | 'query_budget'
  | 'add_expense'
  | 'search_vendors'
  | 'general_question'
  | 'clarification_needed';

// Detection logic
async detectIntent(message: string, context: RoomContext): Promise<Intent> {
  // Use Claude for intent classification
  const intentPrompt = `
Analyze this message and classify the user's intent.

MESSAGE: "${message}"

CONTEXT:
- Room has ${context.taskCount} tasks
- Budget is ${context.hasBudget ? 'set' : 'not set'}
- Active polls: ${context.pollCount}

POSSIBLE INTENTS:
- create_task: User wants to add a new task
- query_tasks: User wants to see existing tasks
- update_task: User wants to modify a task
- create_poll: User wants to create a vote/poll
- vote: User is voting on existing poll
- query_budget: User wants budget info
- add_expense: User mentioning a cost/expense
- search_vendors: User looking for vendor recommendations
- general_question: General event planning question
- clarification_needed: Message is too ambiguous

OUTPUT (JSON):
{
  "primaryIntent": "create_task",
  "confidence": 0.9,
  "entities": [
    { "type": "task_title", "value": "Book photographer" },
    { "type": "category", "value": "photography" }
  ],
  "suggestedAction": {
    "type": "invoke_agent",
    "reason": "High confidence, clear intent"
  }
}

Rules:
- If confidence < 0.7, set intent to "clarification_needed"
- If context is missing (e.g., query tasks but none exist), note in suggestedAction
- Extract all relevant entities (dates, money, people, categories)
`;

  const response = await this.callClaude(intentPrompt);
  return this.parseIntent(response);
}
```

### 5.3 State Management

**ExecutionState (tracks progress):**
```typescript
class ExecutionState {
  private steps: Map<number, StepResult> = new Map();
  private createdEntities: Entity[] = [];
  private queriedData: Record<string, any> = {};
  
  update(step: ExecutionStep, result: ToolResult) {
    this.steps.set(step.stepNumber, {
      step,
      result,
      timestamp: Date.now()
    });
    
    // Track created entities
    if (result.success && result.data?._id) {
      this.createdEntities.push({
        type: step.params.table,
        id: result.data._id,
        data: result.data
      });
    }
  }
  
  getProgress(): string {
    const completed = Array.from(this.steps.values())
      .filter(s => s.result.success).length;
    const total = this.steps.size;
    
    return `Completed ${completed}/${total} steps`;
  }
  
  getCreatedEntities(): Entity[] {
    return this.createdEntities;
  }
}
```

**Prompt with State Context:**
```typescript
function buildIterationPrompt(
  plan: ExecutionPlan, 
  state: ExecutionState,
  iteration: number
): string {
  return `
EXECUTION PLAN:
${plan.steps.map(s => `${s.stepNumber}. ${s.description}`).join('\n')}

PROGRESS SO FAR:
${state.getProgress()}

COMPLETED STEPS:
${state.getCompletedSteps().map(s => 
  `✓ Step ${s.stepNumber}: ${s.description} - ${s.result.success ? 'SUCCESS' : 'FAILED'}`
).join('\n')}

CREATED ENTITIES:
${state.getCreatedEntities().map(e => 
  `- ${e.type}: ${e.data.title || e.data.name} (ID: ${e.id})`
).join('\n')}

NEXT STEP: ${plan.steps[iteration]}

Execute this step and report results.
`;
}
```

### 5.4 Response Assembly

**Component-Based Response:**
```typescript
function assembleResponse(
  state: ExecutionState, 
  plan: ExecutionPlan
): AgentResponse {
  const components: ComponentLayout[] = [];
  
  // For each created entity, add appropriate component
  state.getCreatedEntities().forEach((entity, index) => {
    if (entity.type === 'tasks') {
      components.push({
        type: 'TaskCard',
        position: { 
          row: index + 1, 
          col: 1, 
          rowSpan: 1, 
          colSpan: 6 
        },
        data: entity.data
      });
    } else if (entity.type === 'polls') {
      components.push({
        type: 'PollCard',
        position: { 
          row: index + 1, 
          col: 1, 
          rowSpan: 1, 
          colSpan: 12 
        },
        data: entity.data
      });
    }
  });
  
  // Add summary text
  const summaryText = buildSummaryText(state, plan);
  
  return {
    success: true,
    content: {
      type: components.length > 0 ? 'hybrid' : 'text',
      text: summaryText,
      components: components.length > 0 ? components : undefined
    },
    actions: state.getActions(),
    reasoning: plan.rationale,
    confidence: 0.95
  };
}
```

---

## 6. Background Processing

### 6.1 Trigger System (Phase 2)

**Trigger Types:**
```typescript
type Trigger = {
  id: string;
  type: TriggerType;
  pattern: RegexPattern | TimeCondition | StateCondition;
  action: SystemAction;
  priority: 'low' | 'medium' | 'high';
};

type TriggerType =
  | 'deadline_approaching'    // Task due soon, not started
  | 'budget_threshold'        // Spent > X% of budget
  | 'missing_vendor'          // Key vendor category not filled
  | 'inactive_room'           // No activity in N days
  | 'decision_pending'        // Poll created but low participation
  | 'payment_due'             // Vendor payment coming up
  | 'rsvp_reminder';          // RSVP deadline approaching
```

**Trigger Definitions:**
```typescript
const TRIGGER_DEFINITIONS: Trigger[] = [
  {
    id: 'photography_deadline',
    type: 'deadline_approaching',
    pattern: {
      category: 'photography',
      timeUntilEvent: { operator: '<', value: { months: 6 } },
      taskExists: false
    },
    action: {
      type: 'create_system_message',
      roomType: 'main',
      messageTemplate: "🚨 Photography booking recommended by now (6 months out). Should we create a task?",
      suggestedActions: ['create_photographer_task', 'search_photographers']
    },
    priority: 'high'
  },
  {
    id: 'budget_80_percent',
    type: 'budget_threshold',
    pattern: {
      spentPercentage: { operator: '>', value: 80 }
    },
    action: {
      type: 'create_system_message',
      roomType: 'main',
      messageTemplate: "⚠️ Budget alert: You've spent 80% of your total budget (${spent}/${total}). Review remaining allocations?",
      suggestedActions: ['show_budget_breakdown', 'adjust_allocations']
    },
    priority: 'high'
  }
];
```

**Cron Worker:**
```typescript
// Runs every 1 hour
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Get all active events
    const activeEvents = await env.CONVEX.query('events:listActive');
    
    for (const event of activeEvents) {
      // Get EventCoordinatorDO for this event
      const doId = env.EVENT_COORDINATOR.idFromName(event._id);
      const coordinator = env.EVENT_COORDINATOR.get(doId);
      
      // Check triggers
      const triggeredMessages = await coordinator.checkTriggers();
      
      // Write system messages to Convex
      for (const msg of triggeredMessages) {
        await env.CONVEX.mutation('messages:create', {
          roomId: msg.roomId,
          authorType: 'system',
          content: msg.content,
          response: msg.response
        });
      }
    }
  }
};
```

**EventCoordinatorDO Trigger Check:**
```typescript
class EventCoordinatorDO {
  async checkTriggers(): Promise<SystemMessage[]> {
    const triggeredMessages: SystemMessage[] = [];
    
    // Get event state
    const eventData = await this.synthesizeEventData();
    
    for (const trigger of TRIGGER_DEFINITIONS) {
      const shouldTrigger = this.evaluateTrigger(trigger, eventData);
      
      if (shouldTrigger) {
        const message = this.buildSystemMessage(trigger, eventData);
        triggeredMessages.push(message);
        
        // Mark trigger as fired (don't spam)
        this.markTriggerFired(trigger.id);
      }
    }
    
    return triggeredMessages;
  }
  
  private evaluateTrigger(trigger: Trigger, eventData: EventData): boolean {
    switch (trigger.type) {
      case 'deadline_approaching':
        return this.checkDeadlineTrigger(trigger.pattern, eventData);
      case 'budget_threshold':
        return this.checkBudgetTrigger(trigger.pattern, eventData);
      // ... other trigger types
    }
  }
}
```

### 6.2 Pattern Matching (Regex)

**Pattern Library:**
```typescript
const PATTERNS = {
  // Task commitments
  COMMITMENT: /\b(we should|need to|let's|i'll|have to)\s+(book|order|find|hire|contact)\b/i,
  
  // Money mentions
  EXPENSE: /\$[\d,]+\.?\d*|\b\d+\s*(dollars|bucks|usd)\b/i,
  COST_RANGE: /\$?([\d,]+)\s*(?:to|-)\s*\$?([\d,]+)/i,
  
  // Deadlines
  DATE_MENTION: /\b(by|before|until|due)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  
  // Decisions
  QUESTION: /\b(should we|what if|how about|do you think|which|what about)\b/i,
  POLL_REQUEST: /\b(vote|poll|decide|choose between|let's vote)\b/i,
  
  // Vendors
  VENDOR_SEARCH: /\b(find|search|looking for|need|recommend)\s+(photographer|dj|caterer|florist|venue|planner)\b/i,
};
```

**Fast Pre-Filter (in Worker):**
```typescript
// Before invoking DO, quick check if message needs processing
function shouldProcessMessage(content: string): boolean {
  // Check against common patterns
  for (const pattern of Object.values(PATTERNS)) {
    if (pattern.test(content)) {
      return true;  // Likely needs AI
    }
  }
  
  // Also process direct questions/requests
  if (content.includes('?') || content.startsWith('delphi')) {
    return true;
  }
  
  return false;  // Just chat, no AI needed
}
```

---

## 7. Migration Path

### 7.1 From Current to New System

**Current State:**
```
ChatOrchestratorDO → Routes by keyword
  ├─> TaskAgent (specialized)
  ├─> EventAgent (specialized)
  ├─> BudgetAgent (specialized)
  └─> VendorAgent (specialized)
```

**Target State:**
```
RoomOrchestratorDO (per room) → Planning → UnifiedDelphiAgent
EventCoordinatorDO (per event) → Synthesis + Triggers
```

**Migration Strategy:**

**Phase 1: Consolidate Agents (Week 1)**
1. Create `UnifiedDelphiAgent` class
2. Merge system prompts from all specialized agents
3. Keep existing tool infrastructure
4. Add planning layer
5. Test with existing ChatOrchestratorDO

**Phase 2: Introduce RoomOrchestratorDO (Week 2)**
1. Create `RoomOrchestratorDO` class
2. Migrate state management from ChatOrchestratorDO
3. Add checkpoint system
4. Implement hot memory management
5. Gradual rollout (10% → 50% → 100%)

**Phase 3: Add EventCoordinatorDO (Week 3)**
1. Create `EventCoordinatorDO` class
2. Implement cross-room synthesis
3. Add periodic state checks
4. Deploy background worker

**Phase 4: Background Triggers (Week 4)**
1. Define trigger patterns
2. Implement trigger evaluation
3. Create system message generator
4. Deploy cron worker

**Phase 5: UI Components (Week 5)**
1. Design component library
2. Implement grid layout engine
3. Update agent to generate component responses
4. Frontend rendering system

### 7.2 Backward Compatibility

**During Migration:**
- Keep existing specialized agents as fallback
- Feature flag: `USE_UNIFIED_AGENT=true/false`
- Monitor error rates closely
- Easy rollback if issues arise

**Gradual Rollout:**
```typescript
// In Worker
if (env.USE_UNIFIED_AGENT === 'true' && Math.random() < rolloutPercentage) {
  return roomOrchestrator.handle(request);
} else {
  return chatOrchestrator.handle(request);  // Old system
}
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**
- [ ] UnifiedDelphiAgent with planning layer
- [ ] State-aware execution
- [ ] Dynamic iteration budgets
- [ ] Precondition validation
- [ ] AI-based intent detection

**Success Metrics:**
- Agent success rate >95%
- Handles "update tasks" with no tasks gracefully
- Can create multiple tasks in one request
- Reasoning visible in responses

### Phase 2: Room Architecture (Weeks 3-4)

**Deliverables:**
- [ ] RoomOrchestratorDO implementation
- [ ] Hot memory management (200 messages)
- [ ] Checkpoint system to Convex
- [ ] Recovery from checkpoints
- [ ] EventCoordinatorDO for cross-room synthesis

**Success Metrics:**
- DO memory usage <20MB average
- Checkpoint recovery <100ms
- Multi-room queries working
- Event-wide summaries accurate

### Phase 3: Enhanced Responses (Weeks 5-6)

**Deliverables:**
- [ ] Component response system
- [ ] Grid layout engine
- [ ] Frontend component library
- [ ] Poll creation and voting
- [ ] Hybrid text+component messages

**Success Metrics:**
- Components render correctly
- Grid layout responsive
- Polls functional end-to-end
- User engagement with components >60%

### Phase 4: Background Intelligence (Weeks 7-8)

**Deliverables:**
- [ ] Trigger pattern definitions
- [ ] Cron worker for periodic checks
- [ ] System message generation
- [ ] Proactive suggestions
- [ ] Notification system

**Success Metrics:**
- Triggers fire accurately
- False positive rate <10%
- User action rate on suggestions >30%
- No spam (max 1 trigger/day/type)

### Phase 5: Polish & Optimization (Weeks 9-10)

**Deliverables:**
- [ ] Performance optimization
- [ ] Cost reduction (caching, etc.)
- [ ] Error handling improvements
- [ ] Monitoring dashboards
- [ ] Documentation

**Success Metrics:**
- P95 response time <2s
- AI cost <$0.15/event
- Error rate <1%
- User satisfaction >4.5/5

---

## 9. Key Implementation Patterns

### 9.1 DO State Persistence

```typescript
class RoomOrchestratorDO {
  private state: RoomState;
  
  constructor(state: DurableObjectState, env: Env) {
    this.doState = state;
    this.env = env;
  }
  
  async fetch(request: Request) {
    // Load state from DO storage
    await this.loadState();
    
    // Handle request
    const response = await this.handleRequest(request);
    
    // Save state to DO storage
    await this.saveState();
    
    return response;
  }
  
  async loadState() {
    const stored = await this.doState.storage.get('state');
    if (stored) {
      this.state = stored as RoomState;
    } else {
      // Recovery: load from Convex checkpoint
      await this.recoverFromCheckpoint();
    }
  }
  
  async saveState() {
    await this.doState.storage.put('state', this.state);
    
    // Periodic checkpoint to Convex
    if (this.shouldCheckpoint()) {
      await this.checkpoint();
    }
  }
  
  shouldCheckpoint(): boolean {
    return this.state.messageHistory.length % 50 === 0;
  }
  
  async checkpoint() {
    await this.env.CONVEX.mutation('checkpoints:create', {
      roomId: this.state.roomId,
      snapshot: this.compressState(),
      timestamp: Date.now()
    });
  }
}
```

### 9.2 Agent Invocation Pattern

```typescript
async invokeAgent(intent: Intent, context: AgentContext): Promise<AgentResponse> {
  // 1. Validate preconditions
  const validation = this.validatePreconditions(intent, context);
  if (!validation.valid) {
    return this.buildValidationError(validation);
  }
  
  // 2. Assemble agent context
  const agentRequest: AgentRequest = {
    intent: intent.primaryIntent,
    userMessage: context.originalMessage,
    roomContext: {
      eventId: this.state.eventId,
      roomType: this.state.roomType,
      taskCount: await this.getTaskCount(),
      hasBudget: await this.checkBudget(),
      recentSummary: this.state.messageSummary
    },
    conversationHistory: this.state.messageHistory.slice(-10),  // Last 10
  };
  
  // 3. Call agent
  const agent = new UnifiedDelphiAgent(this.env);
  const response = await agent.handle(agentRequest);
  
  // 4. Update state based on response
  this.updateStateFromResponse(response);
  
  return response;
}
```

### 9.3 Component Assembly Pattern

```typescript
function assembleTaskResponse(task: Task): ComponentLayout[] {
  const components: ComponentLayout[] = [];
  
  // Main task card
  components.push({
    type: 'TaskCard',
    position: { row: 1, col: 1, rowSpan: 1, colSpan: 8 },
    data: {
      taskId: task._id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      category: task.category,
      status: task.status
    }
  });
  
  // Budget impact (if cost estimate available)
  if (task.estimatedCost) {
    components.push({
      type: 'BudgetImpact',
      position: { row: 1, col: 9, rowSpan: 1, colSpan: 4 },
      data: {
        category: task.category,
        estimatedCost: task.estimatedCost,
        budgetRemaining: await getBudgetRemaining(task.eventId)
      }
    });
  }
  
  // Vendor suggestions (if available)
  if (task.suggestedVendors?.length > 0) {
    components.push({
      type: 'VendorList',
      position: { row: 2, col: 1, rowSpan: 1, colSpan: 12 },
      data: {
        category: task.category,
        vendors: task.suggestedVendors,
        showQuickActions: true
      }
    });
  }
  
  return components;
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Test RoomOrchestratorDO:**
```typescript
describe('RoomOrchestratorDO', () => {
  test('handles empty state gracefully', async () => {
    const do = new RoomOrchestratorDO(mockState, mockEnv);
    const response = await do.handleMessage({
      content: 'Show me my tasks',
      authorId: 'user_1'
    });
    
    expect(response.success).toBe(true);
    expect(response.content.text).toContain('no tasks yet');
  });
  
  test('checkpoints every 50 messages', async () => {
    const do = new RoomOrchestratorDO(mockState, mockEnv);
    
    // Add 50 messages
    for (let i = 0; i < 50; i++) {
      await do.handleMessage({ content: `Message ${i}` });
    }
    
    // Verify checkpoint was created
    expect(mockEnv.CONVEX.mutation).toHaveBeenCalledWith(
      'checkpoints:create',
      expect.objectContaining({ roomId: expect.any(String) })
    );
  });
});
```

**Test UnifiedDelphiAgent:**
```typescript
describe('UnifiedDelphiAgent', () => {
  test('creates execution plan for task creation', async () => {
    const agent = new UnifiedDelphiAgent(mockEnv);
    const plan = await agent.createExecutionPlan({
      intent: 'create_task',
      userMessage: 'Book a photographer',
      roomContext: mockContext
    });
    
    expect(plan.feasible).toBe(true);
    expect(plan.steps).toHaveLength(2);  // Query + Create
    expect(plan.steps[0].tool).toBe('convex_crud');
  });
  
  test('detects missing preconditions', async () => {
    const agent = new UnifiedDelphiAgent(mockEnv);
    const plan = await agent.createExecutionPlan({
      intent: 'query_budget',
      userMessage: 'Show me the budget',
      roomContext: { ...mockContext, hasBudget: false }
    });
    
    expect(plan.feasible).toBe(false);
    expect(plan.missingInfo).toContain('budget not set');
  });
});
```

### 10.2 Integration Tests

**End-to-End Flow:**
```typescript
test('complete flow: user message → agent response → UI render', async () => {
  // 1. User sends message
  const messageId = await convex.mutation('messages:create', {
    roomId: 'room_1',
    content: 'We should book a photographer'
  });
  
  // 2. Worker processes message
  await worker.handleWebhook({ messageId });
  
  // 3. Wait for agent response
  await waitForCondition(() => 
    convex.query('messages:get', { messageId: messageId + 1 })
  );
  
  // 4. Verify response structure
  const response = await convex.query('messages:get', { messageId: messageId + 1 });
  expect(response.authorType).toBe('agent');
  expect(response.response.type).toBe('components');
  expect(response.response.components[0].type).toBe('TaskCard');
});
```

---

## 11. Monitoring & Observability

### 11.1 Key Metrics

**Performance:**
- DO wake time
- Message processing time
- Agent response time
- Checkpoint time
- Recovery time

**Reliability:**
- Success rate (intent → action)
- Error rate by type
- Retry rate
- Checkpoint failure rate

**Business:**
- Messages per room
- Agent invocations per event
- Component render rate
- Poll participation rate

### 11.2 Logging Strategy

```typescript
// Structured logging
console.log(JSON.stringify({
  level: 'info',
  component: 'RoomOrchestratorDO',
  roomId: this.state.roomId,
  action: 'handleMessage',
  intent: intent.primaryIntent,
  confidence: intent.confidence,
  processingTime: Date.now() - startTime,
  memoryUsage: this.state.memoryUsage
}));
```

---

## 12. Future Enhancements

### Post-Launch Features

**Advanced UI:**
- Drag-and-drop component reordering
- Custom component templates
- Visualization widgets (timeline, gantt)

**Enhanced Intelligence:**
- Multi-step workflows (chains of tasks)
- Conditional logic ("if budget >$50k, suggest premium vendors")
- Learning from user preferences

**Integrations:**
- Calendar sync (Google, Apple)
- Payment processing (Stripe)
- Email forwarding (vendor inquiries)

---

## Appendix: Quick Reference

### A. Component Types

```typescript
type ComponentType =
  | 'TaskCard'           // Single task display
  | 'TaskList'           // Multiple tasks
  | 'BudgetSummary'      // Budget overview
  | 'BudgetImpact'       // Cost impact of action
  | 'VendorList'         // Vendor recommendations
  | 'VendorCard'         // Single vendor
  | 'PollCard'           // Voting interface
  | 'TimelineView'       // Gantt-style timeline
  | 'DecisionHistory'    // Past decisions
  | 'QuickActions';      // Action buttons
```

### B. Agent Tools

```typescript
// Convex CRUD
await tools.convexCRUD.execute({
  operation: 'create' | 'query' | 'update' | 'delete',
  table: 'tasks' | 'budgets' | 'vendors' | 'polls',
  data: {...}
});

// Web search
await tools.webSearch.execute({
  query: 'wedding photographers Seattle',
  limit: 5
});

// Poll creation
await tools.pollManager.create({
  question: 'Which venue?',
  options: ['Option A', 'Option B'],
  type: 'multiple_choice'
});
```

### C. State Access Patterns

```typescript
// From RoomOrchestratorDO
const recentMessages = this.state.messageHistory.slice(-10);
const activePolls = this.state.activePolls.filter(p => p.status === 'active');
const summary = this.state.messageSummary;

// From EventCoordinatorDO
const allRooms = Object.values(this.state.roomSummaries);
const totalBudget = this.state.budgetOverview.total;
const upcomingDeadlines = this.state.globalTimeline
  .filter(m => m.date > Date.now());
```

---

**End of Document**

This master plan provides the architectural foundation for Delphi v3.0. Use this as the primary reference when exploring the codebase and implementing features. Each section can be expanded into detailed implementation files as needed.
