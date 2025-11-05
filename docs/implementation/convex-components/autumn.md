# Autumn Component Implementation Guide

## Overview

### What It Does
Autumn provides a complete pricing and billing database for our event management app, built on Stripe. It handles:
- Subscription management (Pro, Enterprise tiers)
- Usage-based billing (per event, per user)
- Seat-based pricing (team members)
- Trial periods
- Credit systems
- Payment processing

### Why We Need It
Monetization strategy for our event planning platform:
- Free tier: 1 event, basic features
- Pro tier: $29/month, 10 events, advanced features
- Enterprise tier: Custom pricing, unlimited events
- Usage-based: Additional events, storage, AI tokens

### Use Cases
1. **Subscription Plans**: Pro/Enterprise tiers
2. **Usage Limits**: Limit events per plan
3. **Feature Gating**: Lock premium features
4. **Payment Collection**: Stripe checkout integration
5. **Usage Tracking**: Monitor AI token usage, storage

---

## Installation

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @useautumn/convex autumn-js
```

Set Autumn secret key:
```bash
npx convex env set AUTUMN_SECRET_KEY "am_sk_..."
```

Update `convex/convex.config.ts`:
```typescript
import autumn from "@useautumn/convex/convex.config";
app.use(autumn);
```

---

## Integration Points

1. **Feature Access Control** (`web/convex/authHelpers.ts`)
   - Check subscription before allowing actions
   - Gate premium features

2. **Event Creation** (`web/convex/events.ts`)
   - Check event limit before creating
   - Track usage

3. **Pricing Page** (`web/src/routes/pricing.tsx`)
   - Display pricing tiers
   - Checkout flow

4. **Settings/Billing** (`web/src/routes/settings/billing.tsx`)
   - Manage subscription
   - View usage

---

## Code Examples

### Backend: Initialize Autumn

`web/convex/autumn.ts`:

```typescript
import { components } from "./_generated/api";
import { Autumn } from "@useautumn/convex";

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY!,
  identify: async (ctx: any) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return null;
    
    return {
      customerId: user.subject, // BetterAuth user ID
      customerData: {
        name: user.name,
        email: user.email,
      },
    };
  },
});
```

### Feature Access Control

`web/convex/authHelpers.ts`:

```typescript
import { autumn } from "./autumn";

export async function requirePro(ctx: any) {
  const { data, error } = await autumn.check(ctx, {
    featureId: "pro_features",
  });
  
  if (error || !data.hasAccess) {
    throw new Error("Pro subscription required");
  }
}

export async function checkEventLimit(ctx: any) {
  const { data, error } = await autumn.check(ctx, {
    featureId: "event_creation",
  });
  
  if (error || !data.hasAccess) {
    throw new Error("Event limit reached. Upgrade to create more events.");
  }
}
```

### Usage Tracking

`web/convex/events.ts`:

```typescript
import { autumn } from "./autumn";

export const create = mutation({
  handler: async (ctx, args) => {
    // Check event limit
    await checkEventLimit(ctx);
    
    // Create event
    const eventId = await ctx.db.insert("events", { ...args });
    
    // Track usage
    await autumn.track(ctx, {
      featureId: "event_creation",
      value: 1,
    });
    
    return eventId;
  },
});
```

### Frontend: Pricing Table

`web/src/routes/pricing.tsx`:

```typescript
import { PricingTable } from "autumn-js/react";
import { AutumnProvider } from "autumn-js/react";

export default function Pricing() {
  return (
    <AutumnProvider>
      <div className="container py-12">
        <h1 className="text-4xl font-bold text-center mb-8">
          Simple, Transparent Pricing
        </h1>
        <PricingTable />
      </div>
    </AutumnProvider>
  );
}
```

### Frontend: Upgrade Flow

`web/src/components/billing/UpgradeButton.tsx`:

```typescript
import { useCustomer } from "autumn-js/react";
import { Button } from "@/components/ui/button";
import { CheckoutDialog } from "autumn-js/react";

export function UpgradeButton() {
  const { customer, checkout } = useCustomer();

  if (customer?.subscription === "pro") {
    return <Button disabled>Current Plan</Button>;
  }

  return (
    <Button onClick={() => checkout({ 
      productId: "pro", 
      dialog: CheckoutDialog 
    })}>
      Upgrade to Pro
    </Button>
  );
}
```

---

## Configuration

### Autumn Dashboard Setup

1. Create Autumn account at useautumn.com
2. Connect Stripe account
3. Define products/features:
   - `free_events`: 1 event limit
   - `pro_events`: 10 event limit
   - `pro_features`: AI assistant, advanced analytics
   - `ai_tokens`: Usage-based AI token tracking

### Environment Variables

```env
AUTUMN_SECRET_KEY=am_sk_...
```

---

## Best Practices

1. **Check Access in Backend**: Always verify access server-side
2. **Track Usage Accurately**: Track immediately after action
3. **Handle Errors Gracefully**: Show upgrade prompts, not error messages
4. **Cache Customer Data**: Use `useCustomer` hook
5. **Test Webhooks**: Ensure Stripe webhooks are configured

---

## Migration Plan

**Phase 1 (Week 1)**: Setup Autumn, define pricing tiers
**Phase 2 (Week 2)**: Implement feature gating
**Phase 3 (Week 3)**: Build pricing page and upgrade flow
**Phase 4 (Week 4)**: Test end-to-end billing flow

---

## Testing Strategy

- Test free tier limits
- Test Pro tier upgrade
- Test usage tracking accuracy
- Test webhook handling (subscription changes)
- Test payment failures
- Test trial periods

---

## Security Considerations

1. **Backend Enforcement**: Never trust client-side checks
2. **API Key Security**: Use environment variables
3. **Webhook Validation**: Verify Stripe webhook signatures
4. **Rate Limiting**: Prevent usage tracking abuse

---

## References

- [Autumn Docs](https://www.convex.dev/components/autumn)
- [Stripe Integration](https://stripe.com/docs)
