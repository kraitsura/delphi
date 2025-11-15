import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import {
  createAnnouncement,
  getAnnouncement,
  listAnnouncementsByEvent,
  scheduleAnnouncement,
  markAnnouncementSent,
  updateAnnouncement,
  removeAnnouncement,
} from "./announcements";

describe("announcements", () => {
  describe("create mutation", () => {
    it("should create announcement with required fields", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Save the Date",
          message: "Please mark your calendars for our special day!",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email", "sms"],
          sendToAll: true,
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement).toBeDefined();
      expect(announcement?.title).toBe("Save the Date");
      expect(announcement?.message).toBe("Please mark your calendars for our special day!");
      expect(announcement?.type).toBe("save_the_date");
      expect(announcement?.deliveryMethod).toEqual(["email", "sms"]);
      expect(announcement?.sendToAll).toBe(true);
    });

    it("should set default status to draft", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Test Announcement",
          message: "Test message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.status).toBe("draft");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Test Announcement",
          message: "Test message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          createdBy: userId,
        });
      });

      const after = Date.now();

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.createdAt).toBeGreaterThanOrEqual(before);
      expect(announcement?.createdAt).toBeLessThanOrEqual(after);
      expect(announcement?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(announcement?.updatedAt).toBeLessThanOrEqual(after);
    });

    it("should handle all announcement types", async () => {
      const t = convexTest(schema);

      const types = ["save_the_date", "invitation", "update", "reminder", "info", "thank_you"];

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        for (const type of types) {
          const announcementId = await createAnnouncement(ctx, {
            title: `${type} announcement`,
            message: "Test message",
            eventId,
            type,
            deliveryMethod: ["email"],
            sendToAll: true,
            createdBy: userId,
          });

          const announcement = await ctx.db.get(announcementId);
          expect(announcement?.type).toBe(type);
        }
      });
    });

    it("should store delivery method array", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Multi-channel Announcement",
          message: "Test message",
          eventId,
          type: "update",
          deliveryMethod: ["email", "sms", "in_app"],
          sendToAll: true,
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.deliveryMethod).toEqual(["email", "sms", "in_app"]);
    });

    it("should store recipient targeting (sendToAll, sendToRsvpStatus, sendToTags, customRecipients)", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const guestId = await ctx.db.insert("guests", {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          rsvpStatus: "pending",
          plusOneAllowed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Targeted Announcement",
          message: "Test message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: false,
          sendToRsvpStatus: ["confirmed", "pending"],
          sendToTags: ["vip", "family"],
          customRecipients: [guestId],
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.sendToAll).toBe(false);
      expect(announcement?.sendToRsvpStatus).toEqual(["confirmed", "pending"]);
      expect(announcement?.sendToTags).toEqual(["vip", "family"]);
      expect(announcement?.customRecipients).toBeDefined();
    });
  });

  describe("get query", () => {
    it("should return announcement by ID", async () => {
      const t = convexTest(schema);

      const { announcementId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Save the Date",
          message: "Mark your calendars!",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { announcementId };
      });

      const announcement = await t.run(async (ctx) => {
        return await getAnnouncement(ctx, announcementId);
      });

      expect(announcement).toBeDefined();
      expect(announcement?._id).toBe(announcementId);
      expect(announcement?.title).toBe("Save the Date");
    });

    it("should return null for non-existent announcement", async () => {
      const t = convexTest(schema);

      const announcement = await t.run(async (ctx) => {
        return await getAnnouncement(
          ctx,
          "announcements_nonexistent" as Id<"announcements">
        );
      });

      expect(announcement).toBeNull();
    });
  });

  describe("listByEvent query", () => {
    it("should return all announcements for event", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Announcement 1",
          message: "Message 1",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Announcement 2",
          message: "Message 2",
          eventId,
          type: "invitation",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "sent",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const announcements = await t.run(async (ctx) => {
        return await listAnnouncementsByEvent(ctx, { eventId });
      });

      expect(announcements).toHaveLength(2);
      expect(announcements.map((a) => a.title)).toContain("Announcement 1");
      expect(announcements.map((a) => a.title)).toContain("Announcement 2");
    });

    it("should filter by status if provided", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Draft Announcement",
          message: "Message 1",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Scheduled Announcement",
          message: "Message 2",
          eventId,
          type: "invitation",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "scheduled",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Sent Announcement",
          message: "Message 3",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "sent",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const announcements = await t.run(async (ctx) => {
        return await listAnnouncementsByEvent(ctx, {
          eventId,
          status: "scheduled",
        });
      });

      expect(announcements).toHaveLength(1);
      expect(announcements[0].title).toBe("Scheduled Announcement");
      expect(announcements[0].status).toBe("scheduled");
    });

    it("should filter by type if provided", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Save the Date",
          message: "Message 1",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Invitation",
          message: "Message 2",
          eventId,
          type: "invitation",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Another Save the Date",
          message: "Message 3",
          eventId,
          type: "save_the_date",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const announcements = await t.run(async (ctx) => {
        return await listAnnouncementsByEvent(ctx, {
          eventId,
          type: "save_the_date",
        });
      });

      expect(announcements).toHaveLength(2);
      expect(announcements.every((a) => a.type === "save_the_date")).toBe(true);
    });

    it("should exclude soft-deleted announcements", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Active Announcement",
          message: "Message 1",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("announcements", {
          title: "Deleted Announcement",
          message: "Message 2",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const announcements = await t.run(async (ctx) => {
        return await listAnnouncementsByEvent(ctx, { eventId });
      });

      expect(announcements).toHaveLength(1);
      expect(announcements[0].title).toBe("Active Announcement");
    });
  });

  describe("schedule mutation", () => {
    it("should set scheduledSendTime field", async () => {
      const t = convexTest(schema);

      const { announcementId, scheduledSendTime } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const scheduledSendTime = Date.now() + 24 * 60 * 60 * 1000;

        await scheduleAnnouncement(ctx, {
          announcementId,
          scheduledSendTime,
        });

        return { announcementId, scheduledSendTime };
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.scheduledSendTime).toBe(scheduledSendTime);
    });

    it("should change status to scheduled", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await scheduleAnnouncement(ctx, {
          announcementId,
          scheduledSendTime: Date.now() + 24 * 60 * 60 * 1000,
        });

        return announcementId;
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.status).toBe("scheduled");
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { announcementId, originalUpdatedAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const originalUpdatedAt = Date.now() - 1000;

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await scheduleAnnouncement(ctx, {
          announcementId,
          scheduledSendTime: Date.now() + 24 * 60 * 60 * 1000,
        });

        return { announcementId, originalUpdatedAt };
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("markSent mutation", () => {
    it("should set sentAt timestamp", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "scheduled",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await markAnnouncementSent(ctx, {
          announcementId,
        });

        return announcementId;
      });

      const after = Date.now();

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.sentAt).toBeDefined();
      expect(announcement?.sentAt).toBeGreaterThanOrEqual(before);
      expect(announcement?.sentAt).toBeLessThanOrEqual(after);
    });

    it("should change status to sent", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "scheduled",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await markAnnouncementSent(ctx, {
          announcementId,
        });

        return announcementId;
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.status).toBe("sent");
    });

    it("should update deliveryStats object", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "scheduled",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await markAnnouncementSent(ctx, {
          announcementId,
          deliveryStats: {
            totalSent: 100,
            delivered: 98,
            opened: 75,
            clicked: 25,
            bounced: 2,
          },
        });

        return announcementId;
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.deliveryStats).toEqual({
        totalSent: 100,
        delivered: 98,
        opened: 75,
        clicked: 25,
        bounced: 2,
      });
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { announcementId, originalUpdatedAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const originalUpdatedAt = Date.now() - 1000;

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "scheduled",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await markAnnouncementSent(ctx, {
          announcementId,
        });

        return { announcementId, originalUpdatedAt };
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("update mutation", () => {
    it("should update announcement fields", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Old Title",
          message: "Old Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await updateAnnouncement(ctx, {
          announcementId,
          title: "New Title",
          message: "New Message",
          deliveryMethod: ["email", "sms"],
          sendToAll: false,
          sendToRsvpStatus: ["confirmed"],
        });

        return announcementId;
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.title).toBe("New Title");
      expect(announcement?.message).toBe("New Message");
      expect(announcement?.deliveryMethod).toEqual(["email", "sms"]);
      expect(announcement?.sendToAll).toBe(false);
      expect(announcement?.sendToRsvpStatus).toEqual(["confirmed"]);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { announcementId, originalUpdatedAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const originalUpdatedAt = Date.now() - 1000;

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await updateAnnouncement(ctx, {
          announcementId,
          title: "Updated Title",
        });

        return { announcementId, originalUpdatedAt };
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("deleteAnnouncement mutation", () => {
    it("should soft delete announcement", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await removeAnnouncement(ctx, announcementId);

        return announcementId;
      });

      const after = Date.now();

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.deletedAt).toBeDefined();
      expect(announcement?.deletedAt).toBeGreaterThanOrEqual(before);
      expect(announcement?.deletedAt).toBeLessThanOrEqual(after);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { announcementId, originalUpdatedAt } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const originalUpdatedAt = Date.now() - 1000;

        const announcementId = await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await removeAnnouncement(ctx, announcementId);

        return { announcementId, originalUpdatedAt };
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("Status workflow", () => {
    it("should support status transitions (draft → scheduled → sent)", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await ctx.db.insert("announcements", {
          title: "Announcement",
          message: "Message",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          status: "draft",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Verify draft status
      let announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });
      expect(announcement?.status).toBe("draft");

      // Transition to scheduled
      await t.run(async (ctx) => {
        await scheduleAnnouncement(ctx, {
          announcementId,
          scheduledSendTime: Date.now() + 24 * 60 * 60 * 1000,
        });
      });

      announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });
      expect(announcement?.status).toBe("scheduled");

      // Transition to sent
      await t.run(async (ctx) => {
        await markAnnouncementSent(ctx, {
          announcementId,
        });
      });

      announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });
      expect(announcement?.status).toBe("sent");
    });
  });

  describe("Recipient targeting", () => {
    it("should support sendToAll targeting", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Send to All",
          message: "Message for everyone",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: true,
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.sendToAll).toBe(true);
    });

    it("should support RSVP status targeting", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Send to Confirmed",
          message: "Message for confirmed guests",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: false,
          sendToRsvpStatus: ["confirmed"],
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.sendToAll).toBe(false);
      expect(announcement?.sendToRsvpStatus).toEqual(["confirmed"]);
    });

    it("should support tag-based targeting", async () => {
      const t = convexTest(schema);

      const announcementId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createAnnouncement(ctx, {
          title: "Send to Tagged",
          message: "Message for VIP guests",
          eventId,
          type: "update",
          deliveryMethod: ["email"],
          sendToAll: false,
          sendToTags: ["vip", "family"],
          createdBy: userId,
        });
      });

      const announcement = await t.run(async (ctx) => {
        return await ctx.db.get(announcementId);
      });

      expect(announcement?.sendToAll).toBe(false);
      expect(announcement?.sendToTags).toEqual(["vip", "family"]);
    });
  });
});