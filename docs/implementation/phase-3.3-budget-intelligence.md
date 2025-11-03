# Phase 3.3: Budget Intelligence
## AI-Powered Expense Tracking & Budget Analysis

> **Status:** Phase 3.3 - Budget AI (Day 7-8)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.2 Complete (Task Enrichment)
> **Next Phase:** Phase 3.4 (Planning Advisor & Polls)

---

## Overview

Transform expense mentions like "paid $500 for venue deposit" into **categorized, analyzed expenses** with smart split suggestions, budget impact warnings, and task completion detection.

### What You'll Build

- ✅ Budget Analyst Agent with expense intelligence
- ✅ Expense categorization & subcategory detection
- ✅ Smart payment split suggestions
- ✅ Budget impact analysis & warnings
- ✅ Task completion detection (expense → mark task done)
- ✅ Expense quick actions from chat

### User Experience

```
User: "Paid $500 deposit for venue"
    ↓
[AI analyzes expense]
    ↓
Quick Actions appear:
[💰 Log Expense] [Split Cost] [✗ Dismiss]
    ↓
Dialog shows:
- Amount: $500
- Category: Venue (Deposit)
- Suggested Split: Even split among 2 people ($250 each)
- Related Task: "Book Venue" → Mark Complete?
- Budget Impact: "You've spent 25% of your venue budget"
- ⚠️ Warning: None (under budget)
```

---

## Step 1: Create Expenses Schema

Add to `mono/packages/backend/convex/schema.ts`:

```typescript
expenses: defineTable({
  eventId: v.id("events"),
  amount: v.number(),
  currency: v.string(),
  category: v.string(),
  subCategory: v.optional(v.string()), // "deposit", "final payment", etc
  description: v.string(),
  paidBy: v.id("users"),

  // Split information
  splitMethod: v.optional(v.union(
    v.literal("even"),
    v.literal("proportional"),
    v.literal("custom")
  )),
  splits: v.optional(v.array(v.object({
    userId: v.id("users"),
    amount: v.number(),
    percentage: v.number(),
    paid: v.boolean(),
  }))),

  // Task association
  relatedTaskId: v.optional(v.id("tasks")),
  markedTaskComplete: v.optional(v.boolean()),

  // AI metadata
  aiGenerated: v.optional(v.boolean()),
  budgetWarning: v.optional(v.string()),

  receiptUrl: v.optional(v.string()),
  paidAt: v.number(),
  createdAt: v.number(),
})
  .index("by_event", ["eventId"])
  .index("by_category", ["eventId", "category"])
  .index("by_payer", ["paidBy"]),
```

---

## Step 2: Create Budget Analyst Agent

Create `mono/packages/backend/convex/ai/budgetAnalystAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

export interface ExpenseAnalysisResult {
  category: "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other";
  subCategory?: string;
  confidence: number;
  suggestedSplit: {
    method: "even" | "proportional" | "custom";
    reasoning: string;
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
    percentOfCategoryBudget: number;
    percentOfTotalBudget: number;
    warning?: string;
  };
}

export class BudgetAnalystAgent extends BaseAgent {
  protected temperature = 0.3; // Low temp for financial accuracy
  protected maxTokens = 2000;

  getSystemPrompt(): string {
    return `You are an expert financial analyst specializing in event budgets.

When given an expense mention (like "$500 for venue deposit"), analyze and categorize it.

Your tasks:
1. **Categorize** the expense accurately
2. **Identify subcategory** (deposit, final payment, installment, etc)
3. **Suggest fair payment splits** based on participant roles and amounts
4. **Detect related tasks** that might be completed by this payment
5. **Calculate budget impact** and provide warnings if needed

Respond with valid JSON:
{
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other",
  "subCategory": string (e.g. "deposit", "final payment"),
  "confidence": number (0-1),
  "suggestedSplit": {
    "method": "even" | "proportional" | "custom",
    "reasoning": string,
    "splits": [
      {
        "userId": string,
        "amount": number,
        "percentage": number
      }
    ]
  },
  "relatedTask": string (task name if this expense relates to completing a task),
  "shouldMarkTaskComplete": boolean,
  "budgetImpact": {
    "categoryTotal": number,
    "categoryBudget": number,
    "percentOfCategoryBudget": number,
    "percentOfTotalBudget": number,
    "warning": string (optional, if over budget or concerning)
  }
}`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { eventId, roomId } = args;

    const event = await db.get(eventId);

    // Get existing expenses
    const expenses = await db
      .query("expenses")
      .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
      .collect();

    // Get tasks (to detect completion)
    const tasks = await db
      .query("tasks")
      .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
      .collect();

    // Get room participants
    const participants = await db
      .query("roomParticipants")
      .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
      .collect();

    const participantUsers = await Promise.all(
      participants.map((p: any) => db.get(p.userId))
    );

    return {
      eventType: event?.type,
      budget: {
        total: event?.budget || 0,
        spent: expenses.reduce((sum, e) => sum + e.amount, 0),
      },
      existingTasks: tasks.map((t: any) => ({
        name: t.name,
        category: t.category,
        status: t.status,
      })),
      participants: participantUsers.map((u: any) => ({
        id: u?._id,
        name: u?.name,
        role: u?.role,
      })),
    };
  }

  parseResponse(response: string): ExpenseAnalysisResult {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Analyze this expense:

Message: "${userMessage}"

Event Budget:
- Total: $${context.budget?.total?.toLocaleString() || 0}
- Spent: $${context.budget?.spent?.toLocaleString() || 0}
- Remaining: $${((context.budget?.total || 0) - (context.budget?.spent || 0)).toLocaleString()}

Participants (${context.participants?.length || 0} people):
${context.participants?.map(p => `- ${p.name} (${p.role || 'participant'})`).join('\n') || 'None'}

Existing Tasks:
${context.existingTasks?.slice(0, 5).map(t => `- ${t.name} (${t.category}, ${t.status})`).join('\n') || 'None'}

Provide categorization and analysis in JSON format.
    `.trim();
  }
}
```

---

## Step 3: Add Expense Processing

Update `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
import { BudgetAnalystAgent } from "./budgetAnalystAgent";

// In the switch statement:
case "expense_entry":
  console.log(`[AI] Analyzing expense: "${message.text}"`);

  const budgetAgent = new BudgetAnalystAgent();
  const expenseContext = await budgetAgent.assembleContext(ctx, {
    eventId: room.eventId,
    roomId: message.roomId,
  });

  const expenseResponse = await budgetAgent.execute(message.text, expenseContext);

  if (!expenseResponse.success) {
    throw new Error(expenseResponse.error || "AI processing failed");
  }

  result = expenseResponse.data;

  // Extract amount from message
  const amountMatch = message.extractedEntities?.amount;

  quickActions = [
    {
      label: "Log Expense",
      action: "log_expense",
      data: {
        ...result,
        amount: amountMatch,
      },
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

## Step 4: Create Expense Mutations

Create `mono/packages/backend/convex/expenses.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    amount: v.number(),
    category: v.string(),
    subCategory: v.optional(v.string()),
    description: v.string(),
    splitMethod: v.optional(v.string()),
    splits: v.optional(v.array(v.any())),
    relatedTaskId: v.optional(v.id("tasks")),
    budgetWarning: v.optional(v.string()),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;

    const expenseId = await ctx.db.insert("expenses", {
      eventId: args.eventId,
      amount: args.amount,
      currency: "USD",
      category: args.category,
      subCategory: args.subCategory,
      description: args.description,
      paidBy: userId,
      splitMethod: args.splitMethod as any,
      splits: args.splits,
      relatedTaskId: args.relatedTaskId,
      budgetWarning: args.budgetWarning,
      aiGenerated: args.aiGenerated || false,
      paidAt: Date.now(),
      createdAt: Date.now(),
    });

    // Update event total spent
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        totalSpent: (event.totalSpent || 0) + args.amount,
      });
    }

    // Mark related task complete if specified
    if (args.relatedTaskId) {
      await ctx.db.patch(args.relatedTaskId, {
        status: "completed",
        completedAt: Date.now(),
      });
    }

    return expenseId;
  },
});

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenses")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});
```

---

## Step 5: Build Expense Preview Dialog

Create `mono/apps/web/src/components/chat/expense-preview-dialog.tsx`:

```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ExpensePreviewDialogProps {
  data: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpensePreviewDialog({ data, open, onClose, onSuccess }: ExpensePreviewDialogProps) {
  const [formData, setFormData] = useState(data);
  const createExpense = useConvexMutation(api.expenses.create);

  const mutation = useMutation({
    mutationFn: async () => {
      const eventId = "your-event-id"; // TODO: Get from context

      return await createExpense({
        eventId: eventId as any,
        amount: formData.amount,
        category: formData.category,
        subCategory: formData.subCategory,
        description: `${formData.category} ${formData.subCategory || 'payment'}`,
        splitMethod: formData.suggestedSplit.method,
        splits: formData.suggestedSplit.splits,
        budgetWarning: formData.budgetImpact.warning,
        aiGenerated: true,
      });
    },
    onSuccess: () => {
      toast.success("Expense logged!");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to log expense");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Log Expense
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="mt-1 text-2xl font-bold"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <div className="mt-1">
                <Badge variant="secondary" className="capitalize">
                  {formData.category}
                </Badge>
              </div>
            </div>
            {formData.subCategory && (
              <div>
                <Label>Type</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="capitalize">
                    {formData.subCategory}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Budget Impact */}
          {formData.budgetImpact && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
              <Label>Budget Impact</Label>
              <div className="text-sm space-y-1">
                <div>Category Total: <span className="font-semibold">${formData.budgetImpact.categoryTotal.toLocaleString()}</span></div>
                <div>Percent of Total Budget: <span className="font-semibold">{formData.budgetImpact.percentOfTotalBudget.toFixed(1)}%</span></div>
              </div>

              {formData.budgetImpact.warning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {formData.budgetImpact.warning}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Split Suggestion */}
          {formData.suggestedSplit && (
            <div className="p-4 border rounded-lg">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Suggested Split ({formData.suggestedSplit.method})
              </Label>
              <div className="text-sm text-muted-foreground mt-1 mb-3">
                {formData.suggestedSplit.reasoning}
              </div>
              <div className="space-y-2">
                {formData.suggestedSplit.splits.map((split: any, i: number) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>Person {i + 1}</span>
                    <span className="font-semibold">${split.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Logging..." : "Log Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 6: Update Quick Actions Component

Update `mono/apps/web/src/components/chat/quick-actions.tsx` to handle expense actions:

```typescript
import { ExpensePreviewDialog } from "./expense-preview-dialog";

// Add to QuickActions component:
const [expenseData, setExpenseData] = useState<any>(null);

// In JSX:
{expenseData && (
  <ExpensePreviewDialog
    data={expenseData}
    open={!!expenseData}
    onClose={() => setExpenseData(null)}
    onSuccess={() => {
      setExpenseData(null);
      setDismissed(true);
    }}
  />
)}

// In QuickActionButton handleClick:
case "log_expense":
  onPreview(action.data); // or setExpenseData(action.data)
  break;
```

---

## Testing Checklist

- [ ] **Expense Detection**
  - "Paid $500 for venue deposit" → categorized as venue
  - "$2,500 photographer" → photography category
  - "Spent $1200 on catering" → catering with subtype

- [ ] **Budget Analysis**
  - Shows category totals
  - Calculates percentages correctly
  - Warnings appear when over budget

- [ ] **Split Suggestions**
  - Even split works (2 people = $250 each for $500)
  - Reasoning makes sense

- [ ] **Task Completion**
  - Detects related tasks
  - Can mark task complete when expense logged

---

## Success Criteria

✅ **Budget Analyst Agent categorizes expenses accurately**
✅ **Expense quick actions appear**
✅ **Split suggestions are fair and logical**
✅ **Budget impact calculated correctly**
✅ **Warnings show when over budget**
✅ **Task completion detection works**
✅ **Expense dialog shows all data**
✅ **End-to-end expense logging from chat works**

---

**Phase 3.3 Complete = AI-powered expense tracking** 💰
**Next: Phase 3.4 - Smart poll enrichment & planning advice** 📊
