# Phase 3.0: Pattern Detection Foundation
## Building the Intelligence Detection Layer

> **Status:** Phase 3.0 - Pattern Detection (Day 1-2)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 2 Complete (Real-Time Chat)
> **Next Phase:** Phase 3.1 (Claude API Integration)

---

## Overview

This phase builds the **pattern detection engine** - the first layer of our AI intelligence system. We'll use regex patterns and entity extraction to detect user intents WITHOUT calling AI yet. This creates a fast, cost-free filter that identifies which messages warrant AI enrichment.

### What You'll Build

- ✅ Intent classification system (7 intent types)
- ✅ Entity extraction (money, dates, categories, mentions)
- ✅ Confidence scoring algorithm
- ✅ Schema updates for AI metadata
- ✅ Integration into message pipeline
- ✅ Unit tests for pattern matching

### Why Pattern Detection First?

| Approach | Cost per 1K Messages | Latency | Accuracy |
|----------|---------------------|---------|----------|
| AI-Only | $2-5 | 1-3s | 95% |
| Regex-Only | $0 | <5ms | 70% |
| **Pattern + AI** | **$0.10-0.50** | **50-500ms** | **92%** |

**Decision:** Use patterns to filter 90% of messages, only invoke AI for high-confidence (>0.7) intents.

---

## Step 1: Create Pattern Detection Types

Create `mono/packages/backend/convex/patternDetection.ts`:

```typescript
import { v } from "convex/values";

/**
 * Intent types that can be detected in messages
 */
export type Intent =
  | "task_creation"      // "we should book a photographer"
  | "expense_entry"      // "paid $500 for venue deposit"
  | "poll_creation"      // "should we do buffet or plated?"
  | "calendar_event"     // "meeting next Tuesday at 2pm"
  | "question"          // "what's our budget status?"
  | "decision"          // "let's go with option A"
  | "vendor_mention"    // "looking for a good caterer"
  | "none";             // no clear intent

/**
 * Confidence levels for intent detection
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Result of pattern detection analysis
 */
export interface DetectionResult {
  intent: Intent;
  confidence: number; // 0-1
  confidenceLevel: Confidence;
  extractedEntities: {
    action?: string;           // "book", "hire", "find"
    object?: string;           // "photographer", "venue"
    deadline?: string;         // "next Tuesday", "Nov 15"
    amount?: number;           // 500.00
    currency?: string;         // "USD"
    category?: string;         // "venue", "catering"
    options?: string[];        // ["buffet", "plated dinner"]
    mentions?: string[];       // User IDs from @mentions
  };
  triggerAI: boolean;         // true if confidence >= 0.7
  reasoning?: string;         // debug info
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

  decision: [
    /let's go with\s+(.+)/i,
    /i vote for\s+(.+)/i,
    /(?:decided|choosing|picking)\s+(.+)/i,
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
 * Analyzes message text and returns detected intent with confidence
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

        // Return first high-confidence match
        if (result.confidence >= 0.7) {
          return result;
        }
      }
    }
  }

  // No high-confidence match found
  return {
    intent: "none",
    confidence: 0,
    confidenceLevel: "low",
    extractedEntities: {},
    triggerAI: false,
  };
}

/**
 * Build detection result with entity extraction and confidence scoring
 */
function buildDetectionResult(
  intent: Intent,
  text: string,
  match: RegExpMatchArray
): DetectionResult {
  const entities: DetectionResult["extractedEntities"] = {};
  let confidence = 0.5; // Base confidence for any match

  switch (intent) {
    case "task_creation":
      // Extract action verb (book, hire, etc)
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
    reasoning: `Matched ${intent} with ${Object.keys(entities).length} entities`,
  };
}

/**
 * Batch detection for multiple messages
 */
export function detectIntentsInBatch(messages: string[]): DetectionResult[] {
  return messages.map(detectIntent);
}
```

---

## Step 2: Update Database Schema

Add AI metadata fields to `mono/packages/backend/convex/schema.ts`:

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

    // AI Detection metadata (NEW)
    detectedIntent: v.optional(v.union(
      v.literal("task_creation"),
      v.literal("expense_entry"),
      v.literal("poll_creation"),
      v.literal("calendar_event"),
      v.literal("question"),
      v.literal("decision"),
      v.literal("vendor_mention"),
      v.literal("none")
    )),
    intentConfidence: v.optional(v.number()),
    extractedEntities: v.optional(v.any()),

    // Quick actions generated by AI (for Phase 3.2)
    quickActions: v.optional(v.array(v.object({
      label: v.string(),
      action: v.string(),
      data: v.optional(v.any()),
    }))),

    // Existing fields
    replyToId: v.optional(v.id("messages")),
    attachments: v.optional(v.array(v.object({
      type: v.string(),
      url: v.string(),
      name: v.optional(v.string()),
    }))),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      userId: v.id("users"),
      userName: v.string(),
    }))),
    isEdited: v.boolean(),
    isDeleted: v.boolean(),
    isAIGenerated: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_room_and_created", ["roomId", "createdAt"])
    .index("by_author", ["authorId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["roomId", "isDeleted"],
    }),

  // AI Processing Queue (NEW - for Phase 3.1)
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

Run schema migration:

```bash
cd mono/packages/backend
npx convex dev
```

---

## Step 3: Integrate Pattern Detection into Message Pipeline

Update `mono/packages/backend/convex/messages.ts`:

```typescript
import { detectIntent } from "./patternDetection";
import { mutation } from "./_generated/server";
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

    // STEP 1: Pattern Detection Analysis
    const detection = detectIntent(args.text);

    console.log("Pattern detection result:", {
      intent: detection.intent,
      confidence: detection.confidence,
      triggerAI: detection.triggerAI,
      entities: detection.extractedEntities,
    });

    // STEP 2: Insert message with detection metadata
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

    // STEP 3: Queue for AI processing if high confidence
    // (This will be implemented in Phase 3.1)
    if (detection.triggerAI) {
      console.log(`High confidence (${detection.confidence.toFixed(2)}) - would queue for AI processing`);

      // TODO Phase 3.1: Queue AI processing
      // await ctx.db.insert("aiProcessingQueue", {
      //   messageId,
      //   roomId: args.roomId,
      //   intent: detection.intent,
      //   confidence: detection.confidence,
      //   entities: detection.extractedEntities,
      //   status: "pending",
      //   createdAt: Date.now(),
      // });
    }

    // STEP 4: Update room metadata
    await ctx.db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});
```

---

## Step 4: Add Unit Tests

Create `mono/packages/backend/convex/patternDetection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectIntent } from "./patternDetection";

describe("Pattern Detection", () => {
  describe("Task Creation Detection", () => {
    it("should detect 'we should' pattern", () => {
      const result = detectIntent("We should book a photographer");
      expect(result.intent).toBe("task_creation");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.triggerAI).toBe(true);
      expect(result.extractedEntities.object).toBe("photographer");
    });

    it("should detect 'need to' pattern", () => {
      const result = detectIntent("Need to hire a caterer by next month");
      expect(result.intent).toBe("task_creation");
      expect(result.extractedEntities.action).toBe("hire");
      expect(result.extractedEntities.deadline).toBeDefined();
    });

    it("should extract category from task", () => {
      const result = detectIntent("We should book a venue ASAP");
      expect(result.extractedEntities.category).toBe("venue");
    });

    it("should NOT trigger on casual conversation", () => {
      const result = detectIntent("I think we should have a great time!");
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.triggerAI).toBe(false);
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

    it("should detect various payment terms", () => {
      const tests = [
        "Spent $1200 on catering",
        "Invoice for $800 received",
        "Deposit of $500 paid",
      ];

      tests.forEach(text => {
        const result = detectIntent(text);
        expect(result.intent).toBe("expense_entry");
        expect(result.extractedEntities.amount).toBeGreaterThan(0);
      });
    });
  });

  describe("Poll Detection", () => {
    it("should detect 'or' questions", () => {
      const result = detectIntent("Should we do buffet or plated dinner?");
      expect(result.intent).toBe("poll_creation");
      expect(result.extractedEntities.options).toEqual(["buffet", "plated dinner"]);
    });

    it("should detect preference questions", () => {
      const result = detectIntent("What do you prefer for the venue?");
      expect(result.intent).toBe("poll_creation");
    });
  });

  describe("Calendar Event Detection", () => {
    it("should detect meeting scheduling", () => {
      const result = detectIntent("Let's schedule a tasting next Tuesday");
      expect(result.intent).toBe("calendar_event");
      expect(result.extractedEntities.deadline).toContain("Tuesday");
    });

    it("should extract time from message", () => {
      const result = detectIntent("Meeting tomorrow at 2pm");
      expect(result.extractedEntities.deadline).toContain("2pm");
    });
  });

  describe("Question Detection", () => {
    it("should detect questions", () => {
      const questions = [
        "What's our budget?",
        "When is the venue booking due?",
        "How many guests have RSVP'd?",
      ];

      questions.forEach(q => {
        const result = detectIntent(q);
        expect(result.intent).toBe("question");
      });
    });
  });

  describe("Confidence Scoring", () => {
    it("should have higher confidence with more entities", () => {
      const simple = detectIntent("We should book photographer");
      const detailed = detectIntent("We should book a photographer by next Tuesday for the venue");

      expect(detailed.confidence).toBeGreaterThan(simple.confidence);
    });

    it("should trigger AI only for confidence >= 0.7", () => {
      const highConfidence = detectIntent("Need to book venue deposit $500 by Nov 15");
      const lowConfidence = detectIntent("we should maybe think about stuff");

      expect(highConfidence.triggerAI).toBe(true);
      expect(lowConfidence.triggerAI).toBe(false);
    });
  });
});
```

Add test script to `mono/packages/backend/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

Run tests:

```bash
cd mono/packages/backend
bun test
```

---

## Step 5: Test Pattern Detection

Create a test script `mono/packages/backend/scripts/test-patterns.ts`:

```typescript
import { detectIntent } from "../convex/patternDetection";

const testMessages = [
  "We should book a photographer",
  "Paid $500 for venue deposit",
  "Should we do buffet or plated dinner?",
  "Let's schedule a tasting next Tuesday at 2pm",
  "What's our budget status?",
  "I vote for option A",
  "Looking for a good florist",
  "Hey everyone, how's it going?", // should be 'none'
];

console.log("Testing Pattern Detection\n");
console.log("=".repeat(80));

testMessages.forEach((message, i) => {
  const result = detectIntent(message);

  console.log(`\nTest ${i + 1}: "${message}"`);
  console.log(`Intent: ${result.intent}`);
  console.log(`Confidence: ${result.confidence.toFixed(2)} (${result.confidenceLevel})`);
  console.log(`Trigger AI: ${result.triggerAI ? "YES" : "NO"}`);
  console.log(`Entities:`, result.extractedEntities);
  console.log("-".repeat(80));
});
```

Run it:

```bash
cd mono/packages/backend
bun scripts/test-patterns.ts
```

---

## Testing Checklist

Test these scenarios in your app:

- [ ] **Task creation patterns**
  - "We should book a photographer" → task_creation, high confidence
  - "Need to hire caterer by Nov 15" → extracts deadline
  - "Let's find a venue" → extracts action + object

- [ ] **Expense patterns**
  - "Paid $500 for venue" → extracts $500, category "venue"
  - "$2,500 photographer deposit" → handles comma formatting
  - "Invoice for $1200 catering" → detects multiple keywords

- [ ] **Poll patterns**
  - "Should we do X or Y?" → extracts both options
  - "What do you prefer?" → detects poll intent

- [ ] **Edge cases**
  - "we should have fun!" → LOW confidence, doesn't trigger AI
  - "This costs $50 but whatever" → might detect expense
  - Messages with @mentions → extracts mention user IDs

- [ ] **Performance**
  - Pattern detection completes in <5ms
  - No errors in console
  - Schema migration successful

---

## Success Criteria

✅ **Pattern detection engine runs on every message**
✅ **7 intent types classified with >70% accuracy**
✅ **Entity extraction works (money, dates, categories)**
✅ **Confidence scoring differentiates high/medium/low**
✅ **Messages with confidence ≥0.7 flagged for AI (but not yet processed)**
✅ **Unit tests pass with >90% accuracy**
✅ **Database schema updated with AI metadata fields**

---

## What's Next: Phase 3.1

In the next phase, we'll:
1. Set up Claude API integration
2. Create the BaseAgent architecture
3. Implement the AI processing queue
4. Build our first AI agent (Task Enricher)

For now, pattern detection is logging which messages WOULD be sent to AI, but not actually calling it yet.

---

## Debug Commands

```bash
# Check pattern detection in messages
cd mono/packages/backend
npx convex logs

# Run unit tests
bun test

# Test specific message
bun scripts/test-patterns.ts
```

---

**Phase 3.0 Complete = Messages are analyzed and flagged for AI processing** 🎯
**Next: Phase 3.1 - Actually call Claude API for enrichment** 🤖
