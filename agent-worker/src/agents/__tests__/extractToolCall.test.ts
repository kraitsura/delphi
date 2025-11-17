import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAgent } from '../BaseAgent';
import { Tool } from '../../tools';

// Create a concrete test agent to access the private extractToolCall method
class TestAgent extends BaseAgent {
  getSystemPrompt() {
    return 'You are a test agent.';
  }

  getIntent() {
    return 'test';
  }

  // Expose the private method for testing
  public testExtractToolCall(text: string): string | null {
    return (this as any).extractToolCall(text);
  }
}

describe('extractToolCall', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent('test', 'test-key', []);
  });

  it('should extract nested objects', () => {
    const input = '{"tool":"x","params":{"data":{"cost":{"min":100}}}}';
    const result = agent.testExtractToolCall(input);
    expect(result).toBe(input);
  });

  it('should handle escaped quotes', () => {
    const input = '{"tool":"x","params":{"desc":"A \\"quoted\\" word"}}';
    const result = agent.testExtractToolCall(input);
    expect(result).toBe(input);
  });

  it('should extract from text with surrounding content', () => {
    const input = 'Some text {"tool":"x","params":{}} more text';
    const expected = '{"tool":"x","params":{}}';
    const result = agent.testExtractToolCall(input);
    expect(result).toBe(expected);
  });

  it('should return null for no tool call', () => {
    const input = 'No tool here';
    const result = agent.testExtractToolCall(input);
    expect(result).toBeNull();
  });

  it('should return null for unclosed JSON', () => {
    const input = '{"tool":"x","params":{';
    const result = agent.testExtractToolCall(input);
    expect(result).toBeNull();
  });
});
