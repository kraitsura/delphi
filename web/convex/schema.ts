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
    bio: v.optional(v.string()),
    location: v.optional(v.string()),

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
      themeSet: v.optional(v.union(
        v.literal("default"),
        v.literal("patagonia"),
        v.literal("redwood")
      )),
      accent: v.optional(v.union(
        v.literal("indigo"),
        v.literal("rose"),
        v.literal("forest"),
        v.literal("amber"),
        v.literal("teal")
      )),
      themeMode: v.optional(v.union(
        v.literal("light"),
        v.literal("dark"),
        v.literal("system")
      )),
      // Legacy field for backwards compatibility
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
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
    .index("by_active", ["isActive"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["isActive"],
    }),

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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_coordinator", ["coordinatorId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_type", ["type"])
    .index("by_deleted", ["isDeleted"])
    // Compound index for user's active events
    .index("by_coordinator_and_status", ["coordinatorId", "status"])
    .index("by_coordinator_and_deleted", ["coordinatorId", "isDeleted"]),

  // ==========================================
  // EVENT MEMBERS (Junction Table)
  // ==========================================

  /**
   * Event Members - Junction table for event membership
   * Tracks all participants of an event with their roles
   * Separate from room-level access for clearer permissions
   */
  eventMembers: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),

    // User's role in this event
    role: v.union(
      v.literal("coordinator"),   // Can manage event and invite others
      v.literal("collaborator"),  // Can participate and contribute
      v.literal("guest"),          // Limited access, view-only
      v.literal("vendor")         // Vendor-specific access
    ),

    // Metadata
    joinedAt: v.number(),
    addedBy: v.id("users"), // Who added this member

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_and_user", ["eventId", "userId"]) // For unique membership check
    .index("by_event_and_role", ["eventId", "role"]) // For role-based queries
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

  // ==========================================
  // EVENT INVITATIONS
  // ==========================================

  /**
   * Event Invitations - Invite users to collaborate on events
   * Generates unique tokens for email-based invitations
   */
  eventInvitations: defineTable({
    eventId: v.id("events"),

    // Invitee Info
    invitedEmail: v.string(),
    invitedByUserId: v.id("users"),

    // Role to be assigned when accepted
    role: v.union(
      v.literal("coordinator"),   // Co-coordinator with full permissions
      v.literal("collaborator"),  // Collaborator with limited permissions
      v.literal("guest")          // Guest with read-only access
    ),

    // Invitation Status
    status: v.union(
      v.literal("pending"),     // Sent but not yet accepted
      v.literal("accepted"),    // User accepted the invitation
      v.literal("declined"),    // User declined the invitation
      v.literal("cancelled"),   // Cancelled by coordinator before acceptance
      v.literal("expired")      // Invitation expired
    ),

    // Security
    token: v.string(), // Unique token for invitation link
    expiresAt: v.number(), // Expiration timestamp (7 days from creation)

    // Timestamps
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),

    // Optional message from inviter
    message: v.optional(v.string()),

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["invitedEmail"])
    .index("by_token", ["token"]) // For invitation link lookups
    .index("by_status", ["status"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_invited_by", ["invitedByUserId"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_type", ["type"])
    .index("by_event_and_type", ["eventId", "type"])
    .index("by_vendor", ["vendorId"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_and_user", ["roomId", "userId"]) // Uniqueness constraint
    .index("by_deleted", ["isDeleted"])
    .index("by_room_and_deleted", ["roomId", "isDeleted"]),

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
    isDeleted: v.optional(v.boolean()),
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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_status", ["status"])
    .index("by_event_and_status", ["eventId", "status"])
    .index("by_due_date", ["dueDate"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_paid_by", ["paidBy"])
    .index("by_event_and_category", ["eventId", "category"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

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

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_room", ["roomId"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),

  /**
   * PollVotes - Individual poll responses
   */
  pollVotes: defineTable({
    pollId: v.id("polls"),
    userId: v.id("users"),
    optionIds: v.array(v.string()), // Can vote for multiple if allowed

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_poll", ["pollId"])
    .index("by_user", ["userId"])
    .index("by_poll_and_user", ["pollId", "userId"]) // One vote per user per poll
    .index("by_deleted", ["isDeleted"])
    .index("by_poll_and_deleted", ["pollId", "isDeleted"]),

  // ==========================================
  // DASHBOARDS (Fluid UI System)
  // ==========================================

  /**
   * Dashboards - Dynamic dashboard configurations for Fluid UI
   * Stores JSON configuration for dashboard layouts
   */
  dashboards: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    config: v.any(), // DashboardConfig JSON
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_event_and_user", ["eventId", "userId"])
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_deleted", ["isDeleted"])
    .index("by_event_and_deleted", ["eventId", "isDeleted"]),
});
