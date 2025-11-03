# Phase 1.0: Database Schema & Foundation

> **Status:** ❌ NOT STARTED - Placeholder schema only (products, todos)
> **Last Updated:** January 2025
> **Prerequisites:** Convex project initialized, Better Auth component installed ✅
> **Estimated Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Understanding Better Auth Component vs App Schema](#understanding-better-auth-component-vs-app-schema)
3. [Current State Assessment](#current-state-assessment)
4. [Schema Design Philosophy](#schema-design-philosophy)
5. [Complete Schema Definition](#complete-schema-definition)
6. [Schema Design Decisions](#schema-design-decisions)
7. [Environment Setup](#environment-setup)
8. [Next Steps](#next-steps)

---

## Overview

This document covers the foundation of the Delphi application: the database schema design and initial environment setup. The schema is designed for Convex, a "document-relational" database that combines the flexibility of document stores with the power of relational querying.

**What You'll Build:**
- Complete database schema for all entities (users, events, rooms, messages, tasks, expenses, polls)
- Proper indexes for efficient querying
- Many-to-many relationships via junction tables
- Foundation for real-time subscriptions

**Key Entities:**
- **Users** - Extended user profiles with app-specific data (role, avatar, preferences)
- **Events** - Core event planning entity
- **Rooms** - Chat channels within events
- **RoomParticipants** - Many-to-many relationship between users and rooms
- **Messages** - Real-time chat messages
- **Tasks** - Event planning tasks (Phase 2)
- **Expenses** - Budget tracking (Phase 2)
- **Polls** - Group decision making (Phase 2)

---

## Understanding Better Auth Component vs App Schema

### Two Separate Table Namespaces

This app uses **Better Auth as a Convex component**, which creates a separation between authentication tables and application tables:

#### Better Auth Component Tables (Managed Automatically)
Located in `betterAuth` component namespace:
- `betterAuth/user` - Core authentication data (email, password hash, emailVerified, image)
- `betterAuth/session` - Active user sessions with tokens
- `betterAuth/account` - OAuth provider accounts (Google, GitHub, etc.)
- `betterAuth/verification` - Email verification tokens

**You don't define these in your schema** - they're managed by the Better Auth component.

#### Your App Schema Tables (In schema.ts)
Located in your main app namespace:
- `users` - **Extended user profiles** with app-specific data:
  - Role (coordinator, collaborator, guest, vendor)
  - Avatar URL
  - Preferences (theme, notifications, timezone)
  - Activity tracking (lastActiveAt)
  - Display info (bio, location)
- `events` - Event planning data
- `rooms` - Chat channels
- `messages` - Chat messages
- etc.

### The Relationship

```
Better Auth User (betterAuth/user)          Your App User (users)
┌─────────────────────────────┐             ┌──────────────────────────┐
│ _id: Id<"betterAuth/user">  │             │ _id: Id<"users">         │
│ email: "user@example.com"   │────link────>│ email: "user@example.com"│
│ emailVerified: true          │   via email │ role: "coordinator"      │
│ image: "https://..."         │             │ avatar: "https://..."    │
│ name: "John Doe"             │             │ preferences: {...}       │
│ (managed by Better Auth)     │             │ lastActiveAt: timestamp  │
└─────────────────────────────┘             └──────────────────────────┘
```

### How to Access User Data

**In Convex functions:**
```typescript
import { authComponent } from "./auth";

export const myQuery = query({
  handler: async (ctx) => {
    // Get Better Auth user (authentication data)
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    // Get extended profile (app-specific data)
    const profile = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    return { authUser, profile };
  },
});
```

### Integration Point: Creating Extended Profile

When a user signs up via Better Auth, you need to create their extended profile:

```typescript
// In convex/auth.ts - add callback
export const createAuth = (ctx: GenericCtx<DataModel>, options) => {
  return betterAuth({
    // ... other config
    callbacks: {
      async afterSignUp({ user }) {
        // Create extended profile in your users table
        await ctx.db.insert("users", {
          email: user.email,
          role: "guest", // default role
          preferences: {
            theme: "light",
            notifications: true,
            timezone: "UTC",
          },
          lastActiveAt: Date.now(),
        });
      },
    },
  });
};
```

**Key Takeaway:** Better Auth handles authentication; your schema extends with application-specific user data.

---

## Current State Assessment

### What's Already Implemented ✅

**Better Auth Component (Authentication Layer):**
- ✅ Better Auth integration with Convex component
- ✅ Email/password authentication working
- ✅ Google OAuth provider configured
- ✅ HTTP route registration for auth endpoints (`/web/convex/http.ts`)
- ✅ `getCurrentUser` query (`/web/convex/auth.ts`)
- ✅ Convex component registered (`/web/convex/convex.config.ts`)
- ✅ Frontend auth flows (sign-in, sign-up with Google button)

**Current File Structure:**
```
web/
├── convex/
│   ├── _generated/                # Auto-generated types
│   ├── convex.config.ts           # ✅ Better Auth component registered
│   ├── auth.config.ts             # ✅ Provider config
│   ├── auth.ts                    # ✅ Better Auth setup
│   ├── http.ts                    # ✅ HTTP routes
│   ├── schema.ts                  # ⚠️ PLACEHOLDER ONLY (products, todos)
│   └── todos.ts                   # Example CRUD (can be removed)
```

### What Needs to Be Built ❌

**Database Schema (NOT IMPLEMENTED):**
- ❌ Extended `users` table with role, avatar, preferences
- ❌ `events` table for event planning
- ❌ `rooms` table for chat channels
- ❌ `roomParticipants` junction table (many-to-many)
- ❌ `messages` table for real-time chat
- ❌ `tasks` table (prepared for Phase 2)
- ❌ `expenses` table (prepared for Phase 2)
- ❌ `polls` and `pollVotes` tables (prepared for Phase 2)
- ❌ Indexes for efficient querying

**Current Blocker:** Schema must be defined before any Phase 1.2+ features can be implemented.

---

## Schema Design Philosophy

### Convex: Document-Relational Database

Convex combines the best of both worlds:
- **Document**: Store JSON-like nested objects
- **Relational**: Use IDs to reference documents in other tables

### Design Principles

1. **Indexes are explicit** - Use `withIndex()` in queries (no implicit selection)
2. **Index sparingly** - Reduces storage and write overhead
3. **Avoid redundant indexes** - `by_foo_and_bar` includes `by_foo` functionality
4. **Index for large queries** - Use indexes for 1000+ document queries
5. **Separate hot/cold data** - Frequently updated fields in separate tables (when needed)

### When to Use Indexes

**✅ Good use cases:**
- Filtering large datasets (1000+ documents)
- Compound indexes for common query patterns
- Foreign key lookups (e.g., `by_event`, `by_room`)

**❌ Avoid indexing:**
- Small tables (< 100 documents)
- Fields that are rarely queried
- Redundant combinations (if you have `by_a_and_b`, you don't need `by_a` separately)

---

## Complete Schema Definition

Replace the contents of `mono/packages/backend/convex/schema.ts` with the following:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==========================================
  // AUTHENTICATION & USERS
  // ==========================================

  /**
   * Users - Extended profile beyond Better Auth's managed tables
   * Better Auth manages: user, session, account, verification tables
   * We extend with: role, permissions, profile fields
   */
  users: defineTable({
    // Better Auth will create _id matching their user table
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),

    // Role-based access control
    role: v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest"),
      v.literal("vendor")
    ),

    // User preferences
    preferences: v.optional(v.object({
      notifications: v.boolean(),
      theme: v.union(v.literal("light"), v.literal("dark")),
      timezone: v.string(),
    })),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActiveAt: v.optional(v.number()),
    isActive: v.boolean(), // Soft delete flag
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

  // ==========================================
  // EVENTS
  // ==========================================

  /**
   * Events - Core event planning entity
   * Each event has one main coordinator and multiple collaborators
   */
  events: defineTable({
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("wedding"),
      v.literal("corporate"),
      v.literal("party"),
      v.literal("destination"),
      v.literal("other")
    ),

    // Event Details
    date: v.optional(v.number()), // Event date timestamp
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      coordinates: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
      })),
    })),

    // Budget
    budget: v.object({
      total: v.number(),
      spent: v.number(),
      committed: v.number(), // Money committed but not yet paid
    }),

    // Guest Count
    guestCount: v.object({
      expected: v.number(),
      confirmed: v.number(),
    }),

    // Ownership
    coordinatorId: v.id("users"), // Primary coordinator
    coCoordinatorIds: v.optional(v.array(v.id("users"))), // Additional coordinators

    // Status
    status: v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("archived")
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_coordinator", ["coordinatorId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_type", ["type"])
    // Compound index for user's active events
    .index("by_coordinator_and_status", ["coordinatorId", "status"]),

  // ==========================================
  // ROOMS (Chat Channels)
  // ==========================================

  /**
   * Rooms - Chat channels within events
   * Types: main (default), vendor, topic, guest_announcements
   */
  rooms: defineTable({
    eventId: v.id("events"),

    // Room Info
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("main"),           // Main event planning chat
      v.literal("vendor"),         // Vendor-specific chat
      v.literal("topic"),          // Topic-specific (catering, music, etc)
      v.literal("guest_announcements"), // Broadcast to guests
      v.literal("private")         // Private coordinator chat
    ),

    // Vendor-specific
    vendorId: v.optional(v.id("users")), // If type=vendor, which vendor

    // Settings
    isArchived: v.boolean(),
    allowGuestMessages: v.boolean(), // Can guests post or just read?

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_type", ["type"])
    .index("by_event_and_type", ["eventId", "type"])
    .index("by_vendor", ["vendorId"]),

  // ==========================================
  // ROOM PARTICIPANTS (Many-to-Many)
  // ==========================================

  /**
   * RoomParticipants - Junction table for room membership
   * Tracks which users can access which rooms with what permissions
   */
  roomParticipants: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),

    // Permissions in this room
    canPost: v.boolean(),
    canEdit: v.boolean(),    // Can edit own messages
    canDelete: v.boolean(),  // Can delete own messages
    canManage: v.boolean(),  // Can add/remove participants

    // Notification preferences
    notificationLevel: v.union(
      v.literal("all"),      // Notify for all messages
      v.literal("mentions"), // Only @mentions
      v.literal("none")      // No notifications
    ),

    // Read tracking
    lastReadAt: v.optional(v.number()),

    // Metadata
    joinedAt: v.number(),
    addedBy: v.id("users"),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_user", ["roomId", "userId"]), // Uniqueness constraint

  // ==========================================
  // MESSAGES
  // ==========================================

  /**
   * Messages - Real-time chat messages
   * Supports text, mentions, reactions, edits
   */
  messages: defineTable({
    roomId: v.id("rooms"),
    authorId: v.id("users"),

    // Content
    text: v.string(),

    // Mentions (@user)
    mentions: v.optional(v.array(v.id("users"))),

    // Attachments (future: images, files)
    attachments: v.optional(v.array(v.object({
      type: v.union(v.literal("image"), v.literal("file")),
      url: v.string(),
      name: v.string(),
      size: v.number(),
    }))),

    // Reactions (future: emoji reactions)
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      userId: v.id("users"),
    }))),

    // Edit tracking
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),

    // Soft delete
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // AI context flags
    isAIGenerated: v.boolean(),        // Message from AI agent
    aiIntentDetected: v.optional(v.union(
      v.literal("task"),
      v.literal("expense"),
      v.literal("poll"),
      v.literal("calendar"),
      v.literal("vendor_suggestion"),
      v.literal("none")
    )),

    // Metadata
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_author", ["authorId"])
    .index("by_room_and_created", ["roomId", "createdAt"])
    // For real-time queries, order by creation time
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["roomId", "isDeleted"]
    }),

  // ==========================================
  // TASKS (Phase 2, but define now)
  // ==========================================

  /**
   * Tasks - Event planning tasks
   * Created manually or by AI from conversation
   */
  tasks: defineTable({
    eventId: v.id("events"),

    // Task Info
    title: v.string(),
    description: v.optional(v.string()),

    // Assignment
    assigneeId: v.optional(v.id("users")),
    assignedBy: v.id("users"),

    // Categorization
    category: v.optional(v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("flowers"),
      v.literal("attire"),
      v.literal("invitations"),
      v.literal("travel"),
      v.literal("other")
    )),

    // Status & Priority
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("completed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),

    // Timeline
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Estimates
    estimatedCost: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    estimatedTime: v.optional(v.string()), // "2-3 hours"

    // AI enrichment
    aiEnriched: v.boolean(),
    aiSuggestions: v.optional(v.object({
      vendors: v.optional(v.array(v.string())),
      tips: v.optional(v.array(v.string())),
      questionsToAsk: v.optional(v.array(v.string())),
    })),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_event", ["eventId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_status", ["status"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_due_date", ["dueDate"]),

  // ==========================================
  // EXPENSES (Phase 2, but define now)
  // ==========================================

  /**
   * Expenses - Budget tracking
   */
  expenses: defineTable({
    eventId: v.id("events"),

    // Expense Info
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),

    // Payment
    paidBy: v.id("users"),
    paidAt: v.number(),
    paymentMethod: v.optional(v.string()),

    // Receipt
    receiptUrl: v.optional(v.string()),

    // Split info (for shared expenses)
    splits: v.optional(v.array(v.object({
      userId: v.id("users"),
      amount: v.number(),
      isPaid: v.boolean(),
      paidAt: v.optional(v.number()),
    }))),

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_event", ["eventId"])
    .index("by_paid_by", ["paidBy"])
    .index("by_event_and_category", ["eventId", "category"]),

  // ==========================================
  // POLLS (Phase 2, but define now)
  // ==========================================

  /**
   * Polls - Group decision making
   */
  polls: defineTable({
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")), // Which chat room it was created in

    // Poll Info
    question: v.string(),
    options: v.array(v.object({
      id: v.string(),
      text: v.string(),
      description: v.optional(v.string()),
    })),

    // Settings
    allowMultipleChoices: v.boolean(),
    deadline: v.optional(v.number()),

    // Status
    isClosed: v.boolean(),
    closedAt: v.optional(v.number()),

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_event", ["eventId"])
    .index("by_room", ["roomId"]),

  /**
   * PollVotes - Individual poll responses
   */
  pollVotes: defineTable({
    pollId: v.id("polls"),
    userId: v.id("users"),
    optionIds: v.array(v.string()), // Can vote for multiple if allowed

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_poll", ["pollId"])
    .index("by_user", ["userId"])
    .index("by_poll_and_user", ["pollId", "userId"]), // One vote per user per poll
});
```

---

## Schema Design Decisions

### 1. Why Separate `roomParticipants` Table?

**Many-to-many relationship** between users and rooms:
- One user can be in multiple rooms
- One room has multiple users
- Each relationship has unique permissions

**Alternative (embedding):**
```typescript
// ❌ Don't do this
rooms: defineTable({
  participantIds: v.array(v.id("users")), // Can't query "which rooms is user X in?"
})
```

**Why junction table is better:**
- Query "all rooms for user X": `ctx.db.query("roomParticipants").withIndex("by_user", q => q.eq("userId", userId))`
- Query "all users in room Y": `ctx.db.query("roomParticipants").withIndex("by_room", q => q.eq("roomId", roomId))`
- Per-participant permissions (can't achieve with arrays)

### 2. Why `by_room_and_created` Index on Messages?

Common query pattern: "Get recent messages in a room"

```typescript
const messages = await ctx.db
  .query("messages")
  .withIndex("by_room_and_created", q =>
    q.eq("roomId", roomId)
  )
  .order("desc") // Most recent first
  .take(50);
```

Without compound index, would need to:
1. Filter by room (using `by_room` index)
2. Sort all results by `createdAt` (expensive!)

### 3. Why Denormalize Author Names in Messages?

**Option 1: Store only `authorId` (current schema)**
```typescript
// Query
const message = await ctx.db.get(messageId);
const author = await ctx.db.get(message.authorId); // Second query!
```

**Option 2: Denormalize author name**
```typescript
messages: defineTable({
  authorId: v.id("users"),
  authorName: v.string(),      // Denormalized
  authorAvatar: v.string(),    // Denormalized
})
```

**Decision:** Start with Option 1 (join on read), optimize to Option 2 if performance suffers.

**Why?**
- Messages are read-heavy (1000s of messages displayed)
- Names rarely change (worth denormalizing)
- Avatars change occasionally (acceptable tradeoff)

### 4. Hot vs Cold Data Separation

**Current schema:** Mixed hot/cold in same table

**Future optimization:** Split if performance issues

```typescript
// Cold data (rarely changes)
users: defineTable({
  email: v.string(),
  name: v.string(),
  role: v.string(),
})

// Hot data (changes frequently)
userActivity: defineTable({
  userId: v.id("users"),
  lastActiveAt: v.number(),
  onlineStatus: v.string(),
})
  .index("by_user", ["userId"])
```

**When to split:**
- `lastActiveAt` updates every 30 seconds → causes all queries with `users` table to rerun
- Split prevents unnecessary rerenders

---

## Environment Setup

### Development Environment

```bash
# 1. Navigate to backend package
cd mono/packages/backend

# 2. Install dependencies (if not already done)
bun install

# 3. Start Convex dev
bunx convex dev

# 4. In another terminal, navigate to web app
cd ../../apps/web

# 5. Start web dev server
bun run dev
```

### Verify Schema Deployment

After starting `convex dev`, your schema will be automatically deployed. You should see:

```
✓ Deployed schema
✓ Tables: users, events, rooms, roomParticipants, messages, tasks, expenses, polls, pollVotes
```

---

## Next Steps

With the database schema in place, you're ready to proceed to:

**Phase 1.1: Authentication & Authorization**
- Set up Google OAuth
- Implement role-based access control
- Create protected query/mutation helpers
- Add route guards

**Estimated Time to Complete Phase 1.0:** 2-3 hours
- Schema definition: 1 hour
- Review and understanding: 30 minutes
- Environment setup and verification: 30 minutes
- Testing with seed data: 30 minutes

---

**Next Document:** [Phase 1.1: Authentication & Authorization](./phase-1.1-authentication.md)
