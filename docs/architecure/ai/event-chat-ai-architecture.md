# Event Chat: AI Architecture
## Core Intelligence System Design

**Version:** 1.0  
**Last Updated:** October 30, 2025  
**Focus:** AI Agents, Context Management, Intelligent Triggers

---

## Table of Contents

1. [AI Architecture Overview](#ai-architecture-overview)
2. [Specialized Agent System](#specialized-agent-system)
3. [Context Management](#context-management)
4. [Trigger & Orchestration](#trigger--orchestration)
5. [Prompt Engineering](#prompt-engineering)
6. [Learning & Adaptation](#learning--adaptation)

---

## AI Architecture Overview

### Core Philosophy

**"Proactive Intelligence Through Specialized Agents"**

Event Chat uses a **multi-agent AI system** where specialized agents handle different aspects of event planning. Instead of one general-purpose AI, we deploy domain experts that understand tasks, budgets, promises, and planning deeply.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction Layer                    │
│  • Chat messages                                             │
│  • Task completions                                          │
│  • Expense mentions                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Pattern Detection Engine                    │
│  • Regex matching (< 5ms)                                   │
│  • Intent classification                                     │
│  • Confidence scoring                                        │
│  • Trigger decision                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Agent Orchestrator                         │
│  • Route to appropriate agent                               │
│  • Assemble context (rich/standard/minimal)                 │
│  • Manage agent collaboration                               │
│  • Handle failures & fallbacks                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┬──────────────┬──────────────┬───────────────┐
│ Task         │ Promise      │ Budget       │ Planning      │
│ Enricher     │ Manager      │ Analyst      │ Advisor       │
│ Agent        │ Agent        │ Agent        │ Agent         │
└──────────────┴──────────────┴──────────────┴───────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Claude API (Anthropic)                   │
│  Model: claude-sonnet-4-20250514                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Response Processing                       │
│  • Parse structured output (JSON)                           │
│  • Validate responses                                        │
│  • Stream to users (real-time)                              │
│  • Update database                                           │
│  • Trigger UI components                                     │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Specialization Over Generalization:** Dedicated agents for specific tasks
2. **Context Minimization:** Only load what's needed for each agent
3. **Streaming First:** Show AI thinking in real-time
4. **Fail Gracefully:** Always provide value, even if AI fails
5. **Learn Continuously:** Improve predictions from actual outcomes

---

## Specialized Agent System

### Agent Registry

```typescript
interface AIAgent {
  id: string
  role: string // Expert title
  model: string // Claude model variant
  contextLevel: 'minimal' | 'standard' | 'rich' | 'comprehensive'
  temperature: number // 0.0-1.0 (deterministic to creative)
  maxTokens: number // Response length limit
  capabilities: string[] // What this agent does
  systemPrompt: string // Role definition
}

const AI_AGENTS: Record<string, AIAgent> = {
  // 1. Task Enrichment Specialist
  taskEnricher: {
    id: 'task_enricher',
    role: 'Expert Event Planning Task Specialist',
    model: 'claude-sonnet-4',
    contextLevel: 'rich', // Needs task graph, expenses, event details
    temperature: 0.7, // Slightly creative for suggestions
    maxTokens: 1000,
    capabilities: [
      'generate_detailed_task_descriptions',
      'suggest_next_steps',
      'estimate_costs_based_on_event_type',
      'identify_task_dependencies',
      'detect_purchase_requirements',
      'suggest_vendors',
      'provide_planning_tips'
    ],
    systemPrompt: `You are an expert event planner specializing in creating comprehensive, actionable task plans. Your role is to transform a simple commitment like "I'll handle the cake" into a complete action plan with description, next steps, cost estimates, and helpful tips.`
  },
  
  // 2. Promise Fulfillment Coordinator
  promiseManager: {
    id: 'promise_manager',
    role: 'Expense Tracking Coordinator',
    model: 'claude-sonnet-4',
    contextLevel: 'standard', // Task, promise, budget summary
    temperature: 0.4, // More consistent for follow-ups
    maxTokens: 300,
    capabilities: [
      'generate_contextual_followup_questions',
      'parse_natural_expense_responses',
      'validate_cost_reasonableness',
      'suggest_expense_corrections',
      'detect_duplicate_expenses'
    ],
    systemPrompt: `You are helping track expenses for events. When a user completes a task involving a purchase, generate a friendly, contextual follow-up question to capture the actual cost. Be natural and conversational.`
  },
  
  // 3. Budget & Finance Analyst
  budgetAnalyst: {
    id: 'budget_analyst',
    role: 'Budget and Finance Specialist',
    model: 'claude-sonnet-4',
    contextLevel: 'rich', // All expenses, budget history, forecasts
    temperature: 0.3, // Very deterministic for calculations
    maxTokens: 500,
    capabilities: [
      'analyze_spending_variance',
      'recommend_split_methods',
      'predict_future_costs',
      'flag_budget_overruns',
      'generate_budget_warnings',
      'suggest_cost_optimizations',
      'calculate_fair_splits'
    ],
    systemPrompt: `You are a budget analyst helping groups manage event finances. Analyze spending patterns, identify variances, and recommend fair bill-splitting methods based on context.`
  },
  
  // 4. Event Planning Advisor
  planningAdvisor: {
    id: 'planning_advisor',
    role: 'Expert Event Planning Consultant',
    model: 'claude-sonnet-4',
    contextLevel: 'comprehensive', // Everything about the event
    temperature: 0.6, // Balanced creativity
    maxTokens: 800,
    capabilities: [
      'suggest_missing_tasks',
      'identify_planning_bottlenecks',
      'recommend_timeline_adjustments',
      'provide_vendor_suggestions',
      'answer_planning_questions',
      'detect_potential_issues',
      'generate_event_summaries'
    ],
    systemPrompt: `You are an expert event planning consultant. Analyze the current planning state and provide proactive suggestions, identify missing tasks, spot bottlenecks, and answer planning questions with specific, actionable advice.`
  },
  
  // 5. Dependency & Timeline Analyzer
  dependencyAnalyzer: {
    id: 'dependency_analyzer',
    role: 'Task Dependency and Scheduling Specialist',
    model: 'claude-sonnet-4',
    contextLevel: 'rich', // Complete task graph
    temperature: 0.2, // Very deterministic for logical dependencies
    maxTokens: 400,
    capabilities: [
      'identify_task_dependencies',
      'suggest_logical_task_ordering',
      'detect_circular_dependencies',
      'recommend_parallel_tasks',
      'calculate_critical_path',
      'estimate_timeline_feasibility'
    ],
    systemPrompt: `You are a project management expert specializing in task dependencies and scheduling. Analyze task relationships and suggest logical ordering to ensure efficient event planning.`
  }
};
```

### Agent Selection & Routing

```typescript
// Orchestrator routes intents to appropriate agents
interface AgentRoute {
  intent: string
  primaryAgent: string
  supportingAgents?: string[]
  contextLevel: 'minimal' | 'standard' | 'rich' | 'comprehensive'
}

const AGENT_ROUTING: Record<string, AgentRoute> = {
  // Task-related intents
  'task_commitment': {
    intent: 'User commits to handling a task',
    primaryAgent: 'taskEnricher',
    supportingAgents: ['dependencyAnalyzer', 'budgetAnalyst'],
    contextLevel: 'rich'
  },
  
  // Promise fulfillment
  'task_completed': {
    intent: 'User marks task as done',
    primaryAgent: 'promiseManager',
    contextLevel: 'standard'
  },
  
  // Budget queries
  'budget_question': {
    intent: 'User asks about budget',
    primaryAgent: 'budgetAnalyst',
    contextLevel: 'rich'
  },
  
  // Planning help
  'planning_question': {
    intent: 'User asks what to do next',
    primaryAgent: 'planningAdvisor',
    supportingAgents: ['dependencyAnalyzer'],
    contextLevel: 'comprehensive'
  },
  
  // Expense analysis
  'expense_mentioned': {
    intent: 'User mentions spending money',
    primaryAgent: 'budgetAnalyst',
    contextLevel: 'standard'
  }
};

// Orchestration logic
async function orchestrateAgents(
  intent: string,
  data: any,
  context: EventContext
): Promise<AgentResponse> {
  const route = AGENT_ROUTING[intent];
  
  // 1. Get primary agent
  const primaryAgent = AI_AGENTS[route.primaryAgent];
  
  // 2. Assemble appropriate context
  const agentContext = await assembleContext(
    context.eventId,
    route.contextLevel
  );
  
  // 3. Call primary agent
  const primaryResponse = await callAgent(
    primaryAgent,
    agentContext,
    data
  );
  
  // 4. If supporting agents needed, call them too
  if (route.supportingAgents) {
    const supportingResponses = await Promise.all(
      route.supportingAgents.map(agentId =>
        callAgent(AI_AGENTS[agentId], agentContext, data)
      )
    );
    
    // 5. Merge responses
    return mergeAgentResponses(primaryResponse, supportingResponses);
  }
  
  return primaryResponse;
}
```

### Agent Collaboration Example

```typescript
// Example: Creating a task involves multiple agents working together

// User: "I'll handle the cake"
// Intent: task_commitment

async function handleTaskCommitment(message: string, context: EventContext) {
  // 1. Primary Agent: Task Enricher
  const enrichedTask = await AI_AGENTS.taskEnricher.process({
    prompt: `Generate comprehensive task for: "${message}"`,
    context: {
      event: context.event,
      existingTasks: context.tasks,
      budget: context.budget
    }
  });
  
  // enrichedTask = {
  //   title: "Order birthday cake for 20 guests",
  //   description: "Research and order a birthday cake...",
  //   nextSteps: ["Ask group about preferences", "Research bakeries", ...],
  //   estimatedCost: { min: 80, max: 120 },
  //   hasPurchasePromise: true
  // }
  
  // 2. Supporting Agent: Dependency Analyzer
  const dependencies = await AI_AGENTS.dependencyAnalyzer.process({
    prompt: `What tasks should be completed before ordering a cake?`,
    context: {
      newTask: enrichedTask,
      existingTasks: context.tasks
    }
  });
  
  // dependencies = {
  //   dependsOn: ["finalize_guest_count", "confirm_dietary_restrictions"]
  // }
  
  // 3. Supporting Agent: Budget Analyst
  const budgetValidation = await AI_AGENTS.budgetAnalyst.process({
    prompt: `Is this expense feasible within budget?`,
    context: {
      estimatedCost: enrichedTask.estimatedCost,
      budget: context.budget
    }
  });
  
  // budgetValidation = {
  //   feasible: true,
  //   warning: null,
  //   impact: "This will use 15% of remaining budget"
  // }
  
  // 4. Merge all agent outputs
  const finalTask = {
    ...enrichedTask,
    dependsOn: dependencies.dependsOn,
    budgetImpact: budgetValidation.impact,
    warnings: budgetValidation.warning ? [budgetValidation.warning] : []
  };
  
  return finalTask;
}
```

---

## Context Management

### Four Context Levels

```typescript
interface ContextLevel {
  name: string
  tokenBudget: number
  includes: string[]
  useCases: string[]
}

const CONTEXT_LEVELS: Record<string, ContextLevel> = {
  minimal: {
    name: 'Minimal Context',
    tokenBudget: 500,
    includes: [
      'event_basics',
      'recent_messages_5'
    ],
    useCases: [
      'quick_questions',
      'simple_confirmations'
    ]
  },
  
  standard: {
    name: 'Standard Context',
    tokenBudget: 1200,
    includes: [
      'event_full',
      'task_list_summary',
      'budget_status',
      'recent_messages_10'
    ],
    useCases: [
      'task_creation',
      'expense_questions',
      'promise_fulfillment'
    ]
  },
  
  rich: {
    name: 'Rich Context',
    tokenBudget: 1700,
    includes: [
      'event_full',
      'task_graph_with_dependencies',
      'expense_history_with_variance',
      'unfulfilled_promises',
      'recent_messages_15',
      'similar_past_events'
    ],
    useCases: [
      'task_enrichment',
      'budget_analysis',
      'dependency_detection'
    ]
  },
  
  comprehensive: {
    name: 'Comprehensive Context',
    tokenBudget: 2500,
    includes: [
      'event_full',
      'complete_task_graph',
      'full_expense_breakdown',
      'all_promises',
      'participant_contributions',
      'timeline_analysis',
      'budget_forecast',
      'historical_patterns'
    ],
    useCases: [
      'event_summary',
      'major_planning_decisions',
      'budget_replan'
    ]
  }
};
```

### Context Assembly

```typescript
// Dynamic context assembly based on agent needs
async function assembleContext(
  eventId: string,
  level: 'minimal' | 'standard' | 'rich' | 'comprehensive'
): Promise<AIContext> {
  const config = CONTEXT_LEVELS[level];
  const context: any = {};
  
  // Event basics (always included)
  if (config.includes.includes('event_basics') || 
      config.includes.includes('event_full')) {
    const event = await db.get('events', eventId);
    context.event = {
      id: event.id,
      name: event.name,
      type: event.type,
      date: event.date,
      attendees: event.attendees,
      budget: event.budget,
      spent: event.total_spent,
      remaining: event.budget - event.total_spent
    };
  }
  
  // Task information
  if (config.includes.includes('task_list_summary')) {
    const tasks = await db.query('tasks')
      .filter(q => q.eq('eventId', eventId))
      .collect();
    
    context.tasks = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      summary: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assigned_to
      }))
    };
  }
  
  // Rich task graph with dependencies
  if (config.includes.includes('task_graph_with_dependencies')) {
    const tasks = await db.query('tasks')
      .filter(q => q.eq('eventId', eventId))
      .collect();
    
    context.taskGraph = tasks.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      status: t.status,
      estimatedCost: t.estimated_cost,
      dependsOn: t.depends_on,
      blocking: t.blocking,
      hasPurchasePromise: t.has_purchase_promise
    }));
  }
  
  // Expense history with variance
  if (config.includes.includes('expense_history_with_variance')) {
    const expenses = await db.query('expenses')
      .filter(q => q.eq('eventId', eventId))
      .collect();
    
    context.expenses = {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      count: expenses.length,
      byCategory: groupBy(expenses, 'category'),
      variances: expenses
        .filter(e => e.variance !== null)
        .map(e => ({
          taskId: e.linked_task_id,
          estimated: e.estimated_amount,
          actual: e.amount,
          variance: e.variance,
          variancePercent: (e.variance / e.estimated_amount) * 100
        }))
    };
  }
  
  // Unfulfilled promises
  if (config.includes.includes('unfulfilled_promises')) {
    const promises = await db.query('task_promises')
      .filter(q => 
        q.eq('eventId', eventId)
        .eq('fulfilled', false)
      )
      .collect();
    
    context.unfulfilledPromises = promises.map(p => ({
      taskId: p.task_id,
      expectedCost: { 
        min: p.expected_cost_min, 
        max: p.expected_cost_max 
      },
      followUpSent: p.follow_up_sent
    }));
  }
  
  // Recent conversation
  const messageCount = {
    minimal: 5,
    standard: 10,
    rich: 15,
    comprehensive: 20
  }[level];
  
  const recentMessages = await db.query('messages')
    .filter(q => q.eq('eventId', eventId))
    .order('desc')
    .take(messageCount);
  
  context.recentConversation = recentMessages.map(m => ({
    user: m.user_id,
    content: m.content,
    timestamp: m.created_at
  }));
  
  // Historical patterns (comprehensive only)
  if (config.includes.includes('historical_patterns')) {
    const pastEvents = await findSimilarEvents(
      context.event.type,
      context.event.attendees
    );
    
    context.historicalLearning = {
      similarEvents: pastEvents.slice(0, 3).map(e => ({
        type: e.type,
        attendees: e.attendees,
        totalCost: e.total_spent,
        taskCount: e.task_count,
        avgCostPerTask: e.total_spent / e.task_count
      }))
    };
  }
  
  // Validate token count
  const estimatedTokens = estimateContextTokens(context);
  if (estimatedTokens > config.tokenBudget) {
    console.warn(`Context exceeds token budget: ${estimatedTokens}/${config.tokenBudget}`);
    // Compress if needed
    return compressContext(context, config.tokenBudget);
  }
  
  return context;
}
```

### Context Compression

```typescript
// When context is too large, intelligently compress
function compressContext(
  context: AIContext,
  maxTokens: number
): AIContext {
  let estimatedTokens = estimateContextTokens(context);
  
  // Strategy 1: Reduce message count
  if (estimatedTokens > maxTokens) {
    context.recentConversation = context.recentConversation.slice(0, 5);
    estimatedTokens = estimateContextTokens(context);
  }
  
  // Strategy 2: Summarize task list
  if (estimatedTokens > maxTokens && context.taskGraph) {
    context.taskSummary = {
      total: context.taskGraph.length,
      byCategory: groupBy(context.taskGraph, 'category'),
      completed: context.taskGraph.filter(t => t.status === 'done').length
    };
    delete context.taskGraph;
    estimatedTokens = estimateContextTokens(context);
  }
  
  // Strategy 3: Remove historical data
  if (estimatedTokens > maxTokens) {
    delete context.historicalLearning;
    estimatedTokens = estimateContextTokens(context);
  }
  
  return context;
}

// Estimate tokens for context object
function estimateContextTokens(context: any): number {
  const jsonString = JSON.stringify(context);
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(jsonString.length / 4);
}
```

---

## Trigger & Orchestration

### Pattern-to-Agent Trigger System

```typescript
// Fast pattern detection triggers AI agents
interface TriggerDecision {
  shouldTriggerAI: boolean
  intent: string
  confidence: number
  agentRoute: string
  urgency: 'low' | 'normal' | 'high'
}

async function evaluateTrigger(
  message: string,
  context: EventContext
): Promise<TriggerDecision> {
  // 1. Pattern matching (< 5ms)
  const patterns = detectPatterns(message);
  
  if (patterns.length === 0) {
    return {
      shouldTriggerAI: false,
      intent: 'chat_only',
      confidence: 1.0,
      agentRoute: 'none',
      urgency: 'low'
    };
  }
  
  // 2. Select highest confidence pattern
  const topPattern = patterns[0];
  
  // 3. Decide if AI is needed
  const decision = {
    shouldTriggerAI: topPattern.needsAI,
    intent: topPattern.id,
    confidence: topPattern.confidence,
    agentRoute: getAgentRoute(topPattern.id),
    urgency: determineUrgency(topPattern, context)
  };
  
  return decision;
}

// Determine urgency based on context
function determineUrgency(
  pattern: Pattern,
  context: EventContext
): 'low' | 'normal' | 'high' {
  // High urgency if:
  // - Budget almost exceeded
  if (context.budget.percentUsed > 90) return 'high';
  
  // - Event is soon
  const daysUntilEvent = (context.event.date - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilEvent < 7) return 'high';
  
  // - Unfulfilled promises
  if (pattern.id === 'task_completed' && context.unfulfilledPromises.length > 0) {
    return 'high';
  }
  
  return 'normal';
}
```

### Queue Management

```typescript
// AI requests are queued and processed based on priority
interface AIRequest {
  id: string
  intent: string
  agentRoute: string
  context: AIContext
  data: any
  priority: number // Higher = more urgent
  createdAt: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
}

class AIRequestQueue {
  private queue: PriorityQueue<AIRequest>;
  private processing = new Set<string>();
  private maxConcurrent = 5; // Process up to 5 AI requests simultaneously
  
  async enqueue(request: AIRequest): Promise<void> {
    // Add to priority queue
    this.queue.insert(request, request.priority);
    
    // Start processing if capacity available
    if (this.processing.size < this.maxConcurrent) {
      this.processNext();
    }
  }
  
  private async processNext(): Promise<void> {
    if (this.queue.isEmpty()) return;
    if (this.processing.size >= this.maxConcurrent) return;
    
    const request = this.queue.extract();
    this.processing.add(request.id);
    request.status = 'processing';
    
    try {
      // Route to appropriate agent
      const result = await orchestrateAgents(
        request.intent,
        request.data,
        request.context
      );
      
      request.status = 'completed';
      
      // Broadcast result to users
      await broadcastResult(request.context.eventId, result);
      
    } catch (error) {
      request.status = 'failed';
      console.error('AI request failed:', error);
      
      // Try fallback
      await handleAIFailure(request);
      
    } finally {
      this.processing.delete(request.id);
      
      // Process next in queue
      this.processNext();
    }
  }
}
```

---

## Prompt Engineering

### Structured Prompt Template

```typescript
// All agents follow this prompt structure
interface PromptTemplate {
  system: string // Agent role definition
  context: string // Structured event context (JSON)
  instructions: string // Specific task instructions
  constraints: string // What NOT to do
  outputFormat: string // Expected response format
  examples?: string // Few-shot examples (optional)
}

// Example: Task Enrichment Prompt
const TASK_ENRICHMENT_PROMPT: PromptTemplate = {
  system: `You are an expert event planner specializing in ${eventType} events. Your role is to create comprehensive, actionable task plans that help users successfully execute their commitments.`,
  
  context: `
EVENT DETAILS:
${JSON.stringify(context.event, null, 2)}

EXISTING TASKS:
${JSON.stringify(context.tasks, null, 2)}

BUDGET STATUS:
${JSON.stringify(context.budget, null, 2)}

RECENT CONVERSATION:
${context.recentConversation.map(m => `${m.user}: ${m.content}`).join('\n')}
  `.trim(),
  
  instructions: `
USER COMMITMENT: "${userMessage}"

Generate a comprehensive task plan that includes:

1. **Title**: Clear, action-oriented (5-8 words)
2. **Description**: What needs to be done, why it matters, key considerations (2-3 sentences)
3. **Next Steps**: 3-5 specific, ordered subtasks
4. **Category**: Choose from: venue, food, decorations, entertainment, invitations, logistics, photography, other
5. **Estimated Cost**: Realistic range based on event size (${eventAttendees} people) and type (${eventType})
6. **Time Estimate**: How long this will realistically take
7. **Has Purchase**: Boolean - does this involve buying something?
8. **Suggested Deadline**: Logical date before event (${eventDate})
9. **Dependencies**: What other tasks should be done first?
10. **Vendor Suggestions**: 2-3 specific vendor types if applicable
11. **Tips**: Practical advice specific to this task and event type
  `.trim(),
  
  constraints: `
IMPORTANT CONSTRAINTS:
- Stay within budget (${budgetRemaining} remaining)
- Be specific to THIS event (use actual numbers, dates, attendee count)
- Reference existing tasks to maintain consistency
- Estimate costs realistically for ${eventType} events
- Don't suggest tasks that already exist
- Keep descriptions concise but informative
- All dates must be before ${eventDate}
  `.trim(),
  
  outputFormat: `
Return ONLY valid JSON in this exact structure (no markdown, no explanations):

{
  "title": "string (5-8 words)",
  "description": "string (2-3 sentences)",
  "nextSteps": ["string", "string", ...],
  "category": "string (one of the categories listed)",
  "estimatedCost": {
    "min": number,
    "max": number,
    "reasoning": "string (brief explanation)"
  },
  "timeEstimate": "string (e.g., '2-3 hours over 1 week')",
  "hasPurchasePromise": boolean,
  "suggestedDeadline": "YYYY-MM-DD",
  "dependsOn": ["taskId1", "taskId2"] or [],
  "potentialVendors": ["string", "string"],
  "tips": "string (practical advice)"
}
  `.trim(),
  
  examples: `
EXAMPLE INPUT: "I'll handle the invitations"
EXAMPLE OUTPUT:
{
  "title": "Design and send party invitations",
  "description": "Create custom invitations for the birthday party and send them to all 20 guests. Include RSVP tracking to finalize headcount for food and venue arrangements.",
  "nextSteps": [
    "Decide on invitation style (digital or physical)",
    "Design invitation with party details",
    "Collect guest contact information",
    "Send invitations 2 weeks before event",
    "Track RSVPs and follow up with non-responders"
  ],
  "category": "invitations",
  "estimatedCost": {
    "min": 30,
    "max": 60,
    "reasoning": "Digital invitations: $30-40 (design tools), Physical: $50-60 (printing and postage)"
  },
  "timeEstimate": "3-4 hours over 2 weeks",
  "hasPurchasePromise": true,
  "suggestedDeadline": "2025-11-05",
  "dependsOn": [],
  "potentialVendors": ["Canva Pro", "Paperless Post", "Minted"],
  "tips": "Send digital invitations to save costs. Include a clear RSVP deadline (1 week before event) to finalize headcount for catering."
}
  `.trim()
};

// Construct final prompt
function constructPrompt(template: PromptTemplate): string {
  return `
${template.system}

${template.context}

${template.instructions}

${template.constraints}

${template.outputFormat}

${template.examples || ''}
  `.trim();
}
```

### Response Validation

```typescript
// Validate AI responses before using them
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  data?: any
}

async function validateAIResponse(
  response: string,
  expectedSchema: any
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // 1. Parse JSON
    let data = JSON.parse(response);
    
    // 2. Validate schema
    const schemaErrors = validateSchema(data, expectedSchema);
    if (schemaErrors.length > 0) {
      result.valid = false;
      result.errors = schemaErrors;
      return result;
    }
    
    // 3. Business logic validation
    
    // Check cost reasonableness
    if (data.estimatedCost) {
      if (data.estimatedCost.min > data.estimatedCost.max) {
        result.errors.push('Min cost cannot exceed max cost');
        result.valid = false;
      }
      
      if (data.estimatedCost.max > 10000) {
        result.warnings.push('Estimated cost seems unusually high');
      }
    }
    
    // Check deadline is before event
    if (data.suggestedDeadline) {
      const deadline = new Date(data.suggestedDeadline);
      if (deadline > eventDate) {
        result.errors.push('Deadline must be before event date');
        result.valid = false;
      }
    }
    
    // Check dependencies exist
    if (data.dependsOn) {
      for (const depId of data.dependsOn) {
        const taskExists = await db.exists('tasks', depId);
        if (!taskExists) {
          result.errors.push(`Dependency task ${depId} does not exist`);
          result.valid = false;
        }
      }
    }
    
    result.data = data;
    
  } catch (error) {
    result.valid = false;
    result.errors.push('Invalid JSON response');
  }
  
  return result;
}
```

---

## Learning & Adaptation

### Cost Estimation Learning

```typescript
// System learns from actual costs to improve future estimates
interface CostLearning {
  eventType: string
  taskCategory: string
  attendeeRange: string // "1-10", "11-25", "26-50", "51+"
  estimatedCost: { min: number, max: number }
  actualCost: number
  variance: number
  variancePercent: number
}

class CostLearningSystem {
  async recordOutcome(
    task: Task,
    expense: Expense
  ): Promise<void> {
    const learning: CostLearning = {
      eventType: task.event.type,
      taskCategory: task.category,
      attendeeRange: getAttendeeRange(task.event.attendees),
      estimatedCost: task.estimated_cost,
      actualCost: expense.amount,
      variance: expense.variance,
      variancePercent: (expense.variance / expense.estimated_amount) * 100
    };
    
    // Store learning data
    await db.insert('cost_learnings', learning);
    
    // Update cost model
    await updateCostModel(learning);
  }
  
  async improveEstimate(
    eventType: string,
    taskCategory: string,
    attendees: number
  ): Promise<{ min: number, max: number }> {
    // Query historical data
    const historicalData = await db.query('cost_learnings')
      .filter(q =>
        q.eq('eventType', eventType)
        .eq('taskCategory', taskCategory)
        .eq('attendeeRange', getAttendeeRange(attendees))
      )
      .collect();
    
    if (historicalData.length < 5) {
      // Not enough data, use defaults
      return getDefaultEstimate(eventType, taskCategory, attendees);
    }
    
    // Calculate median actual cost (robust to outliers)
    const actualCosts = historicalData.map(d => d.actualCost).sort((a, b) => a - b);
    const median = actualCosts[Math.floor(actualCosts.length / 2)];
    
    // Calculate variance
    const stdDev = calculateStdDev(actualCosts);
    
    // Return range: median ± 1 standard deviation
    return {
      min: Math.max(0, median - stdDev),
      max: median + stdDev
    };
  }
}
```

### Agent Performance Tracking

```typescript
// Track agent performance to identify improvement opportunities
interface AgentMetrics {
  agentId: string
  successRate: number // % of valid responses
  avgResponseTime: number // milliseconds
  avgTokensUsed: number
  avgCost: number // dollars
  userSatisfaction: number // 1-5 rating
  commonErrors: string[]
}

class AgentPerformanceTracker {
  async recordAgentCall(
    agentId: string,
    request: AIRequest,
    response: AgentResponse,
    duration: number
  ): Promise<void> {
    const record = {
      agentId,
      requestIntent: request.intent,
      responseValid: response.valid,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      duration,
      timestamp: Date.now()
    };
    
    await db.insert('agent_calls', record);
  }
  
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const recentCalls = await db.query('agent_calls')
      .filter(q => q.eq('agentId', agentId))
      .order('desc')
      .take(100);
    
    return {
      agentId,
      successRate: recentCalls.filter(c => c.responseValid).length / recentCalls.length,
      avgResponseTime: average(recentCalls.map(c => c.duration)),
      avgTokensUsed: average(recentCalls.map(c => c.tokensUsed)),
      avgCost: average(recentCalls.map(c => c.cost)),
      userSatisfaction: await getUserSatisfaction(agentId),
      commonErrors: await getCommonErrors(agentId)
    };
  }
  
  async identifyImprovements(agentId: string): Promise<string[]> {
    const metrics = await this.getAgentMetrics(agentId);
    const suggestions: string[] = [];
    
    if (metrics.successRate < 0.9) {
      suggestions.push('Improve prompt clarity or add more examples');
    }
    
    if (metrics.avgResponseTime > 3000) {
      suggestions.push('Reduce context size or simplify task');
    }
    
    if (metrics.userSatisfaction < 3.5) {
      suggestions.push('Review user feedback and adjust agent behavior');
    }
    
    return suggestions;
  }
}
```

---

## Conclusion

### Key AI Innovations

1. **Specialized Agent System:** Domain experts instead of general AI
2. **Dynamic Context Assembly:** Load only what each agent needs
3. **Pattern-Triggered Intelligence:** AI activates at the right moments
4. **Collaborative Agents:** Multiple agents work together on complex tasks
5. **Continuous Learning:** System improves from actual outcomes

### Performance Targets

- **Agent Response Time:** <3s for task enrichment, <2s for follow-ups
- **Context Token Usage:** 1700 tokens avg (rich context)
- **Cost per Event:** ~$1.10 for 500 messages
- **Success Rate:** >90% valid structured responses
- **User Satisfaction:** >4.0/5.0 rating

### Future Enhancements

1. **Fine-tuned Models:** Custom models trained on event planning data
2. **Multi-modal Agents:** Process images (receipts, venue photos)
3. **Voice Agents:** Natural language voice interface
4. **Predictive Agents:** Proactive suggestions before users ask
5. **Vendor Integration:** Direct booking through AI agents

---

**Document Status:** AI Architecture Design Complete  
**Integration:** Works with Technical Architecture & Frontend Architecture  
**Implementation Priority:** Phase 1-2 (Days 1-7)