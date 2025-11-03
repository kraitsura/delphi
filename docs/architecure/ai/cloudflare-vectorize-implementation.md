# Cloudflare Vectorize & Workers AI for Event Planning Intelligence

**Version:** 1.0  
**Date:** October 30, 2025  
**Focus:** Practical vector search and AI for single-event planning

---

## Table of Contents

1. [Overview](#overview)
2. [Vector Storage Architecture](#vector-storage-architecture)
3. [Use Cases & Embeddings](#use-cases--embeddings)
4. [Schema Design](#schema-design)
5. [Implementation Patterns](#implementation-patterns)
6. [Workers AI Integration](#workers-ai-integration)
7. [Query Examples](#query-examples)

---

## Overview

### Why Vector Search for Event Planning?

Traditional keyword search fails for event planning because:
- **Semantic variations**: "DJ" vs "music entertainment" vs "reception music"
- **Context scattered**: Decisions made across multiple chats, tasks, and messages
- **Relationship discovery**: Finding related content without explicit links
- **Natural language queries**: "What did we decide about food?" should work

### Cloudflare Stack Benefits

**Vectorize** (Vector Database):
- 100M vectors free tier
- 768-dimension embeddings
- Sub-100ms queries
- Metadata filtering
- No separate service needed

**Workers AI**:
- Text embeddings (@cf/baai/bge-base-en-v1.5)
- Runs on Cloudflare's network
- Low latency (edge computing)
- Pay per request (~$0.01/1K requests)

---

## Vector Storage Architecture

### What Gets Embedded

**Core Principle**: Embed **unstructured content** that users want to find semantically. Don't embed **structured data** that can be queried traditionally.

**Embed** → Unstructured, conversational, semantic discovery needed
**Don't Embed** → Structured fields, filterable attributes, clear categories

```typescript
interface EmbeddableContent {
  // Text that goes into embedding
  content: string
  
  // Metadata for filtering (NOT embedded)
  metadata: {
    eventId: string
    type: string
    sourceId: string
    timestamp: number
    // ... other filters
  }
  
  // Vector representation
  vector: number[]  // 768 dimensions
}
```

### What NOT to Embed

**Tasks** - Structured data, query with filters:
- Tasks have clear categories, statuses, assignees, due dates
- Users interact through kanban/list views with sorting and filtering
- AI creates well-categorized tasks → no semantic search needed
- Query: `tasks.filter(t => t.category === "photography" && t.status === "in_progress")`

**Guest List** - Structured data:
- Filter by RSVP status, meal preference, group
- Traditional database queries are perfect
- Exception: Guest notes might be embedded if substantial

**Calendar Events** - Structured temporal data:
- Query by date ranges, attendees, type
- Traditional time-based queries work better

**Expenses (metadata)** - Structured financial data:
- Category, amount, status are filterable
- Exception: Description text might be embedded for semantic search

### Vectorize Indexes

Create separate indexes for different content types:

```typescript
// Index structure in Vectorize
const VECTORIZE_INDEXES = {
  // Main content search
  "event_content": {
    dimensions: 768,
    metric: "cosine",
    description: "All searchable event content"
  },
  
  // Vendor-specific search
  "vendors": {
    dimensions: 768,
    metric: "cosine",
    description: "Vendor profiles and capabilities"
  },
  
  // Document content
  "documents": {
    dimensions: 768,
    metric: "cosine",
    description: "Contract and file contents"
  }
}
```

---

## Use Cases & Embeddings

### 1. Semantic Message Search

**Problem**: Find relevant discussions without exact keyword matches.

**What to Embed**:
```typescript
{
  content: `
    ${message.text}
    Context: Discussion in ${chat.name}
    Participants: ${participants.map(p => p.name).join(", ")}
    ${message.mentionedParticipants ? `Mentions: ${mentions}` : ""}
  `,
  
  metadata: {
    eventId: "evt_123",
    type: "message",
    sourceId: message._id,
    chatId: message.chatId,
    senderId: message.senderId,
    timestamp: message.createdAt,
    hasAttachments: message.attachments.length > 0
  }
}
```

**Use Case Example**:
```typescript
// User asks: "What did we say about outdoor vs indoor?"
// Even though messages used "garden wedding" and "ballroom reception"
// Vector search finds semantically similar content

const results = await searchVectors({
  query: "outdoor vs indoor venue discussion",
  filter: { eventId: "evt_123", type: "message" }
});
```

---

### 2. Context-Aware Vendor Matching

**Problem**: Match user requirements to vendor capabilities semantically.

**What to Embed**:
```typescript
{
  content: `
    Vendor: ${vendor.name}
    Category: ${vendor.category}
    Specialties: ${vendor.specialties.join(", ")}
    Services: ${vendor.description || ""}
    Style: ${vendor.style || ""}
    Typical clients: ${vendor.typicalClients || ""}
    Notable work: ${vendor.portfolio || ""}
    Price range: ${vendor.priceRange?.note || ""}
  `,
  
  metadata: {
    eventId: vendor.eventId,
    type: "vendor",
    sourceId: vendor._id,
    category: vendor.category,
    status: vendor.status,
    availability: vendor.availability,
    minPrice: vendor.priceRange?.min || 0,
    maxPrice: vendor.priceRange?.max || 999999
  }
}
```

**Use Case Example**:
```typescript
// User: "I need a photographer who does candid, natural light shots for outdoor wedding"
// Match to vendors even if they described themselves differently

const vendors = await searchVectors({
  query: "photographer candid natural light outdoor wedding",
  filter: {
    eventId: "evt_123",
    type: "vendor",
    category: "photography",
    availability: ["available", "likely_available"]
  },
  limit: 10
});

// Returns vendors who mentioned:
// - "documentary style photography"
// - "natural lighting specialist"
// - "unposed wedding moments"
// Even if they never used the word "candid"
```

---

### 3. Decision Context Retrieval

**Problem**: When making decisions, need full context from scattered discussions.

**What to Embed**:
```typescript
// Decisions
{
  content: `
    Decision: ${decision.what}
    Outcome: ${decision.decision}
    Reasoning: ${decision.reasoning}
    Category: ${decision.category}
    Alternatives considered: ${decision.alternatives.join(", ")}
    Impact: ${decision.impacts.map(i => i.description).join("; ")}
  `,
  
  metadata: {
    eventId: decision.eventId,
    type: "decision",
    sourceId: decision._id,
    category: decision.category,
    status: decision.status,
    timestamp: decision.createdAt
  }
}

// Polls (include with decisions)
{
  content: `
    Poll question: ${poll.question}
    Options: ${poll.options.map(o => `${o.label}: ${o.description}`).join("; ")}
    AI recommendation: ${poll.aiRecommendation?.reasoning || ""}
    Final result: ${poll.results.winner ? poll.options.find(o => o.id === poll.results.winner)?.label : ""}
  `,
  
  metadata: {
    eventId: poll.eventId,
    type: "poll",
    sourceId: poll._id,
    status: poll.status,
    timestamp: poll.createdAt
  }
}
```

**Use Case Example**:
```typescript
// User asks: "Why did we choose buffet over plated dinner?"
// Find the decision AND all related context

const context = await searchVectors({
  query: "buffet plated dinner service style decision",
  filter: {
    eventId: "evt_123",
    type: ["decision", "poll", "message"]
  },
  limit: 10
});

// Returns:
// 1. The decision record
// 2. The poll that led to it
// 3. Chat messages discussing pros/cons
// 4. Related tasks (catering task notes)
```

---

### 4. Expense & Budget Intelligence

**Problem**: Find expenses by semantic description when category isn't obvious.

**What to Embed**:
```typescript
// Only embed the DESCRIPTION, not the structured metadata
{
  content: `
    ${expense.description}
    ${expense.vendorId ? `Vendor: ${vendor.name}` : ""}
    ${expense.notes || ""}
  `,
  
  metadata: {
    eventId: expense.eventId,
    type: "expense",
    sourceId: expense._id,
    category: expense.category,      // Filterable, not embedded
    amount: expense.amount,          // Filterable, not embedded
    status: expense.status,          // Filterable, not embedded
    timestamp: expense.paidDate
  }
}
```

**Use Case Example**:
```typescript
// User asks: "How much did we spend on flowers and decorations?"
// Vector search on DESCRIPTIONS, traditional query on categories

// Option 1: If expense has good description, semantic search helps
const semanticResults = await searchVectors({
  query: "flowers decorations floral centerpieces bouquets",
  filter: {
    eventId: "evt_123",
    type: "expense"
  }
});

// Option 2: Traditional category filter (usually better)
const expenses = await db.query("expenses")
  .filter(q => 
    q.eq("eventId", "evt_123")
    .or(
      q.eq("category", "flowers"),
      q.eq("category", "decor")
    )
  );

// Best: Combine both approaches for comprehensive results
```

**Note**: Expenses are primarily structured data. Only embed if descriptions contain useful semantic information. Many expenses may not need embedding at all.

---

### 5. Document & File Search

**Problem**: Find information in uploaded documents without knowing filename.

**What to Embed**:
```typescript
{
  content: `
    Document: ${file.name}
    Type: ${file.type}
    Category: ${file.category}
    ${file.ocrText ? `Content: ${file.ocrText}` : ""}
    ${file.aiAnalysis?.extractedData ? `Details: ${JSON.stringify(file.aiAnalysis.extractedData)}` : ""}
    Tags: ${file.tags.join(", ")}
  `,
  
  metadata: {
    eventId: file.eventId,
    type: "document",
    sourceId: file._id,
    fileType: file.type,
    category: file.category,
    mimeType: file.mimeType,
    timestamp: file.createdAt
  }
}
```

**Use Case Example**:
```typescript
// User asks: "What does the venue contract say about cancellation?"
// Searches through all uploaded contracts

const docs = await searchVectors({
  query: "venue contract cancellation policy refund",
  filter: {
    eventId: "evt_123",
    type: "document",
    fileType: "contract"
  }
});

// Returns relevant contract with OCR'd content
// User can then view the actual document
```

---

### 6. Contextual Task & Planning Assistance

**Problem**: When working on a task, need to surface all related context from conversations and decisions.

**What to Embed**: Messages, decisions, vendor info, documents (NOT tasks themselves)

**Use Case Example**:
```typescript
// User opens task: "Finalize catering menu" (from structured task manager)
// Automatically surface related context using vector search

const context = await searchVectors({
  query: `
    catering menu food service dinner meal planning
    buffet plated dietary restrictions guest preferences
  `,
  filter: {
    eventId: "evt_123",
    type: ["message", "decision", "document", "vendor"]
  },
  limit: 20
});

// Show sidebar with:
// - Related chat discussions about food preferences
// - Decision: "Buffet style chosen" (with reasoning)
// - Vendor: Catering company contact info and quote
// - Document: Sample menu from caterer
// - Messages: Dietary restriction discussions
// - Decision: "Vegetarian options required for 15 guests"

// User doesn't search for this - it appears automatically
// based on semantic relevance to the task they're viewing
```

**Key Insight**: Tasks are structured and filterable. But to DO a task effectively, you need context from unstructured sources (chats, decisions, documents). Vector search bridges this gap.

---

## Schema Design

### Convex Schema Extensions

Add vector reference tracking to content that gets embedded:

```typescript
// Add to tables that GET embedded:

interface Message {
  // ... existing fields
  
  // Vector tracking
  vectorId?: string           // ID in Vectorize
  vectorIndexed: boolean      // Has been embedded
  vectorIndexedAt?: number    // When embedded
  vectorVersion?: number      // For re-indexing
}

interface Decision {
  // ... existing fields
  
  vectorId?: string
  vectorIndexed: boolean
  vectorIndexedAt?: number
  vectorVersion?: number
}

interface Vendor {
  // ... existing fields
  
  vectorId?: string
  vectorIndexed: boolean
  vectorIndexedAt?: number
  vectorVersion?: number
}

interface File {
  // ... existing fields
  
  vectorId?: string
  vectorIndexed: boolean
  vectorIndexedAt?: number
  vectorVersion?: number
}

// Do NOT add to:
// - tasks (structured, filterable)
// - expenses (mostly structured, except descriptions)
// - guestList (structured, filterable)
// - calendarEvents (temporal queries better)
```

### New Table: vectorSyncQueue

Track what needs to be embedded or updated:

```typescript
{
  _id: Id<"vectorSyncQueue">
  _creationTime: number
  
  // Source
  eventId: Id<"events">
  sourceType: "message" | "decision" | "poll" | "vendor" | "file"
  sourceId: string            // ID of the source object
  
  // Operation
  operation: "index" | "update" | "delete"
  priority: "high" | "medium" | "low"
  
  // Status
  status: "pending" | "processing" | "completed" | "failed"
  attempts: number
  lastAttempt?: number
  error?: string
  
  // Processing
  processedAt?: number
  vectorId?: string           // Resulting vector ID
  
  // Audit
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_status` - Pending items
- `by_event_status` - Event's sync queue
- `by_priority` - Process high priority first

---

## Implementation Patterns

### Pattern 1: Automatic Embedding on Create

Whenever content is created, queue for embedding:

```typescript
// Example: Message created
async function createMessage(ctx, args) {
  // 1. Create the message
  const messageId = await ctx.db.insert("messages", {
    ...args,
    vectorIndexed: false,
    createdAt: Date.now()
  });
  
  // 2. Queue for vector indexing
  await ctx.db.insert("vectorSyncQueue", {
    eventId: args.eventId,
    sourceType: "message",
    sourceId: messageId,
    operation: "index",
    priority: "medium",
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  return messageId;
}
```

### Pattern 2: Background Processing Worker

Cloudflare Worker processes the sync queue:

```typescript
// Scheduled worker (runs every minute)
export default {
  async scheduled(event, env, ctx) {
    // Get pending items
    const pending = await convex.query("vectorSyncQueue.getPending", {
      limit: 10,
      priority: ["high", "medium", "low"]
    });
    
    for (const item of pending) {
      try {
        // Mark as processing
        await convex.mutation("vectorSyncQueue.markProcessing", { 
          id: item._id 
        });
        
        // Get source content
        const content = await getContentForEmbedding(item);
        
        // Generate embedding
        const embedding = await env.AI.run(
          "@cf/baai/bge-base-en-v1.5",
          { text: content.text }
        );
        
        // Store in Vectorize
        const vectorId = await env.VECTORIZE.upsert([{
          id: `${item.sourceType}_${item.sourceId}`,
          values: embedding.data[0],
          metadata: content.metadata
        }]);
        
        // Mark as completed
        await convex.mutation("vectorSyncQueue.markCompleted", {
          id: item._id,
          vectorId: vectorId
        });
        
        // Update source with vector info
        await convex.mutation(`${item.sourceType}.updateVectorInfo`, {
          id: item.sourceId,
          vectorId: vectorId,
          vectorIndexed: true,
          vectorIndexedAt: Date.now()
        });
        
      } catch (error) {
        // Mark as failed
        await convex.mutation("vectorSyncQueue.markFailed", {
          id: item._id,
          error: error.message
        });
      }
    }
  }
};
```

### Pattern 3: Real-Time Search

Search across all embedded content:

```typescript
async function semanticSearch(ctx, args: {
  eventId: string;
  query: string;
  filters?: {
    types?: string[];
    categories?: string[];
    dateRange?: { start: number; end: number };
  };
  limit?: number;
}) {
  // 1. Generate query embedding
  const queryEmbedding = await env.AI.run(
    "@cf/baai/bge-base-en-v1.5",
    { text: args.query }
  );
  
  // 2. Search Vectorize with metadata filters
  const vectorResults = await env.VECTORIZE.query(
    queryEmbedding.data[0],
    {
      topK: args.limit || 10,
      filter: {
        eventId: args.eventId,
        ...(args.filters?.types && { type: { $in: args.filters.types } }),
        ...(args.filters?.categories && { category: { $in: args.filters.categories } }),
        ...(args.filters?.dateRange && {
          timestamp: {
            $gte: args.filters.dateRange.start,
            $lte: args.filters.dateRange.end
          }
        })
      }
    }
  );
  
  // 3. Hydrate results from Convex
  const results = await Promise.all(
    vectorResults.matches.map(async (match) => {
      const [type, id] = match.id.split("_");
      
      // Get full object from database
      const object = await ctx.db.get(id);
      
      return {
        score: match.score,
        type: type,
        object: object,
        metadata: match.metadata
      };
    })
  );
  
  return results;
}
```

### Pattern 4: Smart Context Assembly for AI Agents

When AI agent needs context, use vector search instead of fixed queries:

```typescript
async function assembleContextForAgent(ctx, args: {
  eventId: string;
  intent: string;
  userMessage: string;
  contextLevel: "minimal" | "standard" | "rich";
}) {
  const tokenLimits = {
    minimal: 500,
    standard: 1000,
    rich: 3000
  };
  
  // Use vector search to find most relevant content
  const relevantContent = await semanticSearch(ctx, {
    eventId: args.eventId,
    query: `${args.intent} ${args.userMessage}`,
    limit: 20  // Get more than needed, then filter by tokens
  });
  
  // Build context prioritizing highest scoring results
  let context = {
    recentMessages: [],
    relevantDecisions: [],
    relevantVendors: [],
    relevantDocuments: []
  };
  
  let tokenCount = 0;
  const maxTokens = tokenLimits[args.contextLevel];
  
  for (const result of relevantContent) {
    // Estimate tokens (rough: ~4 chars per token)
    const contentTokens = Math.ceil(
      JSON.stringify(result.object).length / 4
    );
    
    if (tokenCount + contentTokens > maxTokens) {
      break;
    }
    
    // Add to appropriate context bucket
    switch (result.type) {
      case "message":
        context.recentMessages.push(result.object);
        break;
      case "decision":
      case "poll":
        context.relevantDecisions.push(result.object);
        break;
      case "vendor":
        context.relevantVendors.push(result.object);
        break;
      case "file":
        context.relevantDocuments.push(result.object);
        break;
    }
    
    tokenCount += contentTokens;
  }
  
  return context;
}
```

---

## Workers AI Integration

### Text Embeddings

Use Workers AI for generating embeddings:

```typescript
// Generate embedding for text
async function generateEmbedding(env, text: string): Promise<number[]> {
  const response = await env.AI.run(
    "@cf/baai/bge-base-en-v1.5",
    { text: text }
  );
  
  return response.data[0];  // 768-dimensional vector
}

// Batch processing for efficiency
async function generateEmbeddings(env, texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => 
      env.AI.run("@cf/baai/bge-base-en-v1.5", { text })
    )
  );
  
  return embeddings.map(e => e.data[0]);
}
```

### Text Generation (for summaries)

Use Workers AI to generate summaries of search results:

```typescript
async function summarizeSearchResults(env, results: SearchResult[]): Promise<string> {
  const context = results
    .map(r => `[${r.type}] ${r.object.name || r.object.text}`)
    .join("\n");
  
  const response = await env.AI.run(
    "@cf/meta/llama-3-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content: "Summarize the following event planning content concisely."
        },
        {
          role: "user",
          content: context
        }
      ]
    }
  );
  
  return response.response;
}
```

---

## Query Examples

### Example 1: Context-Aware AI Response

User asks: "What's the status on photography?"

```typescript
// 1. Generate query embedding
const queryEmbedding = await generateEmbedding(
  env,
  "photography photographer photo video pictures wedding shots"
);

// 2. Search all relevant content
const results = await env.VECTORIZE.query(queryEmbedding, {
  topK: 15,
  filter: {
    eventId: "evt_123"
  }
});

// 3. Group results by type
const context = {
  messages: results.filter(r => r.metadata.type === "message"),
  vendors: results.filter(r => r.metadata.type === "vendor"),
  decisions: results.filter(r => r.metadata.type === "decision"),
  documents: results.filter(r => r.metadata.type === "file")
};

// 4. Get task status from structured query (not vector search)
const photographyTask = await db
  .query("tasks")
  .filter(q => q.eq("eventId", "evt_123").eq("category", "photography"))
  .first();

const photographyExpenses = await db
  .query("expenses")
  .filter(q => q.eq("eventId", "evt_123").eq("category", "photography"))
  .collect();

// 5. AI generates comprehensive answer combining structured + semantic data
const answer = `
  Photography Status:
  
  Task: "${photographyTask.name}" - ${photographyTask.status}
  Vendor: ${context.vendors[0].name} (${context.vendors[0].status})
  Budget: $${photographyExpenses.reduce((sum, e) => sum + e.amount, 0) / 100} paid
  
  Recent discussions: ${context.messages.length} messages found about photo style preferences
  Decision: "${context.decisions[0].decision}" (made on ${formatDate(context.decisions[0].createdAt)})
`;
```

### Example 2: Vendor Discovery

User: "I need someone to do flowers and centerpieces, rustic style"

```typescript
const vendors = await env.VECTORIZE.query(
  await generateEmbedding(
    env,
    "flowers centerpieces rustic style wedding decorations floral arrangements"
  ),
  {
    topK: 10,
    filter: {
      eventId: "evt_123",
      type: "vendor",
      category: { $in: ["flowers", "decor"] },
      availability: { $in: ["available", "likely_available"] }
    }
  }
);

// Returns vendors who mentioned:
// - "wildflower arrangements"
// - "farmhouse wedding specialist"
// - "natural, organic florals"
// Even if they never said "rustic"
```

### Example 3: Budget Analysis

User: "What am I spending on venue stuff?"

```typescript
// Primary approach: Traditional category filter
const venueExpenses = await db
  .query("expenses")
  .filter(q => 
    q.eq("eventId", "evt_123")
    .eq("category", "venue")
  )
  .collect();

// Secondary: Semantic search for descriptions if categories unclear
const semanticExpenses = await env.VECTORIZE.query(
  await generateEmbedding(
    env,
    "venue space location hall ballroom room rental facility"
  ),
  {
    topK: 10,
    filter: {
      eventId: "evt_123",
      type: "expense"
    }
  }
);

// Combine: Union of both approaches ensures nothing is missed
const allVenueExpenses = [...new Set([
  ...venueExpenses,
  ...semanticExpenses.matches.map(m => m.object)
])];

const total = allVenueExpenses.reduce(
  (sum, expense) => sum + expense.amount,
  0
);

// Result: $12,000 across venue category + semantically matched items
```

### Example 4: Decision Context

User: "Why did we go with that DJ?"

```typescript
const context = await env.VECTORIZE.query(
  await generateEmbedding(
    env,
    "DJ music entertainment decision choice reasoning Groove Masters"
  ),
  {
    topK: 15,
    filter: {
      eventId: "evt_123",
      type: { $in: ["decision", "poll", "message", "vendor"] }
    }
  }
);

// Returns (sorted by relevance):
// 1. Decision record: "Selected Groove Masters DJ"
// 2. Poll: "Which DJ do you prefer?" with voting history
// 3. Vendor profile: Groove Masters details and quote
// 4. Messages: "I loved their demo reel" 
// 5. Messages: "They played at my friend's wedding"
// 6. Messages: "DJ Mike quoted $500 more and less responsive"
// 7. Decision: "Budget allocated for entertainment"

// AI synthesizes complete story:
"You chose Groove Masters DJ because they scored highest in the poll 
(8 votes vs 3), had great reviews from people who saw them before, 
were within budget at $1,250, and were very responsive. You passed on 
DJ Mike because of higher cost and slower communication."
```

---

## Performance Optimization

### Embedding Strategy

**Immediate Embedding** (high priority):
- Messages in main event chat
- Tasks created
- Decisions made
- Critical vendor additions

**Batch Embedding** (low priority):
- Old messages (background process)
- File uploads (after OCR)
- Guest list imports

### Caching Strategy

```typescript
// Cache frequently used embeddings
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string): Promise<number[]> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  const key = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key)!;
  }
  
  const embedding = await generateEmbedding(env, text);
  embeddingCache.set(key, embedding);
  
  return embedding;
}
```

### Query Optimization

```typescript
// Use metadata filters aggressively
// BAD: Search everything, filter in code
const results = await env.VECTORIZE.query(embedding, { topK: 100 });
const filtered = results.filter(r => r.metadata.eventId === "evt_123");

// GOOD: Filter at database level
const results = await env.VECTORIZE.query(embedding, {
  topK: 10,
  filter: {
    eventId: "evt_123",
    type: { $in: ["task", "message"] },
    timestamp: { $gte: lastWeek }
  }
});
```

---

## Cost Estimation

### Cloudflare Vectorize
- **Free tier**: 100M vector dimensions stored
- **Our usage**: ~768 dimensions per item
- **Capacity**: ~130,000 items free
- **Per event**: ~500-2000 items (plenty of headroom)

### Workers AI
- **Embeddings**: ~$0.01 per 1,000 requests
- **Per event**: ~1,000 items to embed = $0.01
- **Searches**: ~100 searches per day = $0.10/month
- **Total**: ~$1-2 per event over entire planning period

### Comparison to Alternatives
- **Pinecone**: $70/month minimum
- **Weaviate**: Self-hosted complexity
- **OpenAI Embeddings**: $0.13 per 1,000 (13x more expensive)

---

## Summary

### What Gets Embedded (Priority Order)

**Embed These** (Unstructured Content):

1. **HIGH PRIORITY** (embed immediately):
   - **Messages** in event chats - conversational, context scattered
   - **Decisions & Polls** - why decisions were made, reasoning
   - **Vendor profiles** - capabilities, style, descriptions

2. **MEDIUM PRIORITY** (batch hourly):
   - **Documents (OCR'd)** - contract contents, uploaded files
   - **Expense descriptions** - only if description contains useful semantic info

3. **LOW PRIORITY** (optional/batch daily):
   - **Historical messages** - backfill old conversations

**Don't Embed These** (Structured Data - Use Traditional Queries):

- ❌ **Tasks** - AI creates well-categorized tasks; filter by category/status/assignee
- ❌ **Calendar events** - Query by date ranges and attendees
- ❌ **Guest list** - Filter by RSVP status, meal preference, group
- ❌ **Expense metadata** - Categories, amounts, statuses are filterable
- ❌ **Task Groups** - Structured progress tracking

**Hybrid Approach**:
When working on a task (structured), use vector search to find related context from messages/decisions/documents (unstructured).

### Key Benefits

✅ **Semantic Search**: Find conversations by meaning, not keywords  
✅ **Context Discovery**: Surface related discussions when viewing tasks  
✅ **Decision Recall**: Find "why we decided X" from scattered conversations  
✅ **Smart AI Context**: Give agents relevant context without fixed queries  
✅ **Vendor Matching**: Natural language vendor capability search  
✅ **Document Search**: Find info in contracts/PDFs via OCR  
✅ **Hybrid Approach**: Vector search (unstructured) + traditional queries (structured)  
✅ **Low Cost**: ~$1-2 per event total  

### What Vector Search Does NOT Replace

❌ Task filtering/sorting (use database queries)  
❌ Budget calculations (use database aggregations)  
❌ Calendar/date queries (use temporal queries)  
❌ Guest list filtering (use database queries)  
❌ Progress tracking (calculated fields)  

### Implementation Checklist

- [ ] Set up Vectorize index in Cloudflare
- [ ] Add `vectorSyncQueue` table to Convex
- [ ] Add vector tracking fields to: messages, decisions, vendors, files
- [ ] Implement background worker for embedding
- [ ] Add semantic search API endpoints
- [ ] Integrate vector search into AI context assembly
- [ ] Implement contextual sidebar for tasks (shows related messages/decisions)
- [ ] Add semantic vendor search
- [ ] Set up caching for frequently embedded content
- [ ] Implement OCR pipeline for document embedding
- [ ] Create hybrid query functions (vector + traditional)

---

**Ready for Implementation** 🚀

This architecture leverages Cloudflare's vector capabilities specifically for making single-event planning more intelligent through:

- **Semantic search of conversations** - Find discussions by meaning, not keywords
- **Contextual task assistance** - Surface related conversations when working on tasks  
- **Decision intelligence** - Recall why choices were made from scattered context
- **Smart vendor discovery** - Match capabilities to needs semantically
- **Document intelligence** - Search contracts and files via OCR
- **Hybrid data approach** - Vector search for unstructured content, traditional queries for structured data

The key insight: **Don't embed everything**. Embed unstructured conversational content where semantic search adds value. Use traditional database queries for structured, filterable data like tasks, expenses, and guest lists.
