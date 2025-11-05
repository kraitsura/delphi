# Rate Limiter Component Implementation Guide

## Overview

### What It Does
Application-layer rate limiting with type-safe usage, configurable algorithms (token bucket, fixed window), transactional evaluation, and efficient sharded storage.

### Why We Need It
Protect our event management app from abuse:
- Limit message sending frequency
- Prevent spam in event invitations
- Control AI API usage
- Throttle file uploads
- Limit failed login attempts
- Prevent vendor spam

### Use Cases
1. **Message Rate Limiting**: Max 10 messages/minute per user
2. **AI Requests**: Max 20 AI queries/hour per user
3. **File Uploads**: Max 5 uploads/minute
4. **Failed Logins**: Max 5 attempts/15 minutes
5. **Event Creation**: Max 3 events/day on free tier
6. **Email Sending**: Rate limit outbound emails

---

## Installation

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/rate-limiter
```

Update `convex/convex.config.ts`:
```typescript
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
app.use(rateLimiter);
```

---

## Integration Points

1. **Messages** (`web/convex/messages.ts`) - Limit message sending
2. **AI Actions** (`web/convex/ai/agents.ts`) - Limit AI requests
3. **File Uploads** (`web/convex/files.ts`) - Limit uploads
4. **Authentication** (`web/convex/auth.ts`) - Limit login attempts

---

## Code Examples

### Backend: Configure Rate Limits

`web/convex/rateLimits.ts`:

```typescript
import { components } from "./_generated/api";
import { RateLimiter } from "@convex-dev/rate-limiter";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Message sending: 10 per minute with burst capacity
  sendMessage: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 3, // Allow bursts up to 13 messages
  },
  
  // AI requests: 20 per hour
  aiRequest: {
    kind: "token bucket",
    rate: 20,
    period: HOUR,
  },
  
  // File uploads: 5 per minute
  fileUpload: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
  },
  
  // Failed logins: 5 attempts per 15 minutes
  failedLogin: {
    kind: "fixed window",
    rate: 5,
    period: 15 * MINUTE,
  },
  
  // Event creation (free tier): 3 per day
  freeEventCreation: {
    kind: "fixed window",
    rate: 3,
    period: 24 * HOUR,
  },
  
  // Email sending: 100 per hour (organization-wide)
  emailSending: {
    kind: "token bucket",
    rate: 100,
    period: HOUR,
    shards: 10, // Use sharding for high throughput
  },
});
```

### Apply Rate Limit in Mutation

`web/convex/messages.ts`:

```typescript
import { rateLimiter } from "./rateLimits";

export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // Check rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "sendMessage", {
      key: userProfile._id,
      count: 1,
      throws: true, // Throw error if rate limited
    });
    
    // Create message (only reached if rate limit passed)
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: userProfile._id,
      text: args.text,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});
```

### Check Without Consuming

`web/convex/messages.ts`:

```typescript
export const canSendMessage = query({
  args: {},
  handler: async (ctx) => {
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    const status = await rateLimiter.check(ctx, "sendMessage", {
      key: userProfile._id,
    });
    
    return {
      canSend: status.ok,
      remaining: status.value,
      retryAfter: status.retryAfter,
    };
  },
});
```

### Reset Rate Limit

`web/convex/auth.ts`:

```typescript
// Reset failed login attempts after successful login
export const login = mutation({
  handler: async (ctx, args) => {
    // ... login logic ...
    
    if (loginSuccessful) {
      // Reset failed login counter
      await rateLimiter.reset(ctx, "failedLogin", {
        key: args.email,
      });
    }
  },
});
```

### Frontend Hook

`web/src/hooks/useRateLimit.ts`:

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useMessageRateLimit() {
  const status = useQuery(api.messages.canSendMessage);
  
  return {
    canSend: status?.canSend ?? true,
    remaining: status?.remaining ?? 0,
    retryAfter: status?.retryAfter ?? 0,
  };
}
```

### UI Feedback

`web/src/components/rooms/MessageInput.tsx`:

```typescript
import { useMessageRateLimit } from "@/hooks/useRateLimit";

export function MessageInput() {
  const { canSend, remaining, retryAfter } = useMessageRateLimit();
  
  if (!canSend) {
    return (
      <div className="text-sm text-destructive">
        Rate limit reached. Try again in {Math.ceil(retryAfter / 1000)}s
      </div>
    );
  }
  
  return (
    <div>
      <Input placeholder="Type a message..." />
      {remaining < 3 && (
        <p className="text-xs text-muted-foreground">
          {remaining} messages remaining
        </p>
      )}
    </div>
  );
}
```

---

## Configuration

### Rate Limit Strategies

**Token Bucket** (recommended for most cases):
- Refills gradually
- Allows bursts
- Example: 10 messages/minute with capacity 3

**Fixed Window**:
- All tokens available at start of period
- Example: 100 emails/hour

### Sharding

For high-throughput limits, use sharding:

```typescript
emailSending: {
  kind: "token bucket",
  rate: 100,
  period: HOUR,
  shards: 10, // Distribute load across 10 shards
}
```

---

## Best Practices

1. **Use Appropriate Keys**: Per-user, per-IP, per-organization
2. **Set Reasonable Limits**: Don't frustrate legitimate users
3. **Provide Clear Feedback**: Show remaining quota, retry time
4. **Graceful Degradation**: Don't break UX when rate limited
5. **Reset When Appropriate**: Clear limits after successful actions
6. **Monitor Usage**: Track rate limit hits

---

## Migration Plan

**Phase 1 (Week 1)**: Configure rate limits, test in development
**Phase 2 (Week 2)**: Apply to critical mutations (messages, uploads)
**Phase 3 (Week 3)**: Add UI feedback, test user experience
**Phase 4 (Week 4)**: Roll out to production with monitoring

---

## Testing Strategy

- Test rate limit enforcement
- Test burst capacity
- Test reset functionality
- Test multiple users hitting same limit
- Test UI feedback
- Load test with concurrent requests

---

## Security Considerations

1. **Apply Server-Side**: Never rely on client-side rate limiting
2. **Key Selection**: Use user IDs, not easily spoofable identifiers
3. **Layered Defense**: Combine with other security measures
4. **Monitor Abuse**: Alert on repeated rate limit violations
5. **IP-Based Fallback**: Rate limit by IP for unauthenticated endpoints

---

## References

- [Rate Limiter Component Docs](https://www.convex.dev/components/rate-limiter)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
