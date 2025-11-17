import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  createCheckpoint,
  getCheckpoint,
  getLatestCheckpoint,
  listCheckpointsByRoom,
  listCheckpointsByDO,
  generateChecksum,
  compressSnapshot,
  decompressSnapshot,
} from "./checkpoints";
import type { Id } from "./_generated/dataModel";

describe("checkpoints", () => {
  describe("create", () => {
    it("should create checkpoint with all required fields", async () => {
      const t = convexTest(schema);

      const { checkpointId, roomId } = await t.run(async (ctx) => {
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

        const snapshot = compressSnapshot({
          messages: [],
          state: "active",
          timestamp: Date.now(),
        });

        const checkpointId = await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-123",
          snapshot,
          messageCount: 42,
          memorySize: 2048,
          checksum: generateChecksum(snapshot),
        });

        return { checkpointId, roomId };
      });

      const checkpoint = await t.run(async (ctx) => {
        return await ctx.db.get(checkpointId);
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.roomId).toBe(roomId);
      expect(checkpoint?.doInstanceId).toBe("do-instance-123");
      expect(checkpoint?.messageCount).toBe(42);
      expect(checkpoint?.memorySize).toBe(2048);
      expect(checkpoint?.createdAt).toBeDefined();
    });

    it("should auto-increment checkpointId sequentially per room", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      const checkpointIds = await t.run(async (ctx) => {
        const ids = [];
        for (let i = 0; i < 3; i++) {
          const snapshot = compressSnapshot({
            messages: [],
            state: "active",
            timestamp: Date.now(),
          });

          const id = await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: i + 1,
            memorySize: 1024 * (i + 1),
          });
          ids.push(id);
        }
        return ids;
      });

      const checkpoints = await t.run(async (ctx) => {
        return await Promise.all(checkpointIds.map((id) => ctx.db.get(id)));
      });

      expect(checkpoints[0]?.checkpointId).toBe(0);
      expect(checkpoints[1]?.checkpointId).toBe(1);
      expect(checkpoints[2]?.checkpointId).toBe(2);
    });

    it("should handle multiple DO instances per room", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      const { checkpoint1Id, checkpoint2Id } = await t.run(async (ctx) => {
        const snapshot1 = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
        const snapshot2 = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });

        const checkpoint1Id = await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-1",
          snapshot: snapshot1,
          messageCount: 10,
          memorySize: 1024,
        });

        const checkpoint2Id = await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-2",
          snapshot: snapshot2,
          messageCount: 20,
          memorySize: 2048,
        });

        return { checkpoint1Id, checkpoint2Id };
      });

      const checkpoint1 = await t.run(async (ctx) => ctx.db.get(checkpoint1Id));
      const checkpoint2 = await t.run(async (ctx) => ctx.db.get(checkpoint2Id));

      expect(checkpoint1?.doInstanceId).toBe("do-instance-1");
      expect(checkpoint2?.doInstanceId).toBe("do-instance-2");
      expect(checkpoint1?.checkpointId).toBe(0);
      expect(checkpoint2?.checkpointId).toBe(1);
    });

    it("should store metadata (messageCount, memorySize)", async () => {
      const t = convexTest(schema);

      const checkpointId = await t.run(async (ctx) => {
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

        const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });

        return await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-123",
          snapshot,
          messageCount: 100,
          memorySize: 4096,
        });
      });

      const checkpoint = await t.run(async (ctx) => {
        return await ctx.db.get(checkpointId);
      });

      expect(checkpoint?.messageCount).toBe(100);
      expect(checkpoint?.memorySize).toBe(4096);
    });

    it("should generate checksum if provided", async () => {
      const t = convexTest(schema);

      const checkpointId = await t.run(async (ctx) => {
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

        const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });

        return await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-123",
          snapshot,
          messageCount: 50,
          memorySize: 2048,
          checksum: generateChecksum(snapshot),
        });
      });

      const checkpoint = await t.run(async (ctx) => {
        return await ctx.db.get(checkpointId);
      });

      expect(checkpoint?.checksum).toBeDefined();
    });
  });

  describe("get", () => {
    it("should return checkpoint by ID", async () => {
      const t = convexTest(schema);

      const checkpointId = await t.run(async (ctx) => {
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

        const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });

        return await createCheckpoint(ctx, {
          roomId,
          doInstanceId: "do-instance-123",
          snapshot,
          messageCount: 42,
          memorySize: 2048,
        });
      });

      const checkpoint = await t.run(async (ctx) => {
        return await getCheckpoint(ctx, { checkpointId });
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint?._id).toBe(checkpointId);
    });

    it("should return null for non-existent checkpoint", async () => {
      const t = convexTest(schema);

      const checkpoint = await t.run(async (ctx) => {
        return await getCheckpoint(ctx, { checkpointId: "checkpoints_nonexistent" as Id<"checkpoints"> });
      });

      expect(checkpoint).toBeNull();
    });
  });

  describe("getLatest", () => {
    it("should return latest checkpoint for room", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      // Create multiple checkpoints
      await t.run(async (ctx) => {
        for (let i = 0; i < 3; i++) {
          const snapshot = compressSnapshot({
            messages: [],
            state: "active",
            timestamp: Date.now(),
          });

          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const latest = await t.run(async (ctx) => {
        return await getLatestCheckpoint(ctx, { roomId });
      });

      expect(latest).toBeDefined();
      expect(latest?.checkpointId).toBe(2); // Should be the highest
      expect(latest?.messageCount).toBe(30);
    });

    it("should return null if no checkpoints exist", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      const latest = await t.run(async (ctx) => {
        return await getLatestCheckpoint(ctx, { roomId });
      });

      expect(latest).toBeNull();
    });
  });

  describe("listByRoom", () => {
    it("should return all checkpoints for room", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpoints = await t.run(async (ctx) => {
        return await listCheckpointsByRoom(ctx, { roomId });
      });

      expect(checkpoints).toHaveLength(5);
    });

    it("should order by checkpointId descending", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 3; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpoints = await t.run(async (ctx) => {
        return await listCheckpointsByRoom(ctx, { roomId });
      });

      // Should be ordered newest first
      expect(checkpoints[0].checkpointId).toBeGreaterThan(checkpoints[1].checkpointId);
      expect(checkpoints[1].checkpointId).toBeGreaterThan(checkpoints[2].checkpointId);
    });

    it("should limit results to default 10", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 15; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpoints = await t.run(async (ctx) => {
        return await listCheckpointsByRoom(ctx, { roomId });
      });

      expect(checkpoints).toHaveLength(10);
    });

    it("should respect custom limit parameter", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 10; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpoints = await t.run(async (ctx) => {
        return await listCheckpointsByRoom(ctx, { roomId, limit: 5 });
      });

      expect(checkpoints).toHaveLength(5);
    });
  });

  describe("listByDO", () => {
    it("should return all checkpoints for durable object instance", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        // Create checkpoints for two different DO instances
        for (let i = 0; i < 3; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-A",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }

        for (let i = 0; i < 2; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-B",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpointsA = await t.run(async (ctx) => {
        return await listCheckpointsByDO(ctx, { doInstanceId: "do-instance-A" });
      });

      const checkpointsB = await t.run(async (ctx) => {
        return await listCheckpointsByDO(ctx, { doInstanceId: "do-instance-B" });
      });

      expect(checkpointsA).toHaveLength(3);
      expect(checkpointsB).toHaveLength(2);
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema);

      const roomId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("rooms", {
          eventId,
          name: "Main Room",
          type: "main",
          isArchived: false,
          allowGuestMessages: false,
          createdAt: Date.now(),
          createdBy: userId,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          const snapshot = compressSnapshot({ messages: [], state: "active", timestamp: Date.now() });
          await createCheckpoint(ctx, {
            roomId,
            doInstanceId: "do-instance-123",
            snapshot,
            messageCount: (i + 1) * 10,
            memorySize: (i + 1) * 1024,
          });
        }
      });

      const checkpoints = await t.run(async (ctx) => {
        return await listCheckpointsByDO(ctx, { doInstanceId: "do-instance-123", limit: 3 });
      });

      expect(checkpoints).toHaveLength(3);
    });
  });

  describe("Helper functions", () => {
    describe("generateChecksum", () => {
      it("should generate consistent checksum for same snapshot", () => {
        const snapshot = "test snapshot data";
        const checksum1 = generateChecksum(snapshot);
        const checksum2 = generateChecksum(snapshot);

        expect(checksum1).toBe(checksum2);
      });

      it("should generate different checksums for different snapshots", () => {
        const snapshot1 = "snapshot 1";
        const snapshot2 = "snapshot 2";
        const checksum1 = generateChecksum(snapshot1);
        const checksum2 = generateChecksum(snapshot2);

        expect(checksum1).not.toBe(checksum2);
      });
    });

    describe("compressSnapshot", () => {
      it("should compress data to JSON string", () => {
        const data = { messages: [], state: "active", timestamp: Date.now() };
        const compressed = compressSnapshot(data);

        expect(typeof compressed).toBe("string");
        expect(compressed).toContain("messages");
        expect(compressed).toContain("state");
      });
    });

    describe("decompressSnapshot", () => {
      it("should decompress JSON string to object", () => {
        const data = { messages: [], state: "active", timestamp: 123456 };
        const compressed = compressSnapshot(data);
        const decompressed = decompressSnapshot(compressed);

        expect(decompressed).toEqual(data);
      });

      it("should throw error for invalid snapshot", () => {
        expect(() => decompressSnapshot("invalid json")).toThrow("Failed to decompress snapshot");
      });
    });

    describe("Round-trip compression", () => {
      it("should maintain data integrity through compression and decompression", () => {
        const originalData = {
          messages: [
            { id: "1", text: "Hello" },
            { id: "2", text: "World" },
          ],
          state: "active",
          timestamp: Date.now(),
          metadata: {
            count: 2,
            tags: ["test", "checkpoint"],
          },
        };

        const compressed = compressSnapshot(originalData);
        const decompressed = decompressSnapshot(compressed);

        expect(decompressed).toEqual(originalData);
      });
    });
  });
});
