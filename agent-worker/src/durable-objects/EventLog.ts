export type DomainEvent =
  // Task events
  | { type: 'TASK_CREATED'; payload: any; timestamp: number; actor: string; sequence?: number }
  | { type: 'TASK_UPDATED'; payload: { taskId: string; changes: any }; timestamp: number; actor: string; sequence?: number }
  | { type: 'TASK_COMPLETED'; payload: { taskId: string }; timestamp: number; actor: string; sequence?: number }
  | { type: 'TASK_DELETED'; payload: { taskId: string }; timestamp: number; actor: string; sequence?: number }
  // Expense events
  | { type: 'EXPENSE_ADDED'; payload: any; timestamp: number; actor: string; sequence?: number }
  | { type: 'EXPENSE_UPDATED'; payload: { expenseId: string; changes: any }; timestamp: number; actor: string; sequence?: number }
  // Vendor events
  | { type: 'VENDOR_ADDED'; payload: any; timestamp: number; actor: string; sequence?: number }
  | { type: 'VENDOR_STATUS_CHANGED'; payload: { vendorId: string; from: string; to: string }; timestamp: number; actor: string; sequence?: number }
  // Agent events
  | { type: 'AGENT_INVOKED'; payload: { intent: string; message: string }; timestamp: number; actor: string; sequence?: number }
  | { type: 'AGENT_COMPLETED'; payload: { response: any }; timestamp: number; actor: string; sequence?: number };

export class EventLog {
  private events: DomainEvent[] = [];
  private lastSequence = 0;
  private doState: DurableObjectState;

  constructor(doState: DurableObjectState) {
    this.doState = doState;
  }

  async append(event: Omit<DomainEvent, 'sequence'>): Promise<number> {
    const sequence = ++this.lastSequence;
    const fullEvent = { ...event, sequence } as DomainEvent;

    this.events.push(fullEvent);

    await this.doState.storage.put(`event:${sequence}`, fullEvent);
    await this.doState.storage.put('lastSequence', sequence);

    return sequence;
  }

  async getEvents(since?: number): Promise<DomainEvent[]> {
    if (since === undefined) {
      return [...this.events];
    }
    return this.events.filter(e => (e.sequence ?? 0) > since);
  }

  async replay(handler: (event: DomainEvent) => void): Promise<void> {
    for (const event of this.events) {
      handler(event);
    }
  }

  async restore(): Promise<void> {
    this.lastSequence = await this.doState.storage.get<number>('lastSequence') || 0;

    const eventEntries = await this.doState.storage.list<DomainEvent>({ prefix: 'event:' });
    this.events = Array.from(eventEntries.values())
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  get length(): number {
    return this.events.length;
  }

  get latestSequence(): number {
    return this.lastSequence;
  }
}
