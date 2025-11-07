# Resend Email Integration Setup Guide

## Overview

This guide covers the Resend email integration that was implemented for the Delphi event management platform. The integration enables sending transactional emails for event invitations, notifications, and user account verification.

## What Was Implemented

### 1. Core Email Infrastructure

**File:** `web/convex/emails.ts`

- **Resend Client**: Configured with test mode enabled for development
- **Three Email Functions**:
  - `sendTestEmail`: Simple test email function for verification
  - `sendEventInvitation`: Sends event invitation emails with event details
  - `sendAccountVerification`: Welcome/verification emails for new signups

### 2. Event Invitations Integration

**File:** `web/convex/eventInvitations.ts`

- Updated `sendInvitation` mutation to automatically send invitation emails
- Updated `resendInvitation` mutation to send emails when resending invitations
- Emails include:
  - Event name and date
  - Inviter information
  - User's role (coordinator, collaborator, or guest)
  - Personalized invitation message
  - Secure invitation link with 7-day expiration

### 3. Dashboard Testing UI

**File:** `web/src/routes/_authed/dashboard.tsx`

- Added Email Testing Section component
- Features:
  - Input field for recipient email
  - Send test email button
  - Real-time status updates
  - Toast notifications for success/failure
  - Information about test mode

### 4. Configuration

**File:** `web/convex/convex.config.ts`

- Added Resend component to the Convex app configuration
- Follows the same pattern as Better Auth and Rate Limiter components

---

## Getting Started

### Step 1: Get a Resend API Key

1. Sign up for a free account at [resend.com](https://resend.com)
2. Navigate to API Keys in the dashboard
3. Create a new API key
4. Copy the key (starts with `re_`)

### Step 2: Set Environment Variable

In your Convex project, set the Resend API key:

```bash
cd /Users/aaryareddy/Projects/delphi-resend/web
npx convex env set RESEND_API_KEY "re_your_api_key_here"
```

### Step 3: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Dashboard at `http://localhost:5173/dashboard`

3. Find the "Email Testing (Resend Integration)" section

4. Enter a test email address:
   - Use `delivered@resend.dev` for Resend's test address
   - Or use your own email to see the formatted email

5. Click "Send Test" button

6. You should see a success toast with the email ID

### Step 4: Test Event Invitations

1. Create a test event using the Events CRUD section on the dashboard

2. Send an invitation to an email address

3. Check the email inbox for the invitation email

4. The email should include:
   - Event name and date
   - Your name as the inviter
   - The role assigned
   - A link to accept the invitation

---

## Current Configuration

### Test Mode

The integration is currently running in **test mode** (`testMode: true` in `convex/emails.ts`).

**Test mode features:**
- No domain verification required
- Emails can be sent to any address
- Use `delivered@resend.dev` to test delivery
- Perfect for development and testing

**Limitations:**
- Some features may be restricted
- Not suitable for production use

### Email Sender Addresses

Currently using Resend's test sender: `onboarding@resend.dev`

For different email types:
- Test emails: `Delphi Test <onboarding@resend.dev>`
- Event invitations: `Delphi Events <onboarding@resend.dev>`
- Account emails: `Delphi <onboarding@resend.dev>`

---

## Moving to Production

### Step 1: Verify Your Domain

1. Go to the Resend dashboard
2. Navigate to Domains
3. Add your domain (e.g., `delphi.app`)
4. Add the required DNS records:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
5. Wait for verification (usually a few minutes)

### Step 2: Update Sender Addresses

Once your domain is verified, update the sender addresses in `web/convex/emails.ts`:

```typescript
// Before (test mode)
from: "Delphi Events <onboarding@resend.dev>"

// After (production)
from: "Delphi Events <invites@delphi.app>"
```

Recommended email addresses:
- `invites@delphi.app` - Event invitations
- `notifications@delphi.app` - Task/expense notifications
- `noreply@delphi.app` - Account verification
- `digest@delphi.app` - Weekly digests

### Step 3: Disable Test Mode

In `web/convex/emails.ts`, change:

```typescript
export const resend = new Resend(components.resend, {
  testMode: false, // Changed from true
});
```

### Step 4: Set Production Site URL

Make sure the `SITE_URL` environment variable is set for production:

```bash
npx convex env set SITE_URL "https://delphi.app"
```

This ensures invitation links and email links point to the correct domain.

---

## Email Templates

### Current Templates

All email templates are currently inline HTML in `convex/emails.ts`. They include:

1. **Test Email**: Simple confirmation email for testing
2. **Event Invitation**: Formatted invitation with event details
3. **Account Verification**: Welcome email for new users

### Template Features

- Responsive design
- Tailwind-inspired color scheme (Indigo primary)
- Proper spacing and typography
- Call-to-action buttons
- Footer with branding

### Future Enhancement: React Email

For more maintainable templates, consider using [React Email](https://react.email):

```bash
npm install @react-email/components react-email
```

Then create TypeScript components for emails and render them to HTML.

---

## Monitoring and Debugging

### Check Email Logs

1. Go to the Resend dashboard
2. Navigate to Logs
3. See all sent emails, their status, and delivery information

### Common Issues

**"RESEND_API_KEY not set"**
- Run: `npx convex env set RESEND_API_KEY "your_key"`

**"Domain not verified"**
- In test mode: This shouldn't happen
- In production: Verify your domain in Resend dashboard

**Emails not arriving**
- Check spam folder
- Verify the email address is correct
- Check Resend logs for delivery status

**Rate limiting**
- Free tier: 100 emails/day, 1 email/second
- Paid plans: Higher limits available

---

## Architecture Notes

### Email Sending Flow

1. User action triggers a mutation (e.g., `sendInvitation`)
2. Mutation creates database record
3. Mutation schedules internal mutation via `ctx.scheduler.runAfter(0, ...)`
4. Internal mutation calls `resend.sendEmail(ctx, ...)`
5. Resend component handles queueing, retries, and delivery
6. Email ID is returned for tracking

### Why Use `scheduler.runAfter`?

- Decouples email sending from main mutation
- Prevents email failures from blocking user actions
- Allows retries without user interaction
- Better error handling and logging

### Internal vs Public Mutations

- **Internal Mutations** (`internalMutation`): Can only be called from backend code, not from client
- Used for `sendEventInvitation` and `sendAccountVerification` for security
- **Public Mutations** (`mutation`): Can be called from client
- Used for `sendTestEmail` for dashboard testing

---

## Security Considerations

### Email Validation

All email functions validate email addresses before sending. Recommendations:

1. Use Convex validators (`v.string()`)
2. Check for proper email format
3. Sanitize user-generated content in emails
4. Rate limit email sending per user (integration with existing rate limiter)

### Preventing Spam

Consider implementing:

1. User-level rate limits on invitation sending
2. Daily email caps per user
3. Verification codes for sensitive emails
4. Unsubscribe links for marketing emails

### Data Privacy

- Never log full email contents
- Don't expose email IDs to unauthorized users
- Follow CAN-SPAM Act requirements
- Include physical address in marketing emails

---

## Testing Checklist

- [x] Resend API key configured
- [x] Test email sends successfully
- [x] Event invitation emails send on invitation creation
- [x] Event invitation emails send on invitation resend
- [x] Invitation emails include correct event details
- [x] Invitation links work correctly
- [x] Toast notifications show success/error
- [ ] Account verification emails (future enhancement)
- [ ] Domain verified for production
- [ ] Test mode disabled for production
- [ ] All sender addresses updated for production

---

## Future Enhancements

### Short-term

1. Enable Better Auth email verification
2. Add email templates using React Email
3. Implement email previews in dashboard
4. Add email sending history view

### Medium-term

1. Task assignment notifications
2. Expense approval notifications
3. Vendor communication emails
4. Event reminder emails

### Long-term

1. Weekly/daily digest emails
2. Email preferences management
3. Unsubscribe functionality
4. Email analytics and tracking
5. A/B testing for email templates

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Convex Component](https://www.convex.dev/components/resend)
- [React Email](https://react.email)
- [Email Best Practices](https://resend.com/docs/send-with-resend/best-practices)

---

## Support

For issues or questions:

1. Check Resend logs in dashboard
2. Review Convex function logs
3. Test with `delivered@resend.dev`
4. Check environment variables are set
5. Verify API key has correct permissions

---

*Last Updated: 2025-11-06*
*Integration Version: 1.0*
*Resend Component Version: @convex-dev/resend@0.1.13*
