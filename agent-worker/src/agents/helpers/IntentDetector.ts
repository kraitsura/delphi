import { BaseAgent, AgentContext } from '../BaseAgent';
import { Commitment } from './CommitmentExtractor';

/**
 * Room context for intent detection
 */
export interface RoomContext {
  roomType: 'main' | 'vendor' | 'brainstorm' | 'private';
  taskCount: number;
  hasBudget: boolean;
  vendorCount: number;
  recentMessages: Array<{
    _id: string;
    content: string;
    authorType: 'user' | 'agent' | 'system';
    authorName?: string;
  }>;
  extractedCommitments: Commitment[];
}

/**
 * Intent result from AI analysis
 */
export interface Intent {
  primaryIntent: string;
  confidence: number;
  reasoning: string;
  domain: 'tasks' | 'budget' | 'vendors' | 'planning' | 'general';
  action: 'create' | 'read' | 'update' | 'delete' | 'plan' | 'sync';
  preconditionsMet: boolean;
  missingInformation: string[];
  suggestedClarification?: string;

  // Multi-intent fields
  entities?: Array<{ type: string; value: any }>;
  executionOrder?: number;
  executionStrategy?: 'parallel' | 'sequential';
}

/**
 * IntentDetector - AI-powered intent detection with conversation context
 *
 * Uses Claude Haiku for fast, cost-effective intent analysis.
 * Considers:
 * - Room context (tasks, budget, vendors)
 * - Recent conversation messages
 * - Extracted commitments
 * - Pragmatic interpretation (e.g., "update tasks" with 0 tasks = sync from conversation)
 */
export class IntentDetector {
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor(
    private env: any, // Cloudflare env with CLAUDE_API_KEY
    private context: AgentContext
  ) {}

  /**
   * Detect user intent using AI with room context
   * @param message User message to analyze
   * @param roomContext Current room state and conversation
   * @returns Intent with confidence and metadata
   */
  async detectIntent(message: string, roomContext: RoomContext): Promise<Intent> {
    console.log(`[IntentDetector] Analyzing message with room context...`);
    console.log(`[IntentDetector] Room state: ${roomContext.taskCount} tasks, ${roomContext.vendorCount} vendors, budget: ${roomContext.hasBudget}`);
    console.log(`[IntentDetector] Commitments: ${roomContext.extractedCommitments.length} found`);

    try {
      const prompt = this.buildIntentPrompt(message, roomContext);
      const intent = await this.callClaudeForIntent(prompt);

      console.log(`[IntentDetector] Intent: ${intent.primaryIntent} (confidence: ${intent.confidence})`);

      return intent;
    } catch (error: any) {
      console.error(`[IntentDetector] AI detection failed, using fallback: ${error.message}`);
      return this.fallbackKeywordDetection(message, roomContext);
    }
  }

  /**
   * Detect multiple intents from a complex user message
   * Handles cases like "set expense $2k for DJ and search for DJs in bay area"
   * @param message User message to analyze
   * @param roomContext Current room state and conversation
   * @returns Array of intents with execution order metadata
   */
  async detectMultipleIntents(message: string, roomContext: RoomContext): Promise<Intent[]> {
    console.log(`[IntentDetector] Analyzing message for multiple intents...`);

    try {
      const prompt = this.buildMultiIntentPrompt(message, roomContext);
      const intents = await this.callClaudeForMultiIntent(prompt);

      console.log(`[IntentDetector] Found ${intents.length} intent(s)`);
      intents.forEach((intent, idx) => {
        console.log(`  ${idx + 1}. ${intent.primaryIntent} (confidence: ${intent.confidence})`);
      });

      return intents;
    } catch (error: any) {
      console.error(`[IntentDetector] Multi-intent detection failed: ${error.message}`);
      // Fallback to single intent detection
      const singleIntent = await this.detectIntent(message, roomContext);
      return [singleIntent];
    }
  }

  /**
   * Build multi-intent detection prompt
   */
  private buildMultiIntentPrompt(message: string, roomContext: RoomContext): string {
    const eventName = this.context.eventContext?.name || 'Unnamed Event';
    const eventDate = this.context.eventContext?.date || 'Not set';
    const eventType = this.context.eventContext?.type || 'Unknown';

    const conversationContext = roomContext.recentMessages
      .slice(-10)
      .map(m => `  - ${m.authorName || m.authorType}: ${m.content}`)
      .join('\n');

    const commitmentsContext = roomContext.extractedCommitments
      .map(c => `  - ${c.text} (confidence: ${c.confidence})`)
      .join('\n');

    return `You are analyzing a user's message to detect MULTIPLE distinct intents in an event planning system.

USER MESSAGE: "${message}"

EVENT CONTEXT:
- Event Name: ${eventName}
- Event Type: ${eventType}
- Event Date: ${eventDate}

CURRENT ROOM STATE:
- Room Type: ${roomContext.roomType}
- Tasks: ${roomContext.taskCount} exist
- Budget: ${roomContext.hasBudget ? 'Set' : 'Not set'}
- Vendors: ${roomContext.vendorCount} saved

RECENT CONVERSATION:
${conversationContext || '  (no recent messages)'}

TASK: Decompose the user message into distinct intents. Each intent should be independent.

EXAMPLES:
- "set expense $2k for DJ and search for DJs in bay area" → [add_expense, search_vendors]
- "create tasks for photographer and caterer, then show budget" → [create_task (x2), query_budget]
- "add DJ to budget and find DJs in SF" → [add_expense, search_vendors]
- "show me all tasks" → [query_tasks]

SINGLE-INTENT EXAMPLES (do NOT split these):
- "update tasks based on our conversation" → [sync_conversation_to_tasks]
- "create tasks from what we discussed" → [sync_conversation_to_tasks]
- "sync the tasks" → [sync_conversation_to_tasks]
- "add these tasks to the list" → [create_task]
- "update the task list" → [sync_conversation_to_tasks]

IMPORTANT RULES:
- If user wants to create/update tasks based on conversation, return ONLY [sync_conversation_to_tasks]
- Do NOT combine sync_conversation_to_tasks with query_tasks - they are redundant
- Task sync operations are SINGLE intents, not multiple

INTENT CATEGORIES (same as before):
1. create_task, query_tasks, update_task, delete_task, sync_conversation_to_tasks
2. create_budget, query_budget, update_budget, add_expense
3. search_vendors, query_vendors, save_vendor
4. create_poll, general_planning, general_question, clarification_needed

EXECUTION STRATEGY:
- "parallel": Intents can execute simultaneously (e.g., add_expense + search_vendors)
- "sequential": Intents must run in order (e.g., create_budget then add_expense)

Respond with ONLY valid JSON array (no markdown):
[
  {
    "intent": "add_expense",
    "confidence": 0.9,
    "reasoning": "User wants to record $2k expense for DJ",
    "domain": "budget",
    "action": "create",
    "entities": [{"type": "amount", "value": 2000}, {"type": "category", "value": "DJ"}],
    "preconditions_met": true,
    "missing_information": [],
    "execution_order": 1,
    "execution_strategy": "parallel"
  },
  {
    "intent": "search_vendors",
    "confidence": 0.95,
    "reasoning": "User wants to find DJs in bay area",
    "domain": "vendors",
    "action": "read",
    "entities": [{"type": "category", "value": "DJ"}, {"type": "location", "value": "bay area"}],
    "preconditions_met": true,
    "missing_information": [],
    "execution_order": 2,
    "execution_strategy": "parallel"
  }
]

IMPORTANT:
- Return array even if only 1 intent found
- Include execution_order and execution_strategy for each intent
- Extract entities (amounts, categories, locations, etc.) from message
- If intents conflict or unclear, mark confidence < 0.7`;
  }

  /**
   * Build comprehensive intent detection prompt with context
   */
  private buildIntentPrompt(message: string, roomContext: RoomContext): string {
    const eventName = this.context.eventContext?.name || 'Unnamed Event';
    const eventDate = this.context.eventContext?.date || 'Not set';
    const eventType = this.context.eventContext?.type || 'Unknown';

    // Format recent messages
    const conversationContext = roomContext.recentMessages
      .slice(-10) // Last 10 messages
      .map(m => `  - ${m.authorName || m.authorType}: ${m.content}`)
      .join('\n');

    // Format commitments
    const commitmentsContext = roomContext.extractedCommitments
      .map(c => `  - ${c.text} (confidence: ${c.confidence})`)
      .join('\n');

    return `You are analyzing a user's request in an event planning system with FULL CONVERSATION CONTEXT.

USER MESSAGE: "${message}"

EVENT CONTEXT:
- Event Name: ${eventName}
- Event Type: ${eventType}
- Event Date: ${eventDate}

CURRENT ROOM STATE:
- Room Type: ${roomContext.roomType}
- Tasks: ${roomContext.taskCount} exist
- Budget: ${roomContext.hasBudget ? 'Set' : 'Not set'}
- Vendors: ${roomContext.vendorCount} saved

RECENT CONVERSATION (last 10 messages):
${conversationContext || '  (no recent messages)'}

COMMITMENTS MENTIONED IN RECENT CONVERSATION:
${commitmentsContext || '  (no commitments extracted)'}

INTENT CATEGORIES:
1. create_task - User wants to add new task(s)
2. query_tasks - User wants to see existing tasks
3. update_task - User wants to modify existing task(s)
4. delete_task - User wants to remove a task
5. sync_conversation_to_tasks - User wants to create tasks from conversation commitments (NEW)
6. create_budget - User wants to set/create budget
7. query_budget - User wants to see budget info
8. update_budget - User wants to modify budget
9. add_expense - User wants to record an expense
10. search_vendors - User wants to find vendors online
11. query_vendors - User wants to see saved vendors
12. save_vendor - User wants to save a vendor
13. create_poll - User wants to create a poll/vote
14. general_planning - User wants high-level event planning help
15. general_question - User has a general question
16. clarification_needed - Not enough info to determine intent

PRAGMATIC INTERPRETATION RULES (IMPORTANT):
- "Update tasks" OR "Sync tasks" with 0 tasks + recent commitments → sync_conversation_to_tasks
- "Update tasks" with >0 tasks → update_task
- "Show me tasks" OR "What tasks" with 0 tasks → query_tasks (will explain none exist, offer to create)
- "Show me tasks" with >0 tasks → query_tasks
- Consider conversation context for implicit requests
- Extract intent from commitments if message is vague

ANALYSIS STEPS:
1. What is the user actually asking for in the context of recent conversation?
2. If the message references tasks/updates and there are 0 tasks, check if we should sync from commitments
3. Do they want to CREATE, READ, UPDATE, DELETE, or SYNC?
4. What domain: tasks, budget, vendors, or general planning?
5. Are preconditions met for this action based on current state?

CONFIDENCE GUIDANCE:
- 0.9-1.0: Explicit, clear request with full context
- 0.7-0.9: Clear intent but may need minor clarification
- 0.5-0.7: Moderate clarity, context helps
- <0.5: Unclear, need clarification

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "intent": "sync_conversation_to_tasks",
  "confidence": 0.85,
  "reasoning": "User said 'update tasks' but 0 tasks exist. Recent conversation has 3 commitments, so this should sync conversation to tasks.",
  "domain": "tasks",
  "action": "sync",
  "preconditions_met": true,
  "missing_information": [],
  "suggested_clarification": null
}

IMPORTANT:
- If confidence < 0.7, set intent to "clarification_needed" and provide suggested_clarification
- Use conversation context to disambiguate vague requests
- Prioritize sync_conversation_to_tasks when "update/sync tasks" with 0 tasks + commitments exist`;
  }

  /**
   * Call Claude API for intent detection
   */
  private async callClaudeForIntent(prompt: string): Promise<Intent> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5', // Fast, cheap model for intent detection (matches BaseAgent.ts)
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: any = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse intent response - no JSON found');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map to our Intent interface
    return {
      primaryIntent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      domain: parsed.domain,
      action: parsed.action,
      preconditionsMet: parsed.preconditions_met ?? true,
      missingInformation: parsed.missing_information || [],
      suggestedClarification: parsed.suggested_clarification
    };
  }

  /**
   * Call Claude API for multi-intent detection
   */
  private async callClaudeForMultiIntent(prompt: string): Promise<Intent[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5', // Fast, cheap model
        max_tokens: 1000, // More tokens for multiple intents
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: any = await response.json();
    const content = data.content[0].text;

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse multi-intent response - no JSON array found');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map each intent to our Intent interface
    return parsed.map((item: any) => ({
      primaryIntent: item.intent,
      confidence: item.confidence,
      reasoning: item.reasoning,
      domain: item.domain,
      action: item.action,
      preconditionsMet: item.preconditions_met ?? true,
      missingInformation: item.missing_information || [],
      suggestedClarification: item.suggested_clarification,
      entities: item.entities || [],
      executionOrder: item.execution_order,
      executionStrategy: item.execution_strategy || 'parallel'
    }));
  }

  /**
   * Fallback to keyword-based detection if AI fails
   */
  private fallbackKeywordDetection(message: string, roomContext: RoomContext): Intent {
    const lower = message.toLowerCase();

    // Task-related keywords
    if (/\b(create|add|make|new)\b.*\b(task|todo|action item)\b/i.test(lower)) {
      return {
        primaryIntent: 'create_task',
        confidence: 0.6,
        reasoning: 'Keyword match: create + task',
        domain: 'tasks',
        action: 'create',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Sync from conversation (pragmatic rule)
    if ((/\b(update|sync)\b.*\b(task|todo)\b/i.test(lower) ||
         /\b(task|todo)\b.*\b(update|sync)\b/i.test(lower)) &&
        roomContext.taskCount === 0 &&
        roomContext.extractedCommitments.length > 0) {
      return {
        primaryIntent: 'sync_conversation_to_tasks',
        confidence: 0.7,
        reasoning: 'Keyword match: update/sync tasks + 0 tasks + commitments exist',
        domain: 'tasks',
        action: 'sync',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Query tasks
    if (/\b(show|list|view|what|see)\b.*\b(task|todo)\b/i.test(lower)) {
      return {
        primaryIntent: 'query_tasks',
        confidence: 0.7,
        reasoning: 'Keyword match: show/view + tasks',
        domain: 'tasks',
        action: 'read',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Budget-related
    if (/\b(budget|cost|expense|price)\b/i.test(lower)) {
      return {
        primaryIntent: roomContext.hasBudget ? 'query_budget' : 'create_budget',
        confidence: 0.6,
        reasoning: 'Keyword match: budget-related',
        domain: 'budget',
        action: roomContext.hasBudget ? 'read' : 'create',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Vendor-related
    if (/\b(vendor|caterer|photographer|dj|florist)\b/i.test(lower)) {
      return {
        primaryIntent: 'search_vendors',
        confidence: 0.6,
        reasoning: 'Keyword match: vendor-related',
        domain: 'vendors',
        action: 'read',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Default: general question
    return {
      primaryIntent: 'general_question',
      confidence: 0.5,
      reasoning: 'Fallback: no clear keyword match',
      domain: 'general',
      action: 'plan',
      preconditionsMet: true,
      missingInformation: [],
      suggestedClarification: 'I\'m not sure what you\'d like me to do. Could you clarify?'
    };
  }
}
