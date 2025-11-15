import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  ctx: MutationCtx,
  args: {
    title: string;
    message: string;
    eventId: Id<"events">;
    type: string;
    deliveryMethod: string[];
    sendToAll: boolean;
    sendToRsvpStatus?: string[];
    sendToTags?: string[];
    customRecipients?: Id<"guests">[];
    attachments?: any;
    createdBy: Id<"users">;
  }
): Promise<Id<"announcements">> {
  const now = Date.now();

  const announcementId = await ctx.db.insert("announcements", {
    ...args,
    status: "draft" as any,
    createdAt: now,
    updatedAt: now,
  } as any);

  return announcementId;
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncement(
  ctx: QueryCtx,
  announcementId: Id<"announcements">
) {
  return await ctx.db.get(announcementId);
}

/**
 * List announcements for an event with optional filters
 */
export async function listAnnouncementsByEvent(
  ctx: QueryCtx,
  args: {
    eventId: Id<"events">;
    status?: string;
    type?: string;
  }
) {
  let query = ctx.db
    .query("announcements")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined));

  if (args.status) {
    query = query.filter((q) => q.eq(q.field("status"), args.status));
  }

  if (args.type) {
    query = query.filter((q) => q.eq(q.field("type"), args.type));
  }

  return await query.collect();
}

/**
 * Update announcement fields
 */
export async function updateAnnouncement(
  ctx: MutationCtx,
  args: {
    announcementId: Id<"announcements">;
    title?: string;
    message?: string;
    deliveryMethod?: string[];
    sendToAll?: boolean;
    sendToRsvpStatus?: string[];
    sendToTags?: string[];
  }
): Promise<Id<"announcements">> {
  const { announcementId, ...updates } = args;

  await ctx.db.patch(announcementId, {
    ...updates,
    updatedAt: Date.now(),
  } as any);

  return announcementId;
}

/**
 * Soft delete an announcement
 */
export async function removeAnnouncement(
  ctx: MutationCtx,
  announcementId: Id<"announcements">
): Promise<Id<"announcements">> {
  await ctx.db.patch(announcementId, {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return announcementId;
}

/**
 * Schedule an announcement for sending
 */
export async function scheduleAnnouncement(
  ctx: MutationCtx,
  args: {
    announcementId: Id<"announcements">;
    scheduledSendTime: number;
  }
): Promise<Id<"announcements">> {
  await ctx.db.patch(args.announcementId, {
    scheduledSendTime: args.scheduledSendTime,
    status: "scheduled" as any,
    updatedAt: Date.now(),
  });

  return args.announcementId;
}

/**
 * Mark an announcement as sent
 */
export async function markAnnouncementSent(
  ctx: MutationCtx,
  args: {
    announcementId: Id<"announcements">;
    deliveryStats?: {
      totalSent: number;
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
    };
  }
): Promise<Id<"announcements">> {
  const { announcementId, deliveryStats } = args;

  await ctx.db.patch(announcementId, {
    status: "sent" as any,
    sentAt: Date.now(),
    deliveryStats,
    updatedAt: Date.now(),
  });

  return announcementId;
}

// ============================================================================
// MUTATION & QUERY HANDLERS
// ============================================================================

// CREATE
export const create = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    eventId: v.id("events"),
    type: v.string(),
    deliveryMethod: v.array(v.string()),
    sendToAll: v.boolean(),
    sendToRsvpStatus: v.optional(v.array(v.string())),
    sendToTags: v.optional(v.array(v.string())),
    customRecipients: v.optional(v.array(v.id("guests"))),
    attachments: v.optional(v.any()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await createAnnouncement(ctx, args);
  },
});

// GET
export const get = query({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    return await getAnnouncement(ctx, args.announcementId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await listAnnouncementsByEvent(ctx, args);
  },
});

// SCHEDULE
export const schedule = mutation({
  args: {
    announcementId: v.id("announcements"),
    scheduledSendTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await scheduleAnnouncement(ctx, args);
  },
});

// MARK AS SENT
export const markSent = mutation({
  args: {
    announcementId: v.id("announcements"),
    deliveryStats: v.optional(v.object({
      totalSent: v.number(),
      delivered: v.number(),
      opened: v.number(),
      clicked: v.number(),
      bounced: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    return await markAnnouncementSent(ctx, args);
  },
});

// UPDATE
export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    deliveryMethod: v.optional(v.array(v.string())),
    sendToAll: v.optional(v.boolean()),
    sendToRsvpStatus: v.optional(v.array(v.string())),
    sendToTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await updateAnnouncement(ctx, args);
  },
});

// DELETE
export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    return await removeAnnouncement(ctx, args.announcementId);
  },
});
