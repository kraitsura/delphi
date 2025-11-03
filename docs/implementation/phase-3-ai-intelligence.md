# Phase 3 Implementation Guide: AI Intelligence Layer
## Pattern Detection & AI-Powered Features

> **Status:** Phase 3 - AI Intelligence (Weeks 6-7)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 2 Complete (Real-Time Chat with Mentions, Reactions, Search)

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Week 6: Pattern Detection & Core AI](#week-6-pattern-detection--core-ai)
3. [Week 7: Advanced AI Features](#week-7-advanced-ai-features)
4. [AI Agent System](#ai-agent-system)
5. [Context Assembly Strategies](#context-assembly-strategies)
6. [Performance & Cost Optimization](#performance--cost-optimization)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## Overview & Architecture

### Phase 2 Foundation (What You Built)

From Phase 2, you now have:
- ✅ **Real-time chat** with optimistic updates
- ✅ **Multi-room support** per event
- ✅ **Rich messaging** (mentions, reactions, images)
- ✅ **Participant management** (invite, roles, permissions)
- ✅ **Message search** with full-text indexing
- ✅ **Unread tracking** and notifications

**Phase 2 delivered the chat platform. Phase 3 makes it intelligent.**

### Phase 3 Goals

Build an **AI-powered intelligence layer** that:
1. Detects intents in conversation (tasks, expenses, polls, calendar events)
2. Enriches simple mentions with structured data
3. Provides proactive suggestions and nudges
4. Enables natural language queries about event status
5. Generates contextual quick actions for common workflows
6. Maintains <3 second response time for AI features

### Architecture Decision: Pattern Detection First, AI Second

**Why the 2-Layer Approach?**

| Approach | Cost per 1K Messages | Latency | Accuracy |
|----------|---------------------|---------|----------|
| AI-Only | $2-5 | 1-3s | 95% |
| Regex-Only | $0 | <5ms | 70% |
| **Pattern + AI** | **$0.10-0.50** | **50-500ms** | **92%** |

**Decision:** Use pattern detection to filter 90% of messages, only invoke AI for high-confidence intents.

### Intelligence Flow Architecture

```
User sends message
    ↓
Pattern Detection Engine (Cloudflare Workers)
    ├─ Regex analysis (< 5ms)
    ├─ Intent classification
    ├─ Confidence scoring
    └─ Entity extraction
    ↓
Decision: Invoke AI? (confidence > 0.7)
    ├─ No → Store message only
    └─ Yes → Route to specialized agent
    ↓
AI Agent Orchestration (Convex Functions)
    ├─ Assemble context (4 levels: minimal/standard/rich/full)
    ├─ Select agent (Task/Budget/Planning/Dependency)
    ├─ Call Claude API with structured prompt
    └─ Parse & validate response
    ↓
Response Processing
    ├─ Store structured data (task/expense/poll)
    ├─ Update related entities
    ├─ Generate quick action buttons
    └─ Push to all clients
    ↓
User sees enriched message with actions
```

### Cost Model (for 10K messages/month event)

```
Assumptions:
- 10,000 messages per event lifecycle
- 10% trigger AI (1,000 AI calls)
- Average 2,000 tokens per AI call

Pattern Detection: $0 (included in Cloudflare Workers free tier)
AI Calls: 1,000 calls × $0.003/call = $3
Context Assembly: Negligible (Convex queries)

Total: ~$3-5 per event
```

**This is 90% cheaper than calling AI on every message!**

---

## Week 6: Pattern Detection & Core AI

### Goal

Build the pattern detection engine and integrate Claude API for the 3 most valuable features:
1. Smart Task Creation
2. Expense Tracking
3. Inline Poll Detection

### 6.1 Pattern Detection Engine

#### Create Pattern Detection Types

Create `mono/packages/backend/convex/patternDetection.ts`:

```typescript
import { v } from "convex/values";

/**
 * Intent types that can be detected
 */
export type Intent =
  | "task_creation"
  | "expense_entry"
  | "poll_creation"
  | "calendar_event"
  | "question"
  | "decision"
  | "vendor_mention"
  | "none";

/**
 * Confidence levels
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Pattern detection result
 */
export interface DetectionResult {
  intent: Intent;
  confidence: number; // 0-1
  confidenceLevel: Confidence;
  extractedEntities: {
    action?: string;
    object?: string;
    deadline?: string;
    amount?: number;
    currency?: string;
    category?: string;
    options?: string[];
    mentions?: string[];
  };
  triggerAI: boolean;
  reasoning?: string;
}

/**
 * Pattern matchers for each intent type
 */
export const INTENT_PATTERNS = {
  task_creation: [
    /we should\s+(\w+)/i,
    /need to\s+(\w+)/i,
    /let's\s+(\w+)/i,
    /have to\s+(\w+)/i,
    /must\s+(\w+)/i,
    /todo:?\s+(.+)/i,
    /task:?\s+(.+)/i,
    /action item:?\s+(.+)/i,
    /someone needs? to\s+(\w+)/i,
    /(?:book|hire|order|find|research|contact|schedule)\s+(\w+)/i,
  ],

  expense_entry: [
    /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/,
    /paid\s+\$?\d+/i,
    /cost(?:ed)?\s+\$?\d+/i,
    /spent\s+\$?\d+/i,
    /deposit\s+(?:of\s+)?\$?\d+/i,
    /invoice\s+(?:for\s+)?\$?\d+/i,
    /\d+\s+dollars?/i,
  ],

  poll_creation: [
    /should we\s+(.+)\s+or\s+(.+)\?/i,
    /(?:what|which)\s+(?:do you|should we)\s+(?:prefer|choose|want)\?/i,
    /vote.*(?:between|for)/i,
    /thoughts on\s+(.+)\?/i,
    /opinions?\s+(?:on|about)\s+(.+)\?/i,
    /poll:?\s+(.+)/i,
  ],

  calendar_event: [
    /schedule\s+(.+?)(?:\s+on\s+|\s+for\s+|\s+at\s+)/i,
    /meeting\s+(?:on|at|next|this)/i,
    /(?:book|reserve)\s+(?:a\s+)?(?:time|slot|appointment)/i,
    /(?:next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /(?:tomorrow|today)\s+at\s+\d/i,
  ],

  question: [
    /^(?:what|when|where|who|why|how)\s+/i,
    /\?$/,
  ],

  vendor_mention: [
    /(?:photographer|caterer|florist|dj|band|venue|baker|planner)/i,
    /vendor/i,
  ],
};

/**
 * Entity extraction patterns
 */
export const ENTITY_PATTERNS = {
  // Money: $1,234.56 or 1234.56 or $1234
  money: /\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?)?/i,

  // Dates: "next Tuesday", "Nov 15", "11/15/2025"
  relativeDate: /(?:next|this|last)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)/i,
  absoluteDate: /(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})/i,

  // Time: "2pm", "14:00", "2:30pm"
  time: /\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,

  // Mentions: @[Name](userId)
  mention: /@\[([^\]]+)\]\(([^)]+)\)/g,

  // Categories (for expenses/tasks)
  category: /(?:venue|catering|photography|music|flowers?|decor(?:ations?)?|attire|stationery|transportation)/i,
};

/**
 * Main pattern detection function
 */
export function detectIntent(messageText: string): DetectionResult {
  const text = messageText.trim();

  // Check each intent type
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const result = buildDetectionResult(
          intent as Intent,
          text,
          match
        );

        if (result.confidence >= 0.7) {
          return result;
        }
      }
    }
  }

  return {
    intent: "none",
    confidence: 0,
    confidenceLevel: "low",
    extractedEntities: {},
    triggerAI: false,
  };
}

/**
 * Build detection result with entity extraction
 */
function buildDetectionResult(
  intent: Intent,
  text: string,
  match: RegExpMatchArray
): DetectionResult {
  const entities: DetectionResult["extractedEntities"] = {};
  let confidence = 0.5; // Base confidence

  switch (intent) {
    case "task_creation":
      // Extract action verb
      if (match[1]) {
        entities.action = match[1];
        confidence += 0.2;
      }

      // Extract object (what to book/hire/etc)
      const objectMatch = text.match(/(?:book|hire|order|find)\s+(?:a\s+)?(\w+(?:\s+\w+)?)/i);
      if (objectMatch) {
        entities.object = objectMatch[1];
        confidence += 0.15;
      }

      // Extract deadline
      const dateMatch = text.match(ENTITY_PATTERNS.relativeDate) || text.match(ENTITY_PATTERNS.absoluteDate);
      if (dateMatch) {
        entities.deadline = dateMatch[0];
        confidence += 0.1;
      }

      // Extract category
      const categoryMatch = text.match(ENTITY_PATTERNS.category);
      if (categoryMatch) {
        entities.category = categoryMatch[0];
        confidence += 0.05;
      }

      break;

    case "expense_entry":
      // Extract amount
      const moneyMatch = text.match(ENTITY_PATTERNS.money);
      if (moneyMatch) {
        const amount = parseFloat(moneyMatch[1].replace(/,/g, ""));
        entities.amount = amount;
        entities.currency = "USD";
        confidence += 0.3;
      }

      // Extract category
      const expenseCategoryMatch = text.match(ENTITY_PATTERNS.category);
      if (expenseCategoryMatch) {
        entities.category = expenseCategoryMatch[0];
        confidence += 0.15;
      }

      // Check for payment keywords
      if (/paid|deposit|invoice|cost|spent/i.test(text)) {
        confidence += 0.05;
      }

      break;

    case "poll_creation":
      // Extract options from "X or Y" pattern
      const orMatch = text.match(/(.+?)\s+or\s+(.+?)(?:\?|$)/i);
      if (orMatch) {
        entities.options = [orMatch[1].trim(), orMatch[2].trim()];
        confidence += 0.25;
      }

      // Check for question mark
      if (text.includes("?")) {
        confidence += 0.1;
      }

      break;

    case "calendar_event":
      // Extract date
      const eventDateMatch = text.match(ENTITY_PATTERNS.relativeDate) || text.match(ENTITY_PATTERNS.absoluteDate);
      if (eventDateMatch) {
        entities.deadline = eventDateMatch[0];
        confidence += 0.2;
      }

      // Extract time
      const timeMatch = text.match(ENTITY_PATTERNS.time);
      if (timeMatch) {
        entities.deadline = (entities.deadline || "") + " " + timeMatch[0];
        confidence += 0.15;
      }

      break;
  }

  // Extract mentions (applies to all intents)
  const mentions = Array.from(text.matchAll(ENTITY_PATTERNS.mention));
  if (mentions.length > 0) {
    entities.mentions = mentions.map(m => m[2]); // Extract user IDs
    confidence += 0.05;
  }

  const confidenceLevel: Confidence =
    confidence >= 0.75 ? "high" :
    confidence >= 0.5 ? "medium" : "low";

  return {
    intent,
    confidence,
    confidenceLevel,
    extractedEntities: entities,
    triggerAI: confidence >= 0.7,
  };
}

/**
 * Batch detection for multiple messages
 */
export function detectIntentsInBatch(messages: string[]): DetectionResult[] {
  return messages.map(detectIntent);
}
```

#### Add Pattern Detection to Message Pipeline

Update `mono/packages/backend/convex/messages.ts`:

```typescript
import { detectIntent } from "./patternDetection";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    const userProfile = await db.get(user.id);

    // STEP 1: Pattern Detection
    const detection = detectIntent(args.text);

    // STEP 2: Insert message with detection metadata
    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      authorName: userProfile?.name || user.name,
      authorAvatar: userProfile?.avatar,

      // Add detection metadata
      detectedIntent: detection.intent,
      intentConfidence: detection.confidence,
      extractedEntities: detection.extractedEntities,

      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // STEP 3: If high confidence, queue AI processing
    if (detection.triggerAI) {
      await db.insert("aiProcessingQueue", {
        messageId,
        roomId: args.roomId,
        intent: detection.intent,
        confidence: detection.confidence,
        entities: detection.extractedEntities,
        status: "pending",
        createdAt: Date.now(),
      });

      // Schedule AI processing (async)
      await db.scheduler.runAfter(0, internal.ai.processMessage, {
        messageId,
      });
    }

    // STEP 4: Update room metadata
    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);
```

#### Update Schema for AI Metadata

Add to `mono/packages/backend/convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables

  messages: defineTable({
    roomId: v.id("rooms"),
    authorId: v.id("users"),
    text: v.string(),
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),

    // AI Detection metadata
    detectedIntent: v.optional(v.union(
      v.literal("task_creation"),
      v.literal("expense_entry"),
      v.literal("poll_creation"),
      v.literal("calendar_event"),
      v.literal("question"),
      v.literal("vendor_mention"),
      v.literal("none")
    )),
    intentConfidence: v.optional(v.number()),
    extractedEntities: v.optional(v.any()),

    // Quick actions generated by AI
    quickActions: v.optional(v.array(v.object({
      label: v.string(),
      action: v.string(),
      data: v.optional(v.any()),
    }))),

    // ... rest of fields
  })
    .index("by_room_and_created", ["roomId", "createdAt"])
    .index("by_author", ["authorId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["roomId", "isDeleted"],
    }),

  // AI Processing Queue
  aiProcessingQueue: defineTable({
    messageId: v.id("messages"),
    roomId: v.id("rooms"),
    intent: v.string(),
    confidence: v.number(),
    entities: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_message", ["messageId"]),
});
```

### 6.2 Claude API Integration

#### Setup Anthropic SDK

```bash
cd mono/packages/backend
bun add @anthropic-ai/sdk
```

#### Create AI Agent Base Class

Create `mono/packages/backend/convex/ai/baseAgent.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface AgentContext {
  eventType?: string;
  eventDate?: string;
  budget?: { total: number; spent: number };
  existingTasks?: any[];
  recentMessages?: any[];
  participants?: any[];
  userPreferences?: any;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export abstract class BaseAgent {
  protected model = "claude-sonnet-4-20250514";
  protected maxTokens = 2000;
  protected temperature = 0.7;

  /**
   * Each agent implements their own system prompt
   */
  abstract getSystemPrompt(): string;

  /**
   * Each agent implements their own context assembly
   */
  abstract assembleContext(ctx: any, args: any): Promise<AgentContext>;

  /**
   * Each agent implements their own response parsing
   */
  abstract parseResponse(response: string): any;

  /**
   * Main execution method
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
   * Streaming support (for future use)
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

#### Create Task Enricher Agent

Create `mono/packages/backend/convex/ai/taskEnricherAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

interface TaskEnrichmentResult {
  taskName: string;
  description: string;
  category: string;
  estimatedCost: { min: number; max: number };
  suggestedDeadline: string;
  priority: "low" | "medium" | "high";
  dependencies: string[];
  nextSteps: string[];
  vendorSuggestions: Array<{
    name: string;
    estimatedPrice: string;
    notes: string;
  }>;
  planningTips: string[];
}

export class TaskEnricherAgent extends BaseAgent {
  protected temperature = 0.7;

  getSystemPrompt(): string {
    return `You are an expert wedding and event planner. Your job is to transform casual mentions of tasks into detailed, actionable task descriptions.

When a user mentions they need to do something (like "we should book a photographer"), you should:
1. Create a clear, specific task name
2. Write a detailed description with context
3. Estimate costs based on typical market rates
4. Suggest realistic deadlines based on the event date
5. Identify dependencies (what must be done first)
6. Provide concrete next steps
7. Suggest 2-3 relevant vendors if applicable
8. Include helpful planning tips

Always respond with valid JSON matching this schema:
{
  "taskName": string,
  "description": string,
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "other",
  "estimatedCost": { "min": number, "max": number },
  "suggestedDeadline": "YYYY-MM-DD",
  "priority": "low" | "medium" | "high",
  "dependencies": string[],
  "nextSteps": string[],
  "vendorSuggestions": [
    {
      "name": string,
      "estimatedPrice": string,
      "notes": string
    }
  ],
  "planningTips": string[]
}

Be specific, practical, and helpful. Base cost estimates on the event type, size, and location when provided.`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { roomId, eventId } = args;

    // Get event details
    const event = await db.get(eventId);

    // Get existing tasks
    const tasks = await db
      .query("tasks")
      .filter((q: any) => q.eq(q.field("eventId"), eventId))
      .take(20);

    // Get recent messages for context
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", (q: any) => q.eq("roomId", roomId))
      .order("desc")
      .take(10);

    return {
      eventType: event?.type,
      eventDate: event?.eventDate,
      budget: {
        total: event?.budget || 0,
        spent: event?.totalSpent || 0,
      },
      existingTasks: tasks.map((t: any) => ({
        name: t.name,
        category: t.category,
        status: t.status,
      })),
      recentMessages: messages.map((m: any) => m.text),
    };
  }

  parseResponse(response: string): TaskEnrichmentResult {
    try {
      // Extract JSON from response (Claude sometimes adds explanation text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.taskName || !parsed.category) {
        throw new Error("Missing required fields");
      }

      return parsed as TaskEnrichmentResult;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Invalid AI response format");
    }
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Analyze this message and create an enriched task:

User message: "${userMessage}"

Event Details:
- Type: ${context.eventType || "not specified"}
- Date: ${context.eventDate || "not specified"}
- Budget: $${context.budget?.total || 0} total, $${context.budget?.spent || 0} spent
- Existing tasks: ${context.existingTasks?.length || 0}

Recent conversation context:
${context.recentMessages?.slice(0, 5).join("\n") || "None"}

Please create a detailed task with all enrichments in JSON format.
    `.trim();
  }
}
```

#### Create AI Processing Function

Create `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { TaskEnricherAgent } from "./taskEnricherAgent";
import { Id } from "../_generated/dataModel";

export const processMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;

    // Get message
    const message = await db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Get queue item
    const queueItem = await db
      .query("aiProcessingQueue")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!queueItem) {
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
          const taskAgent = new TaskEnricherAgent();
          const context = await taskAgent.assembleContext(ctx, {
            roomId: message.roomId,
            eventId: room.eventId,
          });

          const aiResponse = await taskAgent.execute(message.text, context);

          if (!aiResponse.success) {
            throw new Error(aiResponse.error || "AI processing failed");
          }

          result = aiResponse.data;

          // Generate quick actions
          const quickActions = [
            {
              label: "Create Task",
              action: "create_task",
              data: result,
            },
            {
              label: "Edit Details",
              action: "edit_task_details",
              data: result,
            },
            {
              label: "Dismiss",
              action: "dismiss",
            },
          ];

          // Update message with quick actions
          await db.patch(args.messageId, {
            quickActions,
          });

          break;

        // TODO: Add other intent handlers
        default:
          throw new Error(`Unsupported intent: ${message.detectedIntent}`);
      }

      // Mark as completed
      await db.patch(queueItem._id, {
        status: "completed",
        result,
        processedAt: Date.now(),
      });

    } catch (error) {
      console.error("AI processing error:", error);

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

### 6.3 Frontend: Quick Action Buttons

#### Create Quick Actions Component

Create `mono/apps/web/src/components/chat/quick-actions.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { TaskPreviewDialog } from "./task-preview-dialog";

interface QuickAction {
  label: string;
  action: string;
  data?: any;
}

interface QuickActionsProps {
  messageId: Id<"messages">;
  actions: QuickAction[];
}

export function QuickActions({ messageId, actions }: QuickActionsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  if (dismissed) return null;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {actions.map((action, index) => (
        <QuickActionButton
          key={index}
          messageId={messageId}
          action={action}
          onDismiss={() => setDismissed(true)}
          onPreview={(data) => setPreviewData(data)}
        />
      ))}

      {previewData && (
        <TaskPreviewDialog
          data={previewData}
          open={!!previewData}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}

interface QuickActionButtonProps {
  messageId: Id<"messages">;
  action: QuickAction;
  onDismiss: () => void;
  onPreview: (data: any) => void;
}

function QuickActionButton({
  messageId,
  action,
  onDismiss,
  onPreview,
}: QuickActionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    switch (action.action) {
      case "create_task":
        // Show preview dialog
        onPreview(action.data);
        break;

      case "edit_task_details":
        // Open edit modal
        onPreview(action.data);
        break;

      case "dismiss":
        onDismiss();
        break;

      default:
        toast.error("Unknown action");
    }
  };

  const getIcon = () => {
    switch (action.action) {
      case "dismiss":
        return <X className="h-3 w-3" />;
      case "create_task":
        return <Check className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const variant = action.action === "dismiss" ? "ghost" : "default";

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        getIcon()
      )}
      {action.label}
    </Button>
  );
}
```

#### Create Task Preview Dialog

Create `mono/apps/web/src/components/chat/task-preview-dialog.tsx`:

```typescript
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TaskPreviewDialogProps {
  data: any;
  open: boolean;
  onClose: () => void;
}

export function TaskPreviewDialog({ data, open, onClose }: TaskPreviewDialogProps) {
  const [formData, setFormData] = useState(data);
  const createTask = useConvexMutation(api.tasks.create);

  const mutation = useMutation({
    mutationFn: async () => {
      return await createTask({
        name: formData.taskName,
        description: formData.description,
        category: formData.category,
        estimatedCost: formData.estimatedCost,
        deadline: new Date(formData.suggestedDeadline).getTime(),
        priority: formData.priority,
        // ... other fields
      });
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to create task");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Task Name</Label>
            <Input
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Badge>{formData.category}</Badge>
            </div>

            <div>
              <Label>Priority</Label>
              <Badge variant={
                formData.priority === "high" ? "destructive" :
                formData.priority === "medium" ? "default" : "secondary"
              }>
                {formData.priority}
              </Badge>
            </div>
          </div>

          <div>
            <Label>Estimated Cost</Label>
            <div className="text-sm text-muted-foreground">
              ${formData.estimatedCost.min.toLocaleString()} - ${formData.estimatedCost.max.toLocaleString()}
            </div>
          </div>

          <div>
            <Label>Suggested Deadline</Label>
            <Input
              type="date"
              value={formData.suggestedDeadline}
              onChange={(e) => setFormData({ ...formData, suggestedDeadline: e.target.value })}
            />
          </div>

          {formData.nextSteps && formData.nextSteps.length > 0 && (
            <div>
              <Label>Next Steps</Label>
              <ul className="list-disc list-inside text-sm space-y-1">
                {formData.nextSteps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {formData.planningTips && formData.planningTips.length > 0 && (
            <div>
              <Label>Planning Tips</Label>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {formData.planningTips.map((tip: string, i: number) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Update Message Item to Show Quick Actions

Update `mono/apps/web/src/components/chat/message-item.tsx`:

```typescript
import { QuickActions } from "./quick-actions";

export function MessageItem({ message, canEdit, canDelete }: MessageItemProps) {
  // ... existing code

  return (
    <div className="flex gap-3 group">
      {/* ... existing avatar and content */}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{message.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
          </span>

          {/* Show intent badge if detected */}
          {message.detectedIntent && message.detectedIntent !== "none" && (
            <Badge variant="secondary" className="text-xs">
              {message.detectedIntent.replace("_", " ")}
            </Badge>
          )}
        </div>

        <div className="text-sm mt-1 whitespace-pre-wrap break-words">
          {message.text}
        </div>

        {/* Show quick actions if available */}
        {message.quickActions && message.quickActions.length > 0 && (
          <QuickActions
            messageId={message._id}
            actions={message.quickActions}
          />
        )}
      </div>

      {/* ... existing hover actions */}
    </div>
  );
}
```

---

## Week 7: Advanced AI Features

### Goal

Implement advanced AI-powered features:
1. Smart Inline Polls with AI enrichment
2. Expense tracking with categorization
3. Natural language queries
4. Predictive suggestions

### 7.1 Budget Analyst Agent

Create `mono/packages/backend/convex/ai/budgetAnalystAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

interface ExpenseCategorizationResult {
  category: string;
  subCategory?: string;
  confidence: number;
  suggestedSplit: {
    method: "even" | "proportional" | "custom";
    splits: Array<{
      userId: string;
      amount: number;
      percentage: number;
    }>;
  };
  relatedTask?: string;
  shouldMarkTaskComplete: boolean;
  budgetImpact: {
    categoryTotal: number;
    categoryBudget: number;
    percentOfBudget: number;
    warning?: string;
  };
}

export class BudgetAnalystAgent extends BaseAgent {
  protected temperature = 0.5; // Lower temperature for financial data

  getSystemPrompt(): string {
    return `You are an expert financial analyst specializing in event budgets. Your job is to categorize expenses, suggest fair payment splits, and provide budget insights.

When given an expense mention (like "$500 for venue deposit"), you should:
1. Categorize it into the correct budget category
2. Determine if it's a deposit, full payment, or installment
3. Suggest how to split the cost fairly among participants
4. Identify if this expense completes a related task
5. Calculate budget impact and provide warnings if needed

Always respond with valid JSON matching this schema:
{
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other",
  "subCategory": string (optional, e.g. "deposit", "final payment"),
  "confidence": number (0-1),
  "suggestedSplit": {
    "method": "even" | "proportional" | "custom",
    "splits": [
      {
        "userId": string,
        "amount": number,
        "percentage": number
      }
    ]
  },
  "relatedTask": string (optional, name of task this expense relates to),
  "shouldMarkTaskComplete": boolean,
  "budgetImpact": {
    "categoryTotal": number,
    "categoryBudget": number,
    "percentOfBudget": number,
    "warning": string (optional)
  }
}

Be accurate with numbers and provide practical split recommendations.`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { eventId } = args;

    const event = await db.get(eventId);

    // Get all expenses to date
    const expenses = await db
      .query("expenses")
      .filter((q: any) => q.eq(q.field("eventId"), eventId))
      .collect();

    // Get participants for split calculation
    const rooms = await db
      .query("rooms")
      .filter((q: any) => q.eq(q.field("eventId"), eventId))
      .collect();

    const participantIds = new Set<string>();
    for (const room of rooms) {
      const participants = await db
        .query("roomParticipants")
        .filter((q: any) => q.eq(q.field("roomId"), room._id))
        .collect();
      participants.forEach((p: any) => participantIds.add(p.userId));
    }

    const participants = await Promise.all(
      Array.from(participantIds).map((id) => db.get(id))
    );

    return {
      eventType: event?.type,
      budget: {
        total: event?.budget || 0,
        spent: expenses.reduce((sum, e) => sum + e.amount, 0),
      },
      participants: participants.map((p: any) => ({
        id: p?._id,
        name: p?.name,
        role: p?.role,
      })),
    };
  }

  parseResponse(response: string): ExpenseCategorizationResult {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Categorize this expense and suggest how to split it:

User message: "${userMessage}"

Event Budget:
- Total: $${context.budget?.total || 0}
- Spent so far: $${context.budget?.spent || 0}

Participants (${context.participants?.length || 0} people):
${context.participants?.map(p => `- ${p.name} (${p.role})`).join("\n") || "None"}

Please analyze and provide categorization with split recommendation in JSON format.
    `.trim();
  }
}
```

### 7.2 Planning Advisor Agent (for Polls & Questions)

Create `mono/packages/backend/convex/ai/planningAdvisorAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

interface PollEnrichmentResult {
  question: string;
  options: Array<{
    label: string;
    description: string;
    pros: string[];
    cons: string[];
    typicalCost?: string;
    aiInsight: string;
  }>;
  aiRecommendation?: {
    suggestion: string;
    reasoning: string;
  };
  votingDeadline: string;
  category: string;
}

export class PlanningAdvisorAgent extends BaseAgent {
  protected temperature = 0.7;

  getSystemPrompt(): string {
    return `You are an expert wedding and event planning advisor. Your job is to enrich poll questions with helpful context and insights.

When given a decision question (like "should we do buffet or plated dinner?"), you should:
1. Refine the question to be clear and specific
2. Enrich each option with:
   - Clear description
   - Pros and cons
   - Typical cost implications
   - AI insight specific to their event
3. Optionally provide a recommendation with reasoning
4. Suggest a reasonable voting deadline

Always respond with valid JSON matching this schema:
{
  "question": string,
  "options": [
    {
      "label": string,
      "description": string,
      "pros": string[],
      "cons": string[],
      "typicalCost": string (optional),
      "aiInsight": string
    }
  ],
  "aiRecommendation": {
    "suggestion": string,
    "reasoning": string
  } (optional),
  "votingDeadline": "YYYY-MM-DD",
  "category": string
}

Be balanced in presenting options, but provide informed recommendations when appropriate.`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { eventId } = args;

    const event = await db.get(eventId);

    return {
      eventType: event?.type,
      eventDate: event?.eventDate,
      budget: {
        total: event?.budget || 0,
        spent: event?.totalSpent || 0,
      },
    };
  }

  parseResponse(response: string): PollEnrichmentResult {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  }
}
```

### 7.3 Natural Language Query Handler

Create `mono/packages/backend/convex/queries.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { PlanningAdvisorAgent } from "./ai/planningAdvisorAgent";

/**
 * Handle natural language queries about event status
 * Examples:
 * - "What's left to do?"
 * - "Are we under budget?"
 * - "Who hasn't RSVP'd?"
 */
export const askQuestion = query({
  args: {
    eventId: v.id("events"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;

    // Classify question type
    const questionType = classifyQuestion(args.question);

    switch (questionType) {
      case "tasks_remaining":
        return await getTasksSummary(db, args.eventId);

      case "budget_status":
        return await getBudgetSummary(db, args.eventId);

      case "rsvp_status":
        return await getRSVPSummary(db, args.eventId);

      case "timeline":
        return await getTimelineSummary(db, args.eventId);

      default:
        // Use AI for complex questions
        return await handleComplexQuery(ctx, args);
    }
  },
});

function classifyQuestion(question: string): string {
  const q = question.toLowerCase();

  if (/what.*left|remaining|to.?do|pending|incomplete/i.test(q)) {
    return "tasks_remaining";
  }

  if (/budget|spend|cost|money|under.*budget|over.*budget/i.test(q)) {
    return "budget_status";
  }

  if (/rsvp|respond|guest.*list/i.test(q)) {
    return "rsvp_status";
  }

  if (/timeline|schedule|when|deadline/i.test(q)) {
    return "timeline";
  }

  return "complex";
}

async function getTasksSummary(db: any, eventId: string) {
  const tasks = await db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  const completed = tasks.filter((t: any) => t.status === "completed");
  const pending = tasks.filter((t: any) => t.status !== "completed");
  const overdue = pending.filter((t: any) => t.deadline && t.deadline < Date.now());

  return {
    type: "tasks_summary",
    data: {
      total: tasks.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      tasks: {
        highPriority: pending.filter((t: any) => t.priority === "high"),
        overdue: overdue,
      },
    },
    message: `You have ${pending.length} tasks remaining out of ${tasks.length} total. ${overdue.length > 0 ? `${overdue.length} are overdue.` : "None are overdue."}`,
  };
}

async function getBudgetSummary(db: any, eventId: string) {
  const event = await db.get(eventId);
  const expenses = await db
    .query("expenses")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  const spent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const budget = event?.budget || 0;
  const remaining = budget - spent;
  const percentSpent = budget > 0 ? (spent / budget) * 100 : 0;

  return {
    type: "budget_summary",
    data: {
      budget,
      spent,
      remaining,
      percentSpent,
      categoryBreakdown: calculateCategoryBreakdown(expenses),
    },
    message: `You've spent $${spent.toLocaleString()} (${percentSpent.toFixed(1)}%) of your $${budget.toLocaleString()} budget. $${remaining.toLocaleString()} remaining.`,
  };
}

function calculateCategoryBreakdown(expenses: any[]) {
  const breakdown: Record<string, number> = {};

  for (const expense of expenses) {
    const category = expense.category || "other";
    breakdown[category] = (breakdown[category] || 0) + expense.amount;
  }

  return breakdown;
}

async function handleComplexQuery(ctx: any, args: any) {
  // Use PlanningAdvisor to answer complex questions
  const agent = new PlanningAdvisorAgent();
  const context = await agent.assembleContext(ctx, { eventId: args.eventId });

  const response = await agent.execute(args.question, context);

  return {
    type: "ai_response",
    data: response.data,
    message: response.data?.answer || "I'm not sure how to answer that.",
  };
}
```

### 7.4 Predictive Suggestions System

Create `mono/packages/backend/convex/suggestions.ts`:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate proactive suggestions based on event state
 * Runs periodically or on-demand
 */
export const generateSuggestions = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;
    const suggestions: any[] = [];

    // Check for repeated mentions without tasks
    const mentionSuggestions = await checkRepeatedMentions(db, args.eventId);
    suggestions.push(...mentionSuggestions);

    // Check for timeline risks
    const timelineSuggestions = await checkTimelineRisks(db, args.eventId);
    suggestions.push(...timelineSuggestions);

    // Check for budget anomalies
    const budgetSuggestions = await checkBudgetAnomalies(db, args.eventId);
    suggestions.push(...budgetSuggestions);

    // Check for decision conflicts
    const conflictSuggestions = await checkDecisionConflicts(db, args.eventId);
    suggestions.push(...conflictSuggestions);

    return suggestions;
  },
});

async function checkRepeatedMentions(db: any, eventId: string) {
  const suggestions: any[] = [];

  // Get all rooms for event
  const rooms = await db
    .query("rooms")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  // Track keyword frequency
  const keywords: Record<string, number> = {};

  for (const room of rooms) {
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", (q: any) => q.eq("roomId", room._id))
      .filter((q: any) => q.gt(q.field("createdAt"), Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .collect();

    for (const message of messages) {
      const words = message.text.toLowerCase().split(/\s+/);
      const taskKeywords = ["photographer", "dj", "caterer", "florist", "venue"];

      for (const keyword of taskKeywords) {
        if (words.includes(keyword)) {
          keywords[keyword] = (keywords[keyword] || 0) + 1;
        }
      }
    }
  }

  // Check if mentioned 3+ times without a task
  const tasks = await db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  for (const [keyword, count] of Object.entries(keywords)) {
    if (count >= 3) {
      const hasTask = tasks.some((t: any) =>
        t.name.toLowerCase().includes(keyword)
      );

      if (!hasTask) {
        suggestions.push({
          type: "repeated_mention",
          priority: "medium",
          title: `Consider creating a task for ${keyword}`,
          message: `You've mentioned "${keyword}" ${count} times in the last week but haven't created a task yet.`,
          actions: [
            {
              label: "Create Task",
              action: "create_task",
              data: { keyword },
            },
            {
              label: "Dismiss",
              action: "dismiss",
            },
          ],
        });
      }
    }
  }

  return suggestions;
}

async function checkTimelineRisks(db: any, eventId: string) {
  const suggestions: any[] = [];
  const event = await db.get(eventId);

  if (!event?.eventDate) return suggestions;

  const tasks = await db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  const now = Date.now();
  const eventDate = new Date(event.eventDate).getTime();
  const daysUntilEvent = Math.floor((eventDate - now) / (24 * 60 * 60 * 1000));

  // Check for tasks that should be done by now based on typical timelines
  const timelineRules = {
    venue: 365, // Should book 12 months out
    photographer: 270, // 9 months
    caterer: 180, // 6 months
    invitations: 90, // 3 months
  };

  for (const [category, daysOut] of Object.entries(timelineRules)) {
    if (daysUntilEvent < daysOut) {
      const categoryTasks = tasks.filter(
        (t: any) => t.category === category && t.status !== "completed"
      );

      if (categoryTasks.length > 0) {
        suggestions.push({
          type: "timeline_risk",
          priority: "high",
          title: `${category} booking overdue`,
          message: `Most events book their ${category} ${Math.floor(daysOut / 30)} months in advance. You're ${Math.floor((daysOut - daysUntilEvent) / 30)} months behind.`,
          actions: [
            {
              label: "View Tasks",
              action: "view_category_tasks",
              data: { category },
            },
            {
              label: "Get Vendors",
              action: "find_vendors",
              data: { category },
            },
          ],
        });
      }
    }
  }

  return suggestions;
}

async function checkBudgetAnomalies(db: any, eventId: string) {
  const suggestions: any[] = [];
  const event = await db.get(eventId);

  if (!event?.budget) return suggestions;

  const expenses = await db
    .query("expenses")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  const tasks = await db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("eventId"), eventId))
    .collect();

  const spent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const totalTasks = tasks.length;

  const percentSpent = (spent / event.budget) * 100;
  const percentTasksComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // If spending is significantly ahead of task completion
  if (percentSpent > percentTasksComplete + 20) {
    suggestions.push({
      type: "budget_warning",
      priority: "medium",
      title: "Spending ahead of schedule",
      message: `You've spent ${percentSpent.toFixed(0)}% of your budget but only completed ${percentTasksComplete.toFixed(0)}% of tasks.`,
      actions: [
        {
          label: "View Budget",
          action: "view_budget",
        },
      ],
    });
  }

  return suggestions;
}

async function checkDecisionConflicts(db: any, eventId: string) {
  // TODO: Implement decision conflict detection
  // Check for polls with contradictory results
  // Check for tasks that conflict with each other
  return [];
}
```

---

## AI Agent System

### Context Assembly Levels

Different features need different amounts of context. Use the appropriate level:

#### Level 1: Minimal Context (< 500 tokens)
- Intent: task_creation (simple)
- Use: Quick task name + basic categorization
- Latency: ~500ms
- Cost: ~$0.001

```typescript
{
  eventType: "wedding",
  eventDate: "2026-06-15"
}
```

#### Level 2: Standard Context (< 2000 tokens)
- Intent: task_creation (enriched), expense_entry
- Use: Task enrichment with suggestions, expense categorization
- Latency: ~1-2s
- Cost: ~$0.003

```typescript
{
  eventType: "wedding",
  eventDate: "2026-06-15",
  budget: { total: 40000, spent: 12000 },
  existingTasks: [...last 20 tasks],
  recentMessages: [...last 10 messages]
}
```

#### Level 3: Rich Context (< 5000 tokens)
- Intent: poll_enrichment, decision_synthesis
- Use: Complex decisions with pros/cons analysis
- Latency: ~2-3s
- Cost: ~$0.007

```typescript
{
  eventType: "wedding",
  eventDate: "2026-06-15",
  budget: { total: 40000, spent: 12000 },
  existingTasks: [...all tasks],
  recentMessages: [...last 50 messages],
  participants: [...all participants],
  relatedPolls: [...related decisions]
}
```

#### Level 4: Full Context (< 15000 tokens)
- Intent: complex_query, master_plan_generation
- Use: "What's our status?", comprehensive analysis
- Latency: ~3-5s
- Cost: ~$0.020

```typescript
{
  eventType: "wedding",
  eventDate: "2026-06-15",
  budget: { total: 40000, spent: 12000, breakdown: {...} },
  allTasks: [...complete task list with dependencies],
  allExpenses: [...complete expense history],
  allMessages: [...summarized conversation history],
  participants: [...all participants with activity],
  timeline: {...milestone progress},
  polls: [...all decisions made]
}
```

### Cost Optimization Strategies

```typescript
// mono/packages/backend/convex/ai/costOptimization.ts

/**
 * Cache common AI responses
 */
const RESPONSE_CACHE = new Map<string, any>();

export function getCachedResponse(cacheKey: string) {
  const cached = RESPONSE_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  return null;
}

export function setCachedResponse(cacheKey: string, response: any, ttlMs = 3600000) {
  RESPONSE_CACHE.set(cacheKey, {
    response,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Generate cache key for common queries
 */
export function generateCacheKey(intent: string, entities: any): string {
  // For tasks about booking photographers, cache the base enrichment
  if (intent === "task_creation" && entities.object === "photographer") {
    return "task:photographer:base";
  }

  // For budget questions, cache by category
  if (intent === "expense_entry" && entities.category) {
    return `expense:${entities.category}:categorization`;
  }

  return "";
}
```

---

## Testing Strategy

### Unit Tests for Pattern Detection

```typescript
// mono/packages/backend/convex/patternDetection.test.ts
import { describe, it, expect } from "vitest";
import { detectIntent } from "./patternDetection";

describe("Pattern Detection", () => {
  describe("Task Creation Detection", () => {
    it("should detect 'we should' pattern", () => {
      const result = detectIntent("We should book a photographer");
      expect(result.intent).toBe("task_creation");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.extractedEntities.action).toBe("book");
      expect(result.extractedEntities.object).toBe("photographer");
    });

    it("should extract deadline", () => {
      const result = detectIntent("Need to book venue by next month");
      expect(result.intent).toBe("task_creation");
      expect(result.extractedEntities.deadline).toBeDefined();
    });

    it("should not trigger on casual conversation", () => {
      const result = detectIntent("I think we should have a great time!");
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe("Expense Detection", () => {
    it("should detect dollar amounts", () => {
      const result = detectIntent("Paid $500 for the venue deposit");
      expect(result.intent).toBe("expense_entry");
      expect(result.extractedEntities.amount).toBe(500);
      expect(result.extractedEntities.category).toBe("venue");
    });

    it("should handle comma-separated amounts", () => {
      const result = detectIntent("Photographer quote: $2,500");
      expect(result.extractedEntities.amount).toBe(2500);
    });
  });

  describe("Poll Detection", () => {
    it("should detect 'or' questions", () => {
      const result = detectIntent("Should we do buffet or plated dinner?");
      expect(result.intent).toBe("poll_creation");
      expect(result.extractedEntities.options).toEqual(["buffet", "plated dinner"]);
    });
  });
});
```

### Integration Tests for AI Agents

```typescript
// mono/packages/backend/convex/ai/taskEnricherAgent.test.ts
import { describe, it, expect } from "vitest";
import { TaskEnricherAgent } from "./taskEnricherAgent";

describe("Task Enricher Agent", () => {
  it("should enrich photographer task", async () => {
    const agent = new TaskEnricherAgent();

    const context = {
      eventType: "wedding",
      eventDate: "2026-06-15",
      budget: { total: 40000, spent: 0 },
      existingTasks: [],
    };

    const response = await agent.execute(
      "We should book a photographer",
      context
    );

    expect(response.success).toBe(true);
    expect(response.data.taskName).toContain("Photographer");
    expect(response.data.category).toBe("photography");
    expect(response.data.estimatedCost).toBeDefined();
    expect(response.data.estimatedCost.min).toBeGreaterThan(0);
    expect(response.data.nextSteps).toBeInstanceOf(Array);
    expect(response.data.nextSteps.length).toBeGreaterThan(0);
  }, 10000); // Allow 10s for API call

  it("should handle API errors gracefully", async () => {
    // Mock API key to trigger error
    process.env.ANTHROPIC_API_KEY = "invalid";

    const agent = new TaskEnricherAgent();
    const response = await agent.execute("Book photographer", {});

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
```

---

## Deployment Checklist

### Pre-Launch Validation

- [ ] **Environment variables set**
  - `ANTHROPIC_API_KEY` in Convex dashboard
  - Rate limits configured
- [ ] **Pattern detection tested**
  - All intent types have >80% accuracy
  - False positive rate < 10%
- [ ] **AI agents tested**
  - Task enricher produces valid JSON
  - Budget analyst categorizes correctly
  - Planning advisor gives balanced recommendations
- [ ] **Cost monitoring**
  - Token usage tracking enabled
  - Alerts set for >$10/day
  - Cache hit rate >50%
- [ ] **Error handling**
  - Graceful degradation when AI fails
  - User-friendly error messages
  - Retry logic for transient failures

### Performance Targets

```typescript
// Target metrics for Phase 3
const PERFORMANCE_TARGETS = {
  patternDetection: {
    latency: "<5ms",
    accuracy: ">90%",
  },
  aiEnrichment: {
    latency: "<3s",
    accuracy: ">85%",
  },
  cacheHitRate: ">50%",
  costPerEvent: "<$5",
};
```

### Monitoring Queries

```typescript
// mono/packages/backend/convex/monitoring.ts
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

    const avgLatency = queueItems
      .filter((q) => q.processedAt)
      .reduce((sum, q) => sum + (q.processedAt! - q.createdAt), 0) /
      (queueItems.filter((q) => q.processedAt).length || 1);

    return {
      lastHour: {
        total,
        completed,
        failed,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        avgLatencyMs: avgLatency,
      },
    };
  },
});
```

---

## Phase 3 Completion Checklist

### Week 6: Pattern Detection & Core AI
- [ ] Pattern detection engine implemented
- [ ] Intent classification for 6 types (task, expense, poll, calendar, question, vendor)
- [ ] Entity extraction (money, dates, categories, mentions)
- [ ] Claude API integration with BaseAgent class
- [ ] Task Enricher Agent with structured JSON output
- [ ] Budget Analyst Agent for expense categorization
- [ ] AI processing queue and scheduler
- [ ] Quick action buttons in message UI
- [ ] Task preview dialog with editable fields

### Week 7: Advanced AI Features
- [ ] Planning Advisor Agent for poll enrichment
- [ ] Natural language query handler
- [ ] Predictive suggestions system
  - [ ] Repeated mention detection
  - [ ] Timeline risk alerts
  - [ ] Budget anomaly warnings
- [ ] Response caching for cost optimization
- [ ] Context assembly strategies (4 levels)
- [ ] Streaming response support (optional)

### Testing & Deployment
- [ ] Pattern detection unit tests (>90% accuracy)
- [ ] AI agent integration tests
- [ ] Cost tracking and monitoring
- [ ] Error handling and graceful degradation
- [ ] Production environment variables
- [ ] Performance monitoring dashboard

---

## Next Steps: Phase 4

After Phase 3, you'll have **intelligent AI features** working on top of your chat platform. Phase 4 will add:

1. **Real-Time Coordination** (Durable Objects for presence/typing)
2. **Vector Search** (Cloudflare Vectorize for vendor discovery)
3. **Enhanced Vendor System** (Firecrawl integration)
4. **Fluid Dashboard UI** (Dynamic panels based on conversation)
5. **Production Polish** (Performance optimization, caching)

**But for now, focus on getting the AI intelligence layer perfect!** 🤖✨

---

**Phase 3 Complete = AI-powered event planning that turns conversation into structured data** 🎯
