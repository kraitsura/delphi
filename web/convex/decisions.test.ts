import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  createDecision,
  getDecision,
  listDecisionsByEvent,
  listDecisionsByRoom,
  voteOnDecision,
  closeDecision,
  updateDecision,
  deleteDecisionHelper,
} from "./decisions";
import type { Id } from "./_generated/dataModel";

describe("decisions", () => {
  describe("create", () => {
    it("should create a decision with all required fields", async () => {
      const t = convexTest(schema);

      const { decisionId, eventId, roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Which venue should we book?",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Venue A", votes: 0, voters: [] },
            { id: "opt-2", text: "Venue B", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        return { decisionId, eventId, roomId, userId };
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision).toBeDefined();
      expect(decision?.question).toBe("Which venue should we book?");
      expect(decision?.eventId).toBe(eventId);
      expect(decision?.roomId).toBe(roomId);
      expect(decision?.type).toBe("binary");
      expect(decision?.status).toBe("active");
      expect(decision?.createdAt).toBeDefined();
      expect(decision?.options).toHaveLength(2);
    });

    it("should set default status to active", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "multiple_choice",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.status).toBe("active");
    });

    it("should handle different decision types", async () => {
      const t = convexTest(schema);

      const types = ["binary", "multiple_choice", "ranked", "budget_allocation"];

      for (const type of types) {
        const decisionId = await t.run(async (ctx) => {
          const userId = await ctx.db.insert("users", {
            email: `user-${type}@example.com`,
            name: "Test User",
            username: `testuser${type}`,
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

          const roomId = await ctx.db.insert("rooms", {
            eventId,
            name: "Main Room",
            type: "main",
            isArchived: false,
            allowGuestMessages: false,
            createdAt: Date.now(),
            createdBy: userId,
          });

          return await createDecision(ctx, {
            question: `Test ${type} Decision`,
            eventId,
            roomId,
            type,
            options: [
              { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
              { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
            ],
            createdBy: userId,
            suggestedByAI: false,
          });
        });

        const decision = await t.run(async (ctx) => {
          return await ctx.db.get(decisionId);
        });

        expect(decision?.type).toBe(type);
      }
    });

    it("should store AI suggestion fields", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "AI suggested decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: true,
          aiReasoning: "Based on budget constraints and guest preferences",
        });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.suggestedByAI).toBe(true);
      expect(decision?.aiReasoning).toBe("Based on budget constraints and guest preferences");
    });

    it("should link to source message", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const messageId = await ctx.db.insert("messages", {
          roomId,
          authorId: userId,
          text: "What should we do about the venue?",
          isEdited: false,
          isAIGenerated: false,
          createdAt: Date.now(),
        });

        return await createDecision(ctx, {
          question: "Decision from message",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
          sourceMessageId: messageId,
        });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.sourceMessageId).toBeDefined();
    });
  });

  describe("get", () => {
    it("should return decision by ID", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      const decision = await t.run(async (ctx) => {
        return await getDecision(ctx, { decisionId });
      });

      expect(decision).toBeDefined();
      expect(decision?._id).toBe(decisionId);
    });

    it("should return null for non-existent decision", async () => {
      const t = convexTest(schema);

      const decision = await t.run(async (ctx) => {
        return await getDecision(ctx, { decisionId: "decisions_nonexistent" as Id<"decisions"> });
      });

      expect(decision).toBeNull();
    });
  });

  describe("listByEvent", () => {
    it("should return all decisions for event", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create three decisions
        for (let i = 0; i < 3; i++) {
          await createDecision(ctx, {
            question: `Decision ${i + 1}`,
            eventId,
            roomId,
            type: "binary",
            options: [
              { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
              { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
            ],
            createdBy: userId,
            suggestedByAI: false,
          });
        }

        return { eventId };
      });

      const decisions = await t.run(async (ctx) => {
        return await listDecisionsByEvent(ctx, { eventId });
      });

      expect(decisions).toHaveLength(3);
    });

    it("should filter by status", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create active decision
        await createDecision(ctx, {
          question: "Active Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        // Create and close a decision
        const closedDecisionId = await createDecision(ctx, {
          question: "Closed Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        await closeDecision(ctx, { decisionId: closedDecisionId });

        return { eventId };
      });

      const activeDecisions = await t.run(async (ctx) => {
        return await listDecisionsByEvent(ctx, { eventId, status: "active" });
      });

      const closedDecisions = await t.run(async (ctx) => {
        return await listDecisionsByEvent(ctx, { eventId, status: "closed" });
      });

      expect(activeDecisions).toHaveLength(1);
      expect(closedDecisions).toHaveLength(1);
    });

    it("should exclude soft-deleted decisions", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create decision
        const decisionId = await createDecision(ctx, {
          question: "Decision to Delete",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        // Delete decision
        await deleteDecisionHelper(ctx, { decisionId });

        return { eventId };
      });

      const decisions = await t.run(async (ctx) => {
        return await listDecisionsByEvent(ctx, { eventId });
      });

      expect(decisions).toHaveLength(0);
    });
  });

  describe("listByRoom", () => {
    it("should return all decisions for room", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create two decisions
        for (let i = 0; i < 2; i++) {
          await createDecision(ctx, {
            question: `Room Decision ${i + 1}`,
            eventId,
            roomId,
            type: "binary",
            options: [
              { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
              { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
            ],
            createdBy: userId,
            suggestedByAI: false,
          });
        }

        return { roomId };
      });

      const decisions = await t.run(async (ctx) => {
        return await listDecisionsByRoom(ctx, { roomId });
      });

      expect(decisions).toHaveLength(2);
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        // Create five decisions
        for (let i = 0; i < 5; i++) {
          await createDecision(ctx, {
            question: `Room Decision ${i + 1}`,
            eventId,
            roomId,
            type: "binary",
            options: [
              { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
              { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
            ],
            createdBy: userId,
            suggestedByAI: false,
          });
        }

        return { roomId };
      });

      const decisions = await t.run(async (ctx) => {
        return await listDecisionsByRoom(ctx, { roomId, limit: 3 });
      });

      expect(decisions).toHaveLength(3);
    });
  });

  describe("vote", () => {
    it("should increment vote count for selected option", async () => {
      const t = convexTest(schema);

      const { decisionId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        return { decisionId, userId };
      });

      await t.run(async (ctx) => {
        await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      const option1 = decision?.options.find(o => o.id === "opt-1");
      expect(option1?.votes).toBe(1);
      expect(option1?.voters).toContain(userId);
    });

    it("should prevent duplicate voting", async () => {
      const t = convexTest(schema);

      const { decisionId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        return { decisionId, userId };
      });

      // Vote twice
      await t.run(async (ctx) => {
        await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId });
        await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      const option1 = decision?.options.find(o => o.id === "opt-1");
      expect(option1?.votes).toBe(1); // Should still be 1
    });

    it("should allow changing vote to different option", async () => {
      const t = convexTest(schema);

      const { decisionId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        return { decisionId, userId };
      });

      // Vote for option 1, then change to option 2
      await t.run(async (ctx) => {
        await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId });
        await voteOnDecision(ctx, { decisionId, optionId: "opt-2", userId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      const option1 = decision?.options.find(o => o.id === "opt-1");
      const option2 = decision?.options.find(o => o.id === "opt-2");

      expect(option1?.votes).toBe(0);
      expect(option1?.voters).not.toContain(userId);
      expect(option2?.votes).toBe(1);
      expect(option2?.voters).toContain(userId);
    });

    it("should throw error if decision is closed", async () => {
      const t = convexTest(schema);

      const { decisionId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        // Close the decision
        await closeDecision(ctx, { decisionId });

        return { decisionId, userId };
      });

      await expect(
        t.run(async (ctx) => {
          await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId });
        })
      ).rejects.toThrow("Decision is not active");
    });
  });

  describe("close", () => {
    it("should set status to closed", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      await t.run(async (ctx) => {
        await closeDecision(ctx, { decisionId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.status).toBe("closed");
      expect(decision?.closedAt).toBeDefined();
    });

    it("should determine winning option by most votes", async () => {
      const t = convexTest(schema);

      const { decisionId } = await t.run(async (ctx) => {
        const userId1 = await ctx.db.insert("users", {
          email: "user1@example.com",
          name: "Test User 1",
          username: "testuser1",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const userId2 = await ctx.db.insert("users", {
          email: "user2@example.com",
          name: "Test User 2",
          username: "testuser2",
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eventId = await ctx.db.insert("events", {
          name: "Test Event",
          type: "wedding",
          status: "planning",
          coordinatorId: userId1,
          createdBy: userId1,
          budget: { total: 10000, currency: "USD", spent: 0, remaining: 10000, committed: 0 },
          guestCount: { confirmed: 0, expected: 100 },
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
          createdBy: userId1,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId1,
          suggestedByAI: false,
        });

        // Vote for different options
        await voteOnDecision(ctx, { decisionId, optionId: "opt-1", userId: userId1 });
        await voteOnDecision(ctx, { decisionId, optionId: "opt-2", userId: userId2 });

        return { decisionId, userId1, userId2 };
      });

      // Add one more vote for opt-2
      const userId3 = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "user3@example.com",
          name: "Test User 3",
          username: "testuser3",
          role: "collaborator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await voteOnDecision(ctx, { decisionId, optionId: "opt-2", userId: userId3 });
        await closeDecision(ctx, { decisionId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.selectedOption).toBe("opt-2");
    });

    it("should allow manual selection of winning option", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      await t.run(async (ctx) => {
        await closeDecision(ctx, { decisionId, selectedOption: "opt-1" });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.selectedOption).toBe("opt-1");
    });
  });

  describe("update", () => {
    it("should update decision fields", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Old Question",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      await t.run(async (ctx) => {
        await updateDecision(ctx, {
          decisionId,
          question: "Updated Question",
          description: "Updated description",
        });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.question).toBe("Updated Question");
      expect(decision?.description).toBe("Updated description");
    });

    it("should throw error if decision is closed", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        const decisionId = await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });

        await closeDecision(ctx, { decisionId });

        return decisionId;
      });

      await expect(
        t.run(async (ctx) => {
          await updateDecision(ctx, { decisionId, question: "New Question" });
        })
      ).rejects.toThrow("Cannot update closed or cancelled decision");
    });
  });

  describe("deleteDecision", () => {
    it("should soft delete decision", async () => {
      const t = convexTest(schema);

      const decisionId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });

        return await createDecision(ctx, {
          question: "Test Decision",
          eventId,
          roomId,
          type: "binary",
          options: [
            { id: "opt-1", text: "Option 1", votes: 0, voters: [] },
            { id: "opt-2", text: "Option 2", votes: 0, voters: [] },
          ],
          createdBy: userId,
          suggestedByAI: false,
        });
      });

      await t.run(async (ctx) => {
        await deleteDecisionHelper(ctx, { decisionId });
      });

      const decision = await t.run(async (ctx) => {
        return await ctx.db.get(decisionId);
      });

      expect(decision?.deletedAt).toBeDefined();
    });
  });
});
