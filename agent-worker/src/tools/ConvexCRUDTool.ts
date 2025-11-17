import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../web/convex/_generated/api';
import type { Id } from '../../../web/convex/_generated/dataModel';
import { Tool, ToolResult, ToolContext } from './index';

export class ConvexCRUDTool implements Tool {
  name = 'convex_crud';
  description = 'Create, read, update, delete data in Convex database (tasks, expenses, vendors, polls, etc.)';

  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  async execute(params: {
    operation: 'create' | 'read' | 'update' | 'delete';
    table: 'tasks' | 'expenses' | 'vendors' | 'events' | 'polls';
    data: any;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate operation parameter
      const validOperations = ['create', 'read', 'update', 'delete'];
      if (!validOperations.includes(params.operation)) {
        throw new Error(
          `Invalid operation: "${params.operation}". ` +
          `Valid operations are: ${validOperations.join(', ')}. ` +
          `Note: Use "read" instead of "query" to fetch data.`
        );
      }

      // Validate table parameter
      const validTables = ['tasks', 'expenses', 'vendors', 'events', 'polls'];
      if (!validTables.includes(params.table)) {
        throw new Error(
          `Invalid table: "${params.table}". ` +
          `Valid tables are: ${validTables.join(', ')}.`
        );
      }

      const convex = new ConvexHttpClient(this.context.convexUrl);
      convex.setAuth(this.context.authToken);

      let result;

      switch (params.operation) {
        case 'create':
          result = await this.create(convex, params.table, params.data);
          break;
        case 'read':
          result = await this.read(convex, params.table, params.data);
          break;
        case 'update':
          result = await this.update(convex, params.table, params.data);
          break;
        case 'delete':
          result = await this.delete(convex, params.table, params.data);
          break;
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          source: 'convex',
        }
      };

    } catch (error) {
      console.error('[ConvexCRUDTool Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
        }
      };
    }
  }

  private async create(convex: ConvexHttpClient, table: string, data: any) {
    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.create, {
          ...data,
          roomId: this.context.roomId as Id<"rooms">,
          eventId: this.context.eventId as Id<"events">,
          createdBy: this.context.userId as Id<"users">,
        });

      case 'expenses':
        return await convex.mutation(api.expenses.create, {
          ...data,
          roomId: this.context.roomId as Id<"rooms">,
          eventId: this.context.eventId as Id<"events">,
          createdBy: this.context.userId as Id<"users">,
        });

      case 'vendors':
        return await convex.mutation(api.vendors.create, {
          ...data,
          roomId: this.context.roomId as Id<"rooms">,
          eventId: this.context.eventId as Id<"events">,
          addedBy: this.context.userId as Id<"users">, // vendors use addedBy, not createdBy
        });

      case 'polls':
        return await convex.mutation(api.polls.create, {
          ...data,
          roomId: this.context.roomId as Id<"rooms">,
          eventId: this.context.eventId as Id<"events">,
          // Note: createdBy is automatically set by the mutation based on auth
        });

      default:
        throw new Error(`Unsupported table for create: ${table}`);
    }
  }

  private async read(convex: ConvexHttpClient, table: string, data: any) {
    // Use event-scoped queries for all tables to get complete event data
    // This is defensive: we only pass validated parameters, ignoring any extras from AI
    switch (table) {
      case 'tasks':
        return await convex.query(api.tasks.listByEvent, {
          eventId: this.context.eventId! as Id<"events">,
        });

      case 'expenses':
        return await convex.query(api.expenses.listByEvent, {
          eventId: this.context.eventId! as Id<"events">,
        });

      case 'vendors':
        return await convex.query(api.vendors.listByEvent, {
          eventId: this.context.eventId! as Id<"events">,
        });

      case 'events':
        return await convex.query(api.events.getById, {
          eventId: this.context.eventId! as Id<"events">,
        });

      case 'polls':
        return await convex.query(api.polls.listByEvent, {
          eventId: this.context.eventId! as Id<"events">,
        });

      default:
        throw new Error(`Unsupported table for read: ${table}`);
    }
  }

  private async update(convex: ConvexHttpClient, table: string, data: any) {
    const { id, ...updates } = data;

    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.update, {
          taskId: id,
          ...updates
        });

      case 'expenses':
        return await convex.mutation(api.expenses.update, {
          expenseId: id,
          ...updates
        });

      default:
        throw new Error(`Unsupported table for update: ${table}`);
    }
  }

  private async delete(convex: ConvexHttpClient, table: string, data: any) {
    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.remove, {
          taskId: data.id
        });

      case 'expenses':
        return await convex.mutation(api.expenses.remove, {
          expenseId: data.id
        });

      case 'vendors':
        return await convex.mutation(api.vendors.deleteVendor, {
          vendorId: data.id
        });

      default:
        throw new Error(`Unsupported table for delete: ${table}`);
    }
  }
}
