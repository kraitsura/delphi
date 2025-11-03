# Phase 2.7: Production Readiness & Testing

> **Status:** Phase 2.7 - Final Polish & Deployment
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 2.0-2.6 Complete
> **Next:** Phase 3 - AI Features

---

## Overview

Prepare your chat application for production with rate limiting, error handling, performance monitoring, comprehensive testing, and deployment best practices.

### What You'll Build

- ✅ Rate limiting for message sending
- ✅ Error handling and recovery
- ✅ Connection status indicators
- ✅ Performance monitoring
- ✅ Comprehensive testing suite
- ✅ Production deployment checklist

---

## Backend: Production Hardening

### 1. Rate Limiting

Add to `mono/packages/backend/convex/messages.ts`:

```typescript
/**
 * Enhanced send with rate limiting
 */
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    attachments?: any[];
  }) => {
    await requireCanPostInRoom(db as any, args.roomId);

    // RATE LIMITING: Check recent messages from user
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const recentMessages = await db
      .query("messages")
      .withIndex("by_author", q => q.eq("authorId", user.id))
      .filter(q => q.gt(q.field("createdAt"), oneMinuteAgo))
      .collect();

    if (recentMessages.length >= 10) {
      throw new Error("Rate limit exceeded. Please slow down.");
    }

    // VALIDATION: Text content
    if (!args.text && (!args.attachments || args.attachments.length === 0)) {
      throw new Error("Message must have text or attachments");
    }

    if (args.text.length > 5000) {
      throw new Error("Message too long (max 5000 characters)");
    }

    // Continue with message creation...
    const userProfile = await db.get(user.id);
    if (!userProfile) throw new Error("User profile not found");

    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      attachments: args.attachments,
      mentions: parseMentions(args.text),
      authorName: userProfile.name,
      authorAvatar: userProfile.avatar,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);
```

### 2. System Metrics

Create `mono/packages/backend/convex/metrics.ts`:

```typescript
import { query } from "./_generated/server";

/**
 * Get system metrics for monitoring dashboard
 */
export const getSystemMetrics = query({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Messages sent in last hour
    const messagesLastHour = await ctx.db
      .query("messages")
      .filter(q => q.gt(q.field("createdAt"), oneHourAgo))
      .collect();

    // Active users (sent message in last hour)
    const activeUserIds = new Set(
      messagesLastHour.map(m => m.authorId)
    );

    // Messages sent in last 24 hours
    const messagesLastDay = await ctx.db
      .query("messages")
      .filter(q => q.gt(q.field("createdAt"), oneDayAgo))
      .collect();

    // Total counts
    const totalMessages = await ctx.db.query("messages").collect();
    const totalRooms = await ctx.db.query("rooms").collect();
    const totalEvents = await ctx.db.query("events").collect();

    return {
      messagesLastHour: messagesLastHour.length,
      messagesLastDay: messagesLastDay.length,
      activeUsers: activeUserIds.size,
      totalMessages: totalMessages.length,
      totalRooms: totalRooms.length,
      totalEvents: totalEvents.length,
      timestamp: now,
    };
  },
});
```

---

## Frontend: Error Handling & UX

### 1. Connection Status Indicator

Create `mono/apps/web/src/components/chat/connection-status.tsx`:

```typescript
import { useConvexAuth } from "convex/react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ConnectionStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Alert variant="destructive" className="m-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Disconnected from server. Reconnecting...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 px-4 py-2">
      <Wifi className="h-3 w-3" />
      Connected
    </div>
  );
}
```

### 2. Error Boundary

Create `mono/apps/web/src/components/error-boundary.tsx`:

```typescript
import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
    // TODO: Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3. Retry Logic for Mutations

Create `mono/apps/web/src/hooks/use-retry-mutation.ts`:

```typescript
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";

export function useRetryMutation<TData, TError, TVariables>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    maxRetries?: number;
    retryDelay?: number;
  }
) {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;

  return useMutation({
    ...options,
    retry: (failureCount, error) => {
      if (failureCount < maxRetries) {
        toast.error(`Request failed. Retrying (${failureCount}/${maxRetries})...`);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => retryDelay * attemptIndex,
  });
}
```

---

## Testing Suite

### 1. Backend Unit Tests

Create `mono/packages/backend/convex/messages.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Messages", () => {
  it("should enforce rate limiting", async () => {
    const t = convexTest(schema);

    // Create user and room
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
    });

    const eventId = await t.mutation(api.events.create, {
      name: "Test Event",
      type: "party",
    });

    const roomId = await t.mutation(api.rooms.create, {
      eventId,
      name: "Main",
      type: "main",
    });

    // Send 10 messages (rate limit)
    for (let i = 0; i < 10; i++) {
      await t.mutation(api.messages.send, {
        roomId,
        text: `Message ${i}`,
      });
    }

    // 11th message should fail
    await expect(
      t.mutation(api.messages.send, {
        roomId,
        text: "Too many messages",
      })
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("should validate message length", async () => {
    const t = convexTest(schema);

    // Setup...

    // Try to send message > 5000 chars
    const longText = "a".repeat(5001);

    await expect(
      t.mutation(api.messages.send, {
        roomId,
        text: longText,
      })
    ).rejects.toThrow("Message too long");
  });

  it("should handle mentions correctly", async () => {
    const t = convexTest(schema);

    // Create two users
    const user1 = await t.mutation(api.users.createProfile, {
      email: "user1@example.com",
      name: "User One",
    });

    const user2 = await t.mutation(api.users.createProfile, {
      email: "user2@example.com",
      name: "User Two",
    });

    // Send message with mention
    const messageId = await t.mutation(api.messages.send, {
      roomId,
      text: `Hey @[User Two](${user2}) check this out!`,
    });

    const { messages } = await t.query(api.messages.subscribe, { roomId });
    const message = messages.find(m => m._id === messageId);

    expect(message?.mentions).toContain(user2);
  });
});
```

### 2. E2E Tests with Playwright

Create `mono/apps/web/tests/chat.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Chat Flow", () => {
  test("send and receive messages", async ({ page, context }) => {
    // Sign in as User 1
    await page.goto("http://localhost:3000/sign-in");
    await page.fill('input[name="email"]', "user1@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to event chat
    await page.click('text=My Event');
    await page.click('text=Chat');

    // Send message
    await page.fill('textarea[placeholder*="Type a message"]', "Hello everyone!");
    await page.press('textarea', "Enter");

    // Verify message appears
    await expect(page.locator('text=Hello everyone!')).toBeVisible();

    // Open second tab as User 2
    const page2 = await context.newPage();
    await page2.goto("http://localhost:3000/sign-in");
    await page2.fill('input[name="email"]', "user2@example.com");
    await page2.fill('input[name="password"]', "password123");
    await page2.click('button[type="submit"]');

    // Navigate to same event
    await page2.click('text=My Event');
    await page2.click('text=Chat');

    // User 2 should see User 1's message
    await expect(page2.locator('text=Hello everyone!')).toBeVisible({
      timeout: 5000,
    });

    // User 2 replies
    await page2.fill('textarea', "Hi there!");
    await page2.press('textarea', "Enter");

    // User 1 should see User 2's message
    await expect(page.locator('text=Hi there!')).toBeVisible({
      timeout: 5000,
    });
  });

  test("mention autocomplete", async ({ page }) => {
    // Navigate to chat...

    // Type @
    await page.fill('textarea', "@");

    // Wait for autocomplete
    await expect(page.locator('[role="listbox"]')).toBeVisible();

    // Type partial name
    await page.fill('textarea', "@Sar");

    // Should show matching users
    await expect(page.locator('text=Sarah Chen')).toBeVisible();

    // Click to select
    await page.click('text=Sarah Chen');

    // Verify mention inserted
    const value = await page.inputValue('textarea');
    expect(value).toContain("@[Sarah Chen]");
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Environment Variables**
  - [ ] Convex deployment URL configured
  - [ ] OAuth credentials set in production
  - [ ] API keys secured

- [ ] **Database**
  - [ ] Schema deployed to production (`npx convex deploy`)
  - [ ] All indexes created and verified
  - [ ] Search indexes configured

- [ ] **Performance**
  - [ ] Rate limiting enabled
  - [ ] File upload limits enforced (5MB)
  - [ ] Virtual scrolling for large message lists
  - [ ] Image optimization configured

- [ ] **Security**
  - [ ] All mutations authenticated
  - [ ] Permission checks in place
  - [ ] Input validation on all fields
  - [ ] XSS protection enabled

- [ ] **Monitoring**
  - [ ] Error tracking integrated (Sentry/similar)
  - [ ] Performance monitoring active
  - [ ] Metrics dashboard accessible

### Post-Deployment

- [ ] **Smoke Tests**
  - [ ] Can create event and room
  - [ ] Can send messages
  - [ ] Real-time updates working
  - [ ] Search functioning

- [ ] **Load Testing**
  - [ ] 100 concurrent users tested
  - [ ] Message throughput acceptable
  - [ ] Database performance stable

- [ ] **Monitoring**
  - [ ] Check error rates (should be < 1%)
  - [ ] Monitor latency (p95 < 500ms)
  - [ ] Watch for rate limit hits

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Message send latency | < 300ms | < 1s |
| Real-time update latency | < 500ms | < 2s |
| Initial load time | < 1s | < 3s |
| Search response time | < 200ms | < 1s |
| Error rate | < 0.5% | < 2% |

### Monitoring Queries

```typescript
// Add to metrics.ts

export const getLatencyMetrics = query({
  handler: async (ctx) => {
    // Track query execution times
    const start = Date.now();

    const messages = await ctx.db.query("messages").take(50);

    const queryTime = Date.now() - start;

    return {
      queryTime,
      messageCount: messages.length,
    };
  },
});
```

---

## Production Incident Response

### Common Issues & Solutions

#### Issue: High message latency

**Diagnosis:**
```bash
# Check Convex dashboard for slow queries
# Review database indexes
# Check rate limiting isn't too aggressive
```

**Solution:**
- Add missing indexes
- Implement pagination
- Use virtual scrolling

#### Issue: Messages not syncing

**Diagnosis:**
- Check browser console for errors
- Verify Convex connection status
- Test with different browsers

**Solution:**
- Reconnect logic in connection status
- Error boundary catches failures
- Retry mechanism for mutations

---

## Next Steps

Congratulations! You've built a production-ready chat application.

### Phase 2 Complete Checklist

- [ ] Real-time messaging (Phase 2.0)
- [ ] Message history & pagination (Phase 2.1)
- [ ] Room management (Phase 2.2)
- [ ] Rich messaging features (Phase 2.3)
- [ ] Media attachments (Phase 2.4)
- [ ] Multi-user collaboration (Phase 2.5)
- [ ] Search & discovery (Phase 2.6)
- [ ] Production readiness (Phase 2.7)

### Ready for Phase 3: AI Features

With a solid chat foundation, you can now add:
- Pattern detection engine
- Task creation from chat
- Expense tracking
- Inline polls
- AI-powered suggestions

**Phase 2 Complete = Production-ready chat with 100+ concurrent users!** 🚀
