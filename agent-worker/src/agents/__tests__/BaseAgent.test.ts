import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent, AgentContext, AgentResponse } from '../BaseAgent';
import { Tool, ToolResult } from '../../tools';

/**
 * Test agent for unit testing BaseAgent ReAct loop
 */
class TestAgent extends BaseAgent {
  getSystemPrompt(): string {
    return 'You are a test agent for unit testing.';
  }

  getIntent(): string {
    return 'test';
  }
}

describe('BaseAgent - ReAct Loop', () => {
  let mockTool: Tool;
  let testContext: AgentContext;
  let aiKey: string;

  beforeEach(() => {
    vi.clearAllMocks();

    aiKey = 'test-api-key';

    mockTool = {
      name: 'test_tool',
      description: 'A test tool for testing',
      execute: vi.fn(),
    };

    testContext = {
      message: 'test message',
      recentMessages: [],
      roomId: 'room1',
      eventId: 'event1',
    };
  });

  describe('Success Scenarios', () => {
    it('should succeed on first attempt', async () => {
      // Mock AI responses:
      // 1. First call: AI decides to use tool
      // 2. Second call: AI interprets successful result
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: I will create the task using the test tool.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"value": 1, "name": "test task"}'
        )
        .mockResolvedValueOnce(
          'I successfully created the test task with value 1.'
        );

      // Mock tool success
      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { id: '123', value: 1, name: 'test task' },
        metadata: { duration: 150 },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify response
      expect(result.text).toBe('I successfully created the test task with value 1.');
      expect(result.toolsUsed).toContain('test_tool');

      // Verify metadata
      expect(result.metadata?.totalIterations).toBe(1);
      expect(result.metadata?.wasSuccessful).toBe(true);
      expect(result.metadata?.iterations).toHaveLength(1);

      // Verify iteration details
      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.iteration).toBe(1);
      expect(iteration?.reasoning).toBe('I will create the task using the test tool.');
      expect(iteration?.action?.tool).toBe('test_tool');
      expect(iteration?.action?.params).toEqual({ value: 1, name: 'test task' });
      expect(iteration?.observation?.success).toBe(true);
      expect(iteration?.observation?.data).toEqual({ id: '123', value: 1, name: 'test task' });
      expect(iteration?.decision).toBe('continue');

      // Verify tool was called once
      expect(mockTool.execute).toHaveBeenCalledTimes(1);
      expect(mockTool.execute).toHaveBeenCalledWith({ value: 1, name: 'test task' });

      // Verify AI was called twice (action + interpretation)
      expect(mockCallAI).toHaveBeenCalledTimes(2);
    });

    it('should succeed after retry on validation error', async () => {
      // Mock AI responses:
      // 1. First attempt: Invalid category
      // 2. Second attempt: Fixed category
      // 3. Success interpretation
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Creating task with category.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"category": "invalid_category", "title": "Task"}'
        )
        .mockResolvedValueOnce(
          'REASONING: The category was invalid, I need to use a valid category.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"category": "venue", "title": "Task"}'
        )
        .mockResolvedValueOnce(
          'I successfully created the task after correcting the category.'
        );

      // Mock tool: first call fails validation, second succeeds
      (mockTool.execute as any)
        .mockResolvedValueOnce({
          success: false,
          error: 'Validation failed: invalid_category is not a valid category',
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: '456', category: 'venue', title: 'Task' },
          metadata: { duration: 200 },
        });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify final success
      expect(result.text).toBe('I successfully created the task after correcting the category.');
      expect(result.toolsUsed).toContain('test_tool');

      // Verify metadata
      expect(result.metadata?.totalIterations).toBe(2);
      expect(result.metadata?.wasSuccessful).toBe(true);
      expect(result.metadata?.iterations).toHaveLength(2);

      // Verify first iteration (failure)
      const iteration1 = result.metadata?.iterations?.[0];
      expect(iteration1?.iteration).toBe(1);
      expect(iteration1?.action?.tool).toBe('test_tool');
      expect(iteration1?.action?.params?.category).toBe('invalid_category');
      expect(iteration1?.observation?.success).toBe(false);
      expect(iteration1?.observation?.error).toContain('Validation failed');
      expect(iteration1?.decision).toBe('retry');

      // Verify second iteration (success)
      const iteration2 = result.metadata?.iterations?.[1];
      expect(iteration2?.iteration).toBe(2);
      expect(iteration2?.reasoning).toContain('category was invalid');
      expect(iteration2?.action?.params?.category).toBe('venue');
      expect(iteration2?.observation?.success).toBe(true);
      expect(iteration2?.observation?.data?.id).toBe('456');
      expect(iteration2?.decision).toBe('complete');

      // Verify tool was called twice
      expect(mockTool.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should abort after max consecutive errors (stuck in loop)', async () => {
      // Mock AI keeps making the same mistake
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValue(
          'REASONING: Trying to create task.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"invalid": true}'
        );

      // Mock tool fails with same validation error every time
      (mockTool.execute as any).mockResolvedValue({
        success: false,
        error: 'Validation failed: required field missing',
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify abort
      expect(result.metadata?.wasSuccessful).toBe(false);
      expect(result.metadata?.abortReason).toContain('Stuck in error loop');
      expect(result.metadata?.totalIterations).toBe(3); // Max consecutive errors is 3

      // Verify all iterations failed with same error type
      const iterations = result.metadata?.iterations || [];
      expect(iterations).toHaveLength(3);
      iterations.forEach(iter => {
        expect(iter.observation?.success).toBe(false);
        expect(iter.observation?.error).toContain('Validation failed');
      });

      // Verify user-friendly error message
      expect(result.text).toContain('attempted');
      expect(result.text).toContain('3 times');
      expect(result.text).toContain('same issue');
      expect(result.text).toContain('retry limit');
    });

    it('should handle AI abort decision', async () => {
      // Mock AI decides task is impossible
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: This task requires information I do not have access to.\n' +
          'ABORT: I cannot complete this task because the event ID does not exist in the system.'
        );

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify abort
      expect(result.metadata?.wasSuccessful).toBe(false);
      expect(result.metadata?.abortReason).toContain('event ID does not exist');
      expect(result.metadata?.totalIterations).toBe(1);

      // Verify no tool was called
      expect(mockTool.execute).not.toHaveBeenCalled();

      // Verify iteration recorded decision
      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.decision).toBe('abort');
      expect(iteration?.reasoning).toContain('information I do not have access to');

      // Verify user-friendly message
      expect(result.text).toContain('cannot complete');
      expect(result.text).toContain('event ID does not exist');
    });

    it('should handle max iterations reached', async () => {
      // Mock AI keeps trying different things, all fail
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Trying approach 1.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"approach": 1}'
        )
        .mockResolvedValueOnce(
          'REASONING: Approach 1 failed, trying approach 2.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"approach": 2}'
        )
        .mockResolvedValueOnce(
          'REASONING: Approach 2 failed, trying approach 3.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"approach": 3}'
        )
        .mockResolvedValueOnce(
          'REASONING: Approach 3 failed, trying approach 4.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"approach": 4}'
        )
        .mockResolvedValueOnce(
          'REASONING: Approach 4 failed, trying approach 5.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"approach": 5}'
        );

      // Mock tool fails with different errors each time (not stuck, just can't solve)
      (mockTool.execute as any)
        .mockResolvedValueOnce({ success: false, error: 'Error type A' })
        .mockResolvedValueOnce({ success: false, error: 'Error type B' })
        .mockResolvedValueOnce({ success: false, error: 'Error type C' })
        .mockResolvedValueOnce({ success: false, error: 'Error type D' })
        .mockResolvedValueOnce({ success: false, error: 'Error type E' });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify max iterations reached
      expect(result.metadata?.totalIterations).toBe(5);
      expect(result.metadata?.wasSuccessful).toBe(false);
      expect(result.metadata?.abortReason).toContain('max iterations');

      // Verify all 5 iterations attempted
      expect(result.metadata?.iterations).toHaveLength(5);

      // Verify user-friendly message with alternatives
      expect(result.text).toContain('5 iterations');
      expect(result.text).toMatch(/different approach|smaller steps|learned so far/i);
    });

    it('should handle unknown tool gracefully', async () => {
      // Mock AI requests non-existent tool, then corrects
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Using the special tool.\n' +
          'ACTION: non_existent_tool\n' +
          'PARAMS: {"value": 1}'
        )
        .mockResolvedValueOnce(
          'REASONING: That tool does not exist, I will use test_tool instead.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"value": 1}'
        )
        .mockResolvedValueOnce(
          'Task completed successfully using the correct tool.'
        );

      // Mock tool success
      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { id: '789' },
        metadata: { duration: 100 },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify eventual success
      expect(result.metadata?.wasSuccessful).toBe(true);
      expect(result.metadata?.totalIterations).toBe(2);

      // Verify first iteration has error
      const iteration1 = result.metadata?.iterations?.[0];
      expect(iteration1?.action?.tool).toBe('non_existent_tool');
      expect(iteration1?.observation?.success).toBe(false);
      expect(iteration1?.observation?.error).toContain('Tool not found');
      expect(iteration1?.decision).toBe('retry');

      // Verify second iteration succeeds
      const iteration2 = result.metadata?.iterations?.[1];
      expect(iteration2?.action?.tool).toBe('test_tool');
      expect(iteration2?.observation?.success).toBe(true);
      expect(iteration2?.decision).toBe('complete');

      // Verify only valid tool was executed
      expect(mockTool.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle execution errors gracefully', async () => {
      // Mock AI response
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Executing action.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"value": 1}'
        );

      // Mock tool throws exception
      (mockTool.execute as any).mockRejectedValue(new Error('Network failure'));

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify error is handled
      expect(result.metadata?.wasSuccessful).toBe(false);

      // Verify error message is user-friendly
      expect(result.text).toMatch(/technical error|system issue/i);
      expect(result.text).toContain('Network failure');
    });
  });

  describe('Metadata Tracking', () => {
    it('should track iteration history with all fields', async () => {
      // Mock AI and tool for successful execution
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Creating the resource.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"name": "Resource"}'
        )
        .mockResolvedValueOnce('Resource created successfully.');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { id: 'abc' },
        metadata: { duration: 250 },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify iteration structure
      const iteration = result.metadata?.iterations?.[0];
      expect(iteration).toBeDefined();

      // Check all required fields exist
      expect(iteration?.iteration).toBe(1);
      expect(typeof iteration?.timestamp).toBe('number');
      expect(iteration?.reasoning).toBe('Creating the resource.');
      expect(iteration?.action).toEqual({
        tool: 'test_tool',
        params: { name: 'Resource' },
      });
      expect(iteration?.observation).toEqual({
        success: true,
        data: { id: 'abc' },
        duration: 250,
      });
      expect(iteration?.decision).toBe('continue');

      // Verify timestamp is recent (within last second)
      const now = Date.now();
      expect(iteration?.timestamp).toBeGreaterThan(now - 1000);
      expect(iteration?.timestamp).toBeLessThanOrEqual(now);
    });

    it('should track tools used correctly', async () => {
      const mockTool2: Tool = {
        name: 'second_tool',
        description: 'A second test tool',
        execute: vi.fn(),
      };

      // Mock AI uses two different tools
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: First action.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {}'
        )
        .mockResolvedValueOnce(
          'REASONING: First failed, trying second.\n' +
          'ACTION: second_tool\n' +
          'PARAMS: {}'
        )
        .mockResolvedValueOnce('Completed with second tool.');

      // First tool fails, second succeeds
      (mockTool.execute as any).mockResolvedValue({
        success: false,
        error: 'Tool 1 error',
      });
      (mockTool2.execute as any).mockResolvedValue({
        success: true,
        data: { result: 'success' },
      });

      const agent = new TestAgent('test', aiKey, [mockTool, mockTool2]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify both tools tracked
      expect(result.toolsUsed).toHaveLength(2);
      expect(result.toolsUsed).toContain('test_tool');
      expect(result.toolsUsed).toContain('second_tool');
    });

    it('should deduplicate tools used', async () => {
      // Mock AI uses same tool twice
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: First attempt.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"attempt": 1}'
        )
        .mockResolvedValueOnce(
          'REASONING: Retry with different params.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"attempt": 2}'
        )
        .mockResolvedValueOnce('Completed successfully.');

      // First fails, second succeeds
      (mockTool.execute as any)
        .mockResolvedValueOnce({ success: false, error: 'Error' })
        .mockResolvedValueOnce({ success: true, data: { ok: true } });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Verify tool appears only once in toolsUsed
      expect(result.toolsUsed).toHaveLength(1);
      expect(result.toolsUsed).toEqual(['test_tool']);

      // But both iterations should be tracked
      expect(result.metadata?.iterations).toHaveLength(2);
    });

    it('should set wasSuccessful flag correctly for success', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce('ACTION: test_tool\nPARAMS: {}')
        .mockResolvedValueOnce('Success!');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: {},
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.metadata?.wasSuccessful).toBe(true);
    });

    it('should set wasSuccessful flag correctly for failure', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Cannot proceed.\n' +
          'ABORT: Task is impossible.'
        );

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.metadata?.wasSuccessful).toBe(false);
      expect(result.metadata?.abortReason).toBeDefined();
    });
  });

  describe('ReAct Format Parsing', () => {
    it('should parse REASONING + ACTION + PARAMS format', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: I need to check the database.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"query": "SELECT *", "limit": 10}'
        )
        .mockResolvedValueOnce('Query executed.');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { rows: [] },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.reasoning).toBe('I need to check the database.');
      expect(iteration?.action?.tool).toBe('test_tool');
      expect(iteration?.action?.params).toEqual({ query: 'SELECT *', limit: 10 });
    });

    it('should parse COMPLETE decision', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: I can answer this without tools.\n' +
          'COMPLETE: The answer to your question is 42.'
        );

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.text).toBe('The answer to your question is 42.');
      expect(result.metadata?.wasSuccessful).toBe(true);
      expect(result.metadata?.totalIterations).toBe(1);
      expect(mockTool.execute).not.toHaveBeenCalled();

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.decision).toBe('complete');
      expect(iteration?.reasoning).toBe('I can answer this without tools.');
    });

    it('should parse ABORT decision', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Missing required information.\n' +
          'ABORT: I cannot proceed without the user ID.'
        );

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.text).toContain('cannot proceed without the user ID');
      expect(result.metadata?.wasSuccessful).toBe(false);
      expect(result.metadata?.abortReason).toContain('user ID');
      expect(mockTool.execute).not.toHaveBeenCalled();

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.decision).toBe('abort');
    });

    it('should handle legacy JSON format as fallback', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'I will use the tool: {"tool": "test_tool", "params": {"legacy": true}}'
        )
        .mockResolvedValueOnce('Legacy format worked!');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { ok: true },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.metadata?.wasSuccessful).toBe(true);

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.action?.tool).toBe('test_tool');
      expect(iteration?.action?.params).toEqual({ legacy: true });
    });

    it('should handle multiline PARAMS with nested objects', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Creating complex task.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {\n' +
          '  "title": "Wedding Planning",\n' +
          '  "estimatedCost": {\n' +
          '    "min": 1000,\n' +
          '    "max": 5000\n' +
          '  },\n' +
          '  "vendors": ["photographer", "caterer"]\n' +
          '}'
        )
        .mockResolvedValueOnce('Complex task created.');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { id: 'complex-task' },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.action?.params).toEqual({
        title: 'Wedding Planning',
        estimatedCost: { min: 1000, max: 5000 },
        vendors: ['photographer', 'caterer'],
      });
    });
  });

  describe('Error Classification', () => {
    it('should classify different error types correctly', async () => {
      const errorTypes = [
        { error: 'Validation failed: field required', expectedKey: 'validation_error' },
        { error: 'Unauthorized access', expectedKey: 'auth_error' },
        { error: 'Event not found', expectedKey: 'not_found_error' },
        { error: 'Network timeout occurred', expectedKey: 'network_error' },
        { error: 'JSON parse error', expectedKey: 'json_error' },
        { error: 'Something random happened', expectedKey: 'generic_error' },
      ];

      for (const { error, expectedKey } of errorTypes) {
        const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
          .mockResolvedValueOnce(`ACTION: test_tool\nPARAMS: {}`);

        (mockTool.execute as any).mockResolvedValue({
          success: false,
          error,
        });

        const agent = new TestAgent('test', aiKey, [mockTool]);

        // Access private getErrorKey method for testing
        const errorKey = (agent as any).getErrorKey(error);
        expect(errorKey).toBe(expectedKey);

        vi.clearAllMocks();
      }
    });

    it('should track consecutive errors separately by type', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce('ACTION: test_tool\nPARAMS: {"attempt": 1}')
        .mockResolvedValueOnce('ACTION: test_tool\nPARAMS: {"attempt": 2}')
        .mockResolvedValueOnce('ACTION: test_tool\nPARAMS: {"attempt": 3}');

      // First two are validation errors, third is network error
      (mockTool.execute as any)
        .mockResolvedValueOnce({ success: false, error: 'Validation failed: field required' })
        .mockResolvedValueOnce({ success: false, error: 'Invalid input provided' })
        .mockResolvedValueOnce({ success: false, error: 'Network timeout' });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Should NOT be stuck because third error is different type (resets counter)
      expect(result.metadata?.iterations).toHaveLength(3);

      // Verify different error types in iterations
      const errors = result.metadata?.iterations?.map(i => i.observation?.error) || [];
      expect(errors[0]).toContain('Validation');
      expect(errors[1]).toContain('Invalid');
      expect(errors[2]).toContain('Network');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tools array', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: No tools available.\n' +
          'COMPLETE: I can only provide information based on my knowledge.'
        );

      const agent = new TestAgent('test', aiKey, []); // No tools
      const result: AgentResponse = await agent.handle(testContext);

      expect(result.metadata?.wasSuccessful).toBe(true);
      expect(result.toolsUsed).toHaveLength(0);
    });

    it('should handle malformed AI response gracefully', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce('This is not a proper format at all')
        .mockResolvedValueOnce(
          'REASONING: Correcting my response.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {}'
        )
        .mockResolvedValueOnce('Recovered successfully.');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: {},
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      // Should eventually succeed after AI corrects itself
      expect(result.metadata?.wasSuccessful).toBe(true);
    });

    it('should handle PARAMS with escaped quotes', async () => {
      const mockCallAI = vi.spyOn(TestAgent.prototype as any, 'callAI')
        .mockResolvedValueOnce(
          'REASONING: Creating task with quoted text.\n' +
          'ACTION: test_tool\n' +
          'PARAMS: {"description": "A \\"quoted\\" word here"}'
        )
        .mockResolvedValueOnce('Task created with quoted text.');

      (mockTool.execute as any).mockResolvedValue({
        success: true,
        data: { id: 'quoted-task' },
      });

      const agent = new TestAgent('test', aiKey, [mockTool]);
      const result: AgentResponse = await agent.handle(testContext);

      const iteration = result.metadata?.iterations?.[0];
      expect(iteration?.action?.params?.description).toBe('A "quoted" word here');
    });
  });
});
