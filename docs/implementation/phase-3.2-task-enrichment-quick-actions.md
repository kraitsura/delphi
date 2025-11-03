# Phase 3.2: Task Enrichment & Quick Actions
## AI-Powered Task Creation from Chat Messages

> **Status:** Phase 3.2 - Task Intelligence (Day 5-6)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.1 Complete (Claude API Integration)
> **Next Phase:** Phase 3.3 (Budget Intelligence)

---

## Overview

This phase transforms simple chat messages like "we should book a photographer" into **rich, actionable tasks** with AI-generated details, cost estimates, vendor suggestions, and next steps. Users can review and create tasks with one click.

### What You'll Build

- ✅ Task Enricher Agent with full context assembly
- ✅ Quick Action buttons on messages
- ✅ Task Preview Dialog with editable fields
- ✅ One-click task creation from AI suggestions
- ✅ Vendor suggestions embedded in tasks
- ✅ Planning tips and next steps
- ✅ Cost estimates based on event type

### User Experience

```
User: "We should book a photographer"
    ↓
[AI processes in background]
    ↓
Message displays with Quick Actions:
[✓ Create Task] [Edit Details] [✗ Dismiss]
    ↓
User clicks "Create Task"
    ↓
Dialog shows enriched data:
- Task: "Book Wedding Photographer"
- Category: Photography
- Est. Cost: $2,500 - $5,000
- Deadline: 2026-03-15 (9 months before wedding)
- Priority: High
- Next Steps: [3 specific action items]
- Vendor Suggestions: [2-3 local photographers]
- Planning Tips: [3 helpful tips]
    ↓
User reviews, optionally edits, clicks Create
    ↓
Task created and appears in task list
```

---

## Step 1: Create Task Schema

Update `mono/packages/backend/convex/schema.ts` to add tasks table:

```typescript
export default defineSchema({
  // ... existing tables

  tasks: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("decor"),
      v.literal("attire"),
      v.literal("flowers"),
      v.literal("stationery"),
      v.literal("transportation"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("blocked")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    assignedTo: v.optional(v.id("users")),
    estimatedCost: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    actualCost: v.optional(v.number()),
    deadline: v.optional(v.number()),
    dependencies: v.optional(v.array(v.id("tasks"))),

    // AI-generated metadata
    nextSteps: v.optional(v.array(v.string())),
    vendorSuggestions: v.optional(v.array(v.object({
      name: v.string(),
      estimatedPrice: v.string(),
      notes: v.string(),
    }))),
    planningTips: v.optional(v.array(v.string())),
    aiGenerated: v.optional(v.boolean()),

    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_status", ["eventId", "status"])
    .index("by_assigned", ["assignedTo"]),
});
```

---

## Step 2: Build Task Enricher Agent

Create `mono/packages/backend/convex/ai/taskEnricherAgent.ts`:

```typescript
import { BaseAgent, AgentContext } from "./baseAgent";

/**
 * Full task enrichment result
 */
export interface TaskEnrichmentResult {
  taskName: string;
  description: string;
  category: "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other";
  estimatedCost: { min: number; max: number };
  suggestedDeadline: string; // YYYY-MM-DD
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

/**
 * AI agent that transforms casual task mentions into detailed, actionable tasks
 */
export class TaskEnricherAgent extends BaseAgent {
  protected temperature = 0.7;
  protected maxTokens = 3000; // Allow longer responses for detailed enrichment

  getSystemPrompt(): string {
    return `You are an expert wedding and event planner. Your job is to transform casual mentions of tasks into detailed, actionable task descriptions.

When a user mentions they need to do something (like "we should book a photographer"), you should:

1. **Create a clear, specific task name**
   - Make it action-oriented and specific
   - Example: "Book Wedding Photographer" not just "Photographer"

2. **Write a detailed description**
   - Include context about what this involves
   - Mention important considerations
   - 2-3 sentences

3. **Estimate costs based on typical market rates**
   - Consider event type (wedding, corporate, birthday)
   - Provide realistic min-max range
   - Base on actual market data

4. **Suggest realistic deadlines**
   - Base on event date and typical booking timelines
   - Example: Photographers book 9-12 months out for weddings

5. **Identify dependencies**
   - What must be done first?
   - Example: "Book venue" before "Finalize catering headcount"

6. **Provide concrete next steps**
   - 3-4 specific, actionable items
   - Example: "Get referrals from friends", not just "Research"

7. **Suggest 2-3 relevant vendors** (if applicable)
   - Use realistic business names
   - Provide typical price ranges
   - Include helpful notes

8. **Include helpful planning tips**
   - 2-3 practical tips specific to this task
   - Focus on common mistakes to avoid

**Always respond with valid JSON matching this exact schema:**

{
  "taskName": string,
  "description": string,
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "attire" | "flowers" | "stationery" | "transportation" | "other",
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

Be specific, practical, and helpful. Base estimates on the event type, size, and location when provided.`;
  }

  async assembleContext(ctx: any, args: any): Promise<AgentContext> {
    const { db } = ctx;
    const { roomId, eventId } = args;

    // Get event details
    const event = await db.get(eventId);

    // Get existing tasks for dependency analysis
    const tasks = await db
      .query("tasks")
      .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
      .take(20);

    // Get recent messages for context
    const messages = await db
      .query("messages")
      .withIndex("by_room_and_created", (q: any) => q.eq("roomId", roomId))
      .order("desc")
      .take(10);

    return {
      eventType: event?.type || "event",
      eventDate: event?.eventDate,
      budget: {
        total: event?.budget || 0,
        spent: event?.totalSpent || 0,
      },
      existingTasks: tasks.map((t: any) => ({
        name: t.name,
        category: t.category,
        status: t.status,
        deadline: t.deadline,
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
        throw new Error("Missing required fields: taskName or category");
      }

      // Ensure arrays exist
      parsed.dependencies = parsed.dependencies || [];
      parsed.nextSteps = parsed.nextSteps || [];
      parsed.vendorSuggestions = parsed.vendorSuggestions || [];
      parsed.planningTips = parsed.planningTips || [];

      return parsed as TaskEnrichmentResult;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw response:", response);
      throw new Error("Invalid AI response format");
    }
  }

  protected buildPrompt(userMessage: string, context: AgentContext): string {
    return `
Analyze this message and create an enriched task:

User message: "${userMessage}"

Event Details:
- Type: ${context.eventType}
- Date: ${context.eventDate || "not specified"}
- Budget: $${context.budget?.total?.toLocaleString() || 0} total, $${context.budget?.spent?.toLocaleString() || 0} spent
- Existing tasks: ${context.existingTasks?.length || 0}

${context.existingTasks && context.existingTasks.length > 0 ? `
Existing Tasks (for dependency analysis):
${context.existingTasks.slice(0, 5).map(t => `- ${t.name} (${t.category}, ${t.status})`).join('\n')}
` : ''}

${context.recentMessages && context.recentMessages.length > 0 ? `
Recent conversation context:
${context.recentMessages.slice(0, 5).join('\n')}
` : ''}

Please create a detailed task with all enrichments in JSON format.
    `.trim();
  }
}
```

---

## Step 3: Update AI Processing to Use Task Enricher

Update `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { TaskEnricherAgent } from "./taskEnricherAgent";

export const processMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { db } = ctx;

    const message = await db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const queueItem = await db
      .query("aiProcessingQueue")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();

    if (!queueItem) throw new Error("Queue item not found");

    await db.patch(queueItem._id, { status: "processing" });

    try {
      const room = await db.get(message.roomId);
      if (!room) throw new Error("Room not found");

      let result;
      let quickActions: any[] = [];

      switch (message.detectedIntent) {
        case "task_creation":
          console.log(`[AI] Enriching task: "${message.text}"`);

          const taskAgent = new TaskEnricherAgent();
          const context = await taskAgent.assembleContext(ctx, {
            roomId: message.roomId,
            eventId: room.eventId,
          });

          const aiResponse = await taskAgent.execute(message.text, context);

          if (!aiResponse.success) {
            throw new Error(aiResponse.error || "AI processing failed");
          }

          console.log(`[AI] Task enriched:`, {
            name: aiResponse.data.taskName,
            category: aiResponse.data.category,
            priority: aiResponse.data.priority,
            cost: aiResponse.data.estimatedCost,
            tokens: aiResponse.tokensUsed,
            latency: aiResponse.latencyMs,
          });

          result = aiResponse.data;

          // Generate quick actions
          quickActions = [
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

        default:
          console.log(`[AI] Intent ${message.detectedIntent} not yet implemented`);
          result = { note: "Not yet implemented" };
      }

      // Mark as completed
      await db.patch(queueItem._id, {
        status: "completed",
        result,
        processedAt: Date.now(),
      });

    } catch (error) {
      console.error("[AI] Processing error:", error);

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

## Step 4: Create Task Mutations

Create `mono/packages/backend/convex/tasks.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    estimatedCost: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    deadline: v.optional(v.number()),
    nextSteps: v.optional(v.array(v.string())),
    vendorSuggestions: v.optional(v.array(v.any())),
    planningTips: v.optional(v.array(v.string())),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;

    const taskId = await ctx.db.insert("tasks", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      category: args.category as any,
      priority: args.priority as any,
      status: "todo",
      estimatedCost: args.estimatedCost,
      deadline: args.deadline,
      nextSteps: args.nextSteps,
      vendorSuggestions: args.vendorSuggestions,
      planningTips: args.planningTips,
      aiGenerated: args.aiGenerated || false,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return taskId;
  },
});

/**
 * Get tasks for an event
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return tasks;
  },
});
```

---

## Step 5: Build Quick Actions UI Component

Create `mono/apps/web/src/components/chat/quick-actions.tsx`:

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Edit } from "lucide-react";
import { TaskPreviewDialog } from "./task-preview-dialog";
import type { Id } from "convex/_generated/dataModel";

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
    <>
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
      </div>

      {previewData && (
        <TaskPreviewDialog
          data={previewData}
          open={!!previewData}
          onClose={() => setPreviewData(null)}
          onSuccess={() => {
            setPreviewData(null);
            setDismissed(true);
          }}
        />
      )}
    </>
  );
}

interface QuickActionButtonProps {
  messageId: Id<"messages">;
  action: QuickAction;
  onDismiss: () => void;
  onPreview: (data: any) => void;
}

function QuickActionButton({
  action,
  onDismiss,
  onPreview,
}: QuickActionButtonProps) {
  const handleClick = () => {
    switch (action.action) {
      case "create_task":
      case "edit_task_details":
        onPreview(action.data);
        break;

      case "dismiss":
        onDismiss();
        break;
    }
  };

  const getIcon = () => {
    switch (action.action) {
      case "dismiss":
        return <X className="h-3 w-3 mr-1" />;
      case "create_task":
        return <Check className="h-3 w-3 mr-1" />;
      case "edit_task_details":
        return <Edit className="h-3 w-3 mr-1" />;
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
      className="text-xs"
    >
      {getIcon()}
      {action.label}
    </Button>
  );
}
```

---

## Step 6: Build Task Preview Dialog

Create `mono/apps/web/src/components/chat/task-preview-dialog.tsx`:

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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sparkles, DollarSign, Calendar, AlertCircle } from "lucide-react";

interface TaskPreviewDialogProps {
  data: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskPreviewDialog({ data, open, onClose, onSuccess }: TaskPreviewDialogProps) {
  const [formData, setFormData] = useState(data);
  const createTask = useConvexMutation(api.tasks.create);

  const mutation = useMutation({
    mutationFn: async () => {
      // Get eventId from current route or context
      const eventId = "your-event-id"; // TODO: Get from context

      return await createTask({
        eventId: eventId as any,
        name: formData.taskName,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        estimatedCost: formData.estimatedCost,
        deadline: formData.suggestedDeadline ? new Date(formData.suggestedDeadline).getTime() : undefined,
        nextSteps: formData.nextSteps,
        vendorSuggestions: formData.vendorSuggestions,
        planningTips: formData.planningTips,
        aiGenerated: true,
      });
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      onSuccess();
    },
    onError: (error) => {
      toast.error("Failed to create task");
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI-Generated Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Name */}
          <div>
            <Label>Task Name</Label>
            <Input
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <div className="mt-1">
                <Badge variant="secondary" className="capitalize">
                  {formData.category}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Priority</Label>
              <div className="mt-1">
                <Badge
                  variant={
                    formData.priority === "high" ? "destructive" :
                    formData.priority === "medium" ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {formData.priority}
                </Badge>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          {formData.estimatedCost && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <Label className="text-xs">Estimated Cost</Label>
                <div className="font-semibold">
                  ${formData.estimatedCost.min.toLocaleString()} - ${formData.estimatedCost.max.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Deadline */}
          {formData.suggestedDeadline && (
            <div>
              <Label>Suggested Deadline</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={formData.suggestedDeadline}
                  onChange={(e) => setFormData({ ...formData, suggestedDeadline: e.target.value })}
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Next Steps */}
          {formData.nextSteps && formData.nextSteps.length > 0 && (
            <div>
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Next Steps
              </Label>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                {formData.nextSteps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Vendor Suggestions */}
          {formData.vendorSuggestions && formData.vendorSuggestions.length > 0 && (
            <div>
              <Label>Vendor Suggestions</Label>
              <div className="space-y-2 mt-2">
                {formData.vendorSuggestions.map((vendor: any, i: number) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-sm text-muted-foreground">{vendor.estimatedPrice}</div>
                    <div className="text-xs text-muted-foreground mt-1">{vendor.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planning Tips */}
          {formData.planningTips && formData.planningTips.length > 0 && (
            <div>
              <Label>Planning Tips</Label>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground mt-2">
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

---

## Step 7: Update Message Component to Show Quick Actions

Update your message component to include quick actions:

```typescript
// In mono/apps/web/src/components/chat/message-item.tsx
import { QuickActions } from "./quick-actions";

export function MessageItem({ message }: { message: any }) {
  return (
    <div className="flex gap-3 group">
      {/* ... existing message content ... */}

      <div className="flex-1 min-w-0">
        {/* ... existing message header and text ... */}

        {/* Add Quick Actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <QuickActions
            messageId={message._id}
            actions={message.quickActions}
          />
        )}

        {/* ... existing reactions, etc ... */}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] **End-to-End Task Creation**
  - Send message: "We should book a photographer"
  - Wait 2-3 seconds for AI processing
  - See quick action buttons appear
  - Click "Create Task"
  - Review enriched data in dialog
  - Verify all fields populated
  - Create task successfully

- [ ] **AI Enrichment Quality**
  - Task name is clear and specific
  - Description is helpful (2-3 sentences)
  - Cost estimate is realistic
  - Deadline makes sense for event date
  - Next steps are actionable
  - Vendor suggestions seem plausible
  - Planning tips are relevant

- [ ] **UI/UX**
  - Quick actions appear smoothly
  - Dialog is easy to read
  - Can edit fields before creating
  - Dismiss works correctly
  - Toast notifications appear

- [ ] **Error Handling**
  - Handle AI timeouts gracefully
  - Show error if task creation fails
  - Don't show quick actions if AI fails

---

## Success Criteria

✅ **Task Enricher Agent produces rich, detailed tasks**
✅ **Quick Action buttons appear on messages**
✅ **Task Preview Dialog shows all AI-generated data**
✅ **Users can review and edit before creating**
✅ **Tasks created successfully with all metadata**
✅ **Cost estimates realistic ($2,500-$5,000 for photographer)**
✅ **Next steps actionable and specific**
✅ **Vendor suggestions contextual**
✅ **End-to-end flow smooth and fast (<5s total)**

---

## What's Next: Phase 3.3

Now that task enrichment works, we'll add:
1. **Budget Analyst Agent** - Expense categorization & split suggestions
2. **Expense Quick Actions** - "Log Expense" from chat
3. **Budget Impact Warnings** - "This exceeds your photography budget"

---

**Phase 3.2 Complete = AI creates rich tasks from casual chat** 🎯
**Next: Phase 3.3 - Smart expense tracking & budget intelligence** 💰
