# Delphi Phase 0: Convex Data Layer Implementation
## Foundation for Multi-Agent Event Planning System

**Version:** 1.0
**Phase:** 0 - Data Foundation (Blocking for Phase 2)
**Timeline:** 1-2 days
**Last Updated:** November 14, 2025
**Status:** Ready to Implement

---

## Table of Contents

1. [Phase 0 Overview](#phase-0-overview)
2. [Schema Architecture](#schema-architecture)
3. [Core Tables & Schemas](#core-tables--schemas)
4. [CRUD Operations](#crud-operations)
5. [Queries for AI Agents](#queries-for-ai-agents)
6. [Indexes & Performance](#indexes--performance)
7. [Validation & Business Logic](#validation--business-logic)
8. [Testing Strategy](#testing-strategy)
9. [Migration Plan](#migration-plan)
10. [Phase 0 Success Criteria](#phase-0-success-criteria)

---

## Phase 0 Overview

### Why Phase 0?

**Blocking Issue:** Phase 2's multi-agent system requires complete CRUD operations for tasks, vendors, expenses, and task groups. Without these, agents cannot:
- Create tasks with enriched metadata
- Track expenses and budgets
- Save vendor research results
- Organize tasks into logical groups

### Objectives

1. ✅ **Complete Event Planning Schema** - All tables needed for AI agents
2. ✅ **Full CRUD Operations** - Create, Read, Update, Delete for each entity
3. ✅ **Agent-Optimized Queries** - Fast context assembly for AI
4. ✅ **Performance Indexes** - Sub-50ms queries for hot paths
5. ✅ **Type Safety** - Full TypeScript definitions

### What We're Building

```yaml
Tables to Create/Complete:
  Core Event Management:
    - tasks (with AI enrichment fields)
    - expenses (with categorization & splits)
    - vendors (with matching metadata)
    - taskGroups (for organization)
    - decisions (for poll results)
    - checkpoints (for DO state recovery)

  Extended Event Planning:
    - guests (RSVP, dietary, seating, gifts)
    - paymentSchedules (deposits, payment plans)
    - milestones (strategic checkpoints)
    - timelineEvents (day-of minute-by-minute)
    - announcements (guest communications)
    - inventory (rentals, supplies tracking)

Operations per Table:
  - create: Insert with validation
  - get: Fetch single by ID
  - list: Query with filters
  - update: Patch with optimistic locking
  - delete: Soft delete with cascade
  - search: Full-text or filtered queries

Queries for AI Context:
  - Event summary with all entities
  - Budget breakdown by category
  - Vendor matches by requirements
  - Task dependencies and timeline
```

---

## Schema Architecture

### Entity Relationship Diagram

```
Events (1) ──────┬──────> Rooms (N)
                 │
                 ├──────> Tasks (N)
                 │          └──> TaskGroups (N)
                 │
                 ├──────> Expenses (N)
                 │
                 ├──────> Vendors (N)
                 │
                 ├──────> Decisions (N)
                 │
                 ├──────> Guests (N)
                 │          └──> RSVPs, Dietary, Seating
                 │
                 ├──────> PaymentSchedules (N)
                 │          └──> Links to Expenses
                 │
                 ├──────> Milestones (N)
                 │          └──> Dependencies
                 │
                 ├──────> TimelineEvents (N)
                 │          └──> Day-of schedule
                 │
                 ├──────> Announcements (N)
                 │          └──> Broadcast to Guests
                 │
                 └──────> Inventory (N)
                            └──> Rentals, Purchases

Rooms (1) ────────────> Messages (N)
                           └──> AI Metadata

Messages (1) ──> Threads (N)  [parentMessageId]
```

### Design Principles

1. **Denormalization for Speed** - Store computed values (totals, counts)
2. **Optimistic Updates** - Version fields for conflict resolution
3. **Soft Deletes** - Keep audit trail with `deletedAt` field
4. **AI-Friendly Fields** - Structured metadata for agent context
5. **Real-time Ready** - All mutations trigger Convex subscriptions

---

## Core Tables & Schemas

### 1. Events Table (Enhancement)

**File:** `web/convex/schema.ts`

```typescript
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

  // Dates & Location
  eventDate: v.number(), // timestamp
  createdAt: v.number(),
  updatedAt: v.number(),
  location: v.optional(v.object({
    venue: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
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
  }),

  // Participants
  coordinatorId: v.id("users"),
  guestCount: v.optional(v.number()),

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

  // Soft delete
  deletedAt: v.optional(v.number()),
})
  .index("by_coordinator", ["coordinatorId", "createdAt"])
  .index("by_status", ["status", "eventDate"])
  .index("by_date", ["eventDate"])
```

### 2. Tasks Table (New)

**File:** `web/convex/schema.ts`

```typescript
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
  .index("by_room", ["roomId", "createdAt"])
  .index("by_status", ["eventId", "status", "priority"])
  .index("by_deadline", ["eventId", "deadline"])
  .index("by_assignee", ["assignedTo", "status"])
  .index("by_group", ["groupId", "createdAt"])
```

### 3. Task Groups Table (New)

**File:** `web/convex/schema.ts`

```typescript
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

  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "order"])
  .index("by_room", ["roomId", "order"])
```

### 4. Expenses Table (New)

**File:** `web/convex/schema.ts`

```typescript
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

  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "paidAt"])
  .index("by_room", ["roomId", "paidAt"])
  .index("by_category", ["eventId", "category"])
  .index("by_payer", ["paidBy", "paidAt"])
  .index("by_task", ["taskId"])
```

### 5. Vendors Table (New)

**File:** `web/convex/schema.ts`

```typescript
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

  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "category"])
  .index("by_room", ["roomId", "createdAt"])
  .index("by_category", ["category", "rating"])
  .index("by_status", ["eventId", "status"])
```

### 6. Decisions Table (New)

**File:** `web/convex/schema.ts`

```typescript
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

  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "status"])
  .index("by_room", ["roomId", "createdAt"])
  .index("by_status", ["status", "createdAt"])
```

### 7. Checkpoints Table (New - for DO Recovery)

**File:** `web/convex/schema.ts`

```typescript
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
  .index("by_do", ["doInstanceId", "checkpointId"])
```

### 8. Guests Table (New - Guest Management) ⭐⭐⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "lastName"])
  .index("by_rsvp", ["eventId", "rsvpStatus"])
  .index("by_table", ["eventId", "tableNumber"])
  .index("by_type", ["eventId", "guestType"])
```

### 9. Payment Schedules Table (New - Payment Planning) ⭐⭐⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "dueDate"])
  .index("by_vendor", ["vendorId", "dueDate"])
  .index("by_status", ["eventId", "status"])
  .index("by_due_date", ["eventId", "dueDate"])
```

### 10. Milestones Table (New - Strategic Planning) ⭐⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "targetDate"])
  .index("by_status", ["eventId", "status", "criticality"])
  .index("by_criticality", ["eventId", "criticality"])
```

### 11. Timeline Events Table (New - Day-of Coordination) ⭐⭐⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "startTime"])
  .index("by_status", ["eventId", "status"])
  .index("by_order", ["eventId", "order"])
```

### 12. Announcements Table (New - Guest Communications) ⭐⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "createdAt"])
  .index("by_status", ["eventId", "status"])
  .index("by_type", ["eventId", "type"])
```

### 13. Inventory Table (New - Rentals & Supplies) ⭐

**File:** `web/convex/schema.ts`

```typescript
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
  deletedAt: v.optional(v.number()),
})
  .index("by_event", ["eventId", "category"])
  .index("by_status", ["eventId", "status"])
  .index("by_return_date", ["eventId", "rentalDetails.returnDate"])
```

---

## CRUD Operations

### Template Structure for Each Table

For each table, we need:
1. **create** - Insert with validation
2. **get** - Fetch single by ID
3. **list** - Query with filters
4. **update** - Patch with version check
5. **delete** - Soft delete

### 1. Tasks CRUD

**File:** `web/convex/tasks.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// CREATE
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    roomId: v.id("rooms"),
    groupId: v.optional(v.id("taskGroups")),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
    category: v.string(),
    priority: v.optional(v.string()),
    deadline: v.optional(v.number()),
    estimatedCost: v.optional(v.object({
      min: v.number(),
      max: v.number(),
      currency: v.string(),
      confidence: v.number(),
    })),
    aiMetadata: v.optional(v.any()),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Insert task
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      status: "todo",
      priority: args.priority || "medium",
      createdAt: now,
      updatedAt: now,
    } as any);

    // Update group task count if applicable
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (group) {
        await ctx.db.patch(args.groupId, {
          taskCount: group.taskCount + 1,
          updatedAt: now,
        });
      }
    }

    return taskId;
  },
});

// GET
export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const tasks = await query.collect();

    // Enrich with assignee info
    return await Promise.all(
      tasks.map(async (task) => ({
        ...task,
        assignee: task.assignedTo ? await ctx.db.get(task.assignedTo) : null,
        creator: await ctx.db.get(task.createdBy),
      }))
    );
  },
});

// LIST BY ROOM
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(args.limit || 50);

    return tasks;
  },
});

// UPDATE
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    deadline: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args;

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    // Handle status change to completed
    if (updates.status === "completed" && task.status !== "completed") {
      updates.completedAt = Date.now();

      // Update group completed count
      if (task.groupId) {
        const group = await ctx.db.get(task.groupId);
        if (group) {
          await ctx.db.patch(task.groupId, {
            completedCount: group.completedCount + 1,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(taskId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return taskId;
  },
});

// DELETE (soft delete)
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update group task count
    if (task.groupId) {
      const group = await ctx.db.get(task.groupId);
      if (group) {
        await ctx.db.patch(task.groupId, {
          taskCount: Math.max(0, group.taskCount - 1),
          updatedAt: Date.now(),
        });
      }
    }

    return args.taskId;
  },
});

// SEARCH by text
export const search = query({
  args: {
    eventId: v.id("events"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const searchLower = args.searchTerm.toLowerCase();

    return allTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
    );
  },
});
```

### 2. Expenses CRUD

**File:** `web/convex/expenses.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    description: v.string(),
    amount: v.number(),
    currency: v.string(),
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    taskId: v.optional(v.id("tasks")),
    vendorId: v.optional(v.id("vendors")),
    category: v.string(),
    paidBy: v.id("users"),
    paidAt: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    split: v.optional(v.any()),
    aiMetadata: v.optional(v.any()),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const expenseId = await ctx.db.insert("expenses", {
      ...args,
      paidAt: args.paidAt || now,
      createdBy: args.paidBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Update event budget spent
    const event = await ctx.db.get(args.eventId);
    if (event) {
      const newSpent = event.budget.spent + args.amount;
      await ctx.db.patch(args.eventId, {
        budget: {
          ...event.budget,
          spent: newSpent,
          remaining: event.budget.total - newSpent,
        },
        updatedAt: now,
      });
    }

    return expenseId;
  },
});

// GET
export const get = query({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.expenseId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("expenses")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const expenses = await query.collect();

    // Enrich with payer info
    return await Promise.all(
      expenses.map(async (expense) => ({
        ...expense,
        payer: await ctx.db.get(expense.paidBy),
      }))
    );
  },
});

// GET BUDGET SUMMARY
export const getBudgetSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const byCategory = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = {
          total: 0,
          count: 0,
          expenses: [],
        };
      }
      acc[expense.category].total += expense.amount;
      acc[expense.category].count += 1;
      acc[expense.category].expenses.push(expense);
      return acc;
    }, {} as Record<string, any>);

    const event = await ctx.db.get(args.eventId);

    return {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory,
      budget: event?.budget,
    };
  },
});

// UPDATE
export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.string()),
    split: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { expenseId, ...updates } = args;

    const expense = await ctx.db.get(expenseId);
    if (!expense) throw new Error("Expense not found");

    // If amount changed, update event budget
    if (updates.amount !== undefined && updates.amount !== expense.amount) {
      const event = await ctx.db.get(expense.eventId);
      if (event) {
        const diff = updates.amount - expense.amount;
        const newSpent = event.budget.spent + diff;
        await ctx.db.patch(expense.eventId, {
          budget: {
            ...event.budget,
            spent: newSpent,
            remaining: event.budget.total - newSpent,
          },
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(expenseId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return expenseId;
  },
});

// DELETE
export const deleteExpense = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new Error("Expense not found");

    // Update event budget
    const event = await ctx.db.get(expense.eventId);
    if (event) {
      const newSpent = event.budget.spent - expense.amount;
      await ctx.db.patch(expense.eventId, {
        budget: {
          ...event.budget,
          spent: newSpent,
          remaining: event.budget.total - newSpent,
        },
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.expenseId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.expenseId;
  },
});
```

### 3. Vendors CRUD

**File:** `web/convex/vendors.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    pricing: v.optional(v.any()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    reviewSource: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    roomId: v.optional(v.id("rooms")),
    status: v.optional(v.string()),
    aiMetadata: v.optional(v.any()),
    addedBy: v.id("users"),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const vendorId = await ctx.db.insert("vendors", {
      ...args,
      status: args.status || "researching",
      createdAt: now,
      updatedAt: now,
    } as any);

    return vendorId;
  },
});

// GET
export const get = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.collect();
  },
});

// LIST BY ROOM
export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// SEARCH by category
export const searchByCategory = query({
  args: {
    category: v.string(),
    minRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("vendors")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const vendors = await query.collect();

    if (args.minRating) {
      return vendors.filter((v) => (v.rating || 0) >= args.minRating!);
    }

    return vendors;
  },
});

// UPDATE
export const update = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    pricing: v.optional(v.any()),
    contractUrl: v.optional(v.string()),
    contractSignedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { vendorId, ...updates } = args;

    await ctx.db.patch(vendorId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return vendorId;
  },
});

// DELETE
export const deleteVendor = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.vendorId;
  },
});
```

### 4. Task Groups CRUD

**File:** `web/convex/taskGroups.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    roomId: v.optional(v.id("rooms")),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get current max order
    const groups = await ctx.db
      .query("taskGroups")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const maxOrder = Math.max(...groups.map((g) => g.order), -1);

    const groupId = await ctx.db.insert("taskGroups", {
      ...args,
      order: maxOrder + 1,
      taskCount: 0,
      completedCount: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    return groupId;
  },
});

// GET
export const get = query({
  args: { groupId: v.id("taskGroups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.groupId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskGroups")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("asc") // By order field
      .collect();
  },
});

// UPDATE
export const update = mutation({
  args: {
    groupId: v.id("taskGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { groupId, ...updates } = args;

    await ctx.db.patch(groupId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return groupId;
  },
});

// DELETE
export const deleteGroup = mutation({
  args: { groupId: v.id("taskGroups") },
  handler: async (ctx, args) => {
    // Move tasks out of group
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        groupId: undefined,
        updatedAt: Date.now(),
      });
    }

    // Soft delete group
    await ctx.db.patch(args.groupId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.groupId;
  },
});
```

### 5. Guests CRUD

**File:** `web/convex/guests.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    eventId: v.id("events"),
    invitedBy: v.id("users"),
    guestType: v.string(),
    rsvpStatus: v.optional(v.string()),
    plusOneAllowed: v.boolean(),
    dietaryRestrictions: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const guestId = await ctx.db.insert("guests", {
      ...args,
      rsvpStatus: args.rsvpStatus || "pending",
      createdAt: now,
      updatedAt: now,
    } as any);

    // Update event guest count
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        guestCount: (event.guestCount || 0) + 1,
        updatedAt: now,
      });
    }

    return guestId;
  },
});

// GET
export const get = query({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.guestId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    rsvpStatus: v.optional(v.string()),
    guestType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.rsvpStatus) {
      query = query.filter((q) => q.eq(q.field("rsvpStatus"), args.rsvpStatus));
    }

    if (args.guestType) {
      query = query.filter((q) => q.eq(q.field("guestType"), args.guestType));
    }

    return await query.collect();
  },
});

// GET RSVP SUMMARY
export const getRsvpSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      total: guests.length,
      attending: guests.filter((g) => g.rsvpStatus === "attending").length,
      declined: guests.filter((g) => g.rsvpStatus === "declined").length,
      pending: guests.filter((g) => g.rsvpStatus === "pending").length,
      maybe: guests.filter((g) => g.rsvpStatus === "maybe").length,
      dietaryRestrictions: guests
        .flatMap((g) => g.dietaryRestrictions || [])
        .reduce((acc, r) => {
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
    };
  },
});

// UPDATE
export const update = mutation({
  args: {
    guestId: v.id("guests"),
    rsvpStatus: v.optional(v.string()),
    rsvpDate: v.optional(v.number()),
    tableNumber: v.optional(v.number()),
    seatNumber: v.optional(v.number()),
    plusOneName: v.optional(v.string()),
    thankYouSent: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { guestId, ...updates } = args;

    await ctx.db.patch(guestId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return guestId;
  },
});

// DELETE
export const deleteGuest = mutation({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new Error("Guest not found");

    await ctx.db.patch(args.guestId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update event guest count
    const event = await ctx.db.get(guest.eventId);
    if (event && event.guestCount) {
      await ctx.db.patch(guest.eventId, {
        guestCount: Math.max(0, event.guestCount - 1),
        updatedAt: Date.now(),
      });
    }

    return args.guestId;
  },
});
```

### 6. Payment Schedules CRUD

**File:** `web/convex/paymentSchedules.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    description: v.string(),
    amount: v.number(),
    currency: v.string(),
    dueDate: v.number(),
    createdBy: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine status based on due date
    const daysUntilDue = (args.dueDate - now) / (1000 * 60 * 60 * 24);
    let status: string;
    if (daysUntilDue < 0) {
      status = "overdue";
    } else if (daysUntilDue <= 7) {
      status = "due_soon";
    } else {
      status = "upcoming";
    }

    const scheduleId = await ctx.db.insert("paymentSchedules", {
      ...args,
      status,
      createdAt: now,
      updatedAt: now,
    } as any);

    return scheduleId;
  },
});

// GET
export const get = query({
  args: { scheduleId: v.id("paymentSchedules") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scheduleId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("paymentSchedules")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const schedules = await query.collect();

    // Enrich with vendor info
    return await Promise.all(
      schedules.map(async (schedule) => ({
        ...schedule,
        vendor: schedule.vendorId ? await ctx.db.get(schedule.vendorId) : null,
      }))
    );
  },
});

// GET UPCOMING PAYMENTS
export const getUpcoming = query({
  args: {
    eventId: v.id("events"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const daysAhead = args.daysAhead || 30;
    const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

    const schedules = await ctx.db
      .query("paymentSchedules")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.neq(q.field("status"), "paid"),
          q.lte(q.field("dueDate"), futureDate)
        )
      )
      .collect();

    return schedules.sort((a, b) => a.dueDate - b.dueDate);
  },
});

// MARK AS PAID
export const markPaid = mutation({
  args: {
    scheduleId: v.id("paymentSchedules"),
    expenseId: v.optional(v.id("expenses")),
    paidDate: v.optional(v.number()),
    confirmationNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scheduleId, ...updates } = args;

    await ctx.db.patch(scheduleId, {
      ...updates,
      paidDate: updates.paidDate || Date.now(),
      status: "paid",
      updatedAt: Date.now(),
    } as any);

    return scheduleId;
  },
});

// UPDATE
export const update = mutation({
  args: {
    scheduleId: v.id("paymentSchedules"),
    amount: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scheduleId, ...updates } = args;

    await ctx.db.patch(scheduleId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return scheduleId;
  },
});

// DELETE
export const deleteSchedule = mutation({
  args: { scheduleId: v.id("paymentSchedules") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scheduleId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.scheduleId;
  },
});
```

### 7. Milestones CRUD

**File:** `web/convex/milestones.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    category: v.string(),
    targetDate: v.number(),
    criticality: v.string(),
    createdBy: v.id("users"),
    completionCriteria: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const milestoneId = await ctx.db.insert("milestones", {
      ...args,
      status: "not_started",
      createdAt: now,
      updatedAt: now,
    } as any);

    return milestoneId;
  },
});

// GET
export const get = query({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.milestoneId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
    criticality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("milestones")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.criticality) {
      query = query.filter((q) => q.eq(q.field("criticality"), args.criticality));
    }

    return await query.collect();
  },
});

// GET CRITICAL PATH
export const getCriticalPath = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_criticality", (q) =>
        q.eq("eventId", args.eventId).eq("criticality", "critical")
      )
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();

    return milestones.sort((a, b) => a.targetDate - b.targetDate);
  },
});

// UPDATE
export const update = mutation({
  args: {
    milestoneId: v.id("milestones"),
    status: v.optional(v.string()),
    completedDate: v.optional(v.number()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { milestoneId, ...updates } = args;

    const milestone = await ctx.db.get(milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    // Auto-set completed date if marking complete
    if (updates.status === "completed" && !updates.completedDate) {
      updates.completedDate = Date.now();
    }

    await ctx.db.patch(milestoneId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return milestoneId;
  },
});

// DELETE
export const deleteMilestone = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.milestoneId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.milestoneId;
  },
});
```

### 8. Timeline Events CRUD

**File:** `web/convex/timelineEvents.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    eventId: v.id("events"),
    type: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    location: v.optional(v.string()),
    responsiblePerson: v.optional(v.id("users")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get current max order
    const events = await ctx.db
      .query("timelineEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const maxOrder = Math.max(...events.map((e) => e.order), -1);

    const timelineId = await ctx.db.insert("timelineEvents", {
      ...args,
      order: maxOrder + 1,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    } as any);

    return timelineId;
  },
});

// GET
export const get = query({
  args: { timelineId: v.id("timelineEvents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.timelineId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("timelineEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.collect();
  },
});

// GET DAY-OF SCHEDULE
export const getDayOfSchedule = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("timelineEvents")
      .withIndex("by_order", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return events.sort((a, b) => a.order - b.order);
  },
});

// UPDATE STATUS
export const updateStatus = mutation({
  args: {
    timelineId: v.id("timelineEvents"),
    status: v.string(),
    actualStartTime: v.optional(v.number()),
    actualEndTime: v.optional(v.number()),
    liveUpdate: v.optional(v.object({
      update: v.string(),
      updatedBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => {
    const { timelineId, liveUpdate, ...updates } = args;

    const event = await ctx.db.get(timelineId);
    if (!event) throw new Error("Timeline event not found");

    const newUpdates = liveUpdate
      ? [
          ...(event.liveUpdates || []),
          { ...liveUpdate, timestamp: Date.now() },
        ]
      : event.liveUpdates;

    await ctx.db.patch(timelineId, {
      ...updates,
      liveUpdates: newUpdates,
      updatedAt: Date.now(),
    } as any);

    return timelineId;
  },
});

// UPDATE
export const update = mutation({
  args: {
    timelineId: v.id("timelineEvents"),
    name: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    order: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { timelineId, ...updates } = args;

    await ctx.db.patch(timelineId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return timelineId;
  },
});

// DELETE
export const deleteTimelineEvent = mutation({
  args: { timelineId: v.id("timelineEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.timelineId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.timelineId;
  },
});
```

### 9. Announcements CRUD

**File:** `web/convex/announcements.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    eventId: v.id("events"),
    type: v.string(),
    deliveryMethod: v.array(v.string()),
    sendToAll: v.boolean(),
    sendToRsvpStatus: v.optional(v.array(v.string())),
    customRecipients: v.optional(v.array(v.id("guests"))),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const announcementId = await ctx.db.insert("announcements", {
      ...args,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    } as any);

    return announcementId;
  },
});

// GET
export const get = query({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.announcementId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("announcements")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    return await query.collect();
  },
});

// SCHEDULE SEND
export const schedule = mutation({
  args: {
    announcementId: v.id("announcements"),
    scheduledSendTime: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.announcementId, {
      scheduledSendTime: args.scheduledSendTime,
      status: "scheduled",
      updatedAt: Date.now(),
    });

    return args.announcementId;
  },
});

// MARK AS SENT
export const markSent = mutation({
  args: {
    announcementId: v.id("announcements"),
    deliveryStats: v.object({
      totalSent: v.number(),
      delivered: v.number(),
      opened: v.number(),
      clicked: v.number(),
      bounced: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { announcementId, deliveryStats } = args;

    await ctx.db.patch(announcementId, {
      sentAt: Date.now(),
      status: "sent",
      deliveryStats,
      updatedAt: Date.now(),
    });

    return announcementId;
  },
});

// UPDATE
export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    deliveryMethod: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { announcementId, ...updates } = args;

    await ctx.db.patch(announcementId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return announcementId;
  },
});

// DELETE
export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.announcementId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.announcementId;
  },
});
```

### 10. Inventory CRUD

**File:** `web/convex/inventory.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    quantity: v.number(),
    unit: v.string(),
    acquisitionType: v.string(),
    costPerUnit: v.number(),
    totalCost: v.number(),
    createdBy: v.id("users"),
    rentalDetails: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const inventoryId = await ctx.db.insert("inventory", {
      ...args,
      status: "ordered",
      createdAt: now,
      updatedAt: now,
    } as any);

    return inventoryId;
  },
});

// GET
export const get = query({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.inventoryId);
  },
});

// LIST BY EVENT
export const listByEvent = query({
  args: {
    eventId: v.id("events"),
    category: v.optional(v.string()),
    acquisitionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("inventory")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    if (args.acquisitionType) {
      query = query.filter((q) => q.eq(q.field("acquisitionType"), args.acquisitionType));
    }

    return await query.collect();
  },
});

// GET RENTALS DUE FOR RETURN
export const getRentalsDueForReturn = query({
  args: {
    eventId: v.id("events"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const daysAhead = args.daysAhead || 7;
    const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

    const allInventory = await ctx.db
      .query("inventory")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("acquisitionType"), "rented"),
          q.neq(q.field("status"), "returned")
        )
      )
      .collect();

    // Filter by return date (needs runtime filtering as rentalDetails is optional)
    return allInventory.filter(
      (item) =>
        item.rentalDetails &&
        item.rentalDetails.returnDate <= futureDate
    );
  },
});

// UPDATE STATUS
export const updateStatus = mutation({
  args: {
    inventoryId: v.id("inventory"),
    status: v.string(),
    conditionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { inventoryId, ...updates } = args;

    await ctx.db.patch(inventoryId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return inventoryId;
  },
});

// UPDATE
export const update = mutation({
  args: {
    inventoryId: v.id("inventory"),
    quantity: v.optional(v.number()),
    status: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { inventoryId, ...updates } = args;

    await ctx.db.patch(inventoryId, {
      ...updates,
      updatedAt: Date.now(),
    } as any);

    return inventoryId;
  },
});

// DELETE
export const deleteInventoryItem = mutation({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inventoryId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.inventoryId;
  },
});
```

---

## Queries for AI Agents

### Agent Context Assembly Queries

**File:** `web/convex/agentContext.ts`

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get complete event context for AI agents
 * Returns everything an agent needs to make informed decisions
 */
export const getEventContext = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Get all core entities
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get extended entities
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const paymentSchedules = await ctx.db
      .query("paymentSchedules")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Calculate stats
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter(
        (t) => t.deadline && t.deadline < Date.now() && t.status !== "completed"
      ).length,
      byCategory: tasks.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const budgetStats = {
      total: event.budget.total,
      spent: expenses.reduce((sum, e) => sum + e.amount, 0),
      remaining: event.budget.total - expenses.reduce((sum, e) => sum + e.amount, 0),
      scheduled: paymentSchedules
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + p.amount, 0),
      byCategory: expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>),
    };

    const vendorStats = {
      total: vendors.length,
      contracted: vendors.filter((v) => v.status === "contracted").length,
      byCategory: vendors.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const guestStats = {
      total: guests.length,
      attending: guests.filter((g) => g.rsvpStatus === "attending").length,
      pending: guests.filter((g) => g.rsvpStatus === "pending").length,
      declined: guests.filter((g) => g.rsvpStatus === "declined").length,
    };

    const milestoneStats = {
      total: milestones.length,
      completed: milestones.filter((m) => m.status === "completed").length,
      critical: milestones.filter(
        (m) => m.criticality === "critical" && m.status !== "completed"
      ).length,
      atRisk: milestones.filter((m) => m.status === "at_risk").length,
    };

    return {
      event,
      tasks: tasks.slice(0, 20),
      expenses: expenses.slice(0, 20),
      vendors: vendors.slice(0, 20),
      guests: guests.slice(0, 50), // More guests for context
      upcomingPayments: paymentSchedules
        .filter((p) => p.status !== "paid")
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 10),
      criticalMilestones: milestones
        .filter((m) => m.criticality === "critical" && m.status !== "completed")
        .sort((a, b) => a.targetDate - b.targetDate),
      stats: {
        tasks: taskStats,
        budget: budgetStats,
        vendors: vendorStats,
        guests: guestStats,
        milestones: milestoneStats,
      },
      daysUntilEvent: Math.ceil((event.eventDate - Date.now()) / (1000 * 60 * 60 * 24)),
    };
  },
});

/**
 * Get room-specific context (last N messages + room data)
 */
export const getRoomContext = query({
  args: {
    roomId: v.id("rooms"),
    messageLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    // Get recent messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(args.messageLimit || 10);

    // Enrich with authors
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => ({
        ...msg,
        author:
          msg.authorId === "agent"
            ? { _id: "agent", name: "Delphi" }
            : await ctx.db.get(msg.authorId as any),
      }))
    );

    return {
      room,
      messages: enrichedMessages.reverse(), // Chronological order
    };
  },
});

/**
 * Get task dependencies and blocking analysis
 */
export const getTaskDependencies = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    const dependencies = task.dependsOn
      ? await Promise.all(task.dependsOn.map((id) => ctx.db.get(id)))
      : [];

    const blockers = task.blockedBy
      ? await Promise.all(task.blockedBy.map((id) => ctx.db.get(id)))
      : [];

    // Find tasks that depend on this one
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", task.eventId))
      .collect();

    const dependents = allTasks.filter(
      (t) => t.dependsOn && t.dependsOn.includes(args.taskId)
    );

    return {
      task,
      dependencies: dependencies.filter(Boolean),
      blockers: blockers.filter(Boolean),
      dependents,
      canStart: blockers.every((b) => b?.status === "completed"),
    };
  },
});
```

---

## Indexes & Performance

### Critical Indexes Summary

```typescript
// Already defined in schemas above, but highlighting critical ones:

// Tasks
.index("by_event", ["eventId", "createdAt"]) // List all tasks for event
.index("by_status", ["eventId", "status", "priority"]) // Filter by status
.index("by_deadline", ["eventId", "deadline"]) // Sort by deadline
.index("by_assignee", ["assignedTo", "status"]) // User's tasks

// Expenses
.index("by_event", ["eventId", "paidAt"]) // List all expenses
.index("by_category", ["eventId", "category"]) // Budget breakdown
.index("by_payer", ["paidBy", "paidAt"]) // Who paid what

// Vendors
.index("by_event", ["eventId", "category"]) // Event vendors
.index("by_category", ["category", "rating"]) // Search vendors
.index("by_status", ["eventId", "status"]) // Filter by status
```

### Performance Targets

- **Hot path queries** (by_event, by_room): < 20ms
- **Filtered queries** (by_status, by_category): < 50ms
- **Full-text search**: < 100ms
- **Context assembly** (getEventContext): < 200ms

---

## Validation & Business Logic

### Validation Rules

**File:** `web/convex/validators.ts`

```typescript
import { v } from "convex/values";

export const taskValidator = {
  title: v.string(), // Required, min 3 chars
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
};

export const expenseValidator = {
  amount: v.number(), // Must be > 0
  currency: v.string(), // ISO 4217 code
  category: v.string(), // Must match task categories
};

export const budgetValidator = {
  total: v.number(), // Must be > 0
  currency: v.string(),
};

// Business logic helpers
export function validateTaskDeadline(deadline: number, eventDate: number): boolean {
  return deadline <= eventDate; // Deadline must be before event
}

export function validateBudgetAllocation(
  allocated: Record<string, number>,
  total: number
): boolean {
  const sum = Object.values(allocated).reduce((a, b) => a + b, 0);
  return sum <= total; // Cannot allocate more than total
}

export function validateExpenseAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount);
}
```

---

## Testing Strategy

### Manual Testing Checklist

**Schema Validation:**
- [ ] Create event with budget
- [ ] Verify all fields populate correctly
- [ ] Check indexes are used (Convex dashboard)

**Task CRUD:**
- [ ] Create task with minimal fields
- [ ] Create task with full AI enrichment
- [ ] Update task status to completed
- [ ] Verify group task count updates
- [ ] Delete task (soft delete)
- [ ] List tasks by event, room, status

**Expense CRUD:**
- [ ] Create expense
- [ ] Verify event budget updates
- [ ] Update expense amount
- [ ] Verify budget recalculates
- [ ] Delete expense
- [ ] Get budget summary

**Vendor CRUD:**
- [ ] Create vendor with AI metadata
- [ ] List vendors by category
- [ ] Search with rating filter
- [ ] Update vendor status
- [ ] Delete vendor

**Agent Context Queries:**
- [ ] Get event context (< 200ms)
- [ ] Get room context with messages
- [ ] Get task dependencies
- [ ] Verify all stats calculate correctly

### Integration Tests

```typescript
// Example test structure (to be run with Convex testing framework)

test("Task creation updates group count", async () => {
  const groupId = await ctx.runMutation(api.taskGroups.create, {
    name: "Venue Tasks",
    eventId,
    createdBy: userId,
  });

  const taskId = await ctx.runMutation(api.tasks.create, {
    title: "Book venue",
    eventId,
    roomId,
    groupId,
    createdBy: userId,
    category: "venue",
  });

  const group = await ctx.runQuery(api.taskGroups.get, { groupId });
  expect(group.taskCount).toBe(1);
});

test("Expense creation updates event budget", async () => {
  const event = await ctx.runQuery(api.events.get, { eventId });
  const initialSpent = event.budget.spent;

  await ctx.runMutation(api.expenses.create, {
    description: "Venue deposit",
    amount: 5000,
    currency: "USD",
    eventId,
    category: "venue",
    paidBy: userId,
  });

  const updated = await ctx.runQuery(api.events.get, { eventId });
  expect(updated.budget.spent).toBe(initialSpent + 5000);
});
```

---

## Migration Plan

### Step 1: Update Schema

```bash
# In web/convex/schema.ts, add all new tables
# Run schema validation
npx convex dev
```

### Step 2: Create CRUD Files

```bash
# Create core event management files
touch web/convex/tasks.ts
touch web/convex/expenses.ts
touch web/convex/vendors.ts
touch web/convex/taskGroups.ts
touch web/convex/decisions.ts
touch web/convex/checkpoints.ts

# Create extended event planning files
touch web/convex/guests.ts
touch web/convex/paymentSchedules.ts
touch web/convex/milestones.ts
touch web/convex/timelineEvents.ts
touch web/convex/announcements.ts
touch web/convex/inventory.ts

# Create utility files
touch web/convex/agentContext.ts
touch web/convex/validators.ts
```

### Step 3: Implement Incrementally

**Day 1: Core Tables**
1. **Morning**: Schema (all 13 tables) + Tasks CRUD
2. **Afternoon**: Expenses + Task Groups + Vendors CRUD

**Day 2: Extended Tables**
3. **Morning**: Guests + Payment Schedules CRUD
4. **Afternoon**: Milestones + Timeline Events CRUD

**Day 3: Polish & Testing**
5. **Morning**: Announcements + Inventory CRUD
6. **Afternoon**: Enhanced agent context queries + Full testing

### Step 4: Seed Test Data

```typescript
// web/convex/seed.ts
export default mutation({
  handler: async (ctx) => {
    // Create test event
    const eventId = await ctx.db.insert("events", {
      name: "Sarah & John's Wedding",
      type: "wedding",
      eventDate: Date.now() + 180 * 24 * 60 * 60 * 1000, // 6 months from now
      budget: {
        total: 40000,
        currency: "USD",
        spent: 0,
        remaining: 40000,
      },
      coordinatorId: "test-user-id",
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test tasks
    await ctx.db.insert("tasks", {
      title: "Book wedding venue",
      eventId,
      roomId: "test-room-id",
      category: "venue",
      priority: "high",
      status: "todo",
      createdBy: "test-user-id",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // More seed data...
  },
});
```

---

## Phase 0 Success Criteria

### Core Functionality ✅
- [ ] All 13 tables defined in schema with proper types
- [ ] All indexes created and verified
- [ ] Full CRUD operations for all entities (tasks, expenses, vendors, task groups, guests, payment schedules, milestones, timeline events, announcements, inventory)
- [ ] Agent context queries return in < 200ms with extended data
- [ ] Budget calculations accurate with expense updates
- [ ] Payment schedule tracking and status updates
- [ ] Guest RSVP management and dietary tracking
- [ ] Milestone dependency tracking
- [ ] Day-of timeline coordination
- [ ] Soft deletes work correctly across all tables

### Code Quality ✅
- [ ] No TypeScript errors
- [ ] All mutations have proper validation
- [ ] Queries use indexes (verify in dashboard)
- [ ] Error handling for not found cases
- [ ] Optimistic locking where needed

### Testing ✅
- [ ] Can create/read/update/delete each entity
- [ ] Budget updates trigger correctly
- [ ] Group counts update with task changes
- [ ] Vendor search works by category and rating
- [ ] Agent context assembles complete picture

### Documentation ✅
- [ ] Schema documented with JSDoc comments
- [ ] CRUD operations have clear function names
- [ ] Validation rules documented
- [ ] Example usage in comments

---

## Next Steps After Phase 0

Once Phase 0 is complete, you can immediately proceed to **Phase 2: Agent Orchestration**:

1. ✅ Tools can call Convex CRUD operations
2. ✅ Agents have context assembly queries ready
3. ✅ Structured data storage for AI responses
4. ✅ Frontend can display enriched entities

**Blocking issues resolved:**
- TaskAgent can create tasks with enrichment ✅
- BudgetAgent can create/query expenses ✅
- VendorAgent can save vendor research ✅
- EventAgent can get full event context ✅

---

## Files Created/Modified Summary

### New Files (19 total)

**Core Event Management:**
```
web/convex/
├── tasks.ts (create, get, list, update, delete, search)
├── expenses.ts (create, get, list, update, delete, getBudgetSummary)
├── vendors.ts (create, get, list, update, delete, searchByCategory)
├── taskGroups.ts (create, get, list, update, delete)
├── decisions.ts (create, get, list, update, close)
├── checkpoints.ts (create, get, latest)
```

**Extended Event Planning:**
```
├── guests.ts (create, get, list, update, delete, getRsvpSummary)
├── paymentSchedules.ts (create, get, list, update, delete, markPaid, getUpcoming)
├── milestones.ts (create, get, list, update, delete, getCriticalPath)
├── timelineEvents.ts (create, get, list, update, delete, getDayOfSchedule, updateStatus)
├── announcements.ts (create, get, list, update, delete, schedule, markSent)
└── inventory.ts (create, get, list, update, delete, getRentalsDueForReturn, updateStatus)
```

**Utilities:**
```
├── agentContext.ts (getEventContext [enhanced], getRoomContext, getTaskDependencies)
└── validators.ts (validation rules)
```

### Modified Files
```
web/convex/schema.ts - Add 13 tables with 45+ indexes
```

---

**Document Version:** 2.0 - Extended Event Planning Suite
**Last Updated:** November 14, 2025
**Status:** Ready to Implement
**Estimated Time:** 2-3 days (13 tables, 19 files)
**Blocking For:** Phase 2 Multi-Agent System

---

## Summary of Additions

### Version 2.0 Enhancements:
Added **6 critical event planning tables** that transform Delphi from a task manager into a complete event planning platform:

1. **Guests** (⭐⭐⭐) - RSVP tracking, dietary needs, seating charts, thank you notes
2. **Payment Schedules** (⭐⭐⭐) - Deposit tracking, payment plans, reminders
3. **Milestones** (⭐⭐) - Strategic checkpoints, critical path analysis
4. **Timeline Events** (⭐⭐⭐) - Day-of minute-by-minute coordination
5. **Announcements** (⭐⭐) - Guest communication, save-the-dates, updates
6. **Inventory** (⭐) - Rentals tracking, returns, supplies management

**Impact:** These additions enable AI agents to handle complete event planning workflows, from guest management to day-of execution.

**Let's build the complete foundation! 🏗️**
