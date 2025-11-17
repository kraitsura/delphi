# Phase 3.4: Planning Advisor & Poll Enrichment
## AI-Enhanced Decision Making with Contextual Analysis

> **Status:** Phase 3.4 - Planning Intelligence (Day 9-10)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.3 Complete (Budget Intelligence)
> **Next Phase:** Phase 3.5 (Natural Language Queries)

---

## Overview

Transform decision questions like "should we do buffet or plated dinner?" into **enriched polls** with pros/cons analysis, cost implications, and AI recommendations based on event context.

### What You'll Build

- ✅ Planning Advisor Agent
- ✅ Poll enrichment with pros/cons for each option
- ✅ Cost implications analysis
- ✅ AI recommendation with reasoning
- ✅ Context-aware advice (event type, budget, date)
- ✅ Enhanced poll creation UI

---

## Step 1: Create Poll Schema

```typescript
polls: defineTable({
  eventId: v.id("events"),
  roomId: v.id("rooms"),
  question: v.string(),
  category: v.optional(v.string()),
  options: v.array(v.object({
    label: v.string(),
    description: v.optional(v.string()),
    pros: v.optional(v.array(v.string())),
    cons: v.optional(v.array(v.string())),
    typicalCost: v.optional(v.string()),
    aiInsight: v.optional(v.string()),
    votes: v.array(v.id("users")),
  })),
  aiRecommendation: v.optional(v.object({
    suggestion: v.string(),
    reasoning: v.string(),
  })),
  votingDeadline: v.optional(v.number()),
  aiGenerated: v.optional(v.boolean()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  closedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId"])
  .index("by_room", ["roomId"]),
```

---

## Step 2: Create Planning Advisor Agent

Create `mono/packages/backend/convex/ai/planningAdvisorAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

export interface PollEnrichmentResult {
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
  protected maxTokens = 3500;

  getSystemPrompt(): string {
    return `You are an expert wedding and event planning advisor.

When given a decision question (like "should we do buffet or plated dinner?"), enrich it with:

1. **Refined question** - Clear and specific
2. **For each option:**
   - Description
   - Pros (2-4 benefits)
   - Cons (2-4 drawbacks)
   - Typical cost implications
   - AI insight specific to their event
3. **AI Recommendation** (optional but encouraged)
   - Which option you suggest
   - Clear reasoning based on their event details
4. **Voting deadline** - Reasonable timeframe

Respond with valid JSON:
{
  "question": string,
  "options": [
    {
      "label": string,
      "description": string,
      "pros": string[],
      "cons": string[],
      "typicalCost": string,
      "aiInsight": string
    }
  ],
  "aiRecommendation": {
    "suggestion": string,
    "reasoning": string
  },
  "votingDeadline": "YYYY-MM-DD",
  "category": string
}

Be balanced but provide informed recommendations.`;
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

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Enrich this decision question:

Question: "${userMessage}"

Event Context:
- Type: ${context.eventType}
- Date: ${context.eventDate || "TBD"}
- Budget: $${context.budget?.total?.toLocaleString() || 0}
- Spent: $${context.budget?.spent?.toLocaleString() || 0}

Provide enriched poll with analysis in JSON format.
    `.trim();
  }
}
```

---

## Step 3: Add Poll Processing

Update `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
case "poll_creation":
  const advisor = new PlanningAdvisorAgent();
  const pollContext = await advisor.assembleContext(ctx, {
    eventId: room.eventId,
  });

  const pollResponse = await advisor.execute(message.text, pollContext);

  if (!pollResponse.success) {
    throw new Error(pollResponse.error || "AI processing failed");
  }

  result = pollResponse.data;

  quickActions = [
    {
      label: "Create Poll",
      action: "create_poll",
      data: result,
    },
    {
      label: "Dismiss",
      action: "dismiss",
    },
  ];

  await db.patch(args.messageId, { quickActions });
  break;
```

---

## Step 4: Create Poll Mutations

Create `mono/packages/backend/convex/polls.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    question: v.string(),
    category: v.optional(v.string()),
    options: v.array(v.any()),
    aiRecommendation: v.optional(v.any()),
    votingDeadline: v.optional(v.number()),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;

    return await ctx.db.insert("polls", {
      eventId: args.eventId,
      roomId: args.roomId,
      question: args.question,
      category: args.category,
      options: args.options.map((opt: any) => ({
        ...opt,
        votes: [],
      })),
      aiRecommendation: args.aiRecommendation,
      votingDeadline: args.votingDeadline,
      aiGenerated: args.aiGenerated || false,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const vote = mutation({
  args: {
    pollId: v.id("polls"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    // Remove vote from all options
    const updatedOptions = poll.options.map((opt, i) => ({
      ...opt,
      votes: opt.votes.filter(v => v !== userId),
    }));

    // Add vote to selected option
    updatedOptions[args.optionIndex].votes.push(userId);

    await ctx.db.patch(args.pollId, {
      options: updatedOptions,
    });
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("polls")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});
```

---

## Step 5: Build Poll Preview Dialog

Create `mono/apps/web/src/components/chat/poll-preview-dialog.tsx`:

```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Lightbulb, ThumbsUp, ThumbsDown, DollarSign } from "lucide-react";
import { toast } from "sonner";

export function PollPreviewDialog({ data, open, onClose, onSuccess }: any) {
  const createPoll = useConvexMutation(api.polls.create);

  const mutation = useMutation({
    mutationFn: async () => {
      const eventId = "your-event-id"; // TODO
      const roomId = "your-room-id"; // TODO

      return await createPoll({
        eventId: eventId as any,
        roomId: roomId as any,
        question: data.question,
        category: data.category,
        options: data.options,
        aiRecommendation: data.aiRecommendation,
        votingDeadline: data.votingDeadline ? new Date(data.votingDeadline).getTime() : undefined,
        aiGenerated: true,
      });
    },
    onSuccess: () => {
      toast.success("Poll created!");
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.question}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Recommendation */}
          {data.aiRecommendation && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
              <div className="flex gap-2 items-start">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold">AI Recommendation: {data.aiRecommendation.suggestion}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {data.aiRecommendation.reasoning}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Options */}
          <div className="space-y-3">
            {data.options.map((option: any, i: number) => (
              <Card key={i} className="p-4">
                <div className="font-semibold text-lg mb-2">{option.label}</div>
                <div className="text-sm text-muted-foreground mb-3">
                  {option.description}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-1 text-green-600 mb-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span className="text-xs font-semibold">Pros</span>
                    </div>
                    <ul className="text-xs space-y-1">
                      {option.pros?.map((pro: string, j: number) => (
                        <li key={j}>• {pro}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-red-600 mb-1">
                      <ThumbsDown className="h-3 w-3" />
                      <span className="text-xs font-semibold">Cons</span>
                    </div>
                    <ul className="text-xs space-y-1">
                      {option.cons?.map((con: string, j: number) => (
                        <li key={j}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {option.typicalCost && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>{option.typicalCost}</span>
                  </div>
                )}

                {option.aiInsight && (
                  <div className="mt-2 text-xs italic text-muted-foreground">
                    💡 {option.aiInsight}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Testing Checklist

- [ ] "Should we do buffet or plated?" → Creates enriched poll
- [ ] Each option has pros/cons
- [ ] Cost implications shown
- [ ] AI recommendation makes sense
- [ ] Poll created successfully

---

## Success Criteria

✅ **Planning Advisor enriches polls with context**
✅ **Pros/cons analysis for each option**
✅ **AI recommendations are insightful**
✅ **Poll preview shows all enrichments**
✅ **Polls created successfully**

---

**Phase 3.4 Complete = AI-enriched decision making** 📊
**Next: Phase 3.5 - Natural language queries** 💬
