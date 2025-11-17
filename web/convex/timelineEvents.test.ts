import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import {
  createTimelineEvent,
  getTimelineEvent,
  listTimelineEventsByEvent,
  getDayOfScheduleEvents,
  updateTimelineEventStatus,
  updateTimelineEvent,
  deleteTimelineEventHelper,
} from "./timelineEvents";

describe("timelineEvents", () => {
  describe("create mutation", () => {
    it("should create timeline event with required fields", async () => {
      const t = convexTest(schema);

      const { eventId, timelineEventId } = await t.run(async (ctx) => {
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

        const startTime = Date.now() + 7 * 24 * 60 * 60 * 1000;

        const timelineEventId = await createTimelineEvent(ctx, {
          name: "Ceremony",
          eventId,
          startTime,
          type: "ceremony",
          createdBy: userId,
        });

        return { eventId, userId, timelineEventId };
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent).toBeDefined();
      expect(timelineEvent?.name).toBe("Ceremony");
      expect(timelineEvent?.eventId).toBe(eventId);
      expect(timelineEvent?.type).toBe("ceremony");
    });

    it("should auto-increment order field", async () => {
      const t = convexTest(schema);

      const { event1Id, event2Id, event3Id } = await t.run(async (ctx) => {
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

        const startTime = Date.now() + 7 * 24 * 60 * 60 * 1000;

        const event1Id = await createTimelineEvent(ctx, {
          name: "First Event",
          eventId,
          startTime,
          type: "setup",
          createdBy: userId,
        });

        const event2Id = await createTimelineEvent(ctx, {
          name: "Second Event",
          eventId,
          startTime: startTime + 60 * 60 * 1000,
          type: "ceremony",
          createdBy: userId,
        });

        const event3Id = await createTimelineEvent(ctx, {
          name: "Third Event",
          eventId,
          startTime: startTime + 120 * 60 * 1000,
          type: "reception",
          createdBy: userId,
        });

        return { event1Id, event2Id, event3Id };
      });

      const event1 = await t.run(async (ctx) => await ctx.db.get(event1Id));
      const event2 = await t.run(async (ctx) => await ctx.db.get(event2Id));
      const event3 = await t.run(async (ctx) => await ctx.db.get(event3Id));

      expect(event1?.order).toBe(0);
      expect(event2?.order).toBe(1);
      expect(event3?.order).toBe(2);
    });

    it("should set default status to scheduled", async () => {
      const t = convexTest(schema);

      const timelineEventId = await t.run(async (ctx) => {
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

        return await createTimelineEvent(ctx, {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          createdBy: userId,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.status).toBe("scheduled");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const timelineEventId = await t.run(async (ctx) => {
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

        return await createTimelineEvent(ctx, {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          createdBy: userId,
        });
      });

      const after = Date.now();

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.createdAt).toBeGreaterThanOrEqual(before);
      expect(timelineEvent?.createdAt).toBeLessThanOrEqual(after);
      expect(timelineEvent?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(timelineEvent?.updatedAt).toBeLessThanOrEqual(after);
    });

    it("should handle optional fields (endTime, duration, location, type)", async () => {
      const t = convexTest(schema);

      const timelineEventId = await t.run(async (ctx) => {
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

        const startTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const endTime = startTime + 60 * 60 * 1000;

        return await createTimelineEvent(ctx, {
          name: "Ceremony",
          description: "Wedding ceremony with vows",
          eventId,
          startTime,
          endTime,
          duration: 60,
          type: "ceremony",
          location: "Main Chapel",
          createdBy: userId,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.description).toBe("Wedding ceremony with vows");
      expect(timelineEvent?.duration).toBe(60);
      expect(timelineEvent?.location).toBe("Main Chapel");
    });

    it("should store people involved (responsiblePerson, vendorsInvolved, participantsRequired)", async () => {
      const t = convexTest(schema);

      const timelineEventId = await t.run(async (ctx) => {
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

        const vendorId = await ctx.db.insert("vendors", {
          name: "Test Vendor",
          category: "catering",
          email: "vendor@example.com",
          city: "San Francisco",
          state: "CA",
          country: "USA",
          status: "researching",
          addedBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createTimelineEvent(ctx, {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          responsiblePerson: userId,
          vendorsInvolved: [vendorId],
          createdBy: userId,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.responsiblePerson).toBeDefined();
      expect(timelineEvent?.vendorsInvolved).toBeDefined();
    });
  });

  describe("get query", () => {
    it("should return timeline event by ID", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await getTimelineEvent(ctx, { timelineEventId });
      });

      expect(timelineEvent).toBeDefined();
      expect(timelineEvent?._id).toBe(timelineEventId);
      expect(timelineEvent?.name).toBe("Ceremony");
    });

    it("should return null for non-existent timeline event", async () => {
      const t = convexTest(schema);

      const timelineEvent = await t.run(async (ctx) => {
        return await getTimelineEvent(ctx, {
          timelineEventId: "timelineEvents_nonexistent" as Id<"timelineEvents">,
        });
      });

      expect(timelineEvent).toBeNull();
    });
  });

  describe("listByEvent query", () => {
    it("should return all timeline events for event", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Setup",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "setup",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const events = await t.run(async (ctx) => {
        return await listTimelineEventsByEvent(ctx, { eventId });
      });

      expect(events).toHaveLength(2);
      expect(events.map((e) => e.name)).toContain("Setup");
      expect(events.map((e) => e.name)).toContain("Ceremony");
    });

    it("should filter by status if provided", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Setup",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "setup",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          type: "ceremony",
          status: "in_progress",
          order: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Reception",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
          type: "reception",
          status: "completed",
          order: 2,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const events = await t.run(async (ctx) => {
        return await listTimelineEventsByEvent(ctx, {
          eventId,
          status: "in_progress",
        });
      });

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("Ceremony");
      expect(events[0].status).toBe("in_progress");
    });

    it("should exclude soft-deleted events", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Active Event",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Deleted Event",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          type: "reception",
          status: "scheduled",
          order: 1,
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const events = await t.run(async (ctx) => {
        return await listTimelineEventsByEvent(ctx, { eventId });
      });

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("Active Event");
    });
  });

  describe("getDayOfSchedule query", () => {
    it("should return all timeline events for event", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Setup",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "setup",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const schedule = await t.run(async (ctx) => {
        return await getDayOfScheduleEvents(ctx, { eventId });
      });

      expect(schedule).toHaveLength(2);
    });

    it("should order by order field (ascending)", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Third",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "teardown",
          status: "scheduled",
          order: 2,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "First",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "setup",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Second",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 1,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const schedule = await t.run(async (ctx) => {
        return await getDayOfScheduleEvents(ctx, { eventId });
      });

      expect(schedule).toHaveLength(3);
      expect(schedule[0].name).toBe("First");
      expect(schedule[1].name).toBe("Second");
      expect(schedule[2].name).toBe("Third");
    });

    it("should exclude soft-deleted events", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
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

        await ctx.db.insert("timelineEvents", {
          name: "Active",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("timelineEvents", {
          name: "Deleted",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          type: "reception",
          status: "scheduled",
          order: 1,
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { eventId };
      });

      const schedule = await t.run(async (ctx) => {
        return await getDayOfScheduleEvents(ctx, { eventId });
      });

      expect(schedule).toHaveLength(1);
      expect(schedule[0].name).toBe("Active");
    });
  });

  describe("updateStatus mutation", () => {
    it("should update status field", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "in_progress",
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.status).toBe("in_progress");
    });

    it("should set actualStartTime when status changes to in_progress", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      const actualStartTime = Date.now();

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "in_progress",
          actualStartTime,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.actualStartTime).toBe(actualStartTime);
    });

    it("should set actualEndTime when status changes to completed", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "in_progress",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      const actualEndTime = Date.now();

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "completed",
          actualEndTime,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.actualEndTime).toBe(actualEndTime);
    });

    it("should append live update to liveUpdates array", async () => {
      const t = convexTest(schema);

      const { timelineEventId, userId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId, userId };
      });

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "in_progress",
          liveUpdate: {
            update: "Ceremony has started",
            updatedBy: userId,
          },
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.liveUpdates).toHaveLength(1);
      expect(timelineEvent?.liveUpdates?.[0].update).toBe("Ceremony has started");
      expect(timelineEvent?.liveUpdates?.[0].updatedBy).toBe(userId);
      expect(timelineEvent?.liveUpdates?.[0].timestamp).toBeDefined();
    });

    it("should updates updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { timelineEventId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        return { timelineEventId, originalUpdatedAt };
      });

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "in_progress",
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("update mutation", () => {
    it("should update timeline event fields", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Old Name",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      const newStartTime = Date.now() + 8 * 24 * 60 * 60 * 1000;
      const newEndTime = newStartTime + 60 * 60 * 1000;

      await t.run(async (ctx) => {
        return await updateTimelineEvent(ctx, {
          timelineEventId,
          name: "New Name",
          description: "Updated description",
          startTime: newStartTime,
          endTime: newEndTime,
          location: "New Location",
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.name).toBe("New Name");
      expect(timelineEvent?.description).toBe("Updated description");
      expect(timelineEvent?.startTime).toBe(newStartTime);
      expect(timelineEvent?.endTime).toBe(newEndTime);
      expect(timelineEvent?.location).toBe("New Location");
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { timelineEventId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        return { timelineEventId, originalUpdatedAt };
      });

      await t.run(async (ctx) => {
        return await updateTimelineEvent(ctx, {
          timelineEventId,
          name: "Updated Name",
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("deleteTimelineEvent mutation", () => {
    it("should soft delete timeline event", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      const before = Date.now();

      await t.run(async (ctx) => {
        return await deleteTimelineEventHelper(ctx, { timelineEventId });
      });

      const after = Date.now();

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.deletedAt).toBeDefined();
      expect(timelineEvent?.deletedAt).toBeGreaterThanOrEqual(before);
      expect(timelineEvent?.deletedAt).toBeLessThanOrEqual(after);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { timelineEventId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        return { timelineEventId, originalUpdatedAt };
      });

      await t.run(async (ctx) => {
        return await deleteTimelineEventHelper(ctx, { timelineEventId });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("Status workflow", () => {
    it("should support status transitions (scheduled → in_progress → completed)", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "scheduled",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      // Transition to in_progress
      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "in_progress",
        });
      });

      let timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.status).toBe("in_progress");

      // Transition to completed
      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "completed",
        });
      });

      timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.status).toBe("completed");
    });

    it("should support delayed status", async () => {
      const t = convexTest(schema);

      const { timelineEventId } = await t.run(async (ctx) => {
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

        const timelineEventId = await ctx.db.insert("timelineEvents", {
          name: "Ceremony",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "ceremony",
          status: "in_progress",
          order: 0,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { timelineEventId };
      });

      await t.run(async (ctx) => {
        return await updateTimelineEventStatus(ctx, {
          timelineEventId,
          status: "delayed",
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.status).toBe("delayed");
    });
  });

  describe("Event types", () => {
    it("should support setup event type", async () => {
      const t = convexTest(schema);

      const timelineEventId = await t.run(async (ctx) => {
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

        return await createTimelineEvent(ctx, {
          name: "Setup",
          eventId,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          type: "setup",
          createdBy: userId,
        });
      });

      const timelineEvent = await t.run(async (ctx) => {
        return await ctx.db.get(timelineEventId);
      });

      expect(timelineEvent?.type).toBe("setup");
    });

    it("should support all event types", async () => {
      const t = convexTest(schema);

      const types = ["setup", "vendor_arrival", "ceremony", "reception", "activity", "meal", "teardown"];

      for (const type of types) {
        const timelineEventId = await t.run(async (ctx) => {
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

          return await createTimelineEvent(ctx, {
            name: `${type} event`,
            eventId,
            startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
            type,
            createdBy: userId,
          });
        });

        const timelineEvent = await t.run(async (ctx) => {
          return await ctx.db.get(timelineEventId);
        });

        expect(timelineEvent?.type).toBe(type);
      }
    });
  });
});