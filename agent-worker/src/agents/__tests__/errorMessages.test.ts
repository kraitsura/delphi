import { describe, it, expect } from 'vitest';
import { BaseAgent } from '../BaseAgent';
import { ParsedAIResponse, LoopState, LoopIteration } from '../BaseAgent';
import { Tool } from '../../tools';

// Mock concrete agent for testing
class TestAgent extends BaseAgent {
  getSystemPrompt() {
    return 'You are a test agent.';
  }
  getIntent() {
    return 'test';
  }

  // Expose private methods for testing
  public testBuildAbortMessage(parsed: ParsedAIResponse, state: LoopState): string {
    return (this as any).buildAbortMessage(parsed, state);
  }

  public testBuildStuckMessage(error: string | undefined, state: LoopState): string {
    return (this as any).buildStuckMessage(error, state);
  }

  public testBuildMaxIterationsMessage(state: LoopState): string {
    return (this as any).buildMaxIterationsMessage(state);
  }

  public testBuildExecutionErrorMessage(error: unknown, state: LoopState): string {
    return (this as any).buildExecutionErrorMessage(error, state);
  }
}

describe('Error Message Builders', () => {
  const mockTool: Tool = {
    name: 'test_tool',
    description: 'A test tool',
    execute: async () => ({ success: true, data: {} }),
  };

  const agent = new TestAgent('test', 'mock-api-key', [mockTool]);

  describe('buildAbortMessage', () => {
    it('should include attempt history', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            action: { tool: 'convex_crud', params: {} },
            observation: { success: false, error: 'Failed' }
          },
          {
            iteration: 2,
            timestamp: Date.now(),
            action: { tool: 'convex_crud', params: {} },
            observation: { success: false, error: 'Failed again' }
          },
        ],
        currentIteration: 2,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const parsed: ParsedAIResponse = {
        reasoning: 'Task is impossible',
        finalMessage: 'Cannot proceed',
        decision: 'abort',
      };

      const msg = agent.testBuildAbortMessage(parsed, state);
      expect(msg).toContain('Cannot proceed');
      expect(msg).toContain('1. convex_crud: ✗');
      expect(msg).toContain('2. convex_crud: ✗');
    });

    it('should use reasoning when finalMessage is not present', () => {
      const state: LoopState = {
        iterations: [],
        currentIteration: 0,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const parsed: ParsedAIResponse = {
        reasoning: 'Cannot complete this task',
        decision: 'abort',
      };

      const msg = agent.testBuildAbortMessage(parsed, state);
      expect(msg).toContain('Cannot complete this task');
      expect(msg).toContain('different approach');
    });
  });

  describe('buildStuckMessage', () => {
    it('should explain retry limit', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            reasoning: 'Attempt 1',
            observation: { success: false, error: 'Same error' }
          },
          {
            iteration: 2,
            timestamp: Date.now(),
            reasoning: 'Attempt 2',
            observation: { success: false, error: 'Same error' }
          },
          {
            iteration: 3,
            timestamp: Date.now(),
            reasoning: 'Attempt 3',
            observation: { success: false, error: 'Same error' }
          },
        ],
        currentIteration: 3,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const msg = agent.testBuildStuckMessage('Same error', state);
      expect(msg).toContain('3 times');
      expect(msg).toContain('Same error');
      expect(msg).toContain('retry limit');
    });

    it('should handle unknown error', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            observation: { success: false }
          }
        ],
        currentIteration: 1,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const msg = agent.testBuildStuckMessage(undefined, state);
      expect(msg).toContain('Unknown error');
    });
  });

  describe('buildMaxIterationsMessage', () => {
    it('should offer alternatives', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            action: { tool: 't1', params: {} },
            observation: { success: false, error: 'Failed' }
          },
          {
            iteration: 2,
            timestamp: Date.now(),
            action: { tool: 't2', params: {} },
            observation: { success: false, error: 'Failed' }
          },
        ],
        currentIteration: 2,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const msg = agent.testBuildMaxIterationsMessage(state);
      expect(msg).toContain('2 iterations');
      expect(msg).toContain('Try a different approach');
      expect(msg).toContain('Break this into smaller steps');
    });

    it('should list all attempts', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            action: { tool: 'tool1', params: {} },
            observation: { success: false, error: 'Error 1' }
          },
          {
            iteration: 2,
            timestamp: Date.now(),
            action: { tool: 'tool2', params: {} },
            observation: { success: true }
          },
          {
            iteration: 3,
            timestamp: Date.now(),
            observation: { success: false }
          },
        ],
        currentIteration: 3,
        consecutiveErrors: new Map(),
        isComplete: false,
      };

      const msg = agent.testBuildMaxIterationsMessage(state);
      expect(msg).toContain('1. tool1: ✗');
      expect(msg).toContain('2. tool2: ✓');
      expect(msg).toContain('3. Analysis:');
    });
  });

  describe('buildExecutionErrorMessage', () => {
    it('should indicate system issue', () => {
      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            observation: { success: false }
          }
        ],
        currentIteration: 1,
        consecutiveErrors: new Map(),
        isComplete: false,
      };
      const error = new Error('Network failure');

      const msg = agent.testBuildExecutionErrorMessage(error, state);
      expect(msg).toContain('Network failure');
      expect(msg).toContain('system issue');
      expect(msg).toContain('try again');
    });

    it('should handle non-Error objects', () => {
      const state: LoopState = {
        iterations: [],
        currentIteration: 0,
        consecutiveErrors: new Map(),
        isComplete: false,
      };
      const error = 'String error';

      const msg = agent.testBuildExecutionErrorMessage(error, state);
      expect(msg).toContain('Unknown error');
      expect(msg).toContain('system issue');
    });

    it('should show attempts made', () => {
      const state: LoopState = {
        iterations: [
          { iteration: 1, timestamp: Date.now(), observation: { success: false } },
          { iteration: 2, timestamp: Date.now(), observation: { success: false } },
          { iteration: 3, timestamp: Date.now(), observation: { success: false } },
        ],
        currentIteration: 3,
        consecutiveErrors: new Map(),
        isComplete: false,
      };
      const error = new Error('Timeout');

      const msg = agent.testBuildExecutionErrorMessage(error, state);
      expect(msg).toContain('**Attempts made:** 3');
    });
  });
});
