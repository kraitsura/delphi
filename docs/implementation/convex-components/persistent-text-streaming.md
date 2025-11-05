# Persistent Text Streaming Component Implementation Guide

## Overview

### What It Does
Provides real-time text streaming (like AI chat) to the browser while simultaneously storing content in the database. Combines the benefits of HTTP streaming (real-time UX) with database persistence (accessible later, to other users).

### Why We Need It
For AI-powered features in our event planning app:
- Stream AI event planner responses in real-time
- Store responses for later reference
- Share AI suggestions with other team members
- Maintain chat history without re-generating

### Use Cases
1. **AI Event Planner Chat**: Stream and persist planning suggestions
2. **AI-Generated Task Lists**: Stream task generation, store for editing
3. **Vendor Recommendations**: Stream recommendations, save to review later
4. **Budget Analysis**: Stream analysis results, persist reports

---

## Installation

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/persistent-text-streaming
```

Update `convex/convex.config.ts`:
```typescript
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config";

app.use(persistentTextStreaming);
```

---

## Integration Points

**Works with Agent component** to provide streaming responses:
- `web/convex/ai/streaming.ts` - Streaming handlers
- `web/convex/http.ts` - HTTP endpoint setup
- `web/src/hooks/useStreamingChat.ts` - Frontend hook
- Event planner chat UI with real-time responses

---

## Code Examples

### Backend: Create Streaming Handler

`web/convex/ai/streaming.ts`:

```typescript
import { components } from "../_generated/api";
import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";
import { mutation, httpAction } from "../_generated/server";
import { openai } from "@ai-sdk/openai";
import { v } from "convex/values";

export const streaming = new PersistentTextStreaming(components.persistentTextStreaming);

// Create a stream
export const createStream = mutation({
  args: {
    eventId: v.id("events"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const streamId = await streaming.createStream(ctx);
    
    // Store stream reference
    await ctx.db.insert("ai_responses", {
      streamId,
      eventId: args.eventId,
      prompt: args.prompt,
      createdAt: Date.now(),
    });
    
    return streamId;
  },
});

// HTTP action for streaming
export const streamResponse = httpAction(async (ctx, request) => {
  const { streamId, prompt } = await request.json();
  
  const generateChat = async (ctx, request, streamId, chunkAppender) => {
    const stream = await openai.chat("gpt-4o").doStream({
      prompt,
    });
    
    for await (const chunk of stream) {
      await chunkAppender(chunk.text);
    }
  };
  
  return await streaming.stream(ctx, request, streamId, generateChat);
});

// Query to get stored stream content
export const getStreamBody = query({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    return await streaming.getStreamBody(ctx, args.streamId);
  },
});
```

### HTTP Endpoint

`web/convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { streamResponse } from "./ai/streaming";

const http = httpRouter();

http.route({
  path: "/ai-stream",
  method: "POST",
  handler: streamResponse,
});

export default http;
```

### Frontend Hook

`web/src/hooks/useStreamingChat.ts`:

```typescript
import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useStreamingChat(eventId: Id<"events">) {
  const [streamId, setStreamId] = useState<string>();
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  
  const createStream = useMutation(api.ai.streaming.createStream);
  const storedBody = useQuery(
    api.ai.streaming.getStreamBody,
    streamId ? { streamId } : "skip"
  );

  const startStream = useCallback(async (prompt: string) => {
    setStreaming(true);
    setStreamedText("");
    
    // Create stream
    const newStreamId = await createStream({ eventId, prompt });
    setStreamId(newStreamId);
    
    // Start HTTP stream
    const response = await fetch("/ai-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId: newStreamId, prompt }),
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      setStreamedText((prev) => prev + chunk);
    }
    
    setStreaming(false);
  }, [eventId, createStream]);

  return {
    startStream,
    streaming,
    streamedText,
    storedBody, // For non-originator clients
  };
}
```

---

## Configuration

No environment variables required beyond OpenAI API key.

**Optional settings**:
- Batch size for database writes (default: sentence boundaries)
- Stream timeout limits
- CORS headers for HTTP endpoint

---

## Best Practices

1. **Use for AI Responses Only**: Not for user-generated content
2. **Store Stream References**: Link streamId to your entities (messages, reports)
3. **Handle Disconnections**: Gracefully handle network interruptions
4. **Rate Limit**: Prevent abuse of streaming endpoints
5. **Error UI**: Show clear errors if stream fails

---

## Migration Plan

**Phase 1 (Week 1)**: Install component, setup HTTP endpoint
**Phase 2 (Week 2)**: Integrate with Agent component
**Phase 3 (Week 3)**: Build streaming UI components
**Phase 4 (Week 4)**: Test and optimize

---

## Testing Strategy

- Test stream creation and persistence
- Test concurrent streams
- Test network interruptions
- Test with slow connections
- Verify database storage after stream completes
- Test multi-user access to stored streams

---

## Security Considerations

1. **Authentication**: Verify user before creating streams
2. **Rate Limiting**: Limit streams per user/event
3. **Access Control**: Only event participants can view streams
4. **Content Filtering**: Sanitize AI-generated content

---

## References

- [Persistent Text Streaming Docs](https://www.convex.dev/components/persistent-text-streaming)
- [AI SDK Streaming](https://sdk.vercel.ai/docs/ai-sdk-core/streaming)
