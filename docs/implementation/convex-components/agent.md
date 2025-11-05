# Agent Component Implementation Guide

## Overview

### What It Does
The Agent component provides a comprehensive framework for building AI-powered agents in our event management application. It manages:
- Conversation threads and message history
- Automatic context inclusion in LLM calls
- Built-in hybrid vector/text search for messages
- Tool integration for agent capabilities
- Persistent message storage across sessions
- Multi-user and multi-agent collaboration

### Why We Need It
Our event planning app can benefit immensely from AI assistance:
- Help coordinators plan events through natural conversation
- Suggest vendors based on requirements and budget
- Auto-generate task lists from chat conversations
- Answer questions about event planning best practices
- Detect user intent (create task, log expense, schedule poll)
- Provide personalized recommendations

The Agent component provides the infrastructure to build these AI features without reinventing message persistence, context management, or RAG (Retrieval-Augmented Generation).

### Use Cases in Our App
1. **Event Planning Assistant**: AI chatbot that helps plan events
2. **Vendor Recommendations**: AI suggests vendors based on requirements
3. **Task Auto-Generation**: Detect task creation intent from chat
4. **Expense Tracking**: Natural language expense logging
5. **FAQ Bot**: Answer common event planning questions
6. **Budget Advisor**: AI-powered budget recommendations
7. **Timeline Generator**: Create event timelines from descriptions

---

## Installation Steps

### 1. Install Package

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/agent
```

### 2. Install AI SDK Dependencies

```bash
npm install ai openai @ai-sdk/openai
```

### 3. Update Convex Configuration

Edit `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import presence from "@convex-dev/presence/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(presence);
app.use(r2);
app.use(agent);

export default app;
```

### 4. Set Environment Variables

```bash
npx convex env set OPENAI_API_KEY "sk-..."
```

Optionally for other providers:
```bash
npx convex env set ANTHROPIC_API_KEY "sk-ant-..."
```

### 5. Run Development Server

```bash
npx convex dev
```

---

## Integration Points

### Where This Component Will Be Used

1. **AI Event Planner** (`web/convex/ai/eventPlanner.ts`)
   - Conversational event planning assistant
   - Suggest vendors, venues, and timelines

2. **Intent Detection** (`web/convex/ai/intentDetection.ts`)
   - Analyze messages for task/expense/poll creation intent
   - Auto-populate forms based on natural language

3. **Vendor Matching** (`web/convex/ai/vendorMatcher.ts`)
   - Match user requirements with vendor database
   - RAG over vendor profiles and reviews

4. **FAQ Assistant** (`web/convex/ai/faqBot.ts`)
   - Answer common event planning questions
   - Search knowledge base

5. **Budget Advisor** (`web/convex/ai/budgetAdvisor.ts`)
   - Analyze expenses and provide recommendations
   - Predict costs for event categories

---

## Code Examples

### Backend Implementation

Create `web/convex/ai/agents.ts`:

```typescript
import { components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { action, internalAction } from "../_generated/server";
import { openai } from "@ai-sdk/openai";
import { v } from "convex/values";
import { getAuthenticatedUser } from "../authHelpers";
import { internal } from "../_generated/api";

/**
 * Event Planning Assistant Agent
 * Helps coordinators plan their events through conversation
 */
export const eventPlannerAgent = new Agent(components.agent, {
  name: "Event Planning Assistant",
  
  // Use GPT-4 for complex planning tasks
  chat: openai.chat("gpt-4o"),
  
  instructions: `You are a professional event planning assistant helping users plan their events.

Your capabilities:
- Suggest vendors based on budget and requirements
- Create task lists for different event types (weddings, corporate events, parties)
- Provide budget estimates for various event categories
- Offer timeline recommendations
- Answer event planning questions

Guidelines:
- Be friendly, professional, and encouraging
- Ask clarifying questions when requirements are unclear
- Provide actionable, specific advice
- Consider budget constraints in all recommendations
- Cite sources when providing cost estimates

When users describe what they need, analyze their requirements and suggest:
1. Recommended vendors or categories
2. Estimated costs
3. Timeline considerations
4. Potential challenges to plan for`,

  // Tools the agent can call
  tools: {
    searchVendors: {
      description: "Search for vendors matching specific criteria",
      parameters: v.object({
        category: v.string(),
        budget: v.optional(v.number()),
        location: v.optional(v.string()),
      }),
      handler: async (ctx, args) => {
        // Implement vendor search logic
        // This would query your vendors database
        return {
          vendors: [
            { name: "Example Vendor", category: args.category, rating: 4.5 }
          ]
        };
      },
    },
    
    createTaskList: {
      description: "Generate a task list for an event type",
      parameters: v.object({
        eventType: v.string(),
        eventDate: v.optional(v.number()),
      }),
      handler: async (ctx, args) => {
        // Generate task list based on event type
        return {
          tasks: [
            { title: "Book venue", dueDate: "3 months before", priority: "high" },
            { title: "Send invitations", dueDate: "6 weeks before", priority: "medium" },
          ]
        };
      },
    },
    
    estimateBudget: {
      description: "Estimate budget for event categories",
      parameters: v.object({
        eventType: v.string(),
        guestCount: v.number(),
      }),
      handler: async (ctx, args) => {
        // Provide budget estimates
        return {
          estimates: {
            venue: { min: 2000, max: 5000 },
            catering: { min: 30 * args.guestCount, max: 75 * args.guestCount },
            photography: { min: 1500, max: 3500 },
          }
        };
      },
    },
  },
});

/**
 * Send a message to the event planner agent
 */
export const chatWithEventPlanner = action({
  args: {
    threadId: v.optional(v.id("agent_threads")),
    eventId: v.id("events"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Create or get thread
    let threadId = args.threadId;
    if (!threadId) {
      // Create new thread for this event
      threadId = await eventPlannerAgent.createThread(ctx, {
        metadata: {
          eventId: args.eventId,
          userId: userProfile._id,
        },
      });
    }
    
    // Send user message
    await eventPlannerAgent.sendMessage(ctx, {
      threadId,
      role: "user",
      content: args.message,
    });
    
    // Get AI response
    const response = await eventPlannerAgent.run(ctx, {
      threadId,
      stream: false, // Set to true for streaming
    });
    
    return {
      threadId,
      response,
    };
  },
});

/**
 * Intent Detection Agent
 * Analyzes messages to detect user intent (create task, log expense, etc.)
 */
export const intentDetectionAgent = new Agent(components.agent, {
  name: "Intent Detector",
  chat: openai.chat("gpt-4o-mini"), // Faster model for quick classification
  
  instructions: `Analyze user messages to detect their intent.

Possible intents:
- task: User wants to create a task (e.g., "We need to book a photographer")
- expense: User is logging an expense (e.g., "Paid $500 deposit for venue")
- poll: User wants to create a poll (e.g., "Let's vote on the menu options")
- calendar: User mentions a date/deadline (e.g., "The event is on June 15th")
- vendor_suggestion: User is asking for vendor recommendations
- none: Normal conversation

Extract relevant entities:
- Task: title, category, due date, assignee
- Expense: amount, description, category
- Poll: question, options
- Calendar: date, time, description

Return your analysis as structured JSON.`,

  tools: {
    analyzeIntent: {
      description: "Analyze message for user intent",
      parameters: v.object({
        message: v.string(),
      }),
      handler: async (ctx, args) => {
        // This would be called by the AI with analysis results
        return { success: true };
      },
    },
  },
});

/**
 * Analyze a message for intent
 */
export const detectIntent = action({
  args: {
    messageId: v.id("messages"),
    messageText: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);
    
    // Run intent detection
    const result = await intentDetectionAgent.run(ctx, {
      messages: [
        {
          role: "user",
          content: args.messageText,
        },
      ],
      stream: false,
    });
    
    // Parse intent from response
    // Update message with detected intent
    await ctx.runMutation(internal.messages.updateIntent, {
      messageId: args.messageId,
      intent: result.intent,
      entities: result.entities,
    });
    
    return result;
  },
});
```

Create `web/convex/ai/vendorMatcher.ts` for RAG-based vendor matching:

```typescript
import { components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { action } from "../_generated/server";
import { openai } from "@ai-sdk/openai";
import { v } from "convex/values";
import { getAuthenticatedUser } from "../authHelpers";

/**
 * Vendor Matching Agent with RAG
 * Uses vector search to find relevant vendors
 */
export const vendorMatcherAgent = new Agent(components.agent, {
  name: "Vendor Matcher",
  chat: openai.chat("gpt-4o"),
  
  instructions: `You are a vendor recommendation expert for event planning.

Your job:
1. Understand user requirements (budget, location, event type, preferences)
2. Search the vendor database for matches
3. Provide 3-5 vendor recommendations with reasoning
4. Explain pros/cons of each recommendation
5. Suggest follow-up questions to ask vendors

Always consider:
- Budget constraints
- Location/availability
- Vendor ratings and reviews
- Event type compatibility
- User preferences`,

  tools: {
    searchVendors: {
      description: "Search vendor database with vector similarity",
      parameters: v.object({
        query: v.string(),
        category: v.optional(v.string()),
        maxResults: v.optional(v.number()),
      }),
      handler: async (ctx, args) => {
        // This would use the vector search capability
        // from the agent component
        
        // For now, mock response
        return {
          vendors: [
            {
              name: "Elite Photography",
              category: "photographer",
              rating: 4.8,
              priceRange: "$2000-$4000",
              description: "Specializes in wedding and event photography",
            },
          ],
        };
      },
    },
  },
});

/**
 * Get vendor recommendations based on requirements
 */
export const getVendorRecommendations = action({
  args: {
    eventId: v.id("events"),
    requirements: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);
    
    const response = await vendorMatcherAgent.run(ctx, {
      messages: [
        {
          role: "user",
          content: `I need a ${args.category || "vendor"} for my event. Requirements: ${args.requirements}`,
        },
      ],
      stream: false,
    });
    
    return response;
  },
});
```

### Frontend Implementation

Create `web/src/hooks/useAIChat.ts`:

```typescript
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useAIChat(eventId: Id<"events">) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<Id<"agent_threads">>();
  
  const chatAction = useAction(api.ai.agents.chatWithEventPlanner);

  const sendMessage = async (message: string) => {
    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const result = await chatAction({
        threadId,
        eventId,
        message,
      });

      // Update thread ID if new
      if (!threadId) {
        setThreadId(result.threadId);
      }

      // Add AI response to UI
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response.content },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    loading,
    threadId,
  };
}
```

Create `web/src/components/ai/EventPlannerChat.tsx`:

```typescript
import { useState } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Bot, User } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface EventPlannerChatProps {
  eventId: Id<"events">;
}

export function EventPlannerChat({ eventId }: EventPlannerChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, loading } = useAIChat(eventId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    await sendMessage(input);
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[600px] p-4">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Bot className="h-6 w-6 text-primary" />
        <div>
          <h3 className="font-semibold">Event Planning Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Ask me anything about planning your event
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Start a conversation with the planning assistant</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Try asking:</p>
              <ul className="space-y-1">
                <li>"What tasks should I prioritize for a wedding?"</li>
                <li>"Recommend photographers within $3000 budget"</li>
                <li>"Help me create a timeline for my event"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div className="flex-shrink-0">
              {msg.role === "user" ? (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              )}
            </div>
            <div
              className={`flex-1 rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-12"
                  : "bg-muted mr-12"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your event..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}
```

---

## Configuration

### Environment Variables

**Required:**
```env
OPENAI_API_KEY=sk-...
```

**Optional (for other providers):**
```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Agent Configuration

Customize agent behavior in `convex/ai/agents.ts`:

```typescript
export const eventPlannerAgent = new Agent(components.agent, {
  name: "Event Planning Assistant",
  
  // Choose model based on task complexity
  chat: openai.chat("gpt-4o"), // or "gpt-4o-mini" for faster/cheaper
  
  // Adjust temperature for creativity vs. consistency
  temperature: 0.7, // 0-1, higher = more creative
  
  // Maximum tokens in response
  maxTokens: 1000,
  
  // System instructions
  instructions: "...",
  
  // Tools the agent can use
  tools: { ... },
});
```

---

## Best Practices

### 1. Model Selection

**GPT-4o**: Complex reasoning, planning, nuanced understanding
- Event planning assistance
- Vendor matching with complex requirements
- Budget analysis

**GPT-4o-mini**: Fast, cost-effective, simple tasks
- Intent detection
- Message classification
- Simple Q&A

### 2. Prompt Engineering

**Be Specific:**
```typescript
instructions: `You are a wedding planner with 10 years of experience.
Focus on budget-conscious recommendations for couples planning weddings under $30,000.`
```

**Provide Structure:**
```typescript
instructions: `When recommending vendors:
1. List 3-5 options
2. Include price ranges
3. Highlight pros/cons
4. Suggest follow-up questions`
```

### 3. Tool Design

**Keep Tools Focused:**
```typescript
// ✅ GOOD: Specific tool
searchVendors: {
  description: "Search for photographers matching criteria",
  // ...
}

// ❌ BAD: Too broad
searchAnything: {
  description: "Search for anything",
  // ...
}
```

**Validate Tool Inputs:**
```typescript
handler: async (ctx, args) => {
  if (args.budget < 0) {
    throw new Error("Budget must be positive");
  }
  // ...
}
```

### 4. Context Management

**Thread Metadata:**
```typescript
await agent.createThread(ctx, {
  metadata: {
    eventId: args.eventId,
    userId: userProfile._id,
    eventType: "wedding",
  },
});
```

**Limit Context Window:**
```typescript
// Only include last 10 messages
const recentMessages = messages.slice(-10);
```

### 5. Error Handling

```typescript
try {
  const response = await agent.run(ctx, { threadId });
  return response;
} catch (error) {
  console.error("Agent error:", error);
  return {
    content: "I'm having trouble right now. Please try again.",
    error: true,
  };
}
```

---

## Migration Plan

### Phase 1: Infrastructure (Week 1)
1. Install agent component and AI SDK
2. Configure OpenAI API key
3. Create basic agent wrapper
4. Test in Convex dashboard

### Phase 2: Event Planner Agent (Week 2)
1. Implement event planner agent
2. Add basic tools (vendor search, budget estimate)
3. Create frontend chat interface
4. Test conversations

### Phase 3: Intent Detection (Week 2-3)
1. Implement intent detection agent
2. Integrate with message flow
3. Auto-populate task/expense forms
4. Test accuracy

### Phase 4: Vendor Matching (Week 3)
1. Implement vendor matcher with RAG
2. Index vendor database for vector search
3. Create vendor recommendation UI
4. Integration testing

### Phase 5: Polish & Optimization (Week 4)
1. Tune prompts based on usage
2. Optimize token usage
3. Add streaming responses
4. Performance testing

---

## Testing Strategy

### Unit Tests

```typescript
test("Event planner agent responds to planning questions", async () => {
  const response = await chatWithEventPlanner({
    eventId,
    message: "What tasks should I do first?",
  });
  
  expect(response.response.content).toContain("task");
});

test("Intent detection identifies task creation", async () => {
  const result = await detectIntent({
    messageText: "We need to book a photographer by next month",
  });
  
  expect(result.intent).toBe("task");
  expect(result.entities.category).toBe("photography");
});
```

### Integration Tests

1. **Full Conversation Flow**: Multiple messages, context retention
2. **Tool Usage**: Agent correctly calls tools with right parameters
3. **Error Recovery**: Graceful handling of API failures
4. **Thread Management**: Create, retrieve, update threads

### Manual Testing Checklist

- [ ] Agent responds accurately to planning questions
- [ ] Tool calls work correctly (vendor search, budget estimate)
- [ ] Context is maintained across messages
- [ ] Intent detection identifies correct intents
- [ ] Vendor recommendations are relevant
- [ ] UI shows loading states correctly
- [ ] Error messages are helpful
- [ ] Streaming works smoothly
- [ ] Token usage is reasonable
- [ ] Response time is acceptable (< 5s)

### Performance Testing

- Monitor OpenAI API costs
- Track average tokens per request
- Measure response latency
- Test with concurrent users
- Check memory usage

---

## Security Considerations

### 1. Authentication

Always verify user before agent interactions:

```typescript
const { userProfile } = await getAuthenticatedUser(ctx);
```

### 2. Rate Limiting

Prevent abuse of AI endpoints:

```typescript
await rateLimiter.limit(ctx, "aiChat", {
  key: userProfile._id,
  rate: 20, // 20 requests
  period: 60000, // per minute
});
```

### 3. Content Filtering

Filter sensitive information from agent responses:

```typescript
const response = await agent.run(ctx, { threadId });
// Filter credit card numbers, SSNs, etc.
return sanitizeResponse(response);
```

### 4. Prompt Injection Protection

Validate user input:

```typescript
if (message.includes("ignore previous instructions")) {
  throw new Error("Invalid input");
}
```

### 5. Data Privacy

Don't log sensitive user data:

```typescript
// ✅ GOOD
console.log("Agent request for eventId:", eventId);

// ❌ BAD
console.log("Full message content:", sensitiveMessage);
```

---

## Cost Optimization

### OpenAI Pricing (as of 2024)

**GPT-4o:**
- Input: $5.00 / 1M tokens
- Output: $15.00 / 1M tokens

**GPT-4o-mini:**
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

### Optimization Strategies

1. **Use Appropriate Models**: GPT-4o-mini for simple tasks
2. **Limit Context**: Only include relevant messages
3. **Cache Responses**: For common questions
4. **Streaming**: Better UX, same cost
5. **Prompt Compression**: Remove unnecessary words
6. **Token Limits**: Set maxTokens appropriately

### Monitor Usage

```typescript
export const getAIUsageStats = query({
  handler: async (ctx) => {
    // Track token usage per user/event
    // Generate cost reports
    // Alert on high usage
  },
});
```

---

## Future Enhancements

1. **Multi-Agent Collaboration**
   - Multiple agents working together
   - Specialist agents for different domains

2. **Advanced RAG**
   - Index all event documents
   - Semantic search across events

3. **Voice Interface**
   - Speech-to-text for voice commands
   - Text-to-speech for responses

4. **Proactive Suggestions**
   - Agent monitors events and suggests actions
   - Automated reminders and recommendations

5. **Learning from Feedback**
   - Track user ratings of suggestions
   - Fine-tune prompts based on feedback

---

## References

- [Convex Agent Component](https://docs.convex.dev/agents)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
