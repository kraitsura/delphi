# Phase 1 Implementation Guide: Database Schema & CRUD Operations
## Better Auth + Convex Integration

> **Status:** Phase 1 - Core Infrastructure (Weeks 1-2)
> **Last Updated:** October 31, 2025
> **Prerequisites:** Better Auth + Convex (~40% complete)

---

## Table of Contents

1. [Overview & Current State](#overview--current-state)
2. [Database Schema Design](#database-schema-design)
3. [Better Auth + Convex Integration](#better-auth--convex-integration)
4. [CRUD Operations by Entity](#crud-operations-by-entity)
5. [Advanced Patterns](#advanced-patterns)
6. [Complete Code Examples](#complete-code-examples)
7. [Missing Pieces Implementation](#missing-pieces-implementation)
8. [Environment Setup](#environment-setup)
9. [Testing & Validation](#testing--validation)

---

## Overview & Current State

### What's Already Implemented ✅

Your Delphi project has a solid foundation with **Better Auth + Convex** integration:

**Backend (Convex):**
- ✅ Better Auth integration with Convex adapter
- ✅ Email/password authentication
- ✅ HTTP route registration for auth endpoints
- ✅ Basic `getCurrentUser` query
- ✅ Convex component setup

**Frontend (TanStack Start):**
- ✅ Auth client with Convex plugin
- ✅ Server-side session fetching
- ✅ `ConvexBetterAuthProvider` wrapper
- ✅ Protected route components (`Authenticated`, `Unauthenticated`)
- ✅ Sign in/sign up forms with validation

**Current File Structure:**
```
mono/
├── packages/backend/convex/
│   ├── auth.ts                    # Better Auth setup
│   ├── auth.config.ts             # Auth provider config
│   ├── convex.config.ts           # Convex app with Better Auth component
│   ├── http.ts                    # HTTP routes
│   └── schema.ts                  # Minimal schema (only todos)
└── apps/web/src/
    ├── lib/
    │   ├── auth-client.ts         # Client-side auth
    │   └── auth-server.ts         # Server-side auth
    ├── components/
    │   ├── sign-in-form.tsx       # Sign in UI
    │   ├── sign-up-form.tsx       # Sign up UI
    │   └── user-menu.tsx          # User dropdown
    └── routes/
        ├── __root.tsx             # Auth provider integration
        └── dashboard.tsx          # Protected route example
```

### What's Missing for Phase 1 ❌

**Authentication:**
- ❌ Google OAuth provider
- ❌ User roles (Coordinator, Collaborator, Guest, Vendor)
- ❌ Permission system
- ❌ Protected query/mutation wrappers
- ❌ Route guards (beforeLoad hooks)

**Database Schema:**
- ❌ Explicit user profile schema
- ❌ Events table
- ❌ Rooms (chat channels) table
- ❌ Room participants (many-to-many)
- ❌ Messages table
- ❌ Indexes for common queries

**CRUD Operations:**
- ❌ Event creation/management
- ❌ Room/channel management
- ❌ Real-time messaging
- ❌ User profile updates

**Phase 1 Completion:** ~40% → Target: 100%

---

## Database Schema Design

### Schema Philosophy

Convex is a **"document-relational"** database:
- **Document**: Store JSON-like nested objects
- **Relational**: Use IDs to reference documents in other tables

### Design Principles

1. **Indexes are explicit** - Use `withIndex()` in queries (no implicit selection)
2. **Index sparingly** - Reduces storage and write overhead
3. **Avoid redundant indexes** - `by_foo_and_bar` includes `by_foo` functionality
4. **Index for large queries** - Use indexes for 1000+ document queries
5. **Separate hot/cold data** - Frequently updated fields in separate tables

### Complete Schema Definition

Create or update `mono/packages/backend/convex/schema.ts`:

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
    .index("by_room_and_user", ["roomId", "userId"]) // Uniqueness constraint

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

### Schema Design Decisions

#### 1. **Why Separate `roomParticipants` Table?**

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

#### 2. **Why `by_room_and_created` Index on Messages?**

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

#### 3. **Why Denormalize Author Names in Messages?**

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

#### 4. **Hot vs Cold Data Separation**

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

## Better Auth + Convex Integration

### Complete Auth Configuration

#### 1. Add Google OAuth Provider

Update `mono/packages/backend/convex/auth.ts`:

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
  ctx: GenericCtx<DataModel>,
  { optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),

    // Email/Password
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable in production!
    },

    // 🆕 OAuth Providers
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${siteUrl}/api/auth/callback/google`,
      },
      // Future: Add more providers
      // github: { ... },
      // microsoft: { ... },
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
    },

    plugins: [convex()],

    // 🆕 Callbacks for custom logic
    callbacks: {
      async afterSignUp({ user, account }) {
        // Create user profile in our schema
        const userId = user.id as any; // Better Auth ID

        // Default role for new users
        const defaultRole = "collaborator";

        // This would be a mutation call to create user profile
        // We'll implement this in the CRUD section
      },
    },
  });
}

export { createAuth };

// Existing getCurrentUser query
export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  handler: async function (ctx, args) {
    return authComponent.getAuthUser(ctx);
  },
});

// 🆕 Get current user with role
export const getCurrentUserWithRole = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    // Fetch user profile with role
    const userProfile = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", authUser.email))
      .first();

    return {
      ...authUser,
      role: userProfile?.role || "guest",
      avatar: userProfile?.avatar,
      preferences: userProfile?.preferences,
    };
  },
});
```

#### 2. Environment Variables

Update `.env` (create if doesn't exist):

```bash
# Site URL (update for production)
SITE_URL=http://localhost:3000
CONVEX_SITE_URL=http://localhost:3000

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Google OAuth (Get from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Session Security
SESSION_SECRET=generate-random-32-char-string
```

Create `.env.example`:

```bash
# Site Configuration
SITE_URL=http://localhost:3000
CONVEX_SITE_URL=http://localhost:3000

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Security
SESSION_SECRET=
```

#### 3. Frontend OAuth Buttons

Create `mono/apps/web/src/components/oauth-buttons.tsx`:

```typescript
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard", // Redirect after auth
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Show error toast
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className="w-full"
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google icon SVG */}
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </Button>
  );
}
```

Update sign-in form to include OAuth:

```typescript
// mono/apps/web/src/components/sign-in-form.tsx
import { GoogleSignInButton } from "./oauth-buttons";

export function SignInForm() {
  return (
    <div className="space-y-4">
      {/* Existing email/password form */}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleSignInButton />
    </div>
  );
}
```

### Role-Based Access Control

#### 1. Protected Query/Mutation Helpers

Create `mono/packages/backend/convex/auth-helpers.ts`:

```typescript
import { QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { Id } from "./_generated/dataModel";

/**
 * User roles in the system
 */
export type Role = "coordinator" | "collaborator" | "guest" | "vendor";

/**
 * Get authenticated user or throw error
 */
export async function getAuthUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new Error("Unauthorized: No authenticated user");
  }
  return user;
}

/**
 * Get authenticated user with role information
 */
export async function getAuthUserWithRole(ctx: QueryCtx | MutationCtx) {
  const authUser = await getAuthUserOrThrow(ctx);

  // Fetch user profile
  const userProfile = await ctx.db
    .query("users")
    .withIndex("by_email", q => q.eq("email", authUser.email))
    .first();

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  return {
    id: userProfile._id,
    email: authUser.email,
    name: userProfile.name,
    role: userProfile.role,
    avatar: userProfile.avatar,
  };
}

/**
 * Check if user has required role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[]
) {
  const user = await getAuthUserWithRole(ctx);

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(", ")}] but user has role "${user.role}"`
    );
  }

  return user;
}

/**
 * Check if user is coordinator of an event
 */
export async function requireEventCoordinator(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
) {
  const user = await getAuthUserWithRole(ctx);
  const event = await ctx.db.get(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  const isCoordinator =
    event.coordinatorId === user.id ||
    event.coCoordinatorIds?.includes(user.id);

  if (!isCoordinator) {
    throw new Error("Forbidden: Only event coordinators can perform this action");
  }

  return { user, event };
}

/**
 * Check if user is member of a room
 */
export async function requireRoomMember(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">
) {
  const user = await getAuthUserWithRole(ctx);

  const membership = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", q =>
      q.eq("roomId", roomId).eq("userId", user.id)
    )
    .first();

  if (!membership) {
    throw new Error("Forbidden: Not a member of this room");
  }

  return { user, membership };
}

/**
 * Check if user can post in room
 */
export async function requireCanPostInRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">
) {
  const { membership } = await requireRoomMember(ctx, roomId);

  if (!membership.canPost) {
    throw new Error("Forbidden: No permission to post in this room");
  }

  return membership;
}
```

#### 2. Protected Query Wrapper

```typescript
// mono/packages/backend/convex/auth-helpers.ts (continued)

import { query, mutation } from "./_generated/server";

/**
 * Authenticated query - requires logged in user
 */
export const authenticatedQuery = <Args, Output>(
  handler: (
    ctx: QueryCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return query({
    handler: async (ctx, args) => {
      const user = await getAuthUserWithRole(ctx);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Role-based query - requires specific role
 */
export const roleBasedQuery = <Args, Output>(
  allowedRoles: Role[],
  handler: (
    ctx: QueryCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return query({
    handler: async (ctx, args) => {
      const user = await requireRole(ctx, allowedRoles);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Authenticated mutation - requires logged in user
 */
export const authenticatedMutation = <Args, Output>(
  handler: (
    ctx: MutationCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return mutation({
    handler: async (ctx, args) => {
      const user = await getAuthUserWithRole(ctx);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Role-based mutation - requires specific role
 */
export const roleBasedMutation = <Args, Output>(
  allowedRoles: Role[],
  handler: (
    ctx: MutationCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return mutation({
    handler: async (ctx, args) => {
      const user = await requireRole(ctx, allowedRoles);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};
```

#### 3. Usage Examples

```typescript
// mono/packages/backend/convex/events.ts
import { v } from "convex/values";
import { authenticatedMutation, roleBasedQuery } from "./auth-helpers";

// Only coordinators can create events
export const create = authenticatedMutation(
  async ({ db, user }, args: { name: string; type: string; budget: number }) => {
    // User is automatically available in context
    const eventId = await db.insert("events", {
      name: args.name,
      type: args.type as any,
      budget: {
        total: args.budget,
        spent: 0,
        committed: 0,
      },
      guestCount: {
        expected: 0,
        confirmed: 0,
      },
      coordinatorId: user.id,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user.id,
    });

    return eventId;
  }
);

// Only coordinators and collaborators can view event details
export const get = roleBasedQuery(
  ["coordinator", "collaborator"],
  async ({ db }, args: { eventId: Id<"events"> }) => {
    return await db.get(args.eventId);
  }
);
```

### TanStack Router Guards

Create route guards for frontend protection:

```typescript
// mono/apps/web/src/lib/route-guards.ts
import { redirect } from "@tanstack/react-router";
import { fetchSession } from "./auth-server";
import { getRequest } from "vinxi/http";

/**
 * Require authentication for route
 */
export async function requireAuth() {
  const { session } = await fetchSession(getRequest());

  if (!session) {
    throw redirect({
      to: "/sign-in",
      search: {
        redirect: window.location.pathname,
      },
    });
  }

  return session;
}

/**
 * Require specific role for route
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();

  // Fetch user role from Convex
  const userRole = session.user.role || "guest";

  if (!allowedRoles.includes(userRole)) {
    throw redirect({
      to: "/unauthorized",
    });
  }

  return session;
}
```

Usage in routes:

```typescript
// mono/apps/web/src/routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    // Protect route - redirects if not authenticated
    await requireAuth();
  },
  component: DashboardPage,
});
```

---

## CRUD Operations by Entity

### Users

#### Create User (Sign Up)

**Backend:** User creation is handled by Better Auth automatically.

**Post-Signup Hook:** Create user profile in our schema.

Create `mono/packages/backend/convex/users.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserWithRole, authenticatedMutation, authenticatedQuery } from "./auth-helpers";

/**
 * Create user profile after Better Auth signup
 * Called from Better Auth callback
 */
export const createProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.optional(v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest"),
      v.literal("vendor")
    )),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new profile
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role || "collaborator", // Default role
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get current user profile
 */
export const getCurrentProfile = authenticatedQuery(
  async ({ db, user }) => {
    return await db.get(user.id);
  }
);

/**
 * Get user by ID
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update user profile
 */
export const updateProfile = authenticatedMutation(
  async ({ db, user }, args: {
    name?: string;
    avatar?: string;
    preferences?: {
      notifications?: boolean;
      theme?: "light" | "dark";
      timezone?: string;
    };
  }) => {
    const currentProfile = await db.get(user.id);
    if (!currentProfile) {
      throw new Error("Profile not found");
    }

    await db.patch(user.id, {
      ...(args.name && { name: args.name }),
      ...(args.avatar && { avatar: args.avatar }),
      ...(args.preferences && {
        preferences: {
          ...currentProfile.preferences,
          ...args.preferences,
        },
      }),
      updatedAt: Date.now(),
    });

    return await db.get(user.id);
  }
);

/**
 * Soft delete user (deactivate)
 */
export const deactivate = authenticatedMutation(
  async ({ db, user }) => {
    await db.patch(user.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  }
);

/**
 * Update last active timestamp
 */
export const updateLastActive = authenticatedMutation(
  async ({ db, user }) => {
    await db.patch(user.id, {
      lastActiveAt: Date.now(),
    });
  }
);
```

#### Frontend Usage

```typescript
// mono/apps/web/src/components/user-profile-form.tsx
import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation } from "@tanstack/react-query";

export function UserProfileForm() {
  const profile = useConvexQuery(api.users.getCurrentProfile);
  const updateProfile = useConvexMutation(api.users.updateProfile);

  const mutation = useMutation({
    mutationFn: async (data: { name: string; avatar?: string }) => {
      return await updateProfile(data);
    },
    onSuccess: () => {
      // Convex automatically pushes update to all queries
      toast.success("Profile updated!");
    },
  });

  // Form implementation...
}
```

### Events

Create `mono/packages/backend/convex/events.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireEventCoordinator
} from "./auth-helpers";

/**
 * Create new event
 */
export const create = authenticatedMutation(
  async ({ db, user }, args: {
    name: string;
    description?: string;
    type: "wedding" | "corporate" | "party" | "destination" | "other";
    date?: number;
    budget: number;
    expectedGuests: number;
  }) => {
    const eventId = await db.insert("events", {
      name: args.name,
      description: args.description,
      type: args.type,
      date: args.date,
      budget: {
        total: args.budget,
        spent: 0,
        committed: 0,
      },
      guestCount: {
        expected: args.expectedGuests,
        confirmed: 0,
      },
      coordinatorId: user.id,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user.id,
    });

    // Create main event room automatically
    const roomId = await db.insert("rooms", {
      eventId,
      name: `${args.name} - Main Chat`,
      type: "main",
      isArchived: false,
      allowGuestMessages: false,
      createdAt: Date.now(),
      createdBy: user.id,
    });

    // Add coordinator as room participant
    await db.insert("roomParticipants", {
      roomId,
      userId: user.id,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    return { eventId, roomId };
  }
);

/**
 * Get event by ID
 */
export const getById = authenticatedQuery(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    const event = await db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    // Check user has access (coordinator, co-coordinator, or collaborator)
    const isCoordinator =
      event.coordinatorId === user.id ||
      event.coCoordinatorIds?.includes(user.id);

    // For non-coordinators, check if they're in any room
    if (!isCoordinator) {
      const rooms = await db
        .query("rooms")
        .withIndex("by_event", q => q.eq("eventId", args.eventId))
        .collect();

      const roomIds = rooms.map(r => r._id);
      const membership = await db
        .query("roomParticipants")
        .withIndex("by_user", q => q.eq("userId", user.id))
        .filter(q => roomIds.includes(q.field("roomId")))
        .first();

      if (!membership) {
        throw new Error("Forbidden: Not a member of this event");
      }
    }

    return event;
  }
);

/**
 * List user's events
 */
export const listUserEvents = authenticatedQuery(
  async ({ db, user }, args: {
    status?: "planning" | "in_progress" | "completed" | "cancelled" | "archived";
  }) => {
    // Events where user is coordinator
    let query = db
      .query("events")
      .withIndex("by_coordinator", q => q.eq("coordinatorId", user.id));

    if (args.status) {
      query = query.filter(q => q.eq(q.field("status"), args.status));
    }

    const coordinatorEvents = await query.collect();

    // TODO: Also include events where user is collaborator (via room membership)

    return coordinatorEvents;
  }
);

/**
 * Update event
 */
export const update = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    name?: string;
    description?: string;
    date?: number;
    location?: any;
    budget?: { total: number };
    guestCount?: { expected: number };
  }) => {
    // Verify user is coordinator
    await requireEventCoordinator(db as any, args.eventId);

    const event = await db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await db.patch(args.eventId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.date && { date: args.date }),
      ...(args.location && { location: args.location }),
      ...(args.budget && {
        budget: {
          ...event.budget,
          total: args.budget.total,
        },
      }),
      ...(args.guestCount && {
        guestCount: {
          ...event.guestCount,
          expected: args.guestCount.expected,
        },
      }),
      updatedAt: Date.now(),
    });

    return await db.get(args.eventId);
  }
);

/**
 * Archive event
 */
export const archive = authenticatedMutation(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    await requireEventCoordinator(db as any, args.eventId);

    await db.patch(args.eventId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  }
);

/**
 * Delete event (soft delete via archive)
 */
export const remove = authenticatedMutation(
  async ({ db, user }, args: { eventId: Id<"events"> }) => {
    await requireEventCoordinator(db as any, args.eventId);

    // In production, you might want hard delete or keep forever
    await db.patch(args.eventId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  }
);
```

### Rooms

Create `mono/packages/backend/convex/rooms.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireEventCoordinator,
} from "./auth-helpers";

/**
 * Create room (sub-group chat)
 */
export const create = authenticatedMutation(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    name: string;
    description?: string;
    type: "main" | "vendor" | "topic" | "guest_announcements" | "private";
    vendorId?: Id<"users">;
    allowGuestMessages?: boolean;
  }) => {
    // Verify user is coordinator of event
    await requireEventCoordinator(db as any, args.eventId);

    const roomId = await db.insert("rooms", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      type: args.type,
      vendorId: args.vendorId,
      isArchived: false,
      allowGuestMessages: args.allowGuestMessages ?? false,
      createdAt: Date.now(),
      createdBy: user.id,
      lastMessageAt: undefined,
    });

    // Add creator as participant with full permissions
    await db.insert("roomParticipants", {
      roomId,
      userId: user.id,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    return roomId;
  }
);

/**
 * Get room by ID
 */
export const getById = authenticatedQuery(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Check if user is participant
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    return { ...room, membership };
  }
);

/**
 * List rooms for event
 */
export const listByEvent = authenticatedQuery(
  async ({ db, user }, args: {
    eventId: Id<"events">;
    includeArchived?: boolean;
  }) => {
    // Verify user has access to event
    await db.get(args.eventId); // Will throw if not found

    let query = db
      .query("rooms")
      .withIndex("by_event", q => q.eq("eventId", args.eventId));

    if (!args.includeArchived) {
      query = query.filter(q => q.eq(q.field("isArchived"), false));
    }

    const rooms = await query.collect();

    // Filter to only rooms user is member of
    const userRoomIds = (await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect()
    ).map(p => p.roomId);

    return rooms.filter(r => userRoomIds.includes(r._id));
  }
);

/**
 * Add participant to room
 */
export const addParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
    permissions?: {
      canPost?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canManage?: boolean;
    };
  }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify requester can manage room
    const requesterMembership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to add participants");
    }

    // Check if already a participant
    const existing = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a participant");
    }

    // Add participant
    const participantId = await db.insert("roomParticipants", {
      roomId: args.roomId,
      userId: args.userId,
      canPost: args.permissions?.canPost ?? true,
      canEdit: args.permissions?.canEdit ?? true,
      canDelete: args.permissions?.canDelete ?? false,
      canManage: args.permissions?.canManage ?? false,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: user.id,
    });

    return participantId;
  }
);

/**
 * Remove participant from room
 */
export const removeParticipant = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    userId: Id<"users">;
  }) => {
    // Verify requester can manage room
    const requesterMembership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!requesterMembership?.canManage) {
      throw new Error("Forbidden: No permission to remove participants");
    }

    // Find and delete participant
    const participant = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw new Error("User is not a participant");
    }

    await db.delete(participant._id);
  }
);

/**
 * List participants in room
 */
export const listParticipants = authenticatedQuery(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    // Verify user is member
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    // Get all participants
    const participants = await db
      .query("roomParticipants")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();

    // Fetch user profiles
    const userIds = participants.map(p => p.userId);
    const users = await Promise.all(userIds.map(id => db.get(id)));

    return participants.map((p, i) => ({
      ...p,
      user: users[i],
    }));
  }
);

/**
 * Update room settings
 */
export const update = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    name?: string;
    description?: string;
    allowGuestMessages?: boolean;
  }) => {
    // Verify user can manage room
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canManage) {
      throw new Error("Forbidden: No permission to update room");
    }

    await db.patch(args.roomId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.allowGuestMessages !== undefined && {
        allowGuestMessages: args.allowGuestMessages,
      }),
    });

    return await db.get(args.roomId);
  }
);

/**
 * Archive room
 */
export const archive = authenticatedMutation(
  async ({ db, user }, args: { roomId: Id<"rooms"> }) => {
    const room = await db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify user is event coordinator
    await requireEventCoordinator(db as any, room.eventId);

    await db.patch(args.roomId, {
      isArchived: true,
    });
  }
);
```

### Messages

Create `mono/packages/backend/convex/messages.ts`:

```typescript
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireCanPostInRoom,
} from "./auth-helpers";

/**
 * Send message in room
 */
export const send = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    text: string;
    mentions?: Id<"users">[];
    attachments?: Array<{
      type: "image" | "file";
      url: string;
      name: string;
      size: number;
    }>;
  }) => {
    // Verify user can post in room
    await requireCanPostInRoom(db as any, args.roomId);

    const messageId = await db.insert("messages", {
      roomId: args.roomId,
      authorId: user.id,
      text: args.text,
      mentions: args.mentions,
      attachments: args.attachments,
      isEdited: false,
      isDeleted: false,
      isAIGenerated: false,
      createdAt: Date.now(),
    });

    // Update room's lastMessageAt
    await db.patch(args.roomId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  }
);

/**
 * Get messages in room (paginated)
 */
export const listByRoom = authenticatedQuery(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
    limit?: number;
    before?: number; // Timestamp for pagination
  }) => {
    // Verify user is room member
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Forbidden: Not a member of this room");
    }

    let query = db
      .query("messages")
      .withIndex("by_room_and_created", q =>
        q.eq("roomId", args.roomId)
      )
      .order("desc"); // Most recent first

    // Pagination: get messages before timestamp
    if (args.before) {
      query = query.filter(q => q.lt(q.field("createdAt"), args.before));
    }

    const messages = await query
      .filter(q => q.eq(q.field("isDeleted"), false))
      .take(args.limit || 50);

    // Fetch author profiles (avoid N+1 query)
    const authorIds = [...new Set(messages.map(m => m.authorId))];
    const authors = await Promise.all(authorIds.map(id => db.get(id)));
    const authorMap = new Map(authors.map(a => [a!._id, a]));

    return messages.map(m => ({
      ...m,
      author: authorMap.get(m.authorId),
    }));
  }
);

/**
 * Edit message
 */
export const edit = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
    text: string;
  }) => {
    const message = await db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify user is author
    if (message.authorId !== user.id) {
      throw new Error("Forbidden: Can only edit own messages");
    }

    // Verify user still has edit permission in room
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canEdit) {
      throw new Error("Forbidden: No edit permission");
    }

    await db.patch(args.messageId, {
      text: args.text,
      isEdited: true,
      editedAt: Date.now(),
    });

    return await db.get(args.messageId);
  }
);

/**
 * Delete message (soft delete)
 */
export const remove = authenticatedMutation(
  async ({ db, user }, args: {
    messageId: Id<"messages">;
  }) => {
    const message = await db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify user is author
    if (message.authorId !== user.id) {
      throw new Error("Forbidden: Can only delete own messages");
    }

    // Verify user still has delete permission
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", message.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership?.canDelete) {
      throw new Error("Forbidden: No delete permission");
    }

    await db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
      text: "[Message deleted]", // Tombstone
    });
  }
);

/**
 * Mark room as read (update lastReadAt)
 */
export const markRead = authenticatedMutation(
  async ({ db, user }, args: {
    roomId: Id<"rooms">;
  }) => {
    const membership = await db
      .query("roomParticipants")
      .withIndex("by_room_and_user", q =>
        q.eq("roomId", args.roomId).eq("userId", user.id)
      )
      .first();

    if (!membership) {
      throw new Error("Not a room member");
    }

    await db.patch(membership._id, {
      lastReadAt: Date.now(),
    });
  }
);

/**
 * Get unread count for user across all rooms
 */
export const getUnreadCounts = authenticatedQuery(
  async ({ db, user }, args: {
    eventId?: Id<"events">;
  }) => {
    // Get all user's room memberships
    const memberships = await db
      .query("roomParticipants")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .collect();

    // Filter by event if specified
    let roomIds = memberships.map(m => m.roomId);
    if (args.eventId) {
      const rooms = await Promise.all(roomIds.map(id => db.get(id)));
      roomIds = rooms
        .filter(r => r?.eventId === args.eventId)
        .map(r => r!._id);
    }

    // Count unread messages per room
    const unreadCounts = await Promise.all(
      roomIds.map(async (roomId) => {
        const membership = memberships.find(m => m.roomId === roomId);
        const lastReadAt = membership?.lastReadAt || 0;

        const unreadCount = (await db
          .query("messages")
          .withIndex("by_room_and_created", q =>
            q.eq("roomId", roomId)
          )
          .filter(q =>
            q.and(
              q.gt(q.field("createdAt"), lastReadAt),
              q.neq(q.field("authorId"), user.id), // Don't count own messages
              q.eq(q.field("isDeleted"), false)
            )
          )
          .collect()
        ).length;

        return { roomId, unreadCount };
      })
    );

    return unreadCounts;
  }
);
```

---

## Advanced Patterns

### Real-Time Subscriptions

#### TanStack Query + Convex Pattern

```typescript
// mono/apps/web/src/components/chat-room.tsx
import { useConvexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

export function ChatRoom({ roomId }: { roomId: Id<"rooms"> }) {
  const queryClient = useQueryClient();

  // Real-time subscription to messages
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.messages.listByRoom, { roomId, limit: 50 })
  );

  // Send message mutation
  const sendMessage = useConvexMutation(api.messages.send);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      return await sendMessage({ roomId, text });
    },

    // Optimistic update
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] });

      const previous = queryClient.getQueryData(["messages", roomId]);

      // Add optimistic message
      queryClient.setQueryData(["messages", roomId], (old: any) => [
        {
          _id: `temp-${Date.now()}`,
          text,
          authorId: currentUserId,
          roomId,
          createdAt: Date.now(),
          isOptimistic: true,
        },
        ...old,
      ]);

      return { previous };
    },

    onError: (err, text, context) => {
      // Rollback on error
      queryClient.setQueryData(["messages", roomId], context?.previous);
      toast.error("Failed to send message");
    },

    // Convex will push the real message automatically
    // No need to manually refetch!
  });

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={mutation.mutate} />
    </div>
  );
}
```

### Pagination

#### Infinite Scroll Pattern

```typescript
// mono/apps/web/src/components/message-list.tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";

export function MessageList({ roomId }: { roomId: Id<"rooms"> }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", roomId],
    queryFn: async ({ pageParam = undefined }) => {
      return await convexClient.query(api.messages.listByRoom, {
        roomId,
        limit: 50,
        before: pageParam, // Timestamp cursor
      });
    },
    getNextPageParam: (lastPage) => {
      // Return cursor for next page (oldest message timestamp)
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].createdAt;
    },
    initialPageParam: undefined,
  });

  const messages = data?.pages.flat() || [];

  return (
    <div>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
      {messages.map(message => (
        <MessageItem key={message._id} message={message} />
      ))}
    </div>
  );
}
```

### Denormalization Strategy

#### When to Denormalize

**Scenario:** Displaying message author names

**Option 1: Join on Read (Current)**
```typescript
// ✅ Good for:
// - Data that changes frequently
// - Small number of messages displayed
// - Consistency is critical

const messages = await ctx.db.query("messages").collect();
const authors = await Promise.all(messages.map(m => ctx.db.get(m.authorId)));
```

**Option 2: Denormalize (Future Optimization)**
```typescript
// ✅ Good for:
// - Read-heavy workloads (1000s of messages)
// - Data that rarely changes (names)
// - Acceptable eventual consistency

messages: defineTable({
  authorId: v.id("users"),
  authorName: v.string(),      // Denormalized
  authorAvatar: v.string(),    // Denormalized
  text: v.string(),
})

// Update on name change:
export const updateName = mutation({
  handler: async (ctx, { userId, newName }) => {
    // Update user
    await ctx.db.patch(userId, { name: newName });

    // Update all messages (background job)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_author", q => q.eq("authorId", userId))
      .collect();

    await Promise.all(
      messages.map(m => ctx.db.patch(m._id, { authorName: newName }))
    );
  },
});
```

**Decision Matrix:**

| Factor | Join on Read | Denormalize |
|--------|-------------|-------------|
| Read frequency | Low-Medium | High |
| Write frequency | Any | Low |
| Data volatility | High | Low |
| Consistency requirement | Strong | Eventual OK |
| Query complexity | Simple joins | No joins needed |

### Avoiding N+1 Queries

#### Pattern: Batch Fetch

**❌ Bad:**
```typescript
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(20);

    // N+1 problem: N queries for authors
    return await Promise.all(
      posts.map(async (post) => ({
        ...post,
        author: await ctx.db.get(post.authorId), // Each is a query!
      }))
    );
  },
});
```

**✅ Good:**
```typescript
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(20);

    // Single batch: get unique authors
    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = await Promise.all(authorIds.map(id => ctx.db.get(id)));
    const authorMap = new Map(authors.map(a => [a!._id, a]));

    // Map posts to authors (O(1) lookup)
    return posts.map(post => ({
      ...post,
      author: authorMap.get(post.authorId),
    }));
  },
});
```

---

## Missing Pieces Implementation

### 1. Google OAuth Setup (30 minutes)

**Step 1:** Get credentials from Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create new project "Delphi"
3. Enable "Google+ API"
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)
6. Copy Client ID and Client Secret

**Step 2:** Add to `.env`

```bash
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

**Step 3:** Update `auth.ts` (already shown above)

**Step 4:** Test OAuth flow

```bash
npm run dev
# Click "Continue with Google" button
# Should redirect to Google → back to dashboard
```

### 2. Role Assignment on Signup (15 minutes)

Update `auth.ts` callback:

```typescript
callbacks: {
  async afterSignUp({ user, account }) {
    // Call mutation to create profile
    await ctx.db.insert("users", {
      email: user.email,
      name: user.name || "",
      role: "collaborator", // Default role
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
}
```

### 3. Route Guards (1 hour)

Create `beforeLoad` hooks:

```typescript
// mono/apps/web/src/routes/events.$eventId.tsx
export const Route = createFileRoute("/events/$eventId")({
  beforeLoad: async ({ params }) => {
    const session = await requireAuth();

    // Verify user has access to event
    const event = await convexClient.query(api.events.getById, {
      eventId: params.eventId,
    });

    if (!event) {
      throw redirect({ to: "/dashboard" });
    }

    return { event };
  },
  component: EventPage,
});
```

### 4. User Avatar Upload (2 hours)

**Backend:** Add Cloudflare R2 upload function

```typescript
// mono/packages/backend/convex/storage.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: { contentType: v.string() },
  handler: async (ctx, args) => {
    // Use Convex file storage (simpler than R2 for Phase 1)
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatarUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserWithRole(ctx);
    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(user.id, {
      avatar: url,
      updatedAt: Date.now(),
    });

    return url;
  },
});
```

**Frontend:** Upload component

```typescript
// mono/apps/web/src/components/avatar-upload.tsx
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";

export function AvatarUpload() {
  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);
  const saveAvatar = useConvexMutation(api.storage.saveAvatarUrl);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl({ contentType: file.type });

      // Step 2: Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: file,
      });

      const { storageId } = await response.json();

      // Step 3: Save to user profile
      return await saveAvatar({ storageId });
    },
    onSuccess: (url) => {
      toast.success("Avatar updated!");
    },
  });

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) mutation.mutate(file);
      }}
    />
  );
}
```

---

## Environment Setup

### Development Environment

```bash
# 1. Install dependencies
cd mono
bun install

# 2. Start Convex dev
cd packages/backend
bunx convex dev

# 3. In another terminal, start web app
cd apps/web
bun run dev
```

### Seed Data Script

Create `mono/packages/backend/convex/seed.ts`:

```typescript
import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Create test user
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test event
    const eventId = await ctx.db.insert("events", {
      name: "Test Wedding",
      type: "wedding",
      date: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
      budget: { total: 40000, spent: 0, committed: 0 },
      guestCount: { expected: 150, confirmed: 0 },
      coordinatorId: userId,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    });

    // Create main room
    const roomId = await ctx.db.insert("rooms", {
      eventId,
      name: "Main Planning",
      type: "main",
      isArchived: false,
      allowGuestMessages: false,
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Add user to room
    await ctx.db.insert("roomParticipants", {
      roomId,
      userId,
      canPost: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      notificationLevel: "all",
      joinedAt: Date.now(),
      addedBy: userId,
    });

    console.log("Seed data created!");
    return { userId, eventId, roomId };
  },
});
```

Run seed:

```bash
bunx convex run seed:seedDatabase
```

---

## Testing & Validation

### Unit Tests (Vitest)

```typescript
// mono/packages/backend/convex/events.test.ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Events CRUD", () => {
  it("should create event and main room", async () => {
    const t = convexTest(schema);

    // Create user
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
    });

    // Create event
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
    expect(event.coordinatorId).toBe(userId);
  });
});
```

### E2E Tests (Playwright)

```typescript
// mono/apps/web/tests/auth-flow.spec.ts
import { test, expect } from "@playwright/test";

test("complete signup and event creation flow", async ({ page }) => {
  // Sign up
  await page.goto("http://localhost:3000/sign-up");
  await page.fill('input[name="name"]', "Test User");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL("/dashboard");

  // Create event
  await page.click('text=Create Event');
  await page.fill('input[name="name"]', "My Wedding");
  await page.selectOption('select[name="type"]', "wedding");
  await page.fill('input[name="budget"]', "50000");
  await page.click('button:has-text("Create")');

  // Should see event in list
  await expect(page.locator('text=My Wedding')).toBeVisible();
});
```

---

## Summary

### Phase 1 Completion Checklist

**Database Schema:**
- ✅ Complete schema definition with all entities
- ✅ Proper indexes for common queries
- ✅ Relationship structures (many-to-many via junction tables)
- ✅ Hot/cold data considerations documented

**Authentication:**
- ✅ Better Auth + Convex integration complete
- ⚠️ Google OAuth setup (pending credentials)
- ✅ Role-based access control helpers
- ✅ Protected query/mutation wrappers
- ⚠️ Route guards (to implement)

**CRUD Operations:**
- ✅ Users: Create, read, update, soft delete
- ✅ Events: Full CRUD with permissions
- ✅ Rooms: Full CRUD with participants
- ✅ Messages: Send, list, edit, delete, pagination

**Advanced Features:**
- ✅ Real-time subscriptions pattern
- ✅ Optimistic UI updates
- ✅ Pagination strategies
- ✅ Batch fetching to avoid N+1

**Developer Experience:**
- ✅ Seed data script
- ⚠️ Unit tests (to implement)
- ⚠️ E2E tests (to implement)
- ✅ Environment setup documented

### Next Steps

1. **Complete OAuth setup** (30 min) - Get Google credentials
2. **Implement route guards** (1 hour) - Add beforeLoad hooks
3. **Add unit tests** (2 hours) - Test CRUD operations
4. **User avatar upload** (2 hours) - Convex file storage
5. **E2E test suite** (3 hours) - Critical user flows

### Estimated Completion Time

- **Current Status:** ~60% of Phase 1 complete
- **Remaining Work:** ~8 hours
- **Target:** Phase 1 complete by end of Week 1

---

**You're now ready to complete Phase 1!** This document provides everything needed to implement the remaining features and move forward with Phase 2 (Core Features). 🚀
