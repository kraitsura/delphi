# Fluid UI System: Complete Specification

**Version:** 2.1
**Last Updated:** November 13, 2025
**Status:** In Development
**Document Purpose:** Definitive reference for Delphi's AI-orchestrated component system with inline chat rendering

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [AI-to-Chat Integration](#ai-to-chat-integration)
4. [Design Aesthetic](#design-aesthetic)
5. [Component Taxonomy](#component-taxonomy)
6. [Zustand Store Specification](#zustand-store-specification)
7. [Component Checklist](#component-checklist)
8. [Development Priorities](#development-priorities)
9. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

### Vision

The Fluid UI System is Delphi's **AI-orchestrated dashboard component framework** that enables:

- **Chat-driven UI**: AI analyzes chat messages and dynamically renders appropriate dashboards
- **Modular Components**: 72+ compact, single-purpose components (1x1 or 2x1 grid cells)
- **Reactive State**: Zustand orchestrates cross-component communication and visual states
- **Conversational Interactions**: AI asks questions inline (polls, confirmations, permissions)

### Key Principles

1. **AI as Orchestrator**: AI outputs dashboard configs with grid coordinates, Zustand manages execution
2. **Convex as Source of Truth**: All persistent data lives in Convex, components query reactively
3. **Zustand for UI State**: Selections, highlights, animations, transient state
4. **Ultra-Minimal Design**: Sharp edges, emergent borders, ultrathin typography
5. **Component Modularity**: Each component is self-contained, communicates via Zustand only

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    AI LAYER (Claude)                         │
│  • Analyzes chat for intents                                 │
│  • Generates dashboard configs with grid coordinates         │
│  • Outputs interactive prompts (polls, confirmations)        │
└─────────────────────────────────────────────────────────────┘
                           ↓ JSON config
┌─────────────────────────────────────────────────────────────┐
│                CONVEX (Persistent Backend)                   │
│  • dashboardConfigs: AI-generated layouts                    │
│  • events, tasks, expenses, polls: Event data                │
│  • aiInteractions: Active AI prompts                         │
└─────────────────────────────────────────────────────────────┘
                           ↓ useQuery (reactive)
┌─────────────────────────────────────────────────────────────┐
│            ZUSTAND STORE (UI Orchestration)                  │
│  • config: DashboardConfig                                   │
│  • selections: { taskId, vendorId, category, ... }           │
│  • highlights: Set<componentId>                              │
│  • activePrompts: AI interactions                            │
└─────────────────────────────────────────────────────────────┘
                           ↓ useStore (granular)
┌─────────────────────────────────────────────────────────────┐
│              REACT COMPONENTS (UI Layer)                     │
│  • Read config, selections, highlights from Zustand          │
│  • Fetch data via Convex queries                             │
│  • Render with ultra-minimal design system                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**AI → Convex → Zustand → Components**

1. **AI analyzes chat**: "Let's review tasks by vendor"
2. **AI generates config**: `{ sections: [{ type: "row", components: [{ type: "TasksByVendor" }] }] }`
3. **AI saves to Convex**: `api.dashboards.create({ eventId, config })`
4. **Frontend queries Convex**: `useQuery(api.dashboards.get, { eventId })`
5. **Config loads into Zustand**: `setConfig(aiConfig)`
6. **LayoutController reads Zustand**: `const config = useDashboardStore(state => state.config)`
7. **Components render**: Grid layout with CSS Grid

**User Interaction → Zustand → Components**

1. **User clicks vendor**: TasksByVendor component
2. **Update Zustand selection**: `select("vendorId", "abc123")`
3. **Detail components auto-update**: ExpensesList reads `selectedVendor` from Zustand
4. **Automatic re-render**: Zustand triggers React re-render of subscribed components

### Component Communication

**❌ NO EventBus** (removed)
**❌ NO Prop Drilling** (too coupled)
**✅ YES Zustand Selections** (master sets, detail reads)

**Example:**

```typescript
// Master component (TasksByVendor)
function TasksByVendor() {
  const select = useDashboardStore(state => state.select);
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);

  return (
    <div onClick={() => select("vendorId", vendor.id)}>
      {/* Vendor list */}
    </div>
  );
}

// Detail component (ExpensesList)
function ExpensesList() {
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);
  const expenses = useQuery(api.expenses.listByEvent, { eventId });

  const filtered = useMemo(() => {
    if (!selectedVendor) return expenses;
    return expenses?.filter(e => e.vendorId === selectedVendor);
  }, [expenses, selectedVendor]);

  // Auto re-renders when selectedVendor changes in Zustand
}
```

---

## AI-to-Chat Integration

### Overview

The AI-to-Chat integration enables **dynamic component rendering inline in group chat** based on AI decisions. The AI analyzes messages, decides what to show (text, components, or interactive prompts), and the frontend dynamically renders them as part of the conversation.

### Key Concept

**AI outputs structured JSON describing what to render** → **Frontend interprets and renders dynamically** → **Components appear inline in chat seamlessly**

---

### Message Schema Design

#### Extended Convex Message Schema

```typescript
// convex/schema.ts

messages: defineTable({
  roomId: v.id("rooms"),
  authorId: v.id("users"),
  authorType: v.union(v.literal("user"), v.literal("agent")),

  // Message content
  content: v.string(),

  // NEW: Render instructions from AI
  renderType: v.union(
    v.literal("text"),              // Plain text message
    v.literal("component_grid"),    // Dashboard with components
    v.literal("interactive_prompt"), // Poll, confirmation, quick actions
    v.literal("mixed")              // Text + components
  ),

  // NEW: Component configuration (if renderType includes components)
  componentConfig: v.optional(v.object({
    layout: v.string(),              // "1:1", "2:1", "full"
    components: v.array(v.object({
      id: v.string(),
      type: v.string(),              // "TasksByVendor", "InlinePoll", etc.
      props: v.any(),                // Component-specific props
    })),
  })),

  // NEW: Interactive prompt metadata (if renderType is interactive_prompt)
  interactivePrompt: v.optional(v.object({
    promptType: v.union(
      v.literal("poll"),
      v.literal("confirmation"),
      v.literal("quickActions"),
      v.literal("multiChoice")
    ),
    data: v.any(),                   // Prompt-specific data
    expiresAt: v.optional(v.number()),
    responses: v.optional(v.array(v.object({
      userId: v.id("users"),
      response: v.any(),
      timestamp: v.number(),
    }))),
  })),

  // Standard fields
  timestamp: v.number(),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
})
```

---

### AI Decision Format

#### AI Message Decision Structure

```typescript
// AI Agent outputs this JSON to Convex

interface AIMessageDecision {
  // What to say (always included)
  textContent: string;

  // How to render it
  renderType: "text" | "component_grid" | "interactive_prompt" | "mixed";

  // Optional: Components to render
  componentConfig?: {
    layout: "1:1" | "2:1" | "1:2" | "full" | string[];
    components: Array<{
      id: string;
      type: string;
      props: Record<string, any>;
    }>;
  };

  // Optional: Interactive prompt
  interactivePrompt?: {
    promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
    data: any;
    expiresAt?: number;
  };
}
```

#### Example AI Outputs

**1. Plain Text Response**

```typescript
{
  textContent: "I'll help you review vendor tasks.",
  renderType: "text"
}
```

**2. Component Grid**

```typescript
{
  textContent: "Here's an overview of tasks by vendor:",
  renderType: "mixed", // Text + components
  componentConfig: {
    layout: "2:1",
    components: [
      {
        id: "vendor-tasks-123",
        type: "TasksByVendor",
        props: {
          eventId: "event_abc",
          showProgress: true,
          showUnassigned: true,
        }
      },
      {
        id: "vendor-expenses-123",
        type: "ExpensesList",
        props: {
          eventId: "event_abc",
          paymentStatus: "all",
        }
      }
    ]
  }
}
```

**3. Interactive Poll**

```typescript
{
  textContent: "Should we do buffet or plated dinner?",
  renderType: "interactive_prompt",
  interactivePrompt: {
    promptType: "poll",
    data: {
      question: "Catering style decision",
      options: [
        { id: "buffet", label: "Buffet", description: "$15/person" },
        { id: "plated", label: "Plated Dinner", description: "$28/person" }
      ],
      allowMultiple: false,
      deadline: Date.now() + 48 * 60 * 60 * 1000, // 48 hours
    }
  }
}
```

**4. Quick Actions**

```typescript
{
  textContent: "I found 5 photographers in your area matching your budget.",
  renderType: "interactive_prompt",
  interactivePrompt: {
    promptType: "quickActions",
    data: {
      actions: [
        { id: "show-all", label: "Show All 5", icon: "list" },
        { id: "top-3", label: "Top 3 Only", icon: "star" },
        { id: "filter-price", label: "Filter by Price", icon: "filter" },
        { id: "later", label: "Maybe Later", icon: "clock", variant: "secondary" }
      ]
    }
  }
}
```

---

### Backend Flow

#### Convex Action: AI Message Handler

```typescript
// convex/aiAgent.ts

export const processUserMessage = action({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    userMessage: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // 1. Analyze user message with AI (Claude/GPT)
    const aiDecision = await analyzeMessageWithAI(args.userMessage, {
      eventId: args.eventId,
      roomId: args.roomId,
      // ... context
    });

    // 2. Create AI response message in Convex
    const aiMessageId = await ctx.runMutation(api.messages.createAIMessage, {
      roomId: args.roomId,
      content: aiDecision.textContent,
      renderType: aiDecision.renderType,
      componentConfig: aiDecision.componentConfig,
      interactivePrompt: aiDecision.interactivePrompt,
    });

    return { messageId: aiMessageId };
  },
});
```

#### Convex Mutation: Create AI Message

```typescript
// convex/messages.ts

export const createAIMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    content: v.string(),
    renderType: v.union(
      v.literal("text"),
      v.literal("component_grid"),
      v.literal("interactive_prompt"),
      v.literal("mixed")
    ),
    componentConfig: v.optional(v.any()),
    interactivePrompt: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: "system" as any, // AI system user
      authorType: "agent",
      content: args.content,
      renderType: args.renderType,
      componentConfig: args.componentConfig,
      interactivePrompt: args.interactivePrompt,
      timestamp: Date.now(),
    });

    return messageId;
  },
});
```

---

### Frontend Rendering

#### Dynamic Message Renderer

```typescript
// web/src/components/messages/DynamicMessageRenderer.tsx

export const DynamicMessageRenderer = memo(({ message }: { message: Message }) => {
  // Render based on message type
  switch (message.renderType) {
    case "text":
      return <TextMessage message={message} />;

    case "component_grid":
      return <ComponentGridMessage message={message} />;

    case "interactive_prompt":
      return <InteractivePromptMessage message={message} />;

    case "mixed":
      return <MixedMessage message={message} />;

    default:
      return <TextMessage message={message} />;
  }
});
```

#### Component Grid in Chat

```typescript
function ComponentGridMessage({ message }: { message: Message }) {
  if (!message.componentConfig) return <TextMessage message={message} />;

  return (
    <div className="message message--agent message--with-components">
      {/* Text content (if any) */}
      {message.content && (
        <div className="message-content">
          {message.content}
        </div>
      )}

      {/* Component grid - wrapped in its own Zustand provider */}
      <DashboardStoreProvider>
        <div className="message-components">
          <GridRow
            section={{
              type: "row",
              layout: message.componentConfig.layout,
              components: message.componentConfig.components,
            }}
            eventId={message.componentConfig.components[0]?.props.eventId}
          />
        </div>
      </DashboardStoreProvider>

      <div className="message-timestamp">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
```

#### Interactive Prompt in Chat

```typescript
function InteractivePromptMessage({ message }: { message: Message }) {
  if (!message.interactivePrompt) return <TextMessage message={message} />;

  const { promptType, data, responses } = message.interactivePrompt;

  // Check if current user already responded
  const currentUserId = useCurrentUserId();
  const userResponse = responses?.find(r => r.userId === currentUserId);
  const hasResponded = !!userResponse;

  return (
    <div className="message message--agent message--interactive">
      {message.content && (
        <div className="message-content">{message.content}</div>
      )}

      <div className="message-interactive-prompt">
        {promptType === "poll" && (
          <InlinePoll
            id={message._id}
            messageId={message._id}
            {...data}
            responses={responses}
            hasResponded={hasResponded}
          />
        )}

        {promptType === "quickActions" && (
          <QuickActions
            id={message._id}
            messageId={message._id}
            actions={data.actions}
            hasResponded={hasResponded}
          />
        )}

        {promptType === "confirmation" && (
          <ConfirmationPrompt
            id={message._id}
            messageId={message._id}
            {...data}
            hasResponded={hasResponded}
          />
        )}
      </div>
    </div>
  );
}
```

---

### Interactive Component Pattern

#### Example: InlinePoll Component

```typescript
// web/src/components/dashboard/ai-interactive/InlinePoll.tsx

export function InlinePoll(props: InlinePollProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation to save response
  const respondToPoll = useMutation(api.messages.respondToInteractivePrompt);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await respondToPoll({
        messageId: props.messageId,
        response: { optionIds: selectedOptions },
      });
    } catch (error) {
      console.error("Failed to submit poll response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate vote counts
  const voteCounts = props.options.reduce((acc, option) => {
    acc[option.id] = props.responses?.filter(
      r => r.response.optionIds?.includes(option.id)
    ).length || 0;
    return acc;
  }, {} as Record<string, number>);

  // If user already responded, show results
  if (props.hasResponded) {
    return <PollResults options={props.options} voteCounts={voteCounts} />;
  }

  // Show voting interface
  return (
    <div className="inline-poll">
      <h4 className="inline-poll-question">{props.question}</h4>

      <div className="inline-poll-options">
        {props.options.map(option => (
          <label key={option.id} className="poll-option">
            <input
              type={props.allowMultiple ? "checkbox" : "radio"}
              checked={selectedOptions.includes(option.id)}
              onChange={(e) => handleOptionChange(option.id, e.target.checked)}
            />
            <div className="poll-option-content">
              <span className="poll-option-label">{option.label}</span>
              {option.description && (
                <span className="poll-option-description">{option.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={selectedOptions.length === 0 || isSubmitting}
        className="fluid-button fluid-button--primary"
      >
        {isSubmitting ? "Submitting..." : "Submit Vote"}
      </button>
    </div>
  );
}
```

#### Save Response Mutation

```typescript
// convex/messages.ts

export const respondToInteractivePrompt = mutation({
  args: {
    messageId: v.id("messages"),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByIdentity(ctx, identity);
    if (!user) throw new Error("User not found");

    // Get message
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Check if user already responded
    const existingResponses = message.interactivePrompt?.responses || [];
    const hasResponded = existingResponses.some(r => r.userId === user._id);

    if (hasResponded) {
      throw new Error("You have already responded to this prompt");
    }

    // Add new response
    const updatedResponses = [
      ...existingResponses,
      {
        userId: user._id,
        response: args.response,
        timestamp: Date.now(),
      },
    ];

    // Update message
    await ctx.db.patch(args.messageId, {
      interactivePrompt: {
        ...message.interactivePrompt!,
        responses: updatedResponses,
      },
    });

    return { success: true };
  },
});
```

---

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SENDS MESSAGE                                        │
│    "Show me vendor tasks"                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: Create user message in Convex                  │
│    mutation: api.messages.create()                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND: Trigger AI processing                          │
│    action: api.aiAgent.processUserMessage()                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BACKEND AI AGENT LAYER                                   │
│    • Fetch context (event, tasks, budget)                   │
│    • Call Claude API with structured prompt                 │
│    • Parse AI decision JSON                                 │
│                                                              │
│    AI outputs:                                               │
│    {                                                         │
│      textContent: "Here's vendor task overview",           │
│      renderType: "mixed",                                    │
│      componentConfig: {                                      │
│        layout: "2:1",                                        │
│        components: [                                         │
│          { type: "TasksByVendor", ... },                    │
│          { type: "ExpensesList", ... }                      │
│        ]                                                     │
│      }                                                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND: Create AI message in Convex                     │
│    mutation: api.messages.createAIMessage()                 │
│    • Save textContent                                        │
│    • Save renderType = "mixed"                               │
│    • Save componentConfig with component definitions         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CONVEX: Real-time subscription pushes new message        │
│    to all clients in room                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. FRONTEND: MessageList receives new message               │
│    useQuery(api.messages.listByRoom) updates                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. FRONTEND: DynamicMessageRenderer                         │
│    • Reads message.renderType = "mixed"                      │
│    • Renders MixedMessage component                          │
│    • Shows text content                                      │
│    • Wraps components in DashboardStoreProvider              │
│    • Renders GridRow with component config                   │
│    • Components appear inline in chat                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. USER INTERACTION                                          │
│    • User clicks vendor in TasksByVendor                     │
│    • Updates Zustand selection                               │
│    • ExpensesList filters automatically                      │
│    • Both components update in real-time                     │
└─────────────────────────────────────────────────────────────┘
```

---

### Key Architecture Decisions

#### ✅ Each Component Grid Gets Its Own Zustand Instance

**Why:** Prevents state collisions when multiple component grids appear in chat

```typescript
// Each message with components gets wrapped
<DashboardStoreProvider>
  <GridRow section={...} />
</DashboardStoreProvider>
```

**Benefit:** Multiple component grids can coexist without interfering

#### ✅ Interactive Prompts Are Stateless (Responses in Convex)

**Why:** Multiple users need to see same prompt and response state

```typescript
// Responses stored in message document
interactivePrompt: {
  promptType: "poll",
  data: { ... },
  responses: [
    { userId: "user_1", response: {...}, timestamp: 123 },
    { userId: "user_2", response: {...}, timestamp: 456 },
  ]
}
```

**Benefit:** Real-time updates, multiplayer support, persistence

#### ✅ AI Decides Render Type, Frontend Interprets

**Why:** AI has full context to make UX decisions

**Flow:**
1. AI analyzes: "This needs a vendor breakdown" → `renderType: "component_grid"`
2. AI analyzes: "This is a yes/no question" → `renderType: "interactive_prompt"`
3. Frontend reads `renderType` and renders accordingly

#### ✅ Components in Chat Are Read-Only by Default

**Why:** Editing should happen in dedicated views, not inline

**Exception:** Interactive prompts (polls, confirmations) allow responses

---

### Chat Component Styling

```css
/* web/src/styles/chat-components.css */

/* Base message styles */
.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.message--user {
  align-items: flex-end;
}

.message--agent {
  align-items: flex-start;
}

.message-content {
  background: hsl(var(--muted) / 0.1);
  padding: 12px 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 0;
  max-width: 600px;
  font-size: 14px;
  font-weight: 300;
  line-height: 1.6;
}

.message--user .message-content {
  background: hsl(var(--accent) / 0.1);
  border-color: hsl(var(--accent) / 0.3);
}

/* Component grid in messages */
.message-components {
  width: 100%;
  max-width: 1200px;
  margin-top: 12px;
  border: 1px solid hsl(var(--accent) / 0.3);
}

.message--with-components {
  width: 100%;
  max-width: 100%;
}

/* Interactive prompts */
.message-interactive-prompt {
  width: 100%;
  max-width: 600px;
  margin-top: 8px;
}

/* Inline Poll */
.inline-poll {
  border: 1px solid hsl(var(--border));
  padding: 16px;
  background: hsl(var(--background));
}

.inline-poll-question {
  font-size: 16px;
  font-weight: 400;
  margin-bottom: 16px;
}

.poll-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.15s ease;
}

.poll-option:hover {
  border-color: hsl(var(--accent));
  background: hsl(var(--accent) / 0.02);
}

/* Poll Results */
.poll-result-bar {
  height: 8px;
  background: hsl(var(--muted) / 0.2);
  border: 1px solid hsl(var(--border));
}

.poll-result-bar-fill {
  height: 100%;
  background: hsl(var(--accent));
  transition: width 0.3s ease;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.quick-action-button {
  padding: 8px 12px;
  border: 1px solid hsl(var(--border));
  background: transparent;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-action-button:hover {
  border-color: hsl(var(--accent));
  background: hsl(var(--accent) / 0.05);
}
```

---

### Implementation Checklist

To implement AI-to-chat component rendering:

**Backend:**
- [ ] Update Convex schema (messages table with renderType, componentConfig, interactivePrompt)
- [ ] Create AI agent action (processUserMessage with Claude API integration)
- [ ] Create AIMessageDecision types (TypeScript interfaces for AI output)
- [ ] Create createAIMessage mutation
- [ ] Create respondToInteractivePrompt mutation

**Frontend:**
- [ ] Build DynamicMessageRenderer (interprets renderType and renders accordingly)
- [ ] Build TextMessage component
- [ ] Build ComponentGridMessage component
- [ ] Build InteractivePromptMessage component
- [ ] Build MixedMessage component
- [ ] Build InlinePoll component
- [ ] Build QuickActions component
- [ ] Build ConfirmationPrompt component
- [ ] Build MultiChoice component
- [ ] Update MessageList to use DynamicMessageRenderer
- [ ] Add chat component styles (CSS)
- [ ] Implement Zustand scoping (DashboardStoreProvider per component grid)

**Testing:**
- [ ] Test text-only messages
- [ ] Test component grid messages
- [ ] Test interactive prompts
- [ ] Test mixed messages
- [ ] Test multiplayer interactions (multiple users seeing/responding)
- [ ] Test Zustand isolation (multiple grids don't interfere)

---

## Design Aesthetic

### Philosophy

**"Ultra-Minimal Precision"**

The Fluid UI aesthetic is characterized by:

1. **Sharp edges**: Zero border-radius (border-radius: 0)
2. **Emergent borders**: Borders appear only where components meet
3. **Ultrathin typography**: Font-weight 300 base, 400 for headings, 600 for emphasis only
4. **Minimal color**: Grayscale with selective accent highlights
5. **Precise spacing**: 4px, 8px, 12px, 16px increments (no arbitrary values)
6. **Thin lines**: 1px borders with low opacity (0.1-0.3)
7. **Subtle depth**: Inset shadows, not drop shadows

### Color System

```css
/* Based on shadcn/ui HSL variables */
--background: White/Black (theme-dependent)
--foreground: Black/White (high contrast)
--accent: Primary brand color (used sparingly)
--accent-foreground: Accent text color
--muted: Low-emphasis content
--muted-foreground: Secondary text
--border: Subtle dividers (accent / 0.2-0.3)
```

### Typography Scale

```css
/* Base: font-weight 300 (ultrathin) */
Body: 12px / 300 weight / 1.6 line-height
Small: 10px / 400 weight / 1.4 line-height

/* Headers */
H1: 32px / 300 weight / 1.25 line-height / -0.02em tracking
H2: 24px / 400 weight / 1.3 line-height / -0.01em tracking
H3: 18px / 400 weight / 1.4 line-height

/* Special */
Monospace (data): SF Mono / tabular-nums
Uppercase (labels): 0.85em / 500 weight / 0.05em tracking
```

### Component Borders

**"Emergent Borders" System:**

```css
/* Components don't have borders by default */
/* Borders emerge where components meet in grid */

.fluid-component {
  border-right: 1px solid hsl(var(--accent) / 0.3);
  border-bottom: 1px solid hsl(var(--accent) / 0.3);
  box-shadow: inset 0 0 0 1px hsl(var(--accent) / 0.1);
}

/* Remove border on last component in row */
.fluid-component--last {
  border-right: none;
}

/* Remove bottom border on last row */
.fluid-grid-row:last-child .fluid-component {
  border-bottom: none;
}
```

### Interactive States

```css
/* Buttons */
.fluid-button {
  border-radius: 0;
  border: 1px solid hsl(var(--border));
  background: transparent;
  font-weight: 400;
  letter-spacing: 0.01em;
  transition: all 0.15s ease;
}

.fluid-button:hover {
  border-color: hsl(var(--accent));
  background: hsl(var(--accent) / 0.05);
}

.fluid-button:active {
  background: hsl(var(--accent) / 0.1);
}

/* Inputs */
.fluid-input {
  border-radius: 0;
  border: 1px solid hsl(var(--border));
  background: transparent;
  font-weight: 300;
  transition: all 0.15s ease;
}

.fluid-input:focus {
  border-color: hsl(var(--accent));
  background: hsl(var(--accent) / 0.02);
  outline: none;
}
```

### Status Badges

```css
/* Sharp, minimal badges with thin borders */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.02em;
  border-radius: 0; /* Sharp */
  border: 1px solid;
}

/* Variants */
.status-badge--in-progress {
  background: hsl(var(--accent) / 0.1);
  border-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.status-badge--completed {
  background: hsl(var(--muted) / 0.5);
  border-color: hsl(var(--border));
  color: hsl(var(--muted-foreground));
}

.status-badge--blocked {
  background: hsl(0 100% 50% / 0.1);
  border-color: hsl(0 100% 50% / 0.5);
  color: hsl(0 100% 40%);
}
```

### Tables

```css
/* Ultrathin tables with precise alignment */
.fluid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-weight: 300;
}

.fluid-table thead th {
  text-align: left;
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--accent));
}

.fluid-table tbody td {
  padding: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.fluid-table tbody tr:hover {
  background: hsl(var(--accent) / 0.02);
}
```

### Highlights & Animations

```css
/* AI-triggered highlights */
@keyframes fluid-highlight-pulse {
  0%, 100% {
    box-shadow: inset 0 0 0 2px hsl(var(--accent) / 0.3);
  }
  50% {
    box-shadow: inset 0 0 0 2px hsl(var(--accent) / 0.6);
  }
}

.fluid-component--highlighted {
  animation: fluid-highlight-pulse 2s ease-in-out infinite;
}

/* AI attention-grab animations */
@keyframes fluid-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.fluid-component--shake {
  animation: fluid-shake 0.3s ease-in-out;
}

@keyframes fluid-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 hsl(var(--accent) / 0);
  }
  50% {
    box-shadow: 0 0 16px 2px hsl(var(--accent) / 0.4);
  }
}

.fluid-component--glow {
  animation: fluid-glow 1.5s ease-in-out infinite;
}
```

### Spacing System

```css
/* Consistent 4px-based scale */
.fluid-space-4 { gap: 4px; }
.fluid-space-8 { gap: 8px; }
.fluid-space-12 { gap: 12px; }
.fluid-space-16 { gap: 16px; }

/* Component padding: 16px standard */
.fluid-component { padding: 16px; }

/* Section spacing */
.fluid-text-row--comfortable { padding: 32px 0; }
.fluid-text-row--tight { padding: 16px 0; }
.fluid-text-row--flush { padding: 8px 0; }
```

### Design Checklist

Every component must:

- ✅ Use `border-radius: 0` (no rounded corners)
- ✅ Base typography: `font-weight: 300`
- ✅ Headings: `font-weight: 400`
- ✅ Emphasis only: `font-weight: 600`
- ✅ Colors from HSL CSS variables
- ✅ 1px borders with opacity (no thick borders)
- ✅ Spacing in 4px increments
- ✅ Transitions: `0.15s ease` for micro-interactions
- ✅ Tables: uppercase 10px headers with tracking
- ✅ Monospace for data/numbers

---

## Component Taxonomy

Components are organized into **8 categories** based on behavior:

### Category Definitions

1. **📊 Data Display**: Read-only visualization (no user interaction)
2. **🎯 Interactive Selection**: User selects items, updates Zustand selections (masters)
3. **🔍 Detail/Filter**: React to Zustand selections, show filtered data (listeners)
4. **🤖 AI Interactive**: AI asks questions, user responds inline (polls, confirmations)
5. **✏️ Input/Form**: User enters data, submits to Convex
6. **📈 Visualization**: Charts, graphs, timelines
7. **📌 Status/Summary**: KPIs, progress indicators, alerts
8. **🏗️ Layout/Container**: Structural components (grids, tabs, modals)

### Grid Sizing

- **1x1**: Single cell (e.g., KPI card, status badge)
- **1x2**: Single column, double height (e.g., task list, expense table)
- **2x1**: Double width, single height (e.g., timeline, progress bar)
- **2x2**: Large component (e.g., Gantt chart, calendar)
- **Full**: Spans entire row (e.g., text section, tab container)

### Component Props Pattern

All components follow this interface:

```typescript
interface BaseComponentProps {
  id: string;              // Unique instance ID
  eventId: Id<"events">;   // Event context
  // ... component-specific props
}

// Example
interface TasksByVendorProps extends BaseComponentProps {
  showProgress?: boolean;
  showUnassigned?: boolean;
  compact?: boolean;
}
```

---

## Zustand Store Specification

### Store Structure

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Id } from '../convex/_generated/dataModel';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardConfig {
  sections: Array<{
    type: "row" | "text";
    layout?: string | string[]; // "1:1", "2:1", ["300px", "1fr"]
    content?: string; // For text sections (markdown)
    components?: ComponentInstance[];
  }>;
  metadata?: {
    name: string;
    description: string;
    createdAt: number;
    createdBy?: "ai" | "user";
  };
}

interface ComponentInstance {
  id: string;           // Unique instance ID
  type: string;         // Component type (registered name)
  props: Record<string, any>; // Component-specific props
  gridPosition?: {      // Optional grid metadata
    row: number;
    column: number;
    span: number;
  };
}

interface SelectionState {
  taskId: string | null;
  vendorId: string | null;
  category: string | null;
  phase: string | null;
  milestoneId: string | null;
  expenseId: string | null;
  dateRange: [number, number] | null;
  assigneeId: string | null;
  pollId: string | null;
}

interface ActivePrompt {
  id: string;
  type: "poll" | "confirmation" | "permission" | "quickActions" | "input";
  component: string;    // Component type to render
  props: Record<string, any>;
  createdAt: number;
  expiresAt?: number;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

export interface DashboardStore {
  // ===== Dashboard Configuration =====
  config: DashboardConfig | null;
  setConfig: (config: DashboardConfig) => void;
  updateComponentProps: (componentId: string, props: Partial<any>) => void;
  removeComponent: (componentId: string) => void;
  addComponent: (component: ComponentInstance, rowIndex: number) => void;

  // ===== Selections (Cross-Component State) =====
  selections: SelectionState;
  select: <K extends keyof SelectionState>(
    key: K,
    value: SelectionState[K]
  ) => void;
  clearSelection: (key: keyof SelectionState) => void;
  clearAllSelections: () => void;

  // ===== Visual States =====
  highlightedComponents: Set<string>;
  highlightComponent: (componentId: string, duration?: number) => void;
  clearHighlights: () => void;

  animatingComponents: Map<string, "pulse" | "shake" | "glow">;
  animateComponent: (componentId: string, type: "pulse" | "shake" | "glow") => void;
  stopAnimation: (componentId: string) => void;

  expandedPanels: Set<string>;
  togglePanel: (panelId: string) => void;
  expandPanel: (panelId: string) => void;
  collapsePanel: (panelId: string) => void;

  // ===== AI Interactions =====
  activePrompts: Map<string, ActivePrompt>;
  addPrompt: (prompt: ActivePrompt) => void;
  removePrompt: (promptId: string) => void;
  respondToPrompt: (promptId: string, response: any) => void;

  // ===== Transient UI State =====
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  errors: Array<{ id: string; message: string; timestamp: number }>;
  addError: (message: string) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;

  toasts: Array<{
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error"
  }>;
  showToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  hideToast: (id: string) => void;

  modals: Map<string, { component: string; props: Record<string, any> }>;
  openModal: (id: string, component: string, props: Record<string, any>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // ===== Utility =====
  reset: () => void;
}
```

### Usage Patterns

**Reading from Store:**

```typescript
// Granular selectors (component only re-renders when this value changes)
const selectedVendor = useDashboardStore(state => state.selections.vendorId);
const config = useDashboardStore(state => state.config);
const isHighlighted = useDashboardStore(state =>
  state.highlightedComponents.has("my-component-id")
);

// Multiple values (shallow equality check)
const { taskId, vendorId } = useDashboardStore(state => ({
  taskId: state.selections.taskId,
  vendorId: state.selections.vendorId,
}));
```

**Writing to Store:**

```typescript
// Get action functions
const select = useDashboardStore(state => state.select);
const highlightComponent = useDashboardStore(state => state.highlightComponent);

// Call actions
select("vendorId", "vendor-123");
highlightComponent("expense-list", 3000); // Highlight for 3 seconds
```

**Convenience Hooks:**

```typescript
// Pre-built hooks for common patterns
export const useConfig = () => useDashboardStore(state => state.config);
export const useSelections = () => useDashboardStore(state => state.selections);
export const useHighlights = () => useDashboardStore(state => state.highlightedComponents);
export const useActivePrompts = () => useDashboardStore(state => state.activePrompts);
```

### Scoped Instances

Each dashboard gets its own Zustand store instance via React Context:

```typescript
const DashboardStoreContext = createContext<DashboardStore | null>(null);

export function DashboardStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<DashboardStore>();

  if (!storeRef.current) {
    storeRef.current = createDashboardStore();
  }

  return (
    <DashboardStoreContext.Provider value={storeRef.current}>
      {children}
    </DashboardStoreContext.Provider>
  );
}

// Usage in app
<DashboardStoreProvider>
  <LayoutController />
</DashboardStoreProvider>
```

---

## Component Checklist

### 📊 Category 1: Data Display Components (9)

**Purpose:** Read-only visualization, no user interaction

| # | Component | Description | Grid Size | Props | Priority |
|---|-----------|-------------|-----------|-------|----------|
| 1 | EventDetails | Event name, date, location, guest count | 1x1 | `eventId` | P0 ✅ |
| 2 | BudgetSummary | Total/spent/remaining with pie chart | 1x1 | `eventId` | P0 |
| 3 | TaskSummary | Task counts by status (compact card) | 1x1 | `eventId` | P1 |
| 4 | VendorDirectory | List of all vendors with status | 1x2 | `eventId` | P1 |
| 5 | GuestList | Table of invitees with RSVP status | 2x2 | `eventId` | P2 |
| 6 | ActivityFeed | Recent changes/updates timeline | 1x2 | `eventId, limit` | P1 |
| 7 | DecisionLog | History of decisions made (poll results) | 1x2 | `eventId` | P2 |
| 8 | PaymentSchedule | Upcoming payment due dates | 1x1 | `eventId` | P1 |
| 9 | DocumentLibrary | Uploaded files (contracts, receipts) | 2x2 | `eventId` | P2 |

---

### 🎯 Category 2: Interactive Selection Components (9)

**Purpose:** User selects items, updates Zustand selections (masters)

| # | Component | Description | Updates Zustand | Grid Size | Priority |
|---|-----------|-------------|-----------------|-----------|----------|
| 1 | TasksByPhase | Grouped tasks by planning phase | `selections.phase`, `selections.taskId` | 1x2 | P0 ✅ |
| 2 | TasksByVendor | Tasks grouped by vendor assignment | `selections.vendorId`, `selections.taskId` | 1x2 | P0 ✅ |
| 3 | ExpensesByCategory | Expenses grouped by category | `selections.category`, `selections.expenseId` | 1x2 | P0 |
| 4 | VendorSelector | Clickable vendor cards | `selections.vendorId` | 1x1 | P1 |
| 5 | PhaseNavigator | Event phases as clickable timeline | `selections.phase` | 2x1 | P1 |
| 6 | CategoryFilter | Category chips/badges | `selections.category` | 1x1 | P1 |
| 7 | DateRangePicker | Calendar with range selection | `selections.dateRange` | 1x1 | P1 |
| 8 | TeamRoster | Team members with role badges | `selections.assigneeId` | 1x1 | P2 |
| 9 | MilestoneTimeline | Clickable milestone markers | `selections.milestoneId` | 2x1 | P1 ✅ |

---

### 🔍 Category 3: Detail/Filter Components (8)

**Purpose:** React to Zustand selections, show filtered data (listeners)

| # | Component | Description | Reads Zustand | Grid Size | Priority |
|---|-----------|-------------|---------------|-----------|----------|
| 1 | ExpensesList | Filterable expense table | `selections.category`, `selections.vendorId` | 1x2 | P0 ✅ |
| 2 | TasksList | Filterable task list | `selections.phase`, `selections.vendorId` | 1x2 | P0 ✅ |
| 3 | TasksKanban | Kanban board filtered by selections | `selections.phase`, `selections.assigneeId` | 2x2 | P1 ✅ |
| 4 | TaskGanttChart | Gantt view filtered by selections | `selections.phase`, `selections.dateRange` | 2x2 | P2 ✅ |
| 5 | VendorTaskBoard | Tasks for a specific vendor | `selections.vendorId` | 1x2 | P1 ✅ |
| 6 | ExpenseDetails | Detailed view of single expense | `selections.expenseId` | 1x2 | P2 |
| 7 | TaskDetails | Single task deep dive | `selections.taskId` | 1x2 | P2 |
| 8 | VendorProfile | Vendor information card | `selections.vendorId` | 1x1 | P2 |

---

### 🤖 Category 4: AI Interactive Components (13)

**Purpose:** AI asks questions, user responds inline

| # | Component | Description | Interaction | Grid Size | Priority |
|---|-----------|-------------|-------------|-----------|----------|
| 1 | InlinePoll | AI-generated poll in chat | User votes, AI sees results | 1x1 | P0 |
| 2 | ConfirmationPrompt | AI asks for confirmation | User clicks Yes/No/Maybe | 1x1 | P0 |
| 3 | PermissionRequest | AI requests access/action | User grants/denies | 1x1 | P0 |
| 4 | QuickActions | AI-suggested action buttons | User clicks action | 1x1 | P0 |
| 5 | MultiChoice | AI presents options (2-5 choices) | User selects option(s) | 1x1 | P0 |
| 6 | SliderInput | AI asks for numeric range | User adjusts slider | 1x1 | P1 |
| 7 | DateSelector | AI asks for date/time | User picks from calendar | 1x1 | P1 |
| 8 | FileUploadPrompt | AI requests file (receipt, contract) | User uploads file | 1x1 | P1 |
| 9 | TextPrompt | AI asks open-ended question | User types response | 1x1 | P1 |
| 10 | RatingInput | AI asks for rating (1-5 stars) | User clicks stars | 1x1 | P2 |
| 11 | LocationPicker | AI asks for location | User enters address/map | 1x1 | P2 |
| 12 | ColorPicker | AI asks for color choice | User picks color | 1x1 | P2 |
| 13 | BudgetSplitSelector | AI suggests split, user adjusts | User drags percentages | 1x2 | P1 |

**Component Pattern:**

```typescript
interface InlinePollProps extends BaseComponentProps {
  question: string;
  options: Array<{ id: string; label: string; description?: string }>;
  allowMultiple?: boolean;
  deadline?: number;
  requiredVoters?: string[];
}

function InlinePoll(props: InlinePollProps) {
  const addPrompt = useDashboardStore(state => state.addPrompt);
  const removePrompt = useDashboardStore(state => state.removePrompt);
  const [votes, setVotes] = useState<string[]>([]);

  const handleVote = async () => {
    // Save vote to Convex
    await convexMutation(api.polls.vote, { pollId: props.id, optionIds: votes });
    // Remove from active prompts
    removePrompt(props.id);
  };

  return (
    <div className="fluid-card">
      <h3 className="fluid-component-title">{props.question}</h3>
      {/* Render options */}
      <button onClick={handleVote} className="fluid-button fluid-button--primary">
        Submit Vote
      </button>
    </div>
  );
}
```

---

### ✏️ Category 5: Input/Form Components (7)

**Purpose:** User enters data, submits to Convex

| # | Component | Description | Convex Mutation | Grid Size | Priority |
|---|-----------|-------------|-----------------|-----------|----------|
| 1 | TaskCreator | Quick task creation form | `api.tasks.create` | 1x1 | P1 |
| 2 | ExpenseCreator | Quick expense entry form | `api.expenses.create` | 1x1 | P1 |
| 3 | VendorContactForm | Reach out to vendor | `api.vendors.sendMessage` | 1x2 | P2 |
| 4 | GuestInviteForm | Add new guest | `api.guests.create` | 1x1 | P2 |
| 5 | BudgetEditor | Edit budget allocations | `api.events.updateBudget` | 1x2 | P2 |
| 6 | TaskEditor | Edit existing task | `api.tasks.update` | 1x2 | P2 |
| 7 | NotesTaker | Free-form notes | `api.notes.save` | 1x2 | P2 |

---

### 📈 Category 6: Visualization Components (10)

**Purpose:** Visual representations of data

| # | Component | Description | Data Source | Grid Size | Priority |
|---|-----------|-------------|-------------|-----------|----------|
| 1 | BudgetPieChart | Category spending breakdown | `api.expenses.listByEvent` | 1x1 | P1 |
| 2 | SpendingTrendChart | Line chart over time | `api.expenses.listByEvent` | 2x1 | P1 |
| 3 | TaskProgressBar | Completion percentage by phase | `api.tasks.listByEvent` | 1x1 | P0 |
| 4 | PhaseProgress | Visual progress cards per phase | `api.tasks.listByEvent` | 2x1 | P0 ✅ |
| 5 | MilestoneTimeline | Timeline with milestone markers | `api.milestones.listByEvent` | 2x1 | P1 ✅ |
| 6 | DeadlineCalendar | Calendar with deadline dots | `api.tasks.listByEvent` | 1x2 | P1 ✅ |
| 7 | GuestRSVPChart | Pie chart of RSVP statuses | `api.guests.listByEvent` | 1x1 | P2 |
| 8 | VendorSpendingChart | Bar chart by vendor | `api.expenses.listByEvent` | 1x1 | P2 |
| 9 | CalendarView | Month/week calendar | `api.events.get` | 2x2 | P1 ✅ |
| 10 | RunOfShowTimeline | Event day schedule | `api.schedules.get` | 2x2 | P1 ✅ |

---

### 📌 Category 7: Status/Summary Components (8)

**Purpose:** High-level overviews, KPIs, progress indicators

| # | Component | Description | Metrics | Grid Size | Priority |
|---|-----------|-------------|---------|-----------|----------|
| 1 | KPIDashboard | 4-6 key metrics cards | Budget, tasks, days, RSVP | 2x1 | P0 |
| 2 | ProgressSummary | Overall completion percentage | Tasks, budget, timeline | 1x1 | P0 |
| 3 | UrgentAlerts | Overdue tasks, late payments | Urgent items only | 1x1 | P0 |
| 4 | NextSteps | Top 3-5 priority actions | AI-prioritized | 1x1 | P0 |
| 5 | BudgetHealth | Budget status indicator | Over/under/on track | 1x1 | P1 |
| 6 | TimelineHealth | Schedule status | Behind/on track/ahead | 1x1 | P1 |
| 7 | VendorStatus | Vendor response/delivery status | Pending vendors | 1x1 | P2 |
| 8 | CollaboratorActivity | Who's active/inactive | User activity | 1x1 | P2 |

---

### 🏗️ Category 8: Layout/Container Components (8)

**Purpose:** Structural components (grids, tabs, modals)

| # | Component | Description | Purpose | Grid Size | Priority |
|---|-----------|-------------|---------|-----------|----------|
| 1 | GridRow | Horizontal component row | Layout structure | Full | P0 ✅ |
| 2 | TextSection | Markdown text block | Section headers | Full | P0 ✅ |
| 3 | TabContainer | Tabbed panel switcher | Group related views | Full | P1 |
| 4 | AccordionSection | Collapsible section | Progressive disclosure | Full | P1 |
| 5 | SplitPane | Resizable split view | Master-detail layout | Full | P2 |
| 6 | ModalOverlay | Full-screen modal | Detail view | Full | P1 |
| 7 | SidePanel | Slide-in side panel | Quick actions | 1x Full | P1 |
| 8 | FloatingCard | Draggable card | Persistent info | Floating | P2 |

---

## Development Priorities

### Phase 1: Foundation (Week 1-2) - Zustand Migration

**Goal:** Remove EventBus, implement Zustand, migrate existing components

**Tasks:**
- [ ] Install Zustand: `bun add zustand`
- [ ] Create `web/src/lib/fluid-ui/store.ts` with full implementation
- [ ] Create `web/src/lib/fluid-ui/DashboardStoreContext.tsx`
- [ ] Replace `<EventBusProvider>` with `<DashboardStoreProvider>`
- [ ] Migrate TasksByVendor → ExpensesList (proof of concept)
- [ ] Migrate TasksByPhase → TasksList
- [ ] Migrate remaining master-detail pairs
- [ ] Delete EventBus files (event-bus.ts, EventBusContext.tsx, useComponentEvents.ts)
- [ ] Update component metadata (remove emits/listensTo)
- [ ] Test all existing components with Zustand
- [ ] Add Redux DevTools integration

**Success Criteria:**
- ✅ All existing components work with Zustand
- ✅ No EventBus references remain
- ✅ DevTools show state updates
- ✅ No performance regressions

---

### Phase 2: AI Interactive Components (Week 3-4)

**Goal:** Build conversational UI components for AI interactions

**Priority 0 (Critical):**
- [ ] InlinePoll - AI-generated polls
- [ ] ConfirmationPrompt - Yes/No/Maybe confirmations
- [ ] QuickActions - AI-suggested action buttons
- [ ] MultiChoice - 2-5 choice selection
- [ ] PermissionRequest - AI requests access

**Priority 1:**
- [ ] SliderInput - Numeric range selection
- [ ] DateSelector - Date/time picker
- [ ] BudgetSplitSelector - Percentage split adjuster
- [ ] TextPrompt - Open-ended text input

**Success Criteria:**
- ✅ 9 AI interactive components functional
- ✅ Components update Zustand activePrompts
- ✅ Responses saved to Convex
- ✅ AI can ask questions and get answers

---

### Phase 3: Selection & Filtering (Week 5)

**Goal:** Complete master-detail architecture

**New Components:**
- [ ] ExpensesByCategory (master)
- [ ] VendorSelector (master)
- [ ] PhaseNavigator (master)
- [ ] CategoryFilter (master)
- [ ] DateRangePicker (master)
- [ ] ExpenseDetails (detail)
- [ ] TaskDetails (detail)
- [ ] VendorProfile (detail)

**Success Criteria:**
- ✅ All master components update Zustand selections
- ✅ All detail components read Zustand selections
- ✅ Seamless cross-component filtering
- ✅ No prop drilling

---

### Phase 4: Data Display & Visualization (Week 6-7)

**Priority 0:**
- [ ] KPIDashboard
- [ ] ProgressSummary
- [ ] UrgentAlerts
- [ ] NextSteps (AI-generated)
- [ ] TaskProgressBar

**Priority 1:**
- [ ] BudgetSummary
- [ ] BudgetPieChart
- [ ] SpendingTrendChart
- [ ] ActivityFeed
- [ ] TaskSummary
- [ ] VendorDirectory
- [ ] PaymentSchedule

**Priority 2:**
- [ ] GuestList
- [ ] DecisionLog
- [ ] DocumentLibrary
- [ ] GuestRSVPChart
- [ ] VendorSpendingChart
- [ ] VendorStatus
- [ ] CollaboratorActivity

**Success Criteria:**
- ✅ Complete data visualization suite
- ✅ Real-time updates via Convex subscriptions
- ✅ Ultra-minimal design aesthetic applied

---

### Phase 5: Input & Forms (Week 8)

**Priority 1:**
- [ ] TaskCreator
- [ ] ExpenseCreator
- [ ] TaskEditor
- [ ] BudgetEditor

**Priority 2:**
- [ ] VendorContactForm
- [ ] GuestInviteForm
- [ ] NotesTaker

**Success Criteria:**
- ✅ Full CRUD operations
- ✅ Optimistic UI updates
- ✅ Form validation
- ✅ Error handling

---

### Phase 6: Layout & Container (Week 9)

**Priority 1:**
- [ ] TabContainer
- [ ] AccordionSection
- [ ] ModalOverlay
- [ ] SidePanel

**Priority 2:**
- [ ] SplitPane
- [ ] FloatingCard

**Success Criteria:**
- ✅ Complete layout toolkit
- ✅ Responsive behavior
- ✅ Keyboard navigation

---

## Implementation Guidelines

### Component Development Checklist

Every component must:

**Structure:**
- [ ] Export component as default
- [ ] Export props interface
- [ ] Export metadata object
- [ ] Register in component registry

**Props:**
- [ ] Extends `BaseComponentProps` (id, eventId)
- [ ] All props have TypeScript types
- [ ] Optional props have sensible defaults

**Zustand Integration:**
- [ ] Uses `useDashboardStore()` for cross-component state
- [ ] Never uses EventBus (removed)
- [ ] Updates Zustand for selections (if master)
- [ ] Reads Zustand for filters (if detail)

**Convex Integration:**
- [ ] Uses `useQuery` for data fetching
- [ ] Uses `useMutation` for data updates
- [ ] Handles loading states
- [ ] Handles error states

**Design:**
- [ ] Follows ultra-minimal aesthetic
- [ ] `border-radius: 0` (sharp edges)
- [ ] `font-weight: 300` base
- [ ] 1px borders with low opacity
- [ ] Spacing in 4px increments
- [ ] Uses CSS classes from `fluid-ui.css`

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] ARIA labels on interactive elements
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

**Testing:**
- [ ] Works in isolation (testbed)
- [ ] Works with other components
- [ ] Mobile responsive
- [ ] Dark mode compatible

### Component Template

```typescript
// web/src/components/dashboard/ExampleComponent.tsx

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useDashboardStore } from "../../lib/fluid-ui/store";

// ============================================================================
// TYPES
// ============================================================================

interface ExampleComponentProps {
  id: string;
  eventId: Id<"events">;
  // ... component-specific props
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ExampleComponent({ id, eventId }: ExampleComponentProps) {
  // Zustand state (granular selectors)
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);
  const select = useDashboardStore(state => state.select);

  // Convex queries
  const data = useQuery(api.tasks.listByEvent, { eventId });
  const updateTask = useMutation(api.tasks.update);

  // Component state (local UI only)
  const [isExpanded, setIsExpanded] = useState(false);

  // Handlers
  const handleClick = (itemId: string) => {
    select("taskId", itemId); // Update Zustand selection
  };

  // Render
  return (
    <div className="fluid-component-content">
      <h3 className="fluid-component-title">Example Component</h3>
      {/* Component content */}
    </div>
  );
}

// ============================================================================
// METADATA
// ============================================================================

export const ExampleComponentMetadata = {
  name: "ExampleComponent",
  description: "Brief description of what this component does",
  layoutRules: {
    canShare: true,
    mustSpanFull: false,
    preferredRatio: "1fr",
    minHeight: "200px",
  },
  props: {
    eventId: { type: "string", required: true },
  },
};
```

### Zustand Usage Patterns

**Master Component (Sets Selection):**

```typescript
function TasksByVendor() {
  const select = useDashboardStore(state => state.select);
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);

  return (
    <div>
      {vendors.map(vendor => (
        <div
          key={vendor.id}
          onClick={() => select("vendorId", vendor.id)}
          className={selectedVendor === vendor.id ? "active" : ""}
        >
          {vendor.name}
        </div>
      ))}
    </div>
  );
}
```

**Detail Component (Reads Selection):**

```typescript
function ExpensesList() {
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);
  const expenses = useQuery(api.expenses.listByEvent, { eventId });

  const filtered = useMemo(() => {
    if (!selectedVendor) return expenses;
    return expenses?.filter(e => e.vendorId === selectedVendor);
  }, [expenses, selectedVendor]);

  return (
    <div>
      {filtered?.map(expense => (
        <div key={expense._id}>{expense.description}</div>
      ))}
    </div>
  );
}
```

**AI Interactive Component:**

```typescript
function InlinePoll({ id, question, options }: InlinePollProps) {
  const addPrompt = useDashboardStore(state => state.addPrompt);
  const removePrompt = useDashboardStore(state => state.removePrompt);
  const [votes, setVotes] = useState<string[]>([]);

  const votePoll = useMutation(api.polls.vote);

  const handleSubmit = async () => {
    await votePoll({ pollId: id, optionIds: votes });
    removePrompt(id); // Remove from active prompts
  };

  return (
    <div className="fluid-card">
      <h3>{question}</h3>
      {options.map(opt => (
        <label key={opt.id}>
          <input
            type="checkbox"
            checked={votes.includes(opt.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setVotes([...votes, opt.id]);
              } else {
                setVotes(votes.filter(v => v !== opt.id));
              }
            }}
          />
          {opt.label}
        </label>
      ))}
      <button onClick={handleSubmit}>Submit Vote</button>
    </div>
  );
}
```

### AI Dashboard Config Example

```typescript
// AI outputs this to Convex
const dashboardConfig: DashboardConfig = {
  sections: [
    {
      type: "text",
      content: "# Vendor Management Dashboard\nOverview of all vendor tasks and expenses.",
      spacing: "comfortable",
    },
    {
      type: "row",
      layout: "2:1", // TasksByVendor (2fr) + ExpensesList (1fr)
      components: [
        {
          id: "vendor-tasks",
          type: "TasksByVendor",
          props: {
            eventId: "event_abc123",
            showProgress: true,
            showUnassigned: true,
          },
        },
        {
          id: "vendor-expenses",
          type: "ExpensesList",
          props: {
            eventId: "event_abc123",
            paymentStatus: "all",
          },
        },
      ],
    },
    {
      type: "row",
      layout: "1:1",
      components: [
        {
          id: "budget-pie",
          type: "BudgetPieChart",
          props: {
            eventId: "event_abc123",
          },
        },
        {
          id: "next-steps",
          type: "NextSteps",
          props: {
            eventId: "event_abc123",
            limit: 5,
          },
        },
      ],
    },
  ],
  metadata: {
    name: "Vendor Management Dashboard",
    description: "Track vendor assignments and spending",
    createdAt: Date.now(),
    createdBy: "ai",
  },
};

// Frontend loads this from Convex
const aiConfig = useQuery(api.dashboards.getConfig, { eventId });

// Load into Zustand
const setConfig = useDashboardStore(state => state.setConfig);
useEffect(() => {
  if (aiConfig) setConfig(aiConfig);
}, [aiConfig, setConfig]);

// LayoutController renders from Zustand
const config = useDashboardStore(state => state.config);
return <LayoutController config={config} />;
```

---

## Summary

### Total Component Count

| Category | Count | Priority 0 | Priority 1 | Priority 2 |
|----------|-------|------------|------------|------------|
| 📊 Data Display | 9 | 2 | 4 | 3 |
| 🎯 Interactive Selection | 9 | 3 | 5 | 1 |
| 🔍 Detail/Filter | 8 | 2 | 3 | 3 |
| 🤖 AI Interactive | 13 | 5 | 4 | 4 |
| ✏️ Input/Form | 7 | 0 | 4 | 3 |
| 📈 Visualization | 10 | 2 | 5 | 3 |
| 📌 Status/Summary | 8 | 4 | 2 | 2 |
| 🏗️ Layout/Container | 8 | 2 | 4 | 2 |
| **TOTAL** | **72** | **20** | **31** | **21** |

### Timeline

- **Week 1-2:** Foundation (Zustand migration)
- **Week 3-4:** AI Interactive components (13 components)
- **Week 5:** Selection & Filtering (8 components)
- **Week 6-7:** Data Display & Visualization (19 components)
- **Week 8:** Input & Forms (7 components)
- **Week 9:** Layout & Container (6 components)

**Total: 9 weeks for 72 components** (~8 components/week)

---

## Quick Reference

### File Structure

```
web/src/
├── lib/fluid-ui/
│   ├── store.ts                    # Zustand store implementation
│   ├── DashboardStoreContext.tsx   # React Context wrapper
│   ├── types.ts                    # Type definitions
│   ├── registry.ts                 # Component registry
│   ├── validators.ts               # Config validation
│   └── hooks/
│       └── useSelections.ts        # Convenience hooks
├── components/
│   ├── fluid-ui/
│   │   ├── layout-controller.tsx   # Main orchestrator
│   │   ├── grid-row.tsx            # Row renderer
│   │   ├── component-renderer.tsx  # Component wrapper
│   │   └── text-row.tsx            # Markdown sections
│   └── dashboard/
│       ├── [72 dashboard components]
│       └── ai-interactive/
│           ├── InlinePoll.tsx
│           ├── ConfirmationPrompt.tsx
│           └── [11 more AI components]
└── styles/
    └── fluid-ui.css                # Design system

convex/
├── dashboards.ts                   # Dashboard config CRUD
├── tasks.ts                        # Task operations
├── expenses.ts                     # Expense operations
└── aiInteractions.ts               # AI prompt handling
```

### CSS Classes Quick Reference

```css
/* Layout */
.fluid-dashboard
.fluid-grid-row
.fluid-component
.fluid-component--last

/* Typography */
.fluid-mono          /* Monospace data */
.fluid-caps          /* Uppercase labels */

/* Interactive */
.fluid-button
.fluid-button--primary
.fluid-input
.fluid-table

/* Status */
.status-badge--in-progress
.status-badge--completed
.status-badge--blocked
.status-badge--overdue

/* Utilities */
.fluid-space-4       /* gap: 4px */
.fluid-space-8       /* gap: 8px */
.fluid-divider       /* Thin line */
.fluid-card          /* Minimal card */
```

### Zustand Selectors Quick Reference

```typescript
// Selections
const taskId = useDashboardStore(s => s.selections.taskId);
const vendorId = useDashboardStore(s => s.selections.vendorId);
const category = useDashboardStore(s => s.selections.category);

// Actions
const select = useDashboardStore(s => s.select);
const highlight = useDashboardStore(s => s.highlightComponent);
const showToast = useDashboardStore(s => s.showToast);

// Config
const config = useDashboardStore(s => s.config);
const setConfig = useDashboardStore(s => s.setConfig);
```

---

**End of Specification**

*This document serves as the single source of truth for the Fluid UI System. All components, patterns, and design decisions should reference this spec.*
