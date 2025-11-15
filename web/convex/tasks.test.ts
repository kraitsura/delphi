import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { authComponent } from "./auth";
import {
  listTasksByEvent,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  removeTask,
  listTasksByRoom,
  searchTasks,
} from "./tasks";
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

describe("tasks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create task with all required fields", async () => {
      const t = convexTest(schema);

      const { taskId, eventId, roomId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        const taskId = await createTask(ctx, {
          eventId,
          roomId,
          title: "Book venue",
          description: "Find and book the perfect venue",
          category: "venue",
          priority: "high",
        });

        return { taskId, eventId, roomId, userId };
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task).toBeDefined();
      expect(task?.title).toBe("Book venue");
      expect(task?.eventId).toBe(eventId);
      expect(task?.roomId).toBe(roomId);
      expect(task?.category).toBe("venue");
      expect(task?.status).toBe("todo");
      expect(task?.priority).toBe("high");
      expect(task?.createdBy).toBe(userId);
      expect(task?.createdAt).toBeDefined();
      expect(task?.updatedAt).toBeDefined();
    });

    it("should set default status to todo", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.status).toBe("todo");
    });

    it("should set default priority to medium", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.priority).toBe("medium");
    });

    it("should set default category to other", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.category).toBe("other");
    });

    it("should handle assignedTo field", async () => {
      const t = convexTest(schema);

      const { taskId, userId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        const taskId = await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
          assignedTo: userId,
        });

        return { taskId, userId };
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.assignedTo).toBe(userId);
    });

    it("should store estimated cost with confidence", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Book venue",
          estimatedCost: {
            min: 5000,
            max: 8000,
            currency: "USD",
            confidence: 0.8,
          },
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.estimatedCost).toBeDefined();
      expect(task?.estimatedCost?.min).toBe(5000);
      expect(task?.estimatedCost?.max).toBe(8000);
      expect(task?.estimatedCost?.currency).toBe("USD");
      expect(task?.estimatedCost?.confidence).toBe(0.8);
    });

    it("should handle deadline field", async () => {
      const t = convexTest(schema);

      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
          deadline,
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.deadline).toBe(deadline);
    });
  });

  describe("getById", () => {
    it("should return task by ID", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      const task = await t.run(async (ctx) => {
        return await getTaskById(ctx, { taskId });
      });

      expect(task).toBeDefined();
      expect(task?._id).toBe(taskId);
    });

    it("should throw error for non-existent task", async () => {
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
          return await getTaskById(ctx, { taskId: "tasks_nonexistent" as Id<"tasks"> });
        })
      ).rejects.toThrow("Task not found");
    });

    it("should throw error for deleted task", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        const taskId = await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });

        // Delete the task
        await removeTask(ctx, { taskId });

        return taskId;
      });

      await expect(
        t.run(async (ctx) => {
          return await getTaskById(ctx, { taskId });
        })
      ).rejects.toThrow("Task not found");
    });
  });

  describe("listByEvent", () => {
    it("should return all tasks for event", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        // Create three tasks
        for (let i = 0; i < 3; i++) {
          await createTask(ctx, {
            eventId,
            roomId,
            title: `Task ${i + 1}`,
          });
        }

        return { eventId };
      });

      const tasks = await t.run(async (ctx) => {
        return await listTasksByEvent(ctx, { eventId });
      });

      expect(tasks).toHaveLength(3);
    });

    it("should exclude deleted tasks", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        // Create two tasks
        const task1Id = await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 1",
        });

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 2",
        });

        // Delete first task
        await removeTask(ctx, { taskId: task1Id });

        return { eventId };
      });

      const tasks = await t.run(async (ctx) => {
        return await listTasksByEvent(ctx, { eventId });
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Task 2");
    });
  });

  describe("listByRoom", () => {
    it("should return tasks for room", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        // Create two tasks
        for (let i = 0; i < 2; i++) {
          await createTask(ctx, {
            eventId,
            roomId,
            title: `Room Task ${i + 1}`,
          });
        }

        return { roomId };
      });

      const tasks = await t.run(async (ctx) => {
        return await listTasksByRoom(ctx, { roomId });
      });

      expect(tasks).toHaveLength(2);
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        // Create five tasks
        for (let i = 0; i < 5; i++) {
          await createTask(ctx, {
            eventId,
            roomId,
            title: `Task ${i + 1}`,
          });
        }

        return { roomId };
      });

      const tasks = await t.run(async (ctx) => {
        return await listTasksByRoom(ctx, { roomId, limit: 3 });
      });

      expect(tasks).toHaveLength(3);
    });

    it("should exclude soft-deleted tasks", async () => {
      const t = convexTest(schema);

      const { roomId } = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        const task1Id = await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 1",
        });

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 2",
        });

        // Delete first task
        await removeTask(ctx, { taskId: task1Id });

        return { roomId };
      });

      const tasks = await t.run(async (ctx) => {
        return await listTasksByRoom(ctx, { roomId });
      });

      expect(tasks).toHaveLength(1);
    });
  });

  describe("search", () => {
    it("should search tasks by title", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Book venue for wedding",
        });

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Order catering",
        });

        return { eventId };
      });

      const results = await t.run(async (ctx) => {
        return await searchTasks(ctx, { eventId, searchTerm: "venue" });
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Book venue for wedding");
    });

    it("should search tasks by description", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 1",
          description: "This task is about photography",
        });

        await createTask(ctx, {
          eventId,
          roomId,
          title: "Task 2",
          description: "This task is about catering",
        });

        return { eventId };
      });

      const results = await t.run(async (ctx) => {
        return await searchTasks(ctx, { eventId, searchTerm: "photography" });
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Task 1");
    });

    it("should perform case-insensitive search", async () => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        await createTask(ctx, {
          eventId,
          roomId,
          title: "BOOK VENUE",
        });

        return { eventId };
      });

      const results = await t.run(async (ctx) => {
        return await searchTasks(ctx, { eventId, searchTerm: "book" });
      });

      expect(results).toHaveLength(1);
    });
  });

  describe("update", () => {
    it("should update task fields", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Old Title",
          description: "Old Description",
        });
      });

      await t.run(async (ctx) => {
        await updateTask(ctx, {
          taskId,
          title: "New Title",
          description: "New Description",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.title).toBe("New Title");
      expect(task?.description).toBe("New Description");
      expect(task?.updatedAt).toBeDefined();
    });

    it("should set completedAt when status changes to completed", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      await t.run(async (ctx) => {
        await updateTask(ctx, {
          taskId,
          status: "completed",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.status).toBe("completed");
      expect(task?.completedAt).toBeDefined();
    });
  });

  describe("updateStatus", () => {
    it("should update task status", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      await t.run(async (ctx) => {
        await updateTaskStatus(ctx, {
          taskId,
          status: "in_progress",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.status).toBe("in_progress");
    });

    it("should set completedAt when status changes to completed", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      await t.run(async (ctx) => {
        await updateTaskStatus(ctx, {
          taskId,
          status: "completed",
        });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.status).toBe("completed");
      expect(task?.completedAt).toBeDefined();
    });
  });

  describe("remove", () => {
    it("should soft delete task", async () => {
      const t = convexTest(schema);

      const taskId = await t.run(async (ctx) => {
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

        const roomId = await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
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

        return await createTask(ctx, {
          eventId,
          roomId,
          title: "Test Task",
        });
      });

      await t.run(async (ctx) => {
        await removeTask(ctx, { taskId });
      });

      const task = await t.run(async (ctx) => {
        return await ctx.db.get(taskId);
      });

      expect(task?.deletedAt).toBeDefined();
    });
  });
});
