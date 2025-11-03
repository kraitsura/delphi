# Phase 3.6: Predictive Suggestions
## Proactive AI Nudges & Smart Alerts

> **Status:** Phase 3.6 - Predictive Intelligence (Day 12)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.5 Complete (Natural Language Queries)
> **Next Phase:** Phase 3.7 (Optimization & Production)

---

## Overview

Build a **proactive suggestion system** that analyzes event state and provides timely nudges like "You've mentioned 'photographer' 5 times but haven't created a task yet" or "Venue bookings are typically done 12 months out - you're behind schedule."

### What You'll Build

- ✅ Repeated mention detection
- ✅ Timeline risk analysis
- ✅ Budget anomaly detection
- ✅ Suggestion notification system
- ✅ Dismissible suggestion cards

---

## Step 1: Create Suggestions Generator

Create `mono/packages/backend/convex/suggestions.ts`:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const generateSuggestions = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;
    const suggestions: any[] = [];

    // Check for repeated mentions
    const mentionSuggestions = await checkRepeatedMentions(db, args.eventId);
    suggestions.push(...mentionSuggestions);

    // Check for timeline risks
    const timelineSuggestions = await checkTimelineRisks(db, args.eventId);
    suggestions.push(...timelineSuggestions);

    // Check for budget anomalies
    const budgetSuggestions = await checkBudgetAnomalies(db, args.eventId);
    suggestions.push(...budgetSuggestions);

    return suggestions;
  },
});

async function checkRepeatedMentions(db: any, eventId: string) {
  const suggestions: any[] = [];

  // Get all rooms for event
  const rooms = await db
    .query("rooms")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  // Track keyword frequency
  const keywords: Record<string, number> = {};
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const room of rooms) {
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", (q: any) => q.eq("roomId", room._id))
      .filter((q: any) => q.gt(q.field("createdAt"), sevenDaysAgo))
      .collect();

    for (const message of messages) {
      const words = message.text.toLowerCase().split(/\s+/);
      const taskKeywords = ["photographer", "dj", "caterer", "florist", "venue", "band", "baker"];

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
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  for (const [keyword, count] of Object.entries(keywords)) {
    if (count >= 3) {
      const hasTask = tasks.some((t: any) =>
        t.name.toLowerCase().includes(keyword)
      );

      if (!hasTask) {
        suggestions.push({
          id: `mention-${keyword}`,
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
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  const now = Date.now();
  const eventDate = new Date(event.eventDate).getTime();
  const daysUntilEvent = Math.floor((eventDate - now) / (24 * 60 * 60 * 1000));

  // Typical booking timelines (days before event)
  const timelineRules: Record<string, number> = {
    venue: 365,       // 12 months
    photographer: 270, // 9 months
    caterer: 180,     // 6 months
    music: 180,       // 6 months
    flowers: 90,      // 3 months
  };

  for (const [category, daysOut] of Object.entries(timelineRules)) {
    if (daysUntilEvent < daysOut) {
      const categoryTasks = tasks.filter(
        (t: any) => t.category === category && t.status !== "completed"
      );

      if (categoryTasks.length > 0) {
        suggestions.push({
          id: `timeline-${category}`,
          type: "timeline_risk",
          priority: "high",
          title: `${category} booking overdue`,
          message: `Most events book their ${category} ${Math.floor(daysOut / 30)} months in advance. You're ${Math.floor((daysOut - daysUntilEvent) / 30)} months behind schedule.`,
          actions: [
            {
              label: "View Tasks",
              action: "view_category_tasks",
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
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  const tasks = await db
    .query("tasks")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  const spent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const totalTasks = tasks.length;

  const percentSpent = (spent / event.budget) * 100;
  const percentTasksComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // If spending is significantly ahead of task completion
  if (percentSpent > percentTasksComplete + 20) {
    suggestions.push({
      id: "budget-ahead",
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
```

---

## Step 2: Create Suggestions UI Component

Create `mono/apps/web/src/components/suggestions-panel.tsx`:

```typescript
import { useState } from "react";
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, X } from "lucide-react";

export function SuggestionsPanel({ eventId }: { eventId: string }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: suggestions } = useConvexQuery(api.suggestions.generateSuggestions, {
    eventId: eventId as any,
  });

  const activeSuggestions = suggestions?.filter(
    (s: any) => !dismissed.has(s.id)
  ) || [];

  const handleDismiss = (suggestionId: string) => {
    setDismissed(prev => new Set([...prev, suggestionId]));
  };

  if (activeSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Suggestions</h3>
      {activeSuggestions.map((suggestion: any) => (
        <Card key={suggestion.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {suggestion.priority === "high" ? (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-sm">{suggestion.title}</div>
                  <Badge
                    variant={suggestion.priority === "high" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {suggestion.priority}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground mb-3">
                  {suggestion.message}
                </div>

                <div className="flex gap-2">
                  {suggestion.actions?.map((action: any, i: number) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={action.action === "dismiss" ? "ghost" : "default"}
                      onClick={() => {
                        if (action.action === "dismiss") {
                          handleDismiss(suggestion.id);
                        } else {
                          // Handle other actions
                          console.log("Action:", action);
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDismiss(suggestion.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## Step 3: Add to Dashboard

```typescript
// In event dashboard
import { SuggestionsPanel } from "@/components/suggestions-panel";

export function EventDashboard({ eventId }: { eventId: string }) {
  return (
    <div className="space-y-6">
      <SuggestionsPanel eventId={eventId} />
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Mention "photographer" 3+ times → See suggestion
- [ ] Create event 6 months before date → See timeline warnings
- [ ] Spend >50% budget with <30% tasks done → See warning
- [ ] Dismiss works correctly
- [ ] Suggestions don't reappear after dismiss

---

## Success Criteria

✅ **Repeated mention detection works**
✅ **Timeline risk alerts appear**
✅ **Budget anomaly warnings show**
✅ **Suggestions are actionable**
✅ **Dismiss functionality works**
✅ **UI is clear and not overwhelming**

---

**Phase 3.6 Complete = Proactive AI suggestions** 🔮
**Next: Phase 3.7 - Final optimizations & production** 🚀
