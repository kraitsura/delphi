# Convex Components - Comprehensive Reference Guide

## Table of Contents
1. [Overview](#overview)
2. [What Are Convex Components](#what-are-convex-components)
3. [Why Use Components](#why-use-components)
4. [How Components Work](#how-components-work)
5. [Installation & Configuration](#installation--configuration)
6. [Using Pre-Made Components](#using-pre-made-components)
7. [Best Practices](#best-practices)
8. [Anti-Patterns & Common Mistakes](#anti-patterns--common-mistakes)
9. [Transaction & Error Handling](#transaction--error-handling)
10. [Available Components Directory](#available-components-directory)
11. [Advanced Topics](#advanced-topics)

---

## Overview

Convex Components are **self-contained building blocks** for your backend application. They are mini, independent Convex backends that package code and data in isolated sandboxes, distributed via NPM packages. Components enable you to safely add new features to your backend without risking access to your existing app infrastructure.

### Key Characteristics

- **Isolated & Safe**: Components cannot read your app's tables or call your app's functions unless explicitly passed
- **Transactional**: Component mutations commit transactionally across calls without distributed consensus
- **Reusable**: Distributed as NPM packages with clean, documented APIs
- **Open Source**: All components are open source code and data in your backend

---

## What Are Convex Components

Convex Components are **mini self-contained Convex backends** with the following properties:

### Core Features

1. **Data Isolation**
   - Components have their own database tables, separate from your app
   - Tables are automatically sandboxed
   - Components cannot access your app's tables without explicit API calls

2. **Independent File Storage**
   - Each component has its own file storage
   - Completely separate from your main application's file storage

3. **Durable Functions**
   - Reliable future scheduling with state persistence
   - Survives server restarts and failures

### State Management

Components leverage three approaches to manage state:

1. **Database tables** - With schema validation and automatic reactive reads
2. **File storage** - Independent storage separate from main app
3. **Durable functions** - For scheduled operations with persistence

---

## Why Use Components

### 1. Safety and Simplicity

Components operate with **explicit data access boundaries**. They:
- Can't read your app's tables unless you pass them in
- Can't call your app's functions unless explicitly allowed
- Eliminate security concerns when integrating third-party functionality
- Are **always safe to install**

### 2. Transactional Integrity

Unlike typical microservices, component mutations:
- Commit transactionally across calls
- Don't require distributed consensus complexity
- Guarantee data changes are consistent or fully rolled back

### 3. Encapsulation Benefits

Components expose **explicit APIs** rather than direct table access, enabling:
- Internal optimization (denormalization, sharding, batching)
- Simple external interfaces
- Implementation changes without breaking consumers

**Examples:**
- Aggregate component: Internally denormalizes data
- Rate limiter component: Shards its data for scalability
- Push notification component: Internally batches API requests

### 4. Best Practice Patterns

Convex components give you **scaling best practices in neat packages**:
- Pre-built solutions for common patterns (counters, rate limiting, workflows)
- Battle-tested implementations
- Performance optimized out of the box

---

## How Components Work

### Execution Model

Components run in **isolated environments** with these guarantees:

1. **Function Isolation**
   - Functions run in isolated environments
   - Cannot access global variables from parent app
   - Each mutation operates as a sub-mutation with independent error handling

2. **Runtime Validation**
   - All cross-component data transfers are validated
   - Type-safe boundaries enforced

3. **Reactive Queries**
   - Component queries are reactive by default
   - Maintain same transaction guarantees as main app queries

### Query/Mutation/Action Rules

Components follow the same function type rules:

- **Queries** can only call component queries
- **Mutations** can also call component mutations
- **Actions** can also call component actions

This ensures:
- Queries into components are **reactive by default**
- Mutations have the **same transaction guarantees**
- Consistent behavior across your app and components

### Important Requirement: ctx.runQuery and ctx.runMutation

When using components, you **must use** `ctx.runQuery` and `ctx.runMutation` to communicate between component code and your app code.

```typescript
// Required when working with components
const result = await ctx.runQuery(api.component.someQuery, { arg: value });
await ctx.runMutation(api.component.someMutation, { data: item });
```

This is an **exception** to the general best practice of avoiding these methods in favor of plain TypeScript functions. Component architecture necessitates this trade-off due to its modular design.

---

## Installation & Configuration

### Step 1: Install via NPM

```bash
npm i @convex-dev/component-name
```

**Example:**
```bash
npm i @convex-dev/sharded-counter
```

### Step 2: Configure in convex.config.ts

Create or update `convex/convex.config.ts`:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";

const app = defineApp();
app.use(shardedCounter);

export default app;
```

### Step 3: Run Development Server

```bash
npx convex dev
```

This will:
- Register the component with your backend
- Generate necessary code
- Set up the component's isolated environment

### Step 4: Implement the Component API

Each component provides its own unique interface. Check the component's **README** for:
- Available functions
- Configuration options
- Usage examples
- API documentation

### Multiple Components Example

You can use multiple components in the same app:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/ratelimiter/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(agent);
app.use(rateLimiter);

export default app;
```

---

## Using Pre-Made Components

### General Usage Pattern

1. **Install the component** via npm
2. **Configure** in `convex.config.ts`
3. **Run** `npx convex dev`
4. **Import and use** the component's API in your functions

### Example: Sharded Counter

```typescript
// 1. Install
// npm i @convex-dev/sharded-counter

// 2. Configure in convex.config.ts
import { defineApp } from "convex/server";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";

const app = defineApp();
app.use(shardedCounter);
export default app;

// 3. Use in your functions
import { api } from "./_generated/api";

export const incrementViews = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    // Use the component's API
    await ctx.runMutation(api.shardedCounter.increment, {
      name: `post-${args.postId}-views`
    });
  },
});
```

### Example: Rate Limiter

```typescript
import { api } from "./_generated/api";

export const sendMessage = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    // Check rate limit (component throws on limit)
    try {
      await ctx.runMutation(api.rateLimiter.checkLimit, {
        name: "sendMessage",
        userId: ctx.auth.userId,
        limit: 10,
        period: 60000, // 1 minute
      });
    } catch (error) {
      throw new Error("Rate limit exceeded");
    }

    // Process message...
  },
});
```

### Example: Workflow Component

```typescript
import { api } from "./_generated/api";

export const startOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Start a durable workflow
    await ctx.runMutation(api.workflow.start, {
      name: "onboarding",
      steps: [
        { action: "sendWelcomeEmail", delay: 0 },
        { action: "sendTipEmail", delay: 86400000 }, // 1 day
        { action: "requestFeedback", delay: 604800000 }, // 1 week
      ],
      data: { userId: args.userId },
    });
  },
});
```

---

## Best Practices

### 1. Leverage Component Isolation

**DO:**
- Trust component sandboxing for security
- Install third-party components confidently
- Pass only necessary data to components

**DON'T:**
- Try to access component tables directly
- Build custom access control around components (they're already isolated)

### 2. Use Internal Functions with Components

When scheduling component functions or calling them from other Convex functions:

```typescript
// ✅ CORRECT: Use internal functions
await ctx.scheduler.runAfter(0, internal.component.processTask, { ... });

// ❌ WRONG: Using public API functions
await ctx.scheduler.runAfter(0, api.component.processTask, { ... });
```

**Why?** Functions called only within Convex should be `internal` to prevent external malicious access.

### 3. Avoid Unnecessary Cache Layers

**DON'T** build custom cache or state aggregation layers between components and your UI.

```typescript
// ❌ ANTI-PATTERN: Building unnecessary cache
const cache = new Map();
export const getData = query({
  handler: async (ctx) => {
    if (cache.has("data")) return cache.get("data");
    const data = await ctx.runQuery(api.component.getData);
    cache.set("data", data);
    return data;
  },
});

// ✅ BETTER: Direct binding
export const getData = query({
  handler: async (ctx) => {
    return await ctx.runQuery(api.component.getData);
  },
});
```

**Rationale:** Convex queries are already reactive and cached. Binding components to Convex functions in simple ways will "Just Work and be plenty fast."

### 4. Performance Optimization

**Query Performance:**
- Mutations and queries should work with **< few hundred records**
- Aim to finish in **< 100ms**

**Index Management:**
- Indexes like `by_foo` and `by_foo_and_bar` are usually redundant
- Keep only `by_foo_and_bar` to save storage and write overhead

### 5. Use Pre-Made Components for Common Patterns

**Before building custom solutions, check if a component exists:**

```typescript
// ❌ ANTI-PATTERN: Custom counter (causes OCC conflicts)
export const incrementCounter = mutation({
  handler: async (ctx) => {
    const counter = await ctx.db.query("counters").first();
    await ctx.db.patch(counter._id, { count: counter.count + 1 });
  },
});

// ✅ BETTER: Use sharded-counter component
await ctx.runMutation(api.shardedCounter.increment, { name: "myCounter" });
```

### 6. Proper Promise Handling

**ALWAYS await promises** from component calls:

```typescript
// ❌ WRONG: Not awaiting
ctx.runMutation(api.component.doSomething, { ... });

// ✅ CORRECT: Awaiting
await ctx.runMutation(api.component.doSomething, { ... });
```

Use the `no-floating-promises` ESLint rule with TypeScript.

### 7. Let Queries Handle State

**DON'T** use mutation return values to update UI state:

```typescript
// ❌ ANTI-PATTERN
const result = await ctx.runMutation(api.component.update, { ... });
setLocalState(result); // Don't do this

// ✅ BETTER: Use queries
const data = useQuery(api.component.getData, { ... });
// UI updates automatically when data changes
```

---

## Anti-Patterns & Common Mistakes

### 1. Unnecessary ctx.runQuery/ctx.runMutation

**ANTI-PATTERN:** Using `ctx.runQuery` or `ctx.runMutation` when a plain TypeScript function would work.

```typescript
// ❌ WRONG: Unnecessary ctx.runMutation
export const validateUser = mutation({ ... });

export const createUser = mutation({
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.users.validateUser, args);
    // ...
  },
});

// ✅ BETTER: Plain TypeScript helper
function validateUser(data) {
  if (!data.email) throw new Error("Email required");
}

export const createUser = mutation({
  handler: async (ctx, args) => {
    validateUser(args);
    // ...
  },
});
```

**Exception:** Components **require** `ctx.runQuery`/`ctx.runMutation`.

### 2. Calling Actions from Browser

**ANTI-PATTERN:** Calling actions directly from the client.

```typescript
// ❌ WRONG: Direct action call from client
const handleClick = () => {
  convex.action(api.sendEmail, { ... });
};

// ✅ BETTER: Mutation triggers action
export const scheduleEmail = mutation({
  handler: async (ctx, args) => {
    // Store dependent record
    const emailId = await ctx.db.insert("emails", { ... });
    // Schedule action
    await ctx.scheduler.runAfter(0, internal.sendEmail, { emailId });
  },
});
```

### 3. Using .filter Instead of Indexes

```typescript
// ❌ SLOWER: Filtering in code
const users = await ctx.db.query("users").collect();
const activeUsers = users.filter(u => u.active);

// ✅ FASTER: Use index
const activeUsers = await ctx.db
  .query("users")
  .withIndex("by_active", q => q.eq("active", true))
  .collect();
```

### 4. Counter Pattern Causing OCC Conflicts

**ANTI-PATTERN:** Incrementing counters naively.

```typescript
// ❌ WRONG: Causes optimistic concurrency conflicts
export const incrementViews = mutation({
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    await ctx.db.patch(args.postId, { views: post.views + 1 });
  },
});

// ✅ BETTER: Use sharded-counter component
await ctx.runMutation(api.shardedCounter.increment, {
  name: `post-${args.postId}-views`
});
```

### 5. Mutating Objects in Optimistic Updates

```typescript
// ❌ WRONG: Mutating existing array
optimisticUpdate: (localStore, args) => {
  const messages = localStore.getQuery(api.messages.list);
  messages.push(args.message); // DON'T MUTATE
},

// ✅ CORRECT: Create new array
optimisticUpdate: (localStore, args) => {
  const messages = localStore.getQuery(api.messages.list);
  return [...messages, args.message]; // Create new array
},
```

### 6. Using Public Functions Instead of Internal

```typescript
// ❌ WRONG: Public function for internal use
export const processPayment = mutation({ ... });

// Used in scheduler
await ctx.scheduler.runAfter(0, api.payments.processPayment, { ... });

// ✅ BETTER: Internal function
export const processPayment = internalMutation({ ... });

await ctx.scheduler.runAfter(0, internal.payments.processPayment, { ... });
```

### 7. Creating Redundant Indexes

```typescript
// ❌ REDUNDANT
export default defineSchema({
  users: defineTable({
    email: v.string(),
    status: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_email_and_status", ["email", "status"]), // by_email is redundant
});

// ✅ BETTER: Keep only compound index
export default defineSchema({
  users: defineTable({
    email: v.string(),
    status: v.string(),
  })
    .index("by_email_and_status", ["email", "status"]),
});
```

### 8. Building Unnecessary State Layers

**ANTI-PATTERN:** Creating intermediate state management when components already provide reactivity.

```typescript
// ❌ WRONG: Custom state layer
const [data, setData] = useState(null);
const update = useMutation(api.component.update);

const handleUpdate = async (newData) => {
  await update(newData);
  setData(newData); // Unnecessary!
};

// ✅ BETTER: Let queries handle it
const data = useQuery(api.component.getData);
const update = useMutation(api.component.update);

const handleUpdate = async (newData) => {
  await update(newData);
  // Data query automatically updates
};
```

---

## Transaction & Error Handling

### Transaction Model

All writes for a **top-level mutation call**, including writes performed by calls into components' mutations, are committed **at the same time**.

```typescript
export const createPost = mutation({
  handler: async (ctx, args) => {
    // All of these commit together
    const postId = await ctx.db.insert("posts", args);
    await ctx.runMutation(api.counter.increment, { name: "total-posts" });
    await ctx.runMutation(api.notifications.send, { postId });
    // ✅ All writes commit atomically
  },
});
```

### Component Mutation Rollback Behavior

**Key Rule:** If a component mutation throws an exception, **only its writes are rolled back**, not the entire transaction.

```typescript
export const processPayment = mutation({
  handler: async (ctx, args) => {
    // Write to your app's table
    const orderId = await ctx.db.insert("orders", args);

    try {
      // Component mutation that might throw
      await ctx.runMutation(api.rateLimiter.checkLimit, { ... });
    } catch (error) {
      // Only rate limiter writes are rolled back
      // Order insert is still committed if you catch the error
      console.log("Rate limited, but order saved");
      return { orderId, rateLimited: true };
    }

    // Continue with more work...
  },
});
```

### Error Handling Patterns

#### Pattern 1: Catch Component Errors

```typescript
export const sendMessage = mutation({
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(api.rateLimiter.check, { ... });
    } catch (error) {
      throw new Error("Rate limit exceeded. Try again later.");
    }

    // Process message...
  },
});
```

#### Pattern 2: Let Errors Propagate

```typescript
export const criticalOperation = mutation({
  handler: async (ctx, args) => {
    // If component throws, entire transaction rolls back
    await ctx.runMutation(api.component.validate, { ... });

    // This only runs if validation passes
    await ctx.db.insert("records", args);
  },
});
```

#### Pattern 3: Partial Success Handling

```typescript
export const batchProcess = mutation({
  handler: async (ctx, args) => {
    const results = [];

    for (const item of args.items) {
      try {
        await ctx.runMutation(api.component.process, { item });
        results.push({ success: true, item });
      } catch (error) {
        // Component writes rolled back, but we continue
        results.push({ success: false, item, error: error.message });
      }
    }

    return results;
  },
});
```

### Best Practices for Error Handling

1. **Catch exceptions intentionally** - Decide if you want to continue or fail
2. **Log errors** - Use console.log for debugging component interactions
3. **Provide clear error messages** - Help users understand what went wrong
4. **Use internal functions** - Prevent external malicious calls that could cause errors

---

## Available Components Directory

### Complete List of @convex-dev Components

#### Third-Party Service Integrations

1. **@convex-dev/cloudflare-r2**
   - Store and serve files from Cloudflare R2
   - Alternative to Convex file storage

2. **@convex-dev/resend**
   - Send reliable transactional emails
   - Integration with Resend email service

3. **@convex-dev/polar**
   - Add subscriptions and billing with Polar
   - Manage recurring payments

4. **@convex-dev/expo-push-notifications**
   - Send push notifications via Expo
   - Handles retries and batching

5. **@convex-dev/twilio-sms**
   - Send and receive SMS via Twilio
   - Query message status from query functions

6. **@convex-dev/launchdarkly**
   - Sync LaunchDarkly feature flags
   - Use feature flags in Convex functions

7. **@convex-dev/oss-stats**
   - Sync GitHub and npm data for open source projects
   - Track project statistics

8. **@convex-dev/autumn**
   - Pricing and billing database for your app
   - Handle complex pricing models

9. **@convex-dev/dodo-payments**
   - Complete billing and payments solution
   - Purpose-built for AI and SaaS applications

10. **@convex-dev/collaborative-text-editor**
    - Collaborative editor sync engine
    - Works with ProseMirror-based Tiptap and BlockNote

#### Core Infrastructure Components

11. **@convex-dev/agent**
    - AI Agents with message history
    - Built-in vector search
    - Organize AI workflows

12. **@convex-dev/text-streaming**
    - Stream text like AI chat in real-time
    - Efficiently store to database simultaneously

13. **@convex-dev/ratelimiter**
    - Application-layer rate limits
    - Type-safe, transactional, configurable sharding

14. **@convex-dev/action-cache**
    - Cache expensive action results (e.g., AI calls)
    - Optional expiration times

15. **@convex-dev/aggregate**
    - Calculate count and sums efficiently
    - Denormalize data for performance

16. **@convex-dev/sharded-counter**
    - Scalable counter implementation
    - Prevents OCC conflicts

17. **@convex-dev/migrations**
    - Manage online database migrations
    - Resume from failures, validate with dry runs

18. **@convex-dev/presence**
    - Track user presence in real-time
    - Know who's online

19. **@convex-dev/crons**
    - Dynamic cron job registration at runtime
    - More flexible than static cron definitions

20. **@convex-dev/workflow**
    - Durably executed workflows
    - Combine queries, mutations, and actions
    - Handles retries and server restarts

21. **@convex-dev/auth**
    - Authentication directly in Convex backend
    - Alternative to third-party auth

22. **@convex-dev/better-auth**
    - BetterAuth integration for Convex
    - Comprehensive auth solution

23. **@convex-dev/rag**
    - Semantic search component
    - Retrieval-Augmented Generation for LLMs

### Component Categories

#### Durable Functions
- **Workflow** - Long-lived workflows with retry logic
- **Crons** - Dynamic scheduled tasks
- **Action Retrier** - Retry failed actions automatically

#### Database Tools
- **Sharded Counter** - High-throughput counters
- **Migrations** - Online schema migrations
- **Aggregate** - Data aggregation and denormalization
- **Geospatial** - Location-based queries
- **RAG** - Vector search for AI
- **Presence** - Real-time user presence

#### AI & Streaming
- **Agent** - AI agent framework
- **Text Streaming** - Real-time text streaming
- **Action Cache** - Cache expensive AI calls

#### Backend Infrastructure
- **Rate Limiter** - Protect against abuse
- **Auth/Better Auth** - Authentication systems

---

## Advanced Topics

### Creating Custom Components

**Current Status:** Component authoring APIs are in **beta** and not yet fully documented.

**Future:** You'll eventually be able to:
- Author your own components
- Use them within your project
- Share them with the community

**For now:** Use the 22+ pre-made components from `@convex-dev`.

### Monitoring Components

#### Dashboard Visibility

The Convex Dashboard provides visibility into component operations:

1. Navigate to your project Dashboard
2. Use the **dropdown selector** to switch between:
   - Your main app
   - Individual components

3. View for each component:
   - Data tables
   - Functions
   - Files
   - Metadata
   - Usage statistics

#### Debugging Components

**Logging:**
```typescript
export const myFunction = mutation({
  handler: async (ctx, args) => {
    console.log("Calling component...");
    try {
      await ctx.runMutation(api.component.action, args);
      console.log("Component call succeeded");
    } catch (error) {
      console.error("Component error:", error);
      throw error;
    }
  },
});
```

**Check Logs in Dashboard:**
- Navigate to the component in the dropdown
- View function logs
- Inspect error messages

### Performance Considerations

#### Component Call Overhead

Components have **minimal overhead** but are not zero-cost:
- Use component queries - they're reactive and cached
- Avoid excessive component calls in tight loops
- Batch operations when possible

#### Storage Costs

Components incur **usage charges** based on:
- Database storage (component tables)
- File storage (component files)
- Function execution time
- Data transfer

**They're just code and data in your existing backend**, so you pay for what they use.

### Integration Patterns

#### Pattern 1: Workflow Orchestration

```typescript
export const startUserOnboarding = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Use workflow component for multi-step process
    await ctx.runMutation(api.workflow.start, {
      name: "onboarding",
      steps: [
        { type: "sendWelcomeEmail", delay: 0 },
        { type: "createDashboard", delay: 60000 },
        { type: "sendTipsEmail", delay: 86400000 },
      ],
      context: { userId: args.userId },
    });
  },
});
```

#### Pattern 2: Rate-Limited Actions

```typescript
export const sendChatMessage = mutation({
  args: { message: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Check rate limit
    await ctx.runMutation(api.rateLimiter.check, {
      key: `chat:${ctx.auth.userId}`,
      limit: 10,
      window: 60000,
    });

    // Send message
    await ctx.db.insert("messages", {
      userId: ctx.auth.userId,
      roomId: args.roomId,
      text: args.message,
      timestamp: Date.now(),
    });

    // Increment message counter
    await ctx.runMutation(api.shardedCounter.increment, {
      name: `room:${args.roomId}:messageCount`,
    });
  },
});
```

#### Pattern 3: AI Agent with RAG

```typescript
export const askAIQuestion = action({
  args: { question: v.string(), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    // Search knowledge base with RAG
    const context = await ctx.runQuery(api.rag.search, {
      query: args.question,
      limit: 5,
    });

    // Send to AI agent with context
    await ctx.runMutation(api.agent.sendMessage, {
      threadId: args.threadId,
      content: args.question,
      context: context.results,
    });

    // Stream response back
    return await ctx.runAction(api.agent.streamResponse, {
      threadId: args.threadId,
    });
  },
});
```

#### Pattern 4: Scheduled Migrations

```typescript
export const scheduleSchemaMigration = mutation({
  handler: async (ctx) => {
    // Use migrations component for safe data evolution
    await ctx.runMutation(api.migrations.start, {
      name: "add-user-preferences",
      batchSize: 100,
      migration: async (ctx, batch) => {
        for (const user of batch) {
          await ctx.db.patch(user._id, {
            preferences: { theme: "light", notifications: true },
          });
        }
      },
    });
  },
});
```

### Security Considerations

#### Component Isolation

Components are **inherently secure** due to sandboxing:
- Cannot access your tables without explicit permission
- Cannot call your functions without being passed the API
- Operate in isolated environments

#### Best Practices

1. **Use internal functions** for component callbacks
2. **Validate data** passed to components
3. **Audit component usage** before production
4. **Review component source** (they're open source!)

```typescript
// ✅ GOOD: Validate before passing to component
export const processOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Validate ownership
    if (order.userId !== ctx.auth.userId) {
      throw new Error("Unauthorized");
    }

    // Safe to pass to component
    await ctx.runMutation(api.payments.processPayment, {
      orderId: args.orderId,
      amount: order.total,
    });
  },
});
```

---

## Quick Reference

### Installation Checklist

- [ ] Install component: `npm i @convex-dev/component-name`
- [ ] Import in `convex.config.ts`
- [ ] Add `app.use(componentConfig)`
- [ ] Export `app` as default
- [ ] Run `npx convex dev`
- [ ] Read component README for API
- [ ] Use component via `ctx.runQuery`/`ctx.runMutation`

### Common Component Use Cases

| Use Case | Component | Package |
|----------|-----------|---------|
| High-volume counters | Sharded Counter | `@convex-dev/sharded-counter` |
| Rate limiting | Rate Limiter | `@convex-dev/ratelimiter` |
| Long workflows | Workflow | `@convex-dev/workflow` |
| AI chat | Agent | `@convex-dev/agent` |
| Semantic search | RAG | `@convex-dev/rag` |
| User presence | Presence | `@convex-dev/presence` |
| Email sending | Resend | `@convex-dev/resend` |
| SMS messaging | Twilio SMS | `@convex-dev/twilio-sms` |
| File storage | Cloudflare R2 | `@convex-dev/cloudflare-r2` |
| Auth | Better Auth | `@convex-dev/better-auth` |

### Key Reminders

1. Components **cannot access your tables** unless explicitly passed
2. Components **are always safe to install**
3. Use `ctx.runQuery`/`ctx.runMutation` with components (required)
4. Component mutations can throw exceptions that you can catch
5. All component writes commit transactionally with your app
6. Check the **Dashboard dropdown** to monitor components
7. Each component has its own **README with full documentation**

---

## Resources

- **Official Docs:** https://docs.convex.dev/components
- **Component Directory:** https://www.convex.dev/components
- **NPM Organization:** https://www.npmjs.com/org/convex-dev
- **Best Practices:** https://docs.convex.dev/understanding/best-practices
- **Community:** Join the Convex Discord for help and tips

---

## Example: Your Current Setup

Based on your `web/convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

You're currently using the **@convex-dev/better-auth** component for authentication. This component:
- Handles user authentication logic
- Stores auth data in isolated tables
- Cannot access your other app tables
- Provides auth APIs via `ctx.runQuery`/`ctx.runMutation`

To add more components (e.g., rate limiting for your chat rooms):

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/ratelimiter/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(rateLimiter);

export default app;
```

---

*Last Updated: 2025-01-05*
*Convex Components are in beta - APIs may change*
