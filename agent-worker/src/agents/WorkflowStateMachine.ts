export type WorkflowState =
  | { status: 'idle' }
  | { status: 'receiving'; message: string; receivedAt: number }
  | { status: 'detecting_intent'; message: string; startedAt: number }
  | { status: 'thinking'; intent: any; context: any; iteration: number }
  | { status: 'executing_tool'; tool: string; params: any; startedAt: number }
  | { status: 'awaiting_confirmation'; proposal: any; expiresAt: number }
  | { status: 'streaming'; chunks: string[]; startedAt: number }
  | { status: 'completing'; response: any }
  | { status: 'complete'; response: any; completedAt: number }
  | { status: 'failed'; error: string; failedAt: number; recoverable: boolean }
  | { status: 'aborted'; reason: string; abortedAt: number };

export type WorkflowEvent =
  | { type: 'MESSAGE_RECEIVED'; message: string }
  | { type: 'INTENT_DETECTED'; intent: any }
  | { type: 'INTENT_DETECTION_FAILED'; error: string }
  | { type: 'THINKING_STARTED'; iteration: number }
  | { type: 'TOOL_CALL_REQUESTED'; tool: string; params: any }
  | { type: 'TOOL_CALL_COMPLETED'; result: any }
  | { type: 'TOOL_CALL_FAILED'; error: string }
  | { type: 'CHUNK_GENERATED'; text: string }
  | { type: 'RESPONSE_COMPLETE'; response: any }
  | { type: 'ERROR_OCCURRED'; error: string; recoverable: boolean }
  | { type: 'ABORT_REQUESTED'; reason: string };

export class WorkflowStateMachine {
  private state: WorkflowState = { status: 'idle' };
  private listeners: Set<(state: WorkflowState) => void> = new Set();

  getState(): WorkflowState {
    return this.state;
  }

  transition(event: WorkflowEvent): WorkflowState {
    const nextState = this.reduce(this.state, event);

    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }

    return this.state;
  }

  private reduce(state: WorkflowState, event: WorkflowEvent): WorkflowState {
    // Handle global events first
    if (event.type === 'ERROR_OCCURRED') {
      return { status: 'failed', error: event.error, failedAt: Date.now(), recoverable: event.recoverable };
    }
    if (event.type === 'ABORT_REQUESTED') {
      return { status: 'aborted', reason: event.reason, abortedAt: Date.now() };
    }

    switch (state.status) {
      case 'idle':
        if (event.type === 'MESSAGE_RECEIVED') {
          return { status: 'receiving', message: event.message, receivedAt: Date.now() };
        }
        break;

      case 'receiving':
        if (event.type === 'INTENT_DETECTED') {
          return { status: 'thinking', intent: event.intent, context: {}, iteration: 0 };
        }
        if (event.type === 'INTENT_DETECTION_FAILED') {
          return { status: 'failed', error: event.error, failedAt: Date.now(), recoverable: true };
        }
        break;

      case 'thinking':
        if (event.type === 'TOOL_CALL_REQUESTED') {
          return { status: 'executing_tool', tool: event.tool, params: event.params, startedAt: Date.now() };
        }
        if (event.type === 'CHUNK_GENERATED') {
          return { status: 'streaming', chunks: [event.text], startedAt: Date.now() };
        }
        if (event.type === 'RESPONSE_COMPLETE') {
          return { status: 'complete', response: event.response, completedAt: Date.now() };
        }
        break;

      case 'executing_tool':
        if (event.type === 'TOOL_CALL_COMPLETED') {
          return { status: 'thinking', intent: {}, context: {}, iteration: 1 };
        }
        if (event.type === 'TOOL_CALL_FAILED') {
          return { status: 'failed', error: event.error, failedAt: Date.now(), recoverable: true };
        }
        break;

      case 'streaming':
        if (event.type === 'CHUNK_GENERATED') {
          return { ...state, chunks: [...state.chunks, event.text] };
        }
        if (event.type === 'RESPONSE_COMPLETE') {
          return { status: 'complete', response: event.response, completedAt: Date.now() };
        }
        break;
    }

    return state;
  }

  subscribe(listener: (state: WorkflowState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  reset(): void {
    this.state = { status: 'idle' };
    this.notifyListeners();
  }
}
