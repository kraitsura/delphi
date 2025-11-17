# Implementation Guide: Unified Delphi Agent Architecture

**Date:** November 16, 2025  
**Purpose:** Concrete implementation patterns for refactoring to unified agent

---

## Quick Reference: Implementation Checklist

- [ ] **Phase 1**: Add precondition checks (30 min)
- [ ] **Phase 2**: Fix intent detection (2 hours)
- [ ] **Phase 3**: Add state management (4 hours)
- [ ] **Phase 4**: Create UnifiedDelphiAgent (1 day)
- [ ] **Phase 5**: Migrate & test (2 days)

---

## Implementation 1: Immediate Fix for "Update Tasks" Bug

### File: `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

**Add before calling agent:**

```typescript
private validateRequest(intent: string, context: AgentContext): ValidationResult {
  const validations: Record<string, () => ValidationResult> = {
    query_tasks: () => {
      if (context.taskCount === 0) {
        return {
          valid: false,
          message: "I don't see any tasks for this event yet. Would you like me to help create some?",
          suggestedActions: [
            "Create tasks for vendors",
            "Create a timeline",
            "Add a specific task"
          ]
        };
      }
      return { valid: true };
    },
    
    update_tasks: () => {
      if (context.taskCount === 0) {
        return {
          valid: false,
          message: "There are no tasks to update yet. Let's create some first!",
          suggestedActions: [
            "Create initial tasks",
            "Tell me about your event so I can suggest tasks"
          ]
        };
      }
      return { valid: true };
    },
    
    query_budget: () => {
      if (!context.hasBudget) {
        return {
          valid: false,
          message: "No budget has been set yet. What's your total budget for this event?",
          suggestedActions: [
            "Set a budget",
            "Get budget recommendations"
          ]
        };
      }
      return { valid: true };
    }
  };
  
  const validator = validations[intent];
  if (validator) {
    return validator();
  }
  
  return { valid: true };
}

// Update invoke method:
async invoke(request: Request): Promise<Response> {
  // ... existing auth code ...
  
  const intent = this.detectIntent(message);
  
  // ADD THIS:
  const validation = this.validateRequest(intent, agentContext);
  if (!validation.valid) {
    return new Response(JSON.stringify({
      success: false,
      message: validation.message,
      suggestions: validation.suggestedActions
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  
  // Continue with agent call...
  const agent = this.getAgentForIntent(intent);
  return agent.handle(agentContext);
}
```

### Type Definitions:

```typescript
interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestedActions?: string[];
}
```

---

## Implementation 2: AI-Based Intent Detection

### File: `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

**Replace keyword matching with AI analysis:**

```typescript
private async detectIntentWithAI(
  message: string, 
  context: AgentContext
): Promise<IntentResult> {
  const intentPrompt = `
You are analyzing a user's request in an event planning system.

USER MESSAGE: "${message}"

CURRENT EVENT STATE:
- Event ID: ${context.eventId}
- Event Name: ${context.eventName || 'Unknown'}
- Event Date: ${context.eventDate || 'Not set'}
- Task Count: ${context.taskCount}
- Has Budget: ${context.hasBudget}
- Has Vendors: ${context.vendorCount > 0}

INTENT CATEGORIES:
1. create_task - User wants to add new task(s)
2. query_tasks - User wants to see existing tasks
3. update_task - User wants to modify existing task
4. delete_task - User wants to remove a task
5. create_budget - User wants to set/create budget
6. query_budget - User wants to see budget info
7. update_budget - User wants to modify budget
8. search_vendors - User wants to find vendors online
9. query_vendors - User wants to see saved vendors
10. general_planning - User wants high-level event planning help
11. clarification_needed - Not enough info to determine intent

ANALYSIS STEPS:
1. What is the user actually asking for?
2. Do they want to CREATE, READ, UPDATE, or DELETE?
3. What domain: tasks, budget, vendors, or general planning?
4. Are preconditions met for this action?

Respond with ONLY valid JSON (no markdown):
{
  "intent": "create_task",
  "confidence": 0.95,
  "reasoning": "User explicitly said 'create a task' and provided task details",
  "domain": "tasks",
  "action": "create",
  "preconditions_met": true,
  "missing_information": [],
  "suggested_clarification": null
}

If confidence < 0.7, set intent to "clarification_needed" and explain what you need.
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': this.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4.5-20250924',
      max_tokens: 500,
      messages: [{ role: 'user', content: intentPrompt }]
    })
  });

  const data = await response.json();
  const content = data.content[0].text;
  
  // Extract JSON (handle markdown code blocks if present)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse intent response');
  }
  
  const intentResult: IntentResult = JSON.parse(jsonMatch[0]);
  
  console.log('[DO] Intent detected:', intentResult);
  
  return intentResult;
}
```

### Type Definitions:

```typescript
interface IntentResult {
  intent: string;
  confidence: number;
  reasoning: string;
  domain: 'tasks' | 'budget' | 'vendors' | 'planning';
  action: 'create' | 'read' | 'update' | 'delete' | 'plan';
  preconditions_met: boolean;
  missing_information: string[];
  suggested_clarification?: string;
}
```

---

## Implementation 3: State-Aware Execution

### File: `agent-worker/src/agents/BaseAgent.ts`

**Add state tracking to ReAct loop:**

```typescript
interface ExecutionState {
  iteration: number;
  tasksCreated: Array<{ id: string; title: string }>;
  tasksQueried: Array<{ id: string; title: string }>;
  budgetData?: any;
  vendorsFound?: any[];
  errors: Array<{ iteration: number; error: string; recovered: boolean }>;
  progressSummary: string;
}

class BaseAgent {
  protected executionState: ExecutionState = {
    iteration: 0,
    tasksCreated: [],
    tasksQueried: [],
    errors: [],
    progressSummary: ''
  };
  
  protected buildStateAwarePrompt(
    userMessage: string, 
    context: AgentContext,
    iteration: number
  ): string {
    const basePrompt = this.getSystemPrompt(context);
    
    if (iteration === 0) {
      // First iteration - no state yet
      return `${basePrompt}

USER REQUEST: "${userMessage}"

This is your first attempt. Plan carefully and execute.`;
    }
    
    // Subsequent iterations - include state
    return `${basePrompt}

USER REQUEST: "${userMessage}"

EXECUTION PROGRESS (Iteration ${iteration}):

${this.formatExecutionState()}

Based on the progress above, what should you do next?
- If goal is achieved, use COMPLETE
- If you need to do more work, use ACTION
- If you're stuck, use ABORT

Proceed:`;
  }
  
  private formatExecutionState(): string {
    const parts = [];
    
    if (this.executionState.tasksCreated.length > 0) {
      parts.push(`Tasks Created (${this.executionState.tasksCreated.length}):`);
      parts.push(this.executionState.tasksCreated
        .map(t => `  ✓ ${t.title} (ID: ${t.id})`)
        .join('\n'));
    }
    
    if (this.executionState.tasksQueried.length > 0) {
      parts.push(`Tasks Queried:`);
      parts.push(this.executionState.tasksQueried
        .map(t => `  • ${t.title}`)
        .join('\n'));
    }
    
    if (this.executionState.errors.length > 0) {
      parts.push(`Previous Errors:`);
      parts.push(this.executionState.errors
        .filter(e => !e.recovered)
        .map(e => `  ⚠ Iteration ${e.iteration}: ${e.error}`)
        .join('\n'));
    }
    
    if (this.executionState.progressSummary) {
      parts.push(`Summary: ${this.executionState.progressSummary}`);
    }
    
    return parts.join('\n\n');
  }
  
  protected updateState(toolResult: ToolResult, action: ParsedAction): void {
    if (!toolResult.success) {
      this.executionState.errors.push({
        iteration: this.executionState.iteration,
        error: toolResult.error || 'Unknown error',
        recovered: false
      });
      return;
    }
    
    // Mark previous errors as recovered
    this.executionState.errors.forEach(e => e.recovered = true);
    
    // Track what was done
    if (action.tool === 'convex_crud') {
      const params = action.params as ConvexCRUDParams;
      
      if (params.operation === 'create' && params.table === 'tasks') {
        this.executionState.tasksCreated.push({
          id: toolResult.data._id,
          title: toolResult.data.title
        });
      } else if (params.operation === 'query' && params.table === 'tasks') {
        this.executionState.tasksQueried = toolResult.data;
      } else if (params.table === 'budgets') {
        this.executionState.budgetData = toolResult.data;
      }
    } else if (action.tool === 'firecrawl') {
      this.executionState.vendorsFound = toolResult.data;
    }
    
    // Update summary
    this.executionState.progressSummary = this.generateProgressSummary();
  }
  
  private generateProgressSummary(): string {
    const parts = [];
    
    if (this.executionState.tasksCreated.length > 0) {
      parts.push(`Created ${this.executionState.tasksCreated.length} task(s)`);
    }
    
    if (this.executionState.tasksQueried.length > 0) {
      parts.push(`Found ${this.executionState.tasksQueried.length} existing task(s)`);
    }
    
    if (this.executionState.budgetData) {
      parts.push('Retrieved budget data');
    }
    
    if (this.executionState.vendorsFound) {
      parts.push(`Found ${this.executionState.vendorsFound.length} vendor(s)`);
    }
    
    return parts.join(', ') || 'No actions completed yet';
  }
}
```

---

## Implementation 4: Dynamic Iteration Budget

### File: `agent-worker/src/agents/BaseAgent.ts`

**Add adaptive iteration limits:**

```typescript
interface IterationConfig {
  maxIterations: number;
  reasoningBudget: number;
  actionBudget: number;
  description: string;
}

class BaseAgent {
  protected getIterationConfig(intent: string, context: AgentContext): IterationConfig {
    // Define configs for different scenarios
    const configs: Record<string, IterationConfig> = {
      // Simple queries - low budget
      query_tasks: {
        maxIterations: 3,
        reasoningBudget: 1,
        actionBudget: 2,
        description: 'Simple query operation'
      },
      
      query_budget: {
        maxIterations: 3,
        reasoningBudget: 1,
        actionBudget: 2,
        description: 'Simple query operation'
      },
      
      // Single creates - moderate budget
      create_task: {
        maxIterations: 5,
        reasoningBudget: 2,
        actionBudget: 3,
        description: 'Single task creation'
      },
      
      // Updates - moderate budget (may need retry)
      update_task: {
        maxIterations: 7,
        reasoningBudget: 2,
        actionBudget: 5,
        description: 'Task update with potential retries'
      },
      
      // Bulk operations - HIGH budget
      create_multiple_tasks: {
        maxIterations: 20,
        reasoningBudget: 3,
        actionBudget: 15,
        description: 'Multiple task creation'
      },
      
      // Planning - HIGH budget
      general_planning: {
        maxIterations: 25,
        reasoningBudget: 5,
        actionBudget: 18,
        description: 'Complex planning with multiple operations'
      },
      
      // Vendor search - moderate budget
      search_vendors: {
        maxIterations: 8,
        reasoningBudget: 2,
        actionBudget: 5,
        description: 'Web search and data processing'
      }
    };
    
    // Default fallback
    const config = configs[intent] || {
      maxIterations: 10,
      reasoningBudget: 3,
      actionBudget: 7,
      description: 'Standard operation'
    };
    
    console.log(`[Agent] Using iteration config: ${config.description}`, config);
    
    return config;
  }
  
  async handle(context: AgentContext): Promise<AgentResponse> {
    const intent = context.detectedIntent || 'unknown';
    const config = this.getIterationConfig(intent, context);
    
    // Track budgets
    let reasoningCount = 0;
    let actionCount = 0;
    
    for (let i = 0; i < config.maxIterations; i++) {
      this.executionState.iteration = i;
      
      const prompt = this.buildStateAwarePrompt(
        context.userMessage, 
        context, 
        i
      );
      
      const response = await this.callClaude(prompt);
      const parsed = this.parseAIResponse(response);
      
      if (parsed.decision === 'REASONING') {
        reasoningCount++;
        if (reasoningCount > config.reasoningBudget) {
          console.warn('[Agent] Exceeded reasoning budget, forcing action');
          // Continue but warn
        }
      }
      
      if (parsed.decision === 'ACTION') {
        actionCount++;
        if (actionCount > config.actionBudget) {
          console.error('[Agent] Exceeded action budget, aborting');
          return this.buildAbortResponse('Too many actions attempted');
        }
        
        const result = await this.executeTool(parsed.action);
        this.updateState(result, parsed.action);
        
        if (result.success) {
          // Check if goal is achieved
          if (this.isGoalAchieved(context, this.executionState)) {
            return this.buildSuccessResponse();
          }
        }
      }
      
      if (parsed.decision === 'COMPLETE') {
        return this.buildSuccessResponse();
      }
      
      if (parsed.decision === 'ABORT') {
        return this.buildAbortResponse(parsed.reasoning);
      }
    }
    
    // Max iterations reached
    return this.buildPartialSuccessResponse();
  }
  
  private isGoalAchieved(context: AgentContext, state: ExecutionState): boolean {
    const intent = context.detectedIntent;
    
    // Define goal checks for different intents
    const goalChecks: Record<string, () => boolean> = {
      create_task: () => state.tasksCreated.length > 0,
      create_multiple_tasks: () => {
        // Check if we created a reasonable number
        // (User might say "create tasks" without specifying count)
        return state.tasksCreated.length >= 3;
      },
      query_tasks: () => state.tasksQueried.length > 0,
      update_task: () => state.tasksCreated.length > 0, // Update returns new version
      search_vendors: () => (state.vendorsFound?.length || 0) > 0
    };
    
    const checker = goalChecks[intent];
    return checker ? checker() : false;
  }
}
```

---

## Implementation 5: Unified Agent Architecture

### File: `agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Create new unified agent:**

```typescript
import { BaseAgent } from './BaseAgent';
import { AgentContext, AgentResponse } from './types';
import { Tool } from '../tools';
import { ConvexCRUDTool } from '../tools/ConvexCRUDTool';
import { FirecrawlTool } from '../tools/FirecrawlTool';

export class UnifiedDelphiAgent extends BaseAgent {
  constructor(env: Env) {
    const tools: Tool[] = [
      new ConvexCRUDTool(env),
      new FirecrawlTool(env)
    ];
    
    super('UnifiedDelphiAgent', tools, env);
  }
  
  getSystemPrompt(context: AgentContext): string {
    return `
You are Delphi, an intelligent event planning assistant. You have access to multiple tools and can handle any event planning request.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT EVENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event ID: ${context.eventId}
Event Name: ${context.eventName || 'Unnamed Event'}
Event Date: ${context.eventDate || 'Not set'}
Event Type: ${context.eventType || 'Unknown'}

Current State:
${this.buildEventState(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOOL: convex_crud
Purpose: Create, read, update, or delete event data
Tables: tasks, budgets, vendors, events
Operations: create, query, update, delete

Examples:

1. CREATE A TASK:
REASONING: User wants to track photographer booking. I'll create a high-priority task.
ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "tasks",
  "data": {
    "eventId": "${context.eventId}",
    "title": "Book Wedding Photographer",
    "description": "Research and book professional photographer",
    "category": "photography",
    "priority": "high",
    "status": "todo",
    "dueDate": "2025-12-01T00:00:00.000Z"
  }
}

2. QUERY TASKS:
REASONING: User wants to see all tasks. I'll query the tasks table.
ACTION: convex_crud
PARAMS: {
  "operation": "query",
  "table": "tasks",
  "filters": {
    "eventId": "${context.eventId}"
  }
}

3. UPDATE A TASK:
REASONING: User wants to mark task as complete. I'll update its status.
ACTION: convex_crud
PARAMS: {
  "operation": "update",
  "table": "tasks",
  "recordId": "task_id_here",
  "data": {
    "status": "done",
    "completedAt": "2025-11-16T12:00:00.000Z"
  }
}

TOOL: firecrawl
Purpose: Search the web for vendor information
Use for: Finding photographers, venues, caterers, DJs, etc.

Example:

REASONING: User needs photographer recommendations. I'll search for local wedding photographers.
ACTION: firecrawl
PARAMS: {
  "query": "wedding photographers near Seattle Washington",
  "limit": 5
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY user request, follow this process:

1. UNDERSTAND THE REQUEST
   - What does the user want?
   - What domain? (tasks, budget, vendors, general)
   - What action? (create, read, update, delete, search, plan)

2. CHECK PREREQUISITES
   - Do I have the information I need?
   - Does the required data exist? (e.g., can't update tasks if none exist)
   - Is the request feasible?

3. PLAN YOUR APPROACH
   - What tool(s) do I need?
   - In what order should I use them?
   - What could go wrong?

4. EXECUTE
   - Use tools to accomplish the goal
   - Track what you've done
   - Validate results

5. RESPOND
   - Confirm what was accomplished
   - Show relevant data
   - Offer next steps if appropriate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.buildContextualRules(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You must respond in one of these formats:

Format 1: TAKE ACTION
REASONING: [Your thought process]
ACTION: [tool_name]
PARAMS: {json_parameters}

Format 2: TASK COMPLETE
REASONING: [Why the goal is achieved]
COMPLETE: [Summary of what was accomplished]

Format 3: CANNOT PROCEED
REASONING: [Why you cannot complete the request]
ABORT: [Explanation and suggestion for user]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now handle the user's request. Think carefully before acting.
`;
  }
  
  private buildEventState(context: AgentContext): string {
    const lines = [];
    
    // Tasks
    if (context.taskCount === 0) {
      lines.push('  ⚠️  Tasks: None created yet');
    } else {
      lines.push(`  ✓  Tasks: ${context.taskCount} exist`);
    }
    
    // Budget
    if (!context.hasBudget) {
      lines.push('  ⚠️  Budget: Not set');
    } else {
      lines.push('  ✓  Budget: Set');
    }
    
    // Vendors
    if (context.vendorCount === 0) {
      lines.push('  ⚠️  Vendors: None saved');
    } else {
      lines.push(`  ✓  Vendors: ${context.vendorCount} saved`);
    }
    
    return lines.join('\n');
  }
  
  private buildContextualRules(context: AgentContext): string {
    const rules = [];
    
    // Add rules based on current state
    if (context.taskCount === 0) {
      rules.push(`
⚠️  NO TASKS EXIST YET
If user asks to query, update, or delete tasks:
  1. Explain that no tasks exist
  2. Offer to create tasks instead
  3. Ask what tasks they need
  4. DO NOT attempt to query empty table
`);
    }
    
    if (!context.hasBudget) {
      rules.push(`
⚠️  NO BUDGET SET
If user asks about budget:
  1. Explain no budget exists
  2. Offer to create one
  3. Ask for total budget amount
`);
    }
    
    // Always include these
    rules.push(`
✓  ALWAYS validate tool results
   - Check if operation succeeded
   - Read error messages carefully
   - Retry with corrected parameters if needed

✓  TRACK your progress
   - Remember what you've created
   - Don't create duplicates
   - Know when the goal is achieved

✓  BE HELPFUL
   - If request is unclear, ask questions
   - If request is impossible, explain why and suggest alternatives
   - If request is complete, confirm what was done
`);
    
    return rules.join('\n');
  }
  
  getIntent(): string {
    return 'unified'; // Not used with unified agent
  }
}
```

### Update Orchestrator to Use Unified Agent

**File: `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`**

```typescript
import { UnifiedDelphiAgent } from '../agents/UnifiedDelphiAgent';

export class ChatOrchestratorDO implements DurableObject {
  private agent: UnifiedDelphiAgent;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    
    // Initialize single unified agent
    this.agent = new UnifiedDelphiAgent(env);
  }
  
  async invoke(request: Request): Promise<Response> {
    // ... existing auth code ...
    
    // Build context with richer state info
    const agentContext: AgentContext = {
      userId: profile._id,
      eventId,
      userMessage: message,
      conversationHistory: history,
      eventName: eventData?.name,
      eventDate: eventData?.date,
      eventType: eventData?.type,
      taskCount: await this.getTaskCount(eventId),
      hasBudget: await this.checkBudgetExists(eventId),
      vendorCount: await this.getVendorCount(eventId),
      detectedIntent: null // Will be set by intent detection if needed
    };
    
    // Optional: Still do intent detection for budget configuration
    const intentResult = await this.detectIntentWithAI(message, agentContext);
    agentContext.detectedIntent = intentResult.intent;
    
    // Validate preconditions
    if (!intentResult.preconditions_met) {
      return new Response(JSON.stringify({
        success: false,
        message: `${intentResult.suggested_clarification}`,
        missingInfo: intentResult.missing_information
      }), { status: 200 });
    }
    
    // Call unified agent (no routing needed!)
    const response = await this.agent.handle(agentContext);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  private async getTaskCount(eventId: string): Promise<number> {
    const tasks = await this.queryConvex('tasks:list', { eventId });
    return tasks.length;
  }
  
  private async checkBudgetExists(eventId: string): Promise<boolean> {
    const budgets = await this.queryConvex('budgets:get', { eventId });
    return budgets !== null;
  }
  
  private async getVendorCount(eventId: string): Promise<number> {
    const vendors = await this.queryConvex('vendors:list', { eventId });
    return vendors.length;
  }
}
```

---

## Implementation 6: Multi-Task Creation Helper

**File: `agent-worker/src/agents/helpers/MultiTaskCreator.ts`**

```typescript
export class MultiTaskCreator {
  constructor(
    private agent: BaseAgent,
    private context: AgentContext
  ) {}
  
  async createMultipleTasks(descriptions: string[]): Promise<MultiTaskResult> {
    const results: TaskCreationResult[] = [];
    const maxBatchSize = 15; // Don't create more than 15 in one go
    
    // Check if this is too many
    if (descriptions.length > maxBatchSize) {
      return {
        success: false,
        message: `You've requested ${descriptions.length} tasks. I can create up to ${maxBatchSize} at a time. Would you like me to create the first ${maxBatchSize}?`,
        suggestedAction: 'create_batch',
        pendingDescriptions: descriptions.slice(maxBatchSize)
      };
    }
    
    // Increase iteration budget
    const originalMax = this.agent.maxIterations;
    this.agent.maxIterations = descriptions.length + 5; // Buffer for retries
    
    for (let i = 0; i < descriptions.length; i++) {
      const description = descriptions[i];
      
      console.log(`[MultiTask] Creating task ${i+1}/${descriptions.length}: ${description}`);
      
      const prompt = this.buildTaskCreationPrompt(description, results);
      
      try {
        const response = await this.agent.callClaude(prompt);
        const parsed = this.agent.parseAIResponse(response);
        
        if (parsed.decision === 'ACTION' && parsed.action) {
          const result = await this.agent.executeTool(parsed.action);
          
          if (result.success) {
            results.push({
              description,
              success: true,
              task: result.data
            });
          } else {
            results.push({
              description,
              success: false,
              error: result.error
            });
          }
        }
      } catch (error) {
        results.push({
          description,
          success: false,
          error: error.message
        });
      }
    }
    
    // Restore original max
    this.agent.maxIterations = originalMax;
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount === descriptions.length,
      message: this.buildSummaryMessage(results),
      results,
      totalRequested: descriptions.length,
      successfullyCreated: successCount
    };
  }
  
  private buildTaskCreationPrompt(
    description: string, 
    previousResults: TaskCreationResult[]
  ): string {
    return `
You are creating a task as part of a batch operation.

EVENT: ${this.context.eventName}
EVENT DATE: ${this.context.eventDate}

TASK TO CREATE: "${description}"

ALREADY CREATED (${previousResults.length} tasks):
${previousResults.map((r, i) => 
  r.success 
    ? `  ${i+1}. ✓ ${r.task.title}`
    : `  ${i+1}. ✗ Failed: ${r.description}`
).join('\n')}

Create this task with appropriate:
- Title (clear and concise)
- Description (detailed)
- Category (infer from description)
- Priority (based on event date and task nature)
- Due date (calculate based on event date)
- Status (default to "todo")

Use this format:
REASONING: [Brief explanation of your choices]
ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "tasks",
  "data": {
    "eventId": "${this.context.eventId}",
    "title": "...",
    "description": "...",
    "category": "...",
    "priority": "high/medium/low",
    "status": "todo",
    "dueDate": "ISO date string"
  }
}
`;
  }
  
  private buildSummaryMessage(results: TaskCreationResult[]): string {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let message = `✓ Created ${successful.length} tasks successfully.\n\n`;
    
    if (successful.length > 0) {
      message += 'Created:\n';
      successful.forEach((r, i) => {
        message += `  ${i+1}. ${r.task.title}\n`;
      });
    }
    
    if (failed.length > 0) {
      message += `\n⚠️ Failed to create ${failed.length} tasks:\n`;
      failed.forEach((r, i) => {
        message += `  ${i+1}. ${r.description} - ${r.error}\n`;
      });
    }
    
    return message;
  }
}

interface TaskCreationResult {
  description: string;
  success: boolean;
  task?: any;
  error?: string;
}

interface MultiTaskResult {
  success: boolean;
  message: string;
  results?: TaskCreationResult[];
  totalRequested?: number;
  successfullyCreated?: number;
  suggestedAction?: string;
  pendingDescriptions?: string[];
}
```

---

## Migration Checklist

### Week 1: Immediate Fixes

**Day 1: Precondition Validation**
- [ ] Add `validateRequest()` to ChatOrchestratorDO
- [ ] Define preconditions for each intent
- [ ] Test with empty state scenarios
- [ ] Deploy to dev

**Day 2: AI Intent Detection**  
- [ ] Implement `detectIntentWithAI()`
- [ ] Test with ambiguous requests
- [ ] Compare to keyword matching
- [ ] Deploy to dev

**Day 3: State Tracking**
- [ ] Add `ExecutionState` to BaseAgent
- [ ] Implement `updateState()` and `formatExecutionState()`
- [ ] Test with multi-step operations
- [ ] Deploy to dev

### Week 2: Architectural Refactor

**Day 1-2: Unified Agent**
- [ ] Create UnifiedDelphiAgent.ts
- [ ] Port system prompts from specialized agents
- [ ] Add comprehensive examples
- [ ] Unit test

**Day 3: Dynamic Budgets**
- [ ] Implement `getIterationConfig()`
- [ ] Test with various request types
- [ ] Tune budget values

**Day 4: Multi-Task Support**
- [ ] Create MultiTaskCreator helper
- [ ] Integrate with UnifiedDelphiAgent
- [ ] Test batch operations

**Day 5: Integration & Testing**
- [ ] Update ChatOrchestratorDO to use UnifiedAgent
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Fix issues

### Week 3: Production Rollout

**Day 1-2: Soft Launch**
- [ ] Deploy to production (10% traffic)
- [ ] Monitor error rates
- [ ] Check success metrics
- [ ] Gather user feedback

**Day 3-4: Ramp Up**
- [ ] Increase to 50% traffic
- [ ] Continue monitoring
- [ ] Fix any issues

**Day 5: Full Launch**
- [ ] 100% traffic to new system
- [ ] Deprecate old specialized agents
- [ ] Update documentation

---

## Testing Script

```bash
# Test 1: Empty state handling
curl -X POST http://localhost:8787/api/agent/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventId": "new_event", "message": "Show me my tasks"}'

# Expected: Helpful message about no tasks existing

# Test 2: Task creation
curl -X POST http://localhost:8787/api/agent/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventId": "event_123", "message": "Create a task to book photographer"}'

# Expected: Task created successfully

# Test 3: Multi-task creation
curl -X POST http://localhost:8787/api/agent/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventId": "event_123", "message": "Create tasks for vendor outreach: photographer, DJ, and caterer"}'

# Expected: 3 tasks created

# Test 4: Complex planning
curl -X POST http://localhost:8787/api/agent/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventId": "event_123", "message": "Help me plan my wedding timeline"}'

# Expected: Multiple tasks created with appropriate deadlines
```

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
interface AgentMetrics {
  requestId: string;
  timestamp: number;
  intent: string;
  iterationCount: number;
  toolCallCount: number;
  success: boolean;
  errorType?: string;
  latencyMs: number;
  tokensUsed: number;
  costUSD: number;
}

// Log after each request
console.log('[Metrics]', JSON.stringify(metrics));
```

### Success Criteria

| Metric | Before | Target |
|--------|--------|--------|
| Success Rate | ~60% | >95% |
| Avg Iterations | N/A | 1.5-2.5 |
| Empty State Errors | Common | 0% |
| User Confusion | High | Low |
| Code Complexity | High | Low |

---

## Rollback Plan

If issues occur:

1. **Quick Rollback** (5 minutes)
   ```bash
   git revert HEAD
   npm run deploy
   ```

2. **Feature Flag** (if implemented)
   ```typescript
   if (env.USE_UNIFIED_AGENT === 'true') {
     return unifiedAgent.handle(context);
   } else {
     return oldRouter.route(context);
   }
   ```

3. **Gradual Rollback**
   - Reduce traffic to new system (50% → 10% → 0%)
   - Monitor error rates
   - Fix issues
   - Re-enable gradually

---

## Conclusion

This implementation guide provides concrete, copy-paste-ready code for:

1. ✅ Immediate bug fixes (precondition checking)
2. ✅ AI-based intent detection
3. ✅ State-aware execution
4. ✅ Dynamic iteration budgets
5. ✅ Unified agent architecture
6. ✅ Multi-task creation support

Follow the migration checklist for a smooth transition from fragmented specialized agents to a robust unified agent system.
