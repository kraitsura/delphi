import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, requireEventCoordinator } from "./authHelpers";
import { internal } from "./_generated/api";

/**
 * Generate a secure random token for invitation links
 */
function generateInvitationToken(): string {
  return crypto.randomUUID();
}

/**
 * Send invitation to collaborate on an event
 * Only event coordinators can send invitations
 */
export const sendInvitation = mutation({
  args: {
    eventId: v.id("events"),
    invitedEmail: v.string(),
    role: v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest")
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, args.eventId, userProfile._id);

    // Get event details for validation
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user is already a coordinator/collaborator of this event
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.invitedEmail))
      .first();

    if (existingUser) {
      // Check if already a coordinator
      if (event.coordinatorId === existingUser._id) {
        throw new Error("User is already the main coordinator of this event");
      }

      // Check if already a co-coordinator
      if (event.coCoordinatorIds?.includes(existingUser._id)) {
        throw new Error("User is already a co-coordinator of this event");
      }

      // Check if already invited and pending
      const existingInvitation = await ctx.db
        .query("eventInvitations")
        .withIndex("by_event_and_status", (q) =>
          q.eq("eventId", args.eventId).eq("status", "pending")
        )
        .filter((q) => q.eq(q.field("invitedEmail"), args.invitedEmail))
        .first();

      if (existingInvitation) {
        throw new Error("An invitation is already pending for this email");
      }
    }

    // Create invitation
    const token = generateInvitationToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    const invitationId = await ctx.db.insert("eventInvitations", {
      eventId: args.eventId,
      invitedEmail: args.invitedEmail,
      invitedByUserId: userProfile._id,
      role: args.role,
      status: "pending",
      token,
      expiresAt,
      createdAt: now,
      message: args.message,
      isDeleted: false,
    });

    // Send invitation email
    const inviteLink = `${process.env.SITE_URL || "http://localhost:3001"}/invitations/${token}`;
    const eventDate = event.date
      ? new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    await ctx.scheduler.runAfter(0, internal.emails.sendEventInvitation, {
      to: args.invitedEmail,
      invitedByName: userProfile.name,
      eventName: event.name,
      eventDate,
      role: args.role,
      inviteLink,
      message: args.message,
    });

    return {
      invitationId,
      token,
      invitationUrl: `/invitations/${token}`, // Frontend will construct full URL
    };
  },
});

/**
 * Accept an event invitation
 * Creates event coordinator record and adds user to main room
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Find invitation by token
    const invitation = await ctx.db
      .query("eventInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify invitation is pending
    if (invitation.status !== "pending") {
      throw new Error(`Invitation has already been ${invitation.status}`);
    }

    // Verify invitation hasn't expired
    if (Date.now() > invitation.expiresAt) {
      // Mark as expired
      await ctx.db.patch(invitation._id, {
        status: "expired",
      });
      throw new Error("This invitation has expired");
    }

    // Verify email matches (case-insensitive)
    if (userProfile.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new Error(
        "This invitation was sent to a different email address"
      );
    }

    // Get event to verify it exists
    const event = await ctx.db.get(invitation.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Add user as co-coordinator if role is coordinator
    if (invitation.role === "coordinator") {
      const currentCoCoordinators = event.coCoordinatorIds || [];
      if (!currentCoCoordinators.includes(userProfile._id)) {
        await ctx.db.patch(invitation.eventId, {
          coCoordinatorIds: [...currentCoCoordinators, userProfile._id],
        });
      }
    }

    // Add to eventMembers table (for all roles)
    const existingMembership = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", invitation.eventId).eq("userId", userProfile._id)
      )
      .first();

    if (!existingMembership) {
      await ctx.db.insert("eventMembers", {
        eventId: invitation.eventId,
        userId: userProfile._id,
        role: invitation.role,
        joinedAt: Date.now(),
        addedBy: invitation.invitedByUserId,
        isDeleted: false,
      });
    }

    // Update user's role if needed
    if (userProfile.role !== invitation.role) {
      await ctx.db.patch(userProfile._id, {
        role: invitation.role,
        updatedAt: Date.now(),
      });
    }

    // Find the main room for this event
    const mainRoom = await ctx.db
      .query("rooms")
      .withIndex("by_event_and_type", (q) =>
        q.eq("eventId", invitation.eventId).eq("type", "main")
      )
      .first();

    if (mainRoom) {
      // Check if already a participant
      const existingParticipant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", mainRoom._id).eq("userId", userProfile._id)
        )
        .first();

      if (!existingParticipant) {
        // Add to main room with appropriate permissions
        const permissions = {
          canPost: true,
          canEdit: true,
          canDelete: true,
          canManage: invitation.role === "coordinator",
        };

        await ctx.db.insert("roomParticipants", {
          roomId: mainRoom._id,
          userId: userProfile._id,
          ...permissions,
          notificationLevel: "all" as const,
          joinedAt: Date.now(),
          addedBy: invitation.invitedByUserId,
          isDeleted: false,
        });
      }
    }

    return {
      eventId: invitation.eventId,
      role: invitation.role,
    };
  },
});

/**
 * Decline an event invitation
 */
export const declineInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Find invitation by token
    const invitation = await ctx.db
      .query("eventInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify invitation is pending
    if (invitation.status !== "pending") {
      throw new Error(`Invitation has already been ${invitation.status}`);
    }

    // Verify email matches
    if (userProfile.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new Error(
        "This invitation was sent to a different email address"
      );
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "declined",
      declinedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cancel a pending invitation (coordinator only)
 */
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("eventInvitations"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, invitation.eventId, userProfile._id);

    // Verify invitation is pending
    if (invitation.status !== "pending") {
      throw new Error(`Cannot cancel an invitation that has been ${invitation.status}`);
    }

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resend an invitation (generates new token with new expiration)
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.id("eventInvitations"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, invitation.eventId, userProfile._id);

    // Only resend pending or expired invitations
    if (invitation.status !== "pending" && invitation.status !== "expired") {
      throw new Error(`Cannot resend an invitation that has been ${invitation.status}`);
    }

    // Generate new token and expiration
    const token = generateInvitationToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    // Update invitation
    await ctx.db.patch(args.invitationId, {
      token,
      expiresAt,
      status: "pending",
      createdAt: now, // Reset creation time
    });

    // Get event and inviter details for email
    const event = await ctx.db.get(invitation.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Resend invitation email
    const inviteLink = `${process.env.SITE_URL || "http://localhost:3001"}/invitations/${token}`;
    const eventDate = event.date
      ? new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    await ctx.scheduler.runAfter(0, internal.emails.sendEventInvitation, {
      to: invitation.invitedEmail,
      invitedByName: userProfile.name,
      eventName: event.name,
      eventDate,
      role: invitation.role,
      inviteLink,
      message: invitation.message,
    });

    return {
      token,
      invitationUrl: `/invitations/${token}`,
    };
  },
});

/**
 * List all pending invitations for an event
 */
export const listPendingByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, args.eventId, userProfile._id);

    // Get all pending invitations
    const invitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_event_and_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "pending")
      )
      .collect();

    // Attach inviter information
    const invitationsWithInviter = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedByUserId);
        return {
          ...invitation,
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
        };
      })
    );

    return invitationsWithInviter;
  },
});

/**
 * Get invitation by token (for displaying invitation details)
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Note: This is a public query (no auth required) so users can view invitation details
    // before logging in or creating an account

    const invitation = await ctx.db
      .query("eventInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Get event details
    const event = await ctx.db.get(invitation.eventId);
    if (!event) {
      return null;
    }

    // Get inviter details
    const inviter = await ctx.db.get(invitation.invitedByUserId);

    // Check if expired
    const isExpired = Date.now() > invitation.expiresAt;

    return {
      invitation: {
        ...invitation,
        isExpired,
      },
      event: {
        _id: event._id,
        name: event.name,
        description: event.description,
        type: event.type,
        date: event.date,
      },
      inviter: inviter
        ? {
            name: inviter.name,
            email: inviter.email,
            avatar: inviter.avatar,
          }
        : null,
    };
  },
});

/**
 * List invitations by email (for current user to see their pending invitations)
 */
export const listByEmail = query({
  args: {},
  handler: async (ctx) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Get all pending invitations for user's email
    const invitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_email", (q) => q.eq("invitedEmail", userProfile.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Attach event and inviter information
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const event = await ctx.db.get(invitation.eventId);
        const inviter = await ctx.db.get(invitation.invitedByUserId);

        return {
          ...invitation,
          event: event
            ? {
                _id: event._id,
                name: event.name,
                description: event.description,
                type: event.type,
                date: event.date,
              }
            : null,
          inviter: inviter
            ? {
                name: inviter.name,
                email: inviter.email,
                avatar: inviter.avatar,
              }
            : null,
          isExpired: Date.now() > invitation.expiresAt,
        };
      })
    );

    return invitationsWithDetails;
  },
});

/**
 * Get all invitations for an event (all statuses) - for admin view
 */
export const listAllByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is event coordinator
    await requireEventCoordinator(ctx, args.eventId, userProfile._id);

    // Get all invitations for this event
    const invitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Attach inviter information
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedByUserId);
        return {
          ...invitation,
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
          isExpired: Date.now() > invitation.expiresAt,
        };
      })
    );

    // Sort by creation date (most recent first)
    return invitationsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});
