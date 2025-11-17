import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAgent, AgentContext, LoopIteration, LoopState } from '../BaseAgent';
import { Tool, ToolResult } from '../../tools';

// Mock concrete agent for testing
class TestAgent extends BaseAgent {
  getSystemPrompt(context: AgentContext) {
    return 'You are a test agent.';
  }
  getIntent() {
    return 'test';
  }
}

describe('Prompt Builders', () => {
  let agent: TestAgent;
  const mockTools: Tool[] = [
    {
      name: 'tool1',
      description: 'Does thing 1',
      execute: async () => ({ success: true, data: {} }),
    },
    {
      name: 'tool2',
      description: 'Does thing 2',
      execute: async () => ({ success: true, data: {} }),
    },
  ];

  beforeEach(() => {
    agent = new TestAgent('test-agent', 'fake-api-key', mockTools);
  });

  describe('buildToolDescriptions', () => {
    it('should format tools correctly', () => {
      const result = (agent as any).buildToolDescriptions();
      expect(result).toContain('- tool1: Does thing 1');
      expect(result).toContain('- tool2: Does thing 2');
    });
  });

  describe('buildConversationContext', () => {
    it('should format recent messages', () => {
      const context: AgentContext = {
        message: 'test',
        recentMessages: [
          { author: { name: 'Alice' }, text: 'Hello' },
          { author: { name: 'Bob' }, text: 'Hi there' },
        ],
        roomId: 'room1',
      };

      const result = (agent as any).buildConversationContext(context);
      expect(result).toContain('Alice: Hello');
      expect(result).toContain('Bob: Hi there');
    });

    it('should include thread context when present', () => {
      const context: AgentContext = {
        message: 'test',
        recentMessages: [
          { author: { name: 'Alice' }, text: 'Hello' },
        ],
        threadContext: [
          { author: 'Charlie', text: 'Original message', isAI: false },
          { author: 'AI', text: 'Response', isAI: true },
        ],
        roomId: 'room1',
      };

      const result = (agent as any).buildConversationContext(context);
      expect(result).toContain('Recent Conversation:');
      expect(result).toContain('Alice: Hello');
      expect(result).toContain('Thread Context:');
      expect(result).toContain('Charlie: Original message');
      expect(result).toContain('AI: Response');
    });

    it('should handle missing author names', () => {
      const context: AgentContext = {
        message: 'test',
        recentMessages: [
          { author: null, text: 'Anonymous message' },
        ],
        roomId: 'room1',
      };

      const result = (agent as any).buildConversationContext(context);
      expect(result).toContain('Unknown: Anonymous message');
    });
  });

  describe('buildIterationSummary', () => {
    it('should format successful iteration', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: true,
            data: { id: '123' },
          },
        },
      ];

      const result = (agent as any).buildIterationSummary(iterations);
      expect(result).toContain('Attempt 1: ✓ Success');
    });

    it('should format failed iteration with error', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: false,
            error: 'Validation failed: category is required',
          },
        },
      ];

      const result = (agent as any).buildIterationSummary(iterations);
      expect(result).toContain('Attempt 1: ✗ Failed: Validation failed: category is required');
    });

    it('should format multiple iterations', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: false,
            error: 'First error',
          },
        },
        {
          iteration: 2,
          timestamp: Date.now(),
          observation: {
            success: false,
            error: 'Second error',
          },
        },
      ];

      const result = (agent as any).buildIterationSummary(iterations);
      expect(result).toContain('Attempt 1: ✗ Failed: First error');
      expect(result).toContain('Attempt 2: ✗ Failed: Second error');
    });

    it('should truncate long error messages', () => {
      const longError = 'This is a very long error message that should be truncated to 60 characters maximum';
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: false,
            error: longError,
          },
        },
      ];

      const result = (agent as any).buildIterationSummary(iterations);
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(longError.length + 50);
    });
  });

  describe('buildSuccessJourney', () => {
    it('should show success on first attempt', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: true,
          },
        },
      ];

      const result = (agent as any).buildSuccessJourney(iterations);
      expect(result).toBe('Success on first attempt ✓');
    });

    it('should show journey for multiple attempts', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: {
            success: false,
            error: 'First attempt failed',
          },
        },
        {
          iteration: 2,
          timestamp: Date.now(),
          observation: {
            success: true,
          },
        },
      ];

      const result = (agent as any).buildSuccessJourney(iterations);
      expect(result).toContain('Attempt 1: ✗ Failed: First attempt failed');
      expect(result).toContain('Attempt 2: ✓ Success');
    });
  });

  describe('buildIterationPrompt', () => {
    const baseParams = {
      systemPrompt: 'You are an agent',
      toolDescriptions: '- tool1: test',
      conversationContext: 'User: hello',
      userMessage: 'Create task',
      previousIterations: [] as LoopIteration[],
      isFirstIteration: true,
      iterationNumber: 1,
      maxIterations: 5,
    };

    it('should create first iteration prompt', () => {
      const prompt = (agent as any).buildIterationPrompt(baseParams);

      expect(prompt).toContain('You are an agent');
      expect(prompt).toContain('Available Tools:');
      expect(prompt).toContain('- tool1: test');
      expect(prompt).toContain('Recent Conversation:');
      expect(prompt).toContain('User: hello');
      expect(prompt).toContain('User Request: Create task');
      expect(prompt).toContain('Iteration 1 of 5');
      expect(prompt).toContain('REASONING:');
      expect(prompt).toContain('ACTION:');
      expect(prompt).toContain('PARAMS:');
      expect(prompt).toContain('COMPLETE:');
      expect(prompt).toContain('ABORT:');
    });

    it('should create retry prompt with error context', () => {
      const prevIteration: LoopIteration = {
        iteration: 1,
        timestamp: Date.now(),
        reasoning: 'Trying to create task',
        action: { tool: 'convex_crud', params: { operation: 'create' } },
        observation: { success: false, error: 'Validation failed' },
      };

      const retryParams = {
        ...baseParams,
        previousIterations: [prevIteration],
        isFirstIteration: false,
        iterationNumber: 2,
      };

      const prompt = (agent as any).buildIterationPrompt(retryParams);

      expect(prompt).toContain('Iteration 2 of 5');
      expect(prompt).toContain('PREVIOUS ATTEMPT SUMMARY');
      expect(prompt).toContain('LAST ATTEMPT (Iteration 1)');
      expect(prompt).toContain('Your reasoning: Trying to create task');
      expect(prompt).toContain('Tool used: convex_crud');
      expect(prompt).toContain('RESULT: FAILED ✗');
      expect(prompt).toContain('Error: Validation failed');
      expect(prompt).toContain('RETRY with DIFFERENT parameters');
    });

    it('should include iteration summary in retry prompt', () => {
      const iterations: LoopIteration[] = [
        {
          iteration: 1,
          timestamp: Date.now(),
          observation: { success: false, error: 'Error 1' },
        },
        {
          iteration: 2,
          timestamp: Date.now(),
          observation: { success: false, error: 'Error 2' },
        },
      ];

      const retryParams = {
        ...baseParams,
        previousIterations: iterations,
        isFirstIteration: false,
        iterationNumber: 3,
      };

      const prompt = (agent as any).buildIterationPrompt(retryParams);

      expect(prompt).toContain('Attempt 1: ✗');
      expect(prompt).toContain('Attempt 2: ✗');
    });
  });

  describe('buildSuccessInterpretationPrompt', () => {
    it('should create success prompt with result details', () => {
      const toolResult: ToolResult = {
        success: true,
        data: { id: '123', title: 'Test Task' },
        metadata: { duration: 150 },
      };

      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            observation: { success: true },
          },
        ],
        currentIteration: 1,
        consecutiveErrors: new Map(),
        isComplete: true,
      };

      const prompt = (agent as any).buildSuccessInterpretationPrompt(
        'convex_crud',
        toolResult,
        state
      );

      expect(prompt).toContain('TOOL EXECUTION SUCCESSFUL ✓');
      expect(prompt).toContain('Tool: convex_crud');
      expect(prompt).toContain('"id": "123"');
      expect(prompt).toContain('"title": "Test Task"');
      expect(prompt).toContain('Duration: 150ms');
      expect(prompt).toContain('JOURNEY TO SUCCESS');
      expect(prompt).toContain('Success on first attempt ✓');
    });

    it('should include journey for multi-iteration success', () => {
      const toolResult: ToolResult = {
        success: true,
        data: { id: '456' },
        metadata: { duration: 200 },
      };

      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            observation: { success: false, error: 'Failed first' },
          },
          {
            iteration: 2,
            timestamp: Date.now(),
            observation: { success: true },
          },
        ],
        currentIteration: 2,
        consecutiveErrors: new Map(),
        isComplete: true,
      };

      const prompt = (agent as any).buildSuccessInterpretationPrompt(
        'test_tool',
        toolResult,
        state
      );

      expect(prompt).toContain('Attempt 1: ✗');
      expect(prompt).toContain('Attempt 2: ✓');
      expect(prompt).toContain('Briefly mentions you had to adjust your approach');
    });

    it('should provide clear instructions for response', () => {
      const toolResult: ToolResult = {
        success: true,
        data: {},
        metadata: { duration: 100 },
      };

      const state: LoopState = {
        iterations: [
          {
            iteration: 1,
            timestamp: Date.now(),
            observation: { success: true },
          },
        ],
        currentIteration: 1,
        consecutiveErrors: new Map(),
        isComplete: true,
      };

      const prompt = (agent as any).buildSuccessInterpretationPrompt(
        'tool',
        toolResult,
        state
      );

      expect(prompt).toContain('Confirms what was accomplished');
      expect(prompt).toContain('Highlights key details');
      expect(prompt).toContain('Suggests relevant next steps');
      expect(prompt).toContain('markdown formatting');
    });
  });
});
