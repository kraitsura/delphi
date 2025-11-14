# Delphi Phase 2: Agent Orchestration & Tool System
## Multi-Agent Architecture with Message Threading

**Version:** 1.0
**Phase:** 2 - Agent Infrastructure
**Timeline:** 2-3 days (Hackathon Mode)
**Last Updated:** November 14, 2025
**Status:** Ready to Implement

---

## Table of Contents

1. [Phase 2 Overview](#phase-2-overview)
2. [Architecture Decision](#architecture-decision)
3. [Message Threading & Replies](#message-threading--replies)
4. [Tool System Framework](#tool-system-framework)
5. [Specialized Agents](#specialized-agents)
6. [Agent Router Implementation](#agent-router-implementation)
7. [Frontend Integration](#frontend-integration)
8. [Testing Strategy](#testing-strategy)
9. [Demo Script](#demo-script)
10. [Phase 2 Success Criteria](#phase-2-success-criteria)

---

## Phase 2 Overview

### Objectives

Transform the current general-purpose ChatOrchestratorDO into a **multi-agent orchestration system** with:

1. ✅ **Message Threading** - Reply to specific messages to maintain conversation context
2. ✅ **Tool System** - Reusable tools (CRUD, Firecrawl, Calculator) for all agents
3. ✅ **Specialized Agents** - TaskAgent, BudgetAgent, VendorAgent, EventAgent
4. ✅ **Intent Routing** - Simple keyword-based routing (no LLM needed)
5. ✅ **Rich Responses** - Structured data from agents (tasks, budgets, vendors)

### What We're NOT Building (Phase 3+)

❌ **Pattern Detection Engine** - Defer automatic intent detection
❌ **DO Persistence/Checkpointing** - Keep it simple for now
❌ **Multi-DO Coordination** - Single DO per room is fine
❌ **Advanced Context Assembly** - Basic 10-message context is enough

### Why This Approach

**For Hackathon Judges:**
- "Our AI TaskAgent extracted 10 tasks with cost estimates" > "We have checkpoints"
- "VendorAgent searched web and found 5 florists" > "We have persistence"
- **Demo-able features** beat **infrastructure improvements**

### Phase 2 Architecture

```
User: "@Delphi find me photographers" (with optional reply to previous message)
    ↓
Frontend: Sends message with parentMessageId (for threading)
    ↓
Worker: Validates auth, routes to ChatOrchestratorDO
    ↓
ChatOrchestratorDO:
    1. Detects intent: "vendor_search" (keywords: find, photographers)
    2. Routes to VendorAgent
    3. VendorAgent uses Firecrawl tool to search web
    4. Returns structured vendor list
    ↓
Worker: Saves response with threadId
    ↓
Frontend: Shows AI response with "Reply" button
```

---

## Architecture Decision

### Routing Pattern (Not Separate DOs)

**Decision:** Keep all agents in ChatOrchestratorDO, use **routing functions** instead of separate Durable Objects.

**Rationale:**
- ✅ **Faster to build** - No DO lifecycle management complexity
- ✅ **Easier to debug** - All logs in one place
- ✅ **Shared context** - Agents can reference each other's work
- ✅ **Lower latency** - No DO-to-DO communication overhead

**Implementation:**
```typescript
class ChatOrchestratorDO {
  private agents: Map<string, BaseAgent>;

  constructor(state, env) {
    // Initialize agents with shared tools
    this.agents = new Map([
      ['task', new TaskAgent(env.CLAUDE_API_KEY, this.getTools())],
      ['budget', new BudgetAgent(env.CLAUDE_API_KEY, this.getTools())],
      ['vendor', new VendorAgent(env.CLAUDE_API_KEY, this.getTools())],
      ['event', new EventAgent(env.CLAUDE_API_KEY, this.getTools())]
    ]);
  }

  async handleAgentInvoke(body) {
    const intent = this.detectIntent(body.message);
    const agent = this.agents.get(intent) || this.agents.get('general');

    const response = await agent.handle({
      message: body.message,
      threadId: body.parentMessageId, // For replies
      context: await this.assembleContext(body)
    });

    return response;
  }
}
```

### When to Separate into DOs (Phase 3+)

Only if we need:
- **State isolation** - Each agent needs independent memory limits
- **Concurrent processing** - Multiple agents working on different tasks simultaneously
- **Scale** - 1000+ concurrent room orchestrators

For hackathon: **Routing pattern is perfect**.

---

## Message Threading & Replies

### User Story

**Scenario 1: Reply to AI Response**
```
User: "@Delphi what should we do first?"
Delphi: "I recommend booking your venue. Here are 3 options..."
User: [Clicks Reply on Delphi's message] "tell me more about option 2"
Delphi: [Responds with context of option 2 from previous message]
```

**Scenario 2: Reply to User Message**
```
Sarah: "I think we should spend $5000 on catering"
John: [Replies to Sarah] "@Delphi is that a reasonable budget?"
Delphi: [References Sarah's $5000 mention in response]
```

**Scenario 3: Thread Visualization**
```
Sarah: "What's our total budget?"
  └─ Delphi: "Your total budget is $40,000..."
      └─ John: "Can we see the breakdown?"
          └─ Delphi: "Sure! Here's the breakdown by category..."
```

### Schema Changes

**Extend messages table in Convex:**

```typescript
// web/convex/schema.ts
messages: defineTable({
  // ... existing fields ...

  // NEW: Threading support
  parentMessageId: v.optional(v.id("messages")),
  threadId: v.optional(v.string()), // Root message ID of thread
  replyCount: v.optional(v.number()), // How many replies this message has

  // NEW: Enhanced AI metadata
  aiMetadata: v.optional(v.object({
    intent: v.string(), // task_creation, vendor_search, budget_analysis, etc.
    confidence: v.number(),
    agentType: v.string(), // TaskAgent, VendorAgent, etc.
    toolsUsed: v.array(v.string()), // ["convex_crud", "firecrawl"]
    structuredData: v.any(), // Task objects, vendor cards, budget breakdowns
  })),
})
  .index("by_thread", ["threadId", "createdAt"])
  .index("by_parent", ["parentMessageId", "createdAt"])
```

### Frontend Component

**File:** `web/src/components/messages/message-item.tsx`

Add reply functionality:

```typescript
interface MessageItemProps {
  message: Message;
  onReply: (message: Message) => void;
  onAgentInvoke?: (text: string, parentMessageId?: string) => void;
}

export function MessageItem({ message, onReply, onAgentInvoke }: MessageItemProps) {
  // ... existing code ...

  return (
    <div className="message-item">
      {/* Show thread indicator if this is a reply */}
      {message.parentMessageId && (
        <div className="thread-indicator">
          <ReplyIcon size={12} />
          <span>Reply to {parentMessage?.author?.name}</span>
        </div>
      )}

      {/* Message content */}
      <ChatBubble message={message} />

      {/* Action buttons */}
      <div className="message-actions">
        <button
          onClick={() => onReply(message)}
          className="action-btn"
        >
          <ReplyIcon size={16} />
          Reply
        </button>

        {/* Show "Ask Delphi" button for user messages */}
        {!message.isAIGenerated && (
          <button
            onClick={() => onAgentInvoke?.(`@Delphi ${message.text}`, message._id)}
            className="action-btn"
          >
            <SparklesIcon size={16} />
            Ask Delphi
          </button>
        )}
      </div>

      {/* Show reply count if has replies */}
      {message.replyCount && message.replyCount > 0 && (
        <button
          onClick={() => showThread(message._id)}
          className="thread-summary"
        >
          {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}
    </div>
  );
}
```

### Message Input with Reply Context

**File:** `web/src/components/messages/message-input.tsx`

Add reply context display:

```typescript
export function MessageInput({
  onSend,
  onAgentInvoke,
  isAgentInvoking
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Listen for reply events
  useEffect(() => {
    const handleReply = (event: CustomEvent) => {
      setReplyingTo(event.detail.message);
    };

    window.addEventListener('message:reply', handleReply);
    return () => window.removeEventListener('message:reply', handleReply);
  }, []);

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const mentionsDelphi = /@delphi/i.test(trimmedText);

    if (mentionsDelphi && onAgentInvoke) {
      setText('');
      await onAgentInvoke(trimmedText, replyingTo?._id);
      setReplyingTo(null);
    } else {
      onSend(trimmedText, replyingTo?._id);
      setText('');
      setReplyingTo(null);
    }
  };

  return (
    <div className="message-input-container">
      {/* Reply context banner */}
      {replyingTo && (
        <div className="reply-context">
          <ReplyIcon size={14} />
          <span>Replying to {replyingTo.author?.name}</span>
          <p className="reply-preview">{replyingTo.text.substring(0, 50)}...</p>
          <button onClick={() => setReplyingTo(null)}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Input field */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          replyingTo
            ? "Type your reply..."
            : "Message or @Delphi to ask AI"
        }
        className={mentionsDelphi ? "border-purple-300" : ""}
      />

      {/* Loading indicator */}
      {isAgentInvoking && (
        <div className="loading">
          <SparklesIcon className="animate-pulse" />
          Delphi is thinking...
        </div>
      )}

      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### Convex Mutations

**File:** `web/convex/messages.ts`

Update send mutation:

```typescript
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
    parentMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Determine threadId
    let threadId = null;
    if (args.parentMessageId) {
      const parentMsg = await ctx.db.get(args.parentMessageId);
      threadId = parentMsg?.threadId || args.parentMessageId;

      // Increment reply count on parent
      await ctx.db.patch(args.parentMessageId, {
        replyCount: (parentMsg?.replyCount || 0) + 1
      });
    }

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: user._id,
      text: args.text,
      createdAt: Date.now(),
      isAIGenerated: false,
      parentMessageId: args.parentMessageId,
      threadId,
      replyCount: 0,
    });

    return messageId;
  }
});
```

### Agent Context Assembly with Threading

**File:** `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

Fetch thread context:

```typescript
private async assembleContext(body: any, convex: ConvexHttpClient) {
  // Fetch recent messages (existing)
  const recentMessages = await convex.query(api.messages.listByRoom, {
    roomId: body.roomId,
    limit: 10,
  });

  // If replying to a message, fetch full thread
  let threadContext = null;
  if (body.parentMessageId) {
    const threadMessages = await convex.query(api.messages.getThread, {
      messageId: body.parentMessageId,
    });

    threadContext = threadMessages.map(msg => ({
      author: msg.author?.name || 'Unknown',
      text: msg.text,
      isAI: msg.isAIGenerated,
    }));
  }

  return {
    recentMessages,
    threadContext, // Focused context for this reply
    eventId: body.eventId,
    roomId: body.roomId,
  };
}
```

---

## Tool System Framework

### Tool Interface

**File:** `agent-worker/src/tools/index.ts`

```typescript
export interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    source?: string;
    cached?: boolean;
  };
}

export interface ToolContext {
  convexUrl: string;
  authToken: string;
  roomId: string;
  eventId?: string;
  userId: string;
}
```

### 1. Convex CRUD Tool

**File:** `agent-worker/src/tools/ConvexCRUDTool.ts`

```typescript
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../web/convex/_generated/api';
import { Tool, ToolResult, ToolContext } from './index';

export class ConvexCRUDTool implements Tool {
  name = 'convex_crud';
  description = 'Create, read, update, delete data in Convex database (tasks, expenses, etc.)';

  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  async execute(params: {
    operation: 'create' | 'read' | 'update' | 'delete';
    table: 'tasks' | 'expenses' | 'vendors' | 'events';
    data: any;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const convex = new ConvexHttpClient(this.context.convexUrl);
      convex.setAuth(this.context.authToken);

      let result;

      switch (params.operation) {
        case 'create':
          result = await this.create(convex, params.table, params.data);
          break;
        case 'read':
          result = await this.read(convex, params.table, params.data);
          break;
        case 'update':
          result = await this.update(convex, params.table, params.data);
          break;
        case 'delete':
          result = await this.delete(convex, params.table, params.data);
          break;
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          source: 'convex',
        }
      };

    } catch (error) {
      console.error('[ConvexCRUDTool Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
        }
      };
    }
  }

  private async create(convex: ConvexHttpClient, table: string, data: any) {
    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.create, {
          ...data,
          roomId: this.context.roomId,
          eventId: this.context.eventId,
          createdBy: this.context.userId,
        });

      case 'expenses':
        return await convex.mutation(api.expenses.create, {
          ...data,
          roomId: this.context.roomId,
          eventId: this.context.eventId,
          createdBy: this.context.userId,
        });

      case 'vendors':
        return await convex.mutation(api.vendors.create, {
          ...data,
          roomId: this.context.roomId,
          eventId: this.context.eventId,
        });

      default:
        throw new Error(`Unsupported table for create: ${table}`);
    }
  }

  private async read(convex: ConvexHttpClient, table: string, data: any) {
    switch (table) {
      case 'tasks':
        return await convex.query(api.tasks.listByRoom, {
          roomId: this.context.roomId,
          ...data
        });

      case 'expenses':
        return await convex.query(api.expenses.listByEvent, {
          eventId: this.context.eventId!,
          ...data
        });

      case 'vendors':
        return await convex.query(api.vendors.listByRoom, {
          roomId: this.context.roomId,
          ...data
        });

      default:
        throw new Error(`Unsupported table for read: ${table}`);
    }
  }

  private async update(convex: ConvexHttpClient, table: string, data: any) {
    const { id, ...updates } = data;

    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.update, {
          taskId: id,
          ...updates
        });

      case 'expenses':
        return await convex.mutation(api.expenses.update, {
          expenseId: id,
          ...updates
        });

      default:
        throw new Error(`Unsupported table for update: ${table}`);
    }
  }

  private async delete(convex: ConvexHttpClient, table: string, data: any) {
    switch (table) {
      case 'tasks':
        return await convex.mutation(api.tasks.delete, {
          taskId: data.id
        });

      case 'expenses':
        return await convex.mutation(api.expenses.delete, {
          expenseId: data.id
        });

      default:
        throw new Error(`Unsupported table for delete: ${table}`);
    }
  }
}
```

### 2. Firecrawl Web Tool

**File:** `agent-worker/src/tools/FirecrawlTool.ts`

```typescript
import { Tool, ToolResult } from './index';

export class FirecrawlTool implements Tool {
  name = 'web_search';
  description = 'Search and scrape web content (vendor websites, reviews, etc.)';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async execute(params: {
    query?: string;
    url?: string;
    maxResults?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (params.url) {
        // Scrape specific URL
        return await this.scrapeUrl(params.url);
      } else if (params.query) {
        // Search and scrape multiple results
        return await this.searchAndScrape(params.query, params.maxResults || 5);
      } else {
        throw new Error('Either url or query must be provided');
      }
    } catch (error) {
      console.error('[FirecrawlTool Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
        }
      };
    }
  }

  private async scrapeUrl(url: string): Promise<ToolResult> {
    const startTime = Date.now();

    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        url,
        markdown: data.data.markdown,
        html: data.data.html,
        metadata: data.data.metadata,
      },
      metadata: {
        duration: Date.now() - startTime,
        source: 'firecrawl',
      }
    };
  }

  private async searchAndScrape(query: string, maxResults: number): Promise<ToolResult> {
    const startTime = Date.now();

    // Use Firecrawl's search endpoint (if available) or Google Custom Search
    const response = await fetch('https://api.firecrawl.dev/v0/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl search error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        query,
        results: data.data.results,
        count: data.data.results.length,
      },
      metadata: {
        duration: Date.now() - startTime,
        source: 'firecrawl',
      }
    };
  }
}
```

### 3. Calculator Tool

**File:** `agent-worker/src/tools/CalculatorTool.ts`

```typescript
import { Tool, ToolResult } from './index';

export class CalculatorTool implements Tool {
  name = 'calculate';
  description = 'Perform mathematical calculations (budget splits, totals, percentages, etc.)';

  async execute(params: {
    operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'percentage' | 'split' | 'evaluate';
    values?: number[];
    expression?: string;
    splitAmount?: number;
    splitCount?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      let result;

      switch (params.operation) {
        case 'add':
          result = this.add(params.values!);
          break;
        case 'subtract':
          result = this.subtract(params.values!);
          break;
        case 'multiply':
          result = this.multiply(params.values!);
          break;
        case 'divide':
          result = this.divide(params.values!);
          break;
        case 'percentage':
          result = this.percentage(params.values![0], params.values![1]);
          break;
        case 'split':
          result = this.split(params.splitAmount!, params.splitCount!);
          break;
        case 'evaluate':
          result = this.evaluate(params.expression!);
          break;
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        }
      };

    } catch (error) {
      console.error('[CalculatorTool Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
        }
      };
    }
  }

  private add(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0);
  }

  private subtract(values: number[]): number {
    return values.reduce((diff, val, i) => i === 0 ? val : diff - val, 0);
  }

  private multiply(values: number[]): number {
    return values.reduce((product, val) => product * val, 1);
  }

  private divide(values: number[]): number {
    if (values.length !== 2) throw new Error('Divide requires exactly 2 values');
    if (values[1] === 0) throw new Error('Cannot divide by zero');
    return values[0] / values[1];
  }

  private percentage(value: number, percent: number): number {
    return (value * percent) / 100;
  }

  private split(amount: number, count: number): { perPerson: number; remainder: number } {
    const perPerson = Math.floor((amount / count) * 100) / 100; // Round to 2 decimals
    const remainder = amount - (perPerson * count);

    return {
      perPerson,
      remainder: Math.round(remainder * 100) / 100,
    };
  }

  private evaluate(expression: string): number {
    // Safe math expression evaluator (no eval!)
    // Use a library like math.js or implement simple parser
    // For hackathon: basic implementation
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

    // Warning: In production, use a proper math expression parser
    // For hackathon demo, this is acceptable
    return Function(`'use strict'; return (${sanitized})`)();
  }
}
```

---

## Specialized Agents

### Base Agent Class

**File:** `agent-worker/src/agents/BaseAgent.ts`

```typescript
import { Tool, ToolResult } from '../tools';

export interface AgentContext {
  message: string;
  threadContext?: Array<{ author: string; text: string; isAI: boolean }>;
  recentMessages: any[];
  eventContext?: any;
  roomId: string;
  eventId?: string;
}

export interface AgentResponse {
  text: string;
  intent: string;
  confidence: number;
  toolsUsed: string[];
  structuredData?: any;
  suggestions?: string[];
}

export abstract class BaseAgent {
  protected tools: Map<string, Tool>;
  protected aiKey: string;
  protected agentType: string;

  constructor(agentType: string, aiKey: string, tools: Tool[]) {
    this.agentType = agentType;
    this.aiKey = aiKey;
    this.tools = new Map(tools.map(t => [t.name, t]));
  }

  abstract getSystemPrompt(context: AgentContext): string;
  abstract getIntent(): string;

  async handle(context: AgentContext): Promise<AgentResponse> {
    console.log(`[${this.agentType}] Handling request`);

    const systemPrompt = this.getSystemPrompt(context);
    const toolsUsed: string[] = [];

    // Build tool descriptions for AI
    const toolDescriptions = Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

Available Tools:
${toolDescriptions}

Recent Conversation:
${context.recentMessages.map(m => `${m.author?.name || 'Unknown'}: ${m.text}`).join('\n')}

${context.threadContext ? `
Thread Context (conversation being replied to):
${context.threadContext.map(m => `${m.author}: ${m.text}`).join('\n')}
` : ''}

User Request: ${context.message}

Instructions:
1. Analyze the request and determine which tool(s) to use
2. If using tools, respond with JSON: {"tool": "tool_name", "params": {...}}
3. After tool execution, provide a natural language response
4. Format response with markdown for better readability

Response:`;

    // Call AI
    let aiResponse = await this.callAI(fullPrompt);

    // Check if AI wants to use a tool
    if (aiResponse.includes('{"tool":')) {
      const toolCallMatch = aiResponse.match(/\{"tool":[^}]+\}/);
      if (toolCallMatch) {
        const toolCall = JSON.parse(toolCallMatch[0]);
        const tool = this.tools.get(toolCall.tool);

        if (tool) {
          console.log(`[${this.agentType}] Using tool: ${toolCall.tool}`);
          const toolResult = await tool.execute(toolCall.params);
          toolsUsed.push(toolCall.tool);

          // Ask AI to interpret tool results
          const interpretPrompt = `Tool "${toolCall.tool}" returned:
${JSON.stringify(toolResult.data, null, 2)}

Please provide a natural language response to the user based on this data.
Be specific and actionable.`;

          aiResponse = await this.callAI(interpretPrompt);

          // Return with structured data
          return {
            text: aiResponse,
            intent: this.getIntent(),
            confidence: 0.9,
            toolsUsed,
            structuredData: toolResult.data,
          };
        }
      }
    }

    // No tool use, return AI response directly
    return {
      text: aiResponse,
      intent: this.getIntent(),
      confidence: 0.8,
      toolsUsed,
    };
  }

  protected async callAI(prompt: string): Promise<string> {
    // Use Claude Haiku 4.5 (same as ChatOrchestratorDO)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.aiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}
```

### 1. Task Agent

**File:** `agent-worker/src/agents/TaskAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';

export class TaskAgent extends BaseAgent {
  constructor(aiKey: string, tools: any[]) {
    super('TaskAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'task_creation';
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are the Task Manager agent for Delphi event planning.

Your role: Extract actionable tasks from user messages and create them in the system with rich context.

When users mention commitments like:
- "we need to book a photographer"
- "should hire a caterer"
- "I'll handle the invitations"

You should use the convex_crud tool to create tasks with:
- title: Clear, concise task name (e.g., "Book Wedding Photographer")
- description: Context from conversation
- category: photography/catering/venue/music/decor/etc
- deadline: Inferred from event date and typical lead times
- estimatedCost: { min, max } based on industry standards
- priority: high/medium/low based on urgency
- assignee: If mentioned with @name

Event Context:
${context.eventContext ? JSON.stringify(context.eventContext, null, 2) : 'No event context available'}

Be proactive but always explain your reasoning.
Format your final response with:
1. Summary of task created
2. Why this deadline was chosen
3. Cost estimate explanation
4. Suggested next steps`;
  }
}
```

### 2. Budget Agent

**File:** `agent-worker/src/agents/BudgetAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';

export class BudgetAgent extends BaseAgent {
  constructor(aiKey: string, tools: any[]) {
    super('BudgetAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'budget_tracking';
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are the Budget Tracker agent for Delphi event planning.

Your role: Track expenses, calculate splits, monitor budget, and provide financial insights.

When users mention money:
- "$500 for flowers"
- "paid 2000 for venue deposit"
- "split the catering cost 4 ways"

You should:
1. Use convex_crud tool to create/read expense records
2. Use calculate tool for splits and totals
3. Alert if approaching or over budget
4. Suggest fair splits among participants

Event Budget Context:
${context.eventContext ? JSON.stringify(context.eventContext, null, 2) : 'No budget context available'}

Be precise with numbers and categorization.
Always show calculations step-by-step.
Format currency as $X,XXX.XX

Your response should include:
1. Expense recorded (category, amount, payer)
2. Updated budget totals
3. Percentage of budget used
4. Warnings if over budget
5. Fair split breakdown if applicable`;
  }
}
```

### 3. Vendor Agent

**File:** `agent-worker/src/agents/VendorAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';

export class VendorAgent extends BaseAgent {
  constructor(aiKey: string, tools: any[]) {
    super('VendorAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'vendor_search';
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are the Vendor Coordinator agent for Delphi event planning.

Your role: Find vendors, research options, and help users make informed decisions.

When users ask about vendors:
- "find me photographers in Brooklyn"
- "need a florist for June wedding"
- "what are good caterers in San Francisco"

You should:
1. Use web_search tool (Firecrawl) to find local vendors
2. Extract: business name, contact info, pricing, reviews, specialties
3. Use convex_crud tool to save vendor details
4. Provide 3-5 top options with pros/cons

Search Strategy:
- Query: "[vendor type] in [location] [event type]"
- Sites to check: The Knot, WeddingWire, Yelp, Google Reviews
- Focus on: ratings 4.0+, active businesses, clear pricing

Event Context:
Location: ${context.eventContext?.location || 'Not specified'}
Date: ${context.eventContext?.date || 'Not specified'}
Budget: ${context.eventContext?.budget || 'Not specified'}

Format your response as:
1. Search summary (what you looked for)
2. Top 3-5 vendors as structured list:
   - **[Name]** - [Price Range]
     - Rating: X/5 (Y reviews)
     - Specialty: [What they're known for]
     - Contact: [Website/Phone]
     - Pros: [2-3 strengths]
     - Cons: [1-2 weaknesses if any]
3. Overall recommendation
4. Next steps (schedule consultations, request quotes)`;
  }
}
```

### 4. Event Coordinator Agent

**File:** `agent-worker/src/agents/EventAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';

export class EventAgent extends BaseAgent {
  constructor(aiKey: string, tools: any[]) {
    super('EventAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'event_planning';
  }

  getSystemPrompt(context: AgentContext): string {
    return `You are the Event Coordinator agent for Delphi event planning.

Your role: High-level planning, timeline management, strategic guidance.

You handle questions about:
- "what should we do first?"
- "are we on track for June wedding?"
- "what's the critical path?"
- "how do we prioritize tasks?"

You should:
1. Use convex_crud tool to read all tasks, expenses, timeline
2. Analyze overall event status
3. Identify bottlenecks and dependencies
4. Provide strategic recommendations

Event Context:
${context.eventContext ? JSON.stringify(context.eventContext, null, 2) : 'No event context available'}

Analysis Framework:
1. **Timeline Status**: Days until event, completion percentage
2. **Critical Path**: Tasks that block others
3. **Budget Status**: Spent vs allocated vs remaining
4. **Risk Assessment**: Overdue tasks, budget overruns
5. **Next Priorities**: Top 3-5 actions needed now

Format your response as:
1. Current Status Summary
2. Critical Issues (if any)
3. Recommended Next Steps (prioritized)
4. Timeline Guidance
5. Encouraging message (event planning is stressful!)`;
  }
}
```

---

## Agent Router Implementation

### Intent Detection (Simple Keywords)

**File:** `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

Update the DO to include agent routing:

```typescript
import { TaskAgent } from '../agents/TaskAgent';
import { BudgetAgent } from '../agents/BudgetAgent';
import { VendorAgent } from '../agents/VendorAgent';
import { EventAgent } from '../agents/EventAgent';
import { ConvexCRUDTool } from '../tools/ConvexCRUDTool';
import { FirecrawlTool } from '../tools/FirecrawlTool';
import { CalculatorTool } from '../tools/CalculatorTool';
import { ToolContext } from '../tools';

export class ChatOrchestratorDO {
  // ... existing fields ...
  private agents: Map<string, BaseAgent> | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  private initializeAgents(toolContext: ToolContext) {
    if (this.agents) return; // Already initialized

    // Initialize tools
    const convexTool = new ConvexCRUDTool(toolContext);
    const webTool = new FirecrawlTool(this.env.FIRECRAWL_API_KEY);
    const calcTool = new CalculatorTool();

    // Initialize agents with appropriate tools
    this.agents = new Map([
      ['task', new TaskAgent(this.env.CLAUDE_API_KEY, [convexTool, calcTool])],
      ['budget', new BudgetAgent(this.env.CLAUDE_API_KEY, [convexTool, calcTool])],
      ['vendor', new VendorAgent(this.env.CLAUDE_API_KEY, [webTool, convexTool])],
      ['event', new EventAgent(this.env.CLAUDE_API_KEY, [convexTool])],
    ]);

    console.log('[DO] Initialized 4 specialized agents');
  }

  private detectIntent(message: string): string {
    const lower = message.toLowerCase();

    // Task-related keywords
    if (/\b(task|todo|need to|should|have to|must|create|add|assign)\b/i.test(lower)) {
      return 'task';
    }

    // Budget-related keywords
    if (/\b(cost|price|budget|expense|paid|spend|split|\$|money|payment)\b/i.test(lower)) {
      return 'budget';
    }

    // Vendor-related keywords
    if (/\b(vendor|photographer|caterer|florist|venue|hire|book|find|search|dj|band)\b/i.test(lower)) {
      return 'vendor';
    }

    // Event planning keywords
    if (/\b(plan|timeline|schedule|priority|status|track|progress|what next|should we|first)\b/i.test(lower)) {
      return 'event';
    }

    // Default to event coordinator for general questions
    return 'event';
  }

  private async handleAgentInvoke(body: any): Promise<Response> {
    const {
      roomId,
      eventId,
      message,
      parentMessageId, // For threading
      convexUrl,
      authToken,
      userId,
    } = body;

    console.log(`[DO] Processing agent request for room: ${roomId}`);
    if (parentMessageId) {
      console.log(`[DO] Reply to message: ${parentMessageId}`);
    }

    try {
      // Create authenticated Convex client
      const convex = new ConvexHttpClient(convexUrl);
      convex.setAuth(authToken);

      // Initialize agents if needed
      const toolContext: ToolContext = {
        convexUrl,
        authToken,
        roomId,
        eventId,
        userId,
      };
      this.initializeAgents(toolContext);

      // Fetch recent messages
      const recentMessages = await convex.query(api.messages.listByRoom, {
        roomId: roomId as any,
        limit: 10,
      });

      // Fetch thread context if replying
      let threadContext = null;
      if (parentMessageId) {
        const threadMessages = await convex.query(api.messages.getThread, {
          messageId: parentMessageId as any,
        });

        threadContext = threadMessages.map((msg: any) => ({
          author: msg.author?.name || 'Unknown',
          text: msg.text,
          isAI: msg.isAIGenerated,
        }));
      }

      // Fetch event context
      let eventContext = null;
      if (eventId) {
        eventContext = await convex.query(api.events.get, {
          eventId: eventId as any,
        });
      }

      // Detect intent and route to agent
      const intent = this.detectIntent(message);
      const agent = this.agents!.get(intent) || this.agents!.get('event');

      console.log(`[DO] Routing to ${intent} agent`);

      // Call agent
      const agentResponse = await agent!.handle({
        message,
        threadContext,
        recentMessages,
        eventContext,
        roomId,
        eventId,
      });

      console.log(`[DO] Agent response generated (${agentResponse.text.length} chars)`);

      return new Response(JSON.stringify({
        success: true,
        response: agentResponse.text,
        metadata: {
          intent: agentResponse.intent,
          confidence: agentResponse.confidence,
          toolsUsed: agentResponse.toolsUsed,
          structuredData: agentResponse.structuredData,
          agentType: intent,
        },
        roomId: this.roomId,
        timestamp: Date.now(),
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[DO] Error during agent invocation:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I encountered an error while processing your request. Please try again.",
        roomId: this.roomId,
        timestamp: Date.now(),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
```

---

## Frontend Integration

### Convex Queries for Threading

**File:** `web/convex/messages.ts`

Add thread queries:

```typescript
export const getThread = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Get root message
    const rootId = message.threadId || args.messageId;

    // Get all messages in thread
    const threadMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", rootId))
      .order("asc")
      .collect();

    // Include root message if not in thread
    if (!message.threadId) {
      threadMessages.unshift(message);
    }

    // Enrich with author info
    const enriched = await Promise.all(
      threadMessages.map(async (msg) => {
        const author = msg.authorId === 'agent'
          ? { _id: 'agent', name: 'Delphi' }
          : await ctx.db.get(msg.authorId);

        return {
          ...msg,
          author,
        };
      })
    );

    return enriched;
  }
});
```

### Update Agent Invocation Hook

**File:** `web/src/hooks/useAgentInvoke.ts`

Add threading support:

```typescript
export function useAgentInvoke() {
  const [isInvoking, setIsInvoking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const invoke = useCallback(async ({
    roomId,
    eventId,
    message,
    parentMessageId // NEW: for threading
  }: {
    roomId: string;
    eventId?: string;
    message: string;
    parentMessageId?: string;
  }) => {
    setIsInvoking(true);
    setError(null);

    try {
      // Get auth token
      const { data } = await authClient.convex.token();
      const token = data?.token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Clean @Delphi mention
      const cleanMessage = message.replace(/@delphi\s*/gi, '').trim();

      // Call Worker
      const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
      const response = await fetch(`${workerUrl}/api/agent/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId,
          eventId,
          message: cleanMessage,
          parentMessageId, // Pass thread context
        }),
      });

      if (!response.ok) {
        throw new Error(`Worker error: ${response.statusText}`);
      }

      const result = await response.json();

      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsInvoking(false);
    }
  }, []);

  return { invoke, isInvoking, error };
}
```

---

## Testing Strategy

### Manual Testing Checklist

**Threading:**
- [ ] Click "Reply" on user message, type response with @Delphi
- [ ] Click "Reply" on AI message, ask follow-up question
- [ ] Verify thread indicator shows parent message
- [ ] Verify reply count increments
- [ ] Test nested replies (reply to a reply)

**Task Agent:**
- [ ] "@Delphi we need to book a photographer"
- [ ] Verify task created in Convex with cost estimate
- [ ] Check task has deadline, category, priority

**Budget Agent:**
- [ ] "@Delphi we paid $500 for venue deposit"
- [ ] Verify expense created with correct category
- [ ] "@Delphi split $1000 among 4 people"
- [ ] Verify calculation correct ($250 each)

**Vendor Agent:**
- [ ] "@Delphi find me florists in Brooklyn"
- [ ] Verify Firecrawl called (check Worker logs)
- [ ] Verify 3-5 vendors returned with details
- [ ] Check vendors saved to Convex

**Event Agent:**
- [ ] "@Delphi what should we focus on first?"
- [ ] Verify strategic guidance provided
- [ ] "@Delphi are we on track?"
- [ ] Verify timeline analysis included

### Test with Real Scenario

**Wedding Planning Flow:**

```
1. User: "@Delphi help us plan our June 2026 wedding in San Francisco, budget $40k"
   → EventAgent creates event scaffold

2. User: "@Delphi what should we do first?"
   → EventAgent prioritizes: venue, photographer, caterer

3. User: [Replies to #2] "@Delphi find me venues"
   → VendorAgent searches, returns 5 venues

4. User: "we need to book venue by December"
   → TaskAgent creates task with deadline

5. User: "@Delphi venue deposit is $5000, split 3 ways"
   → BudgetAgent records expense, calculates $1666.67 per person

6. User: [Replies to #5] "can we see total budget?"
   → BudgetAgent shows breakdown

7. User: "@Delphi find photographers in SF"
   → VendorAgent searches, returns 5 photographers
```

---

## Demo Script

### 5-Minute Hackathon Demo

**Setup:**
- Have event already created: "Sarah & John's Wedding - June 14, 2026"
- Chat has 5-10 existing messages for context
- Screen shows chat interface with @Delphi input

**Script:**

**[0:00-0:30] Introduction**
> "Delphi is an AI-powered event planning platform. Instead of forms and spreadsheets, you just chat naturally and our multi-agent AI system handles the rest. Let me show you."

**[0:30-1:30] Task Agent Demo**
```
Type: "@Delphi we need to book a photographer"
→ Shows "Delphi is thinking..."
→ TaskAgent responds with:
  - Task created: "Book Wedding Photographer"
  - Deadline: March 2026 (9 months before event)
  - Cost estimate: $2,500-$4,000
  - Priority: High
  - Next steps: Research portfolios, schedule consultations
```
> "Notice the TaskAgent automatically estimated costs, set a realistic deadline, and suggested next steps."

**[1:30-2:30] Vendor Agent Demo**
```
Type: "@Delphi find me photographers in San Francisco"
→ Shows Sparkles icon pulsing
→ VendorAgent uses Firecrawl to search web
→ Returns 5 photographers:
  - Golden Gate Studios - $3,200 - 4.8/5 (142 reviews)
  - Bay Area Photography - $2,800 - 4.6/5 (89 reviews)
  - [3 more...]
Each with pros/cons, contact info, specialties
```
> "The VendorAgent searched The Knot, WeddingWire, and Google Reviews in real-time and gave us vetted options."

**[2:30-3:30] Budget Agent Demo**
```
Type: "@Delphi venue deposit is $5000, split between me, John, and Emily"
→ BudgetAgent responds:
  - Expense recorded: Venue Deposit - $5,000
  - Category: Venue (auto-detected)
  - Split calculation: $1,666.67 per person
  - Budget status: $5,000 / $40,000 (12.5% spent)
  - Remaining: $35,000
```

**Click "Reply" on budget response:**
```
Type: "@Delphi are we over budget?"
→ BudgetAgent (with thread context):
  - "Based on your $5,000 venue deposit and $40,000 total budget, you're well under budget..."
  - Forecast analysis
  - Risk areas if any
```
> "Notice I replied to Delphi's message - the BudgetAgent maintains conversation context."

**[3:30-4:30] Event Coordinator Demo**
```
Type: "@Delphi what should we focus on next?"
→ EventAgent analyzes:
  - Current status: 2 tasks created, $5k spent
  - Critical path: Venue → Catering → Invitations
  - Next priorities:
    1. Finalize photographer (high priority)
    2. Research caterers (depends on venue capacity)
    3. Create guest list (needed for save-the-dates)
  - Timeline: 8 months remaining, on track
```
> "The Event Coordinator agent orchestrates everything, identifying dependencies and bottlenecks."

**[4:30-5:00] Show Structured Data**
- Open Convex dashboard
- Show tasks table: 2 tasks with all metadata
- Show expenses table: $5k venue deposit
- Show vendors table: 5 photographers saved
> "All of this structured data was extracted from natural conversation. No forms, no manual categorization."

**[5:00] Closing**
> "Four specialized AI agents - TaskAgent, VendorAgent, BudgetAgent, EventAgent - working together to turn chat into a complete event plan. That's Delphi."

---

## Phase 2 Success Criteria

### Core Functionality

- [x] **Message Threading** - Reply to any message with thread indicators
- [ ] **Tool System** - ConvexCRUD, Firecrawl, Calculator all working
- [ ] **4 Agents Deployed** - Task, Budget, Vendor, Event agents functional
- [ ] **Intent Routing** - Keyword detection accurately routes 90%+ requests
- [ ] **Structured Data** - Tasks, expenses, vendors saved to Convex

### Performance Targets

- [ ] **Response Time** - Agents respond in < 5 seconds (including tool calls)
- [ ] **Tool Reliability** - 95%+ tool executions succeed
- [ ] **Intent Accuracy** - 85%+ messages routed to correct agent

### Demo Quality

- [ ] **Threading Works** - Can reply to any message, context maintained
- [ ] **TaskAgent** - Creates realistic tasks with costs and deadlines
- [ ] **VendorAgent** - Returns 3-5 real vendors from web search
- [ ] **BudgetAgent** - Tracks expenses, calculates splits correctly
- [ ] **EventAgent** - Provides strategic guidance with priorities

### Technical Quality

- [ ] **Error Handling** - Graceful degradation if tools/AI fail
- [ ] **Logging** - Clear logs for debugging agent routing
- [ ] **Type Safety** - No TypeScript errors
- [ ] **Worker Stability** - Runs without crashes for 10+ minutes

---

## Next Steps After Phase 2

### Phase 3: Polish & Pattern Detection (Optional)

If you have extra time after hackathon:

1. **Automatic Intent Detection** - LLM-based instead of keywords
2. **Streaming Responses** - Show AI typing in real-time
3. **Rich UI Components** - Vendor cards, task cards in chat
4. **Advanced Context** - Include event details, full task list
5. **DO Checkpointing** - Persist agent state

### Production Roadmap

**Week 1-2 Post-Hackathon:**
- User testing with 5 real events
- Bug fixes and error handling improvements
- Performance optimization

**Week 3-4:**
- Pattern detection engine (regex → LLM classification)
- Advanced vendor search (semantic search with embeddings)
- File upload support (receipts, contracts)

**Month 2:**
- Mobile app (React Native)
- Push notifications
- Payment splits with Stripe

---

## Files to Create/Modify

### New Files (Create)

```
agent-worker/src/
├── tools/
│   ├── index.ts (interfaces)
│   ├── ConvexCRUDTool.ts
│   ├── FirecrawlTool.ts
│   └── CalculatorTool.ts
├── agents/
│   ├── BaseAgent.ts
│   ├── TaskAgent.ts
│   ├── BudgetAgent.ts
│   ├── VendorAgent.ts
│   └── EventAgent.ts

web/convex/
├── tasks.ts (CRUD mutations)
├── expenses.ts (CRUD mutations)
└── vendors.ts (CRUD mutations)
```

### Modified Files

```
agent-worker/src/durable-objects/ChatOrchestratorDO.ts
  - Add agent initialization
  - Add intent detection
  - Add agent routing

web/convex/schema.ts
  - Add parentMessageId, threadId, replyCount to messages
  - Add aiMetadata field
  - Add indexes for threading

web/convex/messages.ts
  - Add getThread query
  - Update send mutation for threading

web/src/components/messages/message-item.tsx
  - Add Reply button
  - Add Ask Delphi button
  - Add thread indicator

web/src/components/messages/message-input.tsx
  - Add reply context banner
  - Update onAgentInvoke to accept parentMessageId

web/src/hooks/useAgentInvoke.ts
  - Add parentMessageId parameter

web/src/routes/_authed/events.$eventId.rooms.$roomId.tsx
  - Wire up reply functionality
  - Pass parentMessageId to agent invoke
```

---

**Document Version:** 1.0
**Last Updated:** November 14, 2025
**Status:** Ready to Implement
**Estimated Time:** 2-3 days (aggressive hackathon pace)

**Let's build this! 🚀**
