import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import {
  createPaymentSchedule,
  getPaymentSchedule,
  listPaymentSchedulesByEvent,
  getUpcomingPaymentSchedules,
  markPaymentSchedulePaid,
  updatePaymentSchedule,
  deletePaymentSchedule,
} from "./paymentSchedules";

describe("PaymentSchedules CRUD Operations", () => {
  describe("create", () => {
    it("should create payment schedule with required fields", async () => {
      const t = convexTest(schema);

      const { scheduleId, eventId, userId } = await t.run(async (ctx) => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

        const scheduleId = await createPaymentSchedule(ctx, {
          eventId,
          description: "Venue deposit",
          amount: 5000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        return { scheduleId, eventId, userId };
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule).toBeDefined();
      expect(schedule?.description).toBe("Venue deposit");
      expect(schedule?.amount).toBe(5000);
      expect(schedule?.currency).toBe("USD");
      expect(schedule?.eventId).toBe(eventId);
      expect(schedule?.createdBy).toBe(userId);
    });

    it("should auto-calculate status as overdue if dueDate < now", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        const dueDate = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Overdue payment",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.status).toBe("overdue");
    });

    it("should auto-calculate status as due_soon if dueDate within 7 days", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        const dueDate = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Due soon payment",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.status).toBe("due_soon");
    });

    it("should auto-calculate status as upcoming if dueDate > 7 days", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Upcoming payment",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.status).toBe("upcoming");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const beforeCreate = Date.now();

      const scheduleId = await t.run(async (ctx) => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(schedule?.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(schedule?.createdAt).toBe(schedule?.updatedAt);
    });

    it("should link to vendor if provided", async () => {
      const t = convexTest(schema);

      const { scheduleId, vendorId } = await t.run(async (ctx) => {
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

        const vendorId = await ctx.runMutation(api.vendors.create, {
          name: "ABC Catering",
          category: "catering",
          addedBy: userId,
        });

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

        const scheduleId = await createPaymentSchedule(ctx, {
          eventId,
          vendorId,
          description: "Catering deposit",
          amount: 2000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        return { scheduleId, vendorId };
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.vendorId).toBe(vendorId);
    });
  });

  describe("get", () => {
    it("should return payment schedule by ID", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await getPaymentSchedule(ctx, { scheduleId });
      });

      expect(schedule).toBeDefined();
      expect(schedule?._id).toBe(scheduleId);
      expect(schedule?.description).toBe("Test payment");
    });
  });

  describe("listByEvent", () => {
    it("should return all schedules for event", async () => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Payment 1",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Payment 2",
          amount: 2000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await listPaymentSchedulesByEvent(ctx, { eventId });
      });

      expect(schedules).toHaveLength(2);
      expect(schedules.map((s) => s.description)).toContain("Payment 1");
      expect(schedules.map((s) => s.description)).toContain("Payment 2");
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

        // Create overdue payment
        await createPaymentSchedule(ctx, {
          eventId,
          description: "Overdue",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        // Create upcoming payment
        await createPaymentSchedule(ctx, {
          eventId,
          description: "Upcoming",
          amount: 2000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await listPaymentSchedulesByEvent(ctx, {
          eventId,
          status: "overdue",
        });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].description).toBe("Overdue");
      expect(schedules[0].status).toBe("overdue");
    });

    it("should enrich with vendor info", async () => {
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

        const vendorId = await ctx.runMutation(api.vendors.create, {
          name: "ABC Catering",
          category: "catering",
          addedBy: userId,
        });

        await createPaymentSchedule(ctx, {
          eventId,
          vendorId,
          description: "Catering payment",
          amount: 5000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await listPaymentSchedulesByEvent(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].vendor).toBeDefined();
      expect(schedules[0].vendor?.name).toBe("ABC Catering");
    });

    it("should exclude soft-deleted schedules", async () => {
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

        const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Active",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        const deletedSchedule = await createPaymentSchedule(ctx, {
          eventId,
          description: "Deleted",
          amount: 2000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        await deletePaymentSchedule(ctx, {
          scheduleId: deletedSchedule,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await listPaymentSchedulesByEvent(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].description).toBe("Active");
    });
  });

  describe("getUpcoming", () => {
    it("should return schedules due within X days (default 30)", async () => {
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

        // Due in 15 days
        await createPaymentSchedule(ctx, {
          eventId,
          description: "Due in 15 days",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        // Due in 45 days (outside default 30 day window)
        await createPaymentSchedule(ctx, {
          eventId,
          description: "Due in 45 days",
          amount: 2000,
          currency: "USD",
          dueDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].description).toBe("Due in 15 days");
    });

    it("should exclude paid schedules", async () => {
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

        const dueDate = Date.now() + 15 * 24 * 60 * 60 * 1000;

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Unpaid",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        const paidSchedule = await createPaymentSchedule(ctx, {
          eventId,
          description: "Paid",
          amount: 2000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        await markPaymentSchedulePaid(ctx, {
          scheduleId: paidSchedule,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].description).toBe("Unpaid");
    });

    it("should exclude soft-deleted schedules", async () => {
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

        const dueDate = Date.now() + 15 * 24 * 60 * 60 * 1000;

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Active",
          amount: 1000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        const deletedSchedule = await createPaymentSchedule(ctx, {
          eventId,
          description: "Deleted",
          amount: 2000,
          currency: "USD",
          dueDate,
          createdBy: userId,
        });

        await deletePaymentSchedule(ctx, {
          scheduleId: deletedSchedule,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].description).toBe("Active");
    });

    it("should sort by dueDate (ascending)", async () => {
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

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Third",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        await createPaymentSchedule(ctx, {
          eventId,
          description: "First",
          amount: 2000,
          currency: "USD",
          dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        await createPaymentSchedule(ctx, {
          eventId,
          description: "Second",
          amount: 3000,
          currency: "USD",
          dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, { eventId });
      });

      expect(schedules).toHaveLength(3);
      expect(schedules[0].description).toBe("First");
      expect(schedules[1].description).toBe("Second");
      expect(schedules[2].description).toBe("Third");
    });
  });

  describe("markPaid", () => {
    it("should set status to paid", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await markPaymentSchedulePaid(ctx, { scheduleId });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.status).toBe("paid");
    });

    it("should set paidDate (uses provided or Date.now())", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      const customPaidDate = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago

      await t.run(async (ctx) => {
        await markPaymentSchedulePaid(ctx, {
          scheduleId,
          paidDate: customPaidDate,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.paidDate).toBe(customPaidDate);
    });

    it("should link to expense if provided", async () => {
      const t = convexTest(schema);

      const { scheduleId, expenseId } = await t.run(async (ctx) => {
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

        const scheduleId = await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        const expenseId = await ctx.db.insert("expenses", {
          eventId,
          description: "Payment expense",
          amount: 1000,
          currency: "USD",
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { scheduleId, expenseId };
      });

      await t.run(async (ctx) => {
        await markPaymentSchedulePaid(ctx, {
          scheduleId,
          expenseId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.expenseId).toBe(expenseId);
    });

    it("should store confirmation number if provided", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await markPaymentSchedulePaid(ctx, {
          scheduleId,
          confirmationNumber: "CONF-123456",
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.confirmationNumber).toBe("CONF-123456");
    });
  });

  describe("update", () => {
    it("should update amount, dueDate, status, notes", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Original payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      const newDueDate = Date.now() + 60 * 24 * 60 * 60 * 1000;

      await t.run(async (ctx) => {
        await updatePaymentSchedule(ctx, {
          scheduleId,
          amount: 1500,
          dueDate: newDueDate,
          status: "due_soon",
          notes: "Extended deadline",
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.amount).toBe(1500);
      expect(schedule?.dueDate).toBe(newDueDate);
      expect(schedule?.status).toBe("due_soon");
      expect(schedule?.notes).toBe("Extended deadline");
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      const beforeUpdate = await t.run(async (ctx) => {
        const schedule = await ctx.db.get(scheduleId);
        return schedule?.updatedAt;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await updatePaymentSchedule(ctx, {
          scheduleId,
          amount: 1500,
        });
      });

      const afterUpdate = await t.run(async (ctx) => {
        const schedule = await ctx.db.get(scheduleId);
        return schedule?.updatedAt;
      });

      expect(afterUpdate).toBeGreaterThan(beforeUpdate!);
    });
  });

  describe("deleteSchedule", () => {
    it("should soft delete schedule", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Payment to delete",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await deletePaymentSchedule(ctx, { scheduleId });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.deletedAt).toBeDefined();
      expect(schedule?.deletedAt).toBeGreaterThan(0);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      const beforeDelete = await t.run(async (ctx) => {
        const schedule = await ctx.db.get(scheduleId);
        return schedule?.updatedAt;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await deletePaymentSchedule(ctx, { scheduleId });
      });

      const afterDelete = await t.run(async (ctx) => {
        const schedule = await ctx.db.get(scheduleId);
        return schedule?.updatedAt;
      });

      expect(afterDelete).toBeGreaterThan(beforeDelete!);
    });
  });

  describe("Special Tests", () => {
    it("should test status auto-calculation with dueDate in past", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Overdue payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
          createdBy: userId,
        });
      });

      const schedule = await t.run(async (ctx) => {
        return await ctx.db.get(scheduleId);
      });

      expect(schedule?.status).toBe("overdue");
    });

    it("should support payment workflow (upcoming → due_soon → overdue → paid)", async () => {
      const t = convexTest(schema);

      const scheduleId = await t.run(async (ctx) => {
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

        return await createPaymentSchedule(ctx, {
          eventId,
          description: "Test payment",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });
      });

      // Initial: upcoming
      let schedule = await t.run(async (ctx) => ctx.db.get(scheduleId));
      expect(schedule?.status).toBe("upcoming");

      // Update to due_soon
      await t.run(async (ctx) => {
        await updatePaymentSchedule(ctx, {
          scheduleId,
          status: "due_soon",
        });
      });

      schedule = await t.run(async (ctx) => ctx.db.get(scheduleId));
      expect(schedule?.status).toBe("due_soon");

      // Update to overdue
      await t.run(async (ctx) => {
        await updatePaymentSchedule(ctx, {
          scheduleId,
          status: "overdue",
        });
      });

      schedule = await t.run(async (ctx) => ctx.db.get(scheduleId));
      expect(schedule?.status).toBe("overdue");

      // Mark as paid
      await t.run(async (ctx) => {
        await markPaymentSchedulePaid(ctx, { scheduleId });
      });

      schedule = await t.run(async (ctx) => ctx.db.get(scheduleId));
      expect(schedule?.status).toBe("paid");
    });

    it("should test upcoming schedules with different time windows", async () => {
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

        // 5 days
        await createPaymentSchedule(ctx, {
          eventId,
          description: "5 days",
          amount: 1000,
          currency: "USD",
          dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        // 15 days
        await createPaymentSchedule(ctx, {
          eventId,
          description: "15 days",
          amount: 2000,
          currency: "USD",
          dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        // 35 days
        await createPaymentSchedule(ctx, {
          eventId,
          description: "35 days",
          amount: 3000,
          currency: "USD",
          dueDate: Date.now() + 35 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        // 50 days
        await createPaymentSchedule(ctx, {
          eventId,
          description: "50 days",
          amount: 4000,
          currency: "USD",
          dueDate: Date.now() + 50 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      // 7 days window
      const schedules7 = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, {
          eventId,
          daysAhead: 7,
        });
      });
      expect(schedules7).toHaveLength(1);

      // 30 days window
      const schedules30 = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, {
          eventId,
          daysAhead: 30,
        });
      });
      expect(schedules30).toHaveLength(2);

      // 60 days window
      const schedules60 = await t.run(async (ctx) => {
        return await getUpcomingPaymentSchedules(ctx, {
          eventId,
          daysAhead: 60,
        });
      });
      expect(schedules60).toHaveLength(4);
    });

    it("should verify vendor enrichment includes correct data", async () => {
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

        const vendorId = await ctx.runMutation(api.vendors.create, {
          name: "Premium Catering LLC",
          category: "catering",
          email: "contact@premium.com",
          phone: "555-1234",
          addedBy: userId,
        });

        await createPaymentSchedule(ctx, {
          eventId,
          vendorId,
          description: "Catering deposit",
          amount: 5000,
          currency: "USD",
          dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdBy: userId,
        });

        return { eventId };
      });

      const schedules = await t.run(async (ctx) => {
        return await listPaymentSchedulesByEvent(ctx, { eventId });
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].vendor).toBeDefined();
      expect(schedules[0].vendor?.name).toBe("Premium Catering LLC");
      expect(schedules[0].vendor?.category).toBe("catering");
      expect(schedules[0].vendor?.email).toBe("contact@premium.com");
      expect(schedules[0].vendor?.phone).toBe("555-1234");
    });
  });
});
