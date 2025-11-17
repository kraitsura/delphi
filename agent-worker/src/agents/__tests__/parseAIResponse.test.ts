import { describe, it, expect } from 'vitest';
import { BaseAgent, AgentContext, AgentResponse, ParsedAIResponse } from '../BaseAgent';

// Mock concrete agent for testing
class TestAgent extends BaseAgent {
  getSystemPrompt(context: AgentContext): string {
    return 'You are a test agent.';
  }

  getIntent(): string {
    return 'test';
  }

  // Expose the private parseAIResponse method for testing
  public testParseAIResponse(response: string): ParsedAIResponse {
    return (this as any).parseAIResponse(response);
  }
}

describe('parseAIResponse', () => {
  const agent = new TestAgent('test', 'dummy-key', []);

  it('should parse ACTION + PARAMS', () => {
    const response = `REASONING: Creating task
ACTION: convex_crud
PARAMS: {"operation": "create"}`;

    const parsed = agent.testParseAIResponse(response);
    expect(parsed.reasoning).toBe('Creating task');
    expect(parsed.action?.tool).toBe('convex_crud');
    expect(parsed.action?.params).toEqual({ operation: 'create' });
    expect(parsed.decision).toBe('continue');
  });

  it('should parse COMPLETE', () => {
    const response = `REASONING: Task done
COMPLETE: I've created the task successfully`;

    const parsed = agent.testParseAIResponse(response);
    expect(parsed.decision).toBe('complete');
    expect(parsed.finalMessage).toBe("I've created the task successfully");
  });

  it('should parse ABORT', () => {
    const response = `REASONING: Cannot proceed
ABORT: Event ID not found`;

    const parsed = agent.testParseAIResponse(response);
    expect(parsed.decision).toBe('abort');
    expect(parsed.finalMessage).toBe('Event ID not found');
  });

  it('should fallback to legacy JSON format', () => {
    const response = 'Here is the tool call: {"tool":"test","params":{"value":1}}';

    const parsed = agent.testParseAIResponse(response);
    expect(parsed.action?.tool).toBe('test');
    expect(parsed.action?.params).toEqual({ value: 1 });
    expect(parsed.decision).toBe('continue');
  });
});
