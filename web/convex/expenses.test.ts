import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { authComponent } from "./authComponent";
import {
  listExpensesByEvent,
  getExpenseById,
  createExpense,
  updateExpense,
  updateExpenseSplitPayment,
  removeExpense,
  getEventBudgetSummary,
} from "./expenses";
import type { Id } from "./_generated/dataModel";

// Mock authComponent for authentication
vi.mock("./auth", () => ({
  authComponent: {
    getAuthUser: vi.fn(),
  },
}));

const generateUsername = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "");
};

describe("expenses", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create expense with all required fields", async () => {
      const t = convexTest(schema);

      const { expenseId, userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        const expenseId = await createExpense(ctx, {
          eventId,
          description: "Venue deposit",
          amount: 2500,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
        });

        return { expenseId, eventId, userId };
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense).toBeDefined();
      expect(expense?.description).toBe("Venue deposit");
      expect(expense?.amount).toBe(2500);
      expect(expense?.currency).toBe("USD");
      expect(expense?.category).toBe("venue");
      expect(expense?.paidBy).toBe(userId);
      expect(expense?.createdBy).toBe(userId);
      expect(expense?.createdAt).toBeDefined();
    });

    it("should set default currency to USD", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Test Expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.currency).toBe("USD");
    });

    it("should set default category to other", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Test Expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.category).toBe("other");
    });

    it("should throw error for negative amount", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);
      });

      await expect(
        t.run(async (ctx) => {
          const userId = (await ctx.db.query("users").first())?._id!;
          const eventId = (await ctx.db.query("events").first())?._id!;
          return await createExpense(ctx, {
            eventId,
            description: "Invalid Expense",
            amount: -100,
            paidBy: userId,
            paidAt: Date.now(),
          });
        })
      ).rejects.toThrow("Expense amount must be positive");
    });

    it("should handle split structure with custom type", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "User 1",
          username: generateUsername("User 1"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const user2Id = await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "User 2",
          username: generateUsername("User 2"),
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: user1Id,
          createdBy: user1Id,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId: user1Id,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: user1Id,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user1@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Shared expense",
          amount: 200,
          paidBy: user1Id,
          paidAt: Date.now(),
          split: [
            { userId: user1Id, amount: 100, isPaid: true },
            { userId: user2Id, amount: 100, isPaid: false },
          ],
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.split).toBeDefined();
      expect(expense?.split?.type).toBe("custom");
      expect(expense?.split?.participants).toHaveLength(2);
      expect(expense?.split?.participants[0].amount).toBe(100);
      expect(expense?.split?.participants[1].amount).toBe(100);
    });

    it("should validate that split amounts sum to total expense amount", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "User 1",
          username: generateUsername("User 1"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "User 2",
          username: generateUsername("User 2"),
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: user1Id,
          createdBy: user1Id,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId: user1Id,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: user1Id,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user1@example.com",
          id: "auth-123",
        } as any);
      });

      await expect(
        t.run(async (ctx) => {
          const user1Id = (await ctx.db.query("users").filter(q => q.eq(q.field("email"), "user1@example.com")).first())?._id!;
          const user2Id = (await ctx.db.query("users").filter(q => q.eq(q.field("email"), "user2@example.com")).first())?._id!;
          const eventId = (await ctx.db.query("events").first())?._id!;

          return await createExpense(ctx, {
            eventId,
            description: "Invalid split",
            amount: 200,
            paidBy: user1Id,
            paidAt: Date.now(),
            split: [
              { userId: user1Id, amount: 50, isPaid: true },
              { userId: user2Id, amount: 100, isPaid: false },
            ],
          });
        })
      ).rejects.toThrow("Split amounts must sum to total expense amount");
    });

    it("should handle receipt URL", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Expense with receipt",
          amount: 150,
          paidBy: userId,
          paidAt: Date.now(),
          receiptUrl: "https://example.com/receipt.pdf",
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.receiptUrl).toBe("https://example.com/receipt.pdf");
    });

    it("should handle payment method", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Card payment",
          amount: 250,
          paidBy: userId,
          paidAt: Date.now(),
          paymentMethod: "card",
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.paymentMethod).toBe("card");
    });
  });

  describe("getById", () => {
    it("should return expense by ID", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Test Expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      const expense = await t.run(async (ctx) => {
        return await getExpenseById(ctx, { expenseId });
      });

      expect(expense).toBeDefined();
      expect(expense?._id).toBe(expenseId);
    });

    it("should throw error for non-existent expense", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: generateUsername("Test User"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);
      });

      await expect(
        t.run(async (ctx) => {
          return await getExpenseById(ctx, { expenseId: "expenses_nonexistent" as Id<"expenses"> });
        })
      ).rejects.toThrow("Expense not found");
    });
  });

  describe("listByEvent", () => {
    it("should return all expenses for event", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        // Create three expenses
        for (let i = 0; i < 3; i++) {
          await createExpense(ctx, {
            eventId,
            description: `Expense ${i + 1}`,
            amount: (i + 1) * 100,
            paidBy: userId,
            paidAt: Date.now(),
          });
        }

        return { eventId };
      });

      const expenses = await t.run(async (ctx) => {
        return await listExpensesByEvent(ctx, { eventId });
      });

      expect(expenses).toHaveLength(3);
    });

    it("should exclude deleted expenses", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        const expense1Id = await createExpense(ctx, {
          eventId,
          description: "Expense 1",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Expense 2",
          amount: 200,
          paidBy: userId,
          paidAt: Date.now(),
        });

        // Delete first expense
        await removeExpense(ctx, { expenseId: expense1Id });

        return { eventId };
      });

      const expenses = await t.run(async (ctx) => {
        return await listExpensesByEvent(ctx, { eventId });
      });

      expect(expenses).toHaveLength(1);
      expect(expenses[0].description).toBe("Expense 2");
    });
  });

  describe("update", () => {
    it("should update expense fields", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Old description",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await updateExpense(ctx, {
          expenseId,
          description: "New description",
          amount: 150,
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.description).toBe("New description");
      expect(expense?.amount).toBe(150);
    });

    it("should validate split amounts when updating splits", async () => {
      const t = convexTest(schema);

      const { expenseId, user1Id, user2Id } = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "User 1",
          username: generateUsername("User 1"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const user2Id = await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "User 2",
          username: generateUsername("User 2"),
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: user1Id,
          createdBy: user1Id,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId: user1Id,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: user1Id,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user1@example.com",
          id: "auth-123",
        } as any);

        const expenseId = await createExpense(ctx, {
          eventId,
          description: "Shared expense",
          amount: 200,
          paidBy: user1Id,
          paidAt: Date.now(),
        });

        return { expenseId, user1Id, user2Id };
      });

      await expect(
        t.run(async (ctx) => {
          await updateExpense(ctx, {
            expenseId,
            split: [
              { userId: user1Id, amount: 50, isPaid: true },
              { userId: user2Id, amount: 100, isPaid: false },
            ],
          });
        })
      ).rejects.toThrow("Split amounts must sum to total expense amount");
    });

    it("should throw error for negative amount", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Test Expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      await expect(
        t.run(async (ctx) => {
          await updateExpense(ctx, {
            expenseId,
            amount: -50,
          });
        })
      ).rejects.toThrow("Expense amount must be positive");
    });
  });

  describe("updateSplitPayment", () => {
    it("should update payment status for split participant", async () => {
      const t = convexTest(schema);

      const { expenseId, user2Id } = await t.run(async (ctx) => {
        const user1Id = await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "User 1",
          username: generateUsername("User 1"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const user2Id = await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "User 2",
          username: generateUsername("User 2"),
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: user1Id,
          createdBy: user1Id,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId: user1Id,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: user1Id,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user1@example.com",
          id: "auth-123",
        } as any);

        const expenseId = await createExpense(ctx, {
          eventId,
          description: "Shared expense",
          amount: 200,
          paidBy: user1Id,
          paidAt: Date.now(),
          split: [
            { userId: user1Id, amount: 100, isPaid: true },
            { userId: user2Id, amount: 100, isPaid: false },
          ],
        });

        return { expenseId, user2Id };
      });

      await t.run(async (ctx) => {
        await updateExpenseSplitPayment(ctx, {
          expenseId,
          userId: user2Id,
          isPaid: true,
        });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      const user2Participant = expense?.split?.participants.find((p) => p.userId === user2Id);
      expect(user2Participant?.paid).toBe(true);
    });

    it("should throw error if expense has no splits", async () => {
      const t = convexTest(schema);

      const { expenseId, userId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        const expenseId = await createExpense(ctx, {
          eventId,
          description: "Non-split expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });

        return { expenseId, userId };
      });

      await expect(
        t.run(async (ctx) => {
          await updateExpenseSplitPayment(ctx, {
            expenseId,
            userId,
            isPaid: true,
          });
        })
      ).rejects.toThrow("This expense does not have splits");
    });
  });

  describe("remove", () => {
    it("should soft delete expense", async () => {
      const t = convexTest(schema);

      const expenseId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return await createExpense(ctx, {
          eventId,
          description: "Test Expense",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await removeExpense(ctx, { expenseId });
      });

      const expense = await t.run(async (ctx) => {
        return await ctx.db.get(expenseId);
      });

      expect(expense?.deletedAt).toBeDefined();
    });
  });

  describe("getBudgetSummary", () => {
    it("should calculate total expenses", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        // Create expenses
        await createExpense(ctx, {
          eventId,
          description: "Expense 1",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Expense 2",
          amount: 200,
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Expense 3",
          amount: 150,
          paidBy: userId,
          paidAt: Date.now(),
        });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getEventBudgetSummary(ctx, { eventId });
      });

      expect(summary.total).toBe(450);
    });

    it("should aggregate by category", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        // Create expenses in different categories
        await createExpense(ctx, {
          eventId,
          description: "Venue deposit",
          amount: 2000,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Venue final payment",
          amount: 3000,
          category: "venue",
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Catering",
          amount: 1500,
          category: "catering",
          paidBy: userId,
          paidAt: Date.now(),
        });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getEventBudgetSummary(ctx, { eventId });
      });

      expect(summary.byCategory.venue.total).toBe(5000);
      expect(summary.byCategory.venue.count).toBe(2);
      expect(summary.byCategory.catering.total).toBe(1500);
      expect(summary.byCategory.catering.count).toBe(1);
    });

    it("should return event budget info", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getEventBudgetSummary(ctx, { eventId });
      });

      expect(summary.budget).toBeDefined();
      expect(summary.budget?.total).toBe(10000);
      expect(summary.budget?.currency).toBe("USD");
    });

    it("should exclude soft-deleted expenses", async () => {
      const t = convexTest(schema);

      const { eventId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
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
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("eventMembers", {
          eventId,
          userId,
          role: "coordinator",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        vi.mocked(authComponent.getAuthUser).mockResolvedValue({
          email: "user@example.com",
          id: "auth-123",
        } as any);

        const expense1Id = await createExpense(ctx, {
          eventId,
          description: "Expense 1",
          amount: 100,
          paidBy: userId,
          paidAt: Date.now(),
        });

        await createExpense(ctx, {
          eventId,
          description: "Expense 2",
          amount: 200,
          paidBy: userId,
          paidAt: Date.now(),
        });

        // Delete first expense
        await removeExpense(ctx, { expenseId: expense1Id });

        return { eventId };
      });

      const summary = await t.run(async (ctx) => {
        return await getEventBudgetSummary(ctx, { eventId });
      });

      expect(summary.total).toBe(200);
    });
  });
});
