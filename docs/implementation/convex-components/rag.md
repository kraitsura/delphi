# Convex RAG Component Integration Guide

## Overview

### What It Does

The Convex RAG (Retrieval-Augmented Generation) component provides semantic search functionality for LLM context retrieval. It enables intelligent content discovery by:

- **Semantic Search**: Find content based on meaning, not just keywords
- **Vector Embeddings**: Automatic text embedding generation using OpenAI models
- **Smart Chunking**: Automatic document splitting into searchable chunks
- **Metadata Filtering**: Filter results by custom indexed fields
- **Hybrid Ranking**: Combine vector similarity with importance scores
- **Content Management**: Add, update, and delete searchable content with deduplication
- **Namespace Isolation**: Organize content by user, event, or context
- **LLM Integration**: Direct integration with Vercel AI SDK for text generation

### Why We Need It

Delphi is an event management platform with growing amounts of unstructured data:

1. **Event Documentation**: Notes, vendor contracts, timelines, and planning documents scattered across events
2. **Vendor Information**: Profiles, reviews, capabilities, and past performance data
3. **Knowledge Accumulation**: Best practices, FAQs, and institutional knowledge that grows with each event
4. **Message History**: Rich conversations that contain valuable context and decisions
5. **Template Library**: Task lists, checklists, and planning templates that need intelligent matching

Without RAG, users must manually search through this content using exact keyword matches, which is:
- **Time-consuming**: Requires remembering exact terms and locations
- **Incomplete**: Misses semantically similar content with different wording
- **Frustrating**: Forces users to sift through irrelevant results
- **Inefficient**: Can't leverage AI to provide intelligent recommendations

RAG solves this by enabling natural language search and AI-powered content discovery.

### Use Cases in Our App

#### 1. **Event Documentation Search**
Enable planners to search across all event documentation using natural language queries. Instead of remembering exact file names or keywords, they can ask "what was the final catering budget?" or "show me vendor contracts from last quarter."

**Impact**: Reduces time spent searching for information from minutes to seconds.

#### 2. **Intelligent Vendor Matching**
Match user requirements with vendor profiles based on semantic similarity. When a planner describes their needs ("outdoor wedding venue with capacity for 200 guests"), RAG finds relevant vendors even if they don't use those exact terms.

**Impact**: Improves vendor discovery and increases booking quality.

#### 3. **AI-Powered FAQ Bot**
Answer common event planning questions by retrieving relevant context from the knowledge base and generating helpful responses. Questions like "what's a typical timeline for wedding planning?" pull from accumulated best practices.

**Impact**: Reduces support burden and helps new users onboard faster.

#### 4. **Semantic Message Search**
Search through event chat history using natural language. Find discussions about "budget concerns" or "venue selection" even when those exact phrases weren't used.

**Impact**: Makes chat history actionable instead of just archival.

#### 5. **Budget Insights and Comparisons**
Query past events for budget patterns and recommendations. "Show me catering costs for similar-sized weddings" or "what was the average vendor spend for corporate events?"

**Impact**: Provides data-driven budgeting recommendations.

#### 6. **Smart Task Template Matching**
Automatically suggest relevant task templates based on event type and requirements. When creating a new corporate event, surface task lists from similar past events.

**Impact**: Accelerates event planning with proven templates.

#### 7. **Vendor Profile Discovery**
Enable natural language search across vendor profiles, portfolios, and descriptions. "Find photographers experienced with outdoor ceremonies" or "caterers who specialize in dietary restrictions."

**Impact**: Improves search relevance and user satisfaction.

---

## Installation Steps

### Step 1: Install the RAG Component Package

```bash
npm install @convex-dev/rag
```

### Step 2: Install AI SDK Dependencies

The RAG component requires the Vercel AI SDK and OpenAI integration:

```bash
npm install ai @ai-sdk/openai openai
```

**Package purposes:**
- `ai`: Vercel AI SDK core for LLM operations
- `@ai-sdk/openai`: OpenAI provider for embeddings and chat
- `openai`: OpenAI API client

### Step 3: Update Convex Configuration

Add the RAG component to your `convex.config.ts`:

```typescript
// web/convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(rag); // Add RAG component

export default app;
```

### Step 4: Set Up Environment Variables

Add your OpenAI API key to environment variables:

```bash
# For development
npx convex env set OPENAI_API_KEY your_openai_api_key_here

# For production
# Set via Convex dashboard: Settings > Environment Variables
```

**Getting an OpenAI API Key:**
1. Sign up at https://platform.openai.com
2. Navigate to API Keys section
3. Create a new secret key
4. Copy and store securely (you won't see it again)

### Step 5: Run Development Server

```bash
npx convex dev
```

This will:
- Register the RAG component with your backend
- Generate TypeScript types in `_generated/`
- Initialize component tables and storage
- Set up the isolated RAG environment

**Verify installation:**
- Check Convex dashboard for `rag` component tables
- Look for component types in `_generated/api.d.ts`
- No errors in console output

---

## Integration Points

The RAG component will be integrated into several key areas of the Delphi platform:

### 1. **Event Documentation Search** (`convex/ai/eventSearch.ts`)
Semantic search across all event-related documents, notes, and files. Enables natural language queries over event content.

### 2. **Vendor Matching System** (`convex/ai/vendorMatcher.ts`)
Intelligent matching of user requirements with vendor profiles. Helps users discover relevant vendors based on capabilities and past performance.

### 3. **FAQ Knowledge Bot** (`convex/ai/faqBot.ts`)
AI-powered assistant that answers event planning questions by retrieving relevant context from the knowledge base.

### 4. **Message Search** (`convex/ai/messageSearch.ts`)
Semantic search across event chat messages and discussions. Find conversations by topic, not just keywords.

### 5. **Knowledge Base Management** (`convex/ai/knowledgeBase.ts`)
Central management for institutional knowledge, best practices, templates, and accumulated wisdom.

### 6. **Vendor Profile Indexing** (`convex/vendors/ragIndexing.ts`)
Background processing to keep vendor profiles indexed and searchable via RAG.

### 7. **Event Content Indexing** (`convex/events/ragIndexing.ts`)
Automatic indexing of event documents and content as they're created or updated.

---

## Code Examples

### Backend Implementation

#### 1. Initialize RAG Component

Create a shared RAG instance with configuration:

```typescript
// convex/ai/ragConfig.ts
import { RAG } from "@convex-dev/rag";
import { components } from "../_generated/api";
import { openai } from "@ai-sdk/openai";

/**
 * Shared RAG instance with OpenAI embeddings
 * Using text-embedding-3-small for cost-efficiency (1536 dimensions)
 */
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

/**
 * Namespace identifiers for content organization
 */
export const getEventNamespace = (eventId: string) =>
  `event:${eventId}` as NamespaceId;

export const getUserNamespace = (userId: string) =>
  `user:${userId}` as NamespaceId;

export const getGlobalNamespace = (category: string) =>
  `global:${category}` as NamespaceId;
```

#### 2. Add Content with Automatic Chunking

Index event documentation with metadata:

```typescript
// convex/ai/eventSearch.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { rag, getEventNamespace } from "./ragConfig";

/**
 * Add or update event document in RAG index
 */
export const addEventDocument = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
    documentType: v.union(
      v.literal("note"),
      v.literal("contract"),
      v.literal("timeline"),
      v.literal("checklist")
    ),
    importance: v.optional(v.number()), // 0-1, default 0.5
  },
  handler: async (ctx, args) => {
    // Check authentication
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Verify event access
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Check permissions
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user.subject)
      )
      .first();

    if (!member) throw new Error("Not authorized for this event");

    // Add to RAG with metadata filtering
    const namespace = getEventNamespace(args.eventId);

    await rag.add(ctx, {
      namespace,
      key: `${args.eventId}-${args.title}`, // Unique key for updates
      title: args.title,
      text: args.content,
      filterValues: {
        documentType: args.documentType,
        eventId: args.eventId,
      },
      importance: args.importance ?? 0.5,
    });

    return { success: true };
  },
});
```

#### 3. Semantic Search with Filtering

Search event content with natural language:

```typescript
// convex/ai/eventSearch.ts
import { query } from "./_generated/server";

/**
 * Search event documentation using natural language
 */
export const searchEventDocuments = query({
  args: {
    eventId: v.id("events"),
    query: v.string(),
    documentTypes: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()), // 0-1 similarity threshold
  },
  handler: async (ctx, args) => {
    // Check authentication
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Verify event access
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user.subject)
      )
      .first();

    if (!member) throw new Error("Not authorized");

    // Build filters
    const filters = [];
    if (args.documentTypes && args.documentTypes.length > 0) {
      filters.push(
        ...args.documentTypes.map((type) => ({
          field: "documentType",
          value: type,
        }))
      );
    }

    // Perform semantic search
    const namespace = getEventNamespace(args.eventId);
    const results = await rag.search(ctx, {
      namespace,
      query: args.query,
      limit: args.limit ?? 5,
      vectorScoreThreshold: args.minScore ?? 0.7, // Good default threshold
      filters: filters.length > 0 ? filters : undefined,
      chunkContext: {
        before: 1, // Include previous chunk for context
        after: 1,  // Include next chunk for context
      },
    });

    // Format results with metadata
    return results.map((result) => ({
      entryId: result.entryId,
      title: result.title,
      text: result.text,
      score: result.vectorScore,
      documentType: result.filterValues?.documentType,
      chunks: result.chunks.map((chunk) => ({
        text: chunk.text,
        score: chunk.vectorScore,
      })),
    }));
  },
});
```

#### 4. Vendor Matching with RAG

Match user requirements to vendor profiles:

```typescript
// convex/ai/vendorMatcher.ts
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Index vendor profile in RAG
 */
export const indexVendorProfile = mutation({
  args: {
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Vendor not found");

    // Combine vendor information into searchable text
    const vendorText = [
      `Name: ${vendor.name}`,
      `Category: ${vendor.category}`,
      `Description: ${vendor.description}`,
      `Services: ${vendor.services.join(", ")}`,
      vendor.specialties ? `Specialties: ${vendor.specialties.join(", ")}` : "",
      vendor.portfolio ? `Portfolio: ${vendor.portfolio}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Add to global vendor namespace
    const namespace = getGlobalNamespace("vendors");

    await rag.add(ctx, {
      namespace,
      key: args.vendorId, // Use vendorId as key for updates
      title: vendor.name,
      text: vendorText,
      filterValues: {
        vendorId: args.vendorId,
        category: vendor.category,
        location: vendor.location,
        priceRange: vendor.priceRange,
      },
      importance: vendor.rating ? vendor.rating / 5 : 0.5, // Use rating as importance
    });

    return { success: true };
  },
});

/**
 * Find vendors matching user requirements
 */
export const findMatchingVendors = query({
  args: {
    requirements: v.string(), // Natural language description
    category: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Build filters based on criteria
    const filters = [];
    if (args.category) {
      filters.push({ field: "category", value: args.category });
    }
    if (args.priceRange) {
      filters.push({ field: "priceRange", value: args.priceRange });
    }
    if (args.location) {
      filters.push({ field: "location", value: args.location });
    }

    // Search vendor namespace
    const namespace = getGlobalNamespace("vendors");
    const results = await rag.search(ctx, {
      namespace,
      query: args.requirements,
      limit: args.limit ?? 10,
      vectorScoreThreshold: 0.6, // Lower threshold for broader matches
      filters: filters.length > 0 ? filters : undefined,
    });

    // Fetch full vendor details
    const vendors = await Promise.all(
      results.map(async (result) => {
        const vendorId = result.filterValues?.vendorId;
        if (!vendorId) return null;

        const vendor = await ctx.db.get(vendorId as any);
        return vendor
          ? {
              ...vendor,
              matchScore: result.vectorScore,
              matchedText: result.chunks[0]?.text,
            }
          : null;
      })
    );

    return vendors.filter((v) => v !== null);
  },
});
```

#### 5. FAQ Bot with LLM Generation

AI-powered FAQ system using RAG + LLM:

```typescript
// convex/ai/faqBot.ts
import { action } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Answer user questions using RAG + LLM
 */
export const askQuestion = action({
  args: {
    question: v.string(),
    eventId: v.optional(v.id("events")), // Optional event context
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Search knowledge base for relevant context
    const namespace = args.eventId
      ? getEventNamespace(args.eventId)
      : getGlobalNamespace("knowledge-base");

    // Use RAG's built-in generateText helper
    const response = await rag.generateText(ctx, {
      namespace,
      query: args.question,
      model: openai.chat("gpt-4o"),
      prompt: `You are an expert event planning assistant for Delphi.

Use the provided context to answer the user's question accurately and helpfully.

Guidelines:
- Be specific and actionable
- Reference best practices when relevant
- If the context doesn't contain enough information, say so
- Keep responses concise but complete
- Use a friendly, professional tone

Question: ${args.question}`,
      options: {
        temperature: 0.7,
        maxTokens: 500,
      },
    });

    return {
      answer: response.text,
      sources: response.sources, // RAG entries used for context
    };
  },
});

/**
 * Add FAQ entry to knowledge base
 */
export const addFAQEntry = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Only admins can add FAQ entries
    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", user.subject))
      .first();

    if (!userDoc?.isAdmin) {
      throw new Error("Only admins can add FAQ entries");
    }

    const namespace = getGlobalNamespace("knowledge-base");
    const faqText = `Question: ${args.question}\n\nAnswer: ${args.answer}`;

    await rag.add(ctx, {
      namespace,
      key: `faq-${args.question}`,
      title: args.question,
      text: faqText,
      filterValues: {
        category: args.category,
        type: "faq",
      },
      importance: 0.8, // FAQs are high importance
    });

    return { success: true };
  },
});
```

#### 6. Message Search

Semantic search across event messages:

```typescript
// convex/ai/messageSearch.ts
import { query, mutation } from "./_generated/server";

/**
 * Index message in RAG (called automatically on message creation)
 */
export const indexMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // Get event context
    const event = await ctx.db.get(message.eventId);
    if (!event) return;

    const namespace = getEventNamespace(message.eventId);

    // Index message content with metadata
    await rag.add(ctx, {
      namespace,
      key: `message-${args.messageId}`,
      title: `Message from ${message.authorName}`,
      text: message.content,
      filterValues: {
        authorId: message.authorId,
        messageId: args.messageId,
        type: "message",
        timestamp: message.timestamp.toString(),
      },
      importance: 0.3, // Messages are lower importance than documents
    });
  },
});

/**
 * Search event messages semantically
 */
export const searchMessages = query({
  args: {
    eventId: v.id("events"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Verify event access
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user.subject)
      )
      .first();

    if (!member) throw new Error("Not authorized");

    const namespace = getEventNamespace(args.eventId);

    // Search only message type
    const results = await rag.search(ctx, {
      namespace,
      query: args.query,
      limit: args.limit ?? 20,
      vectorScoreThreshold: 0.65,
      filters: [{ field: "type", value: "message" }],
    });

    // Fetch full message objects
    const messages = await Promise.all(
      results.map(async (result) => {
        const messageId = result.filterValues?.messageId;
        if (!messageId) return null;

        const message = await ctx.db.get(messageId as any);
        return message
          ? {
              ...message,
              matchScore: result.vectorScore,
            }
          : null;
      })
    );

    return messages.filter((m) => m !== null);
  },
});
```

### Frontend Implementation

#### 1. Custom Search Hook

React hook for semantic search:

```typescript
// web/src/hooks/useSemanticSearch.ts
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface UseSemanticSearchOptions {
  eventId: Id<"events">;
  documentTypes?: string[];
  limit?: number;
  minScore?: number;
  debounceMs?: number;
}

export function useSemanticSearch(options: UseSemanticSearchOptions) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, options.debounceMs ?? 300);

  const results = useQuery(
    api.ai.eventSearch.searchEventDocuments,
    debouncedQuery.length > 0
      ? {
          eventId: options.eventId,
          query: debouncedQuery,
          documentTypes: options.documentTypes,
          limit: options.limit,
          minScore: options.minScore,
        }
      : "skip"
  );

  return {
    query,
    setQuery,
    results: results ?? [],
    isSearching: debouncedQuery !== query, // True while debouncing
    hasResults: results && results.length > 0,
  };
}
```

#### 2. Search UI Component

Complete search interface with results:

```typescript
// web/src/components/events/SemanticSearchDialog.tsx
import { useState } from "react";
import { Search, FileText, FileCheck, Calendar, ClipboardList } from "lucide-react";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SemanticSearchDialogProps {
  eventId: Id<"events">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypeIcons = {
  note: FileText,
  contract: FileCheck,
  timeline: Calendar,
  checklist: ClipboardList,
};

export function SemanticSearchDialog({
  eventId,
  open,
  onOpenChange,
}: SemanticSearchDialogProps) {
  const { query, setQuery, results, isSearching, hasResults } = useSemanticSearch({
    eventId,
    limit: 10,
    minScore: 0.7,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Event Documentation</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ask anything about this event..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Searching...
            </div>
          )}

          {!isSearching && query && !hasResults && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm">Try different keywords or phrases</p>
            </div>
          )}

          {!isSearching && hasResults && (
            <div className="space-y-4">
              {results.map((result) => {
                const Icon = documentTypeIcons[result.documentType as keyof typeof documentTypeIcons] || FileText;

                return (
                  <div
                    key={result.entryId}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{result.title}</h3>
                      </div>
                      <Badge variant="secondary">
                        {Math.round(result.score * 100)}% match
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {result.chunks.map((chunk, idx) => (
                        <p
                          key={idx}
                          className="text-sm text-muted-foreground line-clamp-3"
                        >
                          {chunk.text}
                        </p>
                      ))}
                    </div>

                    {result.documentType && (
                      <Badge variant="outline" className="mt-2">
                        {result.documentType}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!query && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mb-2 opacity-50" />
              <p>Start typing to search event documentation</p>
              <p className="text-sm">Try: "vendor contracts", "budget details", "timeline"</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. FAQ Bot Component

AI-powered question answering:

```typescript
// web/src/components/ai/FAQBot.tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface FAQBotProps {
  eventId?: Id<"events">;
}

export function FAQBot({ eventId }: FAQBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const askQuestion = useMutation(api.ai.faqBot.askQuestion);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askQuestion({
        question: input,
        eventId,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        sources: response.sources?.map((s: any) => s.title),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Event Planning Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
              <p>Ask me anything about event planning!</p>
              <p className="text-sm">Try: "What's a typical wedding timeline?"</p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 bg-primary">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs opacity-70 mb-1">Sources:</p>
                      {message.sources.map((source, i) => (
                        <p key={i} className="text-xs opacity-70">• {source}</p>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 bg-secondary">
                    <span className="text-xs">You</span>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

#### 4. Vendor Search Component

Semantic vendor discovery:

```typescript
// web/src/components/vendors/VendorSemanticSearch.tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, Star, MapPin, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VendorSemanticSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [priceRange, setPriceRange] = useState<string | undefined>();

  const vendors = useQuery(
    api.ai.vendorMatcher.findMatchingVendors,
    query.length > 0
      ? {
          requirements: query,
          category,
          priceRange,
          limit: 15,
        }
      : "skip"
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Describe what you're looking for..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setQuery("")}>
          Clear
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        {vendors && vendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <Card key={vendor._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{vendor.name}</h3>
                    <Badge variant="secondary">
                      {Math.round((vendor.matchScore ?? 0) * 100)}%
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{vendor.rating?.toFixed(1) ?? "N/A"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{vendor.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{vendor.priceRange}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm line-clamp-2">{vendor.matchedText}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="outline">{vendor.category}</Badge>
                    {vendor.services?.slice(0, 2).map((service: string) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : query ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No vendors found matching your requirements</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Enter a description to find matching vendors</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

---

## Configuration

### Environment Variables

#### Required Variables

```bash
# OpenAI API Key (required for embeddings and LLM)
OPENAI_API_KEY=sk-...
```

#### Optional Variables

```bash
# Custom embedding model (default: text-embedding-3-small)
RAG_EMBEDDING_MODEL=text-embedding-3-large

# Custom embedding dimension (default: 1536)
RAG_EMBEDDING_DIMENSION=3072

# Default similarity threshold (default: 0.7)
RAG_DEFAULT_THRESHOLD=0.75

# Maximum chunks per search (default: 5)
RAG_MAX_RESULTS=10
```

### Embedding Model Selection

The RAG component supports different OpenAI embedding models:

| Model | Dimensions | Cost (per 1M tokens) | Use Case |
|-------|------------|----------------------|----------|
| text-embedding-3-small | 1536 | $0.02 | Cost-effective, good quality (recommended) |
| text-embedding-3-large | 3072 | $0.13 | Higher quality, more expensive |
| text-embedding-ada-002 | 1536 | $0.10 | Legacy model |

**Recommendation**: Use `text-embedding-3-small` for production. It offers the best balance of cost and quality.

```typescript
// Cost-effective configuration (recommended)
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Higher quality configuration (if budget allows)
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-large"),
  embeddingDimension: 3072,
});
```

### Chunking Configuration

RAG automatically chunks large documents. You can customize chunking behavior:

```typescript
import { defaultChunker } from "@convex-dev/rag";

// Default chunking (100-1000 characters per chunk)
const chunks = defaultChunker(longText);

// Custom chunking with options
const customChunks = defaultChunker(longText, {
  minChunkSize: 200,
  maxChunkSize: 800,
  overlap: 50, // Character overlap between chunks
});

// Use custom chunks with RAG
await rag.add(ctx, {
  namespace,
  key: documentId,
  title: "Document Title",
  chunks: customChunks, // Provide pre-split chunks
});
```

### Search Parameters

Fine-tune search behavior:

```typescript
const results = await rag.search(ctx, {
  namespace,
  query: userQuery,

  // Maximum results to return (default: 5)
  limit: 10,

  // Minimum similarity score, 0-1 (default: 0.7)
  // Higher = more strict matching
  vectorScoreThreshold: 0.75,

  // Include surrounding chunks for context
  chunkContext: {
    before: 1, // Include 1 chunk before
    after: 1,  // Include 1 chunk after
  },

  // Filter by metadata (OR'd together)
  filters: [
    { field: "category", value: "catering" },
    { field: "category", value: "venue" },
  ],
});
```

**Threshold Guidelines:**
- **0.5-0.6**: Very broad matches, may include loosely related content
- **0.7**: Good default balance (recommended)
- **0.8-0.9**: Strict matching, high relevance
- **0.9+**: Nearly exact semantic matches only

---

## Best Practices

### 1. Use Namespace Strategy Consistently

**Pattern**: Organize content with clear namespace hierarchies.

```typescript
// ✅ GOOD: Clear namespace organization
const eventDocs = `event:${eventId}` as NamespaceId;
const userNotes = `user:${userId}:notes` as NamespaceId;
const globalKB = `global:knowledge-base` as NamespaceId;
const vendorProfiles = `global:vendors` as NamespaceId;

// ❌ BAD: Inconsistent or unclear namespaces
const namespace1 = "docs" as NamespaceId;
const namespace2 = "myevent123" as NamespaceId;
```

**Benefits:**
- Clear content isolation
- Easy to manage and debug
- Scales well with app growth
- Prevents accidental cross-contamination

### 2. Choose Chunking Strategy Based on Content Type

**Pattern**: Use appropriate chunk sizes for different content types.

```typescript
// ✅ GOOD: Content-appropriate chunking
// Short, focused content (messages, titles)
await rag.add(ctx, {
  namespace,
  title: message.content,
  text: message.content, // Don't chunk - already small
});

// Long documents (articles, contracts)
const chunks = defaultChunker(longDocument, {
  minChunkSize: 300,
  maxChunkSize: 1000,
  overlap: 50,
});

// ❌ BAD: One-size-fits-all approach
const chunks = defaultChunker(content); // Always using defaults
```

**Guidelines:**
- **Messages/Titles**: Don't chunk (< 100 chars)
- **Short docs (< 1000 chars)**: Chunk into 200-400 char pieces
- **Long docs (> 1000 chars)**: Chunk into 500-1000 char pieces
- **Technical docs**: Smaller chunks (200-500) for precision
- **Narrative content**: Larger chunks (700-1000) for context

### 3. Select Appropriate Embedding Models

**Pattern**: Choose embedding model based on requirements.

```typescript
// ✅ GOOD: Cost-effective for most use cases
const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// ✅ GOOD: Higher quality when accuracy is critical
const ragPremium = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-large"),
  embeddingDimension: 3072,
});

// ❌ BAD: Using expensive model unnecessarily
const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-large"), // 6.5x more expensive!
});
```

**Decision Matrix:**
- **Default choice**: text-embedding-3-small (good quality, low cost)
- **High-value content**: text-embedding-3-large (legal docs, critical searches)
- **High-volume indexing**: text-embedding-3-small (minimize costs)

### 4. Optimize Search with Proper Thresholds

**Pattern**: Use appropriate similarity thresholds for different use cases.

```typescript
// ✅ GOOD: Context-appropriate thresholds
// Broad discovery (vendor search)
const vendors = await rag.search(ctx, {
  namespace,
  query: userRequirements,
  vectorScoreThreshold: 0.6, // Broader matches
});

// Precise matching (document search)
const docs = await rag.search(ctx, {
  namespace,
  query: specificQuery,
  vectorScoreThreshold: 0.75, // More precise
});

// FAQ answers (need high confidence)
const faqs = await rag.search(ctx, {
  namespace,
  query: userQuestion,
  vectorScoreThreshold: 0.8, // High confidence only
});

// ❌ BAD: Using same threshold everywhere
const results = await rag.search(ctx, {
  query,
  vectorScoreThreshold: 0.7, // Always the same
});
```

### 5. Implement Smart Content Management

**Pattern**: Use keys for content updates and proper lifecycle management.

```typescript
// ✅ GOOD: Use keys for updates
await rag.add(ctx, {
  namespace,
  key: `vendor-${vendorId}`, // Unique key for updates
  title: vendor.name,
  text: vendorContent,
});

// Later: Update the same entry
await rag.add(ctx, {
  namespace,
  key: `vendor-${vendorId}`, // Same key = update
  title: vendor.name,
  text: updatedContent, // New content replaces old
});

// ✅ GOOD: Delete when content is removed
await rag.delete(ctx, entryId);

// ❌ BAD: Creating duplicates
await rag.add(ctx, {
  namespace,
  // No key = new entry every time
  title: vendor.name,
  text: vendorContent,
});
```

**Best practices:**
- Always use `key` for updatable content
- Use consistent key format (e.g., `${type}-${id}`)
- Delete entries when source data is deleted
- Use `importance` to boost high-value content

### 6. Leverage Metadata Filtering

**Pattern**: Index relevant metadata for efficient filtering.

```typescript
// ✅ GOOD: Useful metadata for filtering
await rag.add(ctx, {
  namespace,
  title: doc.title,
  text: doc.content,
  filterValues: {
    documentType: doc.type,
    category: doc.category,
    authorId: doc.authorId,
    eventId: doc.eventId,
    dateCreated: doc.created.toString(),
  },
});

// Then filter efficiently
const results = await rag.search(ctx, {
  namespace,
  query,
  filters: [
    { field: "documentType", value: "contract" },
    { field: "category", value: "catering" },
  ],
});

// ❌ BAD: No metadata (can't filter)
await rag.add(ctx, {
  namespace,
  title: doc.title,
  text: doc.content,
  // No filterValues = can't filter by attributes
});
```

**Metadata guidelines:**
- Index fields you'll filter by
- Keep values simple (strings/numbers)
- Avoid deeply nested structures
- Common fields: type, category, author, date, status

### 7. Use Importance Scoring Strategically

**Pattern**: Weight content based on value and relevance.

```typescript
// ✅ GOOD: Strategic importance scoring
// High-value FAQ entries
await rag.add(ctx, {
  namespace,
  text: faqContent,
  importance: 0.9, // Boost FAQs in results
});

// User-generated notes (lower priority)
await rag.add(ctx, {
  namespace,
  text: userNote,
  importance: 0.3, // De-emphasize in results
});

// Vendor profiles (importance = rating)
await rag.add(ctx, {
  namespace,
  text: vendorProfile,
  importance: vendor.rating / 5, // 0-1 based on rating
});

// ❌ BAD: Same importance for everything
await rag.add(ctx, {
  namespace,
  text: content,
  importance: 0.5, // Always the same
});
```

**Importance scale:**
- **0.9-1.0**: Critical content (FAQs, official docs)
- **0.7-0.8**: High-value content (verified vendors, templates)
- **0.4-0.6**: Standard content (documents, notes)
- **0.2-0.3**: Low-priority content (messages, drafts)

### 8. Combine RAG with Rate Limiting

**Pattern**: Protect against abuse with rate limiting.

```typescript
// ✅ GOOD: Rate limit expensive operations
export const searchDocuments = query({
  handler: async (ctx, args) => {
    // Rate limit searches per user
    await ctx.runMutation(api.rateLimiter.check, {
      key: `search:${ctx.auth.userId}`,
      limit: 30, // 30 searches
      window: 60000, // per minute
    });

    return await rag.search(ctx, {
      namespace: args.namespace,
      query: args.query,
    });
  },
});

// Rate limit content additions
export const addDocument = mutation({
  handler: async (ctx, args) => {
    await ctx.runMutation(api.rateLimiter.check, {
      key: `add-doc:${ctx.auth.userId}`,
      limit: 100, // 100 documents
      window: 3600000, // per hour
    });

    await rag.add(ctx, { ...args });
  },
});
```

### 9. Monitor Costs and Usage

**Pattern**: Track OpenAI API usage and optimize accordingly.

```typescript
// ✅ GOOD: Log embedding operations for monitoring
export const addContent = mutation({
  handler: async (ctx, args) => {
    const startTime = Date.now();

    await rag.add(ctx, {
      namespace: args.namespace,
      text: args.text,
    });

    const duration = Date.now() - startTime;
    const tokenEstimate = args.text.length / 4; // Rough estimate

    // Log for monitoring
    console.log(`RAG add: ${tokenEstimate} tokens, ${duration}ms`);

    // Store metrics for dashboard
    await ctx.db.insert("ragMetrics", {
      operation: "add",
      tokens: tokenEstimate,
      duration,
      timestamp: Date.now(),
    });
  },
});
```

**Cost monitoring tips:**
- Log all embedding operations
- Track tokens processed per user/event
- Set up alerts for unusual usage
- Review monthly OpenAI bills
- Consider caching for repeated queries

### 10. Use Async Processing for Large Files

**Pattern**: Process large files asynchronously to avoid timeouts.

```typescript
// ✅ GOOD: Async processing for large files
export const uploadLargeDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    const namespace = getUserNamespace(user.subject);

    // Process asynchronously
    await rag.addAsync(ctx, {
      namespace,
      key: args.storageId,
      title: args.title,
      storageId: args.storageId,
    });

    // Returns immediately, processing happens in background
    return { success: true, status: "processing" };
  },
});

// Check processing status
export const getDocumentStatus = query({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    // List entries to check status
    const entries = await rag.list(ctx, {
      namespace: args.namespace,
      status: "pending", // Check if still processing
    });

    return entries.find((e) => e._id === args.entryId);
  },
});
```

---

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)

**Goals:**
- Install and configure RAG component
- Set up shared RAG instance and configuration
- Create namespace utilities
- Establish monitoring

**Tasks:**
1. Install packages: `@convex-dev/rag`, `ai`, `@ai-sdk/openai`, `openai`
2. Update `convex.config.ts` with RAG component
3. Set up `OPENAI_API_KEY` environment variable
4. Create `convex/ai/ragConfig.ts` with shared configuration
5. Create namespace helper functions
6. Set up cost monitoring and logging
7. Run `npx convex dev` to deploy

**Deliverables:**
- [ ] RAG component installed and configured
- [ ] Environment variables set
- [ ] Shared configuration file created
- [ ] Namespace utilities implemented
- [ ] Monitoring dashboard (basic)

**Validation:**
- RAG component appears in Convex dashboard
- No errors in `npx convex dev` output
- Can access `components.rag` in functions

---

### Phase 2: Knowledge Base Indexing (Week 2)

**Goals:**
- Index global knowledge base content
- Create FAQ management system
- Set up vendor profile indexing
- Implement content management utilities

**Tasks:**
1. Create `convex/ai/knowledgeBase.ts` with CRUD operations
2. Implement `addFAQEntry` mutation with admin checks
3. Create `convex/ai/vendorMatcher.ts` with vendor indexing
4. Build background job to index existing vendors
5. Create admin UI for managing knowledge base
6. Add rate limiting for content operations
7. Test with sample FAQs and vendor profiles

**Deliverables:**
- [ ] Knowledge base management system
- [ ] Vendor profile indexing working
- [ ] Admin UI for content management
- [ ] Rate limiting implemented
- [ ] Sample content indexed

**Validation:**
- Can add/update/delete FAQ entries
- Vendors are indexed correctly
- Admin UI is functional
- Rate limiting prevents abuse

---

### Phase 3: Search Integration (Week 3)

**Goals:**
- Implement semantic search across event documents
- Create message search functionality
- Build search UI components
- Integrate with existing features

**Tasks:**
1. Create `convex/ai/eventSearch.ts` with document indexing
2. Implement `searchEventDocuments` query with filtering
3. Create `convex/ai/messageSearch.ts` for chat search
4. Build `SemanticSearchDialog` component
5. Add search triggers to existing document creation flows
6. Create custom `useSemanticSearch` hook
7. Add search shortcuts to event pages
8. Implement search result highlighting

**Deliverables:**
- [ ] Event document search working
- [ ] Message search implemented
- [ ] Search UI components complete
- [ ] Integration with event pages
- [ ] Custom hooks for search

**Validation:**
- Can search event documents by natural language
- Message search returns relevant results
- Search UI is responsive and intuitive
- Results show proper highlighting and context

---

### Phase 4: AI Agent Integration (Week 4)

**Goals:**
- Build FAQ bot with RAG + LLM
- Integrate vendor matching with AI recommendations
- Create budget insights using RAG
- Implement smart template suggestions

**Tasks:**
1. Create `convex/ai/faqBot.ts` with LLM integration
2. Build `FAQBot` React component
3. Enhance vendor search with AI explanations
4. Create budget insights query using past events
5. Implement template matching based on requirements
6. Add AI assistance to event creation flow
7. Create feedback mechanism for AI responses
8. Test and refine prompts

**Deliverables:**
- [ ] FAQ bot fully functional
- [ ] AI-powered vendor recommendations
- [ ] Budget insights feature
- [ ] Template suggestions working
- [ ] Feedback system implemented

**Validation:**
- FAQ bot provides accurate, helpful answers
- Vendor recommendations are relevant
- Budget insights use real data
- Template suggestions match requirements
- Users can provide feedback on AI responses

---

### Phase 5: Polish & Optimization (Week 5)

**Goals:**
- Optimize search performance
- Refine chunking strategies
- Improve result relevance
- Add analytics and monitoring
- Complete documentation

**Tasks:**
1. Analyze search performance and optimize thresholds
2. Refine chunking for different content types
3. Implement result caching where appropriate
4. Add comprehensive analytics dashboard
5. Set up cost monitoring and alerts
6. Create user documentation and help guides
7. Conduct user testing and gather feedback
8. Fix bugs and refine UX

**Deliverables:**
- [ ] Performance optimizations complete
- [ ] Result relevance improved
- [ ] Analytics dashboard live
- [ ] Cost monitoring active
- [ ] User documentation finished
- [ ] Bug fixes completed

**Validation:**
- Search returns results in < 500ms
- Result relevance scores > 0.7 on average
- Analytics show adoption metrics
- Costs are within budget
- Users report satisfaction with features

---

## Testing Strategy

### Unit Tests

Test RAG component integration in isolation:

```typescript
// convex/ai/eventSearch.test.ts
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("addEventDocument indexes content correctly", async () => {
  const t = convexTest(schema);

  // Create test event and user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test-user",
      email: "test@example.com",
      name: "Test User",
    });
  });

  const eventId = await t.run(async (ctx) => {
    return await ctx.db.insert("events", {
      name: "Test Event",
      ownerId: userId,
      date: Date.now(),
    });
  });

  // Add event member
  await t.run(async (ctx) => {
    await ctx.db.insert("eventMembers", {
      eventId,
      userId,
      role: "owner",
    });
  });

  // Test document indexing
  const result = await t.mutation(api.ai.eventSearch.addEventDocument, {
    eventId,
    title: "Vendor Contract",
    content: "This is a catering contract for 100 guests...",
    documentType: "contract",
    importance: 0.8,
  });

  expect(result.success).toBe(true);
});

test("searchEventDocuments returns relevant results", async () => {
  const t = convexTest(schema);

  // Setup test data...

  // Perform search
  const results = await t.query(api.ai.eventSearch.searchEventDocuments, {
    eventId,
    query: "catering for guests",
    limit: 5,
    minScore: 0.6,
  });

  expect(results.length).toBeGreaterThan(0);
  expect(results[0].score).toBeGreaterThanOrEqual(0.6);
  expect(results[0].documentType).toBe("contract");
});
```

### Integration Tests

Test RAG with real data flows:

```typescript
// Integration test scenarios
describe("RAG Integration", () => {
  test("Document lifecycle: add, search, update, delete", async () => {
    // 1. Add document
    const addResult = await addEventDocument({
      eventId,
      title: "Budget Planning",
      content: "Initial budget is $5000...",
      documentType: "note",
    });

    // 2. Search for it
    const searchResults = await searchEventDocuments({
      eventId,
      query: "budget",
    });
    expect(searchResults).toContainEqual(
      expect.objectContaining({ title: "Budget Planning" })
    );

    // 3. Update content (same key)
    await addEventDocument({
      eventId,
      title: "Budget Planning",
      content: "Updated budget is $7000...",
      documentType: "note",
    });

    // 4. Search again - should find updated version
    const updatedResults = await searchEventDocuments({
      eventId,
      query: "budget 7000",
    });
    expect(updatedResults[0].text).toContain("7000");

    // 5. Delete document
    await deleteEventDocument({ entryId: addResult.entryId });

    // 6. Search again - should not find it
    const finalResults = await searchEventDocuments({
      eventId,
      query: "budget",
    });
    expect(finalResults).not.toContainEqual(
      expect.objectContaining({ title: "Budget Planning" })
    );
  });

  test("Multi-namespace isolation", async () => {
    const event1Id = "event1";
    const event2Id = "event2";

    // Add docs to different events
    await addEventDocument({
      eventId: event1Id,
      title: "Event 1 Doc",
      content: "Specific to event 1",
      documentType: "note",
    });

    await addEventDocument({
      eventId: event2Id,
      title: "Event 2 Doc",
      content: "Specific to event 2",
      documentType: "note",
    });

    // Search event 1 - should only find event 1 docs
    const event1Results = await searchEventDocuments({
      eventId: event1Id,
      query: "specific event",
    });
    expect(event1Results).toHaveLength(1);
    expect(event1Results[0].title).toBe("Event 1 Doc");

    // Search event 2 - should only find event 2 docs
    const event2Results = await searchEventDocuments({
      eventId: event2Id,
      query: "specific event",
    });
    expect(event2Results).toHaveLength(1);
    expect(event2Results[0].title).toBe("Event 2 Doc");
  });
});
```

### Manual Testing Checklist

#### Search Functionality
- [ ] Search returns relevant results for natural language queries
- [ ] Search respects namespace boundaries (event isolation)
- [ ] Filtering by document type works correctly
- [ ] Similarity threshold affects result quality appropriately
- [ ] Search handles typos and variations gracefully
- [ ] Empty queries don't trigger searches
- [ ] Search results show proper context chunks
- [ ] Search performance is acceptable (< 500ms)

#### Content Management
- [ ] Adding documents indexes them correctly
- [ ] Updating documents (same key) replaces old content
- [ ] Deleting documents removes them from search
- [ ] Large documents are chunked appropriately
- [ ] Async processing works for large files
- [ ] Metadata filtering works as expected
- [ ] Importance scoring affects result ranking

#### Vendor Matching
- [ ] Vendor profiles are indexed with correct metadata
- [ ] Natural language requirements match relevant vendors
- [ ] Match scores are reasonable (0.6-1.0 range)
- [ ] Filtering by category/price/location works
- [ ] Vendor updates are reflected in search results

#### FAQ Bot
- [ ] Bot provides accurate answers to common questions
- [ ] Bot cites sources from knowledge base
- [ ] Bot handles questions without context gracefully
- [ ] Response quality is acceptable
- [ ] Response time is reasonable (< 3s)
- [ ] Conversation history works properly

#### UI/UX
- [ ] Search dialog is easy to use
- [ ] Results display clearly with highlighting
- [ ] Loading states are shown during searches
- [ ] Error states are handled gracefully
- [ ] Search shortcuts work (keyboard navigation)
- [ ] Mobile layout is responsive

#### Security & Permissions
- [ ] Users can only search their accessible events
- [ ] Namespace isolation prevents data leakage
- [ ] Admin-only operations are protected
- [ ] Rate limiting prevents abuse
- [ ] Unauthenticated requests are rejected

#### Performance
- [ ] Searches complete in < 500ms
- [ ] Indexing doesn't block UI
- [ ] Large document uploads don't timeout
- [ ] Memory usage is reasonable
- [ ] OpenAI API calls are optimized

### Performance Testing

Monitor and optimize RAG performance:

```typescript
// Performance monitoring
export const performanceTest = query({
  handler: async (ctx) => {
    const tests = [];

    // Test 1: Search latency
    const searchStart = Date.now();
    await rag.search(ctx, {
      namespace: testNamespace,
      query: "test query",
      limit: 5,
    });
    tests.push({
      test: "search-latency",
      duration: Date.now() - searchStart,
      target: "< 500ms",
    });

    // Test 2: Indexing latency
    const indexStart = Date.now();
    await rag.add(ctx, {
      namespace: testNamespace,
      title: "Test Doc",
      text: "Test content...",
    });
    tests.push({
      test: "index-latency",
      duration: Date.now() - indexStart,
      target: "< 1000ms",
    });

    // Test 3: Large document processing
    const largeText = "Long content...".repeat(1000);
    const largeStart = Date.now();
    await rag.add(ctx, {
      namespace: testNamespace,
      title: "Large Doc",
      text: largeText,
    });
    tests.push({
      test: "large-doc-latency",
      duration: Date.now() - largeStart,
      target: "< 3000ms",
    });

    return tests;
  },
});
```

**Performance Targets:**
- Search queries: < 500ms
- Document indexing (< 1000 chars): < 1s
- Large document indexing (> 5000 chars): < 3s
- FAQ bot responses: < 3s
- Vendor matching: < 1s

---

## Security Considerations

### 1. Namespace Isolation

**Requirement**: Prevent users from accessing content outside their permissions.

```typescript
// ✅ SECURE: Verify event access before search
export const searchEventDocuments = query({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Verify user has access to this event
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user.subject)
      )
      .first();

    if (!member) {
      throw new Error("Not authorized for this event");
    }

    // Safe to search event namespace
    const namespace = getEventNamespace(args.eventId);
    return await rag.search(ctx, { namespace, query: args.query });
  },
});

// ❌ INSECURE: No authorization check
export const searchEventDocuments = query({
  handler: async (ctx, args) => {
    // Anyone can search any event!
    const namespace = getEventNamespace(args.eventId);
    return await rag.search(ctx, { namespace, query: args.query });
  },
});
```

**Best practices:**
- Always verify user permissions before accessing namespaces
- Use event/user-scoped namespaces, not global
- Check both authentication and authorization
- Log unauthorized access attempts

### 2. Content Permissions

**Requirement**: Only authorized users can add/modify/delete content.

```typescript
// ✅ SECURE: Permission checks for content operations
export const addEventDocument = mutation({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Get user's role in event
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user.subject)
      )
      .first();

    // Check permissions based on role
    if (!member || !["owner", "editor"].includes(member.role)) {
      throw new Error("Not authorized to add documents");
    }

    await rag.add(ctx, { ...args });
  },
});

// Delete should verify ownership
export const deleteDocument = mutation({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Fetch entry to check ownership
    const entries = await rag.list(ctx, {
      namespace: args.namespace,
    });
    const entry = entries.find((e) => e._id === args.entryId);

    if (!entry || entry.filterValues?.authorId !== user.subject) {
      // Only author or event owner can delete
      const member = await ctx.db
        .query("eventMembers")
        .withIndex("by_event_and_user", (q) =>
          q.eq("eventId", args.eventId).eq("userId", user.subject)
        )
        .first();

      if (!member || member.role !== "owner") {
        throw new Error("Not authorized to delete this document");
      }
    }

    await rag.delete(ctx, args.entryId);
  },
});
```

### 3. Rate Limiting

**Requirement**: Prevent abuse of expensive RAG operations.

```typescript
// ✅ SECURE: Rate limit all RAG operations
import { api } from "./_generated/api";

export const searchDocuments = query({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Rate limit searches per user
    await ctx.runMutation(api.rateLimiter.check, {
      key: `rag-search:${user.subject}`,
      limit: 30, // 30 searches per minute
      window: 60000,
    });

    return await rag.search(ctx, { ...args });
  },
});

export const addDocument = mutation({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Rate limit document additions
    await ctx.runMutation(api.rateLimiter.check, {
      key: `rag-add:${user.subject}`,
      limit: 50, // 50 documents per hour
      window: 3600000,
    });

    await rag.add(ctx, { ...args });
  },
});

export const askFAQ = action({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    // Rate limit LLM calls (expensive)
    await ctx.runMutation(api.rateLimiter.check, {
      key: `rag-llm:${user.subject}`,
      limit: 20, // 20 LLM calls per hour
      window: 3600000,
    });

    return await rag.generateText(ctx, { ...args });
  },
});
```

**Recommended limits:**
- Searches: 30-50 per minute per user
- Document additions: 50-100 per hour per user
- LLM calls: 10-20 per hour per user
- Bulk operations: 5-10 per hour per user

### 4. Data Privacy

**Requirement**: Handle sensitive data appropriately.

```typescript
// ✅ GOOD: Sanitize sensitive data before indexing
export const indexVendorContract = mutation({
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");

    // Remove sensitive information
    const sanitizedContent = removeSensitiveInfo(contract.content, {
      removeSSN: true,
      removeCreditCards: true,
      removePasswords: true,
    });

    await rag.add(ctx, {
      namespace: getEventNamespace(contract.eventId),
      title: contract.title,
      text: sanitizedContent, // Sanitized!
      filterValues: {
        contractId: args.contractId,
        type: "contract",
      },
    });
  },
});

// ❌ BAD: Indexing sensitive data directly
await rag.add(ctx, {
  namespace,
  text: `User password: ${user.password}, SSN: ${user.ssn}`, // DON'T!
});
```

**Data privacy guidelines:**
- Never index passwords, API keys, or secrets
- Sanitize personal information (SSN, credit cards)
- Consider GDPR/privacy laws for user data
- Implement "right to be forgotten" (delete user namespace)
- Encrypt sensitive content before indexing (if needed)

### 5. Query Sanitization

**Requirement**: Prevent injection attacks and malicious queries.

```typescript
// ✅ SECURE: Validate and sanitize user input
export const searchDocuments = query({
  args: {
    query: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    // Validate query length
    if (args.query.length > 1000) {
      throw new Error("Query too long");
    }

    // Sanitize query (remove potentially harmful characters)
    const sanitizedQuery = args.query
      .replace(/[<>]/g, "") // Remove HTML chars
      .trim();

    if (sanitizedQuery.length < 2) {
      throw new Error("Query too short");
    }

    // Safe to search
    return await rag.search(ctx, {
      namespace: args.namespace,
      query: sanitizedQuery,
    });
  },
});

// ❌ INSECURE: No input validation
export const searchDocuments = query({
  handler: async (ctx, args) => {
    // User input used directly
    return await rag.search(ctx, {
      namespace: args.namespace,
      query: args.query, // Could be malicious!
    });
  },
});
```

**Input validation rules:**
- Maximum query length: 1000 characters
- Minimum query length: 2 characters
- Remove HTML/script tags
- Validate namespace format
- Limit filter array sizes

---

## Cost Optimization

### Understanding RAG Costs

RAG operations incur costs primarily through OpenAI API calls:

#### Embedding Costs (Indexing)

| Model | Dimensions | Cost per 1M tokens | Example |
|-------|------------|-------------------|---------|
| text-embedding-3-small | 1536 | $0.02 | 1000 docs (500 words each) ≈ $0.10 |
| text-embedding-3-large | 3072 | $0.13 | 1000 docs (500 words each) ≈ $0.65 |

**Token estimation**: 1 token ≈ 4 characters ≈ 0.75 words

#### LLM Costs (Generation)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | FAQ Answer |
|-------|----------------------|----------------------|------------|
| gpt-4o | $2.50 | $10.00 | ~$0.001 |
| gpt-4o-mini | $0.15 | $0.60 | ~$0.0001 |
| gpt-3.5-turbo | $0.50 | $1.50 | ~$0.0003 |

### Optimization Strategies

#### 1. Choose Cost-Effective Embedding Model

```typescript
// ✅ COST-EFFECTIVE: Use text-embedding-3-small
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});
// Cost: $0.02 per 1M tokens

// ❌ EXPENSIVE: text-embedding-3-large (6.5x more expensive)
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-large"),
  embeddingDimension: 3072,
});
// Cost: $0.13 per 1M tokens
```

**Savings**: Using `text-embedding-3-small` saves 85% on embedding costs with minimal quality loss.

#### 2. Optimize Chunking to Reduce Embeddings

```typescript
// ✅ EFFICIENT: Larger chunks = fewer embeddings
const chunks = defaultChunker(content, {
  minChunkSize: 500,
  maxChunkSize: 1000, // Larger chunks
});
// 10,000 char doc = ~12 chunks = 12 embeddings

// ❌ EXPENSIVE: Too many small chunks
const chunks = defaultChunker(content, {
  minChunkSize: 50,
  maxChunkSize: 200, // Tiny chunks
});
// 10,000 char doc = ~60 chunks = 60 embeddings (5x more expensive!)
```

**Savings**: Optimal chunk sizes reduce embedding calls by 3-5x.

#### 3. Use Cheaper LLM Models for FAQ

```typescript
// ✅ COST-EFFECTIVE: gpt-4o-mini for most queries
const response = await rag.generateText(ctx, {
  namespace,
  query: args.question,
  model: openai.chat("gpt-4o-mini"), // 17x cheaper than gpt-4o
  prompt: systemPrompt,
});

// ⚠️ EXPENSIVE: Reserve gpt-4o for complex questions only
if (args.isComplexQuery) {
  const response = await rag.generateText(ctx, {
    namespace,
    query: args.question,
    model: openai.chat("gpt-4o"),
    prompt: systemPrompt,
  });
}
```

**Savings**: Using `gpt-4o-mini` saves ~90% on LLM costs with good quality.

#### 4. Implement Result Caching

```typescript
// ✅ EFFICIENT: Cache search results
const cacheKey = `search:${namespace}:${queryHash}`;

// Check cache first
const cached = await ctx.db
  .query("ragCache")
  .withIndex("by_key", (q) => q.eq("key", cacheKey))
  .first();

if (cached && Date.now() - cached.timestamp < 3600000) {
  // Use cached results if < 1 hour old
  return cached.results;
}

// Perform search and cache
const results = await rag.search(ctx, { namespace, query });

await ctx.db.insert("ragCache", {
  key: cacheKey,
  results,
  timestamp: Date.now(),
});

return results;
```

**Savings**: Caching can reduce RAG calls by 50-70% for repeated queries.

#### 5. Batch Content Indexing

```typescript
// ✅ EFFICIENT: Batch index multiple docs in one operation
export const batchIndexDocuments = mutation({
  handler: async (ctx, args) => {
    // Combine all docs into one text with delimiters
    const combinedText = args.documents
      .map((doc) => `[DOC:${doc.title}]\n${doc.content}`)
      .join("\n\n---\n\n");

    // Single embedding call for all documents
    await rag.add(ctx, {
      namespace: args.namespace,
      title: "Batch Upload",
      text: combinedText,
    });
  },
});

// ❌ EXPENSIVE: Individual embeddings for each doc
for (const doc of documents) {
  await rag.add(ctx, {
    namespace,
    title: doc.title,
    text: doc.content, // Separate embedding call each time
  });
}
```

**Savings**: Batching can reduce embedding API calls by 10-50x.

#### 6. Avoid Re-indexing Unchanged Content

```typescript
// ✅ EFFICIENT: Track content hashes to avoid re-indexing
import { contentHashFromArrayBuffer } from "@convex-dev/rag";

export const updateDocument = mutation({
  handler: async (ctx, args) => {
    const newHash = contentHashFromArrayBuffer(
      new TextEncoder().encode(args.content)
    );

    // Check if content actually changed
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_id", (q) => q.eq("_id", args.documentId))
      .first();

    if (existing?.contentHash === newHash) {
      // Content unchanged, skip re-indexing
      return { indexed: false, reason: "unchanged" };
    }

    // Content changed, re-index
    await rag.add(ctx, {
      namespace: args.namespace,
      key: args.documentId,
      text: args.content,
    });

    // Update hash
    await ctx.db.patch(args.documentId, { contentHash: newHash });

    return { indexed: true };
  },
});
```

**Savings**: Prevents duplicate indexing, saving 20-30% on embedding costs.

### Monthly Cost Estimates

**Example: Delphi with 1000 active users**

| Operation | Volume | Model | Monthly Cost |
|-----------|--------|-------|--------------|
| Vendor indexing (500 vendors) | 250K tokens | text-embedding-3-small | $0.005 |
| Event docs (10K documents) | 5M tokens | text-embedding-3-small | $0.10 |
| Message indexing (100K messages) | 10M tokens | text-embedding-3-small | $0.20 |
| Search queries (50K/month) | — | Included in Convex | $0 |
| FAQ bot (5K questions) | 10M input + 2M output | gpt-4o-mini | $2.70 |
| **Total** | | | **~$3/month** |

**With optimizations:**
- Using `gpt-4o` instead: **~$47/month** (17x more)
- Using `text-embedding-3-large`: **~$4/month** (1.3x more)
- Without caching: **~$5/month** (1.7x more)

### Monitor Usage

Set up alerts and dashboards:

```typescript
// Track daily costs
export const logRAGCost = mutation({
  handler: async (ctx, args) => {
    await ctx.db.insert("costTracking", {
      operation: args.operation, // "embedding" or "llm"
      model: args.model,
      tokens: args.tokens,
      estimatedCost: args.estimatedCost,
      timestamp: Date.now(),
      userId: args.userId,
    });
  },
});

// Daily cost summary
export const getDailyCosts = query({
  handler: async (ctx) => {
    const today = Date.now() - 86400000; // Last 24 hours

    const costs = await ctx.db
      .query("costTracking")
      .filter((q) => q.gte(q.field("timestamp"), today))
      .collect();

    const total = costs.reduce((sum, c) => sum + c.estimatedCost, 0);

    return {
      total,
      byOperation: groupBy(costs, "operation"),
      byUser: groupBy(costs, "userId"),
    };
  },
});
```

---

## Future Enhancements

### 1. Advanced Filtering & Faceted Search

Add support for complex filtering and faceted navigation:

```typescript
// Future: Faceted search with counts
interface FacetedSearchResult {
  results: SearchResult[];
  facets: {
    documentType: { value: string; count: number }[];
    category: { value: string; count: number }[];
    author: { value: string; count: number }[];
  };
}

export const facetedSearch = query({
  handler: async (ctx, args): Promise<FacetedSearchResult> => {
    // Implementation would aggregate facet counts
    // while performing semantic search
  },
});
```

### 2. Multi-Modal Search

Extend RAG to support image and video search:

```typescript
// Future: Image embedding support
import { openai } from "@ai-sdk/openai";

export const ragMultiModal = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  imageEmbeddingModel: openai.embedding("clip-vit-large-patch14"), // Hypothetical
  embeddingDimension: 1536,
});

// Search across images and text
const results = await ragMultiModal.search(ctx, {
  namespace,
  query: "outdoor wedding venue photos",
  modalities: ["text", "image"],
});
```

### 3. Real-Time Indexing with Webhooks

Automatically index content as it's created:

```typescript
// Future: Webhook-based auto-indexing
export const onDocumentCreated = mutation({
  handler: async (ctx, args) => {
    // Trigger from external webhook
    await rag.add(ctx, {
      namespace: getEventNamespace(args.eventId),
      key: args.documentId,
      title: args.title,
      text: args.content,
    });

    // Notify users of new indexed content
    await ctx.runMutation(api.notifications.send, {
      type: "new-document-indexed",
      documentId: args.documentId,
    });
  },
});
```

### 4. Analytics Dashboard

Comprehensive RAG analytics:

```typescript
// Future: RAG analytics dashboard
export const getRAGAnalytics = query({
  handler: async (ctx) => {
    return {
      // Usage stats
      totalSearches: 15234,
      totalIndexed: 4521,
      activeNamespaces: 127,

      // Performance metrics
      avgSearchLatency: 342, // ms
      avgRelevanceScore: 0.78,
      cacheHitRate: 0.64,

      // Cost tracking
      monthlyEmbeddingCost: 2.34,
      monthlyLLMCost: 4.56,
      topCostUsers: [...],

      // Quality metrics
      searchesWithResults: 0.89,
      avgResultsPerSearch: 4.2,
      userSatisfactionScore: 0.82,
    };
  },
});
```

### 5. Personalized Search Ranking

Use user behavior to improve result ranking:

```typescript
// Future: Learning to rank with user feedback
export const searchWithPersonalization = query({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    // Get user's search history and preferences
    const userProfile = await ctx.db
      .query("userSearchProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user.subject))
      .first();

    // Perform base search
    const results = await rag.search(ctx, {
      namespace: args.namespace,
      query: args.query,
    });

    // Re-rank based on user preferences
    const personalizedResults = reRankByUserPreference(
      results,
      userProfile
    );

    return personalizedResults;
  },
});
```

### 6. Export and Backup

Allow users to export their RAG-indexed content:

```typescript
// Future: Export namespace content
export const exportNamespace = action({
  handler: async (ctx, args) => {
    const entries = await rag.list(ctx, {
      namespace: args.namespace,
      status: "ready",
    });

    // Convert to exportable format
    const exportData = {
      namespace: args.namespace,
      exportDate: Date.now(),
      entryCount: entries.length,
      entries: entries.map((e) => ({
        title: e.title,
        text: e.text,
        chunks: e.chunks,
        metadata: e.filterValues,
      })),
    };

    // Store as downloadable file
    const storageId = await ctx.storage.store(
      new Blob([JSON.stringify(exportData, null, 2)])
    );

    return { storageId, entryCount: entries.length };
  },
});
```

---

## Common Issues & Troubleshooting

### Issue: "Component not found" Error

**Symptom**: `Error: Component 'rag' not found in app definition`

**Solution**:
1. Verify `convex.config.ts` includes RAG component:
```typescript
import rag from "@convex-dev/rag/convex.config";
app.use(rag);
```
2. Run `npx convex dev` to regenerate types
3. Check `_generated/api.d.ts` for `components.rag`

### Issue: OpenAI API Rate Limit Errors

**Symptom**: `Error: Rate limit exceeded for OpenAI API`

**Solution**:
1. Implement request batching and delays
2. Add rate limiting on your functions
3. Upgrade OpenAI plan if needed
4. Cache results to reduce API calls

### Issue: Poor Search Result Quality

**Symptom**: Search returns irrelevant or no results

**Solution**:
1. Lower `vectorScoreThreshold` (try 0.6 instead of 0.7)
2. Check content is actually indexed: `rag.list(ctx, { namespace })`
3. Verify embeddings are being generated correctly
4. Review chunking strategy - may be too small/large
5. Add more context to queries

### Issue: Slow Search Performance

**Symptom**: Search takes > 1 second to complete

**Solution**:
1. Reduce `limit` parameter (fewer results = faster)
2. Disable `chunkContext` if not needed
3. Check database indexes are in place
4. Consider caching frequent queries
5. Profile Convex function execution time

### Issue: Content Not Updating

**Symptom**: Updated content still shows old results

**Solution**:
1. Ensure using same `key` for updates
2. Check entry status: `rag.list(ctx, { namespace, status: "pending" })`
3. Wait for async processing to complete
4. Verify no errors in Convex logs
5. Try deleting and re-adding with `rag.delete()` then `rag.add()`

---

## References

### Official Documentation
- **Convex RAG Component**: https://www.convex.dev/components/rag
- **RAG Component on NPM**: https://www.npmjs.com/package/@convex-dev/rag
- **Convex Components Guide**: https://docs.convex.dev/components
- **Convex Best Practices**: https://docs.convex.dev/understanding/best-practices

### AI & Embeddings
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **OpenAI Embeddings Guide**: https://platform.openai.com/docs/guides/embeddings
- **OpenAI Embedding Models**: https://platform.openai.com/docs/models/embeddings
- **OpenAI Pricing**: https://openai.com/api/pricing/

### RAG Best Practices
- **RAG Patterns**: https://docs.convex.dev/ai/rag-patterns
- **Vector Search Guide**: https://www.pinecone.io/learn/vector-search/
- **Chunking Strategies**: https://www.pinecone.io/learn/chunking-strategies/
- **Semantic Search Evaluation**: https://www.anthropic.com/research/semantic-search

### Related Convex Components
- **Agent Component** (@convex-dev/agent): AI agents with RAG integration
- **Text Streaming** (@convex-dev/text-streaming): Stream LLM responses
- **Action Cache** (@convex-dev/action-cache): Cache expensive AI calls
- **Rate Limiter** (@convex-dev/ratelimiter): Protect RAG operations

---

## Summary

The Convex RAG component enables powerful semantic search and AI-powered features for Delphi:

✅ **Core Capabilities**: Semantic search, LLM integration, vector embeddings, smart chunking
✅ **Use Cases**: Document search, vendor matching, FAQ bot, message search, budget insights
✅ **Easy Setup**: 5 steps to install and configure
✅ **Cost-Effective**: ~$3/month for 1000 active users with optimizations
✅ **Secure**: Namespace isolation, permission checks, rate limiting
✅ **Scalable**: Handles thousands of documents with sub-500ms search

### Quick Start Checklist

- [ ] Install packages: `npm install @convex-dev/rag ai @ai-sdk/openai openai`
- [ ] Update `convex.config.ts` with RAG component
- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Create `convex/ai/ragConfig.ts` with shared configuration
- [ ] Run `npx convex dev` to deploy
- [ ] Test with sample search query
- [ ] Integrate into your application

### Key Takeaways

1. **Start with text-embedding-3-small** - Best cost/quality balance
2. **Use 0.7 threshold by default** - Good balance of precision/recall
3. **Implement rate limiting** - Protect against abuse
4. **Cache frequent queries** - Save 50-70% on costs
5. **Monitor usage** - Track costs and optimize accordingly

For questions or issues, refer to the [Convex Discord](https://convex.dev/community) or [GitHub Issues](https://github.com/get-convex/convex-rag).

---

*Last Updated: 2025-01-05*
*Document Version: 1.0*
