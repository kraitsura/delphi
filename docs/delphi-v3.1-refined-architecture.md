# Delphi Agent System v3.1: Refined Architecture
## Proposals, Context-Aware Intent, and Simplified State Management

**Version:** 3.1 (Updated based on architectural review)  
**Date:** November 16, 2025  
**Status:** Ready for Implementation  
**Changes from v3.0:** Simplified DO architecture, added proposal system, enhanced intent detection

---

## Executive Summary

### Key Architectural Decisions

**1. Proposal System for Batch Operations**
- Agent analyzes and returns proposed actions
- User reviews/edits before execution
- One AI call, batch database operations
- Better UX and efficiency

**2. Context-Aware Intent Detection**
- Understands pragmatics, not just literals
- "Update tasks" with no tasks → create from conversation
- Considers room state and conversation history
- Asks Claude to interpret user meaning

**3. Simplified DO Architecture**
- **One DO type:** RoomOrchestratorDO for all rooms
- Room type determines behavior (main/vendor/brainstorm/private)
- No EventCoordinatorDO initially (add only if needed)
- Background triggers in cron worker directly

---

## Part 1: Proposal System

### 1.1 The Problem with Iteration-Based Creation

**Current approach (inefficient):**
```
User: "Book photographer, find caterer, get venue quotes"

Iteration 1: Create "Book photographer" task
Iteration 2: Create "Find caterer" task  
Iteration 3: Create "Get venue quotes" task

Result: 3 AI calls, 3 database operations, no user preview
```

**Issues:**
- Multiple AI calls (expensive)
- No user review before creation
- Can't batch edit
- User sees tasks appear one by one (confusing)

### 1.2 New Approach: Proposal-Confirm-Execute

**New flow:**
```
User: "Book photographer, find caterer, get venue quotes"

↓ [Single AI call]

Agent analyzes and returns:
{
  type: "proposal",
  proposedTasks: [
    { title: "Book Wedding Photographer", ... },
    { title: "Find Caterer", ... },
    { title: "Get Venue Quotes", ... }
  ]
}

↓ [Frontend renders TaskProposalCard]

User reviews and clicks: Accept All | Edit | Reject

↓ [Batch creation if accepted]

All 3 tasks created simultaneously
Confirmation message posted
```

**Benefits:**
- ✅ One AI call instead of N
- ✅ User control (preview before creation)
- ✅ Batch operations (faster, atomic)
- ✅ Can edit before committing

### 1.3 Implementation

#### Schema: Proposals Table

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  proposals: defineTable({
    roomId: v.id("rooms"),
    eventId: v.id("events"),
    proposalType: v.union(
      v.literal("tasks"),
      v.literal("budget_entries"),
      v.literal("vendor_suggestions")
    ),
    
    // The proposed data
    items: v.array(v.any()),
    
    // Metadata
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    
    createdBy: v.id("users"),
    messageId: v.id("messages"),  // Link to agent message
    
    expiresAt: v.number(),  // Auto-expire after 5 minutes
  })
    .index("by_room", ["roomId", "status"])
    .index("by_message", ["messageId"]),
});
```

#### Agent: Generate Proposal

```typescript
// agent-worker/src/agents/UnifiedDelphiAgent.ts

class UnifiedDelphiAgent {
  async handle(request: AgentRequest): Promise<AgentResponse> {
    // 1. Create execution plan
    const plan = await this.createExecutionPlan(request);
    
    if (!plan.feasible) {
      return this.buildClarificationResponse(plan);
    }
    
    // 2. Check if plan involves multiple creates
    const createSteps = plan.steps.filter(
      s => s.tool === 'convex_crud' && s.params.operation === 'create'
    );
    
    if (createSteps.length > 1) {
      // Return proposal instead of executing
      return this.buildProposal(createSteps, request);
    }
    
    // 3. Single operation - execute normally
    return this.execute(plan);
  }
  
  private buildProposal(
    createSteps: ExecutionStep[], 
    request: AgentRequest
  ): AgentResponse {
    const proposalId = generateId();
    const proposedItems = createSteps.map(step => step.params.data);
    
    return {
      success: true,
      requiresConfirmation: true,
      
      content: {
        type: "components",
        text: `I found ${proposedItems.length} tasks from your message. Review and confirm:`,
        
        components: [{
          type: "TaskProposalCard",
          position: { row: 1, col: 1, rowSpan: 1, colSpan: 12 },
          data: {
            proposalId,
            proposalType: "tasks",
            items: proposedItems,
            actions: ["accept_all", "edit", "reject"]
          }
        }]
      },
      
      // Store proposal in response metadata
      metadata: {
        proposalId,
        proposedItems,
        expiresAt: Date.now() + (5 * 60 * 1000)  // 5 minutes
      }
    };
  }
}
```

#### DO: Store Proposal

```typescript
// agent-worker/src/durable-objects/RoomOrchestratorDO.ts

class RoomOrchestratorDO {
  private pendingProposals: Map<string, Proposal> = new Map();
  
  async handleAgentResponse(
    agentResponse: AgentResponse, 
    originalMessage: Message
  ): Promise<void> {
    // If response includes proposal, store it temporarily
    if (agentResponse.requiresConfirmation && agentResponse.metadata?.proposalId) {
      this.pendingProposals.set(agentResponse.metadata.proposalId, {
        id: agentResponse.metadata.proposalId,
        items: agentResponse.metadata.proposedItems,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: agentResponse.metadata.expiresAt
      });
    }
    
    // Write agent response to Convex
    await this.convex.mutation('messages:create', {
      roomId: this.state.roomId,
      authorType: 'agent',
      content: agentResponse.content.text,
      response: agentResponse.content
    });
  }
  
  async confirmProposal(
    proposalId: string, 
    action: 'accept_all' | 'edit' | 'reject',
    editedItems?: any[]
  ): Promise<ConfirmationResult> {
    const proposal = this.pendingProposals.get(proposalId);
    
    if (!proposal) {
      throw new Error('Proposal not found or expired');
    }
    
    switch (action) {
      case 'accept_all':
        return this.executeProposal(proposal);
      
      case 'edit':
        // Update proposal with edits
        proposal.items = editedItems || proposal.items;
        return this.executeProposal(proposal);
      
      case 'reject':
        this.pendingProposals.delete(proposalId);
        return { success: true, action: 'rejected' };
    }
  }
  
  private async executeProposal(proposal: Proposal): Promise<ConfirmationResult> {
    // Batch create all items
    const created = await Promise.all(
      proposal.items.map(item => 
        this.convex.mutation('tasks:create', {
          eventId: this.state.eventId,
          roomId: this.state.roomId,
          ...item
        })
      )
    );
    
    // Clean up proposal
    this.pendingProposals.delete(proposal.id);
    
    // Post confirmation message
    await this.convex.mutation('messages:create', {
      roomId: this.state.roomId,
      authorType: 'system',
      content: `✓ Created ${created.length} tasks successfully`
    });
    
    return {
      success: true,
      action: 'accepted',
      createdItems: created
    };
  }
  
  // Cleanup expired proposals periodically
  private cleanupExpiredProposals(): void {
    const now = Date.now();
    for (const [id, proposal] of this.pendingProposals.entries()) {
      if (proposal.expiresAt < now) {
        this.pendingProposals.delete(id);
      }
    }
  }
}
```

#### Frontend: TaskProposalCard Component

```typescript
// frontend/src/components/TaskProposalCard.tsx

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

interface TaskProposalCardProps {
  data: {
    proposalId: string;
    proposalType: 'tasks' | 'budget_entries';
    items: any[];
    actions: string[];
  };
}

export function TaskProposalCard({ data }: TaskProposalCardProps) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(data.items);
  const confirmProposal = useMutation(api.proposals.confirm);
  
  const handleAcceptAll = async () => {
    try {
      await confirmProposal({
        proposalId: data.proposalId,
        action: 'accept_all'
      });
    } catch (error) {
      console.error('Failed to accept proposal:', error);
    }
  };
  
  const handleEdit = () => {
    setEditing(true);
  };
  
  const handleSaveEdits = async () => {
    try {
      await confirmProposal({
        proposalId: data.proposalId,
        action: 'edit',
        editedItems: items
      });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save edits:', error);
    }
  };
  
  const handleReject = async () => {
    try {
      await confirmProposal({
        proposalId: data.proposalId,
        action: 'reject'
      });
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };
  
  return (
    <div className="proposal-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {items.length} tasks ready to create
        </h3>
        <span className="text-sm text-gray-500">
          Expires in 5 minutes
        </span>
      </div>
      
      <div className="space-y-2">
        {editing ? (
          <TaskEditor items={items} onChange={setItems} />
        ) : (
          <TaskPreview items={items} />
        )}
      </div>
      
      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSaveEdits}
              className="btn-primary"
            >
              Save & Create
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleAcceptAll}
              className="btn-primary"
            >
              ✓ Accept All
            </button>
            <button
              onClick={handleEdit}
              className="btn-secondary"
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleReject}
              className="btn-secondary"
            >
              ✗ Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TaskPreview({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-600">{item.description}</div>
          <div className="text-xs text-gray-500 mt-1">
            {item.category} • {item.priority} priority • Due: {item.dueDate}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Convex: Proposal Mutations

```typescript
// convex/proposals.ts

import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const confirm = mutation({
  args: {
    proposalId: v.string(),
    action: v.union(v.literal("accept_all"), v.literal("edit"), v.literal("reject")),
    editedItems: v.optional(v.array(v.any()))
  },
  handler: async (ctx, args) => {
    // Forward to DO via worker
    const response = await fetch(`${process.env.WORKER_URL}/api/proposal/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    if (!response.ok) {
      throw new Error('Failed to confirm proposal');
    }
    
    return await response.json();
  }
});
```

### 1.4 Best Practices

**Proposal Expiration:**
```typescript
// Set reasonable expiration (5 minutes)
const PROPOSAL_TTL = 5 * 60 * 1000;

// Clean up periodically
setInterval(() => {
  this.cleanupExpiredProposals();
}, 60 * 1000);  // Every minute
```

**Atomic Operations:**
```typescript
// Use transactions for batch creates
async executeProposal(proposal: Proposal) {
  try {
    // All or nothing
    const created = await this.convex.transaction(async (tx) => {
      return Promise.all(
        proposal.items.map(item => tx.insert('tasks', item))
      );
    });
    
    return { success: true, created };
  } catch (error) {
    // Rollback handled automatically
    return { success: false, error: error.message };
  }
}
```

**Error Handling:**
```typescript
// Handle partial failures gracefully
async executeProposal(proposal: Proposal) {
  const results = await Promise.allSettled(
    proposal.items.map(item => this.createTask(item))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  if (failed.length > 0) {
    // Post partial success message
    await this.postMessage(
      `Created ${succeeded.length}/${results.length} tasks. ` +
      `${failed.length} failed - please try again.`
    );
  }
  
  return { succeeded, failed };
}
```

---

## Part 2: Context-Aware Intent Detection

### 2.1 The Problem with Literal Interpretation

**User says:** "Update our tasks"

**Literal interpretation:**
```
intent = "update_task"
→ Try to modify existing tasks
→ No tasks exist
→ Error: "No tasks to update"
```

**What user actually means:**
- If tasks exist → modify existing tasks
- If no tasks exist → create tasks from conversation
- If conversation has commitments → extract and organize them

### 2.2 Pragmatic Intent Detection

**Key insight:** Language is contextual. The same words mean different things in different situations.

#### Intent Detection Prompt

```typescript
// agent-worker/src/agents/UnifiedDelphiAgent.ts

async detectIntent(
  message: string, 
  roomContext: RoomContext
): Promise<Intent> {
  const intentPrompt = `
You are analyzing a user's message in an event planning system.

USER MESSAGE: "${message}"

ROOM CONTEXT:
- Room Type: ${roomContext.roomType}
- Tasks: ${roomContext.taskCount} exist
- Budget: ${roomContext.hasBudget ? 'Set' : 'Not set'}
- Recent conversation (last 10 messages):
${roomContext.recentMessages.map(m => `  - ${m.author}: ${m.content}`).join('\n')}

COMMITMENTS MENTIONED IN RECENT CONVERSATION:
${roomContext.extractedCommitments.map(c => `  - ${c}`).join('\n')}

ANALYSIS TASK:
The user said "${message}". Consider:
1. What are they literally asking?
2. What do they actually mean given the context?
3. What action would be most helpful?

INTENT CATEGORIES:
- create_task: Create new task(s)
- query_tasks: View existing tasks
- update_task: Modify existing task(s)
- sync_conversation_to_tasks: Extract commitments from conversation and create tasks
- create_poll: Create a vote/poll
- query_budget: View budget information
- add_expense: Record a cost
- search_vendors: Find vendor recommendations
- general_question: Planning advice/question
- clarification_needed: Ambiguous, need more info

PRAGMATIC RULES:
- "Update tasks" with 0 tasks + recent commitments = sync_conversation_to_tasks
- "Update tasks" with >0 tasks = update_task
- "Show me tasks" with 0 tasks = explain none exist, offer to create
- Questions about non-existent data = explain + offer alternative

OUTPUT (JSON only, no markdown):
{
  "primaryIntent": "sync_conversation_to_tasks",
  "confidence": 0.95,
  "reasoning": "User said 'update tasks' but no tasks exist. Recent conversation mentions booking photographer and finding caterer. User likely wants to create tasks from these commitments.",
  "entities": [
    { "type": "commitment", "value": "book photographer" },
    { "type": "commitment", "value": "find caterer" }
  ],
  "preconditionsMet": true,
  "suggestedResponse": "Create tasks for mentioned commitments"
}
`;

  const response = await this.callClaude(intentPrompt);
  return this.parseIntent(response);
}
```

#### Intent-Based Planning

```typescript
async createExecutionPlan(request: AgentRequest): Promise<ExecutionPlan> {
  const intent = request.intent;
  
  // Different planning based on detected intent
  switch (intent.primaryIntent) {
    case 'sync_conversation_to_tasks':
      return this.planConversationSync(request, intent);
    
    case 'update_task':
      return this.planTaskUpdate(request, intent);
    
    case 'query_tasks':
      return this.planTaskQuery(request, intent);
    
    default:
      return this.planGenericAction(request, intent);
  }
}

private async planConversationSync(
  request: AgentRequest, 
  intent: Intent
): Promise<ExecutionPlan> {
  // Extract commitments from conversation
  const commitments = intent.entities.filter(e => e.type === 'commitment');
  
  if (commitments.length === 0) {
    return {
      feasible: false,
      missingInfo: ['No commitments found in recent conversation'],
      clarificationNeeded: 'I don\'t see any action items in recent messages. What would you like me to create tasks for?'
    };
  }
  
  return {
    feasible: true,
    goal: 'Create tasks from conversation commitments',
    steps: commitments.map((c, idx) => ({
      stepNumber: idx + 1,
      description: `Create task: ${c.value}`,
      tool: 'convex_crud',
      params: {
        operation: 'create',
        table: 'tasks',
        data: {
          title: this.formatTaskTitle(c.value),
          description: `From conversation: "${c.value}"`,
          // ... other enrichments
        }
      },
      dependsOn: [],
      rationale: `User mentioned: "${c.value}"`
    }))
  };
}
```

### 2.3 Conversation Context Extraction

```typescript
// Extract commitments from conversation history
interface RoomContext {
  roomType: string;
  taskCount: number;
  hasBudget: boolean;
  recentMessages: Message[];
  extractedCommitments: string[];
}

async buildRoomContext(roomId: string): Promise<RoomContext> {
  const messages = this.state.messageHistory.slice(-10);  // Last 10
  
  // Use Claude to extract commitments
  const commitments = await this.extractCommitments(messages);
  
  return {
    roomType: this.state.roomType,
    taskCount: await this.getTaskCount(),
    hasBudget: await this.checkBudget(),
    recentMessages: messages,
    extractedCommitments: commitments
  };
}

async extractCommitments(messages: Message[]): Promise<string[]> {
  const conversationText = messages
    .filter(m => m.authorType === 'user')
    .map(m => m.content)
    .join('\n');
  
  const extractionPrompt = `
Extract action items and commitments from this conversation:

${conversationText}

Look for patterns like:
- "We should..." / "We need to..."
- "Let's..." / "I'll..."
- Mentions of booking, hiring, finding, ordering
- Deadline mentions
- Cost mentions

Return JSON array of commitments:
["commitment 1", "commitment 2", ...]
`;

  const response = await this.callClaude(extractionPrompt);
  return JSON.parse(response);
}
```

### 2.4 Best Practices

**Cache Intent Detection:**
```typescript
// Don't re-detect for every iteration
class RoomOrchestratorDO {
  private intentCache: Map<string, Intent> = new Map();
  
  async detectIntent(message: Message): Promise<Intent> {
    const cacheKey = `${message._id}_${this.state.checkpointId}`;
    
    if (this.intentCache.has(cacheKey)) {
      return this.intentCache.get(cacheKey)!;
    }
    
    const intent = await this.agent.detectIntent(message, this.buildContext());
    this.intentCache.set(cacheKey, intent);
    
    return intent;
  }
}
```

**Progressive Disclosure:**
```typescript
// If low confidence, ask for clarification
if (intent.confidence < 0.7) {
  return {
    success: true,
    content: {
      type: 'text',
      text: intent.suggestedClarification || 
            'I\'m not sure what you\'d like me to do. Could you clarify?'
    }
  };
}
```

**Validate Preconditions:**
```typescript
// Check if action is possible before attempting
async validatePreconditions(intent: Intent): Promise<ValidationResult> {
  const validators = {
    'update_task': () => this.state.taskCount > 0,
    'query_budget': () => this.state.hasBudget,
    'add_expense': () => this.state.hasBudget
  };
  
  const validator = validators[intent.primaryIntent];
  if (!validator) return { valid: true };
  
  const isValid = await validator();
  
  if (!isValid) {
    return {
      valid: false,
      message: this.getHelpfulErrorMessage(intent),
      suggestedAction: this.getSuggestedAlternative(intent)
    };
  }
  
  return { valid: true };
}
```

---

## Part 3: Simplified DO Architecture

### 3.1 Decision: One DO Type for All Rooms

**Architecture:**
```
Event → Multiple Rooms → Each uses RoomOrchestratorDO
├── Main Planning Room → RoomDO (type: 'main')
├── Vendor Room A → RoomDO (type: 'vendor', vendorId: X)
├── Vendor Room B → RoomDO (type: 'vendor', vendorId: Y)
└── Brainstorm Room → RoomDO (type: 'brainstorm')

Background Intelligence:
Cron Worker → Queries Convex → Creates system messages
```

**No EventCoordinatorDO initially.** Add only if specific need arises.

### 3.2 Why This Is Better

**Consistency:**
- One message handling implementation
- One checkpoint system
- One recovery mechanism
- Easier testing and debugging

**Simplicity:**
- No routing decision between DO types
- No duplicate code
- Clear mental model

**Flexibility:**
- Room type determines behavior
- Easy to add new room types
- Configuration-driven, not code-driven

### 3.3 RoomOrchestratorDO Implementation

```typescript
// agent-worker/src/durable-objects/RoomOrchestratorDO.ts

export class RoomOrchestratorDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  
  // Room state (persisted in DO storage)
  private roomState: RoomState = {
    roomId: '',
    eventId: '',
    roomType: 'main',
    
    // Hot memory (last 200 messages)
    messageHistory: [],
    messageSummary: '',
    
    // Active elements
    activePolls: [],
    pendingProposals: new Map(),
    
    // Agent context
    agentMemory: {
      recentIntents: [],
      activeWorkflows: [],
      contextDigest: ''
    },
    
    // Metadata
    lastActivity: Date.now(),
    checkpointId: '',
    memoryUsage: 0
  };
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    // Load state from DO storage
    await this.loadState();
    
    const url = new URL(request.url);
    
    // Route based on action
    if (url.pathname === '/message') {
      return this.handleMessage(await request.json());
    } else if (url.pathname === '/proposal/confirm') {
      return this.handleProposalConfirmation(await request.json());
    } else if (url.pathname === '/poll/vote') {
      return this.handlePollVote(await request.json());
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  // Core message handling
  async handleMessage(data: MessageRequest): Promise<Response> {
    const message = data.message;
    
    // 1. Add to message history
    this.addToHistory(message);
    
    // 2. Detect intent (context-aware)
    const intent = await this.detectIntent(message);
    
    // 3. Validate preconditions
    const validation = await this.validatePreconditions(intent);
    if (!validation.valid) {
      return this.respondWithHelp(validation);
    }
    
    // 4. Build agent context (room-type aware)
    const agentContext = await this.buildAgentContext(message, intent);
    
    // 5. Invoke unified agent
    const agent = new UnifiedDelphiAgent(this.env);
    const agentResponse = await agent.handle(agentContext);
    
    // 6. Handle response (proposals, polls, etc.)
    await this.handleAgentResponse(agentResponse, message);
    
    // 7. Save state and checkpoint if needed
    await this.saveState();
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Build room-type-aware context
  private async buildAgentContext(
    message: Message, 
    intent: Intent
  ): Promise<AgentContext> {
    const baseContext = {
      roomId: this.roomState.roomId,
      eventId: this.roomState.eventId,
      roomType: this.roomState.roomType,
      userMessage: message.content,
      intent: intent.primaryIntent,
      conversationHistory: this.roomState.messageHistory.slice(-10)
    };
    
    // Add room-type-specific context
    if (this.roomState.roomType === 'main') {
      return {
        ...baseContext,
        canAccessEventWide: true,
        eventData: await this.getEventData(),
        allRoomSummaries: await this.getAllRoomSummaries()
      };
    }
    
    if (this.roomState.roomType === 'vendor') {
      return {
        ...baseContext,
        scopedToVendor: this.roomState.vendorId,
        vendorContext: await this.getVendorContext(),
        contractStatus: await this.getContractStatus()
      };
    }
    
    return baseContext;
  }
  
  // State management
  private async loadState(): Promise<void> {
    const stored = await this.state.storage.get('roomState');
    
    if (stored) {
      this.roomState = stored as RoomState;
    } else {
      // First time - recover from Convex checkpoint if exists
      await this.recoverFromCheckpoint();
    }
  }
  
  private async saveState(): Promise<void> {
    await this.state.storage.put('roomState', this.roomState);
    
    // Checkpoint to Convex every 50 messages
    if (this.shouldCheckpoint()) {
      await this.checkpoint();
    }
  }
  
  private shouldCheckpoint(): boolean {
    return this.roomState.messageHistory.length % 50 === 0;
  }
  
  private async checkpoint(): Promise<void> {
    const snapshot = this.compressState();
    
    await fetch(`${this.env.CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'checkpoints:create',
        args: {
          roomId: this.roomState.roomId,
          snapshot,
          timestamp: Date.now()
        }
      })
    });
    
    this.roomState.checkpointId = `checkpoint_${Date.now()}`;
  }
  
  private async recoverFromCheckpoint(): Promise<void> {
    // Query Convex for latest checkpoint
    const response = await fetch(`${this.env.CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'checkpoints:latest',
        args: { roomId: this.roomState.roomId }
      })
    });
    
    if (response.ok) {
      const checkpoint = await response.json();
      this.roomState = this.decompressState(checkpoint.snapshot);
    }
  }
  
  // Memory management
  private addToHistory(message: Message): void {
    this.roomState.messageHistory.push(message);
    
    // Keep only last 200 messages
    if (this.roomState.messageHistory.length > 200) {
      // Compress older messages into summary
      const oldMessages = this.roomState.messageHistory.slice(0, -200);
      this.roomState.messageSummary = this.compressMessages(oldMessages);
      
      // Keep only recent 200
      this.roomState.messageHistory = this.roomState.messageHistory.slice(-200);
    }
    
    // Update memory usage estimate
    this.roomState.memoryUsage = this.estimateMemoryUsage();
  }
  
  private estimateMemoryUsage(): number {
    // Rough estimate in bytes
    const messagesSize = JSON.stringify(this.roomState.messageHistory).length;
    const summarySize = this.roomState.messageSummary.length;
    const proposalsSize = this.roomState.pendingProposals.size * 1000; // avg
    
    return messagesSize + summarySize + proposalsSize;
  }
  
  // Room-type-specific queries
  private async getEventData() {
    // Main room can access event-wide data
    if (this.roomState.roomType !== 'main') return null;
    
    const response = await fetch(`${this.env.CONVEX_URL}/api/query`, {
      method: 'POST',
      body: JSON.stringify({
        path: 'events:get',
        args: { eventId: this.roomState.eventId }
      })
    });
    
    return response.json();
  }
  
  private async getAllRoomSummaries() {
    // Main room can see all rooms
    if (this.roomState.roomType !== 'main') return [];
    
    const response = await fetch(`${this.env.CONVEX_URL}/api/query`, {
      method: 'POST',
      body: JSON.stringify({
        path: 'rooms:listByEvent',
        args: { eventId: this.roomState.eventId }
      })
    });
    
    return response.json();
  }
  
  private async getVendorContext() {
    // Vendor room specific data
    if (this.roomState.roomType !== 'vendor') return null;
    
    const response = await fetch(`${this.env.CONVEX_URL}/api/query`, {
      method: 'POST',
      body: JSON.stringify({
        path: 'vendors:get',
        args: { vendorId: this.roomState.vendorId }
      })
    });
    
    return response.json();
  }
}
```

### 3.4 Worker Routing

```typescript
// agent-worker/src/index.ts

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    // Message handling
    if (url.pathname === '/api/agent/message') {
      const data = await request.json();
      const { roomId } = data;
      
      // Get RoomOrchestratorDO for this room
      const doId = env.ROOM_ORCHESTRATOR.idFromName(roomId);
      const orchestrator = env.ROOM_ORCHESTRATOR.get(doId);
      
      // Forward request
      return orchestrator.fetch(new Request(`${orchestrator.url}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }));
    }
    
    // Proposal confirmation
    if (url.pathname === '/api/proposal/confirm') {
      const data = await request.json();
      const { roomId } = data;
      
      const doId = env.ROOM_ORCHESTRATOR.idFromName(roomId);
      const orchestrator = env.ROOM_ORCHESTRATOR.get(doId);
      
      return orchestrator.fetch(new Request(`${orchestrator.url}/proposal/confirm`, {
        method: 'POST',
        body: JSON.stringify(data)
      }));
    }
    
    return new Response('Not found', { status: 404 });
  }
};
```

### 3.5 Background Triggers (No EventDO Needed)

```typescript
// agent-worker/src/scheduled.ts

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Get all active events
    const activeEvents = await env.CONVEX.query('events:listActive');
    
    for (const event of activeEvents) {
      // Get event data
      const [tasks, budget, rooms] = await Promise.all([
        env.CONVEX.query('tasks:listByEvent', { eventId: event._id }),
        env.CONVEX.query('budgets:getByEvent', { eventId: event._id }),
        env.CONVEX.query('rooms:listByEvent', { eventId: event._id })
      ]);
      
      // Evaluate triggers directly in worker
      const triggers = evaluateTriggers(event, tasks, budget);
      
      // Post system messages to appropriate rooms
      for (const trigger of triggers) {
        const targetRoom = rooms.find(r => r.type === 'main');
        
        await env.CONVEX.mutation('messages:create', {
          roomId: targetRoom._id,
          authorType: 'system',
          content: trigger.message,
          metadata: {
            triggerType: trigger.type,
            triggerId: trigger.id
          }
        });
      }
    }
  }
};

function evaluateTriggers(
  event: Event, 
  tasks: Task[], 
  budget: Budget
): Trigger[] {
  const triggers: Trigger[] = [];
  const now = Date.now();
  const sixMonthsOut = event.date - (6 * 30 * 24 * 60 * 60 * 1000);
  
  // Photography deadline trigger
  if (now > sixMonthsOut && !tasks.some(t => t.category === 'photography')) {
    triggers.push({
      type: 'deadline_approaching',
      id: 'photography_6mo',
      message: '🚨 Photography booking recommended by now (6 months out). Should we create a task?',
      priority: 'high'
    });
  }
  
  // Budget threshold trigger
  if (budget && (budget.spent / budget.total) > 0.8) {
    triggers.push({
      type: 'budget_threshold',
      id: 'budget_80pct',
      message: `⚠️ Budget alert: You've spent ${Math.round((budget.spent/budget.total) * 100)}% of your total budget ($${budget.spent}/$${budget.total})`,
      priority: 'high'
    });
  }
  
  return triggers;
}
```

### 3.6 When to Add EventCoordinatorDO

**Only add EventDO if you need:**

1. **Expensive event-level state** that's cheaper to maintain in DO memory than compute from Convex
2. **Complex cross-room coordination** with stateful logic
3. **Performance optimization** where trigger evaluation in worker becomes too slow

**Example scenario where EventDO helps:**
```
You have 1000 active events
Each event has 20 rooms
Trigger evaluation requires complex analysis

Problem: Worker timeout after 30 seconds
Solution: Each event has EventDO that maintains:
- Pre-computed trigger state
- Incremental updates (not full recomputation)
- Smart caching

Then: Cron → EventDO.checkTriggers() → Fast execution
```

**Start without EventDO. Add only when needed.**

---

## Part 4: Migration Guide

### 4.1 Phase 1: Add Proposals (Week 1)

**Step 1: Update Agent**
```typescript
// In UnifiedDelphiAgent
async handle(request: AgentRequest) {
  const plan = await this.plan(request);
  
  // NEW: Check for multi-create
  if (this.shouldPropose(plan)) {
    return this.buildProposal(plan);
  }
  
  return this.execute(plan);
}
```

**Step 2: Add Frontend Component**
```typescript
// Create TaskProposalCard.tsx
export function TaskProposalCard({ data }: Props) {
  // Accept/Edit/Reject buttons
  // Inline editing capability
}
```

**Step 3: Add Convex Mutations**
```typescript
// convex/proposals.ts
export const confirm = mutation({
  // Forward to worker
});
```

**Step 4: Update DO**
```typescript
// Add proposal handling to RoomOrchestratorDO
private pendingProposals: Map<string, Proposal>;

async confirmProposal(id: string, action: Action) {
  // Execute batch operation
}
```

**Testing:**
- User: "Create tasks for photographer, caterer, and DJ"
- Should see proposal card with 3 tasks
- Can accept, edit, or reject
- Batch creation on accept

### 4.2 Phase 2: Context-Aware Intent (Week 2)

**Step 1: Update Intent Detection**
```typescript
// In RoomOrchestratorDO
async detectIntent(message: Message): Promise<Intent> {
  // Build room context
  const context = await this.buildRoomContext();
  
  // Call Claude with context
  return this.agent.detectIntent(message, context);
}
```

**Step 2: Extract Commitments**
```typescript
async buildRoomContext(): Promise<RoomContext> {
  return {
    taskCount: await this.getTaskCount(),
    recentMessages: this.roomState.messageHistory.slice(-10),
    extractedCommitments: await this.extractCommitments()
  };
}
```

**Step 3: Update Planning**
```typescript
// In UnifiedDelphiAgent
async createExecutionPlan(request: AgentRequest) {
  // Different planning based on intent
  if (request.intent.primaryIntent === 'sync_conversation_to_tasks') {
    return this.planConversationSync(request);
  }
  // ... other intents
}
```

**Testing:**
- User: "Update our tasks" (no tasks exist)
- Should create tasks from conversation
- Not error about no tasks to update

### 4.3 Phase 3: Simplified DOs (Week 3)

**Step 1: Create RoomOrchestratorDO**
```typescript
// Consolidate from ChatOrchestratorDO
export class RoomOrchestratorDO {
  // Message handling
  // State persistence
  // Checkpoint system
}
```

**Step 2: Remove EventCoordinatorDO**
```typescript
// Delete EventCoordinatorDO class
// Move trigger logic to scheduled worker
```

**Step 3: Update Worker Routing**
```typescript
// Simplify routing - always use RoomDO
const doId = env.ROOM_ORCHESTRATOR.idFromName(roomId);
const orchestrator = env.ROOM_ORCHESTRATOR.get(doId);
```

**Step 4: Update Background Worker**
```typescript
// Move trigger evaluation to scheduled worker
export default {
  async scheduled(event, env) {
    // Direct trigger evaluation
    // No DO coordination needed
  }
};
```

**Testing:**
- All room types work with RoomDO
- Main room has event-wide access
- Vendor rooms are scoped
- Background triggers still fire

### 4.4 Rollback Strategy

**Feature Flags:**
```typescript
// In worker
if (env.USE_PROPOSALS === 'true') {
  // New proposal system
} else {
  // Old iteration-based
}

if (env.USE_CONTEXT_INTENT === 'true') {
  // Context-aware intent
} else {
  // Simple keyword matching
}
```

**Gradual Rollout:**
```typescript
// Route percentage to new system
const rolloutPct = parseFloat(env.ROLLOUT_PERCENTAGE || '0');

if (Math.random() < rolloutPct) {
  return newSystem.handle(request);
} else {
  return oldSystem.handle(request);
}
```

---

## Part 5: Best Practices

### 5.1 Code Quality

**Type Safety:**
```typescript
// Strict types for all interfaces
interface AgentContext {
  roomId: Id<"rooms">;
  eventId: Id<"events">;
  roomType: RoomType;
  // ... never use 'any'
}

// Use discriminated unions
type RoomType = 'main' | 'vendor' | 'brainstorm' | 'private';

// Validate at runtime
function assertRoomType(type: string): asserts type is RoomType {
  if (!['main', 'vendor', 'brainstorm', 'private'].includes(type)) {
    throw new Error(`Invalid room type: ${type}`);
  }
}
```

**Error Handling:**
```typescript
// Always wrap DO operations
async handleMessage(data: MessageRequest): Promise<Response> {
  try {
    // ... operation
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('[RoomDO] Error handling message:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        shouldRetry: this.isRetryableError(error)
      }),
      { status: 500 }
    );
  }
}

private isRetryableError(error: Error): boolean {
  // Network errors, timeouts → retry
  // Validation errors → don't retry
  return error.message.includes('timeout') ||
         error.message.includes('network');
}
```

**Logging:**
```typescript
// Structured logging
private log(level: string, message: string, data?: any) {
  console.log(JSON.stringify({
    level,
    component: 'RoomOrchestratorDO',
    roomId: this.roomState.roomId,
    message,
    data,
    timestamp: Date.now()
  }));
}

// Usage
this.log('info', 'Handling message', { intent: intent.primaryIntent });
this.log('error', 'Failed to create task', { error: error.message });
```

### 5.2 Performance

**Lazy Loading:**
```typescript
// Don't fetch data until needed
async buildAgentContext(message: Message): Promise<AgentContext> {
  const baseContext = {
    roomId: this.roomState.roomId,
    // ... basic fields
  };
  
  // Only fetch event-wide data if main room
  if (this.roomState.roomType === 'main') {
    baseContext.eventData = await this.getEventData();
  }
  
  return baseContext;
}
```

**Batching:**
```typescript
// Batch database operations
async executeProposal(proposal: Proposal) {
  // All creates in parallel
  const created = await Promise.all(
    proposal.items.map(item => this.createTask(item))
  );
  
  return created;
}
```

**Caching:**
```typescript
// Cache intent detection within request
private intentCache = new Map<string, Intent>();

async detectIntent(message: Message): Promise<Intent> {
  const key = message._id;
  if (this.intentCache.has(key)) {
    return this.intentCache.get(key)!;
  }
  
  const intent = await this.agent.detectIntent(message);
  this.intentCache.set(key, intent);
  return intent;
}
```

### 5.3 Testing

**Unit Tests:**
```typescript
// Test intent detection
describe('Intent Detection', () => {
  it('detects sync_conversation_to_tasks when no tasks exist', async () => {
    const context = {
      taskCount: 0,
      recentMessages: [
        { content: 'We should book a photographer' }
      ]
    };
    
    const intent = await detectIntent('update our tasks', context);
    
    expect(intent.primaryIntent).toBe('sync_conversation_to_tasks');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });
});
```

**Integration Tests:**
```typescript
// Test proposal flow end-to-end
describe('Proposal System', () => {
  it('creates batch tasks after confirmation', async () => {
    // Send message
    const response = await do.handleMessage({
      message: { content: 'Book photographer and find caterer' }
    });
    
    // Should return proposal
    expect(response.content.type).toBe('components');
    expect(response.metadata.proposalId).toBeDefined();
    
    // Confirm proposal
    const confirmed = await do.confirmProposal(
      response.metadata.proposalId,
      'accept_all'
    );
    
    // Should create 2 tasks
    expect(confirmed.createdItems).toHaveLength(2);
  });
});
```

---

## Part 6: Success Metrics

### 6.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Proposal Usage** | >60% of multi-creates | Track proposal generation rate |
| **Intent Accuracy** | >90% correct interpretation | Manual review of sample |
| **DO Memory Usage** | <20MB average | Monitor via logs |
| **Response Time (P95)** | <2s | Latency tracking |
| **Checkpoint Recovery** | <100ms | Measure on DO restart |

### 6.2 User Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Proposal Acceptance** | >80% accept rate | Track accept vs reject |
| **Edit Before Accept** | 20-30% edit | Track edit usage |
| **Intent Satisfaction** | <5% clarification requests | Track clarification rate |
| **Multi-Task Efficiency** | 70% reduction in time | Compare to iteration-based |

### 6.3 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **AI Cost per Event** | <$0.15 | Track token usage |
| **Success Rate** | >95% | Track failures vs attempts |
| **User Engagement** | >60% component interaction | Click-through rates |
| **Support Tickets** | <5% of users | Track support load |

---

## Appendix: Quick Reference

### A. Proposal Flow
```
User Message → Intent Detection → Planning
→ Multi-create detected → Build Proposal
→ Frontend renders TaskProposalCard
→ User confirms → Batch execution
→ Confirmation message
```

### B. Intent Detection Flow
```
Message + Room Context → Claude Analysis
→ Intent + Confidence + Entities
→ Precondition Validation
→ Planning (intent-specific)
→ Execution
```

### C. DO Architecture
```
All Rooms → RoomOrchestratorDO
Main Room: event-wide access
Vendor Room: vendor-scoped
Brainstorm Room: standard
Private Room: standard

Background: Cron Worker (no DO)
```

### D. Key Files

```
agent-worker/src/
├── agents/
│   └── UnifiedDelphiAgent.ts        (proposals, planning, intent)
├── durable-objects/
│   └── RoomOrchestratorDO.ts        (all rooms)
├── scheduled.ts                      (background triggers)
└── index.ts                          (worker routing)

frontend/src/components/
└── TaskProposalCard.tsx              (proposal UI)

convex/
├── proposals.ts                      (mutations)
├── checkpoints.ts                    (state persistence)
└── schema.ts                         (updated)
```

---

**End of Document**

This refined architecture provides:
- ✅ Efficient batch operations via proposals
- ✅ Context-aware, pragmatic intent detection
- ✅ Simplified, consistent DO architecture
- ✅ Clear migration path with rollback strategy
- ✅ Best practices for quality and performance

Ready for implementation.
