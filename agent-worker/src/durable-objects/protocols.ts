/**
 * Inter-DO Communication Protocols
 *
 * Defines the request/response contracts between RoomOrchestratorDO and EventOrchestratorDO
 * for efficient cross-DO communication with event-level state caching.
 */

import { Intent } from '../agents/helpers/types';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * Task entity (matches Convex schema)
 */
export interface Task {
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
export interface Expense {
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
export interface Vendor {
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
 * Event entity (subset of Convex event schema)
 */
export interface EventData {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
  type: 'wedding' | 'corporate' | 'party' | 'travel' | 'other';
  date?: number;
  location?: {
    venue?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  budget?: {
    total: number;
    currency: string;
  };
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Room context for agent invocation
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
  extractedCommitments?: any[];
}

/**
 * Agent response structure
 */
export interface AgentResponse {
  text: string;
  intent: string;
  confidence: number;
  toolsUsed: string[];
  structuredData?: any;
  suggestions?: string[];
  metadata?: {
    iterations?: any[];
    totalIterations?: number;
    abortReason?: string;
    wasSuccessful?: boolean;
    intents?: string[];
  };
  renderType?: string;
  componentConfig?: any;
  interactivePrompt?: any;
  responseBlocks?: any[];
}

/**
 * State change record for syncing
 */
export interface StateChange {
  type: 'task_created' | 'task_updated' | 'expense_created' | 'expense_updated' | 'vendor_created' | 'vendor_updated';
  entityId: string;
  timestamp: number;
  data: any;
}

// ============================================================================
// GET /context - Returns cached event context for agent
// ============================================================================

/**
 * Response from GET /context endpoint
 * Returns full event context with statistics for fast agent access
 */
export interface EventContextResponse {
  eventId: string;
  event: EventData;
  tasks: Task[];
  expenses: Expense[];
  vendors: Vendor[];
  stats: {
    taskCompletion: number;      // Percentage of tasks completed
    budgetSpent: number;          // Total spent across all expenses
    vendorStatus: Record<string, number>;  // Count by status (researching, contacted, etc)
  };
  cacheAge: number;  // milliseconds since last sync
}

// ============================================================================
// POST /invoke - Execute agent with event-level tools
// ============================================================================

/**
 * Request to POST /invoke endpoint
 * Executes agent logic with event-scoped context
 */
export interface InvokeRequest {
  message: string;
  roomId: string;
  userId: string;
  intent: Intent;
  roomContext: RoomContext;
}

/**
 * Response from POST /invoke endpoint
 * Contains agent response and any state changes that occurred
 */
export interface InvokeResponse {
  response: AgentResponse;
  stateChanges: StateChange[];
}

// ============================================================================
// POST /sync - Force sync state to Convex
// ============================================================================

/**
 * Request to POST /sync endpoint
 * Triggers sync of cached state back to Convex
 */
export interface SyncRequest {
  force?: boolean;  // Force sync even if cache is fresh
  tables?: ('tasks' | 'expenses' | 'vendors')[];  // Selective sync (default: all)
}

/**
 * Response from POST /sync endpoint
 * Reports sync results
 */
export interface SyncResponse {
  synced: boolean;
  changes: number;  // Number of entities synced
  errors: string[];  // Any errors encountered during sync
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  statusCode: number;
  timestamp: number;
}

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================

/**
 * Timeout configurations for different endpoints
 */
export const TIMEOUTS = {
  CONTEXT: 10_000,   // 10 seconds for context retrieval
  INVOKE: 30_000,    // 30 seconds for agent invocation
  SYNC: 10_000,      // 10 seconds for sync operations
} as const;
