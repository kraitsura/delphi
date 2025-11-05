# Resend Component Implementation Guide

## Overview

### What It Does
Official Resend integration for sending transactional emails with queueing, batching, retries, and rate limiting.

### Why We Need It
Email notifications for our event management app:
- Event invitations
- Task assignment notifications
- Expense approval requests
- Vendor communication
- Daily/weekly digests
- Password resets, account updates

### Use Cases
1. **Event Invitations**: Send invites to guests
2. **Task Notifications**: Notify assignees
3. **Expense Alerts**: Notify when expenses need approval
4. **Vendor Messages**: Email vendors from platform
5. **Digest Emails**: Weekly summaries
6. **Transactional**: Password resets, confirmations

---

## Installation

```bash
cd /Users/aaryareddy/Projects/delphi/web
npm install @convex-dev/resend
```

Set API key:
```bash
npx convex env set RESEND_API_KEY "re_..."
```

Update `convex/convex.config.ts`:
```typescript
import resend from "@convex-dev/resend/convex.config";
app.use(resend);
```

---

## Integration Points

1. **Event Invitations** (`web/convex/invitations.ts`)
2. **Task Assignments** (`web/convex/tasks.ts`)
3. **Expense Notifications** (`web/convex/expenses.ts`)
4. **Digest Emails** (`web/convex/crons.ts`)

---

## Code Examples

### Backend: Initialize Resend

`web/convex/emails.ts`:

```typescript
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend = new Resend(components.resend, {
  testMode: false, // Set to false for production
});

// Send event invitation
export const sendEventInvitation = internalMutation({
  args: {
    to: v.string(),
    eventName: v.string(),
    eventDate: v.string(),
    inviteLink: v.string(),
  },
  handler: async (ctx, args) => {
    const emailId = await resend.sendEmail(ctx, {
      from: "Delphi Events <invites@delphi.app>",
      to: args.to,
      subject: `You're invited to ${args.eventName}`,
      html: `
        <h1>You're Invited!</h1>
        <p>You've been invited to ${args.eventName} on ${args.eventDate}.</p>
        <a href="${args.inviteLink}">View Event Details</a>
      `,
    });
    
    return emailId;
  },
});

// Send task assignment notification
export const sendTaskAssignment = internalMutation({
  args: {
    to: v.string(),
    taskTitle: v.string(),
    taskDueDate: v.string(),
    taskLink: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "Delphi Tasks <tasks@delphi.app>",
      to: args.to,
      subject: `New task assigned: ${args.taskTitle}`,
      html: `
        <h2>New Task Assignment</h2>
        <p><strong>${args.taskTitle}</strong></p>
        <p>Due: ${args.taskDueDate}</p>
        <a href="${args.taskLink}">View Task</a>
      `,
    });
  },
});

// Send weekly digest
export const sendWeeklyDigest = internalMutation({
  args: {
    to: v.string(),
    userName: v.string(),
    summary: v.object({
      newTasks: v.number(),
      upcomingDeadlines: v.array(v.string()),
      recentExpenses: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "Delphi Digest <digest@delphi.app>",
      to: args.to,
      subject: "Your weekly event planning summary",
      html: `
        <h1>Hi ${args.userName}!</h1>
        <h2>This week's summary:</h2>
        <ul>
          <li>${args.summary.newTasks} new tasks</li>
          <li>${args.summary.upcomingDeadlines.length} upcoming deadlines</li>
          <li>${args.summary.recentExpenses} new expenses</li>
        </ul>
      `,
    });
  },
});
```

### Trigger from Mutation

`web/convex/tasks.ts`:

```typescript
import { internal } from "./_generated/api";

export const assign = mutation({
  handler: async (ctx, args) => {
    // Assign task
    await ctx.db.patch(taskId, { assigneeId });
    
    // Get assignee email
    const assignee = await ctx.db.get(assigneeId);
    
    // Schedule email
    await ctx.scheduler.runAfter(0, internal.emails.sendTaskAssignment, {
      to: assignee.email,
      taskTitle: task.title,
      taskDueDate: new Date(task.dueDate).toLocaleDateString(),
      taskLink: `https://delphi.app/tasks/${taskId}`,
    });
  },
});
```

### React Email Templates (Optional)

```bash
npm install @react-email/render react-email
```

`web/src/emails/EventInvitation.tsx`:

```typescript
import { Html, Button, Text } from "@react-email/components";

export function EventInvitation({ eventName, eventDate, inviteLink }) {
  return (
    <Html>
      <Text>You're invited to {eventName}!</Text>
      <Text>Date: {eventDate}</Text>
      <Button href={inviteLink}>View Event</Button>
    </Html>
  );
}
```

Use in Convex:

```typescript
import { render } from "@react-email/render";
import { EventInvitation } from "../../src/emails/EventInvitation";

const html = render(EventInvitation({ eventName, eventDate, inviteLink }));
await resend.sendEmail(ctx, { html, ... });
```

---

## Configuration

### Environment Variables

```env
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_... (optional, for webhooks)
```

### Resend Dashboard

1. Verify your domain (delphi.app)
2. Set up DKIM/SPF records
3. Configure webhook endpoint (optional)

### Test Mode

In development, keep `testMode: true`:

```typescript
export const resend = new Resend(components.resend, {
  testMode: true, // Only sends to test addresses
});
```

---

## Best Practices

1. **Use Internal Mutations**: Email sending should be internal
2. **Template Emails**: Use React Email for maintainable templates
3. **Rate Limiting**: Respect Resend limits (handled by component)
4. **Idempotency**: Use idempotency keys for critical emails
5. **Error Handling**: Log failed emails, retry appropriately
6. **Unsubscribe Links**: Include for marketing emails

---

## Migration Plan

**Phase 1 (Week 1)**: Setup Resend, verify domain
**Phase 2 (Week 2)**: Implement critical emails (invitations, task assignments)
**Phase 3 (Week 3)**: Build email templates with React Email
**Phase 4 (Week 4)**: Implement digest emails, test thoroughly

---

## Testing Strategy

- Test with Resend test addresses (`delivered@resend.dev`)
- Verify email delivery
- Test email rendering across clients (Gmail, Outlook, etc.)
- Test rate limiting behavior
- Test retry logic on failures
- Check spam scores

---

## Security Considerations

1. **API Key Protection**: Use environment variables
2. **Email Validation**: Verify email addresses before sending
3. **Content Sanitization**: Escape user-generated content in emails
4. **Webhook Verification**: Validate webhook signatures
5. **Spam Prevention**: Implement user-level sending limits

---

## References

- [Resend Component Docs](https://www.convex.dev/components/resend)
- [Resend API Docs](https://resend.com/docs)
- [React Email](https://react.email)
