# Delphi Agent Layer - Phase 1 Implementation
## Basic Agent Infrastructure & @Delphi Invocation

**Version:** 2.0 (Direct Access Architecture)
**Phase:** 1 - Foundation
**Timeline:** 1-2 weeks
**Last Updated:** November 13, 2025

---

## Table of Contents

1. [Phase 1 Overview & Goals](#phase-1-overview--goals)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Architecture for Phase 1](#architecture-for-phase-1)
4. [Step 1: Cloudflare Project Setup](#step-1-cloudflare-project-setup)
5. [Step 2: Basic Durable Object Implementation](#step-2-basic-durable-object-implementation)
6. [Step 3: Worker Router Implementation](#step-3-worker-router-implementation)
7. [Step 4: Convex Integration Layer](#step-4-convex-integration-layer)
8. [Step 5: Frontend @Agent Detection](#step-5-frontend-agent-detection)
9. [Step 6: End-to-End Flow Implementation](#step-6-end-to-end-flow-implementation)
10. [Step 7: Testing & Validation](#step-7-testing--validation)
11. [Deployment & Environment Setup](#deployment--environment-setup)
12. [Success Criteria & Next Steps](#success-criteria--next-steps)

---

## Phase 1 Overview & Goals

### Objective
Create a working end-to-end AI agent integration where users can type `@Delphi` in chat to get contextual AI assistance. The agent will read recent messages, understand the conversation context, and provide helpful responses that appear directly in the chat.

### Core Phase 1 Flow
```
User types "@Delphi what should we do first?"
    ↓
Frontend detects @Delphi → Calls Worker with auth token
    ↓
Worker authenticates → Routes to Durable Object for this room
    ↓
DO fetches past 10 messages from Convex using authenticated client
    ↓
DO calls AI API (Claude/GPT) with context
    ↓
DO returns response → Worker saves to Convex as message
    ↓
Message appears in chat as "Delphi Agent" response
```

### Scope for Phase 1
✅ **In Scope:**
- `@Delphi` mention detection in frontend
- Direct Worker access with Convex token authentication
- Durable Object per room for state management
- DO fetches last 10 messages using Convex client
- Single general-purpose AI agent (Claude or GPT-4)
- Responses saved as messages with `isAIGenerated: true`
- Plain text responses appearing in chat

❌ **Out of Scope (Phase 2+):**
- Multiple specialized agents (TaskAgent, BudgetAgent, etc.)
- Rich context beyond 10 messages (event details, tasks, expenses)
- Automatic intent detection (task creation, expense tracking)
- Advanced checkpointing and state recovery
- Multi-room coordination
- Pattern detection without @Delphi
- Streaming responses

### Success Criteria
- [ ] User types "@Delphi help plan our wedding" in room
- [ ] Agent responds with contextual advice within 3 seconds
- [ ] Response appears as message from "Delphi Agent"
- [ ] Agent references recent conversation context
- [ ] Multiple rooms can use agent simultaneously
- [ ] System handles errors gracefully

---

## Prerequisites & Setup

### Required Accounts & Tools

```yaml
Cloudflare:
  - Account with Workers & Durable Objects access
  - Wrangler CLI installed (npm i -g wrangler)
  - R2 bucket for storage (optional for Phase 1)

Convex:
  - Existing project with chat functionality
  - HTTP actions enabled
  - Environment variables configured

AI Provider:
  - Anthropic API key (Claude) OR
  - OpenAI API key (GPT-4)
  
Development:
  - Node.js 18+
  - TypeScript 5+
  - Git repository
```

### Project Structure

```
delphi/
├── web/                        # Existing web app (TanStack Start + React)
│   ├── src/
│   │   ├── components/
│   │   │   └── messages/
│   │   │       ├── message-input.tsx       # Will modify for @Delphi
│   │   │       ├── message-list.tsx        # Already displays messages
│   │   │       └── message-item.tsx        # Message rendering
│   │   └── hooks/
│   │       └── useSendMessage.ts          # Message sending hook
│   ├── convex/                             # Convex backend
│   │   ├── schema.ts                       # Extended with agent tables ✅
│   │   ├── agent.ts                        # Agent mutations ✅
│   │   ├── http.ts                         # HTTP endpoints ✅
│   │   ├── messages.ts                     # Message CRUD (existing)
│   │   └── auth.ts                         # Better Auth setup (existing)
│   ├── .env.example                        # Updated with WORKER_URL ✅
│   └── package.json
│
├── agent-worker/                           # Cloudflare Worker (NEW)
│   ├── src/
│   │   ├── index.ts                        # Worker entry point ✅
│   │   └── durable-objects/
│   │       └── ChatOrchestratorDO.ts       # DO implementation (stub)
│   ├── wrangler.toml                       # Worker config ✅
│   ├── .dev.vars.example                   # Environment template ✅
│   ├── package.json                        # Dependencies ✅
│   └── tsconfig.json                       # TypeScript config ✅
│
└── docs/
    └── implementation/
        ├── delphi-phase1-agent-implementation.md  # THIS FILE
        └── phase1-progress.md                     # Progress tracker
```

**Note:** `agent-worker/` is a sibling directory to `web/`, not in `packages/`

---

## Architecture for Phase 1

### Direct Access Architecture (v2.0)

**Key Improvement:** Worker directly accesses Convex using authenticated client, eliminating unnecessary hops through Convex actions.

```
┌─────────────────────────────────────────────────────────┐
│  1. User types "@Delphi help us plan"                    │
│     Frontend (TanStack Start + React)                    │
│     • Detects @Delphi mention                            │
│     • Gets Convex auth token                             │
└─────────────────────────────────────────────────────────┘
                          ↓ POST with Bearer token
┌─────────────────────────────────────────────────────────┐
│  2. Cloudflare Worker                                    │
│     • Validates Convex token                             │
│     • Authenticates as user via ConvexHttpClient         │
│     • Routes to Durable Object for this room             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. ChatOrchestratorDO (Durable Object)                  │
│     • Receives roomId, message, eventId                  │
│     • Uses Convex client to fetch last 10 messages       │
│     • Builds context from conversation history           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  4. AI API Call (Claude/GPT-4)                           │
│     • Sends context + user question                      │
│     • Receives AI-generated response                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  5. DO returns response to Worker                        │
│     • Worker calls Convex HTTP endpoint                  │
│     • Saves response as message (isAIGenerated: true)    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  6. Frontend receives new message via subscription       │
│     • Message appears as "Delphi Agent" response         │
│     • User sees AI reply in chat                         │
└─────────────────────────────────────────────────────────┘
```

### Architecture Benefits

**vs. Old "Convex Gateway" Pattern:**
- ❌ Old: Frontend → Convex Action → Worker → DO (7 hops, 200-300ms)
- ✅ New: Frontend → Worker → DO (5 hops, 100-150ms)
- **33% faster**, simpler auth, Worker directly queries Convex

### Key Components

1. **Frontend Detection**: `message-input.tsx` detects `@Delphi` mentions
2. **Worker Auth**: Validates Convex token, creates authenticated client
3. **Durable Object**: One DO per room, maintains conversation state
4. **Convex Client**: DO uses `ConvexHttpClient` to fetch messages
5. **AI Integration**: DO calls Anthropic/OpenAI API
6. **Response Saving**: Worker calls Convex HTTP `/saveAgentResponse` endpoint

---

## Step 1: Cloudflare Project Setup

**Status:** ✅ COMPLETE (See `phase1-progress.md` for details)

### 1.1 Create Worker Package

```bash
# Already created at: agent-worker/
cd agent-worker

# Dependencies already installed:
bun install
# - @cloudflare/workers-types v4.20241127.0
# - wrangler v4.47.0
# - typescript v5.9.3
# - itty-router v5.0.22
# - convex v1.29.0 (for Convex client)
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ES2022",
    "lib": ["ES2021"],
    "types": ["@cloudflare/workers-types"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.2 Configure Wrangler

**wrangler.toml:**
```toml
name = "delphi-agent-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# Environment variables
[vars]
ENVIRONMENT = "development"

# Secrets (add via wrangler secret put)
# CONVEX_DEPLOY_URL
# ANTHROPIC_API_KEY or OPENAI_API_KEY

# Durable Objects
[[durable_objects.bindings]]
name = "CHAT_ORCHESTRATOR"
class_name = "ChatOrchestratorDO"

[[migrations]]
tag = "v1"
new_classes = ["ChatOrchestratorDO"]

# Development settings
[dev]
port = 8787
local_protocol = "http"
```

### 1.3 Package Scripts

**package.json additions:**
```json
{
  "scripts": {
    "dev": "wrangler dev --local --persist",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail",
    "types": "wrangler types"
  }
}
```

---

## Step 2: Durable Object Implementation with AI Integration

**Status:** 🚧 IN PROGRESS (Stub exists, needs full AI integration)
**Current File:** `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

### 2.1 Overview

The ChatOrchestratorDO is responsible for:
1. Receiving agent invocation requests (roomId, message, user info)
2. Fetching recent messages from Convex using the provided auth token
3. Building context from conversation history
4. Calling AI API (Anthropic Claude or OpenAI GPT-4)
5. Returning AI response to Worker for saving

### 2.2 Implementation

**agent-worker/src/durable-objects/ChatOrchestratorDO.ts:**
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../web/convex/_generated/api"; // Relative path to Convex

export class ChatOrchestratorDO {
  private state: DurableObjectState;
  private env: Env;
  private roomId: string | null = null;
  private conversationHistory: Array<{role: string; content: string}> = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Load roomId from storage if exists
      if (!this.roomId) {
        const stored = await this.state.storage.get("roomId");
        this.roomId = stored as string | null;
      }

      switch (path) {
        case "/invoke":
          return await this.handleAgentInvoke(request);
        case "/status":
          return await this.handleStatus();
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("[DO Error]", error);
      return new Response(
        JSON.stringify({ error: "Internal error", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  private async handleAgentInvoke(request: Request): Promise<Response> {
    const body = await request.json() as {
      roomId: string;
      eventId?: string;
      message: string;
      convexUrl: string;
      authToken: string;
      userId: string;
    };

    // Store roomId for this DO instance
    if (!this.roomId) {
      this.roomId = body.roomId;
      await this.state.storage.put("roomId", this.roomId);
    }

    console.log(`[DO] Processing @Delphi request for room: ${this.roomId}`);

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(body.convexUrl);
    convex.setAuth(body.authToken);

    // Fetch last 10 messages from Convex
    const recentMessages = await convex.query(api.messages.listByRoom, {
      roomId: body.roomId as any,
      limit: 10,
    });

    console.log(`[DO] Fetched ${recentMessages.length} recent messages`);

    // Build context from messages
    const conversationContext = recentMessages
      .map((msg: any) => {
        const author = msg.author?.name || "Unknown";
        return `${author}: ${msg.text}`;
      })
      .join("\n");

    // Call AI API
    const aiResponse = await this.callAI(conversationContext, body.message);

    // Update conversation history in memory (keep last 20 exchanges)
    this.conversationHistory.push(
      { role: "user", content: body.message },
      { role: "assistant", content: aiResponse }
    );
    if (this.conversationHistory.length > 40) {
      this.conversationHistory = this.conversationHistory.slice(-40);
    }

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      roomId: this.roomId,
      timestamp: Date.now(),
      messagesFetched: recentMessages.length,
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async callAI(conversationContext: string, userMessage: string): Promise<string> {
    const systemPrompt = `You are Delphi, an AI assistant helping users plan events.
You've been invoked with @Delphi to provide helpful, contextual advice.
Keep responses concise (2-3 sentences) and actionable.

Recent conversation context:
${conversationContext}

User's question: ${userMessage}`;

    try {
      // Anthropic Claude (preferred)
      if (this.env.ANTHROPIC_API_KEY) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            messages: [
              { role: "user", content: systemPrompt }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Anthropic API error: ${error}`);
        }

        const data = await response.json() as any;
        return data.content[0].text;
      }

      // OpenAI GPT-4 (fallback)
      if (this.env.OPENAI_API_KEY) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4-turbo-preview",
            max_tokens: 500,
            messages: [
              { role: "system", content: "You are Delphi, an AI event planning assistant." },
              { role: "user", content: systemPrompt }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content;
      }

      return "⚠️ AI service not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in Cloudflare Worker secrets.";

    } catch (error) {
      console.error("[AI API Error]", error);
      return `I encountered an error while processing your request: ${error.message}. Please try again.`;
    }
  }

  private async handleStatus(): Promise<Response> {
    const stored = await this.state.storage.get("roomId");
    return new Response(JSON.stringify({
      roomId: stored || "not initialized",
      conversationTurns: this.conversationHistory.length / 2,
      status: "active",
      architecture: "direct-access-v2",
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

// TypeScript interface for environment
interface Env {
  CHAT_ORCHESTRATOR: DurableObjectNamespace;
  CONVEX_DEPLOY_URL: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}
```

### 2.3 Key Implementation Details

**Convex Integration:**
- Uses `ConvexHttpClient` with auth token passed from Worker
- Queries `api.messages.listByRoom` to get last 10 messages
- Type-safe access to Convex schema via generated API

**AI Context Building:**
- Formats recent messages as `AuthorName: Message text`
- Includes conversation context in system prompt
- Keeps response concise (500 max tokens)

**State Management:**
- Stores `roomId` in Durable Object storage
- Keeps last 20 user/assistant exchanges in memory
- Each room gets its own DO instance

**Error Handling:**
- Graceful fallback if AI API fails
- Returns user-friendly error messages
- Logs errors for debugging

---

## Step 3: Worker Router Implementation with Direct Access

**Status:** 🚧 IN PROGRESS (Basic routing exists, needs Convex client integration)
**Current File:** `agent-worker/src/index.ts`

### 3.1 Overview

The Worker handles:
1. Extracting and validating Convex auth token from request
2. Routing to appropriate Durable Object by roomId
3. Passing auth token to DO for Convex access
4. Saving AI response back to Convex via HTTP endpoint

### 3.2 Implementation

**agent-worker/src/index.ts:**
```typescript
import { ChatOrchestratorDO } from './durable-objects/ChatOrchestratorDO';

// Export DO class for Cloudflare
export { ChatOrchestratorDO };

// Environment interface
interface Env {
  CHAT_ORCHESTRATOR: DurableObjectNamespace;
  CONVEX_DEPLOY_URL: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'delphi-agent-worker',
        version: '2.0-direct-access',
        architecture: 'Browser → Worker → DO → AI → Convex',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Main agent invocation endpoint
    if (path === '/api/agent/invoke' && request.method === 'POST') {
      try {
        // Extract authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({
            error: 'Missing or invalid Authorization header'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const authToken = authHeader.substring(7); // Remove 'Bearer '

        // Parse request body
        const body = await request.json() as {
          roomId: string;
          eventId?: string;
          message: string;
        };

        // Validate required fields
        if (!body.roomId || !body.message) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: roomId, message'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`[Worker] @Delphi invoked for room: ${body.roomId}`);

        // Get or create DO instance for this room
        const doId = env.CHAT_ORCHESTRATOR.idFromName(`room-${body.roomId}`);
        const stub = env.CHAT_ORCHESTRATOR.get(doId);

        // Forward to DO with auth token and Convex URL
        const doResponse = await stub.fetch(
          new Request('http://internal/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              authToken,
              convexUrl: env.CONVEX_DEPLOY_URL,
              userId: 'extracted-from-token', // TODO: Extract from JWT
            })
          })
        );

        if (!doResponse.ok) {
          throw new Error(`DO returned error: ${doResponse.statusText}`);
        }

        const result = await doResponse.json() as {
          success: boolean;
          response: string;
          roomId: string;
          timestamp: number;
        };

        console.log(`[Worker] AI response received, saving to Convex...`);

        // Save response to Convex
        await saveAgentResponse(env.CONVEX_DEPLOY_URL, {
          roomId: body.roomId,
          eventId: body.eventId,
          content: result.response,
          metadata: {
            timestamp: result.timestamp,
            modelUsed: 'claude-3-5-sonnet', // From DO
            userMessage: body.message,
          }
        });

        console.log(`[Worker] Response saved successfully`);

        return new Response(JSON.stringify({
          success: true,
          message: 'Agent response saved to chat',
          ...result,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error: any) {
        console.error('[Worker Error]', error);
        return new Response(JSON.stringify({
          error: 'Internal server error',
          details: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Status check endpoint
    if (path.startsWith('/api/agent/status/')) {
      const roomId = path.split('/').pop();
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'Missing roomId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const doId = env.CHAT_ORCHESTRATOR.idFromName(`room-${roomId}`);
      const stub = env.CHAT_ORCHESTRATOR.get(doId);

      const doResponse = await stub.fetch(
        new Request('http://internal/status', { method: 'GET' })
      );

      const result = await doResponse.json();

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Helper: Save agent response to Convex
async function saveAgentResponse(convexUrl: string, data: {
  roomId: string;
  eventId?: string;
  content: string;
  metadata: any;
}) {
  const response = await fetch(`${convexUrl}/saveAgentResponse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Convex save failed: ${error}`);
  }

  return response.json();
}
```

### 3.3 Key Implementation Details

**Authentication Flow:**
1. Frontend includes `Authorization: Bearer <convex-token>` header
2. Worker extracts token and validates format
3. Token passed to DO for Convex client authentication
4. TODO: Extract userId from JWT for tracking

**DO Routing:**
- Uses `idFromName('room-${roomId}')` for consistent DO assignment
- Each room always routes to the same DO instance
- DO persists conversation history across invocations

**Response Saving:**
- Worker calls `/saveAgentResponse` HTTP endpoint on Convex
- Convex mutation saves as message with `isAIGenerated: true`
- Frontend receives update via Convex subscription (real-time)

---

## Step 4: Convex Integration Layer

**Status:** ✅ COMPLETE (See `web/convex/schema.ts` and `web/convex/agent.ts`)

### 4.1 Extend Convex Schema

**Already implemented in `web/convex/schema.ts`:**
```typescript
// Agent-related tables (already added)
agentResponses: defineTable({
  roomId: v.id("rooms"),  // Room where agent was invoked
  eventId: v.id("events"),  // Associated event
  invokedBy: v.id("users"),  // User who invoked @Delphi
  userMessage: v.string(),  // User's question
  agentResponse: v.string(),  // AI-generated response
  timestamp: v.number(),
  metadata: v.optional(v.any()),
})
  .index("by_room", ["roomId", "timestamp"])
  .index("by_event", ["eventId", "timestamp"])
  .index("by_user", ["invokedBy", "timestamp"]),

agentState: defineTable({
  roomId: v.id("rooms"),  // Room being orchestrated
  doInstanceId: v.string(),  // "room-${roomId}"
  lastInvoked: v.number(),
  invocationCount: v.number(),
})
  .index("by_room", ["roomId"]),
```

**Note:** Existing `messages` table already has `isAIGenerated` field for marking agent messages.

### 4.2 HTTP Actions for Worker Communication

**convex/http.ts:**
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Endpoint for Worker to save agent responses
http.route({
  path: "/saveAgentResponse",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    // Save agent response to database
    await ctx.runMutation(api.agent.saveResponse, {
      chatId: body.chatId,
      roomId: body.roomId,
      content: body.content,
      metadata: body.metadata,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

### 4.3 Agent Mutations

**convex/agent.ts:**
```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Invoke agent from frontend
export const invokeAgent = action({
  args: {
    chatId: v.id("chats"),
    roomId: v.id("rooms"),
    eventId: v.id("events"),
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Get recent messages for context
    const recentMessages = await ctx.runQuery(api.messages.getRecent, {
      roomId: args.roomId,
      limit: 10,
    });

    // Get event context
    const event = await ctx.runQuery(api.events.get, {
      eventId: args.eventId,
    });

    // Call Worker API
    const workerUrl = process.env.WORKER_URL || "http://localhost:8787";
    const response = await fetch(`${workerUrl}/api/agent/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: args.chatId,
        roomId: args.roomId,
        eventId: args.eventId,
        userId: args.userId,
        message: args.message,
        recentMessages,
        eventContext: {
          name: event.name,
          date: event.date,
          type: event.type,
          budget: event.budget,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Agent invocation failed");
    }

    const result = await response.json();
    return result;
  },
});

// Save agent response (called by Worker)
export const saveResponse = mutation({
  args: {
    chatId: v.id("chats"),
    roomId: v.id("rooms"),
    content: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    // Save as message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      roomId: args.roomId,
      authorId: "agent", // Special ID for agent
      content: args.content,
      type: "agent",
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    // Save to agent responses table
    await ctx.db.insert("agentResponses", {
      chatId: args.chatId,
      roomId: args.roomId,
      eventId: args.metadata.eventId,
      invokedBy: args.metadata.invokedBy,
      userMessage: args.metadata.userMessage,
      agentResponse: args.content,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    // Update agent state
    const existingState = await ctx.db
      .query("agentState")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (existingState) {
      await ctx.db.patch(existingState._id, {
        lastInvoked: Date.now(),
        invocationCount: existingState.invocationCount + 1,
      });
    } else {
      await ctx.db.insert("agentState", {
        chatId: args.chatId,
        doInstanceId: `chat-${args.chatId}`,
        lastInvoked: Date.now(),
        invocationCount: 1,
      });
    }

    return messageId;
  },
});

// Get recent messages for context
export const getRecent = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(args.limit);

    // Get author names
    const messagesWithAuthors = await Promise.all(
      messages.map(async (msg) => {
        if (msg.authorId === "agent") {
          return { ...msg, authorName: "Delphi Agent" };
        }
        const author = await ctx.db.get(msg.authorId);
        return { ...msg, authorName: author?.name || "Unknown" };
      })
    );

    return messagesWithAuthors.reverse();
  },
});
```

---

## Step 5: Frontend @Delphi Detection and Invocation

**Status:** ⏳ NOT STARTED
**File to modify:** `web/src/components/messages/message-input.tsx`

### 5.1 Overview

The frontend needs to:
1. Detect `@Delphi` mentions in message input
2. Get Convex auth token from current session
3. Send request to Worker with auth token
4. Show loading state while waiting for response
5. Response appears automatically via Convex subscription

### 5.2 Implementation

**Modifications to add to existing component:**
```typescript
// Add at top of file
import { useConvex } from "convex/react";

// Inside component
const convex = useConvex();
const [isInvokingAgent, setIsInvokingAgent] = useState(false);
const sendMessage = useMutation(api.messages.send);

// Modify handleSend function to detect @Delphi
const handleSend = async () => {
  const text = getValue(); // Existing method to get textarea value
  if (!text.trim()) return;

  // Detect @Delphi mention (case-insensitive)
  const hasDelphiMention = /@Delphi/i.test(text);

  if (hasDelphiMention) {
    // 1. Send user's message first
    await sendMessage({
      roomId,
      text,
    });

    // 2. Invoke Delphi agent via Worker
    setIsInvokingAgent(true);
    try {
      // Get auth token from Convex
      const token = await convex.auth.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Clean message (remove @Delphi mention)
      const cleanMessage = text.replace(/@Delphi\s*/i, '').trim();

      // Call Worker directly
      const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
      const response = await fetch(`${workerUrl}/api/agent/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId,
          eventId, // Optional: get from room context
          message: cleanMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Worker error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[Agent] Response saved:', result);
      // Note: Response will appear in chat via Convex subscription

    } catch (error) {
      console.error('[Agent] Invocation failed:', error);
      // TODO: Show error toast to user
    } finally {
      setIsInvokingAgent(false);
    }
  } else {
    // Regular message
    await sendMessage({
      roomId,
      text,
    });
  }

  // Clear input
  setValue('');
};

// Add loading indicator in JSX
{isInvokingAgent && (
  <div className="text-sm text-muted-foreground">
    Delphi is thinking...
  </div>
)}
    </div>
  );
}
```

### 5.2 Message Display Component

**components/MessageList.tsx:**
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface MessageListProps {
  roomId: string;
}

export function MessageList({ roomId }: MessageListProps) {
  const messages = useQuery(api.messages.list, { roomId });

  return (
    <div className="message-list">
      {messages?.map((message) => (
        <div 
          key={message._id}
          className={`message ${message.type === 'agent' ? 'agent-message' : 'user-message'}`}
        >
          {message.type === 'agent' && (
            <div className="agent-badge">
              🤖 Delphi Agent
            </div>
          )}
          
          <div className="message-author">
            {message.authorName}
          </div>
          
          <div className="message-content">
            {message.content}
          </div>
          
          <div className="message-timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Step 6: End-to-End Flow Implementation

### 6.1 Environment Configuration

**.env.local (Frontend):**
```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_WORKER_URL=https://delphi-agent-worker.your-subdomain.workers.dev
```

**.env (Convex):**
```env
WORKER_URL=https://delphi-agent-worker.your-subdomain.workers.dev
```

**Cloudflare Secrets:**
```bash
# Set via Wrangler CLI
wrangler secret put CONVEX_DEPLOY_URL
# Enter: https://your-project.convex.cloud

wrangler secret put ANTHROPIC_API_KEY
# Enter: your-api-key-here
```

### 6.2 Complete Flow Test

```typescript
// Test script for development
async function testAgentFlow() {
  // 1. User sends message with @Agent
  const userMessage = "@Agent what should we focus on first for our wedding?";
  
  // 2. Frontend detects @Agent, calls Convex action
  const result = await invokeAgent({
    chatId: "test-chat-id",
    roomId: "test-room-id",
    eventId: "test-event-id",
    userId: "test-user-id",
    message: "what should we focus on first for our wedding?",
  });
  
  // 3. Convex calls Worker
  // 4. Worker routes to DO
  // 5. DO calls AI API
  // 6. Response flows back through chain
  
  console.log("Agent response:", result.response);
}
```

---

## Step 7: Testing & Validation

### 7.1 Local Development Testing

```bash
# Terminal 1: Run Convex dev
cd /path/to/delphi
npx convex dev

# Terminal 2: Run Worker locally
cd packages/agent-worker
npm run dev

# Terminal 3: Run frontend
cd apps/web
npm run dev
```

### 7.2 Test Cases

```typescript
// Test Case 1: Basic @Agent invocation
{
  input: "@Agent help us get started",
  expectedBehavior: "Agent provides general event planning advice",
  validateResponse: (response) => response.length > 50
}

// Test Case 2: Context awareness
{
  setup: "Send 5 messages about venue preferences",
  input: "@Agent what venue would work best?",
  expectedBehavior: "Agent references previous venue discussion",
  validateResponse: (response) => response.includes("venue")
}

// Test Case 3: Concurrent chats
{
  setup: "Create 2 different chat rooms",
  action: "Send @Agent messages to both simultaneously",
  expectedBehavior: "Each chat gets independent responses",
  validateResponse: (responses) => responses[0] !== responses[1]
}

// Test Case 4: Error handling
{
  setup: "Disable AI API key temporarily",
  input: "@Agent test message",
  expectedBehavior: "Graceful error message",
  validateResponse: (response) => response.includes("error") || response.includes("try again")
}
```

### 7.3 Monitoring & Debugging

```typescript
// Add to DO for debugging
private log(message: string, data?: any) {
  console.log(`[ChatOrchestrator ${this.chatId}] ${message}`, data);
}

// Add to Worker for tracing
const trace = {
  requestId: crypto.randomUUID(),
  timestamp: Date.now(),
  chatId: body.chatId,
  duration: 0,
};

// Use Cloudflare dashboard for:
// - Real-time logs (wrangler tail)
// - DO metrics
// - Worker analytics
```

---

## Deployment & Environment Setup

### Production Deployment Steps

```bash
# 1. Deploy Convex backend
cd /path/to/delphi
npx convex deploy --prod

# 2. Deploy Worker to Cloudflare
cd packages/agent-worker
npm run deploy

# 3. Update environment variables
# - Update NEXT_PUBLIC_WORKER_URL in Vercel/Netlify
# - Update WORKER_URL in Convex dashboard

# 4. Verify deployment
curl https://your-worker.workers.dev/health

# 5. Test production flow
# Send @Agent message in production app
```

### Environment-Specific Configs

```typescript
// Worker environment detection
const isDev = env.ENVIRONMENT === 'development';
const convexUrl = isDev 
  ? 'http://localhost:8000'
  : env.CONVEX_DEPLOY_URL;

const aiModel = isDev
  ? 'claude-3-haiku-20240307'  // Cheaper for dev
  : 'claude-3-sonnet-20240229'; // Better for prod
```

---

## Success Criteria & Next Steps

### Phase 1 Success Criteria ✓

- [ ] User can type "@Agent [question]" in any chat room
- [ ] Agent responds within 3 seconds
- [ ] Response appears as special "agent" message type
- [ ] Multiple concurrent chats work independently
- [ ] DO maintains basic conversation history
- [ ] System handles errors gracefully
- [ ] Basic monitoring and logging in place

### Known Limitations (To Address in Phase 2)

1. **No specialized agents** - All responses use general prompt
2. **Limited context** - Only last 10 messages, no event details
3. **No pattern detection** - Must use explicit @Agent mention
4. **No checkpointing** - DO state lost on restart
5. **No cost optimization** - Every @Agent triggers AI call
6. **No streaming** - Response appears all at once

### Phase 2 Preview

**Next Implementation Areas:**
1. **Pattern Detection Engine**
   - Regex-based intent detection
   - Automatic triggering without @Agent
   - Cost optimization (90% filtered)

2. **Specialized Agents**
   - TaskAgentDO for task creation
   - BudgetAgentDO for expenses
   - VendorAgentDO for vendor management

3. **Rich Context Assembly**
   - Event details and timeline
   - Full conversation history
   - Cross-chat awareness

4. **Checkpointing System**
   - Regular snapshots to Convex
   - DO recovery on restart
   - Memory management

5. **UI Enhancements**
   - Streaming responses
   - Typing indicators
   - Agent action buttons
   - Contextual suggestions

### Immediate Next Steps

1. **Deploy Phase 1** to staging environment
2. **Run load tests** with 10+ concurrent chats
3. **Gather user feedback** on response quality
4. **Monitor costs** and optimize API usage
5. **Document learnings** for Phase 2 planning

---

## Troubleshooting Guide

### Common Issues & Solutions

**Issue: "Agent not responding"**
```bash
# Check Worker logs
wrangler tail

# Verify DO is running
curl https://your-worker.workers.dev/api/agent/status/[chatId]

# Check Convex function logs
npx convex logs --prod
```

**Issue: "CORS errors in browser"**
```typescript
// Ensure corsHeaders are on all responses
headers: { 
  ...corsHeaders, 
  'Content-Type': 'application/json' 
}
```

**Issue: "DO memory growing too large"**
```typescript
// Implement message pruning
this.messageHistory = this.messageHistory.slice(-50);
```

**Issue: "Slow AI responses"**
```typescript
// Consider switching models
const model = userMessage.length > 500 
  ? 'claude-3-haiku-20240307'  // Faster
  : 'claude-3-sonnet-20240229'; // Better
```

---

## Appendix: Quick Reference

### API Endpoints

```yaml
Worker:
  Health: GET /health
  Invoke: POST /api/agent/invoke
  Status: GET /api/agent/status/:chatId

Convex HTTP:
  Save Response: POST /saveAgentResponse
```

### Key Files Checklist

```yaml
Created/Modified:
  ✓ packages/agent-worker/src/index.ts
  ✓ packages/agent-worker/src/durable-objects/ChatOrchestratorDO.ts
  ✓ packages/agent-worker/wrangler.toml
  ✓ convex/agent.ts
  ✓ convex/http.ts
  ✓ convex/schema.ts (extended)
  ✓ components/MessageInput.tsx
  ✓ components/MessageList.tsx
```

### Performance Targets

```yaml
Phase 1 Targets:
  Response Time: < 3 seconds
  DO Memory: < 5MB per chat
  Concurrent Chats: 100+
  Error Rate: < 1%
  AI Token Usage: < 1000 per invocation
```

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Next Review:** After Phase 1 deployment  
**Owner:** Delphi Technical Team