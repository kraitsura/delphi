/**
 * RoomOrchestratorDO - Stateful Durable Object for per-room conversation persistence
 *
 * Track 5: RoomOrchestratorDO Implementation
 *
 * Purpose: Manages conversation state, message history, and agent invocations for a single chat room
 *
 * Architecture: One DO instance per room
 * - Maintains hot memory (last 200 messages)
 * - Compresses older messages into summary
 * - Checkpoints to Convex every 50 messages
 * - Uses UnifiedDelphiAgent for all agent requests
 * - Keyword-based intent detection (Phase 1)
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../web/convex/_generated/api';
import { UnifiedDelphiAgent } from '../agents/UnifiedDelphiAgent';
import { ConvexCRUDTool } from '../tools/ConvexCRUDTool';
import { FirecrawlTool } from '../tools/FirecrawlTool';
import { ToolContext } from '../tools';
import { AgentContext } from '../agents/BaseAgent';
import { ContextBuilder, RoomContext, Intent as EnhancedIntent, Message as ContextMessage, TieredIntentDetector } from '../agents/helpers';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Message {
  _id: string;
  text: string;
  author?: {
    _id: string;
    name?: string;
  };
  authorId: string;
  createdAt: number;
  isAIGenerated: boolean;
  parentMessageId?: string;
  threadId?: string;
}

interface Poll {
  _id: string;
  question: string;
  options: string[];
  status: 'active' | 'closed';
  votes: Record<string, any>;
}

interface AgentAction {
  type: 'create_task' | 'create_poll' | 'search_vendor' | 'update_budget';
  status: 'pending' | 'completed' | 'failed';
  metadata: any;
}

interface Workflow {
  id: string;
  type: string;
  status: 'active' | 'completed';
  steps: any[];
}

interface Intent {
  primaryIntent: string;
  confidence: number;
  domain: 'tasks' | 'budget' | 'vendors' | 'planning' | 'general';
  action: 'create' | 'read' | 'update' | 'delete' | 'plan' | 'sync';
  preconditionsMet: boolean;
  missingInformation: string[];
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  suggestedActions?: string[];
}

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
  lastActivity: number;
  checkpointId: string;
  memoryUsage: number;  // Track for 128MB limit
}

// ============================================================================
// ROOM ORCHESTRATOR DO
// ============================================================================

export class RoomOrchestratorDO {
  private doState: DurableObjectState;
  private env: any;
  private state: RoomState | null = null;
  private agent: UnifiedDelphiAgent | null = null;

  // Track 2 v3.1: Intent caching
  private intentCache: Map<string, EnhancedIntent> = new Map();
  private contextBuilder: ContextBuilder | null = null;
  private tieredDetector: TieredIntentDetector | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.doState = state;
    this.env = env;
  }

  // ============================================================================
  // EVENT ORCHESTRATOR DELEGATION
  // ============================================================================

  /**
   * Get the EventOrchestratorDO stub for the given event
   * EventOrchestratorDO owns event-wide state (tasks, expenses, vendors)
   */
  private getEventOrchestrator(eventId: string): DurableObjectStub {
    const id = this.env.EVENT_ORCHESTRATOR.idFromName(`event-${eventId}`);
    return this.env.EVENT_ORCHESTRATOR.get(id);
  }

  /**
   * Fetch cached event context from EventOrchestratorDO
   * This avoids repeated Convex fetches for event-level data
   */
  private async getEventContextFromDO(eventId: string, roomId: string): Promise<any> {
    try {
      const eventDO = this.getEventOrchestrator(eventId);
      const response = await eventDO.fetch(
        new Request('http://internal/context', {
          method: 'GET',
          headers: { 'X-Room-Id': roomId }
        })
      );

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[RoomOrchestratorDO] EventDO context fetch failed: ${response.status}`);
      return null;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching event context from DO:', error);
      return null;
    }
  }

  /**
   * Notify EventOrchestratorDO to sync state after tool calls
   * This is a fire-and-forget operation - errors are logged but don't fail the request
   */
  private async notifyEventDOSync(
    eventId: string,
    convexUrl?: string,
    authToken?: string
  ): Promise<void> {
    try {
      const eventDO = this.getEventOrchestrator(eventId);

      // If we have credentials, do a full sync; otherwise just invalidate
      const body = convexUrl && authToken
        ? JSON.stringify({ eventId, convexUrl, authToken })
        : JSON.stringify({ eventId });

      await eventDO.fetch(
        new Request('http://internal/sync', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      console.log(`[RoomOrchestratorDO] Notified EventDO to sync for event: ${eventId}`);
    } catch (error) {
      // Non-fatal: EventDO will sync on next request anyway
      console.error('[RoomOrchestratorDO] Error notifying EventDO sync:', error);
    }
  }

  // ============================================================================
  // MAIN REQUEST HANDLER
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Load state from DO storage
      await this.loadState();

      // Parse body for POST requests
      let body: any = null;
      if (request.method === 'POST') {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }

      // Initialize room state if needed
      if (!this.state && body?.roomId) {
        await this.initialize(body);
      }

      // Route based on path
      let response: Response;
      switch (path) {
        case "/status":
          response = await this.handleStatus();
          break;
        case "/invoke":
          response = await this.handleMessage(body);
          break;
        case "/checkpoint":
          await this.checkpoint();
          response = new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
          });
          break;
        default:
          response = new Response("Not found", { status: 404 });
      }

      // Save state to DO storage
      await this.saveState();

      return response;
    } catch (error) {
      console.error("[RoomOrchestratorDO Error]", error);
      return new Response(
        JSON.stringify({
          error: "Internal error",
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private async initialize(body: any) {
    console.log(`[RoomOrchestratorDO] Initializing new room state for: ${body.roomId}`);

    this.state = {
      roomId: body.roomId,
      eventId: body.eventId || 'unknown',
      roomType: body.roomType || 'main',
      messageHistory: [],
      messageSummary: '',
      activePolls: [],
      pendingActions: [],
      agentMemory: {
        recentIntents: [],
        activeWorkflows: [],
        contextDigest: ''
      },
      lastActivity: Date.now(),
      checkpointId: '',
      memoryUsage: 0
    };

    await this.doState.storage.put('state', this.state);
  }

  private async loadState() {
    const stored = await this.doState.storage.get<RoomState>('state');
    if (stored) {
      this.state = stored;
      console.log(`[RoomOrchestratorDO] Loaded state for room: ${this.state.roomId}, messages: ${this.state.messageHistory.length}`);
    } else {
      // Recovery: load from Convex checkpoint
      console.log('[RoomOrchestratorDO] No state found in DO storage, attempting recovery from checkpoint');
      await this.recoverFromCheckpoint();
    }
  }

  private async saveState() {
    if (!this.state) return;

    // Update metadata
    this.state.lastActivity = Date.now();
    this.state.memoryUsage = this.estimateMemoryUsage();

    // Save to DO storage
    await this.doState.storage.put('state', this.state);

    // Periodic checkpoint to Convex
    if (this.shouldCheckpoint()) {
      await this.checkpoint();
    }
  }

  private shouldCheckpoint(): boolean {
    if (!this.state) return false;
    return this.state.messageHistory.length % 50 === 0 && this.state.messageHistory.length > 0;
  }

  private estimateMemoryUsage(): number {
    if (!this.state) return 0;

    // Rough estimate: JSON string length as proxy for memory
    const stateJson = JSON.stringify(this.state);
    return stateJson.length;
  }

  // ============================================================================
  // CHECKPOINT & RECOVERY
  // ============================================================================

  private async checkpoint() {
    if (!this.state) return;

    console.log(`[RoomOrchestratorDO] Creating checkpoint for room: ${this.state.roomId}`);

    try {
      // Get Convex client (need to call from worker context since we don't have auth here)
      // For now, we'll store the checkpoint metadata in DO storage
      // The actual Convex checkpoint will be created by the worker after response

      const checkpointData = {
        roomId: this.state.roomId,
        eventId: this.state.eventId,
        messageCount: this.state.messageHistory.length,
        snapshot: this.compressState(),
        timestamp: Date.now(),
        memorySize: this.state.memoryUsage
      };

      // Store checkpoint metadata in DO storage
      await this.doState.storage.put('lastCheckpoint', checkpointData);
      this.state.checkpointId = `checkpoint_${Date.now()}`;

      console.log(`[RoomOrchestratorDO] Checkpoint created: ${this.state.checkpointId}`);
    } catch (error) {
      console.error('[RoomOrchestratorDO] Checkpoint failed:', error);
    }
  }

  private async recoverFromCheckpoint() {
    try {
      // Try to load checkpoint from DO storage
      const checkpoint = await this.doState.storage.get<any>('lastCheckpoint');

      if (checkpoint && checkpoint.snapshot) {
        console.log(`[RoomOrchestratorDO] Recovering from checkpoint: ${checkpoint.messageCount} messages`);
        this.state = this.decompressState(checkpoint.snapshot);
        console.log(`[RoomOrchestratorDO] Recovery successful for room: ${this.state.roomId}`);
      } else {
        console.log('[RoomOrchestratorDO] No checkpoint found, state will need to be initialized');
        this.state = null;
      }
    } catch (error) {
      console.error('[RoomOrchestratorDO] Recovery failed:', error);
      this.state = null;
    }
  }

  private compressState(): string {
    if (!this.state) return '';

    // Simple compression: JSON stringify
    // In production, could use more sophisticated compression
    return JSON.stringify(this.state);
  }

  private decompressState(compressed: string): RoomState {
    return JSON.parse(compressed) as RoomState;
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private async handleMessage(body: any): Promise<Response> {
    const {
      roomId,
      eventId,
      message,
      parentMessageId,
      convexUrl,
      authToken,
      userId,
    } = body;

    console.log(`[RoomOrchestratorDO] Processing message for room: ${roomId}`);
    if (parentMessageId) {
      console.log(`[RoomOrchestratorDO] Reply to message: ${parentMessageId}`);
    }

    try {
      // Validate required params
      if (!convexUrl || !authToken) {
        throw new Error('Missing convexUrl or authToken');
      }

      // Create authenticated Convex client
      const convex = new ConvexHttpClient(convexUrl);
      convex.setAuth(authToken);

      // Get event context and room info
      const eventContext = await this.getEventContext(convex, eventId);
      const recentMessages = await this.getRecentMessages(convex, roomId, parentMessageId);

      // Add message to history
      const userMessage: Message = {
        _id: `temp_${Date.now()}`,
        text: message,
        authorId: userId,
        createdAt: Date.now(),
        isAIGenerated: false,
        parentMessageId
      };
      this.addMessageToHistory(userMessage);

      // Get thread context if this is a reply
      let threadContext: any[] = [];
      if (parentMessageId) {
        threadContext = await this.getThreadContext(convex, parentMessageId);
      }

      // Try to get cached context from EventOrchestratorDO first
      let taskCount: number;
      let hasBudget: boolean;
      let vendorCount: number;

      const cachedEventContext = await this.getEventContextFromDO(eventId, roomId);
      if (cachedEventContext) {
        // Use cached counts from EventOrchestratorDO
        taskCount = cachedEventContext.tasks?.length || 0;
        hasBudget = (cachedEventContext.expenses?.length || 0) > 0;
        vendorCount = cachedEventContext.vendors?.length || 0;
        console.log(`[RoomOrchestratorDO] Using cached event context from EventDO: ${taskCount} tasks, ${vendorCount} vendors`);
      } else {
        // Fallback to Convex queries
        console.log('[RoomOrchestratorDO] EventDO not available, falling back to Convex queries');
        taskCount = await this.getTaskCount(convex, eventId);
        hasBudget = await this.checkBudgetExists(convex, eventId);
        vendorCount = await this.getVendorCount(convex, eventId);
      }

      const enrichedContext = {
        message,
        threadContext,
        recentMessages,
        eventContext,
        roomId,
        eventId,
        eventName: eventContext?.name,
        eventDate: eventContext?.date,
        eventType: eventContext?.type,
        taskCount,
        hasBudget,
        vendorCount,
        cachedEventContext // Include for agent use
      };

      // Initialize agent BEFORE intent detection (fixes timing bug)
      if (!this.agent) {
        const toolContext: ToolContext = {
          convexUrl,
          authToken,
          eventId,
          roomId,
          userId
        };

        const convexTool = new ConvexCRUDTool(toolContext);

        // Get the global Firecrawl queue (singleton)
        const queueId = this.env.FIRECRAWL_QUEUE.idFromName('global');
        const queueStub = this.env.FIRECRAWL_QUEUE.get(queueId);
        const firecrawlTool = new FirecrawlTool(this.env.FIRECRAWL_API_KEY, queueStub);

        this.agent = new UnifiedDelphiAgent(
          this.env.CLAUDE_API_KEY,
          [convexTool, firecrawlTool]
        );
      }

      // Initialize tiered detector for fast intent detection
      if (!this.tieredDetector && this.agent) {
        this.tieredDetector = new TieredIntentDetector(this.env, {
          eventId,
          roomId,
          message,
          eventContext: enrichedContext.eventContext,
          recentMessages: []
        } as any);
      }

      // Track 2 v3.1: Multi-intent detection with conversation context
      const intents = await this.detectMultipleIntents(message, enrichedContext, recentMessages);

      console.log(`[RoomOrchestratorDO] Detected ${intents.length} intent(s)`);
      intents.forEach((intent, idx) => {
        console.log(`  ${idx + 1}. ${intent.primaryIntent} (confidence: ${intent.confidence})`);
      });

      // Track intents in memory
      if (this.state) {
        for (const intent of intents) {
          this.state.agentMemory.recentIntents.push(intent.primaryIntent);
        }
        if (this.state.agentMemory.recentIntents.length > 20) {
          this.state.agentMemory.recentIntents = this.state.agentMemory.recentIntents.slice(-20);
        }
      }

      // Check confidence threshold for all intents
      const CONFIDENCE_THRESHOLD = 0.7;
      const lowConfidenceIntents = intents.filter(i => i.confidence < CONFIDENCE_THRESHOLD);

      if (lowConfidenceIntents.length > 0 && intents.length === 1) {
        // Only ask for clarification if single intent with low confidence
        const intent = intents[0];
        console.log(`[RoomOrchestratorDO] Low confidence (${intent.confidence}), asking for clarification`);
        return new Response(
          JSON.stringify({
            success: true,
            agentResponse: intent.suggestedClarification ||
              `I'm not quite sure what you'd like me to do (confidence: ${Math.round(intent.confidence * 100)}%). Could you clarify?\n\nI can help with:\n- Creating and managing tasks\n- Tracking budget and expenses\n- Finding and saving vendors\n- Creating polls and planning`,
            intent: intent.primaryIntent,
            confidence: intent.confidence,
            lowConfidence: true
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Handle multi-intent case
      if (intents.length > 1) {
        console.log(`[RoomOrchestratorDO] Handling ${intents.length} intents with multi-intent flow`);
        const agentResponse = await this.invokeMultiIntent(intents, enrichedContext, convex);

        // Create AI message with multi-intent metadata
        const aiMessageId = await convex.mutation(api.messages.send, {
          roomId: roomId as any,
          text: agentResponse.text,
          parentMessageId: parentMessageId as any,
          isAIGenerated: true,
          aiMetadata: {
            intent: intents.map(i => i.primaryIntent).join(', '),
            confidence: Math.min(...intents.map(i => i.confidence)),
            agentType: 'UnifiedDelphiAgent',
            toolsUsed: agentResponse.toolsUsed || [],
            structuredData: agentResponse.structuredData,
            renderType: agentResponse.renderType || "text",
            componentConfig: agentResponse.componentConfig,
            interactivePrompt: agentResponse.interactivePrompt,
            responseBlocks: agentResponse.responseBlocks, // Multi-block responses

            // Budget/error tracking
            wasSuccessful: agentResponse.metadata?.wasSuccessful ?? true,
            abortReason: agentResponse.metadata?.abortReason,
            partialSuccess: agentResponse.metadata?.partialSuccess ?? false,
          }
        });

        // Add agent response to history
        const assistantMessage: Message = {
          _id: aiMessageId as unknown as string,
          text: agentResponse.text,
          authorId: 'ai',
          createdAt: Date.now(),
          isAIGenerated: true,
          parentMessageId
        };
        this.addMessageToHistory(assistantMessage);
        await this.manageMemory();

        // Phase 1 Integration: Notify EventOrchestratorDO if tools modified state
        if (agentResponse.toolsUsed && agentResponse.toolsUsed.length > 0) {
          await this.notifyEventDOSync(eventId, convexUrl, authToken);
        }

        return new Response(
          JSON.stringify({
            success: true,
            response: agentResponse.text,
            agentResponse: agentResponse.text,
            intents: intents.map(i => i.primaryIntent),
            confidence: Math.min(...intents.map(i => i.confidence)),
            toolsUsed: agentResponse.toolsUsed || [],
            structuredData: agentResponse.structuredData,
            responseBlocks: agentResponse.responseBlocks,
            aiMetadata: {
              intents: intents.map(i => i.primaryIntent),
              confidence: Math.min(...intents.map(i => i.confidence)),
              agentType: 'UnifiedDelphiAgent',
              toolsUsed: agentResponse.toolsUsed || [],
              structuredData: agentResponse.structuredData
            }
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Single intent - use existing flow
      const intent = intents[0];
      console.log(`[RoomOrchestratorDO] Single intent: ${intent.primaryIntent} (confidence: ${intent.confidence})`);

      // Track 2 v3.1: Handle sync_conversation_to_tasks intent
      if (intent.primaryIntent === 'sync_conversation_to_tasks') {
        console.log('[RoomOrchestratorDO] Handling sync_conversation_to_tasks intent');
        return await this.handleSyncConversationToTasks(
          intent,
          enrichedContext,
          recentMessages,
          convex
        );
      }

      // Validate preconditions (only for non-sync intents)
      const validation = this.validatePreconditions(intent as any, enrichedContext);
      if (!validation.valid) {
        console.log(`[RoomOrchestratorDO] Validation failed: ${validation.message}`);

        // Create AI message so user sees the validation response
        const aiMessageId = await convex.mutation(api.messages.send, {
          roomId: roomId as any,
          text: validation.message,
          parentMessageId: parentMessageId as any,
          isAIGenerated: true,
          aiMetadata: {
            intent: intent.primaryIntent,
            confidence: intent.confidence,
            agentType: 'UnifiedDelphiAgent',
            toolsUsed: [],
            structuredData: null,  // Required by schema (null preserves field in JSON)

            // Budget/error tracking
            wasSuccessful: false,  // Validation failed
            abortReason: 'Validation failed',
            partialSuccess: false,
          }
        });

        console.log(`[RoomOrchestratorDO] Created validation message: ${aiMessageId}`);

        // Add to local history
        if (this.state) {
          const agentMessage: Message = {
            _id: aiMessageId as unknown as string,
            text: validation.message,
            authorId: 'agent',
            createdAt: Date.now(),
            isAIGenerated: true
          };
          this.addMessageToHistory(agentMessage);
          await this.manageMemory();
        }

        return new Response(
          JSON.stringify({
            success: true,
            agentResponse: validation.message,
            suggestedActions: validation.suggestedActions,
            validationFailed: true
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // Invoke agent (agent already initialized above before detectIntent)
      const agentResponse = await this.invokeAgent(intent, enrichedContext, convex);

      // Check if agent was successful (default to true for backwards compatibility)
      const wasSuccessful = agentResponse.metadata?.wasSuccessful ?? true;
      const abortReason = agentResponse.metadata?.abortReason;
      const partialSuccess = agentResponse.metadata?.partialSuccess ?? false;

      console.log(`[RoomOrchestratorDO] Agent response: wasSuccessful=${wasSuccessful}, abortReason=${abortReason}`);

      // Check if agent generated a proposal and save it to database (only if successful)
      let savedProposalId: string | undefined;
      if (wasSuccessful && agentResponse.structuredData?.type === 'proposal') {
        const proposalData = agentResponse.structuredData.proposal;

        console.log('[RoomOrchestratorDO] Agent returned proposal, saving to Convex...');

        // Create proposal in Convex database
        savedProposalId = await convex.mutation(api.proposals.create, {
          eventId: enrichedContext.eventId as any,
          roomId: roomId as any,
          proposalType: proposalData.proposalType,
          items: proposalData.items,
          aiMetadata: {
            intent: intent.primaryIntent,
            confidence: intent.confidence,
            agentType: 'UnifiedDelphiAgent',
            reasoning: proposalData.reasoning || 'Agent-generated proposal'
          }
        });

        console.log(`[RoomOrchestratorDO] Saved proposal to database: ${savedProposalId}`);

        // Update agentResponse structuredData with database proposalId
        agentResponse.structuredData.proposal.proposalId = savedProposalId;
      }

      // ALWAYS create AI message in Convex (even on failure/abort)
      // This ensures users see feedback about what happened
      const aiMessageId = await convex.mutation(api.messages.send, {
        roomId: roomId as any,
        text: agentResponse.text,
        parentMessageId: parentMessageId as any,
        isAIGenerated: true,
        aiMetadata: {
          // Core metadata
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          agentType: 'UnifiedDelphiAgent',
          toolsUsed: agentResponse.toolsUsed || [],

          // Legacy structured data support (include even if partial)
          structuredData: agentResponse.structuredData,

          // Track 4 rendering fields (for advanced UI components)
          renderType: agentResponse.renderType,
          componentConfig: agentResponse.componentConfig,
          interactivePrompt: agentResponse.interactivePrompt,

          // Budget/error tracking
          wasSuccessful,
          abortReason,
          partialSuccess,
        }
      });

      // Add agent response to history
      const assistantMessage: Message = {
        _id: aiMessageId as unknown as string,
        text: agentResponse.text,
        authorId: 'ai',
        createdAt: Date.now(),
        isAIGenerated: true,
        parentMessageId
      };
      this.addMessageToHistory(assistantMessage);

      // Manage memory if needed
      await this.manageMemory();

      // Phase 1 Integration: Notify EventOrchestratorDO if tools modified state
      // This invalidates the EventDO cache so next request gets fresh data
      if (agentResponse.toolsUsed && agentResponse.toolsUsed.length > 0) {
        await this.notifyEventDOSync(eventId, convexUrl, authToken);
      }

      return new Response(
        JSON.stringify({
          success: true,
          response: agentResponse.text, // Keep 'response' for backwards compatibility
          agentResponse: agentResponse.text, // Also keep this for backwards compatibility
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          toolsUsed: agentResponse.toolsUsed || [],
          iterationCount: (agentResponse as any).metadata?.totalIterations || 0,
          // Track 4: Include structured data for Fluid UI rendering
          structuredData: agentResponse.structuredData,
          aiMetadata: {
            intent: intent.primaryIntent,
            confidence: intent.confidence,
            agentType: 'UnifiedDelphiAgent',
            toolsUsed: agentResponse.toolsUsed || [],
            structuredData: agentResponse.structuredData
          }
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error('[RoomOrchestratorDO] Message handling error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          agentResponse: "I apologize, but I encountered an error processing your request. Please try again."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  // ============================================================================
  // INTENT DETECTION (Track 2 v3.1: AI-based with conversation context)
  // ============================================================================

  /**
   * Track 2 v3.1: AI-based intent detection with caching
   *
   * Uses UnifiedDelphiAgent.detectIntent() with full room context:
   * - Event state (taskCount, hasBudget, vendorCount)
   * - Recent conversation messages
   * - Extracted commitments
   *
   * Supports pragmatic interpretation:
   * - "Update tasks" with 0 tasks + commitments = sync_conversation_to_tasks
   * - Low confidence (<0.7) = ask for clarification
   */
  /**
   * Detect multiple intents from user message
   * Returns array of intents with execution strategy metadata
   */
  private async detectMultipleIntents(
    message: string,
    context: any,
    recentMessages: Message[]
  ): Promise<EnhancedIntent[]> {
    // Check cache first (keyed by message + checkpoint)
    const cacheKey = `multi_${message}_${this.state?.checkpointId || 'init'}`;

    if (this.intentCache.has(cacheKey)) {
      console.log('[RoomOrchestratorDO] Using cached multi-intent');
      return this.intentCache.get(cacheKey)! as EnhancedIntent[];
    }

    console.log('[RoomOrchestratorDO] Detecting multiple intents with AI...');

    try {
      // Initialize context builder if needed
      if (!this.contextBuilder && this.agent) {
        this.contextBuilder = new ContextBuilder(
          this.agent,
          {
            message,
            eventContext: context.eventContext,
            roomId: context.roomId,
            eventId: context.eventId
          } as any
        );
      }

      // Build room context with commitments
      const roomContext: RoomContext = await this.contextBuilder!.buildRoomContext(
        this.state?.roomType || 'main',
        recentMessages.map(m => ({
          _id: m._id,
          content: m.text,
          authorType: m.isAIGenerated ? 'agent' : 'user' as 'agent' | 'user',
          authorName: m.author?.name,
          _creationTime: m.createdAt
        })),
        {
          taskCount: context.taskCount,
          hasBudget: context.hasBudget,
          vendorCount: context.vendorCount
        }
      );

      console.log(`[RoomOrchestratorDO] Room context: ${roomContext.taskCount} tasks, ${roomContext.extractedCommitments.length} commitments`);

      // Use agent's AI-based multi-intent detection
      const intents = await this.agent!.detectMultipleIntents(message, roomContext, this.env);

      // Cache the result
      this.intentCache.set(cacheKey, intents);

      // Cleanup old cache entries (keep last 50)
      if (this.intentCache.size > 50) {
        const firstKey = this.intentCache.keys().next().value;
        if (firstKey !== undefined) {
          this.intentCache.delete(firstKey);
        }
      }

      return intents;

    } catch (error: any) {
      console.error('[RoomOrchestratorDO] AI multi-intent detection failed, falling back to single intent:', error);

      // Fallback to single intent detection
      const singleIntent = await this.detectIntent(message, context, recentMessages);
      return [singleIntent];
    }
  }

  private async detectIntent(
    message: string,
    context: any,
    recentMessages: Message[]
  ): Promise<EnhancedIntent> {
    const startTime = performance.now();

    // Check cache first (keyed by message + checkpoint)
    const cacheKey = `${message}_${this.state?.checkpointId || 'init'}`;

    if (this.intentCache.has(cacheKey)) {
      console.log('[RoomOrchestratorDO] Using cached intent');
      return this.intentCache.get(cacheKey)!;
    }

    try {
      // Initialize context builder if needed
      if (!this.contextBuilder && this.agent) {
        this.contextBuilder = new ContextBuilder(
          this.agent,
          {
            message,
            eventContext: context.eventContext,
            roomId: context.roomId,
            eventId: context.eventId
          } as any
        );
      }

      // Build room context with commitments
      const roomContext: RoomContext = await this.contextBuilder!.buildRoomContext(
        this.state?.roomType || 'main',
        recentMessages.map(m => ({
          _id: m._id,
          content: m.text,
          authorType: m.isAIGenerated ? 'agent' : 'user' as 'agent' | 'user',
          authorName: m.author?.name,
          _creationTime: m.createdAt
        })),
        {
          taskCount: context.taskCount,
          hasBudget: context.hasBudget,
          vendorCount: context.vendorCount
        }
      );

      console.log(`[RoomOrchestratorDO] Room context: ${roomContext.taskCount} tasks, ${roomContext.extractedCommitments.length} commitments`);

      // Try tiered detection first (fast-path → heuristics → cache → AI)
      if (this.tieredDetector) {
        const tieredResult = await this.tieredDetector.detect(message, roomContext);

        // Use tiered result if it's from fast/heuristic tier with confidence >= 0.85
        if ((tieredResult.tier === 'fast' || tieredResult.tier === 'heuristic') &&
            tieredResult.intent.confidence >= 0.85) {
          const latency = performance.now() - startTime;
          console.log(`[RoomOrchestratorDO] Tiered detection (${tieredResult.tier}): ${tieredResult.intent.primaryIntent} (confidence: ${tieredResult.intent.confidence}, latency: ${latency.toFixed(2)}ms)`);

          // Cache the result
          this.intentCache.set(cacheKey, tieredResult.intent);
          return tieredResult.intent;
        }

        // If tiered detection returned a cache or AI result, use it
        if (tieredResult.tier === 'cache' || tieredResult.tier === 'ai') {
          const latency = performance.now() - startTime;
          console.log(`[RoomOrchestratorDO] Tiered detection (${tieredResult.tier}): ${tieredResult.intent.primaryIntent} (confidence: ${tieredResult.intent.confidence}, latency: ${latency.toFixed(2)}ms)`);

          // Cache the result
          this.intentCache.set(cacheKey, tieredResult.intent);
          return tieredResult.intent;
        }
      }

      // Fall through to AI detection if tiered detection didn't provide a result
      console.log('[RoomOrchestratorDO] Detecting intent with AI...');
      const intent = await this.agent!.detectIntent(message, roomContext, this.env);

      const latency = performance.now() - startTime;
      console.log(`[RoomOrchestratorDO] AI detection: ${intent.primaryIntent} (confidence: ${intent.confidence}, latency: ${latency.toFixed(2)}ms)`);

      // Cache the result
      this.intentCache.set(cacheKey, intent);

      // Cleanup old cache entries (keep last 50)
      if (this.intentCache.size > 50) {
        const firstKey = this.intentCache.keys().next().value;
        if (firstKey !== undefined) {
          this.intentCache.delete(firstKey);
        }
      }

      return intent;

    } catch (error: any) {
      console.error('[RoomOrchestratorDO] AI intent detection failed, using fallback:', error);

      // Fallback to simple keyword-based detection
      return this.fallbackKeywordDetection(message, context);
    }
  }

  /**
   * Fallback to keyword-based detection if AI fails
   */
  private fallbackKeywordDetection(message: string, context: any): EnhancedIntent {
    const lower = message.toLowerCase();

    // Task-related
    if (/\b(create|add|make|new)\b.*\b(task|todo)\b/i.test(lower)) {
      return {
        primaryIntent: 'create_task',
        confidence: 0.6,
        reasoning: 'Fallback keyword match: create + task',
        domain: 'tasks',
        action: 'create',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Sync from conversation (pragmatic rule)
    if ((/\b(update|sync)\b.*\b(task|todo)\b/i.test(lower)) &&
        context.taskCount === 0) {
      return {
        primaryIntent: 'sync_conversation_to_tasks',
        confidence: 0.7,
        reasoning: 'Fallback: update/sync tasks with 0 tasks suggests sync from conversation',
        domain: 'tasks',
        action: 'sync',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Query tasks
    if (/\b(show|list|view)\b.*\b(task|todo)\b/i.test(lower)) {
      return {
        primaryIntent: 'query_tasks',
        confidence: 0.7,
        reasoning: 'Fallback keyword match: show/list + tasks',
        domain: 'tasks',
        action: 'read',
        preconditionsMet: true,
        missingInformation: []
      };
    }

    // Default
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

  /**
   * Track 2 v3.1: Handle sync_conversation_to_tasks intent
   *
   * Extracts commitments from recent conversation and creates tasks.
   * Uses UnifiedDelphiAgent.planConversationSync() for the heavy lifting.
   */
  private async handleSyncConversationToTasks(
    intent: EnhancedIntent,
    context: any,
    recentMessages: Message[],
    convex: ConvexHttpClient
  ): Promise<Response> {
    console.log('[RoomOrchestratorDO] Syncing conversation to tasks...');

    try {
      // Convert messages to ContextMessage format
      const contextMessages: ContextMessage[] = recentMessages.map(m => ({
        _id: m._id,
        content: m.text,
        authorType: m.isAIGenerated ? 'agent' : 'user' as 'agent' | 'user',
        authorName: m.author?.name,
        _creationTime: m.createdAt
      }));

      // Extract commitments using the agent
      const commitments = await this.agent!.extractCommitments(contextMessages);

      console.log(`[RoomOrchestratorDO] Extracted ${commitments.length} commitments from conversation`);

      // Use agent's planConversationSync to create tasks
      const agentResponse = await this.agent!.planConversationSync(
        commitments,
        {
          message: context.message,
          eventContext: context.eventContext,
          roomId: context.roomId,
          eventId: context.eventId,
          recentMessages: []
        } as any
      );

      // Check if agent generated a proposal
      if (agentResponse.structuredData?.type === 'proposal') {
        const proposalData = agentResponse.structuredData.proposal;

        console.log('[RoomOrchestratorDO] Saving proposal to Convex...');

        // Create proposal in Convex database
        const proposalId = await convex.mutation(api.proposals.create, {
          eventId: context.eventId as any,
          roomId: context.roomId as any,
          proposalType: proposalData.proposalType,
          items: proposalData.items,
          aiMetadata: {
            intent: 'sync_conversation_to_tasks',
            confidence: agentResponse.confidence || 0.9,
            agentType: 'UnifiedDelphiAgent',
            reasoning: `Extracted from ${commitments.length} conversation commitments`
          }
        });

        console.log(`[RoomOrchestratorDO] Created proposal: ${proposalId}`);

        // Create AI message with proposal in structuredData
        const messageId = await convex.mutation(api.messages.send, {
          roomId: context.roomId as any,
          text: agentResponse.text,
          isAIGenerated: true,
          aiMetadata: {
            intent: 'sync_conversation_to_tasks',
            confidence: agentResponse.confidence || 0.9,
            agentType: 'UnifiedDelphiAgent',
            toolsUsed: agentResponse.toolsUsed || [],
            structuredData: {
              type: 'proposal',
              proposal: {
                proposalId: proposalId,
                proposalType: proposalData.proposalType,
                items: proposalData.items,
                expiresAt: proposalData.expiresAt
              }
            },

            // Budget/error tracking
            wasSuccessful: agentResponse.metadata?.wasSuccessful ?? true,
            abortReason: agentResponse.metadata?.abortReason,
            partialSuccess: agentResponse.metadata?.partialSuccess ?? false,
          }
        });

        console.log(`[RoomOrchestratorDO] Created AI message with proposal: ${messageId}`);

        // Add to local history
        if (this.state) {
          const agentMessage: Message = {
            _id: messageId as unknown as string,
            text: agentResponse.text,
            authorId: 'agent',
            createdAt: Date.now(),
            isAIGenerated: true
          };
          this.addMessageToHistory(agentMessage);
          await this.manageMemory();
          await this.saveState();
        }

        return new Response(
          JSON.stringify({
            success: true,
            agentResponse: agentResponse.text,
            intent: 'sync_conversation_to_tasks',
            commitmentsFound: commitments.length,
            proposalId: proposalId,
            structuredData: {
              type: 'proposal',
              proposal: {
                proposalId: proposalId,
                proposalType: proposalData.proposalType,
                items: proposalData.items,
                expiresAt: proposalData.expiresAt
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // No proposal generated - just text response
      if (this.state && agentResponse.text) {
        const agentMessage: Message = {
          _id: `agent_${Date.now()}`,
          text: agentResponse.text,
          authorId: 'agent',
          createdAt: Date.now(),
          isAIGenerated: true
        };
        this.addMessageToHistory(agentMessage);
        await this.manageMemory();
        await this.saveState();
      }

      return new Response(
        JSON.stringify({
          success: agentResponse.metadata?.wasSuccessful || false,
          agentResponse: agentResponse.text,
          intent: 'sync_conversation_to_tasks',
          commitmentsFound: commitments.length
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error: any) {
      console.error('[RoomOrchestratorDO] Error syncing conversation to tasks:', error);

      return new Response(
        JSON.stringify({
          success: false,
          agentResponse: `I had trouble syncing tasks from our conversation: ${error.message}`,
          intent: 'sync_conversation_to_tasks',
          error: error.message
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // ============================================================================
  // PRECONDITION VALIDATION
  // ============================================================================

  private validatePreconditions(intent: Intent, context: any): ValidationResult {
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

      update_task: () => {
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
      },

      add_expense: () => {
        if (!context.hasBudget) {
          return {
            valid: false,
            message: "No budget exists yet. Let's create one first - what's your total budget?",
            suggestedActions: [
              "Set initial budget",
              "Get budget planning advice"
            ]
          };
        }
        return { valid: true };
      },

      query_vendors: () => {
        if (context.vendorCount === 0) {
          return {
            valid: false,
            message: "You haven't saved any vendors yet. Would you like me to search for some?",
            suggestedActions: [
              "Search for photographers",
              "Search for caterers",
              "Search for venues"
            ]
          };
        }
        return { valid: true };
      }
    };

    const validator = validations[intent.primaryIntent];
    if (validator) {
      return validator();
    }

    return { valid: true };
  }

  // ============================================================================
  // AGENT INVOCATION
  // ============================================================================

  private async invokeAgent(
    intent: Intent,
    context: any,
    convex: ConvexHttpClient
  ): Promise<any> {
    if (!this.agent || !this.state) {
      throw new Error('Agent or state not initialized');
    }

    console.log(`[RoomOrchestratorDO] Invoking UnifiedDelphiAgent for intent: ${intent.primaryIntent}`);

    try {
      // Track 3 v3.1: Build room-type-aware agent context
      const agentContext = await this.buildAgentContext(intent, context, convex);

      console.log(`[RoomOrchestratorDO] Context scope: ${(agentContext as any).scope || 'standard'}`);

      // Call agent with appropriate iteration budget based on intent
      const iterationBudget = this.getIterationBudget(intent.primaryIntent);

      const response = await this.agent.handle(
        agentContext,
        {
          maxIterations: iterationBudget,
          enableThinking: true
        },
        intent.primaryIntent
      );

      const iterCount = (response as any).metadata?.totalIterations || 0;
      console.log(`[RoomOrchestratorDO] Agent completed in ${iterCount} iterations`);

      // Notify EventOrchestratorDO to sync if tools were used
      if (response.toolsUsed && response.toolsUsed.length > 0) {
        console.log(`[RoomOrchestratorDO] Notifying EventDO to sync after ${response.toolsUsed.length} tool calls`);
        await this.notifyEventDOSync(context.eventId);
      }

      return response;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Agent invocation error:', error);
      throw error;
    }
  }

  /**
   * Invoke agent with multiple intents for parallel/sequential execution
   */
  private async invokeMultiIntent(
    intents: Intent[],
    context: any,
    convex: ConvexHttpClient
  ): Promise<any> {
    if (!this.agent || !this.state) {
      throw new Error('Agent or state not initialized');
    }

    console.log(`[RoomOrchestratorDO] Invoking UnifiedDelphiAgent with ${intents.length} intents`);

    try {
      // Build agent context using the first intent as primary
      // (context is generally intent-agnostic)
      const agentContext = await this.buildAgentContext(intents[0], context, convex);

      console.log(`[RoomOrchestratorDO] Context scope: ${(agentContext as any).scope || 'standard'}`);

      // Get max iteration budget across all intents
      const maxIterationBudget = Math.max(...intents.map(i => this.getIterationBudget(i.primaryIntent)));

      const response = await this.agent.handleMultiIntent(
        agentContext,
        intents,
        {
          maxIterations: maxIterationBudget,
          enableThinking: true
        }
      );

      console.log(`[RoomOrchestratorDO] Multi-intent agent completed`);

      // Notify EventOrchestratorDO to sync if tools were used
      if (response.toolsUsed && response.toolsUsed.length > 0) {
        console.log(`[RoomOrchestratorDO] Notifying EventDO to sync after ${response.toolsUsed.length} tool calls`);
        await this.notifyEventDOSync(context.eventId);
      }

      return response;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Multi-intent agent invocation error:', error);
      throw error;
    }
  }

  private getIterationBudget(intent: string): number {
    const budgets: Record<string, number> = {
      // Simple queries
      query_tasks: 3,
      query_budget: 3,
      query_vendors: 3,
      general_question: 3,

      // Single creates
      create_task: 5,
      create_budget: 5,
      add_expense: 5,

      // Updates
      update_task: 5,
      update_budget: 5,

      // Complex operations
      search_vendors: 8,
      create_poll: 5,
      general_planning: 10,

      // Bulk operations
      bulk_create: 20
    };

    return budgets[intent] || 5;
  }

  // ============================================================================
  // COMPONENT METADATA FOR AGENT (Track 4 - BLOCKER 4)
  // ============================================================================

  /**
   * Get component metadata for agent to enable dynamic dashboard generation
   * Returns LLM-friendly documentation of all available Fluid UI components
   */
  private getComponentMetadata(): string {
    return `
Available Components:

1. TaskListCard (eventId, limit?, filter?, title?) - Compact task list with filters and quick actions
2. BudgetSummaryCard (eventId, title?, showCategories?) - Budget breakdown with category chart
3. VendorCard (vendorId?, vendorData?, eventId, roomId?, showActions?) - Single vendor details with contact info
4. VendorsList (eventId, category?, status?, limit?, title?) - Vendor directory (Master component, emits vendorId)
5. InventoryCard (eventId, category?, showForm?, limit?) - Inventory CRUD with category filtering
6. InlinePoll (pollId, question, options, allowMultipleChoices, deadline?, eventId, roomId) - Interactive voting
7. QuickActions (actions, onAction, title?) - Suggested action buttons
8. ConfirmationPrompt (question, yesLabel?, noLabel?, variant?, onConfirm, description?) - Yes/No prompt
9. KPIDashboard (eventId, showDetails?) - Key metrics: Budget, Tasks, Days, RSVP
10. ProgressSummary (eventId, showBreakdown?) - Overall completion percentage
11. TaskProposalCard (proposalId, proposalType, items, expiresAt, eventId?, roomId) - Task proposal with accept/reject
12. BudgetProposalCard (proposalId, proposalType, items, expiresAt, eventId?, roomId) - Budget proposal
13. VendorProposalCard (proposalId, proposalType, items, expiresAt, eventId?, roomId) - Vendor suggestions

Use component_grid renderType with componentConfig to show dashboards.

Example: Show event overview = KPIDashboard + ProgressSummary in grid layout
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [{
      "type": "grid",
      "components": [
        { "type": "KPIDashboard", "props": { "eventId": "..." } },
        { "type": "ProgressSummary", "props": { "eventId": "..." } }
      ]
    }]
  }
}

Example: Full dashboard with text + multiple component rows
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [
      {
        "type": "text",
        "content": "# Event Overview\\nHere are your key metrics:"
      },
      {
        "type": "grid",
        "components": [
          { "type": "KPIDashboard", "props": { "eventId": "..." } },
          { "type": "ProgressSummary", "props": { "eventId": "..." } }
        ]
      },
      {
        "type": "grid",
        "components": [
          { "type": "TaskListCard", "props": { "eventId": "...", "limit": 5 } },
          { "type": "BudgetSummaryCard", "props": { "eventId": "..." } }
        ]
      }
    ]
  }
}
`;
  }

  // ============================================================================
  // ROOM-TYPE-AWARE CONTEXT (Track 3 v3.1)
  // ============================================================================

  /**
   * Track 3 v3.1: Build room-type-aware agent context
   *
   * Different room types get different levels of access:
   * - Main room: Event-wide access, all room summaries, full planning context
   * - Vendor room: Scoped to specific vendor, contract status, vendor-specific tasks
   * - Brainstorm room: Standard access, focused on ideation
   * - Private room: Standard access, focused on specific participants
   */
  private async buildAgentContext(
    intent: Intent,
    context: any,
    convex: ConvexHttpClient
  ): Promise<AgentContext> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    const roomType = this.state.roomType;
    console.log(`[RoomOrchestratorDO] Building ${roomType} room context`);

    // Base context (common to all room types)
    const baseContext: AgentContext = {
      eventId: this.state.eventId,
      roomId: this.state.roomId,
      message: context.message,
      eventContext: context.eventContext,
      threadContext: context.threadContext,
      recentMessages: this.state.messageHistory.slice(-10).map(m => ({
        role: m.isAIGenerated ? 'assistant' : 'user',
        content: m.text
      })),

      // Track 4: Component metadata for dynamic dashboard generation
      availableComponents: this.getComponentMetadata(),

      // Auto-injected context (automatically added to all agent operations)
      autoContext: {
        userId: context.userId || 'unknown',
        eventId: this.state.eventId,
        roomId: this.state.roomId,
        timestamp: Date.now(),
        userInfo: {
          name: context.userName || 'User',
          id: context.userId || 'unknown'
        }
      }
    };

    // Room-type-specific enhancements
    switch (roomType) {
      case 'main':
        // Main room: Event-wide access, all room summaries
        return await this.buildMainRoomContext(baseContext, convex);

      case 'vendor':
        // Vendor room: Scoped to vendor, contract status
        return await this.buildVendorRoomContext(baseContext, convex);

      case 'brainstorm':
        // Brainstorm room: Standard access, ideation-focused
        return await this.buildBrainstormRoomContext(baseContext, convex);

      case 'private':
        // Private room: Standard access, participant-focused
        return await this.buildPrivateRoomContext(baseContext, convex);

      default:
        console.warn(`[RoomOrchestratorDO] Unknown room type: ${roomType}, using base context`);
        return baseContext;
    }
  }

  /**
   * Main room context: Event-wide access, all room summaries
   */
  private async buildMainRoomContext(
    baseContext: AgentContext,
    convex: ConvexHttpClient
  ): Promise<AgentContext> {
    try {
      // Fetch all rooms for this event
      const rooms = await convex.query(api.rooms.listByEvent, {
        eventId: this.state!.eventId as any
      });

      // Build room summaries
      const roomSummaries = rooms?.map((room: any) => ({
        roomId: room._id,
        roomName: room.name,
        roomType: room.type,
        participantCount: room.participants?.length || 0,
        lastActivity: room.lastMessageAt || room._creationTime
      })) || [];

      // Get event-wide statistics
      const eventStats = {
        totalRooms: rooms?.length || 0,
        taskCount: await this.getTaskCount(convex, this.state!.eventId),
        vendorCount: await this.getVendorCount(convex, this.state!.eventId),
        hasBudget: await this.checkBudgetExists(convex, this.state!.eventId)
      };

      return {
        ...baseContext,
        canAccessEventWide: true,
        roomSummaries,
        eventStats,
        scope: 'event-wide'
      };
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error building main room context:', error);
      return baseContext;
    }
  }

  /**
   * Vendor room context: Scoped to vendor, contract status
   */
  private async buildVendorRoomContext(
    baseContext: AgentContext,
    convex: ConvexHttpClient
  ): Promise<AgentContext> {
    try {
      // Extract vendorId from room metadata (assuming room name or metadata contains it)
      // For now, we'll fetch all vendors and find the relevant one
      const vendors = await convex.query(api.vendors.listByEvent, {
        eventId: this.state!.eventId as any
      });

      // Try to find the vendor associated with this room
      // This assumes the room has a vendorId in its metadata or name
      // In production, you'd want to store vendorId in room metadata
      const relevantVendor = vendors?.[0]; // Placeholder - needs proper vendor-room association

      if (relevantVendor) {
        return {
          ...baseContext,
          scopedToVendor: true,
          vendorId: relevantVendor._id,
          vendorInfo: {
            name: relevantVendor.name,
            category: relevantVendor.category,
            contractStatus: (relevantVendor as any).contractStatus || 'pending',
            contactInfo: (relevantVendor as any).contactInfo || { email: relevantVendor.email }
          },
          scope: 'vendor-specific'
        };
      }

      return {
        ...baseContext,
        scopedToVendor: true,
        scope: 'vendor-specific'
      };
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error building vendor room context:', error);
      return {
        ...baseContext,
        scopedToVendor: true,
        scope: 'vendor-specific'
      };
    }
  }

  /**
   * Brainstorm room context: Standard access, ideation-focused
   */
  private async buildBrainstormRoomContext(
    baseContext: AgentContext,
    convex: ConvexHttpClient
  ): Promise<AgentContext> {
    return {
      ...baseContext,
      scope: 'brainstorm',
      focusMode: 'ideation'
    };
  }

  /**
   * Private room context: Standard access, participant-focused
   */
  private async buildPrivateRoomContext(
    baseContext: AgentContext,
    convex: ConvexHttpClient
  ): Promise<AgentContext> {
    return {
      ...baseContext,
      scope: 'private',
      focusMode: 'participant-focused'
    };
  }

  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================

  private addMessageToHistory(message: Message) {
    if (!this.state) return;

    this.state.messageHistory.push(message);
  }

  private async manageMemory() {
    if (!this.state) return;

    // Keep only last 200 messages
    if (this.state.messageHistory.length > 200) {
      console.log(`[RoomOrchestratorDO] Trimming message history from ${this.state.messageHistory.length} to 200`);

      // Get messages to archive
      const messagesToArchive = this.state.messageHistory.slice(0, -200);

      // Create summary of archived messages
      const summary = this.summarizeMessages(messagesToArchive);
      this.state.messageSummary = this.state.messageSummary
        ? `${this.state.messageSummary}\n\n${summary}`
        : summary;

      // Keep only last 200
      this.state.messageHistory = this.state.messageHistory.slice(-200);

      console.log(`[RoomOrchestratorDO] Message history trimmed, summary updated`);
    }

    // Check memory usage
    if (this.state.memoryUsage > 80 * 1024 * 1024) { // 80MB threshold
      console.warn(`[RoomOrchestratorDO] Memory usage high: ${(this.state.memoryUsage / 1024 / 1024).toFixed(2)}MB`);

      // Aggressive trimming
      this.state.messageHistory = this.state.messageHistory.slice(-100);

      // Trim summary if too long
      if (this.state.messageSummary.length > 10000) {
        this.state.messageSummary = this.state.messageSummary.slice(-5000);
      }
    }
  }

  private summarizeMessages(messages: Message[]): string {
    if (messages.length === 0) return '';

    // Simple summarization: count user vs AI messages, extract key topics
    const userCount = messages.filter(m => !m.isAIGenerated).length;
    const aiCount = messages.filter(m => m.isAIGenerated).length;

    const timeRange = messages.length > 0
      ? `${new Date(messages[0].createdAt).toLocaleDateString()} - ${new Date(messages[messages.length - 1].createdAt).toLocaleDateString()}`
      : 'Unknown';

    return `[Archived ${messages.length} messages (${userCount} user, ${aiCount} AI) from ${timeRange}]`;
  }

  // ============================================================================
  // POLL MANAGEMENT (Stubs for Track 8)
  // ============================================================================

  async createPoll(config: any): Promise<Poll> {
    console.log('[RoomOrchestratorDO] Poll creation - stub for Track 8');

    const poll: Poll = {
      _id: `poll_${Date.now()}`,
      question: config.question || 'Sample poll',
      options: config.options || [],
      status: 'active',
      votes: {}
    };

    if (this.state) {
      this.state.activePolls.push(poll);
    }

    return poll;
  }

  async recordVote(pollId: string, userId: string, choice: any): Promise<void> {
    console.log('[RoomOrchestratorDO] Vote recording - stub for Track 8');

    if (!this.state) return;

    const poll = this.state.activePolls.find(p => p._id === pollId);
    if (poll) {
      poll.votes[userId] = choice;
    }
  }

  async closePoll(pollId: string): Promise<any> {
    console.log('[RoomOrchestratorDO] Poll closing - stub for Track 8');

    if (!this.state) return null;

    const poll = this.state.activePolls.find(p => p._id === pollId);
    if (poll) {
      poll.status = 'closed';
      return { pollId, votes: poll.votes, status: 'closed' };
    }

    return null;
  }

  // ============================================================================
  // HELPER METHODS (Context Enrichment)
  // ============================================================================

  private async getEventContext(convex: ConvexHttpClient, eventId: string): Promise<any> {
    try {
      const event = await convex.query(api.events.getById, {
        eventId: eventId as any
      });
      return event;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching event context:', error);
      return null;
    }
  }

  private async getRecentMessages(
    convex: ConvexHttpClient,
    roomId: string,
    parentMessageId?: string
  ): Promise<any[]> {
    try {
      const messages = await convex.query(api.messages.listByRoom, {
        roomId: roomId as any,
        limit: 20
      });
      return messages || [];
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching recent messages:', error);
      return [];
    }
  }

  private async getThreadContext(convex: ConvexHttpClient, parentMessageId: string): Promise<any[]> {
    try {
      const thread = await convex.query(api.messages.getThread, {
        messageId: parentMessageId as any
      });

      if (thread && Array.isArray(thread)) {
        return thread.map((msg: any) => ({
          author: msg.author?.name || 'Unknown',
          text: msg.text,
          isAI: msg.isAIGenerated
        }));
      }

      return [];
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching thread context:', error);
      return [];
    }
  }

  private async getTaskCount(convex: ConvexHttpClient, eventId: string): Promise<number> {
    try {
      const tasks = await convex.query(api.tasks.listByEvent, {
        eventId: eventId as any
      });
      return tasks?.length || 0;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching task count:', error);
      return 0;
    }
  }

  private async checkBudgetExists(convex: ConvexHttpClient, eventId: string): Promise<boolean> {
    try {
      const event = await convex.query(api.events.getById, {
        eventId: eventId as any
      });
      return event && event.budget && event.budget.total > 0;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error checking budget existence:', error);
      return false;
    }
  }

  private async getVendorCount(convex: ConvexHttpClient, eventId: string): Promise<number> {
    try {
      const vendors = await convex.query(api.vendors.listByEvent, {
        eventId: eventId as any
      });
      return vendors?.length || 0;
    } catch (error) {
      console.error('[RoomOrchestratorDO] Error fetching vendor count:', error);
      return 0;
    }
  }

  private async handleStatus(): Promise<Response> {
    return new Response(JSON.stringify({
      roomId: this.state?.roomId || 'unknown',
      eventId: this.state?.eventId || 'unknown',
      messageCount: this.state?.messageHistory.length || 0,
      activePolls: this.state?.activePolls.length || 0,
      memoryUsage: this.state?.memoryUsage || 0,
      memoryUsageMB: this.state ? (this.state.memoryUsage / 1024 / 1024).toFixed(2) : '0',
      checkpointId: this.state?.checkpointId || '',
      lastActivity: this.state?.lastActivity || 0,
      status: "active",
      version: "Track 5 - RoomOrchestratorDO",
      timestamp: Date.now()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
