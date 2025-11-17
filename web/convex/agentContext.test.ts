import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  fetchEventContext,
  fetchRoomContext,
  fetchTaskDependencies,
} from "./agentContext";

// Helper function to generate username from name
const generateUsername = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "");
};

describe("agentContext", () => {
  // ==========================================
  // getEventContext Tests
  // ==========================================
  describe("getEventContext", () => {
    describe("Basic Functionality", () => {
      it("should return complete event data with all fields", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Wedding",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            eventDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
            budget: {
              total: 50000,
              currency: "USD",
              spent: 0,
              remaining: 50000,
              committed: 0,
            },
            guestCount: { confirmed: 0, expected: 150 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context).toBeDefined();
        expect(context?.event.name).toBe("Test Wedding");
        expect(context?.event.type).toBe("wedding");
        expect(context?.event.status).toBe("planning");
        expect(context?.event.budget.total).toBe(50000);
      });

      it("should return null if event doesn't exist", async () => {
        const t = convexTest(schema);

        // Create and then delete an event to get a valid but non-existent ID
        const eventId = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "temp@test.com",
            name: "Temp User",
            username: generateUsername("Temp User"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Temp Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.delete(eventId);
          return eventId;
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context).toBeNull();
      });

      it("should fetch all related entities", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create tasks
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Book venue",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Choose caterer",
            category: "catering",
            status: "completed",
            priority: "medium",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create expenses
          await ctx.db.insert("expenses", {
            eventId,
            description: "Venue deposit",
            amount: 2000,
            currency: "USD",
            category: "venue",
            paidBy: userId,
            paidAt: Date.now(),
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create vendor
          await ctx.db.insert("vendors", {
            eventId,
            name: "Elegant Catering",
            category: "catering",
            status: "contracted",
            addedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create guest
          await ctx.db.insert("guests", {
            eventId,
            firstName: "John",
            lastName: "Doe",
            guestType: "family",
            rsvpStatus: "attending",
            invitedBy: userId,
            plusOneAllowed: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create milestone
          await ctx.db.insert("milestones", {
            eventId,
            name: "Venue confirmed",
            category: "venue",
            targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
            status: "completed",
            criticality: "critical",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context).toBeDefined();
        expect(context?.tasks).toHaveLength(2);
        expect(context?.expenses).toHaveLength(1);
        expect(context?.vendors).toHaveLength(1);
        expect(context?.guests).toHaveLength(1);
      });

      it("should exclude soft-deleted entities", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Active task
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Active task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Soft-deleted task
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Deleted task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: Date.now(),
          });

          // Soft-deleted expense
          await ctx.db.insert("expenses", {
            eventId,
            description: "Deleted expense",
            amount: 1000,
            currency: "USD",
            category: "venue",
            paidBy: userId,
            paidAt: Date.now(),
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context).toBeDefined();
        expect(context?.tasks).toHaveLength(1);
        expect(context?.tasks[0].title).toBe("Active task");
        expect(context?.expenses).toHaveLength(0);
      });
    });

    describe("Statistics Calculation", () => {
      it("should calculate task stats correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create tasks with different statuses
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task 1",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task 2",
            category: "catering",
            status: "todo",
            priority: "medium",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task 3",
            category: "catering",
            status: "in_progress",
            priority: "low",
            deadline: Date.now() - 1000, // Overdue
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.stats.tasks.total).toBe(3);
        expect(context?.stats.tasks.completed).toBe(1);
        expect(context?.stats.tasks.overdue).toBe(1);
        expect(context?.stats.tasks.byCategory.venue).toBe(1);
        expect(context?.stats.tasks.byCategory.catering).toBe(2);
      });

      it("should calculate budget stats correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create expenses
          await ctx.db.insert("expenses", {
            eventId,
            description: "Venue",
            amount: 3000,
            currency: "USD",
            category: "venue",
            paidBy: userId,
            paidAt: Date.now(),
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("expenses", {
            eventId,
            description: "Catering",
            amount: 2000,
            currency: "USD",
            category: "catering",
            paidBy: userId,
            paidAt: Date.now(),
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create payment schedule
          await ctx.db.insert("paymentSchedules", {
            eventId,
            description: "Final payment",
            amount: 1500,
            currency: "USD",
            dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: "upcoming",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.stats.budget.total).toBe(10000);
        expect(context?.stats.budget.spent).toBe(5000);
        expect(context?.stats.budget.remaining).toBe(5000);
        expect(context?.stats.budget.scheduled).toBe(1500);
        expect(context?.stats.budget.byCategory.venue).toBe(3000);
        expect(context?.stats.budget.byCategory.catering).toBe(2000);
      });

      it("should calculate vendor stats correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create vendors
          await ctx.db.insert("vendors", {
            eventId,
            name: "Vendor 1",
            category: "catering",
            status: "contracted",
            addedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("vendors", {
            eventId,
            name: "Vendor 2",
            category: "photography",
            status: "researching",
            addedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("vendors", {
            eventId,
            name: "Vendor 3",
            category: "catering",
            status: "contacted",
            addedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.stats.vendors.total).toBe(3);
        expect(context?.stats.vendors.contracted).toBe(1);
        expect(context?.stats.vendors.byCategory.catering).toBe(2);
        expect(context?.stats.vendors.byCategory.photography).toBe(1);
      });

      it("should calculate guest stats correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create guests with different RSVP statuses
          await ctx.db.insert("guests", {
            eventId,
            firstName: "John",
            lastName: "Doe",
            guestType: "family",
            rsvpStatus: "attending",
            invitedBy: userId,
            plusOneAllowed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("guests", {
            eventId,
            firstName: "Jane",
            lastName: "Smith",
            guestType: "friend",
            rsvpStatus: "pending",
            invitedBy: userId,
            plusOneAllowed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("guests", {
            eventId,
            firstName: "Bob",
            lastName: "Johnson",
            guestType: "colleague",
            rsvpStatus: "declined",
            invitedBy: userId,
            plusOneAllowed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.stats.guests.total).toBe(3);
        expect(context?.stats.guests.attending).toBe(1);
        expect(context?.stats.guests.pending).toBe(1);
        expect(context?.stats.guests.declined).toBe(1);
      });

      it("should calculate milestone stats correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create milestones
          await ctx.db.insert("milestones", {
            eventId,
            name: "Milestone 1",
            category: "venue",
            targetDate: Date.now(),
            status: "completed",
            criticality: "critical",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("milestones", {
            eventId,
            name: "Milestone 2",
            category: "catering",
            targetDate: Date.now(),
            status: "in_progress",
            criticality: "important",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("milestones", {
            eventId,
            name: "Milestone 3",
            category: "decor",
            targetDate: Date.now(),
            status: "at_risk",
            criticality: "critical",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.stats.milestones.total).toBe(3);
        expect(context?.stats.milestones.completed).toBe(1);
        expect(context?.stats.milestones.critical).toBe(1); // Only uncompleted critical
        expect(context?.stats.milestones.atRisk).toBe(1);
      });

      it("should calculate daysUntilEvent correctly", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            eventDate,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.daysUntilEvent).toBeGreaterThanOrEqual(29);
        expect(context?.daysUntilEvent).toBeLessThanOrEqual(31);
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty event (no related entities)", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Empty Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context).toBeDefined();
        expect(context?.tasks).toHaveLength(0);
        expect(context?.expenses).toHaveLength(0);
        expect(context?.vendors).toHaveLength(0);
        expect(context?.guests).toHaveLength(0);
        expect(context?.stats.tasks.total).toBe(0);
        expect(context?.stats.budget.spent).toBe(0);
        expect(context?.stats.vendors.total).toBe(0);
        expect(context?.stats.guests.total).toBe(0);
      });

      it("should handle missing eventDate (daysUntilEvent should be null)", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "No Date Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // No eventDate
          });

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        expect(context?.daysUntilEvent).toBeNull();
      });

      it("should handle large dataset (limits entities correctly)", async () => {
        const t = convexTest(schema);

        const { eventId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "coordinator@test.com",
            name: "Test Coordinator",
            username: generateUsername("Test Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Large Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 100000,
              currency: "USD",
              spent: 0,
              remaining: 100000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create 30 tasks (should be limited to 20)
          for (let i = 0; i < 30; i++) {
            await ctx.db.insert("tasks", {
              eventId,
              roomId,
              title: `Task ${i}`,
              category: "other",
              status: "todo",
              priority: "medium",
              createdBy: userId,
              createdAt: Date.now() + i, // Ensure different timestamps
              updatedAt: Date.now(),
            });
          }

          // Create 60 guests (should be limited to 50)
          for (let i = 0; i < 60; i++) {
            await ctx.db.insert("guests", {
              eventId,
              firstName: `Guest${i}`,
              lastName: "Test",
              guestType: "friend",
              rsvpStatus: "pending",
              invitedBy: userId,
              plusOneAllowed: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

          return { eventId };
        });

        const context = await t.run(async (ctx) =>
          fetchEventContext(ctx, { eventId })
        );

        // Check that tasks are limited to 20
        expect(context?.tasks).toHaveLength(20);
        // Check that stats still show all 30
        expect(context?.stats.tasks.total).toBe(30);
        // Guests should be limited to 50
        expect(context?.guests).toHaveLength(50);
        expect(context?.stats.guests.total).toBe(60);
      });
    });
  });

  // ==========================================
  // getRoomContext Tests
  // ==========================================
  describe("getRoomContext", () => {
    describe("Basic Functionality", () => {
      it("should return messages for room", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create messages
          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "Hello world",
            isEdited: false,
            isAIGenerated: false,
            createdAt: Date.now(),
          });

          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "Second message",
            isEdited: false,
            isAIGenerated: false,
            createdAt: Date.now() + 1000,
          });

          return { roomId };
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context).toBeDefined();
        expect(context?.room._id).toBe(roomId);
        expect(context?.messages).toHaveLength(2);
        expect(context?.messages[0].text).toBe("Hello world");
        expect(context?.messages[1].text).toBe("Second message");
      });

      it("should return empty array if room has no messages", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Empty Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          return { roomId };
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context).toBeDefined();
        expect(context?.messages).toHaveLength(0);
      });

      it("should return null if room doesn't exist", async () => {
        const t = convexTest(schema);

        // Create and then delete a room to get a valid but non-existent ID
        const roomId = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "temp@test.com",
            name: "Temp User",
            username: generateUsername("Temp User"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Temp Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Temp Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          await ctx.db.delete(roomId);
          return roomId;
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context).toBeNull();
      });

      it("should respect limit parameter (default 10)", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create 15 messages
          for (let i = 0; i < 15; i++) {
            await ctx.db.insert("messages", {
              roomId,
              authorId: userId,
              text: `Message ${i}`,
              isEdited: false,
              isAIGenerated: false,
              createdAt: Date.now() + i * 1000,
            });
          }

          return { roomId };
        });

        // Test default limit (10)
        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context?.messages).toHaveLength(10);
      });
    });

    describe("Message Enrichment", () => {
      it("should enrich messages with author info", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "Test message",
            isEdited: false,
            isAIGenerated: false,
            createdAt: Date.now(),
          });

          return { roomId };
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context?.messages[0].author).toBeDefined();
        expect((context?.messages[0].author as any)?.name).toBe("Test User");
        expect((context?.messages[0].author as any)?.email).toBe("user@test.com");
      });

      // NOTE: Skipping this test because convex-test doesn't allow inserting
      // messages with authorId = "agent" (not a valid user ID). In production,
      // agent messages would be created through a different code path.
      it.skip("should handle agent messages (authorId = 'agent') gracefully", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          await ctx.db.insert("messages", {
            roomId,
            authorId: "agent" as any,
            text: "AI generated message",
            isEdited: false,
            isAIGenerated: true,
            createdAt: Date.now(),
          });

          return { roomId };
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context?.messages[0].author).toBeDefined();
        expect((context?.messages[0].author as any)?._id).toBe("agent");
        expect((context?.messages[0].author as any)?.name).toBe("Delphi");
      });
    });

    describe("Ordering & Filtering", () => {
      it("should return messages in chronological order (oldest first)", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const baseTime = Date.now();

          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "First message",
            isEdited: false,
            isAIGenerated: false,
            createdAt: baseTime,
          });

          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "Second message",
            isEdited: false,
            isAIGenerated: false,
            createdAt: baseTime + 1000,
          });

          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: "Third message",
            isEdited: false,
            isAIGenerated: false,
            createdAt: baseTime + 2000,
          });

          return { roomId };
        });

        const context = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId })
        );

        expect(context?.messages[0].text).toBe("First message");
        expect(context?.messages[1].text).toBe("Second message");
        expect(context?.messages[2].text).toBe("Third message");
      });

      it("should respect custom limit parameter", async () => {
        const t = convexTest(schema);

        const { roomId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create 20 messages
          for (let i = 0; i < 20; i++) {
            await ctx.db.insert("messages", {
              roomId,
              authorId: userId,
              text: `Message ${i}`,
              isEdited: false,
              isAIGenerated: false,
              createdAt: Date.now() + i * 1000,
            });
          }

          return { roomId };
        });

        // Test limit of 5
        const context5 = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId, messageLimit: 5 })
        );
        expect(context5?.messages).toHaveLength(5);

        // Test limit of 15
        const context15 = await t.run(async (ctx) =>
          fetchRoomContext(ctx, { roomId, messageLimit: 15 })
        );
        expect(context15?.messages).toHaveLength(15);
      });
    });
  });

  // ==========================================
  // getTaskDependencies Tests
  // ==========================================
  describe("getTaskDependencies", () => {
    describe("Basic Functionality", () => {
      it("should return task with dependencies and blockers", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Main task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context).toBeDefined();
        expect(context?.task._id).toBe(taskId);
        expect(context?.task.title).toBe("Main task");
      });

      it("should return null if task doesn't exist", async () => {
        const t = convexTest(schema);

        // Create and then delete a task to get a valid but non-existent ID
        const taskId = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "temp@test.com",
            name: "Temp User",
            username: generateUsername("Temp User"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Temp Event",
            type: "wedding",
            status: "planning",
            coordinatorId: userId,
            createdBy: userId,
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Temp Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Temp task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.delete(taskId);
          return taskId;
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context).toBeNull();
      });

      it("should return empty arrays if no dependencies/blockers", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Independent task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.dependencies).toHaveLength(0);
        expect(context?.blockers).toHaveLength(0);
        expect(context?.dependents).toHaveLength(0);
      });
    });

    describe("Dependency Resolution", () => {
      it("should fetch all tasks in dependsOn array", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const dependency1 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Dependency 1",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const dependency2 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Dependency 2",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Main task",
            category: "venue",
            status: "todo",
            priority: "high",
            dependsOn: [dependency1, dependency2],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.dependencies).toHaveLength(2);
        expect(context?.dependencies[0].title).toBe("Dependency 1");
        expect(context?.dependencies[1].title).toBe("Dependency 2");
      });

      it("should fetch all tasks in blockedBy array", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const blocker1 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 1",
            category: "venue",
            status: "in_progress",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const blocker2 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 2",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocked task",
            category: "venue",
            status: "blocked",
            priority: "high",
            blockedBy: [blocker1, blocker2],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.blockers).toHaveLength(2);
        expect(context?.blockers[0].title).toBe("Blocker 1");
        expect(context?.blockers[1].title).toBe("Blocker 2");
      });

      it("should find reverse dependencies (tasks that depend on this one)", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Base task",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Create tasks that depend on taskId
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Dependent 1",
            category: "venue",
            status: "todo",
            priority: "high",
            dependsOn: [taskId],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Dependent 2",
            category: "venue",
            status: "todo",
            priority: "high",
            dependsOn: [taskId],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.dependents).toHaveLength(2);
        expect(context?.dependents[0].title).toBe("Dependent 1");
        expect(context?.dependents[1].title).toBe("Dependent 2");
      });
    });

    describe("canStart Calculation", () => {
      it("should return canStart: true if all blockers are completed", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const blocker1 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 1",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const blocker2 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 2",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Ready task",
            category: "venue",
            status: "todo",
            priority: "high",
            blockedBy: [blocker1, blocker2],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.canStart).toBe(true);
      });

      it("should return canStart: false if any blocker is not completed", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const blocker1 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 1",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const blocker2 = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocker 2",
            category: "venue",
            status: "in_progress",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Blocked task",
            category: "venue",
            status: "blocked",
            priority: "high",
            blockedBy: [blocker1, blocker2],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.canStart).toBe(false);
      });

      it("should return canStart: true if no blockers exist", async () => {
        const t = convexTest(schema);

        const { taskId } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          const taskId = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Unblocked task",
            category: "venue",
            status: "todo",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskId };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId })
        );

        expect(context?.canStart).toBe(true);
      });
    });

    describe("Edge Cases", () => {
      it("should handle deep dependency chains", async () => {
        const t = convexTest(schema);

        const { taskD } = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: "user@test.com",
            name: "Test User",
            username: generateUsername("Test User"),
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
            budget: {
              total: 10000,
              currency: "USD",
              spent: 0,
              remaining: 10000,
              committed: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          // Create chain: A -> B -> C -> D
          const taskA = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task A",
            category: "venue",
            status: "completed",
            priority: "high",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskB = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task B",
            category: "venue",
            status: "completed",
            priority: "high",
            dependsOn: [taskA],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskC = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task C",
            category: "venue",
            status: "in_progress",
            priority: "high",
            dependsOn: [taskB],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const taskD = await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: "Task D",
            category: "venue",
            status: "todo",
            priority: "high",
            dependsOn: [taskC],
            blockedBy: [taskC],
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { taskD };
        });

        const context = await t.run(async (ctx) =>
          fetchTaskDependencies(ctx, { taskId: taskD })
        );

        expect(context?.dependencies).toHaveLength(1);
        expect(context?.dependencies[0].title).toBe("Task C");
        expect(context?.blockers).toHaveLength(1);
        expect(context?.blockers[0].title).toBe("Task C");
        expect(context?.canStart).toBe(false);
      });
    });
  });

  // ==========================================
  // Performance Benchmarks
  // ==========================================
  describe("Performance Benchmarks", () => {
    it("getEventContext with realistic dataset should be < 200ms", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "coordinator@test.com",
          name: "Test Coordinator",
          username: generateUsername("Test Coordinator"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Performance Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId,
          createdBy: userId,
          eventDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
          budget: {
            total: 100000,
            currency: "USD",
            spent: 0,
            remaining: 100000,
            committed: 0,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create 50 tasks
        for (let i = 0; i < 50; i++) {
          await ctx.db.insert("tasks", {
            eventId,
            roomId,
            title: `Task ${i}`,
            category: i % 2 === 0 ? "venue" : "catering",
            status: i % 3 === 0 ? "completed" : "todo",
            priority: "medium",
            createdBy: userId,
            createdAt: Date.now() + i,
            updatedAt: Date.now(),
          });
        }

        // Create 30 expenses
        for (let i = 0; i < 30; i++) {
          await ctx.db.insert("expenses", {
            eventId,
            description: `Expense ${i}`,
            amount: 1000 + i * 100,
            currency: "USD",
            category: i % 2 === 0 ? "venue" : "catering",
            paidBy: userId,
            paidAt: Date.now(),
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create 20 vendors
        for (let i = 0; i < 20; i++) {
          await ctx.db.insert("vendors", {
            eventId,
            name: `Vendor ${i}`,
            category: "catering",
            status: i % 2 === 0 ? "contracted" : "researching",
            addedBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create 50 guests
        for (let i = 0; i < 50; i++) {
          await ctx.db.insert("guests", {
            eventId,
            firstName: `Guest${i}`,
            lastName: "Test",
            guestType: "friend",
            rsvpStatus: i % 3 === 0 ? "attending" : "pending",
            invitedBy: userId,
            plusOneAllowed: i % 2 === 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create 10 payment schedules
        for (let i = 0; i < 10; i++) {
          await ctx.db.insert("paymentSchedules", {
            eventId,
            description: `Payment ${i}`,
            amount: 1000,
            currency: "USD",
            dueDate: Date.now() + i * 7 * 24 * 60 * 60 * 1000,
            status: i % 2 === 0 ? "upcoming" : "paid",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Create 10 milestones
        for (let i = 0; i < 10; i++) {
          await ctx.db.insert("milestones", {
            eventId,
            name: `Milestone ${i}`,
            category: "venue",
            targetDate: Date.now() + i * 14 * 24 * 60 * 60 * 1000,
            status: i % 3 === 0 ? "completed" : "in_progress",
            criticality: i % 2 === 0 ? "critical" : "important",
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        return { eventId };
      });

      const start = Date.now();
      const context = await t.run(async (ctx) =>
        fetchEventContext(ctx, { eventId })
      );
      const duration = Date.now() - start;

      console.log(`getEventContext took ${duration}ms`);

      expect(context).toBeDefined();
      expect(duration).toBeLessThan(200);
    });

    it("getRoomContext with 100+ messages should be performant", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@test.com",
          name: "Test User",
          username: generateUsername("Test User"),
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
          budget: {
            total: 10000,
            currency: "USD",
            spent: 0,
            remaining: 10000,
            committed: 0,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create 100 messages
        for (let i = 0; i < 100; i++) {
          await ctx.db.insert("messages", {
            roomId,
            authorId: userId,
            text: `Message ${i}`,
            isEdited: false,
            isAIGenerated: false,
            createdAt: Date.now() + i * 1000,
          });
        }

        return { roomId };
      });

      const start = Date.now();
      const context = await t.run(async (ctx) =>
        fetchRoomContext(ctx, { roomId, messageLimit: 50 })
      );
      const duration = Date.now() - start;

      console.log(`getRoomContext took ${duration}ms`);

      expect(context).toBeDefined();
      expect(context?.messages).toHaveLength(50);
      expect(duration).toBeLessThan(200);
    });
  });
});
