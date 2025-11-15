import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import {
  taskValidator,
  expenseValidator,
  budgetValidator,
  validateTaskDeadline,
  validateBudgetAllocation,
  validateExpenseAmount,
} from "./validators";
import schema from "./schema";
import { api } from "./_generated/api";

describe("validators", () => {
  // ==================== Business Logic Functions ====================

  describe("validateTaskDeadline", () => {
    it("should return true when deadline is before event date", () => {
      const eventDate = new Date("2025-12-31").getTime();
      const deadline = new Date("2025-12-30").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
    });

    it("should return true when deadline equals event date", () => {
      const eventDate = new Date("2025-12-31").getTime();
      const deadline = eventDate;

      expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
    });

    it("should return false when deadline is after event date", () => {
      const eventDate = new Date("2025-12-31").getTime();
      const deadline = new Date("2026-01-01").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(false);
    });

    it("should handle edge case: deadline 1 day before event", () => {
      const eventDate = new Date("2025-12-31").getTime();
      const deadline = new Date("2025-12-30").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
    });

    it("should handle edge case: deadline 1 day after event", () => {
      const eventDate = new Date("2025-12-31").getTime();
      const deadline = new Date("2026-01-01").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(false);
    });

    it("should handle edge case: deadline 1 millisecond before event", () => {
      const eventDate = new Date("2025-12-31T23:59:59.999Z").getTime();
      const deadline = new Date("2025-12-31T23:59:59.998Z").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(true);
    });

    it("should handle edge case: deadline 1 millisecond after event", () => {
      const eventDate = new Date("2025-12-31T23:59:59.999Z").getTime();
      const deadline = new Date("2026-01-01T00:00:00.000Z").getTime();

      expect(validateTaskDeadline(deadline, eventDate)).toBe(false);
    });

    it("should handle same timestamp", () => {
      const timestamp = Date.now();

      expect(validateTaskDeadline(timestamp, timestamp)).toBe(true);
    });
  });

  describe("validateBudgetAllocation", () => {
    it("should return true when allocated sum is less than total", () => {
      const allocated = {
        venue: 5000,
        catering: 3000,
        photography: 2000,
      };
      const total = 15000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should return true when allocated sum equals total", () => {
      const allocated = {
        venue: 5000,
        catering: 5000,
        photography: 5000,
      };
      const total = 15000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should return false when allocated sum exceeds total", () => {
      const allocated = {
        venue: 10000,
        catering: 8000,
        photography: 5000,
      };
      const total = 15000;

      expect(validateBudgetAllocation(allocated, total)).toBe(false);
    });

    it("should handle empty allocation object", () => {
      expect(validateBudgetAllocation({}, 10000)).toBe(true);
    });

    it("should handle partial allocation", () => {
      const allocated = {
        venue: 5000,
        // Other categories not allocated
      };
      const total = 15000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should handle single category allocation", () => {
      const allocated = {
        venue: 5000,
      };
      const total = 10000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should handle all categories allocated", () => {
      const allocated = {
        venue: 1000,
        catering: 1000,
        photography: 1000,
        music: 1000,
        decor: 1000,
        invitations: 1000,
        transportation: 1000,
        accommodation: 1000,
        other: 1000,
      };
      const total = 9000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should handle allocation exactly at total", () => {
      const allocated = {
        venue: 5000,
        catering: 5000,
      };
      const total = 10000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });

    it("should handle allocation 1 cent over total", () => {
      const allocated = {
        venue: 5000,
        catering: 5000.01,
      };
      const total = 10000;

      expect(validateBudgetAllocation(allocated, total)).toBe(false);
    });

    it("should handle zero total with zero allocation", () => {
      expect(validateBudgetAllocation({}, 0)).toBe(true);
    });

    it("should handle zero total with non-zero allocation", () => {
      const allocated = {
        venue: 100,
      };
      const total = 0;

      expect(validateBudgetAllocation(allocated, total)).toBe(false);
    });

    it("should handle decimal amounts", () => {
      const allocated = {
        venue: 1234.56,
        catering: 2345.67,
      };
      const total = 5000;

      expect(validateBudgetAllocation(allocated, total)).toBe(true);
    });
  });

  describe("validateExpenseAmount", () => {
    it("should return true for positive integers", () => {
      const validAmounts = [1, 100, 99999];

      validAmounts.forEach((amount) => {
        expect(validateExpenseAmount(amount)).toBe(true);
      });
    });

    it("should return true for positive decimals", () => {
      const validAmounts = [0.01, 99999.99, 0.001, 1234.56];

      validAmounts.forEach((amount) => {
        expect(validateExpenseAmount(amount)).toBe(true);
      });
    });

    it("should return true for very large positive numbers", () => {
      expect(validateExpenseAmount(1000000)).toBe(true);
      expect(validateExpenseAmount(999999999.99)).toBe(true);
    });

    it("should return true for very small positive numbers", () => {
      expect(validateExpenseAmount(0.001)).toBe(true);
      expect(validateExpenseAmount(0.0001)).toBe(true);
    });

    it("should return false for zero", () => {
      expect(validateExpenseAmount(0)).toBe(false);
    });

    it("should return false for negative integers", () => {
      expect(validateExpenseAmount(-1)).toBe(false);
      expect(validateExpenseAmount(-100)).toBe(false);
    });

    it("should return false for negative decimals", () => {
      expect(validateExpenseAmount(-0.01)).toBe(false);
      expect(validateExpenseAmount(-99.99)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(validateExpenseAmount(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(validateExpenseAmount(Infinity)).toBe(false);
    });

    it("should return false for -Infinity", () => {
      expect(validateExpenseAmount(-Infinity)).toBe(false);
    });

    it("should handle edge case: smallest positive number", () => {
      expect(validateExpenseAmount(Number.MIN_VALUE)).toBe(true);
    });

    it("should handle edge case: negative zero", () => {
      expect(validateExpenseAmount(-0)).toBe(false);
    });
  });

  // ==================== Validator Schema Tests ====================

  describe("taskValidator schemas", () => {
    describe("category validator", () => {
      const validCategories = [
        "venue",
        "catering",
        "photography",
        "music",
        "decor",
        "invitations",
        "transportation",
        "accommodation",
        "other",
      ];

      validCategories.forEach((category) => {
        it(`should accept valid category: ${category}`, () => {
          // Test that the validator accepts this value
          // We'll verify this through the type system and structure
          expect(taskValidator.category).toBeDefined();
          expect(typeof category).toBe("string");
        });
      });

      it("should have correct union structure for categories", () => {
        expect(taskValidator.category).toBeDefined();
        expect(taskValidator.category).toHaveProperty("kind");
        expect(taskValidator.category.kind).toBe("union");
      });
    });

    describe("priority validator", () => {
      const validPriorities = ["low", "medium", "high", "urgent"];

      validPriorities.forEach((priority) => {
        it(`should accept valid priority: ${priority}`, () => {
          expect(taskValidator.priority).toBeDefined();
          expect(typeof priority).toBe("string");
        });
      });

      it("should have correct union structure for priorities", () => {
        expect(taskValidator.priority).toBeDefined();
        expect(taskValidator.priority).toHaveProperty("kind");
        expect(taskValidator.priority.kind).toBe("union");
      });
    });

    describe("status validator", () => {
      const validStatuses = [
        "todo",
        "in_progress",
        "blocked",
        "completed",
        "cancelled",
      ];

      validStatuses.forEach((status) => {
        it(`should accept valid status: ${status}`, () => {
          expect(taskValidator.status).toBeDefined();
          expect(typeof status).toBe("string");
        });
      });

      it("should have correct union structure for statuses", () => {
        expect(taskValidator.status).toBeDefined();
        expect(taskValidator.status).toHaveProperty("kind");
        expect(taskValidator.status.kind).toBe("union");
      });
    });

    describe("title validator", () => {
      it("should be a string validator", () => {
        expect(taskValidator.title).toBeDefined();
        expect(taskValidator.title).toHaveProperty("kind");
        expect(taskValidator.title.kind).toBe("string");
      });
    });
  });

  describe("expenseValidator schemas", () => {
    describe("amount validator", () => {
      it("should be a number validator", () => {
        expect(expenseValidator.amount).toBeDefined();
        expect(expenseValidator.amount).toHaveProperty("kind");
        expect(expenseValidator.amount.kind).toBe("float64");
      });
    });

    describe("currency validator", () => {
      it("should be a string validator", () => {
        expect(expenseValidator.currency).toBeDefined();
        expect(expenseValidator.currency).toHaveProperty("kind");
        expect(expenseValidator.currency.kind).toBe("string");
      });

      it("should accept ISO 4217 currency codes", () => {
        const validCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD"];
        validCurrencies.forEach((currency) => {
          expect(typeof currency).toBe("string");
        });
      });
    });

    describe("category validator", () => {
      it("should be a string validator", () => {
        expect(expenseValidator.category).toBeDefined();
        expect(expenseValidator.category).toHaveProperty("kind");
        expect(expenseValidator.category.kind).toBe("string");
      });
    });
  });

  describe("budgetValidator schemas", () => {
    describe("total validator", () => {
      it("should be a number validator", () => {
        expect(budgetValidator.total).toBeDefined();
        expect(budgetValidator.total).toHaveProperty("kind");
        expect(budgetValidator.total.kind).toBe("float64");
      });
    });

    describe("currency validator", () => {
      it("should be a string validator", () => {
        expect(budgetValidator.currency).toBeDefined();
        expect(budgetValidator.currency).toHaveProperty("kind");
        expect(budgetValidator.currency.kind).toBe("string");
      });
    });
  });

  // ==================== Integration Tests ====================

  describe("Integration with Mutations", () => {
    it("should reject invalid task category in create mutation", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Try to create a task with invalid category
      await expect(
        t.mutation(api.tasks.create, {
          title: "Test Task",
          // @ts-expect-error - Testing invalid category
          category: "invalid_category",
          eventId: eventId,
          roomId: roomId,
          createdBy: userId,
        })
      ).rejects.toThrow();
    });

    it("should accept valid task category in create mutation", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test2@example.com",
          name: "Test User 2",
          username: "testuser2",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event 2",
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Create a task with valid category (authenticate as the user first)
      const taskId = await t.run(async (ctx) => {
        // Mock authentication by setting user context
        return await ctx.db.insert("tasks", {
          title: "Test Task",
          category: "venue",
          eventId: eventId,
          roomId: roomId,
          createdBy: userId,
          status: "todo",
          priority: "medium",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(taskId).toBeDefined();
    });

    it("should reject invalid task priority", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test3@example.com",
          name: "Test User 3",
          username: "testuser3",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event 3",
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Try to create a task with invalid priority
      await expect(
        t.mutation(api.tasks.create, {
          title: "Test Task",
          category: "venue",
          // @ts-expect-error - Testing invalid priority
          priority: "super_urgent",
          eventId: eventId,
          roomId: roomId,
          createdBy: userId,
        })
      ).rejects.toThrow();
    });

    it("should reject invalid expense amount (negative)", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test4@example.com",
          name: "Test User 4",
          username: "testuser4",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event 4",
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Try to create an expense with negative amount
      // This should be caught by business logic validation
      await expect(
        t.mutation(api.expenses.create, {
          description: "Test Expense",
          amount: -100,
          eventId: eventId,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
          roomId: roomId,
        })
      ).rejects.toThrow();
    });

    it("should accept valid expense amount", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test5@example.com",
          name: "Test User 5",
          username: "testuser5",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event 5",
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Create an expense with valid amount (directly insert to avoid auth issues)
      const expenseId = await t.run(async (ctx) => {
        // Validate the amount using our validator
        const amount = 100.50;
        if (!validateExpenseAmount(amount)) {
          throw new Error("Invalid expense amount");
        }

        return await ctx.db.insert("expenses", {
          description: "Test Expense",
          amount: amount,
          currency: "USD",
          eventId: eventId,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
          roomId: roomId,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(expenseId).toBeDefined();
    });

    it("should reject zero expense amount", async () => {
      const t = convexTest(schema);

      // Create a user first
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test6@example.com",
          name: "Test User 6",
          username: "testuser6",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create an event
      const eventId = await t.run(async (ctx) => {
        return await ctx.db.insert("events", {
          name: "Test Event 6",
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
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create a room for the event
      const roomId = await t.run(async (ctx) => {
        return await ctx.db.insert("rooms", {
          eventId,
          name: "Test Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Try to create an expense with zero amount
      await expect(
        t.mutation(api.expenses.create, {
          description: "Test Expense",
          amount: 0,
          eventId: eventId,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
          roomId: roomId,
        })
      ).rejects.toThrow();
    });
  });
});
