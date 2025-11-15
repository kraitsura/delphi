import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import {
  createMilestone,
  getMilestone,
  listMilestonesByEvent,
  getCriticalPathMilestones,
  updateMilestone,
  deleteMilestoneHelper,
} from "./milestones";

describe("milestones", () => {
  describe("create mutation", () => {
    it("should create milestone with required fields", async () => {
      const t = convexTest(schema);

      const { eventId, userId, milestoneId } = await t.run(async (ctx) => {
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

        const milestoneId = await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "critical",
          createdBy: userId,
        });

        return { eventId, userId, milestoneId };
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone).toBeDefined();
      expect(milestone?.name).toBe("Book Venue");
      expect(milestone?.eventId).toBe(eventId);
      expect(milestone?.category).toBe("venue");
      expect(milestone?.criticality).toBe("critical");
      expect(milestone?.createdBy).toBe(userId);
    });

    it("should set default status to not_started", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "important",
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.status).toBe("not_started");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "important",
          createdBy: userId,
        });
      });

      const after = Date.now();

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.createdAt).toBeGreaterThanOrEqual(before);
      expect(milestone?.createdAt).toBeLessThanOrEqual(after);
      expect(milestone?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(milestone?.updatedAt).toBeLessThanOrEqual(after);
    });

    it("should handle optional description field", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          description: "Find and book the perfect wedding venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "critical",
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.description).toBe("Find and book the perfect wedding venue");
    });

    it("should store completion criteria array", async () => {
      const t = convexTest(schema);

      const criteria = ["Venue booked", "Contract signed", "Deposit paid"];

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "critical",
          completionCriteria: criteria,
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.completionCriteria).toEqual(criteria);
    });

    it("should store AI fields (industryStandardTiming, risks)", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "critical",
          industryStandardTiming: "9-12 months before event",
          risks: ["Popular venues book up quickly", "Price increases closer to date"],
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.industryStandardTiming).toBe("9-12 months before event");
      expect(milestone?.risks).toEqual(["Popular venues book up quickly", "Price increases closer to date"]);
    });

    it("should store dependency arrays (dependsOnMilestones, blocksTasks)", async () => {
      const t = convexTest(schema);

      const { milestone1Id, milestoneId } = await t.run(async (ctx) => {
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

        const milestone1Id = await ctx.db.insert("milestones", {
          name: "First Milestone",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const milestoneId = await createMilestone(ctx, {
          name: "Second Milestone",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          criticality: "important",
          dependsOnMilestones: [milestone1Id],
          createdBy: userId,
        });

        return { eventId, userId, milestone1Id, milestoneId };
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.dependsOnMilestones).toEqual([milestone1Id]);
    });
  });

  describe("get query", () => {
    it("should return milestone by ID", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await getMilestone(ctx, { milestoneId });
      });

      expect(milestone).toBeDefined();
      expect(milestone?._id).toBe(milestoneId);
      expect(milestone?.name).toBe("Book Venue");
    });

    it("should return null for non-existent milestone", async () => {
      const t = convexTest(schema);

      const milestone = await t.run(async (ctx) => {
        return await getMilestone(ctx, {
          milestoneId: "milestones_nonexistent" as Id<"milestones">,
        });
      });

      expect(milestone).toBeNull();
    });
  });

  describe("listByEvent query", () => {
    it("should return all milestones for event", async () => {
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

        await ctx.db.insert("milestones", {
          name: "Milestone 1",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Milestone 2",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const milestones = await t.run(async (ctx) => {
        return await listMilestonesByEvent(ctx, { eventId });
      });

      expect(milestones).toHaveLength(2);
      expect(milestones.map((m) => m.name)).toContain("Milestone 1");
      expect(milestones.map((m) => m.name)).toContain("Milestone 2");
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

        await ctx.db.insert("milestones", {
          name: "Milestone 1",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Milestone 2",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Milestone 3",
          eventId,
          category: "music",
          targetDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
          status: "completed",
          criticality: "nice_to_have",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const milestones = await t.run(async (ctx) => {
        return await listMilestonesByEvent(ctx, {
          eventId,
          status: "in_progress",
        });
      });

      expect(milestones).toHaveLength(1);
      expect(milestones[0].name).toBe("Milestone 2");
      expect(milestones[0].status).toBe("in_progress");
    });

    it("should filter by criticality if provided", async () => {
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

        await ctx.db.insert("milestones", {
          name: "Milestone 1",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Milestone 2",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Milestone 3",
          eventId,
          category: "music",
          targetDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const milestones = await t.run(async (ctx) => {
        return await listMilestonesByEvent(ctx, {
          eventId,
          criticality: "critical",
        });
      });

      expect(milestones).toHaveLength(2);
      expect(milestones.every((m) => m.criticality === "critical")).toBe(true);
    });

    it("should exclude soft-deleted milestones", async () => {
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

        await ctx.db.insert("milestones", {
          name: "Active Milestone",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Deleted Milestone",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "important",
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const milestones = await t.run(async (ctx) => {
        return await listMilestonesByEvent(ctx, { eventId });
      });

      expect(milestones).toHaveLength(1);
      expect(milestones[0].name).toBe("Active Milestone");
    });
  });

  describe("getCriticalPath query", () => {
    it("should return only critical milestones", async () => {
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

        await ctx.db.insert("milestones", {
          name: "Critical Milestone 1",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Important Milestone",
          eventId,
          category: "catering",
          targetDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Critical Milestone 2",
          eventId,
          category: "music",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const criticalPath = await t.run(async (ctx) => {
        return await getCriticalPathMilestones(ctx, { eventId });
      });

      expect(criticalPath).toHaveLength(2);
      expect(criticalPath.every((m) => m.criticality === "critical")).toBe(true);
    });

    it("should exclude soft-deleted milestones", async () => {
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

        await ctx.db.insert("milestones", {
          name: "Active Critical",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Deleted Critical",
          eventId,
          category: "catering",
          targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const criticalPath = await t.run(async (ctx) => {
        return await getCriticalPathMilestones(ctx, { eventId });
      });

      expect(criticalPath).toHaveLength(1);
      expect(criticalPath[0].name).toBe("Active Critical");
    });

    it("should order by targetDate ascending", async () => {
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

        const now = Date.now();

        await ctx.db.insert("milestones", {
          name: "Third",
          eventId,
          category: "venue",
          targetDate: now + 90 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "First",
          eventId,
          category: "catering",
          targetDate: now + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("milestones", {
          name: "Second",
          eventId,
          category: "music",
          targetDate: now + 60 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const criticalPath = await t.run(async (ctx) => {
        return await getCriticalPathMilestones(ctx, { eventId });
      });

      expect(criticalPath).toHaveLength(3);
      expect(criticalPath[0].name).toBe("First");
      expect(criticalPath[1].name).toBe("Second");
      expect(criticalPath[2].name).toBe("Third");
    });
  });

  describe("update mutation", () => {
    it("should update milestone fields", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Old Name",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "important",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const newTargetDate = Date.now() + 60 * 24 * 60 * 60 * 1000;

      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          name: "New Name",
          status: "in_progress",
          targetDate: newTargetDate,
          criticality: "critical",
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.name).toBe("New Name");
      expect(milestone?.status).toBe("in_progress");
      expect(milestone?.targetDate).toBe(newTargetDate);
      expect(milestone?.criticality).toBe("critical");
    });

    it("should auto-set completedDate when status changes to completed", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const before = Date.now();

      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          status: "completed",
        });
      });

      const after = Date.now();

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.status).toBe("completed");
      expect(milestone?.completedDate).toBeDefined();
      expect(milestone?.completedDate).toBeGreaterThanOrEqual(before);
      expect(milestone?.completedDate).toBeLessThanOrEqual(after);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { milestoneId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const milestoneId = await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        return { milestoneId, originalUpdatedAt };
      });

      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          name: "Updated Name",
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it("should throw error for non-existent milestone", async () => {
      const t = convexTest(schema);

      await expect(
        t.run(async (ctx) => {
          await updateMilestone(ctx, {
            milestoneId: "milestones_nonexistent" as Id<"milestones">,
            name: "New Name",
          });
        })
      ).rejects.toThrow("Milestone not found");
    });
  });

  describe("deleteMilestone mutation", () => {
    it("should soft delete milestone", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const before = Date.now();

      await t.run(async (ctx) => {
        await deleteMilestoneHelper(ctx, { milestoneId });
      });

      const after = Date.now();

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.deletedAt).toBeDefined();
      expect(milestone?.deletedAt).toBeGreaterThanOrEqual(before);
      expect(milestone?.deletedAt).toBeLessThanOrEqual(after);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { milestoneId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const milestoneId = await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        return { milestoneId, originalUpdatedAt };
      });

      await t.run(async (ctx) => {
        await deleteMilestoneHelper(ctx, { milestoneId });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("Status workflow", () => {
    it("should support status transitions (not_started → in_progress → completed)", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "not_started",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Transition to in_progress
      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          status: "in_progress",
        });
      });

      let milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.status).toBe("in_progress");

      // Transition to completed
      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          status: "completed",
        });
      });

      milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.status).toBe("completed");
      expect(milestone?.completedDate).toBeDefined();
    });

    it("should support at_risk status", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("milestones", {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "in_progress",
          criticality: "critical",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await updateMilestone(ctx, {
          milestoneId,
          status: "at_risk",
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.status).toBe("at_risk");
    });
  });

  describe("Criticality levels", () => {
    it("should support nice_to_have criticality", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Optional Decor",
          eventId,
          category: "decor",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          criticality: "nice_to_have",
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.criticality).toBe("nice_to_have");
    });

    it("should support important criticality", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Catering",
          eventId,
          category: "catering",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          criticality: "important",
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.criticality).toBe("important");
    });

    it("should support critical criticality", async () => {
      const t = convexTest(schema);

      const milestoneId = await t.run(async (ctx) => {
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

        return await createMilestone(ctx, {
          name: "Book Venue",
          eventId,
          category: "venue",
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          criticality: "critical",
          createdBy: userId,
        });
      });

      const milestone = await t.run(async (ctx) => {
        return await ctx.db.get(milestoneId);
      });

      expect(milestone?.criticality).toBe("critical");
    });
  });
});
