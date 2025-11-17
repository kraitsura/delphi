import { BaseAgent, AgentContext } from './BaseAgent';
import { Tool } from '../tools';

/**
 * Simple test agent to verify BaseAgent implementation
 */
export class TestAgent extends BaseAgent {
  constructor(apiKey: string, tools: Tool[] = []) {
    super('TestAgent', apiKey, tools);
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are a helpful test agent. Your job is to respond to user queries in a friendly manner.
Keep responses concise and helpful.`;
  }

  getIntent(): string {
    return 'test';
  }
}
