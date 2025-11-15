import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  createGuest,
  getGuest,
  listGuestsByEvent,
  getGuestRsvpSummary,
  updateGuest,
  removeGuest,
} from "./guests";

describe("Guests CRUD Operations", () => {
  describe("create", () => {
    it("should create guest with required fields", async () => {
      const t = convexTest(schema);

      const { guestId, eventId, userId } = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const guestId = await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        return { guestId, eventId, userId };
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest).toBeDefined();
      expect(guest?.firstName).toBe("John");
      expect(guest?.lastName).toBe("Doe");
      expect(guest?.eventId).toBe(eventId);
      expect(guest?.invitedBy).toBe(userId);
      expect(guest?.guestType).toBe("family");
      expect(guest?.plusOneAllowed).toBe(false);
    });

    it("should set default rsvpStatus to pending", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Jane",
          lastName: "Smith",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: true,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.rsvpStatus).toBe("pending");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const beforeCreate = Date.now();

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Test",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "colleague",
          plusOneAllowed: false,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(guest?.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(guest?.createdAt).toBe(guest?.updatedAt);
    });

    it("should update event guestCount.expected", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "One",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        return { eventId };
      });

      const event = await t.run(async (ctx) => {
        return await ctx.db.get(eventId);
      });

      expect(event?.guestCount?.expected).toBe(1);
    });

    it("should handle optional fields", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "555-1234",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: true,
          dietaryRestrictions: ["vegetarian", "gluten-free"],
          allergies: ["peanuts"],
          tags: ["vip"],
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.email).toBe("john@example.com");
      expect(guest?.phone).toBe("555-1234");
      expect(guest?.dietaryRestrictions).toEqual(["vegetarian", "gluten-free"]);
      expect(guest?.allergies).toEqual(["peanuts"]);
      expect(guest?.tags).toEqual(["vip"]);
    });

    it("should handle plus-one fields", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Alice",
          lastName: "Smith",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: true,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.plusOneAllowed).toBe(true);
    });
  });

  describe("get", () => {
    it("should return guest by ID", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Test",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "colleague",
          plusOneAllowed: false,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await getGuest(ctx, { guestId });
      });

      expect(guest).toBeDefined();
      expect(guest?._id).toBe(guestId);
      expect(guest?.firstName).toBe("Test");
      expect(guest?.lastName).toBe("Guest");
    });
  });

  describe("listByEvent", () => {
    it("should return all guests for event", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "One",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "Two",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: true,
        });

        return { eventId };
      });

      const guests = await t.run(async (ctx) => {
        return await listGuestsByEvent(ctx, { eventId });
      });

      expect(guests).toHaveLength(2);
      expect(guests.map((g) => g.lastName)).toContain("One");
      expect(guests.map((g) => g.lastName)).toContain("Two");
    });

    it("should filter by rsvpStatus if provided", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Attending",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          rsvpStatus: "attending",
        });

        await createGuest(ctx, {
          firstName: "Pending",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "pending",
        });

        return { eventId };
      });

      const guests = await t.run(async (ctx) => {
        return await listGuestsByEvent(ctx, {
          eventId,
          rsvpStatus: "attending",
        });
      });

      expect(guests).toHaveLength(1);
      expect(guests[0].firstName).toBe("Attending");
      expect(guests[0].rsvpStatus).toBe("attending");
    });

    it("should filter by guestType if provided", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Family",
          lastName: "Member",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        await createGuest(ctx, {
          firstName: "Friend",
          lastName: "Person",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
        });

        return { eventId };
      });

      const guests = await t.run(async (ctx) => {
        return await listGuestsByEvent(ctx, {
          eventId,
          guestType: "family",
        });
      });

      expect(guests).toHaveLength(1);
      expect(guests[0].firstName).toBe("Family");
      expect(guests[0].guestType).toBe("family");
    });

    it("should exclude soft-deleted guests", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Active",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        const deletedGuest = await createGuest(ctx, {
          firstName: "Deleted",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
        });

        await removeGuest(ctx, { guestId: deletedGuest });

        return { eventId };
      });

      const guests = await t.run(async (ctx) => {
        return await listGuestsByEvent(ctx, { eventId });
      });

      expect(guests).toHaveLength(1);
      expect(guests[0].firstName).toBe("Active");
    });
  });

  describe("getRsvpSummary", () => {
    it("should return total guest count", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "2",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "3",
          eventId,
          invitedBy: userId,
          guestType: "colleague",
          plusOneAllowed: false,
        });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getGuestRsvpSummary(ctx, { eventId });
      });

      expect(summary.total).toBe(3);
    });

    it("should return counts by RSVP status", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 2 attending
        await createGuest(ctx, {
          firstName: "Attending",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          rsvpStatus: "attending",
        });

        await createGuest(ctx, {
          firstName: "Attending",
          lastName: "2",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          rsvpStatus: "attending",
        });

        // 1 declined
        await createGuest(ctx, {
          firstName: "Declined",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "declined",
        });

        // 3 pending
        await createGuest(ctx, {
          firstName: "Pending",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "pending",
        });

        await createGuest(ctx, {
          firstName: "Pending",
          lastName: "2",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "pending",
        });

        await createGuest(ctx, {
          firstName: "Pending",
          lastName: "3",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "pending",
        });

        // 1 maybe
        await createGuest(ctx, {
          firstName: "Maybe",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "colleague",
          plusOneAllowed: false,
          rsvpStatus: "maybe",
        });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getGuestRsvpSummary(ctx, { eventId });
      });

      expect(summary.total).toBe(7);
      expect(summary.attending).toBe(2);
      expect(summary.declined).toBe(1);
      expect(summary.pending).toBe(3);
      expect(summary.maybe).toBe(1);
    });

    it("should return dietary restrictions aggregation", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "1",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          dietaryRestrictions: ["vegetarian"],
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "2",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          dietaryRestrictions: ["vegetarian", "gluten-free"],
        });

        await createGuest(ctx, {
          firstName: "Guest",
          lastName: "3",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          dietaryRestrictions: ["vegan"],
        });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getGuestRsvpSummary(ctx, { eventId });
      });

      expect(summary.dietaryRestrictions).toEqual({
        vegetarian: 2,
        "gluten-free": 1,
        vegan: 1,
      });
    });

    it("should exclude soft-deleted guests from counts", async () => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createGuest(ctx, {
          firstName: "Active",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          rsvpStatus: "attending",
        });

        const deletedGuest = await createGuest(ctx, {
          firstName: "Deleted",
          lastName: "Guest",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: false,
          rsvpStatus: "attending",
        });

        await removeGuest(ctx, { guestId: deletedGuest });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getGuestRsvpSummary(ctx, { eventId });
      });

      expect(summary.total).toBe(1);
      expect(summary.attending).toBe(1);
    });
  });

  describe("update", () => {
    it("should update guest fields", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          rsvpStatus: "attending",
          tableNumber: 5,
          seatNumber: 3,
          notes: "Needs wheelchair access",
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.rsvpStatus).toBe("attending");
      expect(guest?.tableNumber).toBe(5);
      expect(guest?.seatNumber).toBe(3);
      expect(guest?.notes).toBe("Needs wheelchair access");
    });

    it("should update RSVP date when status changes", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      const rsvpDate = Date.now();

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          rsvpStatus: "attending",
          rsvpDate,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.rsvpStatus).toBe("attending");
      expect(guest?.rsvpDate).toBe(rsvpDate);
    });

    it("should update plus-one fields", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: true,
        });
      });

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          plusOneName: "Jane Doe",
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.plusOneName).toBe("Jane Doe");
    });

    it("should update thank you fields", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          thankYouSent: true,
        });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.thankYouSent).toBe(true);
    });
  });

  describe("deleteGuest", () => {
    it("should soft delete guest", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Guest",
          lastName: "ToDelete",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      await t.run(async (ctx) => {
        await removeGuest(ctx, { guestId });
      });

      const guest = await t.run(async (ctx) => {
        return await ctx.db.get(guestId);
      });

      expect(guest?.deletedAt).toBeDefined();
      expect(guest?.deletedAt).toBeGreaterThan(0);
    });

    it("should update event guestCount.expected (decrement)", async () => {
      const t = convexTest(schema);

      const { eventId, guestId } = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const guestId = await createGuest(ctx, {
          firstName: "Guest",
          lastName: "One",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        return { eventId, guestId };
      });

      const beforeDelete = await t.run(async (ctx) => {
        const event = await ctx.db.get(eventId);
        return event?.guestCount?.expected;
      });

      expect(beforeDelete).toBe(1);

      await t.run(async (ctx) => {
        await removeGuest(ctx, { guestId });
      });

      const afterDelete = await t.run(async (ctx) => {
        const event = await ctx.db.get(eventId);
        return event?.guestCount?.expected;
      });

      expect(afterDelete).toBe(0);
    });

    it("should handle case when guestCount doesn't exist", async () => {
      const t = convexTest(schema);

      const { guestId } = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const guestId = await createGuest(ctx, {
          firstName: "Guest",
          lastName: "One",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });

        // Manually remove guestCount to test edge case
        await ctx.db.patch(eventId, {
          guestCount: undefined as any,
        });

        return { guestId };
      });

      // Should not throw error
      await expect(
        t.run(async (ctx) => {
          await removeGuest(ctx, { guestId });
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Special Tests", () => {
    it("should support RSVP workflow transitions", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      // pending -> maybe
      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          rsvpStatus: "maybe",
        });
      });

      let guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.rsvpStatus).toBe("maybe");

      // maybe -> attending
      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          rsvpStatus: "attending",
        });
      });

      guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.rsvpStatus).toBe("attending");

      // attending -> declined
      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          rsvpStatus: "declined",
        });
      });

      guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.rsvpStatus).toBe("declined");
    });

    it("should manage plus-one information", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "Alice",
          lastName: "Smith",
          eventId,
          invitedBy: userId,
          guestType: "friend",
          plusOneAllowed: true,
        });
      });

      // Add plus-one name
      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          plusOneName: "Bob Smith",
        });
      });

      const guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.plusOneAllowed).toBe(true);
      expect(guest?.plusOneName).toBe("Bob Smith");
    });

    it("should handle dietary restrictions array", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
          dietaryRestrictions: ["vegetarian", "gluten-free", "nut-free"],
          allergies: ["shellfish", "dairy"],
        });
      });

      const guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.dietaryRestrictions).toEqual(["vegetarian", "gluten-free", "nut-free"]);
      expect(guest?.allergies).toEqual(["shellfish", "dairy"]);
    });

    it("should support seating assignments", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          tableNumber: 7,
          seatNumber: 2,
        });
      });

      const guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.tableNumber).toBe(7);
      expect(guest?.seatNumber).toBe(2);
    });

    it("should track gift and thank you information", async () => {
      const t = convexTest(schema);

      const guestId = await t.run(async (ctx) => {
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
          guestCount: { confirmed: 0, expected: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createGuest(ctx, {
          firstName: "John",
          lastName: "Doe",
          eventId,
          invitedBy: userId,
          guestType: "family",
          plusOneAllowed: false,
        });
      });

      await t.run(async (ctx) => {
        await updateGuest(ctx, {
          guestId,
          thankYouSent: true,
        });
      });

      const guest = await t.run(async (ctx) => ctx.db.get(guestId));
      expect(guest?.thankYouSent).toBe(true);
    });
  });
});
