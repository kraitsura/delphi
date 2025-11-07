import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

// Initialize Resend with test mode disabled to allow sending to any email
// Note: You'll still be using the test sender (onboarding@resend.dev) which doesn't require domain verification
export const resend = new Resend(components.resend, {
  testMode: false, // Set to true to restrict to delivered@resend.dev only
});

/**
 * Send a simple test email
 * Used for testing the Resend integration from the dashboard
 */
export const sendTestEmail = mutation({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const emailId = await resend.sendEmail(ctx, {
        from: "Delphi <noreply@delphi.kraitsura.com>",
        to: args.to,
        subject: "Test Email from Delphi",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Test Email Successful!</h1>
            <p>This is a test email from your Delphi event management application.</p>
            <p>If you're seeing this, your Resend integration is working correctly.</p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
            <p style="color: #6B7280; font-size: 14px;">Sent via Resend • Delphi Event Management</p>
          </div>
        `,
      });

      return { success: true, emailId };
    } catch (error) {
      console.error("Failed to send test email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }
  },
});

/**
 * Send event invitation email
 * Called internally when creating or resending event invitations
 */
export const sendEventInvitation = internalMutation({
  args: {
    to: v.string(),
    invitedByName: v.string(),
    eventName: v.string(),
    eventDate: v.optional(v.string()),
    role: v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest")
    ),
    inviteLink: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const roleDescriptions = {
      coordinator: "Coordinator - You can manage all aspects of this event",
      collaborator: "Collaborator - You can help organize and manage this event",
      guest: "Guest - You're invited to attend this event",
    };

    const emailId = await resend.sendEmail(ctx, {
      from: "Delphi Events <invites@delphi.kraitsura.com>",
      to: args.to,
      subject: `You're invited to ${args.eventName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">You're Invited!</h1>
          <p><strong>${args.invitedByName}</strong> has invited you to:</p>

          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1F2937; margin-top: 0;">${args.eventName}</h2>
            ${args.eventDate ? `<p style="color: #4B5563;"><strong>Date:</strong> ${args.eventDate}</p>` : ""}
            <p style="color: #4B5563;"><strong>Your Role:</strong> ${roleDescriptions[args.role]}</p>
          </div>

          ${args.message ? `
            <div style="margin: 20px 0;">
              <p style="color: #6B7280;"><em>Personal message:</em></p>
              <p style="padding: 15px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                ${args.message}
              </p>
            </div>
          ` : ""}

          <div style="margin: 30px 0;">
            <a href="${args.inviteLink}"
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>

          <p style="color: #6B7280; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>

          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            Delphi Event Management Platform
          </p>
        </div>
      `,
    });

    return emailId;
  },
});

/**
 * Send account verification/welcome email
 * Called when a new user signs up
 */
export const sendAccountVerification = internalMutation({
  args: {
    to: v.string(),
    userName: v.string(),
    verificationLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailId = await resend.sendEmail(ctx, {
      from: "Delphi <noreply@delphi.kraitsura.com>",
      to: args.to,
      subject: "Welcome to Delphi - Verify Your Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Welcome to Delphi, ${args.userName}!</h1>
          <p>Thank you for joining Delphi, your event management platform.</p>

          ${args.verificationLink ? `
            <div style="margin: 30px 0;">
              <p>Please verify your email address to get started:</p>
              <a href="${args.verificationLink}"
                 style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
          ` : `
            <div style="margin: 30px 0;">
              <p>Your account is ready! You can now start creating and managing events.</p>
              <a href="https://delphi.app/dashboard"
                 style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
          `}

          <div style="margin: 30px 0; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0;">What you can do with Delphi:</h3>
            <ul style="color: #4B5563;">
              <li>Create and manage events</li>
              <li>Collaborate with team members</li>
              <li>Track tasks and assignments</li>
              <li>Manage expenses and budgets</li>
              <li>Communicate with vendors</li>
            </ul>
          </div>

          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
    });

    return emailId;
  },
});
