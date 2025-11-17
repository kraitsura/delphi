import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAgent, LoopState } from '../BaseAgent';

// Create a concrete test agent to access the private error handling methods
class TestAgent extends BaseAgent {
  getSystemPrompt() {
    return 'You are a test agent.';
  }

  getIntent() {
    return 'test';
  }

  // Expose the private methods for testing
  public testGetErrorKey(errorMessage?: string): string {
    return (this as any).getErrorKey(errorMessage);
  }

  public testTrackError(state: LoopState, errorKey: string): void {
    (this as any).trackError(state, errorKey);
  }

  public testIsStuckInLoop(state: LoopState, errorKey: string, maxConsecutive: number): boolean {
    return (this as any).isStuckInLoop(state, errorKey, maxConsecutive);
  }
}

describe('Error Classification', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent('test', 'test-key', []);
  });

  describe('getErrorKey', () => {
    it('should classify validation errors', () => {
      expect(agent.testGetErrorKey('Validation failed: field required')).toBe('validation_error');
      expect(agent.testGetErrorKey('Invalid category')).toBe('validation_error');
    });

    it('should classify auth errors', () => {
      expect(agent.testGetErrorKey('Unauthorized access')).toBe('auth_error');
      expect(agent.testGetErrorKey('Permission denied')).toBe('auth_error');
    });

    it('should classify not found errors', () => {
      expect(agent.testGetErrorKey('Event not found')).toBe('not_found_error');
      expect(agent.testGetErrorKey('ID does not exist')).toBe('not_found_error');
    });

    it('should classify network errors', () => {
      expect(agent.testGetErrorKey('Network timeout')).toBe('network_error');
      expect(agent.testGetErrorKey('Fetch failed')).toBe('network_error');
    });

    it('should classify JSON errors', () => {
      expect(agent.testGetErrorKey('JSON parse error')).toBe('json_error');
      expect(agent.testGetErrorKey('Syntax error in JSON')).toBe('json_error');
    });

    it('should return generic_error for unknown', () => {
      expect(agent.testGetErrorKey('Something weird happened')).toBe('generic_error');
    });

    it('should return unknown_error for undefined', () => {
      expect(agent.testGetErrorKey()).toBe('unknown_error');
      expect(agent.testGetErrorKey(undefined)).toBe('unknown_error');
    });
  });

  describe('trackError and isStuckInLoop', () => {
    it('should detect stuck after 3 consecutive errors', () => {
      const state: LoopState = {
        iterations: [],
        currentIteration: 0,
        consecutiveErrors: new Map<string, number>(),
        isComplete: false,
      };

      agent.testTrackError(state, 'validation_error');
      expect(agent.testIsStuckInLoop(state, 'validation_error', 3)).toBe(false);

      agent.testTrackError(state, 'validation_error');
      expect(agent.testIsStuckInLoop(state, 'validation_error', 3)).toBe(false);

      agent.testTrackError(state, 'validation_error');
      expect(agent.testIsStuckInLoop(state, 'validation_error', 3)).toBe(true);
    });

    it('should track different error types separately', () => {
      const state: LoopState = {
        iterations: [],
        currentIteration: 0,
        consecutiveErrors: new Map<string, number>(),
        isComplete: false,
      };

      agent.testTrackError(state, 'validation_error');
      agent.testTrackError(state, 'validation_error');
      agent.testTrackError(state, 'network_error');

      expect(agent.testIsStuckInLoop(state, 'validation_error', 3)).toBe(false);
      expect(agent.testIsStuckInLoop(state, 'network_error', 3)).toBe(false);
    });
  });
});
