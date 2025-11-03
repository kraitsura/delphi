# Phase 3.1: Claude API & Base Agent Architecture
## Integrating AI Intelligence with Anthropic Claude

> **Status:** Phase 3.1 - AI Foundation (Day 3-4)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.0 Complete (Pattern Detection)
> **Next Phase:** Phase 3.2 (Task Enrichment & Quick Actions)

---

## Overview

This phase integrates **Claude AI** into your backend, creating the foundation for all AI-powered features. You'll build a reusable agent architecture that will power task enrichment, expense categorization, poll analysis, and more.

### What You'll Build

- ✅ Anthropic SDK setup with API key management
- ✅ BaseAgent abstract class for all AI agents
- ✅ AI processing queue system
- ✅ Async job scheduler for AI tasks
- ✅ Error handling & retry logic
- ✅ First working agent: Simple Task Classifier
- ✅ End-to-end flow: message → pattern detection → AI enrichment

### Architecture

```
Message Created
    ↓
Pattern Detection (Phase 3.0)
    ↓
Confidence ≥ 0.7? → Queue AI Job
    ↓
Scheduler runs processMessage (async)
    ↓
BaseAgent executes with Claude API
    ↓
Store result & update message
    ↓
Frontend receives update via subscription
```

---

## Step 1: Install Anthropic SDK

```bash
cd mono/packages/backend
bun add @anthropic-ai/sdk
```

---

## Step 2: Configure Environment Variables

Add to `mono/packages/backend/.env` (create if doesn't exist):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Add to Convex deployment (production):

```bash
cd mono/packages/backend
npx convex env set ANTHROPIC_API_KEY sk-ant-api03-your-key-here
```

Update `.gitignore` to ensure `.env` is never committed:

```bash
# In mono/packages/backend/.gitignore
.env
.env.local
```

---

## Step 3: Create BaseAgent Abstract Class

Create `mono/packages/backend/convex/ai/baseAgent.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Context provided to AI agents for decision making
 */
export interface AgentContext {
  eventType?: string;
  eventDate?: string;
  budget?: { total: number; spent: number };
  existingTasks?: any[];
  recentMessages?: any[];
  participants?: any[];
  userPreferences?: any;
}

/**
 * Standardized response from AI agents
 */
export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

/**
 * Base class for all AI agents
 * Provides common functionality for Claude API calls
 */
export abstract class BaseAgent {
  protected model = "claude-sonnet-4-20250514";
  protected maxTokens = 2000;
  protected temperature = 0.7;

  /**
   * Each agent must define their system prompt
   * This shapes how Claude behaves for this specific task
   */
  abstract getSystemPrompt(): string;

  /**
   * Each agent assembles the context they need
   * This determines what data the AI sees
   */
  abstract assembleContext(ctx: any, args: any): Promise<AgentContext>;

  /**
   * Each agent parses their specific response format
   * Most agents expect structured JSON
   */
  abstract parseResponse(response: string): any;

  /**
   * Main execution method - handles API call and error handling
   */
  async execute(
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: this.buildPrompt(userMessage, context),
          },
        ],
      });

      const responseText = message.content[0].type === "text"
        ? message.content[0].text
        : "";

      const parsed = this.parseResponse(responseText);

      return {
        success: true,
        data: parsed,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("AI Agent Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Build the complete prompt with context
   * Can be overridden by specific agents for custom formatting
   */
  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
User message: "${userMessage}"

Event context:
${JSON.stringify(context, null, 2)}

Please analyze this message and provide a structured response.
    `.trim();
  }

  /**
   * Streaming support for future use
   * Allows real-time AI responses in chat
   */
  async *executeStreaming(
    userMessage: string,
    context: AgentContext
  ): AsyncGenerator<string> {
    const stream = await anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: this.getSystemPrompt(),
      messages: [
        {
          role: "user",
          content: this.buildPrompt(userMessage, context),
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
  }
}
```

---

## Step 4: Create Simple Task Classifier Agent

Create `mono/packages/backend/convex/ai/taskClassifierAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

/**
 * Simple classification result
 */
interface TaskClassification {
  category: "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other";
  priority: "low" | "medium" | "high";
  estimatedCostRange: { min: number; max: number };
  suggestedDeadline: string;
  reasoning: string;
}

/**
 * Simple agent that classifies tasks
 * This is a minimal example to test the agent system
 */
export class TaskClassifierAgent extends BaseAgent {
  protected temperature = 0.5; // Lower temp for more consistent categorization

  getSystemPrompt(): string {
    return `You are a task categorization expert for event planning.

When given a task description, classify it and provide basic metadata.

Respond with valid JSON only:
{
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other",
  "priority": "low" | "medium" | "high",
  "estimatedCostRange": { "min": number, "max": number },
  "suggestedDeadline": "YYYY-MM-DD",
  "reasoning": "Brief explanation"
}

Be practical and base estimates on typical event costs.`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { eventId } = args;

    // Get minimal context - just event basics
    const event = await db.get(eventId);

    return {
      eventType: event?.type || "unknown",
      eventDate: event?.eventDate,
      budget: {
        total: event?.budget || 0,
        spent: 0,
      },
    };
  }

  parseResponse(response: string): TaskClassification {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.category || !parsed.priority) {
        throw new Error("Missing required fields");
      }

      return parsed as TaskClassification;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Invalid AI response format");
    }
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Classify this task:

Task: "${userMessage}"

Event Details:
- Type: ${context.eventType}
- Date: ${context.eventDate || "not set"}
- Budget: $${context.budget?.total || 0}

Provide classification in JSON format.
    `.trim();
  }
}
```

---

## Step 5: Create AI Processing Queue System

Create `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { TaskClassifierAgent } from "./taskClassifierAgent";
import { Id } from "../_generated/dataModel";

/**
 * Process a message with AI enrichment
 * This runs asynchronously after a message is sent
 */
export const processMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;

    console.log(`[AI] Processing message ${args.messageId}`);

    // Get message
    const message = await db.get(args.messageId);
    if (!message) {
      console.error(`[AI] Message ${args.messageId} not found`);
      throw new Error("Message not found");
    }

    // Get queue item
    const queueItem = await db
      .query("aiProcessingQueue")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!queueItem) {
      console.error(`[AI] Queue item for message ${args.messageId} not found`);
      throw new Error("Queue item not found");
    }

    // Update status to processing
    await db.patch(queueItem._id, {
      status: "processing",
    });

    try {
      // Get room to find event
      const room = await db.get(message.roomId);
      if (!room) throw new Error("Room not found");

      // Route to appropriate agent based on intent
      let result;

      switch (message.detectedIntent) {
        case "task_creation":
          console.log(`[AI] Classifying task: "${message.text}"`);

          const taskAgent = new TaskClassifierAgent();
          const context = await taskAgent.assembleContext(ctx, {
            eventId: room.eventId,
          });

          const aiResponse = await taskAgent.execute(message.text, context);

          if (!aiResponse.success) {
            throw new Error(aiResponse.error || "AI processing failed");
          }

          console.log(`[AI] Classification result:`, aiResponse.data);
          console.log(`[AI] Tokens used: ${aiResponse.tokensUsed}, Latency: ${aiResponse.latencyMs}ms`);

          result = aiResponse.data;

          // For now, just log the result
          // In Phase 3.2, we'll add quick action buttons
          console.log(`[AI] Task classified as: ${result.category} (${result.priority} priority)`);

          break;

        case "expense_entry":
        case "poll_creation":
        case "question":
          // TODO: Implement in later phases
          console.log(`[AI] Intent ${message.detectedIntent} not yet implemented`);
          result = { note: "AI handler not yet implemented" };
          break;

        default:
          console.log(`[AI] Unknown intent: ${message.detectedIntent}`);
          result = { note: "Unknown intent" };
      }

      // Mark as completed
      await db.patch(queueItem._id, {
        status: "completed",
        result,
        processedAt: Date.now(),
      });

      console.log(`[AI] Successfully processed message ${args.messageId}`);

    } catch (error) {
      console.error("[AI] Processing error:", error);

      // Mark as failed
      await db.patch(queueItem._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        processedAt: Date.now(),
      });
    }
  },
});
```

---

## Step 6: Update Message Sending to Queue AI Jobs

Update `mono/packages/backend/convex/messages.ts`:

```typescript
import { detectIntent } from "./patternDetection";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
    replyToId: v.optional(v.id("messages")),
    attachments: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject as any;
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // STEP 1: Pattern Detection
    const detection = detectIntent(args.text);

    console.log("Pattern detection:", {
      intent: detection.intent,
      confidence: detection.confidence.toFixed(2),
      triggerAI: detection.triggerAI,
    });

    // STEP 2: Insert message
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: userId,
      text: args.text,
      authorName: user.name || identity.name || "Unknown",
      authorAvatar: user.avatar,
      replyToId: args.replyToId,
      attachments: args.attachments,

      // Add detection metadata
      detectedIntent: detection.intent,
      intentConfidence: detection.confidence,
      extractedEntities: detection.extractedEntities,

      reactions: [],
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // STEP 3: Queue AI processing if high confidence
    if (detection.triggerAI) {
      console.log(`[AI] Queueing message ${messageId} for AI processing`);

      // Insert into queue
      await ctx.db.insert("aiProcessingQueue", {
        messageId,
        roomId: args.roomId,
        intent: detection.intent,
        confidence: detection.confidence,
        entities: detection.extractedEntities,
        status: "pending",
        createdAt: Date.now(),
      });

      // Schedule async processing
      await ctx.scheduler.runAfter(0, internal.ai.processMessage, {
        messageId,
      });

      console.log(`[AI] Scheduled processing for message ${messageId}`);
    }

    // STEP 4: Update room
    await ctx.db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});
```

---

## Step 7: Export AI Functions

Create `mono/packages/backend/convex/ai/index.ts`:

```typescript
export { processMessage } from "./processMessage";
```

Update `mono/packages/backend/convex/_generated/api.d.ts` will auto-generate with:

```typescript
export const internal = {
  ai: {
    processMessage: /* ... */
  }
};
```

---

## Step 8: Test End-to-End AI Flow

Create test script `mono/packages/backend/scripts/test-ai-flow.ts`:

```typescript
import { TaskClassifierAgent } from "../convex/ai/taskClassifierAgent";

async function testAgent() {
  console.log("Testing Task Classifier Agent\n");
  console.log("=".repeat(80));

  const agent = new TaskClassifierAgent();

  const testMessages = [
    "We should book a photographer",
    "Need to hire a caterer for 150 guests",
    "Let's find a venue in downtown area",
  ];

  for (const message of testMessages) {
    console.log(`\nMessage: "${message}"`);

    const context = {
      eventType: "wedding",
      eventDate: "2026-06-15",
      budget: { total: 40000, spent: 0 },
    };

    try {
      const response = await agent.execute(message, context);

      if (response.success) {
        console.log("✅ Success!");
        console.log("Category:", response.data.category);
        console.log("Priority:", response.data.priority);
        console.log("Cost Range:", `$${response.data.estimatedCostRange.min} - $${response.data.estimatedCostRange.max}`);
        console.log("Deadline:", response.data.suggestedDeadline);
        console.log("Reasoning:", response.data.reasoning);
        console.log("Tokens:", response.tokensUsed);
        console.log("Latency:", `${response.latencyMs}ms`);
      } else {
        console.log("❌ Failed:", response.error);
      }
    } catch (error) {
      console.log("❌ Error:", error);
    }

    console.log("-".repeat(80));
  }
}

testAgent();
```

Run it:

```bash
cd mono/packages/backend
bun scripts/test-ai-flow.ts
```

---

## Step 9: Monitor AI Processing

Create monitoring query `mono/packages/backend/convex/monitoring.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get AI processing metrics
 */
export const getAIMetrics = query({
  handler: async (ctx) => {
    const { db } = ctx;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const queueItems = await db
      .query("aiProcessingQueue")
      .filter((q) => q.gt(q.field("createdAt"), oneHourAgo))
      .collect();

    const total = queueItems.length;
    const completed = queueItems.filter((q) => q.status === "completed").length;
    const failed = queueItems.filter((q) => q.status === "failed").length;
    const pending = queueItems.filter((q) => q.status === "pending").length;

    const avgLatency = queueItems
      .filter((q) => q.processedAt)
      .reduce((sum, q) => sum + (q.processedAt! - q.createdAt), 0) /
      (queueItems.filter((q) => q.processedAt).length || 1);

    return {
      lastHour: {
        total,
        completed,
        failed,
        pending,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        avgLatencyMs: Math.round(avgLatency),
      },
      byIntent: groupByIntent(queueItems),
    };
  },
});

function groupByIntent(items: any[]) {
  const grouped: Record<string, number> = {};

  for (const item of items) {
    grouped[item.intent] = (grouped[item.intent] || 0) + 1;
  }

  return grouped;
}

/**
 * Get recent AI processing history
 */
export const getAIHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("aiProcessingQueue")
      .order("desc")
      .take(args.limit || 20);

    return items.map(item => ({
      id: item._id,
      intent: item.intent,
      status: item.status,
      confidence: item.confidence,
      latency: item.processedAt ? item.processedAt - item.createdAt : null,
      error: item.error,
      createdAt: item.createdAt,
    }));
  },
});
```

---

## Testing Checklist

Test in your app:

- [ ] **Environment setup**
  - ANTHROPIC_API_KEY set in .env
  - Convex dev server running
  - No errors in console

- [ ] **Message flow**
  - Send "We should book a photographer"
  - Check Convex logs for pattern detection
  - Verify AI processing queue entry created
  - Confirm processMessage runs
  - See classification result in logs

- [ ] **Error handling**
  - Test with invalid API key → graceful error
  - Test with malformed message → doesn't crash
  - Check failed items in aiProcessingQueue

- [ ] **Performance**
  - AI classification completes in <3s
  - No timeout errors
  - Token usage reasonable (<1000 tokens)

- [ ] **Monitoring**
  - Query `monitoring.getAIMetrics()` shows stats
  - Success rate >95%
  - Can see intent breakdown

---

## Success Criteria

✅ **Anthropic SDK installed and configured**
✅ **BaseAgent abstract class created**
✅ **TaskClassifierAgent working (first agent!)**
✅ **AI processing queue system functional**
✅ **Messages automatically queued when confidence ≥0.7**
✅ **Async scheduler runs AI jobs**
✅ **Error handling catches API failures**
✅ **Monitoring queries show AI metrics**
✅ **End-to-end flow: message → detection → AI → result**

---

## Debug Commands

```bash
# Watch Convex logs
cd mono/packages/backend
npx convex logs --watch

# Test AI agent directly
bun scripts/test-ai-flow.ts

# Check queue status (in Convex dashboard)
# Query: monitoring.getAIMetrics()
# Or: db.query("aiProcessingQueue").collect()
```

---

## Cost Tracking

After testing, check your costs:

```typescript
// Estimate from logs
const avgTokensPerCall = 800; // Check your actual usage
const costPerToken = 0.003 / 1000; // Claude Sonnet pricing

console.log(`Cost per AI call: ~$${(avgTokensPerCall * costPerToken).toFixed(4)}`);
```

Expected: **~$0.002-0.003 per task classification**

---

## What's Next: Phase 3.2

Now that AI integration works, we'll build:
1. **Task Enricher Agent** - Full enrichment with vendor suggestions, next steps
2. **Quick Action Buttons** - UI for "Create Task" with AI data pre-filled
3. **Task Preview Dialog** - Review and edit AI suggestions before creating

The infrastructure is ready. Time to make it useful! 🚀

---

**Phase 3.1 Complete = Claude AI integrated and working** 🤖
**Next: Phase 3.2 - Build rich task enrichment with UI** ✨
