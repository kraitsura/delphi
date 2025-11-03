# Phase 3.5: Natural Language Queries
## Ask Questions About Your Event in Plain English

> **Status:** Phase 3.5 - Query Intelligence (Day 11)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.4 Complete (Planning Advisor)
> **Next Phase:** Phase 3.6 (Predictive Suggestions)

---

## Overview

Enable users to ask questions like "What's left to do?", "Are we under budget?", or "Who hasn't RSVP'd?" and get instant, structured answers.

### What You'll Build

- ✅ Query classification system
- ✅ Structured query handlers (tasks, budget, RSVP, timeline)
- ✅ AI fallback for complex questions
- ✅ Query UI component

---

## Step 1: Create Query Classification

Create `mono/packages/backend/convex/queries.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const askQuestion = query({
  args: {
    eventId: v.id("events"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;

    const questionType = classifyQuestion(args.question);

    switch (questionType) {
      case "tasks_remaining":
        return await getTasksSummary(db, args.eventId);

      case "budget_status":
        return await getBudgetSummary(db, args.eventId);

      case "timeline":
        return await getTimelineSummary(db, args.eventId);

      default:
        return { type: "unknown", message: "I'm not sure how to answer that yet." };
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

  if (/timeline|schedule|when|deadline/i.test(q)) {
    return "timeline";
  }

  return "complex";
}

async function getTasksSummary(db: any, eventId: string) {
  const tasks = await db
    .query("tasks")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
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
      highPriority: pending.filter((t: any) => t.priority === "high"),
    },
    message: `You have ${pending.length} tasks remaining out of ${tasks.length} total. ${overdue.length > 0 ? `${overdue.length} are overdue.` : "None are overdue."}`,
  };
}

async function getBudgetSummary(db: any, eventId: string) {
  const event = await db.get(eventId);
  const expenses = await db
    .query("expenses")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
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
    },
    message: `You've spent $${spent.toLocaleString()} (${percentSpent.toFixed(1)}%) of your $${budget.toLocaleString()} budget. $${remaining.toLocaleString()} remaining.`,
  };
}

async function getTimelineSummary(db: any, eventId: string) {
  const event = await db.get(eventId);
  const tasks = await db
    .query("tasks")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  if (!event?.eventDate) {
    return {
      type: "timeline_summary",
      message: "No event date set yet.",
    };
  }

  const now = Date.now();
  const eventDate = new Date(event.eventDate).getTime();
  const daysUntil = Math.floor((eventDate - now) / (24 * 60 * 60 * 1000));

  const upcomingDeadlines = tasks
    .filter((t: any) => t.deadline && t.deadline > now && t.status !== "completed")
    .sort((a: any, b: any) => a.deadline - b.deadline)
    .slice(0, 5);

  return {
    type: "timeline_summary",
    data: {
      daysUntilEvent: daysUntil,
      upcomingDeadlines,
    },
    message: `Your event is in ${daysUntil} days. You have ${upcomingDeadlines.length} upcoming deadlines.`,
  };
}
```

---

## Step 2: Create Query UI Component

Create `mono/apps/web/src/components/query-bar.tsx`:

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Sparkles } from "lucide-react";

export function QueryBar({ eventId }: { eventId: string }) {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useConvexQuery(
    api.queries.askQuestion,
    submitted ? { eventId: eventId as any, question: submitted } : "skip"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(question);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your event... (e.g., 'What's left to do?')"
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={!question.trim()}>
          <Sparkles className="h-4 w-4 mr-2" />
          Ask
        </Button>
      </form>

      {isLoading && (
        <Card className="p-4">
          <div className="animate-pulse">Thinking...</div>
        </Card>
      )}

      {data && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Answer:</div>
          <div>{data.message}</div>

          {data.type === "tasks_summary" && data.data && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                {data.data.completed} / {data.data.total} completed
                {data.data.overdue > 0 && (
                  <span className="text-red-600 ml-2">• {data.data.overdue} overdue</span>
                )}
              </div>
            </div>
          )}

          {data.type === "budget_summary" && data.data && (
            <div className="mt-3">
              <div className="flex justify-between text-sm">
                <span>Spent</span>
                <span className="font-semibold">${data.data.spent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining</span>
                <span className="font-semibold">${data.data.remaining.toLocaleString()}</span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
```

---

## Step 3: Add to Event Dashboard

```typescript
// In your event dashboard page
import { QueryBar } from "@/components/query-bar";

export function EventDashboard({ eventId }: { eventId: string }) {
  return (
    <div className="space-y-6">
      <QueryBar eventId={eventId} />
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] "What's left to do?" → Shows task summary
- [ ] "Are we under budget?" → Shows budget breakdown
- [ ] "When's the next deadline?" → Shows timeline
- [ ] Query results display correctly
- [ ] Data is accurate

---

## Success Criteria

✅ **Query classification works for common questions**
✅ **Structured responses returned quickly**
✅ **UI displays answers clearly**
✅ **Data summaries are accurate**

---

**Phase 3.5 Complete = Natural language querying** 💬
**Next: Phase 3.6 - Proactive suggestions** 🔮
