import { Tool, ToolResult } from '../tools';

export interface AgentContext {
  message: string;
  threadContext?: Array<{ author: string; text: string; isAI: boolean }>;
  recentMessages: any[];
  eventContext?: any;
  roomId: string;
  eventId?: string;

  // Track 3 v3.1: Room-type-aware context properties
  canAccessEventWide?: boolean;
  roomSummaries?: Array<{
    roomId: string;
    roomName: string;
    roomType: string;
    participantCount: number;
    lastActivity: number;
  }>;
  eventStats?: {
    totalRooms: number;
    taskCount: number;
    vendorCount: number;
    hasBudget: boolean;
  };
  scopedToVendor?: boolean;
  vendorId?: string;
  vendorInfo?: {
    name: string;
    category: string;
    contractStatus: string;
    contactInfo: any;
  };
  scope?: 'event-wide' | 'vendor-specific' | 'brainstorm' | 'private';
  focusMode?: 'ideation' | 'participant-focused';

  // Track 4: Component metadata for dynamic UI generation
  availableComponents?: string;

  // Auto-injected context (automatically provided to all operations)
  autoContext?: {
    userId: string;
    eventId: string;
    roomId: string;
    timestamp: number;
    userInfo: {
      name: string;
      id: string;
    };
  };
}

export interface AgentResponseBlock {
  type: "text" | "component_grid" | "proposal" | "interactive_prompt";
  text?: string;
  structuredData?: any;
  componentConfig?: {
    sections: Array<{
      type: "text" | "grid";
      content?: string;
      components?: Array<{
        type: string;
        props: Record<string, any>;
      }>;
    }>;
  };
  interactivePrompt?: {
    promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
    data: any;
    responses?: any[];
  };
  proposalData?: {
    proposalType: 'tasks' | 'budget_entries' | 'vendor_suggestions';
    items: any[];
    metadata?: any;
  };
}

export interface AgentResponse {
  text: string;
  intent: string;
  confidence: number;
  toolsUsed: string[];
  structuredData?: any;
  suggestions?: string[];
  metadata?: {
    iterations?: LoopIteration[];
    totalIterations?: number;
    abortReason?: string;
    wasSuccessful?: boolean;
    intents?: string[]; // For multi-intent responses
  };

  // Track 4 rendering fields (for advanced UI components)
  renderType?: "text" | "component_grid" | "interactive_prompt" | "mixed" | "multi_block";
  componentConfig?: {
    sections: Array<{
      type: "text" | "grid";
      content?: string;
      components?: Array<{
        type: string;
        props: Record<string, any>;
      }>;
    }>;
  };
  interactivePrompt?: {
    promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
    data: any;
    responses?: any[];
  };

  // Multi-block responses for complex multi-intent messages
  responseBlocks?: AgentResponseBlock[];
}

export interface LoopIteration {
  iteration: number;
  timestamp: number;
  reasoning?: string;
  action?: {
    tool: string;
    params: any;
  };
  observation?: {
    success: boolean;
    data?: any;
    error?: string;
    duration?: number;
  };
  decision?: 'continue' | 'retry' | 'complete' | 'abort';
}

export interface LoopState {
  iterations: LoopIteration[];
  currentIteration: number;
  consecutiveErrors: Map<string, number>;
  isComplete: boolean;
  finalResult?: AgentResponse;
  abortReason?: string;
}

export interface ParsedAIResponse {
  reasoning?: string;          // AI's thought process
  action?: {                   // Tool to execute
    tool: string;
    params: any;
  };
  decision?: 'continue' | 'complete' | 'abort';
  finalMessage?: string;       // For COMPLETE/ABORT
}

export interface AgenticLoopConfig {
  maxIterations: number;        // Default: 5
  maxConsecutiveErrors: number; // Default: 3
  enableThinking: boolean;      // Default: true
  trackHistory: boolean;        // Default: true
  reasoningBudget?: number;     // Optional: limits pure reasoning iterations
  actionBudget?: number;        // Optional: limits tool execution iterations
}

export interface ExecutionState {
  iteration: number;
  tasksCreated: Array<{ id: string; title: string }>;
  tasksQueried: Array<{ id: string; title: string }>;
  budgetData?: any;
  vendorsFound?: any[];
  errors: Array<{ iteration: number; error: string; recovered: boolean }>;
  progressSummary: string;
}

export interface IterationConfig {
  maxIterations: number;
  reasoningBudget: number;
  actionBudget: number;
  description: string;
}

const DEFAULT_CONFIG: AgenticLoopConfig = {
  maxIterations: 5,
  maxConsecutiveErrors: 3,
  enableThinking: true,
  trackHistory: true,
};

export abstract class BaseAgent {
  protected tools: Map<string, Tool>;
  protected aiKey: string;
  protected agentType: string;
  protected executionState: ExecutionState;

  constructor(agentType: string, aiKey: string, tools: Tool[]) {
    this.agentType = agentType;
    this.aiKey = aiKey;
    this.tools = new Map(tools.map(t => [t.name, t]));
    this.executionState = {
      iteration: 0,
      tasksCreated: [],
      tasksQueried: [],
      errors: [],
      progressSummary: '',
    };
  }

  abstract getSystemPrompt(context: AgentContext): string;
  abstract getIntent(): string;

  /**
   * Extract unique tools used from iteration history
   */
  private extractToolsUsed(iterations: LoopIteration[]): string[] {
    const tools = new Set<string>();
    for (const iter of iterations) {
      if (iter.action?.tool) {
        tools.add(iter.action.tool);
      }
    }
    return Array.from(tools);
  }

  /**
   * Build component response for Fluid UI rendering
   * Override this in subclasses to provide custom component rendering logic
   * @param intent The user intent
   * @param data The tool result data
   * @param context The agent context
   * @returns Partial response with renderType and componentConfig
   */
  protected buildComponentResponse(
    intent: string,
    data: any,
    context: AgentContext
  ): Partial<AgentResponse> {
    // Default implementation: no component rendering
    // Subclasses like UnifiedDelphiAgent override this to provide Fluid UI components
    return {};
  }

  /**
   * Extract structured data from successful tool executions for Fluid UI rendering
   * @param iterations The iterations from the agentic loop
   * @param intent Optional intent to determine data type
   * @returns Structured data for the response
   */
  private extractStructuredDataFromIterations(iterations: LoopIteration[], intent?: string): any {
    // Find the last successful tool execution with data
    for (let i = iterations.length - 1; i >= 0; i--) {
      const iter = iterations[i];
      if (iter.observation?.success && iter.observation?.data !== undefined) {
        const data = iter.observation.data;
        const tool = iter.action?.tool;

        // Format the data appropriately based on operation type
        if (tool === 'convex_crud' && intent) {
          const intentLower = intent.toLowerCase();

          // For query/read operations, wrap data with metadata
          if (intentLower.includes('query') || intentLower.includes('show') ||
              intentLower.includes('list') || intentLower.includes('get')) {
            return {
              type: 'query_result',
              operation: 'read',
              data: data,
              count: Array.isArray(data) ? data.length : (data ? 1 : 0),
              timestamp: Date.now()
            };
          }

          // For create operations, include created items
          if (intentLower.includes('create') || intentLower.includes('add')) {
            return {
              type: 'create_result',
              operation: 'create',
              data: data,
              count: Array.isArray(data) ? data.length : 1,
              timestamp: Date.now()
            };
          }
        }

        // For other tools or operations, return data as-is
        return data;
      }
    }

    // No successful tool execution with data found
    return undefined;
  }

  /**
   * Generate a concise progress summary
   */
  private generateProgressSummary(): string {
    const parts: string[] = [];

    if (this.executionState.tasksCreated.length > 0) {
      parts.push(`Created ${this.executionState.tasksCreated.length} task(s)`);
    }

    if (this.executionState.tasksQueried.length > 0) {
      parts.push(`Found ${this.executionState.tasksQueried.length} task(s)`);
    }

    if (this.executionState.budgetData) {
      parts.push('Retrieved budget data');
    }

    if (this.executionState.vendorsFound && this.executionState.vendorsFound.length > 0) {
      parts.push(`Found ${this.executionState.vendorsFound.length} vendor(s)`);
    }

    const unresolvedErrors = this.executionState.errors.filter(e => !e.recovered).length;
    if (unresolvedErrors > 0) {
      parts.push(`${unresolvedErrors} unresolved error(s)`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No progress yet';
  }

  /**
   * Format execution state for inclusion in prompts
   */
  private formatExecutionState(): string {
    const lines: string[] = [];

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('EXECUTION STATE (What I\'ve Done So Far)');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Progress summary
    lines.push(`\nProgress: ${this.executionState.progressSummary}`);

    // Tasks created
    if (this.executionState.tasksCreated.length > 0) {
      lines.push('\nTasks Created:');
      this.executionState.tasksCreated.forEach(task => {
        lines.push(`  ✓ ${task.title} (ID: ${task.id})`);
      });
    }

    // Tasks queried
    if (this.executionState.tasksQueried.length > 0) {
      lines.push('\nTasks Queried:');
      this.executionState.tasksQueried.slice(0, 5).forEach(task => {
        lines.push(`  • ${task.title} (ID: ${task.id})`);
      });
      if (this.executionState.tasksQueried.length > 5) {
        lines.push(`  ... and ${this.executionState.tasksQueried.length - 5} more`);
      }
    }

    // Budget data
    if (this.executionState.budgetData) {
      lines.push('\nBudget Data: Retrieved ✓');
    }

    // Vendors found
    if (this.executionState.vendorsFound && this.executionState.vendorsFound.length > 0) {
      lines.push(`\nVendors Found: ${this.executionState.vendorsFound.length}`);
    }

    // Errors
    if (this.executionState.errors.length > 0) {
      lines.push('\nErrors Encountered:');
      this.executionState.errors.forEach(err => {
        const status = err.recovered ? '✓ Recovered' : '✗ Unresolved';
        lines.push(`  [Iter ${err.iteration}] ${status}: ${err.error.substring(0, 60)}...`);
      });
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  /**
   * Check if goal has been achieved based on intent and execution state
   */
  private isGoalAchieved(intent: string, context: AgentContext): boolean {
    const intentLower = intent.toLowerCase();

    // Query operations - goal achieved if we found/queried data
    if (
      intentLower.includes('query') ||
      intentLower.includes('show') ||
      intentLower.includes('get') ||
      intentLower.includes('list')
    ) {
      return (
        this.executionState.tasksQueried.length > 0 ||
        this.executionState.budgetData !== undefined ||
        Boolean(this.executionState.vendorsFound && this.executionState.vendorsFound.length > 0)
      );
    }

    // Single create task - goal achieved if at least 1 task created
    if (
      intentLower.includes('create_task') ||
      intentLower.includes('add_task') ||
      intentLower.includes('new_task')
    ) {
      return this.executionState.tasksCreated.length >= 1;
    }

    // Bulk create - goal achieved if at least 3 tasks created
    if (
      intentLower.includes('create_multiple') ||
      intentLower.includes('bulk') ||
      intentLower.includes('several')
    ) {
      return this.executionState.tasksCreated.length >= 3;
    }

    // Update operations - check if we have updated data returned
    if (intentLower.includes('update') || intentLower.includes('modify') || intentLower.includes('edit')) {
      // For updates, we consider it successful if we didn't encounter unresolved errors
      const unresolvedErrors = this.executionState.errors.filter(e => !e.recovered).length;
      return unresolvedErrors === 0 && this.executionState.iteration > 0;
    }

    // Search/vendor operations - goal achieved if vendors found
    if (
      intentLower.includes('search') ||
      intentLower.includes('vendor') ||
      intentLower.includes('find')
    ) {
      return this.executionState.vendorsFound !== undefined && this.executionState.vendorsFound.length > 0;
    }

    // For other operations, we can't automatically determine completion
    return false;
  }

  /**
   * Get iteration config based on intent type
   */
  protected getIterationConfig(intent: string, context: AgentContext): IterationConfig {
    const intentLower = intent.toLowerCase();

    // Simple query operations - fast turnaround
    if (
      intentLower.includes('query_tasks') ||
      intentLower.includes('query_budget') ||
      intentLower.includes('show') ||
      intentLower.includes('get') ||
      intentLower.includes('list')
    ) {
      console.log(`[${this.agentType}] Using QUERY config for intent: ${intent}`);
      return {
        maxIterations: 3,
        reasoningBudget: 1,
        actionBudget: 2,
        description: 'Simple query operation',
      };
    }

    // Single create operations
    if (
      intentLower.includes('create_task') ||
      intentLower.includes('add_task') ||
      intentLower.includes('new_task')
    ) {
      console.log(`[${this.agentType}] Using CREATE config for intent: ${intent}`);
      return {
        maxIterations: 5,
        reasoningBudget: 2,
        actionBudget: 3,
        description: 'Single entity creation',
      };
    }

    // Update operations - need retry tolerance
    if (
      intentLower.includes('update') ||
      intentLower.includes('modify') ||
      intentLower.includes('edit')
    ) {
      console.log(`[${this.agentType}] Using UPDATE config for intent: ${intent}`);
      return {
        maxIterations: 7,
        reasoningBudget: 2,
        actionBudget: 5,
        description: 'Update operation with retry tolerance',
      };
    }

    // Bulk operations - need high action budget
    if (
      intentLower.includes('create_multiple') ||
      intentLower.includes('bulk') ||
      intentLower.includes('several') ||
      intentLower.includes('many')
    ) {
      console.log(`[${this.agentType}] Using BULK config for intent: ${intent}`);
      return {
        maxIterations: 20,
        reasoningBudget: 3,
        actionBudget: 15,
        description: 'Bulk operation',
      };
    }

    // Complex planning operations
    if (
      intentLower.includes('plan') ||
      intentLower.includes('organize') ||
      intentLower.includes('schedule') ||
      intentLower.includes('general_planning')
    ) {
      console.log(`[${this.agentType}] Using PLANNING config for intent: ${intent}`);
      return {
        maxIterations: 25,
        reasoningBudget: 5,
        actionBudget: 18,
        description: 'Complex planning operation',
      };
    }

    // Web search and vendor operations
    if (
      intentLower.includes('search') ||
      intentLower.includes('vendor') ||
      intentLower.includes('find')
    ) {
      console.log(`[${this.agentType}] Using SEARCH config for intent: ${intent}`);
      return {
        maxIterations: 12,
        reasoningBudget: 2,
        actionBudget: 10, // Increased from 5 to allow multiple web scrapes
        description: 'Search operation',
      };
    }

    // Default fallback
    console.log(`[${this.agentType}] Using DEFAULT config for intent: ${intent}`);
    return {
      maxIterations: 10,
      reasoningBudget: 3,
      actionBudget: 7,
      description: 'Default operation',
    };
  }

  /**
   * Update execution state after tool execution
   */
  protected updateState(toolResult: ToolResult, action: { tool: string; params: any }): void {
    // Mark previous errors as recovered if this action succeeded
    if (toolResult.success && this.executionState.errors.length > 0) {
      const lastError = this.executionState.errors[this.executionState.errors.length - 1];
      if (!lastError.recovered) {
        lastError.recovered = true;
      }
    }

    // Track errors if failed
    if (!toolResult.success && toolResult.error) {
      this.executionState.errors.push({
        iteration: this.executionState.iteration,
        error: toolResult.error,
        recovered: false,
      });
    }

    // Track created/queried entities based on tool and operation
    if (toolResult.success && toolResult.data) {
      const toolName = action.tool.toLowerCase();
      const params = action.params;

      // Handle Convex CRUD operations
      if (toolName === 'convex_crud') {
        const operation = params.operation?.toLowerCase();
        const table = params.table?.toLowerCase();

        // Track task operations
        if (table === 'tasks') {
          if (operation === 'create' && toolResult.data._id) {
            this.executionState.tasksCreated.push({
              id: toolResult.data._id,
              title: toolResult.data.title || params.data?.title || 'Untitled Task',
            });
          } else if (operation === 'read' || operation === 'query' || operation === 'list') {
            const tasks = Array.isArray(toolResult.data) ? toolResult.data : [toolResult.data];
            for (const task of tasks) {
              if (task._id && !this.executionState.tasksQueried.find(t => t.id === task._id)) {
                this.executionState.tasksQueried.push({
                  id: task._id,
                  title: task.title || 'Untitled Task',
                });
              }
            }
          }
        }

        // Track budget operations
        if (table === 'budgets') {
          this.executionState.budgetData = toolResult.data;
        }

        // Track vendor operations
        if (table === 'vendors') {
          if (operation === 'read' || operation === 'query' || operation === 'list') {
            this.executionState.vendorsFound = Array.isArray(toolResult.data)
              ? toolResult.data
              : [toolResult.data];
          }
        }
      }

      // Handle web search/vendor search operations
      if (toolName.includes('search') || toolName.includes('vendor')) {
        if (Array.isArray(toolResult.data)) {
          this.executionState.vendorsFound = toolResult.data;
        }
      }
    }

    // Update progress summary
    this.executionState.progressSummary = this.generateProgressSummary();
  }

  async handle(
    context: AgentContext,
    config: Partial<AgenticLoopConfig> = {},
    intent?: string
  ): Promise<AgentResponse> {
    console.log(`[${this.agentType}] Handling request with ReAct loop`);

    // Reset execution state for new request
    this.executionState = {
      iteration: 0,
      tasksCreated: [],
      tasksQueried: [],
      errors: [],
      progressSummary: 'Starting execution...',
    };

    // Get dynamic iteration config based on intent (if provided)
    let iterationConfig: IterationConfig | undefined;
    if (intent) {
      iterationConfig = this.getIterationConfig(intent, context);
      console.log(`[${this.agentType}] Iteration config: ${iterationConfig.description}`, {
        maxIterations: iterationConfig.maxIterations,
        reasoningBudget: iterationConfig.reasoningBudget,
        actionBudget: iterationConfig.actionBudget,
      });
    }

    // Merge config with defaults, using dynamic config if available
    const loopConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      ...(iterationConfig && {
        maxIterations: iterationConfig.maxIterations,
        reasoningBudget: iterationConfig.reasoningBudget,
        actionBudget: iterationConfig.actionBudget,
      }),
    };

    // Track reasoning vs action iterations
    let reasoningCount = 0;
    let actionCount = 0;

    // Initialize loop state
    const state: LoopState = {
      iterations: [],
      currentIteration: 0,
      consecutiveErrors: new Map<string, number>(),
      isComplete: false,
    };

    // Get context for prompts
    const systemPrompt = this.getSystemPrompt(context);
    const toolDescriptions = this.buildToolDescriptions();
    const conversationContext = this.buildConversationContext(context);

    // Main ReAct loop
    try {
      while (state.currentIteration < loopConfig.maxIterations && !state.isComplete) {
        const currentIter: LoopIteration = {
          iteration: state.currentIteration + 1,
          timestamp: Date.now(),
        };

        // Build prompt for this iteration
        const iterationPrompt = this.buildIterationPrompt({
          systemPrompt,
          toolDescriptions,
          conversationContext,
          userMessage: context.message,
          previousIterations: state.iterations,
          isFirstIteration: state.currentIteration === 0,
          iterationNumber: state.currentIteration + 1,
          maxIterations: loopConfig.maxIterations,
          actionCount,
          actionBudget: loopConfig.actionBudget,
        });

        // Call AI and parse response
        console.log(`[${this.agentType}] Iteration ${state.currentIteration + 1}/${loopConfig.maxIterations}`);
        const aiResponse = await this.callAI(iterationPrompt);
        const parsed = this.parseAIResponse(aiResponse);

        // Store reasoning
        currentIter.reasoning = parsed.reasoning;

        // Track reasoning if no action will be taken
        if (parsed.decision === 'complete' || parsed.decision === 'abort' || !parsed.action) {
          reasoningCount++;
          if (loopConfig.reasoningBudget && reasoningCount > loopConfig.reasoningBudget) {
            console.warn(`[${this.agentType}] Exceeded reasoning budget (${reasoningCount}/${loopConfig.reasoningBudget}) - aborting`);

            // ABORT instead of continuing
            currentIter.decision = 'abort';
            currentIter.observation = {
              success: false,
              error: `Exceeded reasoning budget (${reasoningCount}/${loopConfig.reasoningBudget})`,
            };
            state.iterations.push(currentIter);
            state.finalResult = {
              text: `I analyzed the situation but couldn't find a clear action to take. ${parsed.reasoning || ''}`,
              intent: this.getIntent(),
              confidence: 0.6,
              toolsUsed: this.extractToolsUsed(state.iterations),
              metadata: {
                iterations: loopConfig.trackHistory ? state.iterations : undefined,
                totalIterations: state.currentIteration + 1,
                abortReason: 'Exceeded reasoning budget',
                wasSuccessful: false,
                partialSuccess: false,
              },
            };
            state.isComplete = true;
            break;
          }
        }

        // Handle AI decisions
        if (parsed.decision === 'complete') {
          // AI decided task is complete without tools
          console.log(`[${this.agentType}] AI decided to COMPLETE`);
          currentIter.decision = 'complete';
          state.iterations.push(currentIter);

          // Extract structured data from last successful tool execution
          const structuredData = this.extractStructuredDataFromIterations(state.iterations, intent);

          // Build component response for Fluid UI rendering (if subclass implements it)
          const componentResponse = this.buildComponentResponse(intent || '', structuredData, context);

          state.finalResult = {
            text: parsed.finalMessage || parsed.reasoning || 'Task completed.',
            intent: this.getIntent(),
            confidence: 0.9,
            toolsUsed: this.extractToolsUsed(state.iterations),
            structuredData,
            ...componentResponse, // Merge renderType and componentConfig if provided
            metadata: {
              iterations: loopConfig.trackHistory ? state.iterations : undefined,
              totalIterations: state.currentIteration + 1,
              wasSuccessful: true,
            },
          };
          state.isComplete = true;
          break;
        }

        if (parsed.decision === 'abort') {
          // AI decided task is impossible
          console.log(`[${this.agentType}] AI decided to ABORT`);
          currentIter.decision = 'abort';
          state.iterations.push(currentIter);
          const abortMessage = this.buildAbortMessage(parsed, state);
          state.finalResult = {
            text: abortMessage,
            intent: this.getIntent(),
            confidence: 0.7,
            toolsUsed: this.extractToolsUsed(state.iterations),
            metadata: {
              iterations: loopConfig.trackHistory ? state.iterations : undefined,
              totalIterations: state.currentIteration + 1,
              abortReason: parsed.finalMessage,
              wasSuccessful: false,
            },
          };
          state.isComplete = true;
          break;
        }

        // AI wants to use a tool
        if (parsed.action) {
          const { tool: toolName, params } = parsed.action;
          currentIter.action = parsed.action;

          // Track action count and check budget
          actionCount++;

          // Check if exceeded budget BEFORE executing the tool
          if (loopConfig.actionBudget && actionCount > loopConfig.actionBudget) {
            console.warn(`[${this.agentType}] Exceeded action budget (${actionCount}/${loopConfig.actionBudget})`);
            currentIter.decision = 'abort';
            state.iterations.push(currentIter);

            // Extract partial results from completed iterations
            const partialData = this.extractStructuredDataFromIterations(state.iterations, intent);
            const hasPartialResults = partialData !== undefined;

            // Build message explaining what was accomplished
            const progressSummary = this.executionState.progressSummary !== 'No progress yet'
              ? `\n\nWhat I accomplished:\n${this.executionState.progressSummary}`
              : '';

            state.finalResult = {
              text: `I ran out of time while working on your request.${progressSummary}\n\nI exceeded my action budget (${loopConfig.actionBudget} actions). ${hasPartialResults ? 'I\'ve included the partial results I found above.' : 'Please try breaking this into smaller steps or be more specific.'}`,
              intent: this.getIntent(),
              confidence: hasPartialResults ? 0.7 : 0.5,
              toolsUsed: this.extractToolsUsed(state.iterations),
              structuredData: partialData,
              metadata: {
                iterations: loopConfig.trackHistory ? state.iterations : undefined,
                totalIterations: state.currentIteration + 1,
                abortReason: 'Exceeded action budget',
                wasSuccessful: false,
                partialSuccess: hasPartialResults,
              },
            };
            state.isComplete = true;
            break;
          }

          // Warn at 80% budget threshold - don't execute tool yet, just warn in next iteration
          if (loopConfig.actionBudget && actionCount === Math.ceil(loopConfig.actionBudget * 0.8)) {
            console.warn(`[${this.agentType}] Approaching action budget (${actionCount}/${loopConfig.actionBudget} = 80%)`);
          }

          // Validate tool exists
          const tool = this.tools.get(toolName);
          if (!tool) {
            console.error(`[${this.agentType}] Unknown tool: ${toolName}`);
            currentIter.observation = {
              success: false,
              error: `Tool not found: ${toolName}. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
            };
            currentIter.decision = 'retry';
            state.iterations.push(currentIter);

            // Use actual error message as key to detect true repeated failures
            const errorKey = currentIter.observation.error || 'unknown_error';
            this.trackError(state, errorKey);

            if (this.isStuckInLoop(state, errorKey, loopConfig.maxConsecutiveErrors)) {
              // Update last iteration decision to abort
              currentIter.decision = 'abort';
              const stuckMessage = this.buildStuckMessage(currentIter.observation.error, state);
              state.finalResult = {
                text: stuckMessage,
                intent: this.getIntent(),
                confidence: 0.5,
                toolsUsed: this.extractToolsUsed(state.iterations),
                metadata: {
                  iterations: loopConfig.trackHistory ? state.iterations : undefined,
                  totalIterations: state.currentIteration + 1,
                  abortReason: 'Stuck in error loop',
                  wasSuccessful: false,
                },
              };
              state.isComplete = true;
              break;
            }

            state.currentIteration++;
            this.executionState.iteration = state.currentIteration;
            continue;
          }

          // Execute tool
          console.log(`[${this.agentType}] Executing tool: ${toolName}`);
          const startTime = Date.now();
          const toolResult = await tool.execute(params);
          const measuredDuration = Date.now() - startTime;

          // Record observation (only include error field if there's an error)
          // Use tool's reported duration if available, otherwise use measured duration
          const duration = toolResult.metadata?.duration ?? measuredDuration;
          currentIter.observation = {
            success: toolResult.success,
            ...(toolResult.data !== undefined && { data: toolResult.data }),
            ...(toolResult.error && { error: toolResult.error }),
            duration,
          };

          // Update execution state after tool execution
          this.executionState.iteration = state.currentIteration + 1;
          this.updateState(toolResult, parsed.action);

          // Check if tool succeeded
          if (toolResult.success) {
            // Success! Update state and check if goal achieved
            console.log(`[${this.agentType}] Tool succeeded`);
            currentIter.decision = 'continue';
            state.iterations.push(currentIter);

            // Check if goal is achieved (early completion)
            if (intent && this.isGoalAchieved(intent, context)) {
              console.log(`[${this.agentType}] Goal achieved! Completing early.`);
              const successPrompt = this.buildSuccessInterpretationPrompt(toolName, toolResult, state);
              const finalAiResponse = await this.callAI(successPrompt);

              // Build component response for Fluid UI rendering (if subclass implements it)
              const componentResponse = this.buildComponentResponse(intent, toolResult.data, context);

              state.finalResult = {
                text: finalAiResponse,
                intent: this.getIntent(),
                confidence: 0.95,
                toolsUsed: this.extractToolsUsed(state.iterations),
                structuredData: toolResult.data,
                ...componentResponse, // Merge renderType and componentConfig if provided
                metadata: {
                  iterations: loopConfig.trackHistory ? state.iterations : undefined,
                  totalIterations: state.currentIteration + 1,
                  wasSuccessful: true,
                },
              };
              state.isComplete = true;
              break;
            }

            // Continue to next iteration with updated state
            state.currentIteration++;
            this.executionState.iteration = state.currentIteration;
            continue;
          }

          // Tool failed - track error and check if stuck
          // Use actual error message as key to detect true repeated failures
          const errorKey = toolResult.error || 'unknown_error';
          this.trackError(state, errorKey);

          if (this.isStuckInLoop(state, errorKey, loopConfig.maxConsecutiveErrors)) {
            // Stuck in same error loop
            console.log(`[${this.agentType}] Stuck in error loop: ${errorKey}`);
            currentIter.decision = 'abort';
            state.iterations.push(currentIter);

            const stuckMessage = this.buildStuckMessage(toolResult.error, state);
            state.finalResult = {
              text: stuckMessage,
              intent: this.getIntent(),
              confidence: 0.5,
              toolsUsed: this.extractToolsUsed(state.iterations),
              metadata: {
                iterations: loopConfig.trackHistory ? state.iterations : undefined,
                totalIterations: state.currentIteration + 1,
                abortReason: 'Stuck in error loop',
                wasSuccessful: false,
              },
            };
            state.isComplete = true;
            break;
          }

          // Continue to next iteration (retry with error feedback)
          console.log(`[${this.agentType}] Tool failed, will retry. Error: ${toolResult.error}`);
          currentIter.decision = 'retry';
          state.iterations.push(currentIter);
        } else {
          // No action parsed and no decision - parsing failed
          const errorKey = 'parsing_failure';
          this.trackError(state, errorKey);

          if (this.isStuckInLoop(state, errorKey, 2)) {  // Only 2 parse failures allowed
            console.error(`[${this.agentType}] Repeated parsing failures (${state.consecutiveErrors.get(errorKey)}), aborting`);
            currentIter.decision = 'abort';
            currentIter.observation = {
              success: false,
              error: 'Repeated parsing failures - aborting to prevent infinite loop',
            };
            state.iterations.push(currentIter);
            state.finalResult = {
              text: 'I had trouble understanding how to proceed with your request. Could you rephrase it or provide more details?',
              intent: this.getIntent(),
              confidence: 0.4,
              toolsUsed: this.extractToolsUsed(state.iterations),
              metadata: {
                iterations: loopConfig.trackHistory ? state.iterations : undefined,
                totalIterations: state.currentIteration + 1,
                abortReason: 'Repeated parsing failures',
                wasSuccessful: false,
                partialSuccess: false,
              },
            };
            state.isComplete = true;
            break;
          }

          console.error(`[${this.agentType}] Failed to parse AI response, will retry (attempt ${state.consecutiveErrors.get(errorKey)}/2)`);
          currentIter.observation = {
            success: false,
            error: 'Failed to parse AI response - retrying with clearer instructions',
          };
          state.iterations.push(currentIter);
        }

        state.currentIteration++;
      }

      // Check if we exited due to max iterations
      if (!state.isComplete) {
        console.log(`[${this.agentType}] Max iterations (${loopConfig.maxIterations}) reached`);
        const maxIterMessage = this.buildMaxIterationsMessage(state);
        state.finalResult = {
          text: maxIterMessage,
          intent: this.getIntent(),
          confidence: 0.6,
          toolsUsed: this.extractToolsUsed(state.iterations),
          metadata: {
            iterations: loopConfig.trackHistory ? state.iterations : undefined,
            totalIterations: state.currentIteration,
            abortReason: 'max iterations reached',
            wasSuccessful: false,
          },
        };
      }

      return state.finalResult!;

    } catch (error) {
      // Handle unexpected execution errors
      console.error(`[${this.agentType}] Execution error:`, error);
      const errorMessage = this.buildExecutionErrorMessage(error, state);
      return {
        text: errorMessage,
        intent: this.getIntent(),
        confidence: 0.3,
        toolsUsed: this.extractToolsUsed(state.iterations),
        metadata: {
          iterations: loopConfig.trackHistory ? state.iterations : undefined,
          totalIterations: state.currentIteration,
          abortReason: error instanceof Error ? error.message : 'Unknown error',
          wasSuccessful: false,
        },
      };
    }
  }

  /**
   * Build tool descriptions for prompt
   */
  protected buildToolDescriptions(): string {
    return Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');
  }

  /**
   * Build conversation context including recent messages and thread context
   */
  protected buildConversationContext(context: AgentContext): string {
    const recent = context.recentMessages
      .map(m => `${m.author?.name || 'Unknown'}: ${m.text}`)
      .join('\n');

    if (context.threadContext) {
      const thread = context.threadContext
        .map(m => `${m.author}: ${m.text}`)
        .join('\n');
      return `Recent Conversation:\n${recent}\n\nThread Context:\n${thread}`;
    }

    return recent;
  }

  /**
   * Build iteration summary for retry prompts
   */
  protected buildIterationSummary(iterations: LoopIteration[]): string {
    return iterations.map((iter, idx) => {
      const status = iter.observation?.success ? '✓' : '✗';
      const desc = iter.observation?.error
        ? `Failed: ${iter.observation.error.substring(0, 60)}...`
        : iter.observation?.success
          ? 'Success'
          : 'Analysis';
      return `Attempt ${idx + 1}: ${status} ${desc}`;
    }).join('\n');
  }

  /**
   * Build success journey for final response
   */
  protected buildSuccessJourney(iterations: LoopIteration[]): string {
    if (iterations.length === 1) {
      return 'Success on first attempt ✓';
    }

    return iterations.map((iter, idx) => {
      const status = iter.observation?.success ? '✓' : '✗';
      const desc = iter.observation?.error
        ? `Failed: ${iter.observation.error.substring(0, 50)}...`
        : iter.observation?.success
          ? 'Success'
          : 'Analysis';
      return `Attempt ${idx + 1}: ${status} ${desc}`;
    }).join('\n');
  }

  /**
   * Build prompt for current iteration
   */
  protected buildIterationPrompt(params: {
    systemPrompt: string;
    toolDescriptions: string;
    conversationContext: string;
    userMessage: string;
    previousIterations: LoopIteration[];
    isFirstIteration: boolean;
    iterationNumber: number;
    maxIterations: number;
    actionCount: number;
    actionBudget?: number;
  }): string {
    // Check if approaching budget (80-90% threshold)
    const approachingBudget = params.actionBudget && params.actionCount >= Math.ceil(params.actionBudget * 0.8);
    const budgetWarning = approachingBudget
      ? `\n\n⚠️ BUDGET WARNING: You've used ${params.actionCount} of ${params.actionBudget} allowed actions (${Math.round((params.actionCount / params.actionBudget!) * 100)}%). You have ${params.actionBudget! - params.actionCount} actions remaining. WRAP UP SOON with what you've found so far!\n`
      : '';

    if (params.isFirstIteration) {
      return `${params.systemPrompt}

Available Tools:
${params.toolDescriptions}

Recent Conversation:
${params.conversationContext}

User Request: ${params.userMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENTIC LOOP INSTRUCTIONS (Iteration 1 of ${params.maxIterations})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${budgetWarning}
You are in an agentic loop following the ReAct pattern:
THINK → ACT → OBSERVE → REPEAT

Your response MUST use this exact format:

REASONING: <explain your thought process - what you plan to do and why>
ACTION: <tool_name>
PARAMS: <JSON object with parameters>

OR if you can answer without tools:

REASONING: <explain why no tool is needed>
COMPLETE: <natural language response to user>

OR if the task is impossible:

REASONING: <explain why this cannot be done>
ABORT: <explanation for user>

Be specific and actionable. You will see the results and can retry if needed.

Response:`;
    }

    // Build retry prompt after failure
    const lastIteration = params.previousIterations[params.previousIterations.length - 1];

    // Include execution state if we have progress
    const executionStateSection = this.executionState.progressSummary !== 'No progress yet'
      ? `\n${this.formatExecutionState()}\n`
      : '';

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENTIC LOOP - Iteration ${params.iterationNumber} of ${params.maxIterations}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${budgetWarning}${executionStateSection}
PREVIOUS ATTEMPT SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.buildIterationSummary(params.previousIterations)}

LAST ATTEMPT (Iteration ${lastIteration.iteration}):
Your reasoning: ${lastIteration.reasoning}
Tool used: ${lastIteration.action?.tool}
Parameters: ${JSON.stringify(lastIteration.action?.params, null, 2)}

RESULT: ${lastIteration.observation?.success ? 'SUCCESS ✓' : 'FAILED ✗'}
${lastIteration.observation?.error ? `Error: ${lastIteration.observation.error}` : ''}
${lastIteration.observation?.data ? `Data: ${JSON.stringify(lastIteration.observation.data, null, 2)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU SHOULD DO NOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: Review the EXECUTION STATE above to see what you've already accomplished.
DO NOT duplicate work that's already been done (e.g., don't create tasks that already exist).
${approachingBudget ? '\n⚠️ CRITICAL: You are running low on actions! Consider using COMPLETE to wrap up with what you have instead of taking more actions.\n' : ''}
Analyze the situation and choose ONE:

1. RETRY with DIFFERENT parameters (e.g., fix validation errors, adjust values)
2. Try a DIFFERENT tool approach
3. ABORT if you determine the task is genuinely impossible
4. COMPLETE if the error is minor and you have enough info to respond${approachingBudget ? ' ← RECOMMENDED due to low budget' : ''}

Your response MUST use this format:

REASONING: <analyze the error, explain your next approach>
ACTION: <tool_name>
PARAMS: <JSON with corrected parameters>

OR:

REASONING: <explain why task is impossible>
ABORT: <helpful explanation for user>

Response:`;
  }

  /**
   * Build prompt for success interpretation
   */
  protected buildSuccessInterpretationPrompt(
    toolName: string,
    result: ToolResult,
    state: LoopState
  ): string {
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL EXECUTION SUCCESSFUL ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tool: ${toolName}
Result: ${JSON.stringify(result.data, null, 2)}
Duration: ${result.metadata?.duration}ms

JOURNEY TO SUCCESS:
${this.buildSuccessJourney(state.iterations)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provide a natural language response to the user that:

1. Confirms what was accomplished
2. Highlights key details from the result
3. ${state.iterations.length > 1 ? 'Briefly mentions you had to adjust your approach (shows reliability)' : ''}
4. Suggests relevant next steps
5. Uses markdown formatting for readability

Be conversational, specific, and actionable.

Response:`;
  }

  /**
   * Extract JSON object starting from a given position with proper brace matching
   * Handles nested objects, arrays, and escaped quotes
   */
  private extractJsonFromPosition(text: string, startIdx: number): string | null {
    if (startIdx === -1 || startIdx >= text.length) return null;

    // Find the opening brace
    let jsonStart = text.indexOf('{', startIdx);
    if (jsonStart === -1) return null;

    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = jsonStart; i < text.length; i++) {
      const char = text[i];

      // Handle escape sequences
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      // Handle strings (ignore braces inside strings)
      if (char === '"') {
        inString = !inString;
        continue;
      }

      // Count braces only outside strings
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Found matching closing brace
            return text.substring(jsonStart, i + 1);
          }
        }
      }
    }

    // Unclosed JSON object
    return null;
  }

  /**
   * Extract tool call JSON from AI response with proper brace matching
   * Handles nested objects, arrays, and escaped quotes
   */
  private extractToolCall(text: string): string | null {
    const startIdx = text.indexOf('{"tool":');
    if (startIdx === -1) return null;
    return this.extractJsonFromPosition(text, startIdx);
  }

  /**
   * Parse AI response for structured format or legacy JSON
   */
  private parseAIResponse(response: string): ParsedAIResponse {
    const parsed: ParsedAIResponse = {};

    // Extract REASONING
    const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=\n(?:ACTION|COMPLETE|ABORT|PARAMS):|$)/s);
    if (reasoningMatch) {
      parsed.reasoning = reasoningMatch[1].trim();
    }

    // Check for COMPLETE
    const completeMatch = response.match(/COMPLETE:\s*(.+?)$/s);
    if (completeMatch) {
      parsed.decision = 'complete';
      parsed.finalMessage = completeMatch[1].trim();
      return parsed;
    }

    // Check for ABORT
    const abortMatch = response.match(/ABORT:\s*(.+?)$/s);
    if (abortMatch) {
      parsed.decision = 'abort';
      parsed.finalMessage = abortMatch[1].trim();
      return parsed;
    }

    // Extract ACTION
    const actionMatch = response.match(/ACTION:\s*([^\n]+)/);
    if (actionMatch) {
      const toolName = actionMatch[1].trim();

      // Extract PARAMS using brace-matching logic for nested objects
      const paramsIdx = response.indexOf('PARAMS:');
      if (paramsIdx !== -1) {
        const paramsJson = this.extractJsonFromPosition(response, paramsIdx + 7);
        if (paramsJson) {
          try {
            const params = JSON.parse(paramsJson);
            parsed.action = {
              tool: toolName,
              params,
            };
            parsed.decision = 'continue';
          } catch (e) {
            console.error('[ParseError] Invalid JSON in PARAMS:', e);
          }
        }
      }
    }

    // Fallback: Check for legacy JSON format (uses Track 1's extractToolCall)
    if (!parsed.action && !parsed.decision) {
      const toolCallJson = this.extractToolCall(response);
      if (toolCallJson) {
        try {
          const toolCall = JSON.parse(toolCallJson);
          parsed.action = {
            tool: toolCall.tool,
            params: toolCall.params,
          };
          parsed.decision = 'continue';
        } catch (e) {
          console.error('[ParseError] Invalid legacy JSON:', e);
        }
      }
    }

    return parsed;
  }

  protected async callAI(prompt: string, maxTokens: number = 1000): Promise<string> {
    // Use Claude Haiku 4.5 (same as ChatOrchestratorDO)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.aiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.content[0].text;
  }

  /**
   * Classify error for tracking
   */
  private getErrorKey(errorMessage?: string): string {
    if (!errorMessage) return 'unknown_error';

    const lower = errorMessage.toLowerCase();

    if (lower.includes('validation') || lower.includes('invalid') || lower.includes('required')) {
      return 'validation_error';
    }
    if (lower.includes('unauthorized') || lower.includes('permission') || lower.includes('forbidden')) {
      return 'auth_error';
    }
    if (lower.includes('not found') || lower.includes('does not exist')) {
      return 'not_found_error';
    }
    if (lower.includes('timeout') || lower.includes('network') || lower.includes('fetch')) {
      return 'network_error';
    }
    if (lower.includes('json') || lower.includes('parse') || lower.includes('syntax')) {
      return 'json_error';
    }

    return 'generic_error';
  }

  /**
   * Track error in state
   */
  private trackError(state: LoopState, errorKey: string): void {
    const count = state.consecutiveErrors.get(errorKey) || 0;
    state.consecutiveErrors.set(errorKey, count + 1);
  }

  /**
   * Check if stuck in error loop
   */
  private isStuckInLoop(state: LoopState, errorKey: string, maxConsecutive: number): boolean {
    return (state.consecutiveErrors.get(errorKey) || 0) >= maxConsecutive;
  }

  /**
   * Build message when AI decides to abort
   */
  private buildAbortMessage(parsed: ParsedAIResponse, state: LoopState): string {
    return `${parsed.finalMessage || parsed.reasoning}

**What I tried:**
${state.iterations.map((iter, idx) =>
  `${idx + 1}. ${iter.action?.tool || 'Analysis'}: ${iter.observation?.success ? '✓' : '✗ ' + (iter.observation?.error || 'Unknown')}`
).join('\n')}

I've determined this task cannot be completed as requested. ${parsed.finalMessage ? '' : 'Please let me know if you\'d like to try a different approach.'}`;
  }

  /**
   * Build message when stuck in error loop
   */
  private buildStuckMessage(error: string | undefined, state: LoopState): string {
    const attempts = state.iterations.length;

    return `I attempted to complete your request ${attempts} times, but kept encountering the same issue:

**Error:** ${error || 'Unknown error'}

**What I tried:**
${state.iterations.map((iter, idx) =>
  `${idx + 1}. ${iter.reasoning || 'Tool execution'} → ${iter.observation?.error ? '✗ ' + iter.observation.error : '?'}`
).join('\n')}

I've reached my retry limit. This might require:
- Different permissions or access rights
- Manual intervention
- Adjusting the request parameters

Could you help clarify what might be causing this issue?`;
  }

  /**
   * Build message when max iterations reached
   */
  private buildMaxIterationsMessage(state: LoopState): string {
    return `I worked through ${state.iterations.length} iterations trying to complete your request, but haven't reached a definitive solution yet.

**My attempts:**
${state.iterations.map((iter, idx) =>
  `${idx + 1}. ${iter.action?.tool || 'Analysis'}: ${iter.observation?.success ? '✓' : '✗ ' + (iter.observation?.error || 'Failed')}`
).join('\n')}

This task might be more complex than I can handle autonomously. Would you like me to:
1. Try a different approach?
2. Break this into smaller steps?
3. Explain what I learned so far?`;
  }

  /**
   * Build message when execution errors occur
   */
  private buildExecutionErrorMessage(error: unknown, state: LoopState): string {
    return `I encountered technical errors while processing your request:

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

**Attempts made:** ${state.iterations.length}

This appears to be a system issue rather than a problem with your request. Please try again in a moment, or let me know if the problem persists.`;
  }
}
