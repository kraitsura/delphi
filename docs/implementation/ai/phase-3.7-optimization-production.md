# Phase 3.7: Optimization & Production Readiness
## Performance, Caching, Monitoring, and Deployment

> **Status:** Phase 3.7 - Production Polish (Day 13-14)
> **Last Updated:** November 1, 2025
> **Prerequisites:** Phase 3.6 Complete (Predictive Suggestions)
> **Next Phase:** Phase 4 (Advanced Features)

---

## Overview

Optimize AI features for production with **response caching**, **context assembly optimization**, **cost monitoring**, and **performance tuning** to ensure <3s response times and <$5/event costs.

### What You'll Build

- ✅ Response caching system
- ✅ Context assembly levels (minimal → full)
- ✅ Cost tracking and monitoring
- ✅ Rate limiting
- ✅ Performance optimizations
- ✅ Production deployment checklist

---

## Step 1: Implement Response Caching

Create `mono/packages/backend/convex/ai/cache.ts`:

```typescript
/**
 * Simple in-memory cache for AI responses
 * In production, use Redis or Convex tables for persistent caching
 */

interface CacheEntry {
  response: any;
  expiresAt: number;
}

const RESPONSE_CACHE = new Map<string, CacheEntry>();

export function getCachedResponse(cacheKey: string): any | null {
  const cached = RESPONSE_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[Cache] HIT for key: ${cacheKey}`);
    return cached.response;
  }

  if (cached) {
    RESPONSE_CACHE.delete(cacheKey);
  }

  console.log(`[Cache] MISS for key: ${cacheKey}`);
  return null;
}

export function setCachedResponse(
  cacheKey: string,
  response: any,
  ttlMs = 3600000 // 1 hour default
) {
  RESPONSE_CACHE.set(cacheKey, {
    response,
    expiresAt: Date.now() + ttlMs,
  });
  console.log(`[Cache] SET key: ${cacheKey}, TTL: ${ttlMs}ms`);
}

/**
 * Generate cache key for common patterns
 */
export function generateCacheKey(intent: string, entities: any): string {
  // For tasks about booking common vendors, cache the base enrichment
  if (intent === "task_creation" && entities.object) {
    const obj = entities.object.toLowerCase();
    if (["photographer", "caterer", "florist", "dj", "venue"].includes(obj)) {
      return `task:${obj}:base`;
    }
  }

  // For budget categorization, cache by category
  if (intent === "expense_entry" && entities.category) {
    return `expense:${entities.category}:categorization`;
  }

  return ""; // No cache for this pattern
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache() {
  RESPONSE_CACHE.clear();
  console.log("[Cache] Cleared all entries");
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  let hits = 0;
  let misses = 0;
  let expired = 0;

  const now = Date.now();
  for (const [key, entry] of RESPONSE_CACHE.entries()) {
    if (entry.expiresAt > now) {
      hits++;
    } else {
      expired++;
    }
  }

  return {
    size: RESPONSE_CACHE.size,
    active: hits,
    expired,
  };
}
```

---

## Step 2: Optimize Context Assembly

Update `mono/packages/backend/convex/ai/baseAgent.ts`:

```typescript
export interface ContextLevel {
  level: "minimal" | "standard" | "rich" | "full";
  maxTokens: number;
  includeMessages: number;
  includeTasks: number;
  includeExpenses: boolean;
  includeParticipants: boolean;
}

export const CONTEXT_LEVELS: Record<string, ContextLevel> = {
  minimal: {
    level: "minimal",
    maxTokens: 500,
    includeMessages: 0,
    includeTasks: 0,
    includeExpenses: false,
    includeParticipants: false,
  },
  standard: {
    level: "standard",
    maxTokens: 2000,
    includeMessages: 10,
    includeTasks: 20,
    includeExpenses: false,
    includeParticipants: false,
  },
  rich: {
    level: "rich",
    maxTokens: 5000,
    includeMessages: 50,
    includeTasks: 50,
    includeExpenses: true,
    includeParticipants: true,
  },
  full: {
    level: "full",
    maxTokens: 15000,
    includeMessages: 200,
    includeTasks: 100,
    includeExpenses: true,
    includeParticipants: true,
  },
};

// Update BaseAgent:
export abstract class BaseAgent {
  protected contextLevel: ContextLevel = CONTEXT_LEVELS.standard;

  setContextLevel(level: keyof typeof CONTEXT_LEVELS) {
    this.contextLevel = CONTEXT_LEVELS[level];
    this.maxTokens = this.contextLevel.maxTokens;
  }
}
```

Update agents to use appropriate context levels:

```typescript
// In taskEnricherAgent.ts
export class TaskEnricherAgent extends BaseAgent {
  constructor() {
    super();
    this.setContextLevel("standard"); // 2000 tokens, sufficient for task enrichment
  }
}

// In budgetAnalystAgent.ts
export class BudgetAnalystAgent extends BaseAgent {
  constructor() {
    super();
    this.setContextLevel("rich"); // Need expense history
  }
}
```

---

## Step 3: Add Caching to Process Message

Update `mono/packages/backend/convex/ai/processMessage.ts`:

```typescript
import { getCachedResponse, setCachedResponse, generateCacheKey } from "./cache";

export const processMessage = internalMutation({
  args: { messageId: v.id("messages") },
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
      // Check cache first
      const cacheKey = generateCacheKey(
        message.detectedIntent || "",
        message.extractedEntities || {}
      );

      let result;
      let fromCache = false;

      if (cacheKey) {
        const cached = getCachedResponse(cacheKey);
        if (cached) {
          result = cached;
          fromCache = true;
          console.log(`[AI] Using cached response for ${cacheKey}`);
        }
      }

      // If no cache hit, process with AI
      if (!fromCache) {
        const room = await db.get(message.roomId);
        if (!room) throw new Error("Room not found");

        // ... existing AI processing ...

        // Cache the result
        if (cacheKey && result) {
          setCachedResponse(cacheKey, result, 3600000); // 1 hour
        }
      }

      // ... rest of processing ...

    } catch (error) {
      // ... error handling ...
    }
  },
});
```

---

## Step 4: Cost & Performance Monitoring

Create `mono/packages/backend/convex/monitoring/aiMetrics.ts`:

```typescript
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Track AI costs
 */
export const trackAICost = mutation({
  args: {
    intent: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    cached: v.boolean(),
  },
  handler: async (ctx, args) => {
    const costPerToken = 0.003 / 1000; // Claude Sonnet pricing
    const estimatedCost = args.tokensUsed * costPerToken;

    await ctx.db.insert("aiMetrics", {
      intent: args.intent,
      tokensUsed: args.tokensUsed,
      latencyMs: args.latencyMs,
      estimatedCost,
      cached: args.cached,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get cost summary
 */
export const getCostSummary = query({
  args: {
    timeframe: v.optional(v.string()), // "today", "week", "month"
  },
  handler: async (ctx, args) => {
    const timeframes: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const since = Date.now() - (timeframes[args.timeframe || "today"] || timeframes.today);

    const metrics = await ctx.db
      .query("aiMetrics")
      .filter((q) => q.gt(q.field("timestamp"), since))
      .collect();

    const totalCost = metrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const avgLatency = metrics.reduce((sum, m) => sum + m.latencyMs, 0) / (metrics.length || 1);
    const cacheHitRate = (metrics.filter(m => m.cached).length / (metrics.length || 1)) * 100;

    const byIntent = metrics.reduce((acc: any, m) => {
      if (!acc[m.intent]) {
        acc[m.intent] = { count: 0, cost: 0, tokens: 0 };
      }
      acc[m.intent].count++;
      acc[m.intent].cost += m.estimatedCost;
      acc[m.intent].tokens += m.tokensUsed;
      return acc;
    }, {});

    return {
      timeframe: args.timeframe || "today",
      totalCalls: metrics.length,
      totalCost,
      totalTokens,
      avgLatency: Math.round(avgLatency),
      cacheHitRate: Math.round(cacheHitRate),
      byIntent,
    };
  },
});

/**
 * Performance metrics
 */
export const getPerformanceMetrics = query({
  handler: async (ctx) => {
    const oneHour = Date.now() - 60 * 60 * 1000;

    const metrics = await ctx.db
      .query("aiMetrics")
      .filter((q) => q.gt(q.field("timestamp"), oneHour))
      .collect();

    const latencies = metrics.map(m => m.latencyMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    return {
      lastHour: {
        calls: metrics.length,
        avgLatency: Math.round(metrics.reduce((sum, m) => sum + m.latencyMs, 0) / (metrics.length || 1)),
        p50,
        p95,
        p99,
      },
    };
  },
});
```

Add to schema:

```typescript
aiMetrics: defineTable({
  intent: v.string(),
  tokensUsed: v.number(),
  latencyMs: v.number(),
  estimatedCost: v.number(),
  cached: v.boolean(),
  timestamp: v.number(),
})
  .index("by_timestamp", ["timestamp"]),
```

---

## Step 5: Rate Limiting

Create `mono/packages/backend/convex/ai/rateLimit.ts`:

```typescript
/**
 * Simple rate limiter for AI calls
 */

const RATE_LIMITS = new Map<string, number[]>();

export function checkRateLimit(userId: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get recent calls
  const recentCalls = RATE_LIMITS.get(userId) || [];
  const validCalls = recentCalls.filter(timestamp => timestamp > oneMinuteAgo);

  if (validCalls.length >= maxPerMinute) {
    console.log(`[RateLimit] User ${userId} exceeded ${maxPerMinute} calls/min`);
    return false;
  }

  // Add this call
  validCalls.push(now);
  RATE_LIMITS.set(userId, validCalls);

  return true;
}
```

Add to processMessage:

```typescript
// At start of processMessage
const room = await db.get(message.roomId);
const event = await db.get(room.eventId);

if (!checkRateLimit(event._id, 20)) { // 20 AI calls per minute per event
  throw new Error("Rate limit exceeded");
}
```

---

## Step 6: Production Deployment Checklist

### Environment Variables

```bash
# Production Convex
npx convex env set ANTHROPIC_API_KEY sk-ant-api03-...
npx convex env set AI_RATE_LIMIT_PER_MINUTE 20
npx convex env set AI_CACHE_TTL_MS 3600000
```

### Performance Targets

```typescript
const PRODUCTION_TARGETS = {
  patternDetection: {
    latency: "<5ms",
    accuracy: ">90%",
  },
  taskEnrichment: {
    latency: "<2s",
    cacheHitRate: ">50%",
    accuracy: ">85%",
  },
  expenseAnalysis: {
    latency: "<2s",
    accuracy: ">90%",
  },
  pollEnrichment: {
    latency: "<3s",
    accuracy: ">85%",
  },
  costPerEvent: "<$5",
  monthlyAICost: "<$100",
};
```

### Monitoring Dashboard

Create `mono/apps/web/src/pages/admin/ai-metrics.tsx`:

```typescript
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Card } from "@/components/ui/card";

export function AIMetricsDashboard() {
  const costSummary = useConvexQuery(api.monitoring.aiMetrics.getCostSummary, {
    timeframe: "today",
  });

  const performance = useConvexQuery(api.monitoring.aiMetrics.getPerformanceMetrics, {});

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">AI Metrics Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Calls (Today)</div>
          <div className="text-2xl font-bold">{costSummary?.totalCalls || 0}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Cost (Today)</div>
          <div className="text-2xl font-bold">${costSummary?.totalCost.toFixed(2) || "0.00"}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Latency</div>
          <div className="text-2xl font-bold">{costSummary?.avgLatency || 0}ms</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
          <div className="text-2xl font-bold">{costSummary?.cacheHitRate || 0}%</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">By Intent</h3>
        <div className="space-y-2">
          {Object.entries(costSummary?.byIntent || {}).map(([intent, data]: [string, any]) => (
            <div key={intent} className="flex justify-between text-sm">
              <span className="capitalize">{intent.replace("_", " ")}</span>
              <div className="flex gap-4">
                <span>{data.count} calls</span>
                <span className="text-muted-foreground">${data.cost.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] **Caching**
  - First "book photographer" call → 2s latency
  - Second "book photographer" call → <100ms (cached)
  - Cache hit rate >50% after 100 messages

- [ ] **Performance**
  - Pattern detection <5ms
  - AI enrichment <3s (p95)
  - No timeouts or errors

- [ ] **Cost Control**
  - Cost per event <$5
  - Daily costs monitored
  - Rate limiting works

- [ ] **Monitoring**
  - Metrics dashboard shows data
  - Alerts fire when costs spike
  - Performance metrics accurate

---

## Production Deployment Steps

1. **Deploy to Convex Production**
   ```bash
   cd mono/packages/backend
   npx convex deploy --prod
   ```

2. **Set Environment Variables**
   ```bash
   npx convex env set --prod ANTHROPIC_API_KEY sk-ant-...
   ```

3. **Monitor Initial Launch**
   - Watch Convex logs for errors
   - Check AI metrics dashboard
   - Verify costs are within budget

4. **Gradual Rollout**
   - Enable for 10% of users
   - Monitor for 24 hours
   - Increase to 50%, then 100%

---

## Success Criteria

✅ **Cache hit rate >50%**
✅ **AI latency <3s (p95)**
✅ **Cost per event <$5**
✅ **No timeout errors**
✅ **Monitoring dashboard operational**
✅ **Rate limiting prevents abuse**
✅ **Production deployment successful**

---

## What's Next: Phase 4

With Phase 3 complete, you have a **fully functional AI-powered event planning platform**. Phase 4 will add:

1. **Vector Search** - Vendor discovery with Cloudflare Vectorize
2. **Real-Time Coordination** - Durable Objects for presence/typing
3. **Enhanced Vendor System** - Firecrawl integration
4. **Performance Optimization** - Edge caching, worker optimization

---

**Phase 3 Complete! 🎉**

You've built:
- ✅ Pattern detection engine (90% cost savings)
- ✅ AI agent architecture
- ✅ Task enrichment with vendor suggestions
- ✅ Budget intelligence with split suggestions
- ✅ Poll enrichment with pros/cons
- ✅ Natural language queries
- ✅ Predictive suggestions
- ✅ Production-ready optimization

**Your app now turns conversation into structured intelligence.** 🤖✨
