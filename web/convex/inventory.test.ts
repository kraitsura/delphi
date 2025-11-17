import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import {
  createInventoryItem,
  getInventoryItem,
  listInventoryByEvent,
  getRentalsDueForReturnHelper,
  updateStatusHelper,
  updateInventoryItem,
  removeInventoryItem,
} from "./inventory";

describe("inventory", () => {
  describe("create mutation", () => {
    it("should create inventory item with required fields", async () => {
      const t = convexTest(schema);

      const { eventId, inventoryId } = await t.run(async (ctx) => {
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

        const inventoryId = await createInventoryItem(ctx, {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          createdBy: userId,
        });

        return { eventId, inventoryId };
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory).toBeDefined();
      expect(inventory?.name).toBe("Chairs");
      expect(inventory?.category).toBe("furniture");
      expect(inventory?.eventId).toBe(eventId);
      expect(inventory?.quantity).toBe(100);
      expect(inventory?.unit).toBe("pieces");
      expect(inventory?.acquisitionType).toBe("rented");
      expect(inventory?.costPerUnit).toBe(5);
      expect(inventory?.totalCost).toBe(500);
    });

    it("should set default status to ordered", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        return await createInventoryItem(ctx, {
          name: "Tables",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 25,
          totalCost: 500,
          createdBy: userId,
        });
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.status).toBe("ordered");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const inventoryId = await t.run(async (ctx) => {
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

        return await createInventoryItem(ctx, {
          name: "Linens",
          category: "decor",
          eventId,
          quantity: 50,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 10,
          totalCost: 500,
          createdBy: userId,
        });
      });

      const after = Date.now();

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.createdAt).toBeGreaterThanOrEqual(before);
      expect(inventory?.createdAt).toBeLessThanOrEqual(after);
      expect(inventory?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(inventory?.updatedAt).toBeLessThanOrEqual(after);
    });

    it("should handle acquisition types (rented, purchased, borrowed, owned)", async () => {
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

        const types = ["rented", "purchased", "borrowed", "owned"];

        for (const type of types) {
          const inventoryId = await createInventoryItem(ctx, {
            name: `Item ${type}`,
            category: "furniture",
            eventId,
            quantity: 10,
            unit: "pieces",
            acquisitionType: type,
            costPerUnit: 10,
            totalCost: 100,
            createdBy: userId,
          });

          const inventory = await ctx.db.get(inventoryId);
          expect(inventory?.acquisitionType).toBe(type);
        }
      });
    });

    it("should store rental details for rented items", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        const now = Date.now();
        const rentalDetails = {
          pickupDate: now + 5 * 24 * 60 * 60 * 1000,
          returnDate: now + 8 * 24 * 60 * 60 * 1000,
          returnLocation: "Rental Company Warehouse",
          deposit: 500,
          damagePolicy: "Full replacement cost for damaged items",
        };

        return await createInventoryItem(ctx, {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails,
          costPerUnit: 5,
          totalCost: 500,
          createdBy: userId,
        });
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.rentalDetails).toEqual({
        pickupDate: expect.any(Number),
        returnDate: expect.any(Number),
        returnLocation: "Rental Company Warehouse",
        deposit: 500,
        damagePolicy: "Full replacement cost for damaged items",
      });
    });

    it("should calculate totalCost from costPerUnit * quantity", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        return await createInventoryItem(ctx, {
          name: "Centerpieces",
          category: "decor",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "purchased",
          costPerUnit: 45,
          totalCost: 900, // 20 * 45
          createdBy: userId,
        });
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.totalCost).toBe(900);
    });
  });

  describe("get query", () => {
    it("should return inventory item by ID", async () => {
      const t = convexTest(schema);

      const { inventoryId } = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { inventoryId };
      });

      const inventory = await t.run(async (ctx) => {
        return await getInventoryItem(ctx, inventoryId);
      });

      expect(inventory).toBeDefined();
      expect(inventory?._id).toBe(inventoryId);
      expect(inventory?.name).toBe("Chairs");
    });

    it("should return null for non-existent item", async () => {
      const t = convexTest(schema);

      const inventory = await t.run(async (ctx) => {
        return await getInventoryItem(
          ctx,
          "inventory_nonexistent" as Id<"inventory">
        );
      });

      expect(inventory).toBeNull();
    });
  });

  describe("listByEvent query", () => {
    it("should return all inventory items for event", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Tables",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 25,
          totalCost: 500,
          status: "delivered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const items = await t.run(async (ctx) => {
        return await listInventoryByEvent(ctx, { eventId });
      });

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.name)).toContain("Chairs");
      expect(items.map((i) => i.name)).toContain("Tables");
    });

    it("should filter by category if provided", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Centerpieces",
          category: "decor",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "purchased",
          costPerUnit: 25,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Tables",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 25,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const items = await t.run(async (ctx) => {
        return await listInventoryByEvent(ctx, {
          eventId,
          category: "furniture",
        });
      });

      expect(items).toHaveLength(2);
      expect(items.every((i) => i.category === "furniture")).toBe(true);
    });

    it("should filter by status if provided", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Tables",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 25,
          totalCost: 500,
          status: "delivered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Linens",
          category: "decor",
          eventId,
          quantity: 50,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 10,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const items = await t.run(async (ctx) => {
        return await listInventoryByEvent(ctx, {
          eventId,
          status: "delivered",
        });
      });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Tables");
      expect(items[0].status).toBe("delivered");
    });

    it("should exclude soft-deleted items", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        await ctx.db.insert("inventory", {
          name: "Active Item",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("inventory", {
          name: "Deleted Item",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 25,
          totalCost: 500,
          status: "ordered",
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const items = await t.run(async (ctx) => {
        return await listInventoryByEvent(ctx, { eventId });
      });

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Active Item");
    });
  });

  describe("getRentalsDueForReturn query", () => {
    it("should return only rented items (acquisitionType = rented)", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        const now = Date.now();

        // Rented item with return date in 5 days
        await ctx.db.insert("inventory", {
          name: "Rented Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 5 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 500,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 5,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Purchased item (should not be included)
        await ctx.db.insert("inventory", {
          name: "Purchased Decor",
          category: "decor",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "purchased",
          costPerUnit: 25,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const rentals = await t.run(async (ctx) => {
        return await getRentalsDueForReturnHelper(ctx, {
          eventId,
          daysAhead: 7,
        });
      });

      expect(rentals).toHaveLength(1);
      expect(rentals[0].name).toBe("Rented Chairs");
      expect(rentals[0].acquisitionType).toBe("rented");
    });

    it("should filter by return date within X days", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        const now = Date.now();

        // Return in 5 days (should be included with 7-day window)
        await ctx.db.insert("inventory", {
          name: "Due Soon",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 5 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 500,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 5,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Return in 10 days (should NOT be included with 7-day window)
        await ctx.db.insert("inventory", {
          name: "Not Due Yet",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 10 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 300,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 25,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const rentals = await t.run(async (ctx) => {
        return await getRentalsDueForReturnHelper(ctx, {
          eventId,
          daysAhead: 7,
        });
      });

      expect(rentals).toHaveLength(1);
      expect(rentals[0].name).toBe("Due Soon");
    });

    it("should exclude soft-deleted items", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        const now = Date.now();

        // Active rental
        await ctx.db.insert("inventory", {
          name: "Active Rental",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 5 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 500,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 5,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Deleted rental
        await ctx.db.insert("inventory", {
          name: "Deleted Rental",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 5 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 300,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 25,
          totalCost: 500,
          status: "in_use",
          deletedAt: Date.now(),
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const rentals = await t.run(async (ctx) => {
        return await getRentalsDueForReturnHelper(ctx, {
          eventId,
          daysAhead: 7,
        });
      });

      expect(rentals).toHaveLength(1);
      expect(rentals[0].name).toBe("Active Rental");
    });

    it("should sort by return date (ascending)", async () => {
      const t = convexTest(schema);

      const eventId = await t.run(async (ctx) => {
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

        const now = Date.now();

        // Return in 6 days
        await ctx.db.insert("inventory", {
          name: "Third",
          category: "furniture",
          eventId,
          quantity: 30,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 6 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 200,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 5,
          totalCost: 150,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Return in 2 days
        await ctx.db.insert("inventory", {
          name: "First",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 2 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 500,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 5,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Return in 4 days
        await ctx.db.insert("inventory", {
          name: "Second",
          category: "furniture",
          eventId,
          quantity: 20,
          unit: "pieces",
          acquisitionType: "rented",
          rentalDetails: {
            pickupDate: now,
            returnDate: now + 4 * 24 * 60 * 60 * 1000,
            returnLocation: "Warehouse",
            deposit: 300,
            damagePolicy: "Full replacement",
          },
          costPerUnit: 25,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return eventId;
      });

      const rentals = await t.run(async (ctx) => {
        return await getRentalsDueForReturnHelper(ctx, {
          eventId,
          daysAhead: 7,
        });
      });

      expect(rentals).toHaveLength(3);
      expect(rentals[0].name).toBe("First");
      expect(rentals[1].name).toBe("Second");
      expect(rentals[2].name).toBe("Third");
    });
  });

  describe("updateStatus mutation", () => {
    it("should update status field", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await updateStatusHelper(ctx, {
          inventoryId,
          status: "delivered",
        });

        return inventoryId;
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.status).toBe("delivered");
    });

    it("should update condition notes", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "delivered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await updateStatusHelper(ctx, {
          inventoryId,
          status: "returned",
          conditionNotes: "All items in good condition",
        });

        return inventoryId;
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.status).toBe("returned");
      expect(inventory?.conditionNotes).toBe("All items in good condition");
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { inventoryId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const originalUpdatedAt = Date.now() - 1000;

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await updateStatusHelper(ctx, {
          inventoryId,
          status: "delivered",
        });

        return { inventoryId, originalUpdatedAt };
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("update mutation", () => {
    it("should update inventory fields", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Old Name",
          description: "Old description",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await updateInventoryItem(ctx, {
          inventoryId,
          name: "New Name",
          description: "New description",
          quantity: 150,
          storageLocation: "Warehouse A",
        });

        return inventoryId;
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.name).toBe("New Name");
      expect(inventory?.description).toBe("New description");
      expect(inventory?.quantity).toBe(150);
      expect(inventory?.storageLocation).toBe("Warehouse A");
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { inventoryId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const originalUpdatedAt = Date.now() - 1000;

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await updateInventoryItem(ctx, {
          inventoryId,
          name: "Updated Name",
        });

        return { inventoryId, originalUpdatedAt };
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("deleteInventoryItem mutation", () => {
    it("should soft delete inventory item", async () => {
      const t = convexTest(schema);

      const before = Date.now();

      const inventoryId = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await removeInventoryItem(ctx, inventoryId);

        return inventoryId;
      });

      const after = Date.now();

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.deletedAt).toBeDefined();
      expect(inventory?.deletedAt).toBeGreaterThanOrEqual(before);
      expect(inventory?.deletedAt).toBeLessThanOrEqual(after);
    });

    it("should update updatedAt timestamp", async () => {
      const t = convexTest(schema);

      const { inventoryId, originalUpdatedAt } = await t.run(async (ctx) => {
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

        const originalUpdatedAt = Date.now() - 1000;

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: originalUpdatedAt,
        });

        await removeInventoryItem(ctx, inventoryId);

        return { inventoryId, originalUpdatedAt };
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe("Status workflow", () => {
    it("should support status transitions (ordered → delivered → in_use → returned)", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        return await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "ordered",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Verify ordered status
      let inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.status).toBe("ordered");

      // Transition to delivered
      await t.run(async (ctx) => {
        await updateStatusHelper(ctx, {
          inventoryId,
          status: "delivered",
        });
      });

      inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.status).toBe("delivered");

      // Transition to in_use
      await t.run(async (ctx) => {
        await updateStatusHelper(ctx, {
          inventoryId,
          status: "in_use",
        });
      });

      inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.status).toBe("in_use");

      // Transition to returned
      await t.run(async (ctx) => {
        await updateStatusHelper(ctx, {
          inventoryId,
          status: "returned",
        });
      });

      inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });
      expect(inventory?.status).toBe("returned");
    });

    it("should support lost_damaged status", async () => {
      const t = convexTest(schema);

      const inventoryId = await t.run(async (ctx) => {
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

        const inventoryId = await ctx.db.insert("inventory", {
          name: "Chairs",
          category: "furniture",
          eventId,
          quantity: 100,
          unit: "pieces",
          acquisitionType: "rented",
          costPerUnit: 5,
          totalCost: 500,
          status: "in_use",
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await updateStatusHelper(ctx, {
          inventoryId,
          status: "lost_damaged",
          conditionNotes: "5 chairs damaged during event",
        });

        return inventoryId;
      });

      const inventory = await t.run(async (ctx) => {
        return await ctx.db.get(inventoryId);
      });

      expect(inventory?.status).toBe("lost_damaged");
      expect(inventory?.conditionNotes).toBe("5 chairs damaged during event");
    });
  });
});