import { BaseAgent, AgentContext, AgentResponse, AgenticLoopConfig, LoopIteration } from './BaseAgent';
import { Tool } from '../tools';
import {
  CommitmentExtractor,
  IntentDetector,
  ContextBuilder,
  RoomContext,
  Intent,
  Message,
  Commitment
} from './helpers';

/**
 * UnifiedDelphiAgent - Single agent that handles all event planning domains
 *
 * Replaces 4 specialized agents:
 * - TaskAgent: Task creation and extraction
 * - BudgetAgent: Budget tracking and expense management
 * - VendorAgent: Vendor search and research
 * - EventAgent: High-level planning and strategic guidance
 *
 * Benefits:
 * - No routing confusion
 * - Can handle cross-domain requests
 * - State-aware with dynamic warnings
 * - Access to all tools
 * - Proposal system for batch operations (Track 1 v3.1)
 */
export class UnifiedDelphiAgent extends BaseAgent {
  constructor(aiKey: string, tools: Tool[]) {
    super('UnifiedDelphiAgent', aiKey, tools);
  }

  /**
   * Track 1 v3.1: Override handle() to detect multi-create scenarios
   * and generate proposals instead of executing immediately
   */
  async handle(
    context: AgentContext,
    config: Partial<AgenticLoopConfig> = {},
    intent?: string
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Checking for multi-create scenario...`);

    const intentLower = (intent || '').toLowerCase();

    // Phase 1c: Route vendor/venue search intents to executeSearchAndPropose
    // These need special handling: execute search first, then convert to proposal
    if (
      intentLower.includes('search_vendor') ||
      intentLower.includes('find_vendor') ||
      intentLower.includes('search_venue') ||
      intentLower.includes('find_venue') ||
      (intentLower.includes('vendor') && intentLower.includes('search')) ||
      (intentLower.includes('venue') && intentLower.includes('search'))
    ) {
      // Phase 1d: Check for informational queries (should skip proposal)
      const isInformationalQuery =
        context.message.toLowerCase().includes('what are') ||
        context.message.toLowerCase().includes('what is') ||
        context.message.toLowerCase().includes('tell me about') ||
        context.message.toLowerCase().includes('how much do') ||
        context.message.toLowerCase().includes('how much does') ||
        context.message.toLowerCase().includes('explain');

      if (isInformationalQuery) {
        console.log('[UnifiedDelphiAgent] Informational query detected - skipping proposal generation');
        return await super.handle(context, config, intent);
      }

      console.log('[UnifiedDelphiAgent] Vendor/venue search detected - executing search and proposal flow');
      return await this.executeSearchAndPropose(context, intent!);
    }

    // Query budget/expenses - return Fluid UI components directly without ReAct loop
    // The components will fetch data client-side from Convex
    if (
      intentLower.includes('query_budget') ||
      intentLower.includes('show_budget') ||
      intentLower.includes('budget_status') ||
      (intentLower.includes('budget') && (
        intentLower.includes('show') ||
        intentLower.includes('get') ||
        intentLower.includes('display') ||
        intentLower.includes('what')
      ))
    ) {
      console.log('[UnifiedDelphiAgent] Budget query detected - returning component response directly');

      // Build component response based on intent
      const componentResponse = this.buildComponentResponse(intent, null, context);

      return {
        text: "Here's your budget overview:",
        intent: intent || 'query_budget',
        confidence: 0.95,
        toolsUsed: [],
        structuredData: null,
        ...componentResponse, // Merge renderType and componentConfig
        metadata: {
          wasSuccessful: true,
          skippedReActLoop: true,
        }
      };
    }

    // Detect multi-create scenarios from intent and message
    const shouldGenerateProposal = this.shouldGenerateProposal(context, intent);

    if (shouldGenerateProposal) {
      console.log(`[UnifiedDelphiAgent] Multi-create detected, generating proposal...`);
      return await this.buildProposal(context, intent);
    }

    // Normal execution for single creates or other operations
    console.log(`[UnifiedDelphiAgent] Normal execution (no proposal needed)`);
    return await super.handle(context, config, intent);
  }

  /**
   * Handle multiple intents from a complex user message
   * Executes intents in parallel or sequentially based on their execution strategy
   *
   * Example: "set expense $2k for DJ and search for DJs in bay area"
   * → [add_expense, search_vendors] executed in parallel
   *
   * @param context Agent context
   * @param intents Array of detected intents
   * @param config Optional agentic loop configuration
   * @returns Combined response with multiple blocks
   */
  async handleMultiIntent(
    context: AgentContext,
    intents: Intent[],
    config: Partial<AgenticLoopConfig> = {}
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Handling ${intents.length} intents...`);

    // Separate intents by execution strategy
    const parallelIntents = intents.filter(i => i.executionStrategy === 'parallel');
    const sequentialIntents = intents.filter(i => i.executionStrategy === 'sequential');

    const responseBlocks: any[] = [];
    const allToolsUsed: string[] = [];
    let combinedText = '';

    // Execute parallel intents concurrently
    if (parallelIntents.length > 0) {
      console.log(`[UnifiedDelphiAgent] Executing ${parallelIntents.length} parallel intents...`);

      const parallelResults = await Promise.all(
        parallelIntents.map(async (intent) => {
          try {
            return await this.executeSingleIntent(context, intent, config);
          } catch (error: any) {
            console.error(`[UnifiedDelphiAgent] Error executing intent ${intent.primaryIntent}:`, error.message);
            return {
              text: `Failed to execute ${intent.primaryIntent}: ${error.message}`,
              intent: intent.primaryIntent,
              confidence: 0,
              toolsUsed: [],
              metadata: { wasSuccessful: false }
            };
          }
        })
      );

      // Collect results
      for (const result of parallelResults) {
        responseBlocks.push(this.convertToResponseBlock(result));
        allToolsUsed.push(...result.toolsUsed);
        combinedText += result.text + '\n\n';
      }
    }

    // Execute sequential intents one by one
    if (sequentialIntents.length > 0) {
      console.log(`[UnifiedDelphiAgent] Executing ${sequentialIntents.length} sequential intents...`);

      for (const intent of sequentialIntents.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0))) {
        try {
          const result = await this.executeSingleIntent(context, intent, config);
          responseBlocks.push(this.convertToResponseBlock(result));
          allToolsUsed.push(...result.toolsUsed);
          combinedText += result.text + '\n\n';
        } catch (error: any) {
          console.error(`[UnifiedDelphiAgent] Error executing intent ${intent.primaryIntent}:`, error.message);
          responseBlocks.push({
            type: 'text',
            text: `Failed to execute ${intent.primaryIntent}: ${error.message}`
          });
          combinedText += `Failed to execute ${intent.primaryIntent}: ${error.message}\n\n`;
        }
      }
    }

    // Build combined response
    return {
      text: combinedText.trim(),
      intent: intents.map(i => i.primaryIntent).join(', '),
      confidence: Math.min(...intents.map(i => i.confidence)),
      toolsUsed: Array.from(new Set(allToolsUsed)),
      renderType: 'multi_block',
      responseBlocks,
      metadata: {
        wasSuccessful: true,
        intents: intents.map(i => i.primaryIntent)
      }
    };
  }

  /**
   * Execute a single intent and return its response
   */
  private async executeSingleIntent(
    context: AgentContext,
    intent: Intent,
    config: Partial<AgenticLoopConfig>
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Executing intent: ${intent.primaryIntent}`);

    // Check if this intent should generate a proposal
    const shouldPropose = this.shouldIntentGenerateProposal(intent);

    if (shouldPropose) {
      return await this.buildProposal(context, intent.primaryIntent);
    }

    // Normal execution
    return await super.handle(context, config, intent.primaryIntent);
  }

  /**
   * Check if a single intent should generate a proposal
   * (for multi-create within that specific intent)
   */
  private shouldIntentGenerateProposal(intent: Intent): boolean {
    const intentLower = intent.primaryIntent.toLowerCase();

    // NEVER propose for poll operations - polls should be created directly
    if (intentLower.includes('poll') || intentLower.includes('create_poll')) {
      console.log('[UnifiedDelphiAgent] Poll intent detected - skipping proposal');
      return false;
    }

    // ALWAYS propose for task operations (MVP requirement)
    if (
      intentLower.includes('task') ||
      intentLower.includes('sync_conversation') ||
      intentLower.includes('create_task')
    ) {
      console.log('[UnifiedDelphiAgent] Task intent detected - forcing proposal');
      return true;
    }

    // ALWAYS propose for expense operations (MVP requirement)
    if (intentLower.includes('expense') || intentLower.includes('add_expense')) {
      console.log('[UnifiedDelphiAgent] Expense intent detected - forcing proposal');
      return true;
    }

    // If intent has multiple entities of the same type, propose
    const entityTypes = new Map<string, number>();
    for (const entity of intent.entities || []) {
      entityTypes.set(entity.type, (entityTypes.get(entity.type) || 0) + 1);
    }

    // If we have 3+ items of same type (e.g., 3 vendors), propose
    for (const count of entityTypes.values()) {
      if (count >= 3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert an AgentResponse to an AgentResponseBlock
   */
  private convertToResponseBlock(response: AgentResponse): any {
    // If it's a proposal, create a proposal block
    if (response.structuredData?.type === 'proposal') {
      return {
        type: 'proposal',
        proposalData: response.structuredData.proposal,
        text: response.text
      };
    }

    // If it has component config, create a component_grid block
    if (response.componentConfig) {
      return {
        type: 'component_grid',
        componentConfig: response.componentConfig,
        structuredData: response.structuredData,
        text: response.text
      };
    }

    // If it has interactive prompt, create that block
    if (response.interactivePrompt) {
      return {
        type: 'interactive_prompt',
        interactivePrompt: response.interactivePrompt,
        text: response.text
      };
    }

    // Default to text block
    return {
      type: 'text',
      text: response.text,
      structuredData: response.structuredData
    };
  }

  /**
   * Track 1 v3.1: Detect if we should generate a proposal
   *
   * Criteria:
   * - Intent includes "create_multiple" or similar batch indicators
   * - Message mentions creating multiple items (3+)
   * - Explicit list of items to create
   * - ALWAYS for expense operations (MVP requirement)
   */
  private shouldGenerateProposal(context: AgentContext, intent?: string): boolean {
    if (!intent) return false;

    const intentLower = intent.toLowerCase();
    const messageLower = context.message.toLowerCase();

    // NEVER generate proposals for poll creation - polls should be created directly
    // Polls are simple CRUD operations and don't require user review like tasks/expenses
    if (intentLower.includes('poll') || intentLower.includes('create_poll')) {
      console.log('[UnifiedDelphiAgent] Poll operation detected - skipping proposal generation');
      return false;
    }

    // ALWAYS generate proposals for expense creation (MVP requirement)
    // This prevents schema validation errors and allows user review
    if (intentLower.includes('expense') || intentLower.includes('add_expense')) {
      console.log('[UnifiedDelphiAgent] Expense operation detected - forcing proposal generation');
      return true;
    }

    // ALWAYS generate proposals for task operations (MVP requirement)
    // This ensures user review and prevents direct execution
    if (
      intentLower.includes('task') ||
      intentLower.includes('create_task') ||
      intentLower.includes('sync_conversation_to_tasks') ||
      intentLower.includes('update_task')
    ) {
      console.log('[UnifiedDelphiAgent] Task operation detected - forcing proposal generation');
      return true;
    }

    // DEFAULT to proposals for vendor/venue searches (can be overridden by AI informational flag)
    // This allows user to save/review vendor options from search results
    if (
      intentLower.includes('search_vendor') ||
      intentLower.includes('find_vendor') ||
      intentLower.includes('search_venue') ||
      intentLower.includes('find_venue') ||
      (intentLower.includes('vendor') && intentLower.includes('search')) ||
      (intentLower.includes('venue') && intentLower.includes('search'))
    ) {
      console.log('[UnifiedDelphiAgent] Vendor/venue search detected - defaulting to proposal generation');
      return true;
    }

    // Check intent for bulk operations
    if (
      intentLower.includes('create_multiple') ||
      intentLower.includes('bulk') ||
      intentLower.includes('batch')
    ) {
      return true;
    }

    // Check for numeric indicators (e.g., "create 3 tasks", "5 vendors")
    const numericMatch = messageLower.match(/(\d+)\s+(tasks|vendors|expenses)/);
    if (numericMatch) {
      const count = parseInt(numericMatch[1]);
      if (count >= 3) {
        return true;
      }
    }

    // Check for list indicators (commas, "and", bullet points)
    const hasMultipleItems =
      (messageLower.match(/,/g) || []).length >= 2 || // At least 2 commas (3 items)
      /\band\b.*\band\b/.test(messageLower); // Multiple "and"s

    if (hasMultipleItems && (
      intentLower.includes('create') ||
      intentLower.includes('add') ||
      intentLower.includes('new')
    )) {
      return true;
    }

    return false;
  }

  /**
   * Track 1 v3.1: Build a proposal for batch operations
   *
   * Returns a proposal response with metadata for user review
   * The proposal will be rendered as a TaskProposalCard in the frontend
   */
  private async buildProposal(
    context: AgentContext,
    intent?: string
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Building proposal for batch operation...`);

    // Use AI to extract items from the message
    const items = await this.extractProposalItems(context, intent);

    if (items.length === 0) {
      // If we can't extract items, fall back to normal execution
      console.log(`[UnifiedDelphiAgent] No items extracted, falling back to normal execution`);
      return await super.handle(context, {}, intent);
    }

    // Determine proposal type based on intent
    let proposalType: 'tasks' | 'budget_entries' | 'vendor_suggestions' | 'venue_suggestions' = 'tasks';
    if (intent?.toLowerCase().includes('expense') || intent?.toLowerCase().includes('budget')) {
      proposalType = 'budget_entries';
    } else if (intent?.toLowerCase().includes('venue')) {
      proposalType = 'venue_suggestions';
    } else if (intent?.toLowerCase().includes('vendor')) {
      proposalType = 'vendor_suggestions';
    }

    // Generate proposal ID and expiration
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Build proposal metadata
    const proposalMetadata = {
      proposalId,
      proposalType,
      items,
      expiresAt,
      requiresConfirmation: true,
      createdAt: Date.now(),
    };

    // Return a special response type for proposals
    return {
      text: this.formatProposalMessage(items, proposalType),
      intent: this.getIntent(),
      confidence: 0.95,
      toolsUsed: [],
      structuredData: {
        type: 'proposal',
        proposal: proposalMetadata,
      },
      metadata: {
        totalIterations: 0,
        wasSuccessful: true,
      },
    };
  }

  /**
   * Execute a vendor/venue search and convert results to a proposal
   * This is the core implementation for Phase 1b-1c
   *
   * @param context Agent context
   * @param intent Intent string (search_vendors or search_venue)
   * @returns Agent response with vendor/venue proposal
   */
  private async executeSearchAndPropose(
    context: AgentContext,
    intent: string
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Executing search and propose for: ${intent}`);

    const intentLower = intent.toLowerCase();
    const isVenue = intentLower.includes('venue');
    const category = await this.inferCategory(intent || context.message);

    // Execute normal ReAct loop to perform the web search
    const searchResponse = await super.handle(context, {}, intent);

    // Extract search results from the response structured data or iterations
    // The web_search tool returns results in structuredData.results
    let searchResults: any[] = [];

    if (searchResponse.structuredData?.results) {
      searchResults = searchResponse.structuredData.results;
    } else if (searchResponse.metadata?.iterations) {
      // Try to get from iterations if not in structured data
      const webSearchData = this.getLastToolResult(searchResponse.metadata.iterations, 'web_search');
      if (webSearchData?.results) {
        searchResults = webSearchData.results;
      }
    }

    if (!searchResults || searchResults.length === 0) {
      return {
        text: `I searched for ${isVenue ? 'venues' : 'vendors'} but couldn't find any results. Would you like me to try a different search query?`,
        intent: intent || (isVenue ? 'search_venue' : 'search_vendor'),
        confidence: 0.8,
        toolsUsed: ['web_search'],
        metadata: { wasSuccessful: false }
      };
    }

    console.log(`[UnifiedDelphiAgent] Found ${searchResults.length} search results, parsing into proposal...`);

    // Parse search results into proposal items using AI
    const proposalItems = await this.parseSearchResultsToProposal(
      searchResults,
      category,
      context.eventContext,
      isVenue
    );

    if (proposalItems.length === 0) {
      return {
        text: `I found ${searchResults.length} search results, but couldn't extract vendor details from them. Would you like me to try a different search?`,
        intent: intent || (isVenue ? 'search_venue' : 'search_vendor'),
        confidence: 0.8,
        toolsUsed: ['web_search'],
        metadata: { wasSuccessful: false }
      };
    }

    // Generate proposal ID and expiration
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Determine proposal type
    const proposalType: 'vendor_suggestions' | 'venue_suggestions' =
      isVenue ? 'venue_suggestions' : 'vendor_suggestions';

    // Build proposal metadata
    const proposalMetadata = {
      proposalId,
      proposalType,
      items: proposalItems,
      expiresAt,
      requiresConfirmation: true,
      createdAt: Date.now(),
    };

    console.log(`[UnifiedDelphiAgent] Created ${proposalType} proposal with ${proposalItems.length} items`);

    return {
      text: this.formatProposalMessage(proposalItems, proposalType),
      intent: intent || (isVenue ? 'search_venue' : 'search_vendor'),
      confidence: 0.9,
      toolsUsed: ['web_search'],
      structuredData: {
        type: 'proposal',
        proposal: proposalMetadata,
      },
      metadata: {
        totalIterations: searchResponse.metadata?.totalIterations || 0,
        wasSuccessful: true,
      },
    };
  }

  /**
   * Extract items from user message using AI
   * Returns array of proposed items with type and data
   */
  private async extractProposalItems(
    context: AgentContext,
    intent?: string
  ): Promise<Array<{ type: string; data: any; reasoning?: string }>> {
    const extractionPrompt = `You are extracting actionable items from a user message for an event planning system.

User Message: "${context.message}"
Intent: ${intent || 'unknown'}

Extract ALL distinct items the user wants to create. For each item, determine:
1. Type: "task", "expense", or "vendor"
2. Data: The details needed to create this item
3. Reasoning: Why you're suggesting this item (optional)

For tasks, include:
- title (required)
- description (optional)
- category (venue, catering, photography, music, decor, invitations, transportation, accommodation, other)
- priority (low, medium, high, urgent)
- status (default: "todo")
- deadline (if mentioned)
- estimatedCost (if mentioned)

For expenses, include:
- description (required)
- amount (required)
- category (same as tasks)
- paidAt or dueDate (if mentioned)

For vendors, include:
- name (required)
- category (required)
- contact information (if mentioned)
- pricing (if mentioned)

CRITICAL RULES FOR EXPENSES:
- "add expense for X for Y" means ONE expense: amount=X, description=Y
- "2k for DJ" means ONE expense: amount=2000, description="DJ"
- Do NOT split "amount + description" into separate items
- Parse monetary amounts: "2k"=2000, "$500"=500, "1.5k"=1500

Return ONLY a JSON array of items. Examples:

TASK EXAMPLES:
[
  {
    "type": "task",
    "data": {
      "title": "Book photographer",
      "description": "Find and book professional wedding photographer",
      "category": "photography",
      "priority": "high",
      "status": "todo"
    },
    "reasoning": "Photography is critical for wedding memories"
  },
  {
    "type": "task",
    "data": {
      "title": "Research caterers",
      "description": "Get quotes from local catering companies",
      "category": "catering",
      "priority": "high",
      "status": "todo"
    },
    "reasoning": "Need to secure catering soon for guest count estimation"
  }
]

EXPENSE EXAMPLES:
User: "add expense for 2k for a DJ"
[
  {
    "type": "expense",
    "data": {
      "description": "DJ",
      "amount": 2000,
      "category": "music"
    }
  }
]

User: "set expenses $500 for flowers and $1.5k for photographer"
[
  {
    "type": "expense",
    "data": {
      "description": "Flowers",
      "amount": 500,
      "category": "decor"
    }
  },
  {
    "type": "expense",
    "data": {
      "description": "Photographer",
      "amount": 1500,
      "category": "photography"
    }
  }
]

Return only the JSON array, no other text.`;

    try {
      const response = await this.callAI(extractionPrompt);

      // Extract JSON from response using bracket matching
      const jsonString = this.extractJsonArray(response);
      if (!jsonString) {
        console.error('[UnifiedDelphiAgent] No JSON array found in extraction response');
        console.error('[UnifiedDelphiAgent] Full AI response:', response);
        return [];
      }

      const items = JSON.parse(jsonString);
      console.log(`[UnifiedDelphiAgent] Extracted ${items.length} items for proposal`);
      return items;
    } catch (error: any) {
      console.error('[UnifiedDelphiAgent] Error extracting proposal items:', error.message);
      console.error('[UnifiedDelphiAgent] Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Extract JSON array from AI response with proper bracket matching
   * Handles nested arrays/objects and stops at the matching closing bracket
   *
   * @param text AI response text
   * @returns Extracted JSON string or null if not found
   */
  private extractJsonArray(text: string): string | null {
    const startIdx = text.indexOf('[');
    if (startIdx === -1) return null;

    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < text.length; i++) {
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

      // Handle strings (ignore brackets inside strings)
      if (char === '"') {
        inString = !inString;
        continue;
      }

      // Count brackets only outside strings
      if (!inString) {
        if (char === '[') bracketCount++;
        if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            // Found matching closing bracket
            return text.substring(startIdx, i + 1);
          }
        }
      }
    }

    // Unclosed JSON array
    return null;
  }

  /**
   * Extract JSON object from AI response with proper brace matching
   * Handles nested objects/arrays and stops at the matching closing brace
   *
   * @param text AI response text
   * @returns Extracted JSON string or null if not found
   */
  private extractJsonObject(text: string): string | null {
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return null;

    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < text.length; i++) {
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
            return text.substring(startIdx, i + 1);
          }
        }
      }
    }

    // Unclosed JSON object
    return null;
  }

  /**
   * Parse Firecrawl search results into vendor/venue proposal items
   * Uses AI to extract structured data and generate pros/cons analysis
   *
   * @param searchResults Array of search results from Firecrawl
   * @param category Vendor category (photography, catering, venue, etc.)
   * @param eventContext Event information for matching
   * @param isVenue Whether this is a venue search
   * @returns Array of proposal items with vendor/venue data
   */
  private async parseSearchResultsToProposal(
    searchResults: any[],
    category: string,
    eventContext: any,
    isVenue: boolean = false
  ): Promise<Array<{ type: string; data: any; reasoning?: string }>> {
    console.log(`[UnifiedDelphiAgent] Parsing ${searchResults.length} search results into ${isVenue ? 'venue' : 'vendor'} proposal items...`);

    if (!searchResults || searchResults.length === 0) {
      console.log('[UnifiedDelphiAgent] No search results to parse');
      return [];
    }

    const extractionPrompt = `You are analyzing web search results for ${isVenue ? 'venues' : 'vendors'} to help plan an event.

EVENT CONTEXT:
- Event Type: ${eventContext?.type || 'Unknown'}
- Event Date: ${eventContext?.date || 'Not set'}
- Event Name: ${eventContext?.name || 'Unnamed Event'}
- Guest Count: ${eventContext?.guestCount || 'Unknown'}

SEARCH RESULTS:
${searchResults.map((result, i) => `
Result ${i + 1}:
Title: ${result.title || 'N/A'}
URL: ${result.url || 'N/A'}
Description: ${result.description || result.snippet || 'N/A'}
${result.markdown ? `Content Preview: ${result.markdown.substring(0, 500)}...` : ''}
`).join('\n')}

TASK: Extract structured ${isVenue ? 'venue' : 'vendor'} information from these search results.

For each ${isVenue ? 'venue' : 'vendor'} found, extract:
1. Name (required) - business name
2. Category (${category})
3. Contact information (email, phone, website URL)
4. Pricing (extract dollar amounts if mentioned, e.g., "$2000-$5000")
5. Rating (0-5 stars if mentioned)
6. Review count (if mentioned)
${isVenue ? `7. Capacity (guest count if mentioned)
8. Amenities (array of amenities like "parking", "catering kitchen", "AV equipment")
9. Venue type ("indoor" | "outdoor" | "both")` : `7. Specialties (what they're known for)
8. Location (city, state if mentioned)`}

ANALYSIS: For each ${isVenue ? 'venue' : 'vendor'}:
- Match Score (0-100): How well this matches the event requirements
- Pros (2-4 bullet points): Key strengths based on the search result
- Cons (1-3 bullet points): Potential concerns or limitations
- Reasoning: Brief explanation of why you're recommending this option

Return ONLY a JSON array of the top 3-5 best matches. Example:

${isVenue ? `[
  {
    "type": "venue",
    "data": {
      "name": "The Grand Ballroom",
      "category": "venue",
      "capacity": 200,
      "venueType": "indoor",
      "amenities": ["parking", "catering kitchen", "AV equipment", "bridal suite"],
      "pricing": "$3,000 - $5,000 per event",
      "contact": "events@grandballroom.com",
      "phone": "(206) 555-1234",
      "website": "https://grandballroom.com",
      "rating": 4.8,
      "reviewCount": 127,
      "city": "Seattle",
      "state": "WA",
      "notes": "Highly rated downtown venue with full amenities",
      "aiMetadata": {
        "matchScore": 92,
        "pros": [
          "Excellent reviews and high rating",
          "Capacity fits event size perfectly",
          "Full-service amenities included",
          "Prime downtown location"
        ],
        "cons": [
          "Higher price point",
          "May book up quickly for popular dates"
        ]
      }
    },
    "reasoning": "Top-rated venue with capacity and amenities that match your event requirements"
  }
]` : `[
  {
    "type": "vendor",
    "data": {
      "name": "Artisan Photography Co.",
      "category": "photography",
      "pricing": "$2,000 - $4,000 for wedding packages",
      "contact": "hello@artisanphoto.com",
      "phone": "(206) 555-5678",
      "website": "https://artisanphoto.com",
      "rating": 4.9,
      "reviewCount": 156,
      "city": "Seattle",
      "state": "WA",
      "notes": "Specializes in outdoor weddings, award-winning portfolio",
      "aiMetadata": {
        "matchScore": 95,
        "pros": [
          "Exceptional reviews (4.9/5 stars)",
          "Specializes in wedding photography",
          "Award-winning portfolio",
          "Fast turnaround on edited photos"
        ],
        "cons": [
          "Premium pricing tier",
          "Books 6+ months in advance"
        ],
        "specialties": ["weddings", "portraits", "destination events"]
      }
    },
    "reasoning": "Highly rated specialist photographer with excellent portfolio and reviews"
  }
]`}

IMPORTANT:
- Only include vendors/venues where you can extract meaningful information
- Skip results that don't have enough detail
- Ensure pricing is a string (e.g., "$2,000 - $3,000")
- Ensure category is exactly: "${category}"
- Return only the JSON array, no other text.`;

    try {
      // Use higher max_tokens (4000) for complex JSON generation
      console.log('[UnifiedDelphiAgent] Calling AI with 4000 max_tokens for vendor parsing...');
      const response = await this.callAI(extractionPrompt, 4000);

      // Log the raw response for debugging
      console.log('[UnifiedDelphiAgent] AI response (first 500 chars):', response.substring(0, 500));
      console.log('[UnifiedDelphiAgent] AI response length:', response.length);

      // Extract JSON array from response using bracket matching
      const jsonString = this.extractJsonArray(response);
      if (!jsonString) {
        console.error('[UnifiedDelphiAgent] No JSON array found in search result parsing');
        console.error('[UnifiedDelphiAgent] Full AI response:', response);
        return [];
      }

      console.log('[UnifiedDelphiAgent] Extracted JSON string length:', jsonString.length);

      // Attempt to parse JSON with detailed error logging
      let items;
      try {
        items = JSON.parse(jsonString);
      } catch (parseError: any) {
        console.error('[UnifiedDelphiAgent] JSON.parse failed:', parseError.message);
        console.error('[UnifiedDelphiAgent] JSON string that failed to parse:', jsonString);
        console.error('[UnifiedDelphiAgent] Error position:', parseError.message.match(/position (\d+)/)?.[1]);

        // Try to identify the problematic area
        const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
        if (errorPos > 0) {
          const contextStart = Math.max(0, errorPos - 100);
          const contextEnd = Math.min(jsonString.length, errorPos + 100);
          console.error('[UnifiedDelphiAgent] Context around error:');
          console.error(jsonString.substring(contextStart, contextEnd));
        }

        return [];
      }

      if (!Array.isArray(items)) {
        console.error('[UnifiedDelphiAgent] Parsed JSON is not an array:', typeof items);
        return [];
      }

      console.log(`[UnifiedDelphiAgent] Successfully extracted ${items.length} ${isVenue ? 'venue' : 'vendor'} proposal items`);

      // Ensure all items have the correct structure and validate categories
      const mappedItems = await Promise.all(items.map(async (item: any) => {
        let itemCategory = item.data.category || category;

        // Validate and re-infer category if it's 'other' or invalid
        if (!itemCategory || itemCategory === 'other') {
          console.warn(`[UnifiedDelphiAgent] Vendor "${item.data.name}" has invalid category "${itemCategory}", re-inferring...`);
          // Re-infer category from vendor name + description
          const inferText = `${item.data.name} ${item.data.description || item.data.notes || ''}`;
          itemCategory = await this.inferCategory(inferText);
          console.log(`[UnifiedDelphiAgent] Re-inferred category for "${item.data.name}": ${itemCategory}`);
        }

        return {
          type: isVenue ? 'venue' : 'vendor',
          data: {
            ...item.data,
            category: itemCategory,
            status: 'researching' // Default status for search results
          },
          reasoning: item.reasoning || `${isVenue ? 'Venue' : 'Vendor'} found via web search`
        };
      }));

      return mappedItems;
    } catch (error: any) {
      console.error('[UnifiedDelphiAgent] Error parsing search results:', error.message);
      console.error('[UnifiedDelphiAgent] Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Get the last successful result from a specific tool execution
   *
   * @param iterations ReAct loop iterations from agent execution
   * @param toolName Name of the tool to find (e.g., 'web_search', 'convex_crud')
   * @returns Tool result data or null if not found
   */
  private getLastToolResult(iterations: LoopIteration[], toolName: string): any {
    // Iterate backwards to find the most recent execution
    for (let i = iterations.length - 1; i >= 0; i--) {
      const iter = iterations[i];
      if (
        iter.action?.tool === toolName &&
        iter.observation?.success &&
        iter.observation?.data !== undefined
      ) {
        return iter.observation.data;
      }
    }
    return null;
  }

  /**
   * Infer vendor category from intent or message
   * Uses fast keyword matching for obvious cases, AI for ambiguous ones
   *
   * @param intentOrMessage Intent string or user message
   * @returns Inferred category (photography, catering, venue, etc.)
   */
  private async inferCategory(intentOrMessage: string): Promise<string> {
    const lower = intentOrMessage.toLowerCase();

    // Quick keyword matches for common cases (performance optimization)
    if (lower.includes('photographer') || lower.includes('photography') || lower.includes('photo')) return 'photography';
    if (lower.includes('caterer') || lower.includes('catering') || lower.includes('food')) return 'catering';
    if (lower.includes('venue') || lower.includes('location')) return 'venue';
    if (lower.includes('dj') || lower.includes('music') || lower.includes('band')) return 'music';
    if (lower.includes('florist') || lower.includes('flower') || lower.includes('decor')) return 'decor';
    if (lower.includes('baker') || lower.includes('cake')) return 'bakery';
    if (lower.includes('planner') || lower.includes('coordinator')) return 'planning';
    if (lower.includes('transport') || lower.includes('limo')) return 'transportation';

    // Use AI for ambiguous cases
    console.log(`[UnifiedDelphiAgent] Using AI to infer category for: "${intentOrMessage}"`);
    const prompt = `What vendor category does this request relate to?

Request: "${intentOrMessage}"

Categories:
- photography (photographers, videographers, photo services)
- catering (food service, catering, chefs)
- venue (event spaces, locations, halls)
- music (DJs, bands, musicians, entertainment)
- decor (flowers, decorations, florists, design)
- bakery (cakes, desserts, pastries)
- planning (planners, coordinators, event managers)
- transportation (limos, shuttles, cars, transportation)
- other

Return ONLY the category name, nothing else.`;

    try {
      const response = await this.callAI(prompt, 50);
      const category = response.trim().toLowerCase();

      // Validate response
      const validCategories = ['photography', 'catering', 'venue', 'music', 'decor', 'bakery', 'planning', 'transportation', 'other'];
      if (validCategories.includes(category)) {
        console.log(`[UnifiedDelphiAgent] AI inferred category: ${category}`);
        return category;
      }

      console.warn(`[UnifiedDelphiAgent] AI returned invalid category "${category}", using fallback`);
    } catch (error) {
      console.error('[UnifiedDelphiAgent] AI category inference failed:', error);
    }

    // Fallback to 'other' if AI fails
    return 'other';
  }

  /**
   * Format a user-friendly message for the proposal
   */
  private formatProposalMessage(
    items: Array<{ type: string; data: any; reasoning?: string }>,
    proposalType: string
  ): string {
    const isVenue = proposalType === 'venue_suggestions';
    const isVendor = proposalType === 'vendor_suggestions' || isVenue;

    const itemType = proposalType === 'tasks'
      ? 'tasks'
      : proposalType === 'budget_entries'
        ? 'expenses'
        : isVenue
          ? 'venues'
          : 'vendors';

    const summary = items
      .map((item, idx) => {
        if (item.type === 'task') {
          return `${idx + 1}. **${item.data.title}** (${item.data.category}, ${item.data.priority} priority)`;
        } else if (item.type === 'expense') {
          return `${idx + 1}. **${item.data.description}** - $${item.data.amount}`;
        } else if (item.type === 'vendor') {
          // Enhanced vendor/venue formatting with ratings and pricing
          const vendor = item.data;
          const parts: string[] = [`${idx + 1}. **${vendor.name}**`];

          // Add rating if available
          if (vendor.rating) {
            const stars = '⭐'.repeat(Math.round(vendor.rating));
            parts.push(`${stars} ${vendor.rating}/5`);
            if (vendor.reviewCount) {
              parts.push(`(${vendor.reviewCount} reviews)`);
            }
          }

          // Add pricing if available
          if (vendor.pricing) {
            parts.push(`\n   💰 ${vendor.pricing}`);
          }

          // Add venue-specific fields
          if (isVenue && vendor.capacity) {
            parts.push(`\n   👥 Capacity: ${vendor.capacity} guests`);
          }
          if (isVenue && vendor.venueType) {
            parts.push(`\n   🏛️ Type: ${vendor.venueType}`);
          }

          // Add contact info if available
          if (vendor.website) {
            parts.push(`\n   🌐 ${vendor.website}`);
          }

          // Add AI match score if available
          if (vendor.aiMetadata?.matchScore) {
            parts.push(`\n   ✨ AI Match: ${vendor.aiMetadata.matchScore}%`);
          }

          // Add top pros/cons if available
          if (vendor.aiMetadata?.pros && vendor.aiMetadata.pros.length > 0) {
            parts.push(`\n   ✅ ${vendor.aiMetadata.pros[0]}`);
          }
          if (vendor.aiMetadata?.cons && vendor.aiMetadata.cons.length > 0) {
            parts.push(`\n   ⚠️  ${vendor.aiMetadata.cons[0]}`);
          }

          return parts.join(' ');
        }
        return `${idx + 1}. ${JSON.stringify(item.data)}`;
      })
      .join('\n\n');

    // Different message for vendor/venue proposals
    if (isVendor) {
      return `I found ${items.length} ${itemType} that match your requirements:

${summary}

**What would you like to do?**
- ✅ **Save All** - Add all ${items.length} ${itemType} to your event for further consideration
- ✏️ **Edit** - Review and modify the ${itemType} before saving
- ❌ **Dismiss** - Don't save these ${itemType}

💡 Saved ${itemType} will have status "researching" so you can follow up with them.

This proposal expires in 5 minutes.`;
    }

    // Standard message for tasks/expenses
    return `I've prepared a proposal to create ${items.length} ${itemType}:

${summary}

**Would you like to:**
- ✅ **Accept all** - Create all ${items.length} ${itemType} as proposed
- ✏️ **Edit** - Modify the ${itemType} before creating them
- ❌ **Reject** - Don't create these ${itemType}

This proposal expires in 5 minutes.`;
  }

  getIntent(): string {
    return 'unified';
  }

  getSystemPrompt(context: AgentContext): string {
    const eventName = context.eventContext?.name || 'Unnamed Event';
    const eventDate = context.eventContext?.date || 'Not set';
    const eventType = context.eventContext?.type || 'Unknown';

    return `You are Delphi, an intelligent event planning assistant. You have access to multiple tools and can handle any event planning request across all domains: tasks, budgets, vendors, and strategic planning.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT EVENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event ID: ${context.eventId || 'Unknown'}
Event Name: ${eventName}
Event Date: ${eventDate}
Event Type: ${eventType}

Current State:
${this.buildEventState(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CAPABILITIES & TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CRITICAL: You have access to EXACTLY TWO tools that you can call:
  1. convex_crud - Database operations
  2. web_search - Web search via Firecrawl

THESE ARE THE ONLY CALLABLE TOOLS. Do NOT attempt to call any other tools.

UI Components (VendorProposalCard, TaskCard, etc.) are NOT tools - they are
response formats that the system automatically generates from your responses.
You cannot and should not try to call them as tools.

═══════════════════════════════════════════════════════
TOOL 1: convex_crud (CALLABLE TOOL)
═══════════════════════════════════════════════════════

Purpose: Create, read, update, or delete event data in the database

Supported Operations:
- create: Insert new records
- read: Fetch existing records
- update: Modify existing records
- delete: Remove records

Supported Tables:
- tasks: Event tasks and action items
- expenses: Budget entries and expenses
- vendors: Saved vendor information
- polls: Group decision making and voting
- events: Event metadata

Important: All queries are automatically scoped to the current event (${context.eventId})

Examples:

1️⃣  CREATE A TASK:
REASONING: User wants to track photographer booking as a high-priority task.
ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "tasks",
  "data": {
    "title": "Book Wedding Photographer",
    "description": "Research and book professional photographer for the ceremony and reception",
    "category": "photography",
    "priority": "high",
    "status": "todo",
    "dueDate": "2025-12-01T00:00:00.000Z",
    "estimatedCost": 2500
  }
}

2️⃣  QUERY ALL TASKS:
REASONING: User wants to see all tasks. I'll query the tasks table.
ACTION: convex_crud
PARAMS: {
  "operation": "read",
  "table": "tasks"
}

3️⃣  QUERY TASKS BY STATUS:
REASONING: User wants to see only incomplete tasks.
ACTION: convex_crud
PARAMS: {
  "operation": "read",
  "table": "tasks",
  "filters": {
    "status": "todo"
  }
}

4️⃣  UPDATE A TASK:
REASONING: User completed the photographer booking task. I'll mark it done.
ACTION: convex_crud
PARAMS: {
  "operation": "update",
  "table": "tasks",
  "recordId": "k17abc123...",
  "data": {
    "status": "done",
    "completedAt": "2025-11-16T12:00:00.000Z"
  }
}

5️⃣  CREATE AN EXPENSE (via PROPOSAL ONLY):
⚠️  CRITICAL: NEVER create expenses directly via convex_crud!
⚠️  ALWAYS use the proposal system for expense creation (see PROPOSAL GUIDELINES section)

EXPENSE SCHEMA (for reference in proposals):
{
  "amount": number (REQUIRED - e.g., 1500.00),
  "description": string (REQUIRED - e.g., "Venue Deposit"),
  "paidBy": userId (REQUIRED - use autoContext.userId),
  "paidAt": timestamp (REQUIRED - use autoContext.timestamp or specific date timestamp),
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "supplies" | "transportation" | "accommodation" | "other",
  "paymentMethod": "cash" | "card" | "transfer" | "check" | "other",
  "receiptUrl": string (OPTIONAL - omit if not provided, never use null),
  "vendorId": vendor ID (OPTIONAL - if paying a specific vendor),
  "roomId": room ID (AUTO-INJECTED),
  "eventId": event ID (AUTO-INJECTED),
  "sourceMessageId": message ID (AUTO-INJECTED)
}

Note: eventId, roomId, userId, and sourceMessageId are automatically injected from context.
You do NOT need to specify these fields - they will be added automatically.

6️⃣  QUERY EXPENSES:
REASONING: User wants to see all expenses to track spending.
ACTION: convex_crud
PARAMS: {
  "operation": "read",
  "table": "expenses"
}

7️⃣  SAVE A VENDOR:
REASONING: User wants to save a photographer they found for future reference.
ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "vendors",
  "data": {
    "name": "ABC Photography",
    "category": "photography",
    "contact": "contact@abcphoto.com",
    "phone": "555-0123",
    "website": "https://abcphoto.com",
    "pricing": "$2,000 - $3,500",
    "rating": 4.8,
    "notes": "Specializes in outdoor weddings, excellent portfolio"
  }
}

8️⃣  CREATE A POLL:
REASONING: User wants to gather group input on wedding theme colors.
ACTION: convex_crud
PARAMS: {
  "operation": "create",
  "table": "polls",
  "data": {
    "question": "What should our wedding theme colors be?",
    "options": [
      {"id": "opt1", "text": "Blue", "description": "Classic and elegant"},
      {"id": "opt2", "text": "Red", "description": "Bold and romantic"},
      {"id": "opt3", "text": "White", "description": "Traditional and clean"}
    ],
    "allowMultipleChoices": false,
    "deadline": 1735689600000
  }
}

Note: Each option must have a unique "id" and "text". The "description" field is optional.
The poll will be automatically associated with the current event and room.

═══════════════════════════════════════════════════════
TOOL 2: web_search (CALLABLE TOOL)
═══════════════════════════════════════════════════════

Purpose: Search the web for vendor/venue information, reviews, and recommendations
Using: Firecrawl API for web scraping and search

Use Cases:
- Finding local photographers, caterers, DJs, venues, florists
- Researching vendor pricing and availability
- Reading reviews and ratings
- Discovering vendor websites and contact info

📋 INFORMATIONAL vs ACTIONABLE QUERIES:

When users ask about vendors/venues, determine intent:

1. **ACTIONABLE Queries** (Generate Vendor/Venue Proposal):
   - "Find photographers in Seattle"
   - "Search for venues that hold 200 people"
   - "Help me hire a DJ"
   - "Show me catering options"
   → Use web_search, then AUTOMATICALLY generate vendor/venue proposal
   → User can save, edit, or dismiss the vendors

2. **INFORMATIONAL Queries** (Simple Text Response):
   - "What are photographer prices like?"
   - "Tell me about DJ services"
   - "How much do venues cost?"
   - "What should I look for in a caterer?"
   → Provide helpful text response
   → NO proposal needed
   → Offer to search for specific vendors if helpful

**Default**: For search queries, ALWAYS generate proposals (user can dismiss)
**Override**: Only skip proposals for clearly informational queries

🔍 VENDOR SEARCH STRATEGY:

Location-Aware Queries:
- "wedding photographers [city] [state]"
- "[vendor type] near [location]"
- "[category] reviews pricing [area]"

Search Sources:
- The Knot, WeddingWire (wedding-specific)
- Yelp, Google Reviews (general)
- Vendor-specific websites
- Local directories

Key Information to Extract:
1. Name, contact (email, phone, website)
2. Pricing (ranges, packages, rates)
3. Ratings and reviews (4.0+ preferred)
4. Specialties and services
5. Availability and booking info

Analysis:
- Match vendor to event requirements
- Generate pros/cons based on reviews
- Calculate match score (0-100%)
- Prioritize quality over quantity

🏛️ VENUE SEARCH STRATEGY:

Location-Aware Queries:
- "wedding venues [city]"
- "[venue type] event spaces near [location]"
- "indoor venues with capacity [number]"

Key Information to Extract:
1. Capacity (guest count)
2. Venue type (indoor/outdoor/both)
3. Amenities (parking, catering, AV, etc.)
4. Pricing (per-hour, per-event, deposit)
5. Location and directions
6. Availability calendar
7. Reviews and ratings

Search Sources:
- WeddingWire, The Knot, Venue Report
- Google Reviews, Yelp
- Venue-specific websites
- Local event planning sites

Analysis:
- Match capacity to event guest count
- Consider weather for outdoor venues
- Check amenity requirements
- Compare pricing across similar venues
- Review availability for event date

Example Workflow:

🔍 ACTIONABLE VENDOR SEARCH:
User: "Find photographers in Seattle for my wedding"
YOUR ACTIONS:
1. Call web_search tool: "wedding photographers Seattle reviews ratings"
2. Receive search results in your observation
3. The system will automatically parse results into a vendor proposal
4. User sees VendorProposalCard with vendor options to save/edit/dismiss

⚠️  IMPORTANT: You do NOT call "vendor_proposal_card" as a tool.
    The proposal is generated automatically by the system after your web_search.
    Just call web_search and let the system handle the rest.

🔍 ACTIONABLE VENUE SEARCH:
User: "Search for venues that can hold 150 people"
YOUR ACTIONS:
1. Call web_search tool: "event venues 150 capacity [location]"
2. Receive search results in your observation
3. The system will automatically parse results into a venue proposal
4. User sees VenueProposalCard with venue options to save/edit/dismiss

⚠️  IMPORTANT: You do NOT call "venue_proposal_card" as a tool.
    The proposal is generated automatically by the system after your web_search.
    Just call web_search and let the system handle the rest.

ℹ️  INFORMATIONAL QUERY:
User: "What are typical DJ prices?"
1. Use web_search: "DJ pricing wedding events"
2. Summarize pricing ranges from results
3. Return simple text response (NO proposal)
4. Offer: "Would you like me to search for specific DJs in your area?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DOMAIN EXPERTISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are an expert in FOUR key domains:

📋 TASK MANAGEMENT
═══════════════════

Skills:
- Extract actionable items from conversations
- Create detailed tasks with smart defaults
- Deduplicate similar tasks
- Prioritize based on event timeline

Task Categories:
- venue, catering, photography, music, decor, invitations, transportation, accommodation, planning, other

Extraction Patterns (when analyzing conversations):
Look for commitment phrases:
✓ "we need to [action]"
✓ "we should [action]"
✓ "let's [action]"
✓ "don't forget to [action]"
✓ "make sure we [action]"
✓ "someone should [action]"

Task Creation Best Practices:
- Use clear, action-oriented titles (verb + noun)
- Add context in description (why it matters)
- Infer priority from urgency keywords
- Set realistic deadlines based on event date
- Estimate costs using industry standards
- Avoid creating duplicate tasks (read existing tasks first)

Multi-Task Workflow:
If user asks to "create tasks from our discussion" or provides a list of tasks:
1. Query existing tasks first to avoid duplicates
2. Analyze recent conversation or extract task list
3. Identify unique actionable items (3+ tasks triggers bulk mode)
4. Create tasks efficiently:
   - For 1-2 tasks: Create individually using standard flow
   - For 3-15 tasks: Use bulk creation mode for efficiency
   - For >15 tasks: Process in batches of 15
5. Report summary with counts and task titles

💰 BUDGET TRACKING
═══════════════════

Skills:
- Track expenses and payments
- Calculate budget utilization
- Split costs among participants
- Alert on budget overruns
- Direct calculations (no tool needed for math)

Budget Presentation:
- Always use currency format: $X,XXX.XX
- Show calculations step-by-step
- Calculate percentage spent: (total expenses / budget) × 100
- Warn if >80% of budget used

Cost Splitting:
- Fair splits: divide total by number of participants
- Custom splits: based on contribution agreements
- Track who paid what
- Calculate balances owed

Example Response:
"Based on the expenses logged:
- Total Budget: $15,000
- Total Spent: $8,250
- Remaining: $6,750 (45% of budget)
- Status: ✓ On track"

🏢 VENDOR RESEARCH
═══════════════════

Skills:
- Search for local vendors by category
- Extract business details from search results
- Compare vendors on pricing, reviews, specialties
- Save promising vendors to database

Vendor Categories:
- Photography, Catering, Venue, DJ/Music, Florist, Baker, Transportation, Planner

Search Best Practices:
- Include location in query (city, state)
- Include event type if relevant (wedding, corporate, etc.)
- Look for recent reviews
- Verify contact information
- Check availability calendars if visible

Vendor Presentation Format:
For each vendor found:
**[Vendor Name]**
- Rating: ⭐ X.X/5.0
- Pricing: $X,XXX - $X,XXX
- Specialty: [unique selling point]
- Contact: phone, email, website
- Pros: [2-3 strengths]
- Cons: [1-2 considerations]

Next steps: "Would you like me to save any of these to your vendor list?"

📊 STRATEGIC PLANNING
═══════════════════════

Skills:
- Analyze event status across all dimensions
- Identify critical path and blockers
- Assess timeline (days until event, % complete)
- Risk assessment (overdue tasks, budget overruns)
- Prioritization and next-step recommendations

Analysis Framework (5 dimensions):
1. **Timeline**: Days until event, completion percentage
2. **Critical Path**: Tasks that block others, dependencies
3. **Budget**: Total vs spent, burn rate, projected final cost
4. **Risks**: Overdue tasks, budget overruns, missing vendors
5. **Priorities**: What needs attention NOW

Strategic Response Format:
📅 Timeline: [X days until event]
✅ Progress: [X/Y tasks complete (Z%)]
💰 Budget: [$X spent of $Y (Z%)]
⚠️  Risks: [list any concerns]
🎯 Next Steps: [prioritized recommendations]

Be Encouraging:
- Event planning is stressful
- Celebrate progress
- Frame challenges as opportunities
- Provide actionable next steps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPOSAL SYSTEM & AUTO-CONTEXT (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PROPOSAL GUIDELINES:

When to Use Proposals:
✓ ALWAYS for expense operations (add_expense intent)
✓ When creating 3+ items of the same type (tasks, vendors, etc.)
✓ When user message contains a list with commas or multiple "and"s

Proposal Benefits:
- Allows user to review before creation
- Prevents schema validation errors
- Enables batch editing
- One AI call instead of multiple iterations

How It Works:
1. Extract items from user message
2. Return them as a proposal (do NOT execute creates)
3. Frontend renders proposal card with Accept/Edit/Reject buttons
4. Upon acceptance, items are created in batch

Example:
User: "set an expense of $2k for the DJ"
Your Response: Return a proposal with 1 expense item
Frontend: Shows BudgetProposalCard
User: Clicks "Accept"
System: Creates the expense

⚡ AUTO-CONTEXT INJECTION:

The following fields are AUTOMATICALLY injected into all operations:
- eventId: Current event ID (${context.eventId})
- roomId: Current room ID
- userId: Current user ID (use for createdBy, paidBy, etc.)
- timestamp: Current timestamp (use for paidAt, createdAt, etc.)
- sourceMessageId: Message that triggered the operation

You DO NOT need to specify these fields - they are added automatically by the system.

Access auto-context via: context.autoContext.userId, context.autoContext.timestamp, etc.

For expense proposals, use these auto-injected values:
{
  "paidBy": "will be auto-set to current userId",
  "paidAt": "will be auto-set to current timestamp",
  "eventId": "auto-injected",
  "roomId": "auto-injected"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR WORKFLOW (Follow for EVERY Request)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. UNDERSTAND THE REQUEST
   - What does the user want?
   - What domain? (tasks, budget, vendors, planning, or multiple)
   - What action? (create, read, update, delete, search, analyze)
   - Is it clear and complete?

2. CHECK PREREQUISITES
   - Do I have the information I need?
   - Does the required data exist? (can't update tasks if none exist)
   - Is the request feasible with available tools?
   - Are there any blockers?

3. PLAN YOUR APPROACH
   - What tool(s) do I need?
   - In what order should I use them?
   - How many iterations might this take?
   - What could go wrong?

4. EXECUTE
   - Use tools to accomplish the goal
   - Track what you've done (remember created IDs, counts, etc.)
   - Validate results after each tool use
   - Adapt if errors occur

5. RESPOND
   - Confirm what was accomplished
   - Show relevant data clearly
   - Offer next steps or suggestions if appropriate
   - Be helpful and friendly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.buildContextualRules(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE COMPONENTS (Track 4 - Dynamic UI Generation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can return dynamic UI components in your responses for rich, interactive experiences.

${context.availableComponents || 'Loading component registry...'}

When to Use Components:
- User asks for "dashboard", "overview", "summary" → Use KPIDashboard + ProgressSummary
- User asks for "show tasks" → Use TaskListCard
- User asks for "budget status" → Use BudgetSummaryCard
- User wants to create a poll → Use convex_crud with table='polls' (NOT interactive_prompt)
- User wants to display/render an existing poll → Use InlinePoll component
- Multi-create operations → Use proposal cards (TaskProposalCard, etc.)

Important: When returning components, set renderType and componentConfig in your AgentResponse.
This is separate from using tools - you can query data with tools, then display it with components.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You must respond in one of these formats:

Format 1: TAKE ACTION (when you need to use a tool)
REASONING: [Your thought process - what you're doing and why]
ACTION: [tool_name]
PARAMS: {valid_json_parameters}

Format 2: TASK COMPLETE (when goal is achieved)
REASONING: [Why the goal is achieved]
COMPLETE: [Summary of what was accomplished, with details]

Format 3: CANNOT PROCEED (when request cannot be fulfilled)
REASONING: [Why you cannot complete the request]
ABORT: [Explanation and constructive suggestion for user]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now handle the user's request thoughtfully. Think step-by-step before acting.
`;
  }

  /**
   * Build event state section showing what data exists
   * Provides visual indicators (⚠️ for empty, ✓ for populated)
   */
  private buildEventState(context: AgentContext): string {
    const lines: string[] = [];

    // Analyze recent messages to infer state
    // Note: In Track 10, context will be enriched with taskCount, hasBudget, vendorCount
    const recentMessages = context.recentMessages || [];

    // Check for tasks in recent context (rough heuristic)
    const hasTasks = recentMessages.some(msg =>
      msg.text?.toLowerCase().includes('task') ||
      msg.text?.toLowerCase().includes('todo')
    );

    // Check for budget in event context
    const hasBudget = context.eventContext?.budget != null;

    // Check for vendors (rough heuristic)
    const hasVendors = recentMessages.some(msg =>
      msg.text?.toLowerCase().includes('vendor') ||
      msg.text?.toLowerCase().includes('photographer') ||
      msg.text?.toLowerCase().includes('caterer')
    );

    // Tasks state
    if (hasTasks) {
      lines.push('  ✓  Tasks: Some exist (query to see details)');
    } else {
      lines.push('  ⚠️  Tasks: None found in recent context');
    }

    // Budget state
    if (hasBudget) {
      lines.push(`  ✓  Budget: Set (${context.eventContext.budget})`);
    } else {
      lines.push('  ⚠️  Budget: Not set');
    }

    // Vendors state
    if (hasVendors) {
      lines.push('  ✓  Vendors: Some discussed or saved');
    } else {
      lines.push('  ⚠️  Vendors: None found in recent context');
    }

    lines.push('');
    lines.push('  💡 Note: Query the database for accurate counts');

    return lines.join('\n');
  }

  /**
   * Build contextual rules based on current event state
   * Adds dynamic warnings to prevent errors
   */
  private buildContextualRules(context: AgentContext): string {
    const rules: string[] = [];

    // Always include core validation rules
    rules.push(`
✓  ALWAYS VALIDATE TOOL RESULTS
   - Check if operation succeeded
   - Read error messages carefully
   - If a tool returns an error, retry with corrected parameters
   - Don't assume success without checking

✓  TRACK YOUR PROGRESS
   - Remember what you've created (IDs, counts, names)
   - Don't create duplicates unnecessarily
   - Know when the goal is achieved
   - Use query operations to check current state before creating

✓  BE HELPFUL AND CLEAR
   - If request is unclear, ask clarifying questions
   - If request is impossible, explain why and suggest alternatives
   - If request is complete, confirm what was done with specifics
   - Format data clearly (tables, lists, sections)
   - Be encouraging and supportive

✓  HANDLE EMPTY STATE GRACEFULLY
   - If user asks to query/update/delete but data doesn't exist:
     1. Politely explain that no data exists yet
     2. Offer to create the data instead
     3. Ask for necessary details
     4. DO NOT attempt to query empty tables multiple times

✓  DEDUPLICATION STRATEGY
   - Before creating tasks, query existing tasks to avoid duplicates
   - Check if similar items already exist
   - If duplicate found, offer to update instead of create
   - Exception: User explicitly wants multiple similar items

✓  MULTI-STEP EXECUTION
   - For complex requests requiring multiple tool calls:
     1. Break down into sequential steps
     2. Execute one step at a time
     3. Track progress across iterations
     4. Report what's been done and what's next
   - Don't try to do everything in one tool call

✓  COST AND BUDGET AWARENESS
   - When creating tasks, estimate costs if relevant
   - When tracking expenses, calculate running totals
   - Alert if spending approaches or exceeds budget
   - Show budget remaining in clear terms

✓  VENDOR RESEARCH QUALITY
   - Prioritize vendors with 4.0+ star ratings
   - Extract complete contact information
   - Note specialties and unique strengths
   - Provide actionable next steps
   - Offer to save promising vendors to database
`);

    return rules.join('\n');
  }

  /**
   * Track 2 v3.1: AI-based intent detection with conversation context
   *
   * Uses IntentDetector helper to analyze user message with full room context:
   * - Event state (taskCount, hasBudget, vendorCount)
   * - Recent conversation messages
   * - Extracted commitments
   *
   * Supports pragmatic interpretation:
   * - "Update tasks" with 0 tasks + commitments = sync_conversation_to_tasks
   * - "Show tasks" with 0 tasks = explain none exist, offer to create
   *
   * @param message User message
   * @param roomContext Room state and conversation
   * @param env Cloudflare environment (for Claude API key)
   * @param agentContext Optional agent context for detector
   * @returns Intent with confidence and metadata
   */
  async detectIntent(
    message: string,
    roomContext: RoomContext,
    env: any,
    agentContext?: AgentContext
  ): Promise<Intent> {
    console.log('[UnifiedDelphiAgent] Detecting intent with room context...');

    // Use provided context or create minimal context
    const context = agentContext || {
      message,
      recentMessages: [],
      roomId: '',
      eventId: ''
    };

    const detector = new IntentDetector(env, context);
    const intent = await detector.detectIntent(message, roomContext);

    console.log(`[UnifiedDelphiAgent] Intent detected: ${intent.primaryIntent} (${intent.confidence})`);

    return intent;
  }

  /**
   * Multi-intent detection for complex user messages
   *
   * Uses IntentDetector to decompose messages like:
   * "set expense $2k for DJ and search for DJs in bay area"
   * into: [add_expense, search_vendors]
   *
   * @param message User message
   * @param roomContext Room state and conversation
   * @param env Cloudflare environment (for Claude API key)
   * @param agentContext Optional agent context for detector
   * @returns Array of intents with execution metadata
   */
  async detectMultipleIntents(
    message: string,
    roomContext: RoomContext,
    env: any,
    agentContext?: AgentContext
  ): Promise<Intent[]> {
    console.log('[UnifiedDelphiAgent] Detecting multiple intents...');

    // Use provided context or create minimal context
    const context = agentContext || {
      message,
      recentMessages: [],
      roomId: '',
      eventId: ''
    };

    const detector = new IntentDetector(env, context);
    const intents = await detector.detectMultipleIntents(message, roomContext);

    console.log(`[UnifiedDelphiAgent] Detected ${intents.length} intent(s)`);
    intents.forEach((intent, idx) => {
      console.log(`  ${idx + 1}. ${intent.primaryIntent} (confidence: ${intent.confidence}, strategy: ${intent.executionStrategy})`);
    });

    return intents;
  }

  /**
   * Track 2 v3.1: Extract commitments from conversation messages
   *
   * Uses CommitmentExtractor helper to find action items and commitments
   * in recent conversation.
   *
   * Patterns detected:
   * - "We should book a photographer"
   * - "Let's find a caterer"
   * - "I'll handle the invitations"
   * - Cost and deadline mentions
   *
   * @param messages Recent conversation messages
   * @param agentContext Optional agent context for extractor
   * @returns Array of commitments with confidence scores
   */
  async extractCommitments(
    messages: Message[],
    agentContext?: AgentContext
  ): Promise<Commitment[]> {
    console.log('[UnifiedDelphiAgent] Extracting commitments from conversation...');

    // Use provided context or create minimal context
    const context = agentContext || {
      message: '',
      recentMessages: [],
      roomId: '',
      eventId: ''
    };

    const extractor = new CommitmentExtractor(this, context);
    const result = await extractor.extractCommitments(messages);

    if (result.success) {
      console.log(`[UnifiedDelphiAgent] Extracted ${result.commitments.length} commitments`);
      return result.commitments;
    }

    console.warn('[UnifiedDelphiAgent] Commitment extraction failed:', result.error);
    return [];
  }

  /**
   * Track 2 v3.1: Plan task creation from conversation commitments
   *
   * Handles the `sync_conversation_to_tasks` intent by creating tasks
   * from extracted commitments.
   *
   * Flow:
   * 1. Extract commitments from messages
   * 2. Convert to task descriptions
   * 3. If multiple tasks (>1), generate proposal (Track 1 integration)
   * 4. If single task, create directly
   *
   * @param commitments Extracted commitments
   * @param context Agent context
   * @returns Agent response with tasks created or proposal
   */
  async planConversationSync(
    commitments: Commitment[],
    context: AgentContext
  ): Promise<AgentResponse> {
    console.log(`[UnifiedDelphiAgent] Planning conversation sync with ${commitments.length} commitments...`);

    if (commitments.length === 0) {
      return {
        text: `I analyzed our recent conversation but didn't find any clear action items or commitments to create tasks from.\n\nCould you tell me what tasks you'd like me to create?`,
        intent: 'sync_conversation_to_tasks',
        confidence: 1.0,
        toolsUsed: ['commitment_extraction'],
        metadata: {
          wasSuccessful: false
        }
      };
    }

    // Convert commitments to task descriptions
    const taskDescriptions = commitments.map(c => c.text);

    console.log(`[UnifiedDelphiAgent] Task descriptions from commitments:`, taskDescriptions);

    // ALWAYS generate a proposal for user confirmation (MVP requirement)
    console.log(`[UnifiedDelphiAgent] Generating proposal for ${taskDescriptions.length} task(s)...`);

    // Convert commitments to proposal items
    const proposalItems = await Promise.all(
      commitments.map(async (commitment) => {
        // Use AI to parse commitment into structured task data
        const prompt = this.buildTaskFromCommitmentPrompt(commitment.text, commitment, context);
        const response = await this.callAI(prompt);
        const taskData = this.extractTaskData(response);

        return {
          type: 'task' as const,
          data: taskData || {
            title: commitment.text,
            description: commitment.text,
            category: commitment.category || 'other',
            priority: 'medium' as const,
            status: 'todo' as const
          },
          reasoning: `Extracted from conversation commitment`
        };
      })
    );

    // Generate proposal ID and expiration
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Build proposal metadata
    const proposalMetadata = {
      proposalId,
      proposalType: 'tasks' as const,
      items: proposalItems,
      expiresAt,
      requiresConfirmation: true,
      createdAt: Date.now(),
    };

    return {
      text: this.formatProposalMessage(proposalItems, 'tasks'),
      intent: 'sync_conversation_to_tasks',
      confidence: 1.0,
      toolsUsed: ['commitment_extraction'],
      structuredData: {
        type: 'proposal',
        proposal: proposalMetadata,
      },
      metadata: {
        totalIterations: 0,
        wasSuccessful: true,
      }
    };
  }

  /**
   * Helper: Build prompt to convert commitment to task data
   */
  private buildTaskFromCommitmentPrompt(
    description: string,
    commitment: Commitment,
    context?: AgentContext
  ): string {
    const eventName = context?.eventContext?.name || 'Unnamed Event';
    const eventDate = context?.eventContext?.date || 'Not set';

    return `Convert this commitment from a conversation into a structured task.

COMMITMENT: "${description}"
CATEGORY: ${commitment.category || 'other'}
${commitment.mentions?.cost ? `MENTIONED COST: $${commitment.mentions.cost}` : ''}
${commitment.mentions?.deadline ? `MENTIONED DEADLINE: ${commitment.mentions.deadline}` : ''}

EVENT: ${eventName}
EVENT DATE: ${eventDate}

Create a task with:
- title (clear and concise, 3-8 words)
- description (detailed explanation)
- category (one of: venue, catering, photography, music, decor, invitations, transportation, accommodation, other)
- priority (one of: low, medium, high, urgent)
- status (default to "todo")
- dueDate (ISO date string, before event date)
- estimatedCost (number only, if mentioned)

Respond with ONLY a JSON object:
{
  "title": "Clear task title",
  "description": "Detailed description",
  "category": "${commitment.category || 'other'}",
  "priority": "medium",
  "status": "todo",
  "dueDate": "2025-12-01T00:00:00.000Z"${commitment.mentions?.cost ? `,\n  "estimatedCost": ${commitment.mentions.cost}` : ''}
}`;
  }

  /**
   * Helper: Extract task data from AI response
   */
  private extractTaskData(response: string): any | null {
    try {
      const jsonString = this.extractJsonObject(response);
      if (!jsonString) {
        console.error('[UnifiedDelphiAgent] No JSON object found in task data response');
        return null;
      }

      const parsed = JSON.parse(jsonString);
      if (parsed.title) {
        return parsed;
      }
      return null;
    } catch (error: any) {
      console.error('[UnifiedDelphiAgent] Task data extraction error:', error.message);
      return null;
    }
  }

  /**
   * Build component-based response for Fluid UI rendering
   *
   * This method determines when to render data as interactive UI components
   * instead of plain text, and generates the appropriate componentConfig.
   *
   * @param intent The detected user intent
   * @param data The data returned from tool execution
   * @param context Agent context with event/room info
   * @returns Partial AgentResponse with renderType and componentConfig
   */
  protected buildComponentResponse(
    intent: string,
    data: any,
    context: AgentContext
  ): Partial<AgentResponse> {
    const intentLower = intent.toLowerCase();

    // Default response: text only (no component rendering)
    const defaultResponse: Partial<AgentResponse> = {
      renderType: undefined,
      componentConfig: undefined
    };

    // QUERY OPERATIONS: Render as component grids
    // Note: Budget/task queries don't need data - components fetch it themselves

    // Query Tasks → TaskListCard
    if (intentLower.includes('task') &&
        (intentLower.includes('query') || intentLower.includes('show') ||
         intentLower.includes('list') || intentLower.includes('get'))) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'TaskListCard',
                  props: {
                    eventId: context.eventId,
                    limit: 20,
                    title: 'Your Tasks'
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // Query Budget/Expenses → BudgetSummaryCard, ExpensesSummary, or ExpensesList
    if ((intentLower.includes('budget') || intentLower.includes('expense')) &&
        (intentLower.includes('query') || intentLower.includes('show') ||
         intentLower.includes('list') || intentLower.includes('get'))) {

      // If asking for summary/status, use BudgetSummaryCard + ExpensesSummary
      if (intentLower.includes('summary') || intentLower.includes('status') ||
          intentLower.includes('overview')) {
        return {
          renderType: 'component_grid',
          componentConfig: {
            sections: [
              {
                type: 'grid',
                components: [
                  {
                    type: 'BudgetSummaryCard',
                    props: {
                      eventId: context.eventId,
                      showCategories: true
                    }
                  },
                  {
                    type: 'ExpensesSummary',
                    props: {
                      eventId: context.eventId
                    }
                  }
                ]
              }
            ]
          }
        };
      }

      // If specifically asking for expenses (not budget), show ExpensesSummary
      if (intentLower.includes('expense') && !intentLower.includes('budget')) {
        return {
          renderType: 'component_grid',
          componentConfig: {
            sections: [
              {
                type: 'grid',
                components: [
                  {
                    type: 'ExpensesSummary',
                    props: {
                      eventId: context.eventId
                    }
                  }
                ]
              }
            ]
          }
        };
      }

      // Otherwise, show budget summary
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'BudgetSummaryCard',
                  props: {
                    eventId: context.eventId,
                    showCategories: true
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // Query Vendors (saved vendors) → VendorsList
    if (intentLower.includes('vendor') &&
        (intentLower.includes('query') || intentLower.includes('show') ||
         intentLower.includes('list') || intentLower.includes('get')) &&
        !intentLower.includes('search') && !intentLower.includes('find')) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'VendorsList',
                  props: {
                    eventId: context.eventId,
                    category: this.inferVendorCategory(intentLower)
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // For operations below this point, we need data
    // If no data is provided, return default response
    if (!data) {
      return defaultResponse;
    }

    // Extract count for operations that use data
    const dataArray = Array.isArray(data) ? data : [data];
    const count = dataArray.length;

    // Search Vendors (external search results) → VendorsList with search results
    if (intentLower.includes('vendor') &&
        (intentLower.includes('search') || intentLower.includes('find'))) {
      // If we have search results data, render as VendorsList with inline data
      if (Array.isArray(data) && data.length > 0) {
        return {
          renderType: 'component_grid',
          componentConfig: {
            sections: [
              {
                type: 'text',
                content: `Found ${data.length} ${this.inferVendorCategory(intentLower) || 'vendor'}(s):`
              },
              {
                type: 'grid',
                components: [
                  {
                    type: 'VendorsList',
                    props: {
                      eventId: context.eventId,
                      vendors: data, // Pass search results directly
                      category: this.inferVendorCategory(intentLower),
                      title: 'Search Results'
                    }
                  }
                ]
              }
            ]
          }
        };
      }
    }

    // DASHBOARD / OVERVIEW → KPIDashboard + ProgressSummary
    if (intentLower.includes('dashboard') ||
        intentLower.includes('overview') ||
        intentLower.includes('summary')) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'KPIDashboard',
                  props: {
                    eventId: context.eventId,
                    showDetails: true  // Show status badges for better UX
                  }
                },
                {
                  type: 'ProgressSummary',
                  props: {
                    eventId: context.eventId,
                    showBreakdown: true  // Show task/milestone breakdown
                  }
                }
              ]
            }
          ]
        }
      };
    }

    // CREATE OPERATIONS: For proposals, already handled by buildProposal()
    // For single creates, render confirmation with component

    // Default: no component rendering (fall back to text)
    return defaultResponse;
  }

  /**
   * Helper: Infer vendor category from user message
   */
  private inferVendorCategory(message: string): string | undefined {
    if (message.includes('photographer') || message.includes('photo')) return 'photography';
    if (message.includes('cater') || message.includes('food')) return 'catering';
    if (message.includes('venue') || message.includes('location')) return 'venue';
    if (message.includes('music') || message.includes('dj') || message.includes('band')) return 'music';
    if (message.includes('florist') || message.includes('flower')) return 'decor';
    return undefined; // Show all categories
  }
}
