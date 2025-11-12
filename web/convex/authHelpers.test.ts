import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  getAuthenticatedUser,
  getOptionalUser,
  hasRole,
  hasAnyRole,
  requireRole,
  requireAnyRole,
  isEventCoordinator,
  canManageEvent,
  requireEventCoordinator,
  getUserEventRole,
  requireRoomAccess,
  canPostInRoom,
  requireCanPostInRoom,
  updateLastActive,
} from "./authHelpers";
import { factories } from "../src/test/factories";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

// Mock authComponent.getAuthUser for all tests
vi.mock("./auth", () => ({
  authComponent: {
    getAuthUser: vi.fn(),
  },
}));

// Helper function to generate username from name
const generateUsername = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "");
};

describe("authHelpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthenticatedUser", () => {
    it("should return user and userProfile for authenticated user", async () => {
      const t = convexTest(schema);

      // Create a user in the database
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          username: generateUsername("Test User"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Mock auth
      const authUser = { email: "test@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      const result = await t.run(async (ctx) => {
        return await getAuthenticatedUser(ctx);
      });

      expect(result.user).toEqual(authUser);
      expect(result.userProfile._id).toBe(userId);
      expect(result.userProfile.email).toBe("test@example.com");
    });

    it("should throw error if user is not authenticated", async () => {
      const t = convexTest(schema);

      vi.mocked(authComponent.getAuthUser).mockResolvedValue(null as any);

      await expect(
        t.run(async (ctx) => {
          return await getAuthenticatedUser(ctx);
        })
      ).rejects.toThrow("Unauthorized: No authenticated user");
    });

    it("should throw error if user profile not found", async () => {
      const t = convexTest(schema);

      const authUser = { email: "nonexistent@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      await expect(
        t.run(async (ctx) => {
          return await getAuthenticatedUser(ctx);
        })
      ).rejects.toThrow("User profile not found");
    });

    it("should throw error if account is inactive", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          email: "inactive@example.com",
          name: "Inactive User",
          username: generateUsername("Inactive User"),
          role: "coordinator",
          isActive: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const authUser = { email: "inactive@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      await expect(
        t.run(async (ctx) => {
          return await getAuthenticatedUser(ctx);
        })
      ).rejects.toThrow("Account is inactive");
    });
  });

  describe("getOptionalUser", () => {
    it("should return user for authenticated user", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          email: "test@example.com",
          name: "Test User",
          username: generateUsername("Test User"),
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const authUser = { email: "test@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      const result = await t.run(async (ctx) => {
        return await getOptionalUser(ctx);
      });

      expect(result).not.toBeNull();
      expect(result?.user).toEqual(authUser);
    });

    it("should return null for unauthenticated user", async () => {
      const t = convexTest(schema);

      vi.mocked(authComponent.getAuthUser).mockResolvedValue(null as any);

      const result = await t.run(async (ctx) => {
        return await getOptionalUser(ctx);
      });

      expect(result).toBeNull();
    });

    it("should return null if profile not found", async () => {
      const t = convexTest(schema);

      const authUser = { email: "nonexistent@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      const result = await t.run(async (ctx) => {
        return await getOptionalUser(ctx);
      });

      expect(result).toBeNull();
    });

    it("should return null if account is inactive", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          email: "inactive@example.com",
          name: "Inactive User",
          username: generateUsername("Inactive User"),
          role: "coordinator",
          isActive: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const authUser = { email: "inactive@example.com", id: "auth-123" };
      vi.mocked(authComponent.getAuthUser).mockResolvedValue(authUser as any);

      const result = await t.run(async (ctx) => {
        return await getOptionalUser(ctx);
      });

      expect(result).toBeNull();
    });
  });

  describe("Role-based Authorization", () => {
    describe("hasRole", () => {
      it("should return true for matching role", () => {
        const user = factories.user({ role: "coordinator" });
        expect(hasRole(user, "coordinator")).toBe(true);
      });

      it("should return false for non-matching role", () => {
        const user = factories.user({ role: "guest" });
        expect(hasRole(user, "coordinator")).toBe(false);
      });
    });

    describe("hasAnyRole", () => {
      it("should return true if user has one of the roles", () => {
        const user = factories.user({ role: "collaborator" });
        expect(hasAnyRole(user, ["coordinator", "collaborator"])).toBe(true);
      });

      it("should return false if user has none of the roles", () => {
        const user = factories.user({ role: "guest" });
        expect(hasAnyRole(user, ["coordinator", "collaborator"])).toBe(false);
      });
    });

    describe("requireRole", () => {
      it("should not throw for matching role", () => {
        const user = factories.user({ role: "coordinator" });
        expect(() => requireRole(user, "coordinator")).not.toThrow();
      });

      it("should throw for non-matching role", () => {
        const user = factories.user({ role: "guest" });
        expect(() => requireRole(user, "coordinator")).toThrow(
          "Forbidden: This action requires coordinator role"
        );
      });
    });

    describe("requireAnyRole", () => {
      it("should not throw if user has one of the roles", () => {
        const user = factories.user({ role: "collaborator" });
        expect(() =>
          requireAnyRole(user, ["coordinator", "collaborator"])
        ).not.toThrow();
      });

      it("should throw if user has none of the roles", () => {
        const user = factories.user({ role: "guest" });
        expect(() =>
          requireAnyRole(user, ["coordinator", "collaborator"])
        ).toThrow("Forbidden: This action requires one of these roles");
      });
    });
  });

  describe("Event Permissions", () => {
    describe("isEventCoordinator", () => {
      it("should return true for primary coordinator", () => {
        const coordinatorId = "users_123" as Id<"users">;
        const event = factories.event({ coordinatorId });
        expect(isEventCoordinator(event, coordinatorId)).toBe(true);
      });

      it("should return true for co-coordinator", () => {
        const coCoordinatorId = "users_456" as Id<"users">;
        const event = factories.event({
          coordinatorId: "users_123" as Id<"users">,
          coCoordinatorIds: [coCoordinatorId],
        });
        expect(isEventCoordinator(event, coCoordinatorId)).toBe(true);
      });

      it("should return false for non-coordinator", () => {
        const event = factories.event({
          coordinatorId: "users_123" as Id<"users">,
        });
        expect(isEventCoordinator(event, "users_456" as Id<"users">)).toBe(
          false
        );
      });
    });

    describe("canManageEvent", () => {
      it("should return true for event coordinator", async () => {
        const t = convexTest(schema);

        const { eventId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, coordinatorId };
        });

        const result = await t.run(async (ctx) => {
          return await canManageEvent(ctx, eventId, coordinatorId);
        });

        expect(result).toBe(true);
      });

      it("should return false for non-coordinator", async () => {
        const t = convexTest(schema);

        const { eventId, otherId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const otherId = await ctx.db.insert("users", {
            email: "other@example.com",
            name: "Other User",
            username: generateUsername("Other User"),
            role: "collaborator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, otherId };
        });

        const result = await t.run(async (ctx) => {
          return await canManageEvent(ctx, eventId, otherId);
        });

        expect(result).toBe(false);
      });
    });

    describe("requireEventCoordinator", () => {
      it("should return event for coordinator", async () => {
        const t = convexTest(schema);

        const { eventId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, coordinatorId };
        });

        const result = await t.run(async (ctx) => {
          return await requireEventCoordinator(ctx, eventId, coordinatorId);
        });

        expect(result._id).toBe(eventId);
      });

      it("should throw for non-coordinator", async () => {
        const t = convexTest(schema);

        const { eventId, otherId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const otherId = await ctx.db.insert("users", {
            email: "other@example.com",
            name: "Other User",
            username: generateUsername("Other User"),
            role: "collaborator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, otherId };
        });

        await expect(
          t.run(async (ctx) => {
            return await requireEventCoordinator(ctx, eventId, otherId);
          })
        ).rejects.toThrow("Forbidden: Only event coordinators can perform this action");
      });

      it("should throw if event not found", async () => {
        const t = convexTest(schema);

        const userId = await t.run(async (ctx) => {
          return await ctx.db.insert("users", {
            email: "user@example.com",
            name: "User",
            username: "user",
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });

        await expect(
          t.run(async (ctx) => {
            return await requireEventCoordinator(
              ctx,
              "events_nonexistent" as Id<"events">,
              userId
            );
          })
        ).rejects.toThrow("Event not found");
      });
    });

    describe("getUserEventRole", () => {
      it("should return 'coordinator' for event coordinator", async () => {
        const t = convexTest(schema);

        const { eventId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, coordinatorId };
        });

        const role = await t.run(async (ctx) => {
          return await getUserEventRole(ctx, eventId, coordinatorId);
        });

        expect(role).toBe("coordinator");
      });

      it("should return member role from eventMembers table", async () => {
        const t = convexTest(schema);

        const { eventId, collaboratorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const collaboratorId = await ctx.db.insert("users", {
            email: "collaborator@example.com",
            name: "Collaborator",
            username: generateUsername("Collaborator"),
            role: "collaborator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          await ctx.db.insert("eventMembers", {
            eventId,
            userId: collaboratorId,
            role: "collaborator",
            joinedAt: Date.now(),
            addedBy: coordinatorId,
          });

          return { eventId, collaboratorId };
        });

        const role = await t.run(async (ctx) => {
          return await getUserEventRole(ctx, eventId, collaboratorId);
        });

        expect(role).toBe("collaborator");
      });

      it("should return null for non-member", async () => {
        const t = convexTest(schema);

        const { eventId, otherId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const otherId = await ctx.db.insert("users", {
            email: "other@example.com",
            name: "Other",
            username: generateUsername("Other"),
            role: "guest",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          return { eventId, otherId };
        });

        const role = await t.run(async (ctx) => {
          return await getUserEventRole(ctx, eventId, otherId);
        });

        expect(role).toBeNull();
      });
    });
  });

  describe("Room Permissions", () => {
    describe("canPostInRoom", () => {
      it("should return true for event coordinator", async () => {
        const t = convexTest(schema);

        const { roomId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          return { roomId, coordinatorId };
        });

        const canPost = await t.run(async (ctx) => {
          return await canPostInRoom(ctx, roomId, coordinatorId);
        });

        expect(canPost).toBe(true);
      });

      it("should return true for participant with canPost permission", async () => {
        const t = convexTest(schema);

        const { roomId, collaboratorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const collaboratorId = await ctx.db.insert("users", {
            email: "collaborator@example.com",
            name: "Collaborator",
            username: generateUsername("Collaborator"),
            role: "collaborator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          await ctx.db.insert("roomParticipants", {
            roomId,
            userId: collaboratorId,
            canPost: true,
            canEdit: true,
            canDelete: true,
            canManage: false,
            notificationLevel: "all",
            joinedAt: Date.now(),
            addedBy: coordinatorId,
          });

          return { roomId, collaboratorId };
        });

        const canPost = await t.run(async (ctx) => {
          return await canPostInRoom(ctx, roomId, collaboratorId);
        });

        expect(canPost).toBe(true);
      });

      it("should return false for participant without canPost permission", async () => {
        const t = convexTest(schema);

        const { roomId, guestId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const guestId = await ctx.db.insert("users", {
            email: "guest@example.com",
            name: "Guest",
            username: generateUsername("Guest"),
            role: "guest",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          await ctx.db.insert("roomParticipants", {
            roomId,
            userId: guestId,
            canPost: false,
            canEdit: false,
            canDelete: false,
            canManage: false,
            notificationLevel: "all",
            joinedAt: Date.now(),
            addedBy: coordinatorId,
          });

          return { roomId, guestId };
        });

        const canPost = await t.run(async (ctx) => {
          return await canPostInRoom(ctx, roomId, guestId);
        });

        expect(canPost).toBe(false);
      });
    });

    describe("requireCanPostInRoom", () => {
      it("should not throw for user with canPost permission", async () => {
        const t = convexTest(schema);

        const { roomId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          return { roomId, coordinatorId };
        });

        await expect(
          t.run(async (ctx) => {
            return await requireCanPostInRoom(ctx, roomId, coordinatorId);
          })
        ).resolves.not.toThrow();
      });

      it("should throw for user without canPost permission", async () => {
        const t = convexTest(schema);

        const { roomId, guestId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const guestId = await ctx.db.insert("users", {
            email: "guest@example.com",
            name: "Guest",
            username: generateUsername("Guest"),
            role: "guest",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          await ctx.db.insert("roomParticipants", {
            roomId,
            userId: guestId,
            canPost: false,
            canEdit: false,
            canDelete: false,
            canManage: false,
            notificationLevel: "all",
            joinedAt: Date.now(),
            addedBy: coordinatorId,
          });

          return { roomId, guestId };
        });

        await expect(
          t.run(async (ctx) => {
            return await requireCanPostInRoom(ctx, roomId, guestId);
          })
        ).rejects.toThrow("Forbidden: You don't have permission to post in this room");
      });
    });

    describe("requireRoomAccess", () => {
      it("should return room for event coordinator", async () => {
        const t = convexTest(schema);

        const { roomId, coordinatorId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          return { roomId, coordinatorId };
        });

        const room = await t.run(async (ctx) => {
          return await requireRoomAccess(ctx, roomId, coordinatorId);
        });

        expect(room._id).toBe(roomId);
      });

      it("should return room for participant", async () => {
        const t = convexTest(schema);

        const { roomId, participantId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const participantId = await ctx.db.insert("users", {
            email: "participant@example.com",
            name: "Participant",
            username: generateUsername("Participant"),
            role: "collaborator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          await ctx.db.insert("roomParticipants", {
            roomId,
            userId: participantId,
            canPost: true,
            canEdit: true,
            canDelete: true,
            canManage: false,
            notificationLevel: "all",
            joinedAt: Date.now(),
            addedBy: coordinatorId,
          });

          return { roomId, participantId };
        });

        const room = await t.run(async (ctx) => {
          return await requireRoomAccess(ctx, roomId, participantId);
        });

        expect(room._id).toBe(roomId);
      });

      it("should throw for non-participant", async () => {
        const t = convexTest(schema);

        const { roomId, otherId } = await t.run(async (ctx) => {
          const coordinatorId = await ctx.db.insert("users", {
            email: "coordinator@example.com",
            name: "Coordinator",
            username: generateUsername("Coordinator"),
            role: "coordinator",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const otherId = await ctx.db.insert("users", {
            email: "other@example.com",
            name: "Other",
            username: generateUsername("Other"),
            role: "guest",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const eventId = await ctx.db.insert("events", {
            name: "Test Event",
            type: "wedding",
            status: "planning",
            coordinatorId,
            createdBy: coordinatorId,
            budget: { total: 10000, spent: 0, committed: 0 },
            guestCount: { expected: 100, confirmed: 0 },
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
            createdBy: coordinatorId,
          });

          return { roomId, otherId };
        });

        await expect(
          t.run(async (ctx) => {
            return await requireRoomAccess(ctx, roomId, otherId);
          })
        ).rejects.toThrow("Forbidden: You don't have access to this room");
      });
    });
  });

  describe("Utility Helpers", () => {
    describe("updateLastActive", () => {
      it("should update lastActiveAt and updatedAt timestamps", async () => {
        const t = convexTest(schema);

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

        const beforeUpdate = Date.now();

        await t.run(async (ctx) => {
          await updateLastActive(ctx, userId);
        });

        const user = await t.run(async (ctx) => {
          return await ctx.db.get(userId);
        });

        expect(user?.lastActiveAt).toBeGreaterThanOrEqual(beforeUpdate);
        expect(user?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      });
    });
  });
});
