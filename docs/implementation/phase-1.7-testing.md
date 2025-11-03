# Phase 1.7: Testing & Validation

> **Status:** Phase 1.7 - Testing & Quality Assurance
> **Last Updated:** October 31, 2025
> **Prerequisites:** Phase 1.6 (Advanced Patterns) completed
> **Estimated Time:** 3-4 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Unit Tests with Vitest](#unit-tests-with-vitest)
3. [E2E Tests with Playwright](#e2e-tests-with-playwright)
4. [Seed Data for Development](#seed-data-for-development)
5. [Testing Checklist](#testing-checklist)

---

## Overview

This phase establishes a comprehensive testing strategy for the Delphi application, including unit tests for Convex functions and end-to-end tests for critical user flows.

**What You'll Build:**
- ✅ Unit tests for CRUD operations
- ✅ E2E tests for auth flows
- ✅ E2E tests for event creation
- ✅ Seed data script for development
- ✅ Testing utilities and helpers

---

## Unit Tests with Vitest

### Setup Vitest for Convex

Install dependencies:

```bash
cd mono/packages/backend
bun add -D vitest convex-test
```

Create `mono/packages/backend/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

### Unit Tests for Events

Create `mono/packages/backend/convex/events.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Events CRUD", () => {
  it("should create event and main room", async () => {
    const t = convexTest(schema);

    // Create user first
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
    });

    // Create event (requires auth - will need to mock)
    // This test demonstrates the pattern
    const { eventId, roomId } = await t.mutation(api.events.create, {
      name: "Test Event",
      type: "wedding",
      budget: 50000,
      expectedGuests: 100,
    });

    expect(eventId).toBeDefined();
    expect(roomId).toBeDefined();

    // Verify event exists
    const event = await t.query(api.events.getById, { eventId });
    expect(event.name).toBe("Test Event");
  });

  it("should update event successfully", async () => {
    const t = convexTest(schema);

    // Setup: Create user and event
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
    });

    const { eventId } = await t.mutation(api.events.create, {
      name: "Original Name",
      type: "wedding",
      budget: 50000,
      expectedGuests: 100,
    });

    // Update event
    await t.mutation(api.events.update, {
      eventId,
      name: "Updated Name",
      budget: { total: 60000 },
    });

    // Verify update
    const event = await t.query(api.events.getById, { eventId });
    expect(event.name).toBe("Updated Name");
    expect(event.budget.total).toBe(60000);
  });
});
```

### Unit Tests for Users

Create `mono/packages/backend/convex/users.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Users CRUD", () => {
  it("should create user profile", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
    });

    expect(userId).toBeDefined();

    const user = await t.query(api.users.getById, { userId });
    expect(user?.name).toBe("Test User");
    expect(user?.role).toBe("coordinator");
  });

  it("should not create duplicate profiles", async () => {
    const t = convexTest(schema);

    const userId1 = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "User 1",
    });

    const userId2 = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "User 2",
    });

    // Should return same ID
    expect(userId1).toBe(userId2);
  });

  it("should search users by name", async () => {
    const t = convexTest(schema);

    await t.mutation(api.users.createProfile, {
      email: "john@example.com",
      name: "John Doe",
    });

    await t.mutation(api.users.createProfile, {
      email: "jane@example.com",
      name: "Jane Smith",
    });

    const results = await t.query(api.users.searchByName, {
      searchTerm: "john",
    });

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("John Doe");
  });
});
```

### Run Unit Tests

```bash
cd mono/packages/backend
bun run test
```

---

## E2E Tests with Playwright

### Setup Playwright

```bash
cd mono/apps/web
bun add -D @playwright/test
bunx playwright install
```

Create `mono/apps/web/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test: Authentication Flow

Create `mono/apps/web/tests/auth.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("complete signup flow", async ({ page }) => {
    await page.goto("/sign-up");

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=Test User")).toBeVisible();
  });

  test("sign in and sign out", async ({ page }) => {
    // Sign in
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");

    // Sign out
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sign Out');

    await expect(page).toHaveURL("/sign-in");
  });

  test("protected route redirects to sign in", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
```

### E2E Test: Event Creation Flow

Create `mono/apps/web/tests/events.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Event Management", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("create new event", async ({ page }) => {
    await page.click('text=Create Event');

    await page.fill('input[name="name"]', "My Wedding");
    await page.selectOption('select[name="type"]', "wedding");
    await page.fill('input[name="budget"]', "50000");
    await page.fill('input[name="expectedGuests"]', "150");

    await page.click('button:has-text("Create Event")');

    // Should redirect to event page
    await expect(page).toHaveURL(/\/events\/.+/);
    await expect(page.locator('text=My Wedding')).toBeVisible();
  });

  test("list user events", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator('[data-testid="event-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
  });

  test("update event details", async ({ page }) => {
    // Navigate to event
    await page.goto("/dashboard");
    await page.click('[data-testid="event-card"]', { first: true });

    // Click edit
    await page.click('[data-testid="edit-event"]');

    // Update name
    await page.fill('input[name="name"]', "Updated Event Name");
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Updated Event Name')).toBeVisible();
  });
});
```

### Run E2E Tests

```bash
cd mono/apps/web
bunx playwright test
```

---

## Seed Data for Development

Create `mono/packages/backend/convex/seed.ts`:

```typescript
import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    console.log("Starting database seed...");

    // Create test users
    const coordinator = await ctx.db.insert("users", {
      email: "coordinator@test.com",
      name: "Alice Coordinator",
      role: "coordinator",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const collaborator = await ctx.db.insert("users", {
      email: "collaborator@test.com",
      name: "Bob Collaborator",
      role: "collaborator",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const vendor = await ctx.db.insert("users", {
      email: "vendor@test.com",
      name: "Charlie Vendor",
      role: "vendor",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test event
    const eventId = await ctx.db.insert("events", {
      name: "Sarah & John's Wedding",
      description: "Beautiful summer wedding in Napa Valley",
      type: "wedding",
      date: Date.now() + 180 * 24 * 60 * 60 * 1000, // 6 months from now
      location: {
        address: "123 Vineyard Lane",
        city: "Napa",
        state: "CA",
        country: "USA",
      },
      budget: { total: 75000, spent: 12500, committed: 25000 },
      guestCount: { expected: 150, confirmed: 45 },
      coordinatorId: coordinator,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: coordinator,
    });

    // Create main room
    const mainRoom = await ctx.db.insert("rooms", {
      eventId,
      name: "Main Planning",
      type: "main",
      isArchived: false,
      allowGuestMessages: false,
      createdAt: Date.now(),
      createdBy: coordinator,
    });

    // Create vendor room
    const vendorRoom = await ctx.db.insert("rooms", {
      eventId,
      name: "Catering Coordination",
      type: "vendor",
      vendorId: vendor,
      isArchived: false,
      allowGuestMessages: false,
      createdAt: Date.now(),
      createdBy: coordinator,
    });

    // Add participants to main room
    await ctx.db.insert("roomParticipants", {
      roomId: mainRoom,
      userId: coordinator,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: coordinator,
    });

    await ctx.db.insert("roomParticipants", {
      roomId: mainRoom,
      userId: collaborator,
      canPost: true,
      canEdit: true,
      canDelete: false,
      canManage: false,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: coordinator,
    });

    // Add sample messages
    await ctx.db.insert("messages", {
      roomId: mainRoom,
      authorId: coordinator,
      text: "Welcome to the wedding planning chat!",
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    });

    await ctx.db.insert("messages", {
      roomId: mainRoom,
      authorId: collaborator,
      text: "Excited to help plan this amazing event!",
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    });

    // Create sample tasks
    await ctx.db.insert("tasks", {
      eventId,
      title: "Book venue",
      description: "Confirm Napa Valley venue booking",
      assigneeId: coordinator,
      assignedBy: coordinator,
      status: "completed",
      priority: "high",
      aiEnriched: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: coordinator,
      completedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 1 week ago
    });

    await ctx.db.insert("tasks", {
      eventId,
      title: "Send invitations",
      description: "Design and send wedding invitations",
      assigneeId: collaborator,
      assignedBy: coordinator,
      status: "in_progress",
      priority: "high",
      dueDate: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days from now
      aiEnriched: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: coordinator,
    });

    console.log("✅ Seed data created successfully!");
    return {
      users: { coordinator, collaborator, vendor },
      eventId,
      rooms: { mainRoom, vendorRoom },
    };
  },
});

/**
 * Clear all data (use with caution!)
 */
export const clearDatabase = mutation({
  handler: async (ctx) => {
    console.log("⚠️  Clearing database...");

    // Delete in reverse dependency order
    const messages = await ctx.db.query("messages").collect();
    for (const message of messages) await ctx.db.delete(message._id);

    const roomParticipants = await ctx.db.query("roomParticipants").collect();
    for (const participant of roomParticipants) await ctx.db.delete(participant._id);

    const rooms = await ctx.db.query("rooms").collect();
    for (const room of rooms) await ctx.db.delete(room._id);

    const tasks = await ctx.db.query("tasks").collect();
    for (const task of tasks) await ctx.db.delete(task._id);

    const expenses = await ctx.db.query("expenses").collect();
    for (const expense of expenses) await ctx.db.delete(expense._id);

    const events = await ctx.db.query("events").collect();
    for (const event of events) await ctx.db.delete(event._id);

    const users = await ctx.db.query("users").collect();
    for (const user of users) await ctx.db.delete(user._id);

    console.log("✅ Database cleared!");
  },
});
```

### Run Seed Script

```bash
cd mono/packages/backend
bunx convex run seed:seedDatabase
```

---

## Testing Checklist

### Unit Tests
- [ ] User CRUD operations
- [ ] Event CRUD operations
- [ ] Room CRUD operations
- [ ] Message operations
- [ ] Auth helpers
- [ ] Permission checks

### E2E Tests
- [ ] Sign up flow
- [ ] Sign in flow
- [ ] Sign out flow
- [ ] Protected routes
- [ ] Event creation
- [ ] Event update
- [ ] Room creation
- [ ] Message sending

### Manual Tests
- [ ] Real-time message updates
- [ ] Optimistic UI updates
- [ ] Pagination
- [ ] File uploads
- [ ] Notification counts

---

## Next Steps

Congratulations! You've completed Phase 1. You're now ready to move on to:

**Phase 2: Core Features**
- AI-powered task extraction
- Expense tracking
- Poll creation
- Advanced collaboration features

---

**Previous:** [Phase 1.6: Advanced Patterns](./phase-1.6-advanced-patterns.md)

**Next:** [Phase 1 Overview](./phase-1-overview.md)
