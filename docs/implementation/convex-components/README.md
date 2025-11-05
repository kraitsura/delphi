# Convex Components Implementation Guide

**Project**: Delphi Event Management Platform  
**Date**: November 5, 2025  
**Components**: 7 Convex components for enhanced functionality

---

## Overview

This directory contains detailed implementation documentation for integrating 7 Convex components into the Delphi event management application. Each component addresses specific functionality needs while following Convex best practices.

---

## Components Documented

### 1. [Presence](./presence.md) - Real-Time User Tracking
**Status**: High Priority  
**Purpose**: Track which users are currently active in event rooms  
**Key Features**:
- Real-time presence indicators
- Typing indicators
- Last seen timestamps
- FacePile UI component

**Use Cases**:
- Show active users in chat rooms
- Display typing indicators
- Event dashboard presence
- Vendor availability tracking

**Estimated Implementation**: 2-3 weeks

---

### 2. [Cloudflare R2](./cloudflare-r2.md) - File Storage
**Status**: High Priority  
**Purpose**: Scalable, cost-effective file storage and serving  
**Key Features**:
- Zero egress fees
- Signed URL generation
- Client-side direct uploads
- File metadata management

**Use Cases**:
- Message attachments (images, files)
- Expense receipt uploads
- Event media (venue photos)
- User avatars
- Vendor documents

**Estimated Implementation**: 3-4 weeks

---

### 3. [Agent](./agent.md) - AI-Powered Assistants
**Status**: Medium Priority  
**Purpose**: Build AI agents for event planning assistance  
**Key Features**:
- Conversation thread management
- Tool integration
- Vector search for context
- Multi-agent collaboration

**Use Cases**:
- Event planning assistant chatbot
- Intent detection (task/expense creation)
- Vendor recommendations
- Budget analysis
- FAQ bot

**Estimated Implementation**: 4-5 weeks

---

### 4. [Persistent Text Streaming](./persistent-text-streaming.md) - AI Response Streaming
**Status**: Low Priority (Requires Agent)  
**Purpose**: Stream AI responses in real-time while persisting to database  
**Key Features**:
- HTTP streaming for real-time UX
- Database persistence
- Multi-user access to streams
- Efficient batching

**Use Cases**:
- Stream AI event planner responses
- Stream AI-generated task lists
- Stream vendor recommendations
- Persist AI analysis reports

**Estimated Implementation**: 1-2 weeks (after Agent)

---

### 5. [Autumn](./autumn.md) - Pricing & Billing
**Status**: Medium Priority  
**Purpose**: Complete pricing and billing system on Stripe  
**Key Features**:
- Subscription management
- Usage-based billing
- Feature gating
- Payment collection

**Use Cases**:
- Free/Pro/Enterprise tiers
- Event creation limits
- Feature access control
- Usage tracking (AI, storage)

**Estimated Implementation**: 3-4 weeks

---

### 6. [Resend](./resend.md) - Transactional Email
**Status**: High Priority  
**Purpose**: Reliable email sending with queueing and retry  
**Key Features**:
- Email queueing and batching
- Automatic retries
- Rate limiting
- Webhook support

**Use Cases**:
- Event invitations
- Task assignment notifications
- Expense approval alerts
- Weekly digest emails
- Password resets

**Estimated Implementation**: 2-3 weeks

---

### 7. [Rate Limiter](./rate-limiter.md) - Abuse Prevention
**Status**: High Priority  
**Purpose**: Application-layer rate limiting  
**Key Features**:
- Token bucket & fixed window algorithms
- Per-user limits
- Transactional evaluation
- Efficient sharding

**Use Cases**:
- Message sending limits
- AI request throttling
- File upload limits
- Failed login attempts
- Email sending limits

**Estimated Implementation**: 1 week

---

## Implementation Priority & Order

### Phase 1: Foundation (Weeks 1-4)
**Critical for MVP**

1. **Rate Limiter** (Week 1)
   - Prevent abuse from day one
   - Protect all endpoints
   - Easy to implement

2. **Presence** (Weeks 2-3)
   - Core collaboration feature
   - Enhances chat experience
   - High user value

3. **Resend** (Weeks 3-4)
   - Critical for notifications
   - Event invitations
   - User engagement

### Phase 2: Monetization & Storage (Weeks 5-8)
**Business critical**

4. **Cloudflare R2** (Weeks 5-7)
   - File uploads essential
   - Message attachments
   - Receipt storage

5. **Autumn** (Weeks 7-8)
   - Enable monetization
   - Feature gating
   - Usage tracking

### Phase 3: AI Enhancement (Weeks 9-13)
**Competitive advantage**

6. **Agent** (Weeks 9-12)
   - AI event planning assistant
   - Intent detection
   - Vendor matching

7. **Persistent Text Streaming** (Week 13)
   - Enhance AI UX
   - Real-time streaming
   - Response persistence

---

## Dependencies Between Components

```
Rate Limiter ←─── All Components (should rate limit their operations)
                     │
                     ├── Presence (rate limit heartbeats)
                     ├── Resend (rate limit emails)
                     ├── Cloudflare R2 (rate limit uploads)
                     └── Agent (rate limit AI requests)

Agent ←─── Persistent Text Streaming (requires Agent for streaming)

Autumn ←─── Agent (may need feature gating for AI)
       ←─── Cloudflare R2 (may need storage quotas)
```

---

## Integration Notes

### Authentication
All components integrate with existing BetterAuth:
```typescript
const { userProfile } = await getAuthenticatedUser(ctx);
```

### Schema Integration
Components are isolated but reference our existing schema:
- Presence: References `rooms` and `users`
- R2: References `messages`, `expenses`, `events`
- Agent: Creates AI threads linked to `events`
- Autumn: Gates access to `events`, `rooms` by subscription

### Configuration Pattern
All components follow the same setup pattern:

1. Install: `npm install @convex-dev/component-name`
2. Configure: Add to `convex/convex.config.ts`
3. Initialize: Create wrapper in `convex/componentName.ts`
4. Use: Import and use via `ctx.runQuery`/`ctx.runMutation`

---

## Important Warnings

### Security
1. Always validate user permissions before component calls
2. Use rate limiting to prevent abuse
3. Never expose API keys in client code
4. Validate file types and sizes before upload
5. Sanitize user input in AI prompts

### Performance
1. Use appropriate indexes for queries
2. Implement pagination for large datasets
3. Cache signed URLs (R2) with appropriate expiration
4. Monitor AI token usage and costs
5. Use sharding for high-throughput rate limits

### Cost Considerations
| Component | Cost Driver | Optimization |
|-----------|-------------|--------------|
| Presence | Database writes (heartbeats) | Increase heartbeat interval to 45s |
| R2 | Storage + operations | Compress images, cleanup old files |
| Agent | OpenAI API tokens | Use GPT-4o-mini for simple tasks |
| Streaming | Database writes | Batch at sentence boundaries |
| Autumn | Stripe fees | Bundle features, optimize pricing |
| Resend | Email volume | Use digests, batch notifications |
| Rate Limiter | Database operations | Use appropriate shard counts |

---

## Testing Requirements

### All Components Must Test:
- [ ] Authentication enforcement
- [ ] Permission validation
- [ ] Rate limiting integration
- [ ] Error handling
- [ ] Concurrent user scenarios
- [ ] Database transaction rollback
- [ ] UI error states
- [ ] Performance under load

### Component-Specific Tests:
See individual component docs for detailed test plans.

---

## Common Patterns

### 1. Component Wrapper Pattern
```typescript
import { components } from "./_generated/api";
import { ComponentName } from "@convex-dev/component-name";

export const componentName = new ComponentName(components.componentName, {
  // Configuration options
});
```

### 2. Permission Check Pattern
```typescript
export const someAction = mutation({
  handler: async (ctx, args) => {
    // 1. Authenticate
    const { userProfile } = await getAuthenticatedUser(ctx);
    
    // 2. Rate limit
    await rateLimiter.limit(ctx, "actionName", {
      key: userProfile._id,
      count: 1,
      throws: true,
    });
    
    // 3. Check permissions
    await requireRoomParticipant(ctx, args.roomId, userProfile._id);
    
    // 4. Use component
    await componentName.action(ctx, args);
  },
});
```

### 3. Frontend Hook Pattern
```typescript
export function useComponentFeature(args) {
  const mutation = useMutation(api.component.action);
  const query = useQuery(api.component.query, args);
  
  const doAction = useCallback(async (data) => {
    try {
      await mutation(data);
      toast.success("Success!");
    } catch (error) {
      toast.error(error.message);
    }
  }, [mutation]);
  
  return { data: query, doAction };
}
```

---

## Code Organization

Recommended directory structure:

```
web/
├── convex/
│   ├── convex.config.ts          # Component registration
│   ├── presence.ts                # Presence wrapper
│   ├── files.ts                   # R2 wrapper
│   ├── emails.ts                  # Resend wrapper
│   ├── autumn.ts                  # Autumn wrapper
│   ├── rateLimits.ts              # Rate limit config
│   ├── ai/
│   │   ├── agents.ts              # Agent definitions
│   │   ├── streaming.ts           # Text streaming
│   │   └── intentDetection.ts    # Intent detection
│   └── http.ts                    # HTTP endpoints (streaming)
├── src/
│   ├── hooks/
│   │   ├── useRoomPresence.ts
│   │   ├── useFileUpload.ts
│   │   ├── useAIChat.ts
│   │   └── useRateLimit.ts
│   └── components/
│       ├── rooms/
│       │   ├── RoomPresence.tsx
│       │   └── TypingIndicator.tsx
│       ├── files/
│       │   ├── FileUploadButton.tsx
│       │   └── SecureImage.tsx
│       ├── ai/
│       │   └── EventPlannerChat.tsx
│       └── billing/
│           └── UpgradeButton.tsx
```

---

## Environment Variables Checklist

Create `.env.local` for development:

```env
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment

# Cloudflare R2
R2_TOKEN=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_BUCKET=...

# OpenAI (for Agent)
OPENAI_API_KEY=sk-...

# Resend
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_... (optional)

# Autumn
AUTUMN_SECRET_KEY=am_sk_...
```

---

## Migration Checklist

For each component:

### Pre-Implementation
- [ ] Read component documentation thoroughly
- [ ] Understand use cases for our app
- [ ] Identify integration points
- [ ] Plan database schema changes (if any)
- [ ] Estimate implementation time

### Implementation
- [ ] Install npm package
- [ ] Update `convex.config.ts`
- [ ] Set environment variables
- [ ] Create component wrapper
- [ ] Implement backend functions
- [ ] Add permission checks
- [ ] Integrate rate limiting
- [ ] Create frontend hooks
- [ ] Build UI components
- [ ] Write tests

### Post-Implementation
- [ ] Test in development
- [ ] Perform security review
- [ ] Load/performance testing
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather user feedback

---

## Monitoring & Observability

### Metrics to Track
1. **Presence**: Active users per room, heartbeat frequency
2. **R2**: Upload success rate, storage usage, bandwidth
3. **Agent**: Token usage, response time, error rate
4. **Streaming**: Stream completion rate, bandwidth usage
5. **Autumn**: Subscription conversions, MRR, churn
6. **Resend**: Email delivery rate, bounce rate, opens
7. **Rate Limiter**: Limit hits, blocked requests

### Alerts to Configure
- High error rates on component calls
- Unusual token usage (Agent)
- Email delivery failures (Resend)
- Storage quota approaching limits (R2)
- Repeated rate limit violations

---

## Support & Resources

### Documentation
- Individual component docs in this directory
- [Convex Components Reference](../../llm_docs/convex_components_reference.md)
- [Official Convex Docs](https://docs.convex.dev)
- [Component Directory](https://www.convex.dev/components)

### Community
- Convex Discord: https://convex.dev/community
- GitHub Issues: Component-specific repos
- Stack Overflow: Tag `convex`

### Internal
- Architecture decisions: See `/docs/architecture/`
- API documentation: See `/docs/api/`
- Deployment guide: See `/docs/deployment/`

---

## Conclusion

These 7 components provide a solid foundation for building a feature-rich, scalable event management platform. Implement them in the suggested order to maximize value delivery while managing complexity.

**Key Takeaways**:
1. Start with Rate Limiter for security
2. Prioritize Presence and Resend for user engagement
3. Add R2 and Autumn for core functionality and monetization
4. Enhance with AI (Agent + Streaming) for competitive advantage
5. Always follow security and performance best practices
6. Test thoroughly before production deployment

**Estimated Total Implementation Time**: 13-16 weeks

---

*Generated: November 5, 2025*  
*Last Updated: November 5, 2025*
