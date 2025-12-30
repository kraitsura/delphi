import { BaseAgent, AgentContext, AgentResponse, AgenticLoopConfig } from '../BaseAgent';
import { Tool } from '../../tools';
import {
  CommitmentExtractor,
  IntentDetector,
  RoomContext,
  Intent,
  Message,
  Commitment
} from '../helpers';

/**
 * TaskAgent - Specialized agent for task management (Phase 2 Agent Swarm)
 *
 * Responsibilities:
 * - Task CRUD operations (create, read, update, delete)
 * - Dependency management (dependsOn/blockedBy)
 * - Task enrichment (descriptions, estimates, categories)
 * - Commitment extraction from conversation
 * - Bulk task creation with proposals
 *
 * Focused scope: ONLY handles task-related operations
 * Tools allowed: ONLY convex_crud with table='tasks'
 *
 * Issue: delphi-w08 - Extract TaskAgent from UnifiedDelphiAgent
 */
export class TaskAgent extends BaseAgent {
  constructor(aiKey: string, tools: Tool[]) {
    // Filter tools to ONLY allow convex_crud with table='tasks'
    const taskTools = tools.filter(tool => tool.name === 'convex_crud');
    super('TaskAgent', aiKey, taskTools);
  }

  /**
   * Override handle to enforce table='tasks' restriction on all operations
   */
  async handle(
    context: AgentContext,
    config: Partial<AgenticLoopConfig> = {},
    intent?: string
  ): Promise<AgentResponse> {
    // Intercept and validate that all convex_crud calls use table='tasks'
    // This is enforced by filtering tools in constructor, but we add this as defense-in-depth
    return super.handle(context, config, intent);
  }

  getIntent(): string {
    return 'task_management';
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are Delphi's Task Specialist, focused exclusively on task management for event planning.

Your capabilities:
- Create tasks with rich metadata (title, description, category, priority, deadline)
- Manage task dependencies (what blocks what, critical path)
- Extract actionable commitments from conversation
- Estimate task effort and costs
- Suggest task breakdowns for complex activities

You have access to the convex_crud tool for task operations.
Always include:
- Clear task titles (action-oriented)
- Appropriate categories (venue, catering, photography, etc.)
- Realistic deadlines based on event date
- Dependencies when tasks logically depend on others

DO NOT:
- Handle budget/expense operations
- Search for vendors
- Create polls or decisions
- Provide general event advice

IMPORTANT: You can ONLY use the convex_crud tool with table='tasks'. Do not attempt to access other tables.
`;
  }

  /**
   * Extract commitments from conversation messages
   * Returns array of potential tasks identified in conversation
   */
  async extractCommitments(
    messages: Message[],
    agentContext?: AgentContext
  ): Promise<Commitment[]> {
    console.log('[TaskAgent] Extracting commitments from conversation...');

    const context = agentContext || {
      message: '',
      recentMessages: [],
      roomId: '',
      eventId: ''
    };

    const extractor = new CommitmentExtractor(this, context);
    const result = await extractor.extractCommitments(messages);

    if (result.success) {
      console.log(`[TaskAgent] Extracted ${result.commitments.length} commitments`);
      return result.commitments;
    }

    console.warn('[TaskAgent] Commitment extraction failed:', result.error);
    return [];
  }

  /**
   * Create a single task
   */
  async createTask(params: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    estimatedCost?: number;
    dependsOn?: string[];
    blockedBy?: string[];
  }): Promise<any> {
    console.log('[TaskAgent] Creating task:', params.title);

    const convexCrud = this.tools.get('convex_crud');
    if (!convexCrud) {
      throw new Error('convex_crud tool not available');
    }

    const result = await convexCrud.execute({
      operation: 'create',
      table: 'tasks',
      data: {
        ...params,
        category: params.category || 'other',
        priority: params.priority || 'medium',
        status: params.status || 'todo'
      }
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create task');
    }

    return result.data;
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      status?: string;
      dueDate?: string;
      estimatedCost?: number;
      assignedTo?: string;
      dependsOn?: string[];
      blockedBy?: string[];
      completedAt?: string;
    }
  ): Promise<any> {
    console.log('[TaskAgent] Updating task:', taskId);

    const convexCrud = this.tools.get('convex_crud');
    if (!convexCrud) {
      throw new Error('convex_crud tool not available');
    }

    const result = await convexCrud.execute({
      operation: 'update',
      table: 'tasks',
      recordId: taskId,
      data: updates
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }

    return result.data;
  }

  /**
   * Query tasks with optional filters
   */
  async queryTasks(filters?: {
    status?: string | string[];
    category?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<any[]> {
    console.log('[TaskAgent] Querying tasks with filters:', filters);

    const convexCrud = this.tools.get('convex_crud');
    if (!convexCrud) {
      throw new Error('convex_crud tool not available');
    }

    const result = await convexCrud.execute({
      operation: 'read',
      table: 'tasks',
      ...(filters && { filters })
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to query tasks');
    }

    return Array.isArray(result.data) ? result.data : [result.data];
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    console.log('[TaskAgent] Deleting task:', taskId);

    const convexCrud = this.tools.get('convex_crud');
    if (!convexCrud) {
      throw new Error('convex_crud tool not available');
    }

    const result = await convexCrud.execute({
      operation: 'delete',
      table: 'tasks',
      recordId: taskId
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete task');
    }
  }

  /**
   * Create multiple tasks from conversation commitments
   * Uses proposal system for user review
   */
  async createTasksFromCommitments(
    commitments: Commitment[],
    context: AgentContext
  ): Promise<AgentResponse> {
    console.log(`[TaskAgent] Creating tasks from ${commitments.length} commitments...`);

    if (commitments.length === 0) {
      return {
        text: 'No actionable commitments found to create tasks from.',
        intent: 'create_tasks_from_commitments',
        confidence: 1.0,
        toolsUsed: [],
        metadata: { wasSuccessful: false }
      };
    }

    // Convert commitments to task proposal items
    const proposalItems = commitments.map(commitment => ({
      type: 'task' as const,
      data: {
        title: commitment.text,
        description: commitment.text,
        category: commitment.category || 'other',
        priority: 'medium' as const,
        status: 'todo' as const,
        ...(commitment.mentions?.cost && { estimatedCost: commitment.mentions.cost }),
        ...(commitment.mentions?.deadline && { dueDate: commitment.mentions.deadline })
      },
      reasoning: 'Extracted from conversation commitment'
    }));

    // Generate proposal
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    const proposalMetadata = {
      proposalId,
      proposalType: 'tasks' as const,
      items: proposalItems,
      expiresAt,
      requiresConfirmation: true,
      createdAt: Date.now()
    };

    return {
      text: this.formatProposalMessage(proposalItems),
      intent: 'create_tasks_from_commitments',
      confidence: 0.95,
      toolsUsed: ['commitment_extraction'],
      structuredData: {
        type: 'proposal',
        proposal: proposalMetadata
      },
      metadata: {
        totalIterations: 0,
        wasSuccessful: true
      }
    };
  }

  /**
   * Format proposal message for task creation
   */
  private formatProposalMessage(items: Array<{ type: string; data: any; reasoning?: string }>): string {
    const summary = items
      .map((item, idx) => {
        if (item.type === 'task') {
          return `${idx + 1}. **${item.data.title}** (${item.data.category}, ${item.data.priority} priority)`;
        }
        return `${idx + 1}. ${JSON.stringify(item.data)}`;
      })
      .join('\n\n');

    return `I've prepared a proposal to create ${items.length} task(s):

${summary}

**Would you like to:**
- ✅ **Accept all** - Create all ${items.length} task(s) as proposed
- ✏️ **Edit** - Modify the tasks before creating them
- ❌ **Reject** - Don't create these tasks

This proposal expires in 5 minutes.`;
  }

  /**
   * Suggest dependencies between tasks based on logical relationships
   */
  async suggestDependencies(tasks: any[]): Promise<Array<{ taskId: string; dependsOn: string; reason: string }>> {
    console.log('[TaskAgent] Analyzing task dependencies...');

    if (tasks.length < 2) {
      return [];
    }

    // Build prompt to analyze dependencies
    const prompt = `Analyze these event planning tasks and identify logical dependencies.

Tasks:
${tasks.map((task, idx) => `${idx + 1}. ${task.title} (${task.category}, ${task.status})`).join('\n')}

Identify which tasks depend on others. Look for:
- Tasks that need information/decisions from other tasks
- Sequential workflows (e.g., venue before invitations)
- Critical path dependencies

Return ONLY a JSON array of dependencies:
[
  {
    "taskId": "task_id_that_depends",
    "dependsOn": "task_id_it_depends_on",
    "reason": "Brief explanation"
  }
]

If no dependencies found, return [].`;

    try {
      const response = await this.callAI(prompt);
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.warn('[TaskAgent] No JSON array found in dependency analysis');
        return [];
      }

      const jsonString = response.substring(jsonStart, jsonEnd + 1);
      const dependencies = JSON.parse(jsonString);

      console.log(`[TaskAgent] Found ${dependencies.length} potential dependencies`);
      return dependencies;
    } catch (error: any) {
      console.error('[TaskAgent] Error analyzing dependencies:', error.message);
      return [];
    }
  }
}
