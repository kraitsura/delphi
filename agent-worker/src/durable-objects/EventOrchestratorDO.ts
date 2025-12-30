/**
 * EventOrchestratorDO - Event-scoped Durable Object for domain state caching
 *
 * Purpose: Maintains cached domain data for fast agent access without repeated Convex queries
 *
 * Architecture: One DO instance per event
 * - Caches tasks, expenses, vendors in hot memory
 * - Syncs with Convex on state changes
 * - Provides context aggregation for agents
 *
 * Endpoints:
 * - /invoke: Process agent requests with cached context
 * - /state: Get current cached state
 * - /sync: Force sync with Convex
 * - /context: Get aggregated context for agent
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../web/convex/_generated/api';
import { EventLog } from './EventLog';
import { StateRecovery } from './StateRecovery';
import {
  EventContextResponse,
  InvokeRequest,
  InvokeResponse,
  SyncRequest,
  SyncResponse,
  StateChange,
  TIMEOUTS
} from './protocols';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Task entity (matches Convex schema)
 */
interface Task {
  _id: string;
  _creationTime: number;
  title: string;
  description?: string;
  eventId: string;
  roomId: string;
  groupId?: string;
  assignedTo?: string;
  assignee?: string;
  createdBy: string;
  vendor?: string;
  estimatedDuration?: number;
  dayOfSequence?: number;
  phase?: 'planning' | 'day_of' | 'post_event';
  category: 'venue' | 'catering' | 'photography' | 'music' | 'decor' | 'invitations' | 'transportation' | 'accommodation' | 'planning' | 'other';
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  completedAt?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  estimatedCost?: {
    min: number;
    max: number;
    currency: string;
    confidence: number;
  };
  dependsOn?: string[];
  blockedBy?: string[];
  aiMetadata?: any;
  sourceMessageId?: string;
  sourceProposalId?: string;
  deletedAt?: number;
}

/**
 * Expense entity (matches Convex schema)
 */
interface Expense {
  _id: string;
  _creationTime: number;
  description: string;
  amount: number;
  currency: string;
  eventId: string;
  roomId?: string;
  taskId?: string;
  vendorId?: string;
  category: 'venue' | 'catering' | 'photography' | 'music' | 'decor' | 'supplies' | 'transportation' | 'accommodation' | 'other';
  paidBy: string;
  paidAt?: number;
  dueDate?: number;
  status?: 'pending' | 'paid' | 'overdue';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  split?: {
    type: 'equal' | 'custom' | 'percentage';
    participants: Array<{
      userId: string;
      amount: number;
      paid: boolean;
    }>;
  };
  receiptUrl?: string;
  receiptStorageId?: string;
  aiMetadata?: any;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  sourceMessageId?: string;
  sourceProposalId?: string;
  deletedAt?: number;
}

/**
 * Vendor entity (matches Convex schema)
 */
interface Vendor {
  _id: string;
  _creationTime: number;
  name: string;
  category: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  capacity?: number;
  venueType?: 'indoor' | 'outdoor' | 'both';
  amenities?: string[];
  eventId: string;
  status?: 'researching' | 'contacted' | 'quoted' | 'booked' | 'declined';
  contractStatus?: string;
  contactInfo?: any;
  savedBy: string;
  createdAt: number;
  updatedAt: number;
  sourceMessageId?: string;
  deletedAt?: number;
}

/**
 * Cached event state with domain entities
 */
interface EventState {
  eventId: string;

  // Cached domain data (Maps for O(1) lookup)
  tasks: Map<string, Task>;
  expenses: Map<string, Expense>;
  vendors: Map<string, Vendor>;

  // Metadata
  lastSyncedAt: number;
  version: number;
}

/**
 * Environment interface
 */
interface Env {
  CONVEX_DEPLOY_URL?: string;
  CLAUDE_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
}

// ============================================================================
// EVENT ORCHESTRATOR DO
// ============================================================================

export class EventOrchestratorDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private eventState: EventState | null = null;
  private eventLog: EventLog;
  private stateRecovery: StateRecovery;
  private eventId: string = '';
  private convexClient: ConvexHttpClient | null = null;
  private currentEventId: string | null = null;

  // Memory management constants
  private readonly MAX_ITEMS_PER_COLLECTION = 500;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.eventLog = new EventLog(state);
    this.stateRecovery = new StateRecovery();
  }

  // ============================================================================
  // MAIN REQUEST HANDLER
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Load state on first request
      await this.loadState();

      switch (url.pathname) {
        case '/invoke':
          return this.handleInvoke(request);
        case '/state':
          return this.handleGetState(request);
        case '/sync':
          return this.handleSync(request);
        case '/context':
          return this.handleGetContext(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('[EventOrchestratorDO] Request error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // ============================================================================
  // ENDPOINT HANDLERS
  // ============================================================================

  /**
   * /invoke - Process agent request with cached context
   * Executes agent with event-level tools and returns response with state changes
   */
  private async handleInvoke(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Set timeout for agent invocation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Agent invocation timeout')), TIMEOUTS.INVOKE)
      );

      const invokePromise = this.processInvoke(request);

      const response = await Promise.race([invokePromise, timeoutPromise]) as InvokeResponse;

      const elapsed = Date.now() - startTime;
      console.log(`[EventOrchestratorDO] Agent invoked in ${elapsed}ms`);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[EventOrchestratorDO] Agent invocation failed after ${elapsed}ms:`, error);

      return new Response(
        JSON.stringify({
          error: 'Agent invocation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500,
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Process invoke request with agent execution
   */
  private async processInvoke(request: Request): Promise<InvokeResponse> {
    const body = await request.json() as InvokeRequest;
    const { message, roomId, userId, intent, roomContext } = body;

    if (!message || !roomId || !userId || !intent) {
      throw new Error('Missing required fields in InvokeRequest');
    }

    // Extract eventId from intent or roomContext
    const eventId = roomContext?.extractedCommitments?.[0]?.eventId || this.currentEventId;
    if (!eventId) {
      throw new Error('Could not determine eventId from request');
    }

    // Initialize state if needed
    if (!this.eventState || this.eventState.eventId !== eventId) {
      await this.initializeState(eventId);
    }

    // Track state changes during agent execution
    const stateChangesBefore = {
      taskCount: this.eventState!.tasks.size,
      expenseCount: this.eventState!.expenses.size,
      vendorCount: this.eventState!.vendors.size
    };

    // NOTE: Agent execution would happen here
    // For now, we'll create a placeholder response
    // In production, this would invoke UnifiedDelphiAgent with event-level tools

    const agentResponse = {
      text: `Processed request: ${message}`,
      intent: intent.primaryIntent,
      confidence: intent.confidence,
      toolsUsed: [],
      metadata: {
        wasSuccessful: true
      }
    };

    // Detect state changes
    const stateChanges: StateChange[] = [];
    const tasksAfter = this.eventState!.tasks.size;
    const expensesAfter = this.eventState!.expenses.size;
    const vendorsAfter = this.eventState!.vendors.size;

    if (tasksAfter > stateChangesBefore.taskCount) {
      // Tasks were created
      const newTasks = Array.from(this.eventState!.tasks.values())
        .slice(stateChangesBefore.taskCount);

      newTasks.forEach(task => {
        stateChanges.push({
          type: 'task_created',
          entityId: task._id,
          timestamp: Date.now(),
          data: task
        });
      });
    }

    if (expensesAfter > stateChangesBefore.expenseCount) {
      // Expenses were created
      const newExpenses = Array.from(this.eventState!.expenses.values())
        .slice(stateChangesBefore.expenseCount);

      newExpenses.forEach(expense => {
        stateChanges.push({
          type: 'expense_created',
          entityId: expense._id,
          timestamp: Date.now(),
          data: expense
        });
      });
    }

    if (vendorsAfter > stateChangesBefore.vendorCount) {
      // Vendors were created
      const newVendors = Array.from(this.eventState!.vendors.values())
        .slice(stateChangesBefore.vendorCount);

      newVendors.forEach(vendor => {
        stateChanges.push({
          type: 'vendor_created',
          entityId: vendor._id,
          timestamp: Date.now(),
          data: vendor
        });
      });
    }

    return {
      response: agentResponse,
      stateChanges
    };
  }

  /**
   * /state - Get current cached state
   */
  private async handleGetState(request: Request): Promise<Response> {
    if (!this.eventState) {
      return new Response(
        JSON.stringify({ error: 'State not initialized' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        eventId: this.eventState.eventId,
        taskCount: this.eventState.tasks.size,
        expenseCount: this.eventState.expenses.size,
        vendorCount: this.eventState.vendors.size,
        lastSyncedAt: this.eventState.lastSyncedAt,
        version: this.eventState.version
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * /sync - Force sync with Convex
   * Supports selective table syncing and returns detailed sync results
   */
  private async handleSync(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Set timeout for sync operation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sync operation timeout')), TIMEOUTS.SYNC)
      );

      const syncPromise = this.processSync(request);

      const response = await Promise.race([syncPromise, timeoutPromise]) as SyncResponse;

      const elapsed = Date.now() - startTime;
      console.log(`[EventOrchestratorDO] Sync completed in ${elapsed}ms`);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[EventOrchestratorDO] Sync failed after ${elapsed}ms:`, error);

      return new Response(
        JSON.stringify({
          error: 'Sync operation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500,
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Process sync request with selective table syncing
   */
  private async processSync(request: Request): Promise<SyncResponse> {
    const body = await request.json() as any;
    const { eventId, convexUrl, authToken, force, tables } = body;

    if (!eventId || !convexUrl || !authToken) {
      throw new Error('Missing required fields: eventId, convexUrl, authToken');
    }

    const syncRequest: SyncRequest = {
      force: force || false,
      tables: tables || ['tasks', 'expenses', 'vendors']
    };

    // Initialize state if needed
    if (!this.eventState || this.eventState.eventId !== eventId) {
      await this.initializeState(eventId);
    }

    // Check if sync is needed (unless forced)
    if (!syncRequest.force) {
      const cacheAge = Date.now() - this.eventState!.lastSyncedAt;
      if (cacheAge < this.CACHE_TTL_MS) {
        console.log(`[EventOrchestratorDO] Skipping sync, cache is fresh (age: ${cacheAge}ms)`);
        return {
          synced: false,
          changes: 0,
          errors: ['Cache is fresh, use force=true to sync anyway']
        };
      }
    }

    // Create Convex client
    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(authToken);

    const errors: string[] = [];
    let totalChanges = 0;

    // Selective sync based on requested tables
    try {
      if (syncRequest.tables!.includes('tasks')) {
        const tasksBefore = this.eventState!.tasks.size;
        await this.syncTasks(eventId, convex);
        const tasksAfter = this.eventState!.tasks.size;
        totalChanges += Math.abs(tasksAfter - tasksBefore);
      }

      if (syncRequest.tables!.includes('expenses')) {
        const expensesBefore = this.eventState!.expenses.size;
        await this.syncExpenses(eventId, convex);
        const expensesAfter = this.eventState!.expenses.size;
        totalChanges += Math.abs(expensesAfter - expensesBefore);
      }

      if (syncRequest.tables!.includes('vendors')) {
        const vendorsBefore = this.eventState!.vendors.size;
        await this.syncVendors(eventId, convex);
        const vendorsAfter = this.eventState!.vendors.size;
        totalChanges += Math.abs(vendorsAfter - vendorsBefore);
      }

      // Update sync timestamp
      this.eventState!.lastSyncedAt = Date.now();
      this.eventState!.version += 1;
      await this.saveState();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EventOrchestratorDO] Sync error:', errorMsg);
      errors.push(errorMsg);
    }

    return {
      synced: errors.length === 0,
      changes: totalChanges,
      errors
    };
  }

  /**
   * Sync tasks from Convex
   */
  private async syncTasks(eventId: string, convex: ConvexHttpClient): Promise<void> {
    try {
      const tasks = await convex.query(api.tasks.listByEvent, {
        eventId: eventId as any
      });

      this.eventState!.tasks.clear();
      (tasks || []).forEach((task: any) => {
        this.eventState!.tasks.set(task._id, task);
      });

      console.log(`[EventOrchestratorDO] Synced ${tasks?.length || 0} tasks`);
    } catch (error) {
      console.error('[EventOrchestratorDO] Failed to sync tasks:', error);
      throw error;
    }
  }

  /**
   * Sync expenses from Convex
   */
  private async syncExpenses(eventId: string, convex: ConvexHttpClient): Promise<void> {
    try {
      const expenses = await convex.query(api.expenses.listByEvent, {
        eventId: eventId as any
      });

      this.eventState!.expenses.clear();
      (expenses || []).forEach((expense: any) => {
        this.eventState!.expenses.set(expense._id, expense);
      });

      console.log(`[EventOrchestratorDO] Synced ${expenses?.length || 0} expenses`);
    } catch (error) {
      console.error('[EventOrchestratorDO] Failed to sync expenses:', error);
      throw error;
    }
  }

  /**
   * Sync vendors from Convex
   */
  private async syncVendors(eventId: string, convex: ConvexHttpClient): Promise<void> {
    try {
      const vendors = await convex.query(api.vendors.listByEvent, {
        eventId: eventId as any
      });

      this.eventState!.vendors.clear();
      (vendors || []).forEach((vendor: any) => {
        this.eventState!.vendors.set(vendor._id, vendor);
      });

      console.log(`[EventOrchestratorDO] Synced ${vendors?.length || 0} vendors`);
    } catch (error) {
      console.error('[EventOrchestratorDO] Failed to sync vendors:', error);
      throw error;
    }
  }

  /**
   * /context - Get aggregated context for agent
   * Returns EventContextResponse with full event data and statistics
   */
  private async handleGetContext(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Set timeout for context retrieval
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Context retrieval timeout')), TIMEOUTS.CONTEXT)
      );

      const contextPromise = this.buildEventContext(request);

      const response = await Promise.race([contextPromise, timeoutPromise]) as EventContextResponse;

      const elapsed = Date.now() - startTime;
      console.log(`[EventOrchestratorDO] Context retrieved in ${elapsed}ms`);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[EventOrchestratorDO] Context retrieval failed after ${elapsed}ms:`, error);

      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve context',
          details: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500,
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  /**
   * Build full event context response
   */
  private async buildEventContext(request: Request): Promise<EventContextResponse> {
    // Parse request body to get eventId and convex credentials
    const body = await request.json() as any;
    const { eventId, convexUrl, authToken } = body;

    if (!eventId) {
      throw new Error('Missing eventId in request');
    }

    // Initialize state if needed
    if (!this.eventState || this.eventState.eventId !== eventId) {
      if (convexUrl && authToken) {
        const convex = new ConvexHttpClient(convexUrl);
        convex.setAuth(authToken);
        await this.syncWithConvex(eventId, convex);
      } else {
        await this.initializeState(eventId);
      }
    }

    if (!this.eventState) {
      throw new Error('Failed to initialize event state');
    }

    // Fetch event data from Convex
    let eventData: any = null;
    if (convexUrl && authToken) {
      const convex = new ConvexHttpClient(convexUrl);
      convex.setAuth(authToken);

      try {
        eventData = await convex.query(api.events.getById, {
          eventId: eventId as any
        });
      } catch (error) {
        console.warn('[EventOrchestratorDO] Failed to fetch event data:', error);
      }
    }

    // Get arrays from cached state
    const tasks = Array.from(this.eventState.tasks.values());
    const expenses = Array.from(this.eventState.expenses.values());
    const vendors = Array.from(this.eventState.vendors.values());

    // Calculate statistics
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskCompletion = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    const budgetSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const vendorStatus: Record<string, number> = {};
    vendors.forEach(v => {
      const status = v.status || 'unknown';
      vendorStatus[status] = (vendorStatus[status] || 0) + 1;
    });

    const cacheAge = Date.now() - this.eventState.lastSyncedAt;

    const response: EventContextResponse = {
      eventId: this.eventState.eventId,
      event: eventData || {
        _id: eventId,
        _creationTime: Date.now(),
        name: 'Unknown Event',
        type: 'other' as const,
        createdBy: 'unknown',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      tasks,
      expenses,
      vendors,
      stats: {
        taskCompletion,
        budgetSpent,
        vendorStatus
      },
      cacheAge
    };

    return response;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Set event ID for this DO instance
   */
  public setEventId(eventId: string): void {
    this.currentEventId = eventId;
    this.eventId = eventId;
  }

  /**
   * Load state from DO storage with Convex fallback
   * If no stored state exists and eventId is set, initialize from Convex
   */
  private async loadState(eventId?: string): Promise<void> {
    if (this.eventState) {
      // Check for cache invalidation (TTL-based refresh after 5 minutes of inactivity)
      const now = Date.now();
      const timeSinceSync = now - this.eventState.lastSyncedAt;

      if (timeSinceSync > this.CACHE_TTL_MS) {
        console.log(`[EventOrchestratorDO] Cache expired (${Math.round(timeSinceSync / 1000)}s since sync), refreshing...`);

        // If we have a Convex client, refresh from Convex
        if (this.convexClient && this.eventState.eventId) {
          await this.syncWithConvex(this.eventState.eventId, this.convexClient);
        }
      }

      return; // Already loaded
    }

    const stored = await this.state.storage.get<any>('eventState');

    if (stored) {
      // Reconstruct Maps from stored arrays
      this.eventState = {
        ...stored,
        tasks: new Map(stored.tasks || []),
        expenses: new Map(stored.expenses || []),
        vendors: new Map(stored.vendors || [])
      };

      console.log(`[EventOrchestratorDO] Loaded state for event: ${this.eventState.eventId}`);

      // Check if cache needs refresh
      const now = Date.now();
      const timeSinceSync = now - this.eventState.lastSyncedAt;

      if (timeSinceSync > this.CACHE_TTL_MS) {
        console.log(`[EventOrchestratorDO] Loaded state is stale, attempting refresh...`);

        // Try to refresh from Convex if we have the URL
        if (this.env.CONVEX_DEPLOY_URL && this.eventState.eventId) {
          try {
            const convex = this.getOrCreateConvexClient();
            await this.syncWithConvex(this.eventState.eventId, convex);
          } catch (error) {
            console.warn('[EventOrchestratorDO] Failed to refresh stale cache:', error);
            // Continue with stale cache rather than failing
          }
        }
      }
    } else if (eventId || this.currentEventId) {
      // No stored state - initialize from Convex if eventId is available
      const targetEventId = eventId || this.currentEventId!;
      console.log(`[EventOrchestratorDO] No stored state found, initializing from Convex for event: ${targetEventId}`);

      try {
        await this.initializeFromConvex(targetEventId);
      } catch (error) {
        console.error('[EventOrchestratorDO] Failed to initialize from Convex:', error);
        // Fall back to empty state
        await this.initializeState(targetEventId);
      }
    }
  }

  /**
   * Save state to DO storage
   */
  private async saveState(): Promise<void> {
    if (!this.eventState) return;

    // Convert Maps to arrays for storage
    const serializable = {
      ...this.eventState,
      tasks: Array.from(this.eventState.tasks.entries()),
      expenses: Array.from(this.eventState.expenses.entries()),
      vendors: Array.from(this.eventState.vendors.entries())
    };

    await this.state.storage.put('eventState', serializable);

    console.log(`[EventOrchestratorDO] Saved state for event: ${this.eventState.eventId}`);
  }

  /**
   * Get or create cached Convex client
   */
  private getOrCreateConvexClient(): ConvexHttpClient {
    if (!this.convexClient) {
      if (!this.env.CONVEX_DEPLOY_URL) {
        throw new Error('CONVEX_DEPLOY_URL not configured');
      }
      this.convexClient = new ConvexHttpClient(this.env.CONVEX_DEPLOY_URL);
    }
    return this.convexClient;
  }

  /**
   * Initialize state from Convex (used on first load)
   * Fetches event, tasks, expenses, vendors from Convex
   */
  private async initializeFromConvex(eventId: string): Promise<void> {
    console.log(`[EventOrchestratorDO] Initializing from Convex for event: ${eventId}`);

    if (!this.env.CONVEX_DEPLOY_URL) {
      throw new Error('CONVEX_DEPLOY_URL not configured');
    }

    const convex = this.getOrCreateConvexClient();

    // Initialize empty state first
    this.eventState = {
      eventId,
      tasks: new Map(),
      expenses: new Map(),
      vendors: new Map(),
      lastSyncedAt: 0,
      version: 1
    };

    // Fetch all data from Convex
    try {
      // Fetch event info (for validation)
      const event = await convex.query(api.events.getById, {
        eventId: eventId as any
      });

      if (!event) {
        console.warn(`[EventOrchestratorDO] Event ${eventId} not found in Convex`);
        // Continue with empty state
        await this.saveState();
        return;
      }

      // Fetch tasks, expenses, and vendors in parallel
      const [tasks, expenses, vendors] = await Promise.all([
        this.fetchTasksFromConvex(eventId, convex),
        this.fetchExpensesFromConvex(eventId, convex),
        this.fetchVendorsFromConvex(eventId, convex)
      ]);

      // Populate state with fetched data
      tasks.forEach((task: Task) => {
        this.eventState!.tasks.set(task._id, task);
      });

      expenses.forEach((expense: Expense) => {
        this.eventState!.expenses.set(expense._id, expense);
      });

      vendors.forEach((vendor: Vendor) => {
        this.eventState!.vendors.set(vendor._id, vendor);
      });

      // Apply memory management (cap at 500 items per collection)
      this.applyMemoryLimits();

      this.eventState!.lastSyncedAt = Date.now();
      await this.saveState();

      console.log(`[EventOrchestratorDO] Initialized from Convex: ${this.eventState!.tasks.size} tasks, ${this.eventState!.expenses.size} expenses, ${this.eventState!.vendors.size} vendors`);
    } catch (error) {
      console.error('[EventOrchestratorDO] Error initializing from Convex:', error);
      // Keep empty state and save it
      await this.saveState();
      throw error;
    }
  }

  /**
   * Fetch tasks from Convex for a specific event
   */
  private async fetchTasksFromConvex(eventId: string, convex?: ConvexHttpClient): Promise<Task[]> {
    const client = convex || this.getOrCreateConvexClient();

    try {
      const tasks = await client.query(api.tasks.listByEvent, {
        eventId: eventId as any
      });

      console.log(`[EventOrchestratorDO] Fetched ${tasks?.length || 0} tasks from Convex`);
      return (tasks || []) as Task[];
    } catch (error) {
      console.error('[EventOrchestratorDO] Error fetching tasks from Convex:', error);
      return [];
    }
  }

  /**
   * Fetch expenses from Convex for a specific event
   */
  private async fetchExpensesFromConvex(eventId: string, convex?: ConvexHttpClient): Promise<Expense[]> {
    const client = convex || this.getOrCreateConvexClient();

    try {
      const expenses = await client.query(api.expenses.listByEvent, {
        eventId: eventId as any
      });

      console.log(`[EventOrchestratorDO] Fetched ${expenses?.length || 0} expenses from Convex`);
      return (expenses || []) as Expense[];
    } catch (error) {
      console.error('[EventOrchestratorDO] Error fetching expenses from Convex:', error);
      return [];
    }
  }

  /**
   * Fetch vendors from Convex for a specific event
   */
  private async fetchVendorsFromConvex(eventId: string, convex?: ConvexHttpClient): Promise<Vendor[]> {
    const client = convex || this.getOrCreateConvexClient();

    try {
      const vendors = await client.query(api.vendors.listByEvent, {
        eventId: eventId as any
      });

      console.log(`[EventOrchestratorDO] Fetched ${vendors?.length || 0} vendors from Convex`);
      return (vendors || []) as Vendor[];
    } catch (error) {
      console.error('[EventOrchestratorDO] Error fetching vendors from Convex:', error);
      return [];
    }
  }

  /**
   * Apply memory limits to collections (cap at 500 items per collection)
   * Keeps most recent items based on _creationTime
   */
  private applyMemoryLimits(): void {
    if (!this.eventState) return;

    // Cap tasks at MAX_ITEMS_PER_COLLECTION
    if (this.eventState.tasks.size > this.MAX_ITEMS_PER_COLLECTION) {
      console.log(`[EventOrchestratorDO] Trimming tasks from ${this.eventState.tasks.size} to ${this.MAX_ITEMS_PER_COLLECTION}`);

      const taskArray = Array.from(this.eventState.tasks.values());
      const sortedTasks = taskArray.sort((a, b) => b._creationTime - a._creationTime);
      const trimmedTasks = sortedTasks.slice(0, this.MAX_ITEMS_PER_COLLECTION);

      this.eventState.tasks.clear();
      trimmedTasks.forEach(task => {
        this.eventState!.tasks.set(task._id, task);
      });
    }

    // Cap expenses at MAX_ITEMS_PER_COLLECTION
    if (this.eventState.expenses.size > this.MAX_ITEMS_PER_COLLECTION) {
      console.log(`[EventOrchestratorDO] Trimming expenses from ${this.eventState.expenses.size} to ${this.MAX_ITEMS_PER_COLLECTION}`);

      const expenseArray = Array.from(this.eventState.expenses.values());
      const sortedExpenses = expenseArray.sort((a, b) => b._creationTime - a._creationTime);
      const trimmedExpenses = sortedExpenses.slice(0, this.MAX_ITEMS_PER_COLLECTION);

      this.eventState.expenses.clear();
      trimmedExpenses.forEach(expense => {
        this.eventState!.expenses.set(expense._id, expense);
      });
    }

    // Cap vendors at MAX_ITEMS_PER_COLLECTION
    if (this.eventState.vendors.size > this.MAX_ITEMS_PER_COLLECTION) {
      console.log(`[EventOrchestratorDO] Trimming vendors from ${this.eventState.vendors.size} to ${this.MAX_ITEMS_PER_COLLECTION}`);

      const vendorArray = Array.from(this.eventState.vendors.values());
      const sortedVendors = vendorArray.sort((a, b) => b._creationTime - a._creationTime);
      const trimmedVendors = sortedVendors.slice(0, this.MAX_ITEMS_PER_COLLECTION);

      this.eventState.vendors.clear();
      trimmedVendors.forEach(vendor => {
        this.eventState!.vendors.set(vendor._id, vendor);
      });
    }
  }

  /**
   * Initialize state for new event
   */
  private async initializeState(eventId: string): Promise<void> {
    console.log(`[EventOrchestratorDO] Initializing state for event: ${eventId}`);

    this.eventState = {
      eventId,
      tasks: new Map(),
      expenses: new Map(),
      vendors: new Map(),
      lastSyncedAt: 0,
      version: 1
    };

    await this.saveState();
  }

  /**
   * Sync state with Convex
   */
  private async syncWithConvex(eventId: string, convex: ConvexHttpClient): Promise<void> {
    if (!this.eventState) {
      await this.initializeState(eventId);
    }

    console.log(`[EventOrchestratorDO] Syncing with Convex for event: ${eventId}`);

    try {
      // Fetch tasks, expenses, and vendors in parallel using helper methods
      const [tasks, expenses, vendors] = await Promise.all([
        this.fetchTasksFromConvex(eventId, convex),
        this.fetchExpensesFromConvex(eventId, convex),
        this.fetchVendorsFromConvex(eventId, convex)
      ]);

      // Update cached state
      this.eventState!.tasks.clear();
      this.eventState!.expenses.clear();
      this.eventState!.vendors.clear();

      tasks.forEach((task: Task) => {
        this.eventState!.tasks.set(task._id, task);
      });

      expenses.forEach((expense: Expense) => {
        this.eventState!.expenses.set(expense._id, expense);
      });

      vendors.forEach((vendor: Vendor) => {
        this.eventState!.vendors.set(vendor._id, vendor);
      });

      // Apply memory management
      this.applyMemoryLimits();

      this.eventState!.lastSyncedAt = Date.now();
      this.eventState!.version += 1;

      await this.saveState();

      console.log(`[EventOrchestratorDO] Sync complete: ${this.eventState!.tasks.size} tasks, ${this.eventState!.expenses.size} expenses, ${this.eventState!.vendors.size} vendors`);

    } catch (error) {
      console.error('[EventOrchestratorDO] Sync error:', error);
      throw error;
    }
  }

  // ============================================================================
  // DATA ACCESS METHODS
  // ============================================================================

  /**
   * Get tasks with optional filters
   */
  private getTasks(filters?: any): Task[] {
    if (!this.eventState) return [];

    let tasks = Array.from(this.eventState.tasks.values());

    // Apply filters
    if (filters) {
      if (filters.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters.category) {
        tasks = tasks.filter(t => t.category === filters.category);
      }
      if (filters.assignedTo) {
        tasks = tasks.filter(t => t.assignedTo === filters.assignedTo || t.assignee === filters.assignedTo);
      }
      if (filters.priority) {
        tasks = tasks.filter(t => t.priority === filters.priority);
      }
    }

    return tasks;
  }

  /**
   * Get expenses with optional filters
   */
  private getExpenses(filters?: any): Expense[] {
    if (!this.eventState) return [];

    let expenses = Array.from(this.eventState.expenses.values());

    // Apply filters
    if (filters) {
      if (filters.category) {
        expenses = expenses.filter(e => e.category === filters.category);
      }
      if (filters.status) {
        expenses = expenses.filter(e => e.status === filters.status);
      }
      if (filters.vendorId) {
        expenses = expenses.filter(e => e.vendorId === filters.vendorId);
      }
    }

    return expenses;
  }

  /**
   * Get vendors with optional filters
   */
  private getVendors(filters?: any): Vendor[] {
    if (!this.eventState) return [];

    let vendors = Array.from(this.eventState.vendors.values());

    // Apply filters
    if (filters) {
      if (filters.category) {
        vendors = vendors.filter(v => v.category === filters.category);
      }
      if (filters.status) {
        vendors = vendors.filter(v => v.status === filters.status);
      }
    }

    return vendors;
  }

  /**
   * Aggregate context for agent
   */
  private aggregateContext(): any {
    if (!this.eventState) {
      return {
        taskCount: 0,
        expenseCount: 0,
        vendorCount: 0,
        tasksByStatus: {},
        expensesByCategory: {},
        vendorsByCategory: {},
        totalSpent: 0
      };
    }

    const tasks = Array.from(this.eventState.tasks.values());
    const expenses = Array.from(this.eventState.expenses.values());
    const vendors = Array.from(this.eventState.vendors.values());

    // Aggregate tasks by status
    const tasksByStatus: Record<string, number> = {};
    tasks.forEach(t => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });

    // Aggregate expenses by category
    const expensesByCategory: Record<string, number> = {};
    let totalSpent = 0;
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      totalSpent += e.amount;
    });

    // Aggregate vendors by category
    const vendorsByCategory: Record<string, number> = {};
    vendors.forEach(v => {
      vendorsByCategory[v.category] = (vendorsByCategory[v.category] || 0) + 1;
    });

    return {
      taskCount: tasks.length,
      expenseCount: expenses.length,
      vendorCount: vendors.length,
      tasksByStatus,
      expensesByCategory,
      vendorsByCategory,
      totalSpent,
      lastSyncedAt: this.eventState.lastSyncedAt,
      version: this.eventState.version
    };
  }
}
