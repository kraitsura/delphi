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
        v.literal("redwood"),
        v.literal("flare"),
        v.literal("ocean"),
        v.literal("twilight"),
        v.literal("moss")
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
      v.literal("travel"),
      v.literal("other")
    ),

    // Event Details
    eventDate: v.optional(v.number()), // Event date timestamp
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
      currency: v.string(), // USD, EUR, etc.
      allocated: v.optional(v.object({
        venue: v.optional(v.number()),
        catering: v.optional(v.number()),
        photography: v.optional(v.number()),
        music: v.optional(v.number()),
        decor: v.optional(v.number()),
        other: v.optional(v.number()),
      })),
      spent: v.number(), // Computed from expenses
      remaining: v.number(), // Computed: total - spent
      committed: v.number(), // Amount committed but not yet spent
    }),

    // Guest Count
    guestCount: v.optional(v.object({
      confirmed: v.number(),
      expected: v.number(),
    })),

    // Ownership
    coordinatorId: v.id("users"), // Primary coordinator
    coCoordinatorIds: v.optional(v.array(v.id("users"))), // Additional coordinators

    // Status
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),

    // AI Context (for agents)
    aiContext: v.optional(v.object({
      preferences: v.optional(v.any()), // User preferences extracted
      constraints: v.optional(v.array(v.string())), // Budget, date, location limits
      priorities: v.optional(v.array(v.string())), // What matters most
    })),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_coordinator", ["coordinatorId", "createdAt"])
    .index("by_coordinator_and_status", ["coordinatorId", "status"])
    .index("by_status", ["status", "eventDate"])
    .index("by_date", ["eventDate"]),

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
      v.literal("agent_invocation"),
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
    // Basic Info
    title: v.string(),
    description: v.optional(v.string()),

    // Associations
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    groupId: v.optional(v.id("taskGroups")),

    // Assignment
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),

    // Categorization
    category: v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("decor"),
      v.literal("invitations"),
      v.literal("transportation"),
      v.literal("accommodation"),
      v.literal("other")
    ),

    // Timeline
    createdAt: v.number(),
    updatedAt: v.number(),
    deadline: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Priority & Status
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("completed"),
      v.literal("cancelled")
    ),

    // Cost Estimation (AI-enriched)
    estimatedCost: v.optional(v.object({
      min: v.number(),
      max: v.number(),
      currency: v.string(),
      confidence: v.number(), // 0-1 score from AI
    })),

    // Dependencies
    dependsOn: v.optional(v.array(v.id("tasks"))),
    blockedBy: v.optional(v.array(v.id("tasks"))),

    // AI Enrichment
    aiMetadata: v.optional(v.object({
      suggestedVendors: v.optional(v.array(v.object({
        name: v.string(),
        category: v.string(),
        estimatedCost: v.optional(v.string()),
        source: v.string(), // "web_search", "database", etc.
      }))),
      nextSteps: v.optional(v.array(v.string())),
      reasoning: v.optional(v.string()), // Why AI set deadline/cost
      relatedTasks: v.optional(v.array(v.id("tasks"))),
    })),

    // Source tracking
    sourceMessageId: v.optional(v.id("messages")), // Which message created this

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "createdAt"])
    .index("by_event_and_deleted", ["eventId", "deletedAt"])
    .index("by_room", ["roomId", "createdAt"])
    .index("by_status", ["eventId", "status", "priority"])
    .index("by_deadline", ["eventId", "deadline"])
    .index("by_assignee", ["assignedTo", "status"])
    .index("by_group", ["groupId", "createdAt"]),

  // ==========================================
  // EXPENSES (Phase 2, but define now)
  // ==========================================

  /**
   * Expenses - Budget tracking
   */
  expenses: defineTable({
    // Basic Info
    description: v.string(),
    amount: v.number(),
    currency: v.string(),

    // Associations
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    taskId: v.optional(v.id("tasks")), // Link to related task
    vendorId: v.optional(v.id("vendors")),

    // Categorization (AI-detected)
    category: v.union(
      v.literal("venue"),
      v.literal("catering"),
      v.literal("photography"),
      v.literal("music"),
      v.literal("decor"),
      v.literal("supplies"),
      v.literal("transportation"),
      v.literal("accommodation"),
      v.literal("other")
    ),

    // Payment Info
    paidBy: v.id("users"),
    paidAt: v.number(), // When payment was made
    dueDate: v.optional(v.number()), // When payment is due
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue")
    )),
    paymentMethod: v.optional(v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("transfer"),
      v.literal("check"),
      v.literal("other")
    )),

    // Split Info (if applicable)
    split: v.optional(v.object({
      type: v.union(
        v.literal("equal"), // Split evenly
        v.literal("custom"), // Custom amounts per person
        v.literal("percentage") // Percentage split
      ),
      participants: v.array(v.object({
        userId: v.id("users"),
        amount: v.number(),
        paid: v.boolean(),
      })),
    })),

    // Receipts & Proof
    receiptUrl: v.optional(v.string()),
    receiptStorageId: v.optional(v.string()),

    // AI Context
    aiMetadata: v.optional(v.object({
      categoryConfidence: v.number(), // How sure AI is about category
      suggestedBudgetImpact: v.optional(v.string()),
      extractedFrom: v.optional(v.string()), // Message text
    })),

    // Tracking
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    sourceMessageId: v.optional(v.id("messages")),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "paidAt"])
    .index("by_event_and_deleted", ["eventId", "deletedAt"])
    .index("by_room", ["roomId", "paidAt"])
    .index("by_category", ["eventId", "category"])
    .index("by_payer", ["paidBy", "paidAt"])
    .index("by_task", ["taskId"]),

  // ==========================================
  // VENDORS
  // ==========================================

  /**
   * Vendors - Vendor research & contract management
   */
  vendors: defineTable({
    // Basic Info
    name: v.string(),
    category: v.string(), // photographer, caterer, venue, etc.
    description: v.optional(v.string()),

    // Contact
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),

    // Location
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),

    // Pricing
    pricing: v.optional(v.object({
      min: v.optional(v.number()),
      max: v.optional(v.number()),
      currency: v.string(),
      notes: v.optional(v.string()),
    })),

    // Ratings & Reviews
    rating: v.optional(v.number()), // 0-5
    reviewCount: v.optional(v.number()),
    reviewSource: v.optional(v.string()), // "The Knot", "Yelp", etc.

    // Association
    eventId: v.optional(v.id("events")), // If specific to event
    roomId: v.optional(v.id("rooms")), // If discussed in specific chat

    // Vendor Status
    status: v.union(
      v.literal("researching"), // Just found, researching
      v.literal("contacted"), // Reached out
      v.literal("negotiating"), // In talks
      v.literal("contracted"), // Agreement signed
      v.literal("active"), // Currently providing service
      v.literal("completed"), // Service delivered
      v.literal("rejected") // Decided not to use
    ),

    // AI Enrichment
    aiMetadata: v.optional(v.object({
      matchScore: v.optional(v.number()), // How well vendor matches requirements
      pros: v.optional(v.array(v.string())),
      cons: v.optional(v.array(v.string())),
      specialties: v.optional(v.array(v.string())),
      availability: v.optional(v.string()),
      searchQuery: v.optional(v.string()), // What query found this vendor
      scrapedAt: v.optional(v.number()), // When data was scraped
    })),

    // Contract & Agreements
    contractUrl: v.optional(v.string()),
    contractStorageId: v.optional(v.string()),
    contractSignedAt: v.optional(v.number()),

    // Tracking
    addedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    sourceMessageId: v.optional(v.id("messages")),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "category"])
    .index("by_room", ["roomId", "createdAt"])
    .index("by_category", ["category", "rating"])
    .index("by_status", ["eventId", "status"]),

  // ==========================================
  // TASK GROUPS
  // ==========================================

  /**
   * Task Groups - Organization and categorization of tasks
   */
  taskGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),

    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),

    // Organization
    color: v.optional(v.string()), // Hex color for UI
    icon: v.optional(v.string()),
    order: v.number(), // Display order

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Stats (computed)
    taskCount: v.number(),
    completedCount: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "order"])
    .index("by_room", ["roomId", "order"]),

  // ==========================================
  // DECISIONS
  // ==========================================

  /**
   * Decisions - Group decision making and polls
   */
  decisions: defineTable({
    // Basic Info
    question: v.string(),
    description: v.optional(v.string()),

    // Association
    eventId: v.id("events"),
    roomId: v.id("rooms"),

    // Poll Type
    type: v.union(
      v.literal("binary"), // Yes/No
      v.literal("multiple_choice"), // Pick one
      v.literal("ranked"), // Rank preferences
      v.literal("budget_allocation") // Allocate budget
    ),

    // Options
    options: v.array(v.object({
      id: v.string(),
      text: v.string(),
      votes: v.number(),
      voters: v.array(v.id("users")),
    })),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("closed"),
      v.literal("cancelled")
    ),

    // Outcome
    selectedOption: v.optional(v.string()), // ID of winning option
    closedAt: v.optional(v.number()),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    sourceMessageId: v.optional(v.id("messages")),

    // AI Suggestion
    suggestedByAI: v.boolean(),
    aiReasoning: v.optional(v.string()),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "status"])
    .index("by_room", ["roomId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  // ==========================================
  // CHECKPOINTS (DO State Recovery)
  // ==========================================

  /**
   * Checkpoints - Durable Object state snapshots for recovery
   */
  checkpoints: defineTable({
    // Association
    roomId: v.id("rooms"),
    doInstanceId: v.string(), // Durable Object ID

    // Checkpoint Data
    checkpointId: v.number(), // Sequential ID
    snapshot: v.string(), // Compressed JSON of DO state

    // Metadata
    messageCount: v.number(),
    memorySize: v.number(), // Bytes

    // Timestamps
    createdAt: v.number(),

    // Validation
    checksum: v.optional(v.string()),
  })
    .index("by_room", ["roomId", "checkpointId"])
    .index("by_do", ["doInstanceId", "checkpointId"]),

  // ==========================================
  // GUESTS
  // ==========================================

  /**
   * Guests - Guest management, RSVP tracking, seating
   */
  guests: defineTable({
    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    // Association
    eventId: v.id("events"),
    invitedBy: v.id("users"),

    // Guest Type
    guestType: v.union(
      v.literal("vip"),
      v.literal("family"),
      v.literal("friend"),
      v.literal("colleague"),
      v.literal("plus_one")
    ),

    // RSVP Tracking
    rsvpStatus: v.union(
      v.literal("pending"),
      v.literal("attending"),
      v.literal("declined"),
      v.literal("maybe")
    ),
    rsvpDate: v.optional(v.number()),
    plusOneAllowed: v.boolean(),
    plusOneName: v.optional(v.string()),
    plusOneRsvp: v.optional(v.string()),

    // Special Requirements
    dietaryRestrictions: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    accessibilityNeeds: v.optional(v.string()),

    // Seating
    tableNumber: v.optional(v.number()),
    seatNumber: v.optional(v.number()),
    seatingGroup: v.optional(v.string()), // "bride_side", "groom_side", etc.

    // Gifts & Thank Yous
    giftReceived: v.optional(v.object({
      description: v.string(),
      receivedDate: v.number(),
      estimatedValue: v.optional(v.number()),
    })),
    thankYouSent: v.optional(v.boolean()),
    thankYouSentDate: v.optional(v.number()),

    // Contact History
    invitationSentDate: v.optional(v.number()),
    reminderSentDate: v.optional(v.number()),

    // Metadata
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "lastName"])
    .index("by_rsvp", ["eventId", "rsvpStatus"])
    .index("by_table", ["eventId", "tableNumber"])
    .index("by_type", ["eventId", "guestType"]),

  // ==========================================
  // PAYMENT SCHEDULES
  // ==========================================

  /**
   * Payment Schedules - Payment tracking and reminders
   */
  paymentSchedules: defineTable({
    // Association
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    expenseId: v.optional(v.id("expenses")), // Link to actual expense when paid

    // Payment Details
    description: v.string(),
    amount: v.number(),
    currency: v.string(),

    // Schedule
    dueDate: v.number(),
    paidDate: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("upcoming"),
      v.literal("due_soon"),
      v.literal("overdue"),
      v.literal("paid"),
      v.literal("cancelled")
    ),

    // Payment Method
    paymentMethod: v.optional(v.string()),
    confirmationNumber: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),

    // Reminders
    reminderSent: v.optional(v.boolean()),
    reminderDate: v.optional(v.number()),

    // Metadata
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "dueDate"])
    .index("by_vendor", ["vendorId", "dueDate"])
    .index("by_status", ["eventId", "status"]),

  // ==========================================
  // MILESTONES
  // ==========================================

  /**
   * Milestones - Strategic planning checkpoints
   */
  milestones: defineTable({
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),

    // Association
    eventId: v.id("events"),
    category: v.string(),

    // Timeline
    targetDate: v.number(),
    completedDate: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("at_risk"),
      v.literal("completed")
    ),

    // Dependencies
    dependsOnMilestones: v.optional(v.array(v.id("milestones"))),
    blocksTasks: v.optional(v.array(v.id("tasks"))),

    // Completion Criteria
    completionCriteria: v.optional(v.array(v.string())),

    // Impact
    criticality: v.union(
      v.literal("nice_to_have"),
      v.literal("important"),
      v.literal("critical")
    ),

    // AI Enrichment
    industryStandardTiming: v.optional(v.string()),
    risks: v.optional(v.array(v.string())),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "targetDate"])
    .index("by_status", ["eventId", "status", "criticality"])
    .index("by_criticality", ["eventId", "criticality"]),

  // ==========================================
  // TIMELINE EVENTS
  // ==========================================

  /**
   * Timeline Events - Day-of coordination and scheduling
   */
  timelineEvents: defineTable({
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),

    // Association
    eventId: v.id("events"),

    // Timing (minute-level precision)
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()), // Minutes

    // Type
    type: v.union(
      v.literal("setup"),
      v.literal("vendor_arrival"),
      v.literal("ceremony"),
      v.literal("reception"),
      v.literal("activity"),
      v.literal("meal"),
      v.literal("teardown")
    ),

    // Location
    location: v.optional(v.string()),

    // People Involved
    responsiblePerson: v.optional(v.id("users")),
    vendorsInvolved: v.optional(v.array(v.id("vendors"))),
    participantsRequired: v.optional(v.array(v.id("guests"))),

    // Status (day-of tracking)
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("delayed"),
      v.literal("cancelled")
    ),
    actualStartTime: v.optional(v.number()),
    actualEndTime: v.optional(v.number()),

    // Dependencies
    mustStartAfter: v.optional(v.array(v.id("timelineEvents"))),

    // Alerts
    alertMinutesBefore: v.optional(v.number()),

    // Notes & Updates
    notes: v.optional(v.string()),
    liveUpdates: v.optional(v.array(v.object({
      timestamp: v.number(),
      update: v.string(),
      updatedBy: v.id("users"),
    }))),

    // Order
    order: v.number(),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "startTime"])
    .index("by_status", ["eventId", "status"])
    .index("by_order", ["eventId", "order"]),

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================

  /**
   * Announcements - Guest communications and broadcasts
   */
  announcements: defineTable({
    // Content
    title: v.string(),
    message: v.string(),

    // Association
    eventId: v.id("events"),

    // Type
    type: v.union(
      v.literal("save_the_date"),
      v.literal("invitation"),
      v.literal("update"),
      v.literal("reminder"),
      v.literal("info"),
      v.literal("thank_you")
    ),

    // Delivery
    deliveryMethod: v.array(v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("in_app")
    )),

    // Recipients
    sendToAll: v.boolean(),
    sendToRsvpStatus: v.optional(v.array(v.string())),
    sendToTags: v.optional(v.array(v.string())),
    customRecipients: v.optional(v.array(v.id("guests"))),

    // Scheduling
    scheduledSendTime: v.optional(v.number()),
    sentAt: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("failed")
    ),

    // Tracking
    deliveryStats: v.optional(v.object({
      totalSent: v.number(),
      delivered: v.number(),
      opened: v.number(),
      clicked: v.number(),
      bounced: v.number(),
    })),

    // Attachments
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      storageId: v.string(),
    }))),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "createdAt"])
    .index("by_status", ["eventId", "status"])
    .index("by_type", ["eventId", "type"]),

  // ==========================================
  // INVENTORY
  // ==========================================

  /**
   * Inventory - Rentals and supplies tracking
   */
  inventory: defineTable({
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),

    // Association
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),

    // Quantity & Type
    quantity: v.number(),
    unit: v.string(),

    // Acquisition
    acquisitionType: v.union(
      v.literal("rented"),
      v.literal("purchased"),
      v.literal("borrowed"),
      v.literal("owned")
    ),

    // Rental Specific
    rentalDetails: v.optional(v.object({
      pickupDate: v.number(),
      returnDate: v.number(),
      returnLocation: v.string(),
      deposit: v.optional(v.number()),
      damagePolicy: v.optional(v.string()),
    })),

    // Cost
    costPerUnit: v.number(),
    totalCost: v.number(),
    expenseId: v.optional(v.id("expenses")),

    // Status
    status: v.union(
      v.literal("ordered"),
      v.literal("delivered"),
      v.literal("in_use"),
      v.literal("returned"),
      v.literal("lost_damaged")
    ),

    // Condition Tracking
    conditionNotes: v.optional(v.string()),
    photoUrl: v.optional(v.string()),

    // Storage Location
    storageLocation: v.optional(v.string()),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Soft delete
    deletedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId", "category"])
    .index("by_status", ["eventId", "status"]),

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

  // ==========================================
  // AGENT SYSTEM (Phase 1 - Foundation)
  // ==========================================

  /**
   * Agent Responses - Stores AI agent responses for tracking and analytics
   * Phase 1: Basic tracking of agent invocations and responses
   */
  agentResponses: defineTable({
    roomId: v.id("rooms"),
    eventId: v.id("events"),
    invokedBy: v.id("users"),
    userMessage: v.string(),
    agentResponse: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_room", ["roomId", "timestamp"])
    .index("by_event", ["eventId", "timestamp"])
    .index("by_user", ["invokedBy", "timestamp"]),

  /**
   * Agent State - Tracks Durable Object state and invocation metadata
   * Stores checkpoint info for DO recovery
   */
  agentState: defineTable({
    roomId: v.id("rooms"),
    doInstanceId: v.string(), // DO ID from Cloudflare (chat-${roomId})
    lastInvoked: v.number(),
    invocationCount: v.number(),
  })
    .index("by_room", ["roomId"]),
});
