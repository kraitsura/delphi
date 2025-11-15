import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  createTaskGroup,
  getTaskGroup,
  listTaskGroupsByEvent,
  updateTaskGroup,
  removeTaskGroup,
} from "./taskGroups";

describe("TaskGroups CRUD Operations", () => {
  describe("create", () => {
    it("should create task group with name and eventId", async () => {
      const t = convexTest(schema);

      const { groupId, eventId } = await t.run(async (ctx) => {
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

        const groupId = await createTaskGroup(ctx, {
          name: "Venue Tasks",
          eventId,
          createdBy: userId,
        });

        return { groupId, eventId };
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group).toBeDefined();
      expect(group?.name).toBe("Venue Tasks");
      expect(group?.eventId).toBe(eventId);
    });

    it("should auto-increment order field", async () => {
      const t = convexTest(schema);

      const { groups } = await t.run(async (ctx) => {
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

        const group1 = await createTaskGroup(ctx, {
          name: "Group 1",
          eventId,
          createdBy: userId,
        });

        const group2 = await createTaskGroup(ctx, {
          name: "Group 2",
          eventId,
          createdBy: userId,
        });

        const group3 = await createTaskGroup(ctx, {
          name: "Group 3",
          eventId,
          createdBy: userId,
        });

        return {
          groups: [
            await ctx.db.get(group1),
            await ctx.db.get(group2),
            await ctx.db.get(group3),
          ],
        };
      });

      expect(groups[0]?.order).toBe(0);
      expect(groups[1]?.order).toBe(1);
      expect(groups[2]?.order).toBe(2);
    });

    it("should initialize taskCount to 0", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.taskCount).toBe(0);
    });

    it("should initialize completedCount to 0", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.completedCount).toBe(0);
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const beforeCreate = Date.now();

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(group?.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(group?.createdAt).toBe(group?.updatedAt);
    });

    it("should handle optional fields", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Catering Tasks",
          description: "All catering-related tasks",
          color: "#FF5733",
          icon: "utensils",
          eventId,
          roomId,
          createdBy: userId,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.description).toBe("All catering-related tasks");
      expect(group?.color).toBe("#FF5733");
      expect(group?.icon).toBe("utensils");
    });
  });

  describe("get", () => {
    it("should return task group by ID", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      const group = await t.run(async (ctx) => {
        return await getTaskGroup(ctx, { groupId });
      });

      expect(group).toBeDefined();
      expect(group?._id).toBe(groupId);
      expect(group?.name).toBe("Test Group");
    });
  });

  describe("listByEvent", () => {
    it("should return all groups for event", async () => {
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

        await createTaskGroup(ctx, {
          name: "Group 1",
          eventId,
          createdBy: userId,
        });

        await createTaskGroup(ctx, {
          name: "Group 2",
          eventId,
          createdBy: userId,
        });

        await createTaskGroup(ctx, {
          name: "Group 3",
          eventId,
          createdBy: userId,
        });

        return { eventId };
      });

      const groups = await t.run(async (ctx) => {
        return await listTaskGroupsByEvent(ctx, { eventId });
      });

      expect(groups).toHaveLength(3);
      expect(groups.map((g) => g.name)).toContain("Group 1");
      expect(groups.map((g) => g.name)).toContain("Group 2");
      expect(groups.map((g) => g.name)).toContain("Group 3");
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

        await createTaskGroup(ctx, {
          name: "First",
          eventId,
          createdBy: userId,
        });

        await createTaskGroup(ctx, {
          name: "Second",
          eventId,
          createdBy: userId,
        });

        await createTaskGroup(ctx, {
          name: "Third",
          eventId,
          createdBy: userId,
        });

        return { eventId };
      });

      const groups = await t.run(async (ctx) => {
        return await listTaskGroupsByEvent(ctx, { eventId });
      });

      expect(groups[0].name).toBe("First");
      expect(groups[0].order).toBe(0);
      expect(groups[1].name).toBe("Second");
      expect(groups[1].order).toBe(1);
      expect(groups[2].name).toBe("Third");
      expect(groups[2].order).toBe(2);
    });

    it("should exclude soft-deleted groups", async () => {
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

        await createTaskGroup(ctx, {
          name: "Active Group",
          eventId,
          createdBy: userId,
        });

        const group2 = await createTaskGroup(ctx, {
          name: "Deleted Group",
          eventId,
          createdBy: userId,
        });

        // Soft delete group2
        await removeTaskGroup(ctx, { groupId: group2 });

        return { eventId };
      });

      const groups = await t.run(async (ctx) => {
        return await listTaskGroupsByEvent(ctx, { eventId });
      });

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("Active Group");
    });
  });

  describe("update", () => {
    it("should update group fields", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Original Name",
          eventId,
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await updateTaskGroup(ctx, {
          groupId,
          name: "Updated Name",
          description: "Updated description",
          color: "#00FF00",
          order: 5,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.name).toBe("Updated Name");
      expect(group?.description).toBe("Updated description");
      expect(group?.color).toBe("#00FF00");
      expect(group?.order).toBe(5);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      const beforeUpdate = await t.run(async (ctx) => {
        const group = await ctx.db.get(groupId);
        return group?.updatedAt;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await updateTaskGroup(ctx, {
          groupId,
          name: "Updated Group",
        });
      });

      const afterUpdate = await t.run(async (ctx) => {
        const group = await ctx.db.get(groupId);
        return group?.updatedAt;
      });

      expect(afterUpdate).toBeGreaterThan(beforeUpdate!);
    });
  });

  describe("deleteGroup", () => {
    it("should soft delete group", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Group to Delete",
          eventId,
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await removeTaskGroup(ctx, { groupId });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.deletedAt).toBeDefined();
      expect(group?.deletedAt).toBeGreaterThan(0);
    });

    it("should remove groupId from all tasks in the group", async () => {
      const t = convexTest(schema);

      const { groupId, taskIds } = await t.run(async (ctx) => {
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

        const groupId = await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });

        // Create tasks in the group
        const task1 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 1",
          status: "todo",
          priority: "medium",
          category: "other",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        const task2 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 2",
          status: "todo",
          priority: "medium",
          category: "other",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        return { groupId, taskIds: [task1, task2] };
      });

      await t.run(async (ctx) => {
        await removeTaskGroup(ctx, { groupId });
      });

      const tasks = await t.run(async (ctx) => {
        return await Promise.all(taskIds.map((id) => ctx.db.get(id)));
      });

      expect(tasks[0]?.groupId).toBeUndefined();
      expect(tasks[1]?.groupId).toBeUndefined();
    });

    it("should update task updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const { groupId, taskIds } = await t.run(async (ctx) => {
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

        const groupId = await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });

        const task1 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 1",
          status: "todo",
          priority: "medium",
          category: "other",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        return { groupId, taskIds: [task1] };
      });

      const beforeDelete = await t.run(async (ctx) => {
        const task = await ctx.db.get(taskIds[0]);
        return task?.updatedAt;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await removeTaskGroup(ctx, { groupId });
      });

      const afterDelete = await t.run(async (ctx) => {
        const task = await ctx.db.get(taskIds[0]);
        return task?.updatedAt;
      });

      expect(afterDelete).toBeGreaterThan(beforeDelete!);
    });
  });

  describe("Special Tests", () => {
    it("should auto-increment order correctly with multiple groups", async () => {
      const t = convexTest(schema);

      const { groups } = await t.run(async (ctx) => {
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

        const ids = [];
        for (let i = 0; i < 5; i++) {
          const id = await createTaskGroup(ctx, {
            name: `Group ${i}`,
            eventId,
            createdBy: userId,
          });
          ids.push(id);
        }

        return {
          groups: await Promise.all(ids.map((id) => ctx.db.get(id))),
        };
      });

      for (let i = 0; i < 5; i++) {
        expect(groups[i]?.order).toBe(i);
      }
    });

    it("should support manual task count updates", async () => {
      const t = convexTest(schema);

      const groupId = await t.run(async (ctx) => {
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

        return await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });
      });

      // Manually update task count (simulating what task mutations would do)
      await t.run(async (ctx) => {
        await ctx.db.patch(groupId, {
          taskCount: 5,
          completedCount: 2,
        });
      });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.taskCount).toBe(5);
      expect(group?.completedCount).toBe(2);
    });

    it("should orphan tasks correctly when group is deleted", async () => {
      const t = convexTest(schema);

      const { groupId, taskIds } = await t.run(async (ctx) => {
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

        const groupId = await createTaskGroup(ctx, {
          name: "Test Group",
          eventId,
          createdBy: userId,
        });

        const task1 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 1",
          status: "todo",
          priority: "medium",
          category: "other",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        const task2 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 2",
          status: "todo",
          priority: "medium",
          category: "other",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        const task3 = await ctx.db.insert("tasks", {
          eventId,
          roomId,
          title: "Task 3",
          status: "completed",
          priority: "high",
          category: "venue",
          groupId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
        });

        return { groupId, taskIds: [task1, task2, task3] };
      });

      // Verify tasks have groupId before deletion
      const beforeDelete = await t.run(async (ctx) => {
        return await Promise.all(taskIds.map((id) => ctx.db.get(id)));
      });

      beforeDelete.forEach((task) => {
        expect(task?.groupId).toBe(groupId);
      });

      // Delete the group
      await t.run(async (ctx) => {
        await removeTaskGroup(ctx, { groupId });
      });

      // Verify tasks are orphaned (groupId removed) after deletion
      const afterDelete = await t.run(async (ctx) => {
        return await Promise.all(taskIds.map((id) => ctx.db.get(id)));
      });

      afterDelete.forEach((task) => {
        expect(task?.groupId).toBeUndefined();
        // Tasks should still exist
        expect(task).toBeDefined();
        expect(task?.title).toBeTruthy();
      });
    });

    it("should handle reordering of groups", async () => {
      const t = convexTest(schema);

      const { groupIds } = await t.run(async (ctx) => {
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

        const group1 = await createTaskGroup(ctx, {
          name: "Group 1",
          eventId,
          createdBy: userId,
        });

        const group2 = await createTaskGroup(ctx, {
          name: "Group 2",
          eventId,
          createdBy: userId,
        });

        const group3 = await createTaskGroup(ctx, {
          name: "Group 3",
          eventId,
          createdBy: userId,
        });

        return { groupIds: [group1, group2, group3] };
      });

      // Reorder: move group3 to position 0
      await t.run(async (ctx) => {
        await updateTaskGroup(ctx, {
          groupId: groupIds[2],
          order: 0,
        });

        await updateTaskGroup(ctx, {
          groupId: groupIds[0],
          order: 1,
        });

        await updateTaskGroup(ctx, {
          groupId: groupIds[1],
          order: 2,
        });
      });

      const groups = await t.run(async (ctx) => {
        return await Promise.all(groupIds.map((id) => ctx.db.get(id)));
      });

      expect(groups[2]?.order).toBe(0); // Group 3 is now first
      expect(groups[0]?.order).toBe(1); // Group 1 is now second
      expect(groups[1]?.order).toBe(2); // Group 2 is now third
    });
  });
});
