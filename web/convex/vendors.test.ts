import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  createVendor,
  getVendor,
  listVendorsByEvent,
  listVendorsByRoom,
  searchVendorsByCategory,
  updateVendor,
  removeVendor,
} from "./vendors";

describe("Vendors CRUD Operations", () => {
  describe("create", () => {
    it("should create vendor with all required fields", async () => {
      const t = convexTest(schema);

      const { vendorId, userId, eventId } = await t.run(async (ctx) => {
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

        const vendorId = await createVendor(ctx, {
          name: "ABC Catering",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        return { vendorId, userId, eventId };
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor).toBeDefined();
      expect(vendor?.name).toBe("ABC Catering");
      expect(vendor?.category).toBe("catering");
      expect(vendor?.addedBy).toBe(userId);
      expect(vendor?.eventId).toBe(eventId);
    });

    it("should set default status to researching", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Test Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.status).toBe("researching");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const beforeCreate = Date.now();

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Test Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(vendor?.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(vendor?.createdAt).toBe(vendor?.updatedAt);
    });

    it("should handle optional fields", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Deluxe Catering",
          category: "catering",
          addedBy: userId,
          email: "contact@deluxe.com",
          phone: "555-1234",
          website: "https://deluxe.com",
          pricing: { min: 1000, max: 5000, currency: "USD" },
          rating: 4.5,
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.email).toBe("contact@deluxe.com");
      expect(vendor?.phone).toBe("555-1234");
      expect(vendor?.website).toBe("https://deluxe.com");
      expect(vendor?.pricing).toEqual({ min: 1000, max: 5000, currency: "USD" });
      expect(vendor?.rating).toBe(4.5);
    });

    it("should store AI metadata", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "AI Recommended Vendor",
          category: "photography",
          addedBy: userId,
          aiMetadata: {
            matchScore: 0.95,
            pros: ["Professional", "Affordable"],
            cons: ["Limited availability"],
          },
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.aiMetadata).toBeDefined();
      expect(vendor?.aiMetadata?.matchScore).toBe(0.95);
      expect(vendor?.aiMetadata?.pros).toEqual(["Professional", "Affordable"]);
      expect(vendor?.aiMetadata?.cons).toEqual(["Limited availability"]);
    });

    it("should link to room if provided", async () => {
      const t = convexTest(schema);

      const { vendorId, roomId } = await t.run(async (ctx) => {
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

        const vendorId = await createVendor(ctx, {
          name: "Room Vendor",
          category: "catering",
          addedBy: userId,
          roomId,
        });

        return { vendorId, roomId };
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.roomId).toBe(roomId);
    });
  });

  describe("get", () => {
    it("should return vendor by ID", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Test Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await getVendor(ctx, { vendorId });
      });

      expect(vendor).toBeDefined();
      expect(vendor?._id).toBe(vendorId);
      expect(vendor?.name).toBe("Test Vendor");
    });
  });

  describe("listByEvent", () => {
    it("should return all vendors for event", async () => {
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

        await createVendor(ctx, {
          name: "Vendor 1",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        await createVendor(ctx, {
          name: "Vendor 2",
          category: "photography",
          eventId,
          addedBy: userId,
        });

        return { eventId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, { eventId });
      });

      expect(vendors).toHaveLength(2);
      expect(vendors.map((v) => v.name)).toContain("Vendor 1");
      expect(vendors.map((v) => v.name)).toContain("Vendor 2");
    });

    it("should filter by category if provided", async () => {
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

        await createVendor(ctx, {
          name: "Caterer",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        await createVendor(ctx, {
          name: "Photographer",
          category: "photography",
          eventId,
          addedBy: userId,
        });

        return { eventId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, {
          eventId,
          category: "catering",
        });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("Caterer");
      expect(vendors[0].category).toBe("catering");
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

        await createVendor(ctx, {
          name: "Researching Vendor",
          category: "catering",
          eventId,
          addedBy: userId,
          status: "researching",
        });

        await createVendor(ctx, {
          name: "Contacted Vendor",
          category: "catering",
          eventId,
          addedBy: userId,
          status: "contacted",
        });

        return { eventId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, {
          eventId,
          status: "contacted",
        });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("Contacted Vendor");
      expect(vendors[0].status).toBe("contacted");
    });

    it("should exclude soft-deleted vendors", async () => {
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

        await createVendor(ctx, {
          name: "Active Vendor",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        const vendor2 = await createVendor(ctx, {
          name: "Deleted Vendor",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        // Soft delete vendor2
        await removeVendor(ctx, { vendorId: vendor2 });

        return { eventId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, { eventId });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("Active Vendor");
    });

    it("should return empty array if no vendors", async () => {
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

        return { eventId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, { eventId });
      });

      expect(vendors).toEqual([]);
    });
  });

  describe("listByRoom", () => {
    it("should return all vendors for room", async () => {
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

        await createVendor(ctx, {
          name: "Room Vendor 1",
          category: "catering",
          roomId,
          addedBy: userId,
        });

        await createVendor(ctx, {
          name: "Room Vendor 2",
          category: "photography",
          roomId,
          addedBy: userId,
        });

        return { roomId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByRoom(ctx, { roomId });
      });

      expect(vendors).toHaveLength(2);
      expect(vendors.map((v) => v.name)).toContain("Room Vendor 1");
      expect(vendors.map((v) => v.name)).toContain("Room Vendor 2");
    });

    it("should exclude soft-deleted vendors", async () => {
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

        await createVendor(ctx, {
          name: "Active Vendor",
          category: "catering",
          roomId,
          addedBy: userId,
        });

        const vendor2 = await createVendor(ctx, {
          name: "Deleted Vendor",
          category: "catering",
          roomId,
          addedBy: userId,
        });

        await removeVendor(ctx, { vendorId: vendor2 });

        return { roomId };
      });

      const vendors = await t.run(async (ctx) => {
        return await listVendorsByRoom(ctx, { roomId });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("Active Vendor");
    });
  });

  describe("searchByCategory", () => {
    it("should return vendors by category", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createVendor(ctx, {
          name: "Caterer 1",
          category: "catering",
          addedBy: userId,
        });

        await createVendor(ctx, {
          name: "Caterer 2",
          category: "catering",
          addedBy: userId,
        });

        await createVendor(ctx, {
          name: "Photographer",
          category: "photography",
          addedBy: userId,
        });
      });

      const vendors = await t.run(async (ctx) => {
        return await searchVendorsByCategory(ctx, {
          category: "catering",
        });
      });

      expect(vendors).toHaveLength(2);
      expect(vendors.every((v) => v.category === "catering")).toBe(true);
    });

    it("should filter by minRating if provided", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createVendor(ctx, {
          name: "High Rated",
          category: "catering",
          addedBy: userId,
          rating: 4.5,
        });

        await createVendor(ctx, {
          name: "Medium Rated",
          category: "catering",
          addedBy: userId,
          rating: 3.5,
        });

        await createVendor(ctx, {
          name: "Low Rated",
          category: "catering",
          addedBy: userId,
          rating: 2.5,
        });
      });

      const vendors = await t.run(async (ctx) => {
        return await searchVendorsByCategory(ctx, {
          category: "catering",
          minRating: 4.0,
        });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("High Rated");
      expect(vendors[0].rating).toBe(4.5);
    });

    it("should exclude soft-deleted vendors", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createVendor(ctx, {
          name: "Active Vendor",
          category: "catering",
          addedBy: userId,
        });

        const vendor2 = await createVendor(ctx, {
          name: "Deleted Vendor",
          category: "catering",
          addedBy: userId,
        });

        await removeVendor(ctx, { vendorId: vendor2 });
      });

      const vendors = await t.run(async (ctx) => {
        return await searchVendorsByCategory(ctx, {
          category: "catering",
        });
      });

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe("Active Vendor");
    });
  });

  describe("update", () => {
    it("should update vendor fields", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Original Name",
          category: "catering",
          addedBy: userId,
          status: "researching",
        });
      });

      await t.run(async (ctx) => {
        await updateVendor(ctx, {
          vendorId,
          name: "Updated Name",
          status: "contacted",
          email: "newemail@example.com",
          phone: "555-9999",
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.name).toBe("Updated Name");
      expect(vendor?.status).toBe("contacted");
      expect(vendor?.email).toBe("newemail@example.com");
      expect(vendor?.phone).toBe("555-9999");
    });

    it("should update contract fields", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const signedAt = Date.now();

      await t.run(async (ctx) => {
        await updateVendor(ctx, {
          vendorId,
          contractUrl: "https://example.com/contract.pdf",
          contractSignedAt: signedAt,
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.contractUrl).toBe("https://example.com/contract.pdf");
      expect(vendor?.contractSignedAt).toBe(signedAt);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const beforeUpdate = await t.run(async (ctx) => {
        const vendor = await ctx.db.get(vendorId);
        return vendor?.updatedAt;
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await updateVendor(ctx, {
          vendorId,
          name: "Updated Vendor",
        });
      });

      const afterUpdate = await t.run(async (ctx) => {
        const vendor = await ctx.db.get(vendorId);
        return vendor?.updatedAt;
      });

      expect(afterUpdate).toBeGreaterThan(beforeUpdate!);
    });

    it("should preserve unchanged fields", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Original Name",
          category: "catering",
          addedBy: userId,
          email: "original@example.com",
          phone: "555-1234",
        });
      });

      await t.run(async (ctx) => {
        await updateVendor(ctx, {
          vendorId,
          name: "Updated Name",
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.name).toBe("Updated Name");
      expect(vendor?.email).toBe("original@example.com");
      expect(vendor?.phone).toBe("555-1234");
      expect(vendor?.category).toBe("catering");
    });
  });

  describe("deleteVendor", () => {
    it("should soft delete vendor (set deletedAt)", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Vendor to Delete",
          category: "catering",
          addedBy: userId,
        });
      });

      await t.run(async (ctx) => {
        await removeVendor(ctx, { vendorId });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.deletedAt).toBeDefined();
      expect(vendor?.deletedAt).toBeGreaterThan(0);
    });

    it("should update updatedAt on delete", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Vendor",
          category: "catering",
          addedBy: userId,
        });
      });

      const beforeDelete = await t.run(async (ctx) => {
        const vendor = await ctx.db.get(vendorId);
        return vendor?.updatedAt;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.run(async (ctx) => {
        await removeVendor(ctx, { vendorId });
      });

      const afterDelete = await t.run(async (ctx) => {
        const vendor = await ctx.db.get(vendorId);
        return vendor?.updatedAt;
      });

      expect(afterDelete).toBeGreaterThan(beforeDelete!);
    });

    it("should exclude from list queries after delete", async () => {
      const t = convexTest(schema);

      const { eventId, vendorId } = await t.run(async (ctx) => {
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

        const vendorId = await createVendor(ctx, {
          name: "Vendor to Delete",
          category: "catering",
          eventId,
          addedBy: userId,
        });

        return { eventId, vendorId };
      });

      // Verify vendor is in list
      const beforeDelete = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, { eventId });
      });

      expect(beforeDelete).toHaveLength(1);

      // Delete vendor
      await t.run(async (ctx) => {
        await removeVendor(ctx, { vendorId });
      });

      // Verify vendor is not in list
      const afterDelete = await t.run(async (ctx) => {
        return await listVendorsByEvent(ctx, { eventId });
      });

      expect(afterDelete).toHaveLength(0);
    });
  });

  describe("Special Tests", () => {
    it("should support status workflow transitions", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "Vendor",
          category: "catering",
          addedBy: userId,
          status: "researching",
        });
      });

      const statuses = ["contacted", "negotiating", "contracted", "active", "completed"];

      for (const status of statuses) {
        await t.run(async (ctx) => {
          await updateVendor(ctx, {
            vendorId,
            status,
          });
        });

        const vendor = await t.run(async (ctx) => {
          return await ctx.db.get(vendorId);
        });

        expect(vendor?.status).toBe(status);
      }
    });

    it("should handle complex AI metadata structure", async () => {
      const t = convexTest(schema);

      const vendorId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return await createVendor(ctx, {
          name: "AI Vendor",
          category: "photography",
          addedBy: userId,
          aiMetadata: {
            matchScore: 0.92,
            pros: ["Experienced", "Affordable", "Available"],
            cons: ["Limited portfolio"],
            specialties: ["Wedding", "Portrait"],
          },
        });
      });

      const vendor = await t.run(async (ctx) => {
        return await ctx.db.get(vendorId);
      });

      expect(vendor?.aiMetadata).toBeDefined();
      expect(vendor?.aiMetadata?.matchScore).toBe(0.92);
      expect(vendor?.aiMetadata?.pros).toHaveLength(3);
      expect(vendor?.aiMetadata?.cons).toHaveLength(1);
      expect(vendor?.aiMetadata?.specialties).toEqual(["Wedding", "Portrait"]);
    });

    it("should correctly filter by rating", async () => {
      const t = convexTest(schema);

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          email: "user@example.com",
          name: "Test User",
          username: "testuser",
          role: "coordinator",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await createVendor(ctx, {
          name: "Vendor 4.8",
          category: "catering",
          addedBy: userId,
          rating: 4.8,
        });

        await createVendor(ctx, {
          name: "Vendor 4.5",
          category: "catering",
          addedBy: userId,
          rating: 4.5,
        });

        await createVendor(ctx, {
          name: "Vendor 4.0",
          category: "catering",
          addedBy: userId,
          rating: 4.0,
        });

        await createVendor(ctx, {
          name: "Vendor 3.5",
          category: "catering",
          addedBy: userId,
          rating: 3.5,
        });
      });

      const vendors = await t.run(async (ctx) => {
        return await searchVendorsByCategory(ctx, {
          category: "catering",
          minRating: 4.5,
        });
      });

      expect(vendors).toHaveLength(2);
      expect(vendors.every((v) => (v.rating || 0) >= 4.5)).toBe(true);
      expect(vendors.map((v) => v.name)).toContain("Vendor 4.8");
      expect(vendors.map((v) => v.name)).toContain("Vendor 4.5");
    });
  });
});
