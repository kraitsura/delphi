import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireEventMember, canManageEvent } from "./authHelpers";

/**
 * Get all members of an event with their user details
 * Only accessible to event members
 */
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    role: v.optional(v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest"),
      v.literal("vendor")
    )),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is an event member
    await requireEventMember(ctx, args.eventId, userProfile._id);

    // Get event members
    let query = ctx.db
      .query("eventMembers")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    let allMembers = await query.collect();

    // Filter out soft-deleted members and by role if specified
    let members = allMembers.filter((m) => !m.isDeleted);
    if (args.role) {
      members = members.filter((m) => m.role === args.role);
    }

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user,
        };
      })
    );

    // Sort by join date (most recent first)
    return membersWithUsers.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

/**
 * Migration: Backfill eventMembers table with existing data
 *
 * This migration adds:
 * 1. Main coordinators from events.coordinatorId
 * 2. Co-coordinators from events.coCoordinatorIds
 * 3. Users who accepted invitations (from eventInvitations table)
 *
 * Run this once after deploying the eventMembers table schema.
 *
 * Usage: Call via Convex dashboard or CLI:
 * npx convex run eventMembers:backfillEventMembers
 */
export const backfillEventMembers = internalMutation({
  handler: async (ctx) => {
    console.log("Starting eventMembers backfill migration...");

    let addedCount = 0;
    let skippedCount = 0;

    // Step 1: Add main coordinators and co-coordinators from events table
    const events = await ctx.db.query("events").collect();
    console.log(`Found ${events.length} events`);

    for (const event of events) {
      // Add main coordinator
      const existingMainCoord = await ctx.db
        .query("eventMembers")
        .withIndex("by_event_and_user", (q) =>
          q.eq("eventId", event._id).eq("userId", event.coordinatorId)
        )
        .first();

      if (!existingMainCoord) {
        await ctx.db.insert("eventMembers", {
          eventId: event._id,
          userId: event.coordinatorId,
          role: "coordinator",
          joinedAt: event.createdAt,
          addedBy: event.coordinatorId, // Self-added
          isDeleted: false,
        });
        addedCount++;
        console.log(`Added main coordinator for event ${event.name}`);
      } else {
        skippedCount++;
      }

      // Add co-coordinators
      if (event.coCoordinatorIds && event.coCoordinatorIds.length > 0) {
        for (const coCoordId of event.coCoordinatorIds) {
          const existingCoCoord = await ctx.db
            .query("eventMembers")
            .withIndex("by_event_and_user", (q) =>
              q.eq("eventId", event._id).eq("userId", coCoordId)
            )
            .first();

          if (!existingCoCoord) {
            await ctx.db.insert("eventMembers", {
              eventId: event._id,
              userId: coCoordId,
              role: "coordinator",
              joinedAt: event.createdAt, // Use event creation time as fallback
              addedBy: event.coordinatorId,
              isDeleted: false,
            });
            addedCount++;
            console.log(`Added co-coordinator for event ${event.name}`);
          } else {
            skippedCount++;
          }
        }
      }
    }

    // Step 2: Add users who accepted invitations
    const acceptedInvitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();

    console.log(`Found ${acceptedInvitations.length} accepted invitations`);

    for (const invitation of acceptedInvitations) {
      // Find the user by email
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", invitation.invitedEmail))
        .first();

      if (!user) {
        console.warn(`User not found for email: ${invitation.invitedEmail}`);
        continue;
      }

      // Check if already exists
      const existingMembership = await ctx.db
        .query("eventMembers")
        .withIndex("by_event_and_user", (q) =>
          q.eq("eventId", invitation.eventId).eq("userId", user._id)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("eventMembers", {
          eventId: invitation.eventId,
          userId: user._id,
          role: invitation.role,
          joinedAt: invitation.acceptedAt || invitation.createdAt,
          addedBy: invitation.invitedByUserId,
          isDeleted: false,
        });
        addedCount++;
        console.log(
          `Added invitation-based member: ${user.name} (${invitation.role})`
        );
      } else {
        skippedCount++;
      }
    }

    console.log(`Migration complete!`);
    console.log(`Added: ${addedCount} members`);
    console.log(`Skipped: ${skippedCount} (already existed)`);

    return {
      success: true,
      added: addedCount,
      skipped: skippedCount,
      message: `Migration complete. Added ${addedCount} members, skipped ${skippedCount} existing.`,
    };
  },
});

/**
 * Helper query to check migration status
 * Shows count of eventMembers vs expected members
 */
export const checkMigrationStatus = internalMutation({
  handler: async (ctx) => {
    const eventMembersCount = (await ctx.db.query("eventMembers").collect())
      .length;

    const events = await ctx.db.query("events").collect();
    let expectedCount = 0;

    // Count coordinators
    for (const event of events) {
      expectedCount++; // Main coordinator
      expectedCount += event.coCoordinatorIds?.length || 0; // Co-coordinators
    }

    // Count accepted invitations
    const acceptedInvitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();

    expectedCount += acceptedInvitations.length;

    return {
      currentMembers: eventMembersCount,
      expectedMinimum: expectedCount,
      needsMigration: eventMembersCount < expectedCount,
    };
  },
});

/**
 * Remove an event member with cascade
 * Only coordinators can remove members
 * Cascades to: roomParticipants (soft delete), eventInvitations (cancel), tasks (unassign)
 */
export const removeMember = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userProfile } = await getAuthenticatedUser(ctx);

    // Verify user is coordinator or co-coordinator
    const canManage = await canManageEvent(ctx, args.eventId, userProfile._id);
    if (!canManage) {
      throw new Error(
        "Forbidden: Only coordinators and co-coordinators can remove members"
      );
    }

    // Prevent removing the main coordinator
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.coordinatorId === args.userId) {
      throw new Error("Cannot remove the main coordinator");
    }

    // Find the event member record
    const eventMember = await ctx.db
      .query("eventMembers")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (!eventMember) {
      throw new Error("Event member not found");
    }

    const now = Date.now();

    // 1. Soft delete all roomParticipants for this user in event's rooms
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const room of rooms) {
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_and_user", (q) =>
          q.eq("roomId", room._id).eq("userId", args.userId)
        )
        .first();

      if (participant && !participant.isDeleted) {
        await ctx.db.patch(participant._id, {
          isDeleted: true,
          deletedAt: now,
        });
      }
    }

    // 2. Cancel all eventInvitations sent by this user
    const invitations = await ctx.db
      .query("eventInvitations")
      .withIndex("by_invited_by", (q) => q.eq("invitedByUserId", args.userId))
      .collect();

    const eventInvitations = invitations.filter(
      (inv) => inv.eventId === args.eventId && inv.status === "pending"
    );

    for (const invitation of eventInvitations) {
      await ctx.db.patch(invitation._id, {
        status: "cancelled",
        cancelledAt: now,
      });
    }

    // 3. Unassign or soft delete tasks assigned to this user
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const userTasks = tasks.filter((t) => t.assigneeId === args.userId);

    for (const task of userTasks) {
      if (!task.isDeleted) {
        // Unassign incomplete tasks, soft delete completed ones
        if (task.status === "completed") {
          await ctx.db.patch(task._id, {
            isDeleted: true,
            deletedAt: now,
          });
        } else {
          // Unassign the task
          await ctx.db.patch(task._id, {
            assigneeId: undefined,
            updatedAt: now,
          });
        }
      }
    }

    // 4. Finally, delete the eventMember record (hard delete for junction table)
    await ctx.db.delete(eventMember._id);

    return { success: true };
  },
});
