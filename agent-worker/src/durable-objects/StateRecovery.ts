import type { DomainEvent } from './EventLog';

export interface EventState {
  eventId: string;
  tasks: Map<string, any>;
  expenses: Map<string, any>;
  vendors: Map<string, any>;
  lastSyncedAt: number;
  version: number;
}

export class StateRecovery {
  async recover(
    doState: DurableObjectState,
    eventLog: { getEvents(since?: number): Promise<DomainEvent[]> }
  ): Promise<EventState> {
    // 1. Try to load snapshot
    const snapshot = await doState.storage.get<EventState>('stateSnapshot');
    const snapshotSequence = await doState.storage.get<number>('snapshotSequence') || 0;

    // 2. Start from snapshot or empty state
    let state: EventState = snapshot || this.createEmptyState();

    // 3. Replay events since snapshot
    const events = await eventLog.getEvents(snapshotSequence);

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  async loadSnapshot(doState: DurableObjectState): Promise<{ state: any; sequence: number } | null> {
    const snapshot = await doState.storage.get<EventState>('stateSnapshot');
    const snapshotSequence = await doState.storage.get<number>('snapshotSequence');

    if (snapshot && snapshotSequence !== undefined) {
      return {
        state: {
          eventId: snapshot.eventId,
          tasks: Array.from(snapshot.tasks?.entries?.() || []),
          expenses: Array.from(snapshot.expenses?.entries?.() || []),
          vendors: Array.from(snapshot.vendors?.entries?.() || []),
          lastSyncedAt: snapshot.lastSyncedAt,
          version: snapshot.version,
        },
        sequence: snapshotSequence,
      };
    }

    return null;
  }

  applyEvent(state: EventState, event: DomainEvent): EventState {
    switch (event.type) {
      case 'TASK_CREATED':
        return {
          ...state,
          tasks: new Map(state.tasks).set(event.payload.id || event.payload._id, event.payload),
          version: state.version + 1,
        };

      case 'TASK_UPDATED': {
        const updatedTasks = new Map(state.tasks);
        const existingTask = updatedTasks.get(event.payload.taskId);
        if (existingTask) {
          updatedTasks.set(event.payload.taskId, {
            ...existingTask,
            ...event.payload.changes,
          });
        }
        return { ...state, tasks: updatedTasks, version: state.version + 1 };
      }

      case 'TASK_COMPLETED': {
        const completedTasks = new Map(state.tasks);
        const task = completedTasks.get(event.payload.taskId);
        if (task) {
          completedTasks.set(event.payload.taskId, {
            ...task,
            status: 'completed',
            completedAt: event.timestamp,
          });
        }
        return { ...state, tasks: completedTasks, version: state.version + 1 };
      }

      case 'TASK_DELETED': {
        const remainingTasks = new Map(state.tasks);
        remainingTasks.delete(event.payload.taskId);
        return { ...state, tasks: remainingTasks, version: state.version + 1 };
      }

      case 'EXPENSE_ADDED':
        return {
          ...state,
          expenses: new Map(state.expenses).set(event.payload.id || event.payload._id, event.payload),
          version: state.version + 1,
        };

      case 'EXPENSE_UPDATED': {
        const updatedExpenses = new Map(state.expenses);
        const existingExpense = updatedExpenses.get(event.payload.expenseId);
        if (existingExpense) {
          updatedExpenses.set(event.payload.expenseId, {
            ...existingExpense,
            ...event.payload.changes,
          });
        }
        return { ...state, expenses: updatedExpenses, version: state.version + 1 };
      }

      case 'VENDOR_ADDED':
        return {
          ...state,
          vendors: new Map(state.vendors).set(event.payload.id || event.payload._id, event.payload),
          version: state.version + 1,
        };

      case 'VENDOR_STATUS_CHANGED': {
        const updatedVendors = new Map(state.vendors);
        const vendor = updatedVendors.get(event.payload.vendorId);
        if (vendor) {
          updatedVendors.set(event.payload.vendorId, {
            ...vendor,
            status: event.payload.to,
          });
        }
        return { ...state, vendors: updatedVendors, version: state.version + 1 };
      }

      default:
        return state;
    }
  }

  createEmptyState(): EventState {
    return {
      eventId: '',
      tasks: new Map(),
      expenses: new Map(),
      vendors: new Map(),
      lastSyncedAt: 0,
      version: 0,
    };
  }

  async saveSnapshot(doState: DurableObjectState, state: EventState, sequence: number): Promise<void> {
    await doState.storage.put('stateSnapshot', state);
    await doState.storage.put('snapshotSequence', sequence);
  }
}
