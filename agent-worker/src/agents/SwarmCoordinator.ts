/**
 * SwarmCoordinator - Multi-Agent Orchestration System
 *
 * Phase 2 Agent Swarm Architecture - Issue delphi-2hk
 *
 * Purpose: Routes requests to specialized agents and handles multi-intent orchestration.
 * Enables parallel execution for compound requests and aggregates responses.
 *
 * Architecture:
 * - Uses TieredIntentDetector for fast intent classification
 * - Routes to specialized agents based on intent domain
 * - Handles multi-intent requests with parallel/sequential execution
 * - Aggregates responses from multiple agents into coherent output
 *
 * Agents:
 * - TaskAgent: Task CRUD, dependencies, commitments
 * - BudgetAgent: Expenses, splits, forecasting
 * - VendorAgent: Search, contracts, negotiation
 * - PlanningAgent: Milestones, timeline coordination
 * - CollaborationAgent: Polls, decisions, voting
 * - GeneralAgent: Fallback for unclassified intents
 */

import { BaseAgent, AgentContext, AgentResponse, AgentResponseBlock } from './BaseAgent';
import { TaskAgent } from './specialized/TaskAgent';
import { BudgetAgent } from './specialized/BudgetAgent';
import { VendorAgent } from './specialized/VendorAgent';
import { PlanningAgent } from './specialized/PlanningAgent';
import { CollaborationAgent } from './specialized/CollaborationAgent';
import { TieredIntentDetector } from './helpers/TieredIntentDetector';
import { Intent, RoomContext } from './helpers/types';
import { Tool } from '../tools';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Agent types available in the swarm
 */
type AgentType = 'tasks' | 'budget' | 'vendors' | 'planning' | 'collaboration' | 'general';

/**
 * Intent routing map
 */
const INTENT_TO_AGENT: Record<string, AgentType> = {
  // Task intents
  task_create: 'tasks',
  task_update: 'tasks',
  task_query: 'tasks',
  task_delete: 'tasks',
  create_task: 'tasks',
  query_tasks: 'tasks',
  update_task: 'tasks',
  delete_task: 'tasks',
  add_task: 'tasks',
  show_tasks: 'tasks',
  list_tasks: 'tasks',

  // Budget intents
  expense_create: 'budget',
  expense_update: 'budget',
  budget_query: 'budget',
  add_expense: 'budget',
  query_budget: 'budget',
  budget_status: 'budget',
  show_budget: 'budget',
  cost_split: 'budget',

  // Vendor intents
  vendor_search: 'vendors',
  vendor_update: 'vendors',
  vendor_query: 'vendors',
  search_vendors: 'vendors',
  find_vendors: 'vendors',
  save_vendor: 'vendors',
  query_vendors: 'vendors',

  // Planning intents
  milestone_create: 'planning',
  timeline_query: 'planning',
  planning_query: 'planning',
  create_milestone: 'planning',
  event_progress: 'planning',
  risk_assessment: 'planning',
  day_of_planning: 'planning',

  // Collaboration intents
  poll_create: 'collaboration',
  decision_record: 'collaboration',
  create_poll: 'collaboration',
  vote: 'collaboration',
  poll_results: 'collaboration',
  record_decision: 'collaboration',
  consensus_check: 'collaboration',
};

/**
 * Aggregated response from multiple agents
 */
interface AggregatedResponse {
  text: string;
  responseBlocks: AgentResponseBlock[];
  structuredData: Record<string, any>;
  toolsUsed: string[];
  agentsInvoked: string[];
  intents: string[];
  confidence: number;
}

/**
 * Intent classification with dependency info
 */
interface ClassifiedIntent {
  intent: Intent;
  agentType: AgentType;
  tier: 'fast' | 'heuristic' | 'cache' | 'ai';
  isIndependent: boolean; // Can run in parallel with others
}

// ============================================================================
// SWARM COORDINATOR
// ============================================================================

export class SwarmCoordinator {
  private agents: Map<AgentType, BaseAgent>;
  private intentDetector: TieredIntentDetector;
  private generalAgent: BaseAgent;
  private env: any;
  private aiKey: string;
  private tools: Tool[];

  constructor(aiKey: string, tools: Tool[], env: any, context: AgentContext) {
    this.aiKey = aiKey;
    this.tools = tools;
    this.env = env;

    // Initialize tiered intent detector
    this.intentDetector = new TieredIntentDetector(env, context);

    // Initialize specialized agents
    this.agents = new Map();
    this.agents.set('tasks', new TaskAgent(aiKey, tools));
    this.agents.set('budget', new BudgetAgent(aiKey, tools));
    this.agents.set('vendors', new VendorAgent(aiKey, tools));
    this.agents.set('planning', new PlanningAgent(aiKey, tools));
    this.agents.set('collaboration', new CollaborationAgent(aiKey, tools));

    // General agent for fallback (using TaskAgent as base for now)
    // In production, this would be a dedicated GeneralAgent
    this.generalAgent = new TaskAgent(aiKey, tools);
  }

  /**
   * Main entry point for handling user requests
   * Routes to appropriate agent(s) based on intent detection
   */
  async handle(
    context: AgentContext,
    roomContext: RoomContext
  ): Promise<AgentResponse> {
    console.log('[SwarmCoordinator] Processing request:', context.message.substring(0, 100));

    try {
      // Step 1: Detect intent(s) using tiered system
      const { intent, tier } = await this.intentDetector.detect(
        context.message,
        roomContext
      );

      console.log(`[SwarmCoordinator] Intent detected: ${intent.primaryIntent} (tier: ${tier}, confidence: ${intent.confidence})`);

      // Step 2: Check for multi-intent patterns
      const multiIntents = this.detectMultiIntent(context.message, intent);

      if (multiIntents.length > 1) {
        console.log(`[SwarmCoordinator] Multi-intent detected: ${multiIntents.length} intents`);
        return await this.handleMultiIntent(context, multiIntents);
      }

      // Step 3: Single intent - route to appropriate agent
      const agentType = this.routeToAgent(intent);
      const agent = this.agents.get(agentType) || this.generalAgent;

      console.log(`[SwarmCoordinator] Routing to ${agentType} agent`);

      const response = await agent.handle(context, {}, intent.primaryIntent);

      // Add routing metadata
      return {
        ...response,
        metadata: {
          ...response.metadata,
          intents: [intent.primaryIntent],
          routedTo: agentType,
          intentTier: tier,
        },
      };

    } catch (error) {
      console.error('[SwarmCoordinator] Error handling request:', error);
      return this.buildErrorResponse(error);
    }
  }

  /**
   * Route intent to appropriate agent type
   */
  private routeToAgent(intent: Intent): AgentType {
    // First check explicit mapping
    const intentKey = intent.primaryIntent.toLowerCase();
    if (INTENT_TO_AGENT[intentKey]) {
      return INTENT_TO_AGENT[intentKey];
    }

    // Check domain from intent
    if (intent.domain) {
      switch (intent.domain) {
        case 'tasks':
          return 'tasks';
        case 'budget':
          return 'budget';
        case 'vendors':
          return 'vendors';
        case 'planning':
          return 'planning';
      }
    }

    // Fallback to keyword matching
    const lower = intentKey;
    if (lower.includes('task')) return 'tasks';
    if (lower.includes('budget') || lower.includes('expense') || lower.includes('cost')) return 'budget';
    if (lower.includes('vendor') || lower.includes('search')) return 'vendors';
    if (lower.includes('plan') || lower.includes('milestone') || lower.includes('timeline')) return 'planning';
    if (lower.includes('poll') || lower.includes('vote') || lower.includes('decision')) return 'collaboration';

    return 'general';
  }

  /**
   * Detect if message contains multiple distinct intents
   */
  private detectMultiIntent(message: string, primaryIntent: Intent): ClassifiedIntent[] {
    const intents: ClassifiedIntent[] = [];
    const lower = message.toLowerCase();

    // Common multi-intent patterns
    const patterns = [
      // Conjunctions indicating multiple actions
      { regex: /and\s+(?:also\s+)?(?:then\s+)?/gi, split: true },
      { regex: /,\s*(?:and\s+)?(?:also\s+)?/gi, split: true },
      { regex: /\.\s+(?:also|then|please)/gi, split: true },
    ];

    // Check for explicit multi-intent keywords
    const hasMultipleActions =
      (lower.includes(' and ') || lower.includes(', ')) &&
      (
        (lower.includes('task') && (lower.includes('budget') || lower.includes('expense'))) ||
        (lower.includes('vendor') && lower.includes('task')) ||
        (lower.includes('poll') && lower.includes('task'))
      );

    if (!hasMultipleActions) {
      // Single intent
      return [{
        intent: primaryIntent,
        agentType: this.routeToAgent(primaryIntent),
        tier: 'ai',
        isIndependent: true,
      }];
    }

    // For now, detect up to 2 distinct intents from common patterns
    // This is a heuristic approach - more sophisticated parsing could use NLP

    // Task + Budget pattern
    if (lower.includes('task') && (lower.includes('budget') || lower.includes('expense'))) {
      intents.push({
        intent: { ...primaryIntent, primaryIntent: 'task_management', domain: 'tasks' },
        agentType: 'tasks',
        tier: 'heuristic',
        isIndependent: true,
      });
      intents.push({
        intent: { ...primaryIntent, primaryIntent: 'budget_query', domain: 'budget' },
        agentType: 'budget',
        tier: 'heuristic',
        isIndependent: true,
      });
      return intents;
    }

    // Vendor + Task pattern
    if (lower.includes('vendor') && lower.includes('task')) {
      intents.push({
        intent: { ...primaryIntent, primaryIntent: 'vendor_search', domain: 'vendors' },
        agentType: 'vendors',
        tier: 'heuristic',
        isIndependent: false, // Task may depend on vendor result
      });
      intents.push({
        intent: { ...primaryIntent, primaryIntent: 'task_create', domain: 'tasks' },
        agentType: 'tasks',
        tier: 'heuristic',
        isIndependent: false,
      });
      return intents;
    }

    // Default: return primary intent only
    return [{
      intent: primaryIntent,
      agentType: this.routeToAgent(primaryIntent),
      tier: 'ai',
      isIndependent: true,
    }];
  }

  /**
   * Handle multi-intent requests with parallel/sequential execution
   */
  private async handleMultiIntent(
    context: AgentContext,
    classifiedIntents: ClassifiedIntent[]
  ): Promise<AgentResponse> {
    console.log(`[SwarmCoordinator] Handling ${classifiedIntents.length} intents`);

    // Separate into independent (parallel) and dependent (sequential) groups
    const independent = classifiedIntents.filter(ci => ci.isIndependent);
    const dependent = classifiedIntents.filter(ci => !ci.isIndependent);

    const allResults: AgentResponse[] = [];
    let priorResults: AgentResponse[] = [];

    // Execute independent intents in parallel
    if (independent.length > 0) {
      console.log(`[SwarmCoordinator] Executing ${independent.length} independent intents in parallel`);

      const parallelPromises = independent.map(async (ci) => {
        const agent = this.agents.get(ci.agentType) || this.generalAgent;
        return agent.handle(context, {}, ci.intent.primaryIntent);
      });

      const parallelResults = await Promise.all(parallelPromises);
      allResults.push(...parallelResults);
      priorResults = parallelResults;
    }

    // Execute dependent intents sequentially
    for (const ci of dependent) {
      console.log(`[SwarmCoordinator] Executing dependent intent: ${ci.intent.primaryIntent}`);

      const agent = this.agents.get(ci.agentType) || this.generalAgent;

      // Inject prior results into context
      const enrichedContext: AgentContext = {
        ...context,
        priorAgentResults: priorResults.map(r => ({
          text: r.text,
          structuredData: r.structuredData,
          intent: r.intent,
        })),
      };

      const result = await agent.handle(enrichedContext, {}, ci.intent.primaryIntent);
      allResults.push(result);
      priorResults.push(result);
    }

    // Aggregate all results
    return this.aggregateResponses(allResults, classifiedIntents);
  }

  /**
   * Aggregate responses from multiple agents into coherent output
   */
  private aggregateResponses(
    responses: AgentResponse[],
    classifiedIntents: ClassifiedIntent[]
  ): AgentResponse {
    // Combine all tools used
    const toolsUsed = new Set<string>();
    for (const r of responses) {
      for (const tool of r.toolsUsed) {
        toolsUsed.add(tool);
      }
    }

    // Combine agents invoked
    const agentsInvoked = classifiedIntents.map(ci => ci.agentType);

    // Combine intents
    const intents = classifiedIntents.map(ci => ci.intent.primaryIntent);

    // Build response blocks
    const responseBlocks: AgentResponseBlock[] = [];
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const intent = classifiedIntents[i];

      // Add text block
      if (r.text) {
        responseBlocks.push({
          type: 'text',
          text: r.text,
        });
      }

      // Add structured data block if present
      if (r.structuredData) {
        responseBlocks.push({
          type: 'component_grid',
          structuredData: r.structuredData,
        });
      }

      // Add component config if present
      if (r.componentConfig) {
        responseBlocks.push({
          type: 'component_grid',
          componentConfig: r.componentConfig,
        });
      }
    }

    // Combine structured data
    const structuredData: Record<string, any> = {};
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const agentType = classifiedIntents[i].agentType;
      if (r.structuredData) {
        structuredData[agentType] = r.structuredData;
      }
    }

    // Calculate aggregate confidence (minimum of all)
    const confidence = Math.min(...responses.map(r => r.confidence));

    // Build combined text narrative
    const combinedText = this.buildCombinedNarrative(responses, classifiedIntents);

    return {
      text: combinedText,
      intent: intents.join(' + '),
      confidence,
      toolsUsed: Array.from(toolsUsed),
      structuredData,
      responseBlocks,
      renderType: 'multi_block',
      metadata: {
        totalIterations: responses.reduce((sum, r) => sum + (r.metadata?.totalIterations || 0), 0),
        wasSuccessful: responses.every(r => r.metadata?.wasSuccessful !== false),
        intents,
        agentsInvoked,
      },
    };
  }

  /**
   * Build combined narrative from multiple agent responses
   */
  private buildCombinedNarrative(
    responses: AgentResponse[],
    classifiedIntents: ClassifiedIntent[]
  ): string {
    if (responses.length === 1) {
      return responses[0].text;
    }

    const parts: string[] = [];

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const agentType = classifiedIntents[i].agentType;

      // Add section header for multi-intent
      const sectionTitle = this.getAgentSectionTitle(agentType);
      parts.push(`### ${sectionTitle}\n\n${r.text}`);
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Get human-readable section title for agent type
   */
  private getAgentSectionTitle(agentType: AgentType): string {
    switch (agentType) {
      case 'tasks':
        return '📋 Tasks';
      case 'budget':
        return '💰 Budget';
      case 'vendors':
        return '🏪 Vendors';
      case 'planning':
        return '📅 Planning';
      case 'collaboration':
        return '🗳️ Collaboration';
      default:
        return '📝 General';
    }
  }

  /**
   * Build error response
   */
  private buildErrorResponse(error: unknown): AgentResponse {
    return {
      text: `I encountered an error processing your request. ${error instanceof Error ? error.message : 'Please try again.'}`,
      intent: 'error',
      confidence: 0.5,
      toolsUsed: [],
      metadata: {
        wasSuccessful: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }

  /**
   * Get metrics from intent detector
   */
  getIntentMetrics() {
    return this.intentDetector.getStats();
  }
}

// Extend AgentContext to support prior results
declare module './BaseAgent' {
  interface AgentContext {
    priorAgentResults?: Array<{
      text: string;
      structuredData?: any;
      intent: string;
    }>;
  }
}
