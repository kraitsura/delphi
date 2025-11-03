# Event Planning Platform: Database Schema Reference

**Version:** 1.0  
**Date:** October 30, 2025  
**Database:** Convex (serverless, real-time)  
**Purpose:** Complete schema for AI-powered event planning system

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Schema Patterns](#schema-patterns)
3. [Core Tables](#core-tables)
4. [Relationship Map](#relationship-map)
5. [Indexes](#indexes)
6. [Enums & Constants](#enums--constants)

---

## Architecture Overview

### Design Principles

- **Real-Time First**: Convex subscriptions for live collaboration
- **Type-Safe**: Full TypeScript with generated types
- **Soft Deletes**: Preserve history with `isDeleted` flag
- **Audit Trail**: Track all changes with timestamps and user references
- **Multi-Tenant**: Organization-scoped access control
- **AI-Friendly**: Structured data optimized for AI agent context assembly

### Key Features

- **Chat-First Interface**: Messages drive task/expense/poll creation
- **AI Agent Integration**: Structured metadata for agent context
- **Flexible Permissions**: Role-based access (coordinator, collaborator, guest, vendor)
- **Financial Precision**: All amounts stored in cents
- **Progressive Disclosure**: Start simple, add complexity as needed

---

## Schema Patterns

### 1. Audit Pattern

All core tables include:

```typescript
{
  isDeleted: boolean           // Soft delete flag
  createdAt: number           // Unix timestamp (ms)
  updatedAt: number           // Unix timestamp (ms)
  createdBy: Id<"users">      // Creator reference
  updatedBy: Id<"users">      // Last modifier reference
}
```

### 2. Organization Scoping Pattern

Multi-tenant isolation:

```typescript
{
  organizationId: Id<"organizations">  // Organization reference
}
```

### 3. Financial Pattern

All monetary values in cents:

```typescript
{
  amount: number              // In cents (e.g., 125050 = $1,250.50)
  currency: string            // "USD", "EUR", etc. (default: "USD")
}
```

### 4. AI Context Pattern

Track AI-generated content:

```typescript
{
  aiGenerated: boolean        // Created/enriched by AI
  aiAgentType?: string        // Which agent (taskEnricher, budgetAnalyst, etc.)
  aiConfidence?: number       // Confidence score (0-1)
  aiMetadata?: object         // Agent-specific metadata
}
```

### 5. Timeline Pattern

Event phase tracking:

```typescript
{
  phase: "planning" | "execution" | "post_event"
  phaseProgress: number       // 0-100
  milestones: [{
    id: string
    name: string
    targetDate: number
    actualDate?: number
    status: "upcoming" | "completed" | "at_risk"
  }]
}
```

### 6. Authentication Pattern

Modern, provider-agnostic authentication system:

**Multi-Provider Support:**
```typescript
// Users can authenticate via multiple methods
user: {
  _id: Id<"users">
  email: string
  // ...profile
}

authProviders: [
  {
    userId: user._id
    provider: "email"        // Password-based
    providerData: { passwordHash, ... }
  },
  {
    userId: user._id
    provider: "google"       // OAuth
    providerId: "google-sub-123"
    providerData: { accessToken, refreshToken, ... }
  }
]
```

**Session Management:**
```typescript
// Active sessions with device tracking
authSession: {
  userId: Id<"users">
  sessionToken: string       // Hashed token
  device: { type, os, browser, ... }
  location: { ip, city, country, ... }
  expiresAt: number
  status: "active" | "expired" | "revoked"
}
```

**Verification Flow:**
```typescript
// Email verification, password reset, magic links
authVerificationToken: {
  email: string
  token: string              // Hashed token
  tokenType: "email_verification" | "password_reset" | "magic_link"
  expiresAt: number
  status: "pending" | "used" | "expired"
}
```

**Security Audit:**
```typescript
// Complete audit trail for security events
authAuditLog: {
  userId?: Id<"users">
  eventType: "login_success" | "login_failure" | "password_change" | ...
  ip: string                 // Hashed
  riskScore: number          // 0-100
  riskFactors: ["new_device", "unusual_location"]
}
```

---

## Core Tables

### Table Overview (22 Total)

**Organization & Access (3 tables):**
1. **organizations** - Multi-tenant isolation
2. **users** - User accounts and profiles
3. **organizationMemberships** - Access control with roles

**Authentication & Security (4 tables):**
4. **authProviders** - Multiple auth methods (OAuth, email, magic links)
5. **authSessions** - Active sessions with device tracking
6. **authVerificationTokens** - Email verification, password reset tokens
7. **authAuditLog** - Security event audit trail

**Event Planning Core (5 tables):**
8. **events** - Main event being planned
9. **eventParticipants** - Role-based collaborators
10. **tasks** - AI-enriched work items with dependencies
11. **taskGroups** - Collections with auto-progress
12. **vendors** - Service providers with booking pipeline

**Financial Management (1 table):**
13. **expenses** - Financial tracking with smart splits

**Collaboration (4 tables):**
14. **polls** - Group decision-making with voting
15. **decisions** - Recorded choices with impact tracking
16. **chats** - Sub-group conversations
17. **messages** - Chat messages that trigger AI agents

**Calendar & Guests (2 tables):**
18. **calendarEvents** - Meetings, deadlines, vendor calls
19. **guestList** - RSVPs, meal preferences, seating

**Documents & AI (3 tables):**
20. **files** - Documents, receipts, contracts
21. **aiAgentCalls** - AI usage tracking & performance
22. **costLearnings** - ML training data for predictions

---

### 1. organizations

**Purpose:** Multi-tenant organization management

```typescript
{
  _id: Id<"organizations">
  _creationTime: number
  
  // Core fields
  name: string                      // Organization name
  slug: string                      // URL-friendly identifier
  
  // Subscription
  plan: "free" | "pro" | "enterprise"
  subscriptionStatus: "active" | "trial" | "cancelled"
  trialEndsAt?: number
  
  // Settings
  settings: {
    defaultCurrency: string         // "USD"
    timezone: string                // "America/New_York"
    dateFormat: string              // "MM/DD/YYYY"
    allowGuestAccess: boolean
  }
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_slug` - Unique organization identifier

---

### 2. users

**Purpose:** User accounts and profiles (auth provider agnostic)

```typescript
{
  _id: Id<"users">
  _creationTime: number
  
  // Core Identity
  email: string                     // Primary email (verified)
  emailVerified: boolean
  emailVerifiedAt?: number
  
  // Secondary Emails
  secondaryEmails: Array<{
    email: string
    verified: boolean
    verifiedAt?: number
    isPrimary: boolean
  }>
  
  // Profile
  firstName?: string
  lastName?: string
  displayName?: string              // Preferred display name
  phone?: string
  phoneVerified: boolean
  
  // Avatar
  avatarUrl?: string
  avatarStorageId?: Id<"_storage">
  
  // Preferences
  timezone: string                  // User's timezone (default: "America/New_York")
  locale: string                    // "en-US", "es-ES", etc.
  dateFormat: string                // "MM/DD/YYYY", "DD/MM/YYYY"
  timeFormat: "12h" | "24h"
  
  // Notifications
  notificationPreferences: {
    email: {
      enabled: boolean
      taskAssignments: boolean
      expenseUpdates: boolean
      pollCreated: boolean
      deadlineReminders: boolean
      dailyDigest: boolean
      weeklyDigest: boolean
    }
    push: {
      enabled: boolean
      taskAssignments: boolean
      mentions: boolean
      deadlineReminders: boolean
    }
    inApp: {
      enabled: boolean
      sound: boolean
      desktop: boolean
    }
  }
  
  // Security
  twoFactorEnabled: boolean
  twoFactorMethod?: "totp" | "sms" | "email"
  backupCodes?: string[]            // Encrypted backup codes
  
  // Sessions (tracked separately in authSessions table)
  lastLoginAt?: number
  lastActiveAt?: number
  loginCount: number
  
  // Account Status
  status: "active" | "suspended" | "deactivated" | "pending_verification"
  suspendedAt?: number
  suspendedReason?: string
  suspendedBy?: Id<"users">
  
  // Metadata
  metadata: {
    source?: string                 // "signup", "invite", "oauth"
    referredBy?: Id<"users">
    onboardingCompleted: boolean
    onboardingStep?: number
    termsAcceptedAt?: number
    privacyAcceptedAt?: number
  }
  
  // Soft Delete
  isDeleted: boolean
  deletedAt?: number
  
  // Audit
  createdAt: number
  updatedAt: number
  updatedBy?: Id<"users">
}
```

**Indexes:**
- `by_email` - Primary lookup (unique)
- `by_status` - Active users
- `by_phone` - Phone lookup
- `by_last_active` - Activity tracking

---

### 2a. authProviders

**Purpose:** Multiple authentication methods per user (OAuth, email/password, magic links)

```typescript
{
  _id: Id<"authProviders">
  _creationTime: number
  
  // Relationships
  userId: Id<"users">
  
  // Provider Info
  provider: "email" | "google" | "github" | "microsoft" | "apple" | "magic_link"
  providerId: string                // Provider's user ID (e.g., Google sub)
  
  // Provider-Specific Data
  providerData: {
    // Email/Password
    passwordHash?: string           // Hashed password (if email provider)
    passwordSalt?: string
    passwordLastChanged?: number
    
    // OAuth
    accessToken?: string            // Encrypted
    refreshToken?: string           // Encrypted
    tokenExpiry?: number
    scope?: string[]
    
    // Provider profile
    providerEmail?: string
    providerName?: string
    providerAvatar?: string
    
    // Magic Link
    magicLinkToken?: string         // If using magic links
    magicLinkExpiry?: number
  }
  
  // Status
  isPrimary: boolean                // Primary login method
  isVerified: boolean
  verifiedAt?: number
  
  // Usage
  lastUsedAt?: number
  usageCount: number
  
  // Security
  isLocked: boolean
  lockedAt?: number
  lockedReason?: string
  failedAttempts: number
  lastFailedAttempt?: number
  
  // Audit
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}
```

**Indexes:**
- `by_user` - User's auth providers
- `by_provider_id` - OAuth provider lookup
- `by_user_provider` - Unique user+provider combination

---

### 2b. authSessions

**Purpose:** Active user sessions with device tracking and security

```typescript
{
  _id: Id<"authSessions">
  _creationTime: number
  
  // Relationships
  userId: Id<"users">
  
  // Session Info
  sessionToken: string              // Unique session identifier (hashed)
  refreshToken?: string             // For token refresh (encrypted)
  
  // Expiry
  expiresAt: number
  refreshExpiresAt?: number
  
  // Device Info
  device: {
    type: "desktop" | "mobile" | "tablet" | "unknown"
    os?: string                     // "macOS", "Windows", "iOS", "Android"
    osVersion?: string
    browser?: string                // "Chrome", "Safari", "Firefox"
    browserVersion?: string
    deviceName?: string             // User-provided friendly name
  }
  
  // Location (from IP)
  location: {
    ip: string                      // Hashed for privacy
    city?: string
    region?: string
    country?: string
    timezone?: string
  }
  
  // Activity
  createdAt: number                 // Session start
  lastActiveAt: number              // Last activity
  lastActivityType?: string         // "api_call", "page_view"
  
  // Security
  isTrusted: boolean                // User marked device as trusted
  trustedAt?: number
  
  riskScore?: number                // 0-100, computed risk
  requiresMfa: boolean              // Requires 2FA for this session
  mfaVerifiedAt?: number
  
  // Status
  status: "active" | "expired" | "revoked" | "replaced"
  revokedAt?: number
  revokedBy?: Id<"users">           // If manually revoked
  revokedReason?: string            // "user_logout", "security_concern", "password_change"
  
  replacedBy?: Id<"authSessions">   // If token was refreshed
}
```

**Indexes:**
- `by_user` - User's sessions
- `by_session_token` - Session lookup
- `by_user_status` - Active sessions per user
- `by_expires_at` - Cleanup expired sessions

---

### 2c. authVerificationTokens

**Purpose:** Temporary tokens for email verification, password reset, magic links

```typescript
{
  _id: Id<"authVerificationTokens">
  _creationTime: number
  
  // Relationships
  userId?: Id<"users">              // Null for pre-signup verification
  email: string                     // Target email
  
  // Token
  token: string                     // Hashed token
  tokenType: "email_verification" | "password_reset" | "magic_link" | 
             "email_change" | "phone_verification" | "mfa_setup"
  
  // Expiry
  expiresAt: number
  
  // Usage
  usedAt?: number
  usedBy?: Id<"users">
  
  // Attempts
  attempts: number
  maxAttempts: number               // Typically 3-5
  lastAttemptAt?: number
  
  // Additional Data
  metadata?: {
    newEmail?: string               // For email change
    redirectUrl?: string            // Post-verification redirect
    action?: string                 // Specific action to take
  }
  
  // Status
  status: "pending" | "used" | "expired" | "cancelled"
  cancelledAt?: number
  cancelledReason?: string
  
  // Audit
  createdAt: number
}
```

**Indexes:**
- `by_token` - Token lookup
- `by_email_type` - Email + token type
- `by_user_type` - User's verification tokens
- `by_expires_at` - Cleanup expired tokens

---

### 2d. authAuditLog

**Purpose:** Security audit trail for authentication events

```typescript
{
  _id: Id<"authAuditLog">
  _creationTime: number
  
  // Relationships
  userId?: Id<"users">              // Null for failed login attempts
  sessionId?: Id<"authSessions">
  
  // Event
  eventType: "login_success" | "login_failure" | "logout" | 
             "password_change" | "password_reset" | "email_verified" | 
             "mfa_enabled" | "mfa_disabled" | "mfa_verified" |
             "account_locked" | "account_unlocked" | "session_revoked" |
             "provider_connected" | "provider_disconnected" |
             "suspicious_activity" | "security_alert"
  
  eventSubtype?: string             // Additional detail
  
  // Context
  email?: string                    // Email involved (for failed attempts)
  provider?: string                 // Auth provider used
  
  // Result
  success: boolean
  failureReason?: string
  
  // Location & Device
  ip: string                        // Hashed
  userAgent?: string
  device?: {
    type: string
    os: string
    browser: string
  }
  location?: {
    city?: string
    country?: string
  }
  
  // Risk Assessment
  riskScore?: number                // 0-100
  riskFactors: string[]             // ["new_device", "unusual_location"]
  
  // Actions Taken
  actionsTaken: string[]            // ["sent_verification_email", "locked_account"]
  
  // Metadata
  metadata?: object                 // Event-specific data
  
  // Timestamp
  timestamp: number
}
```

**Indexes:**
- `by_user` - User's auth history
- `by_event_type` - Events by type
- `by_timestamp` - Chronological log
- `by_user_success` - Failed attempts per user
- `by_ip` - Track IP-based patterns

---

### 3. organizationMemberships

**Purpose:** User-organization relationship with roles and permissions

```typescript
{
  _id: Id<"organizationMemberships">
  _creationTime: number
  
  // Relationships
  userId: Id<"users">
  organizationId: Id<"organizations">
  
  // Role & Access
  role: "owner" | "admin" | "member" | "guest"
  customRole?: string               // Organization-defined role
  
  // Permissions
  permissions: {
    // Organization
    canManageOrganization: boolean
    canManageMembers: boolean
    canManageBilling: boolean
    
    // Events
    canCreateEvents: boolean
    canDeleteEvents: boolean
    canManageAllEvents: boolean     // Access to all org events
    
    // Settings
    canManageIntegrations: boolean
    canViewAuditLog: boolean
  }
  
  // Invitation
  invitationStatus: "pending" | "accepted" | "declined" | "expired"
  invitedBy?: Id<"users">
  invitedAt?: number
  invitationToken?: string          // For accepting invite
  invitationExpiresAt?: number
  
  // Acceptance
  acceptedAt?: number
  declinedAt?: number
  declineReason?: string
  
  // Status
  status: "active" | "suspended" | "left"
  joinedAt?: number
  leftAt?: number
  suspendedAt?: number
  suspendedBy?: Id<"users">
  suspendedReason?: string
  
  // Activity
  lastAccessedAt?: number
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy?: Id<"users">
  updatedBy?: Id<"users">
}
```

**Indexes:**
- `by_user_organization` - User's organizations (unique combo)
- `by_organization` - Organization members
- `by_user` - User's memberships
- `by_invitation_token` - Accept invites
- `by_organization_status` - Active members

---

### 4. events

**Purpose:** The main event being planned (wedding, party, conference, etc.)

```typescript
{
  _id: Id<"events">
  _creationTime: number
  
  // Core info
  name: string                      // "Alice & Bob's Wedding"
  type: "wedding" | "birthday" | "conference" | "corporate" | "party" | "other"
  subType?: string                  // "destination_wedding", "milestone_birthday"
  
  // Details
  description?: string
  date: number                      // Event date (timestamp)
  startTime?: number                // Event start (timestamp)
  endTime?: number                  // Event end (timestamp)
  
  // Location
  location: {
    type: "venue" | "tbd" | "multiple"
    venueName?: string
    address?: string
    city?: string
    state?: string
    country?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  
  // Scale
  expectedGuests: number            // Expected attendee count
  actualGuests?: number             // Final count
  
  // Budget
  budget: {
    total: number                   // In cents
    currency: string                // "USD"
    allocated: {                    // Budget by category
      [category: string]: number    // In cents
    }
  }
  
  // Timeline
  phase: "planning" | "execution" | "post_event"
  phaseProgress: number             // 0-100
  planningStartDate: number
  
  milestones: Array<{
    id: string
    name: string                    // "Venue Booked", "Save-the-Dates Sent"
    category: string                // "venue", "catering", etc.
    targetDate: number
    actualDate?: number
    status: "upcoming" | "completed" | "at_risk" | "overdue"
    completedBy?: Id<"users">
  }>
  
  // Relationships
  organizationId: Id<"organizations">
  
  // Settings
  settings: {
    visibility: "private" | "shared" | "public"
    allowCollaboratorInvites: boolean
    requireApprovalForExpenses: boolean
    defaultTaskAssignment: "coordinator" | "unassigned"
  }
  
  // Status
  status: "draft" | "active" | "completed" | "cancelled"
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_organization` - Organization's events
- `by_status` - Events by status
- `by_date` - Chronological ordering
- `by_creator` - User's created events

---

### 5. eventParticipants

**Purpose:** People involved in the event with role-based permissions

```typescript
{
  _id: Id<"eventParticipants">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  userId?: Id<"users">              // Null for guest-only participants
  
  // Identity (for non-users)
  email?: string
  name?: string
  phone?: string
  
  // Role & Permissions
  role: "coordinator" | "collaborator" | "guest" | "vendor"
  permissions: {
    canViewBudget: boolean
    canAddExpenses: boolean
    canCreateTasks: boolean
    canAssignTasks: boolean
    canInviteOthers: boolean
    canViewAllChats: boolean
    canManageVendors: boolean
  }
  
  // Contribution tracking
  tasksAssigned: number             // Count of assigned tasks
  tasksCompleted: number            // Count of completed tasks
  expensesPaid: number              // Total paid in cents
  messagesCount: number             // Chat activity
  lastActive: number                // Last activity timestamp
  
  // Invitation
  invitationStatus: "pending" | "accepted" | "declined"
  invitedBy: Id<"users">
  invitedAt: number
  respondedAt?: number
  
  // Status
  isActive: boolean
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's participants
- `by_event_role` - Participants by role
- `by_user_event` - User's event memberships
- `by_email` - Lookup by email

---

### 6. tasks

**Purpose:** Work items and to-dos for event planning

```typescript
{
  _id: Id<"tasks">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  taskGroupId?: Id<"taskGroups">    // Optional grouping
  parentTaskId?: Id<"tasks">        // For subtasks
  
  // Core info
  name: string                      // "Book photographer"
  description?: string              // AI-generated or user-provided
  
  // Categorization
  category: "venue" | "catering" | "photography" | "music" | "flowers" | 
            "attire" | "stationery" | "decor" | "transportation" | 
            "accommodations" | "entertainment" | "other"
  tags: string[]                    // ["urgent", "vendor", "DIY"]
  
  // Assignment
  assignedTo: Id<"eventParticipants">[]
  assignedBy?: Id<"users">
  assignmentType: "individual" | "collaborative" | "unassigned"
  
  // Timeline
  dueDate?: number
  startDate?: number
  estimatedDuration?: number        // In minutes
  
  // Status
  status: "not_started" | "in_progress" | "completed" | "blocked" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  
  // Progress tracking
  progress: number                  // 0-100
  progressSteps: Array<{
    id: string
    title: string
    completed: boolean
    completedAt?: number
    completedBy?: Id<"users">
  }>
  
  // Dependencies
  dependsOn: Id<"tasks">[]          // Task IDs that must complete first
  blockedBy: Id<"tasks">[]          // Tasks blocking this one
  
  // Budget
  estimatedCost?: {
    min: number                     // In cents
    max: number                     // In cents
    currency: string
  }
  actualCost?: number               // From linked expenses, in cents
  
  // Vendor info (if task involves vendor)
  requiresVendor: boolean
  vendorSuggestions: Array<{
    vendorId?: Id<"vendors">
    name: string
    priceRange?: string
    rating?: number
    status: "suggested" | "contacted" | "booked" | "rejected"
  }>
  selectedVendor?: Id<"vendors">
  
  // Planning tips from AI
  nextSteps: string[]               // AI-generated action items
  planningTips: string[]            // AI-generated tips
  typicalLeadTime?: string          // "6 months before event"
  questionsToAsk: string[]          // For vendor consultations
  
  // AI metadata
  aiGenerated: boolean
  aiAgentType?: string              // "taskEnricher"
  aiConfidence?: number
  aiMetadata?: {
    detectedFrom?: string           // "chat_message"
    sourceMessageId?: Id<"messages">
    enrichmentDate?: number
  }
  
  // Completion
  completedAt?: number
  completedBy?: Id<"users">
  completionNotes?: string
  
  // Status
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's tasks
- `by_event_status` - Tasks by status
- `by_event_category` - Tasks by category
- `by_due_date` - Chronological ordering
- `by_assigned` - User's assigned tasks
- `by_task_group` - Grouped tasks
- `by_vendor` - Vendor-related tasks

---

### 7. taskGroups

**Purpose:** Collections of related tasks with auto-calculated progress

```typescript
{
  _id: Id<"taskGroups">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  
  // Core info
  name: string                      // "Venue Selection", "Catering Planning"
  description?: string
  
  // Categorization
  category: string                  // Same categories as tasks
  icon?: string                     // Icon identifier
  color?: string                    // Color code
  
  // Progress (auto-calculated)
  progress: number                  // 0-100, avg of contained tasks
  totalTasks: number                // Count
  completedTasks: number            // Count
  
  // Timeline
  targetCompletionDate?: number
  
  // Status
  status: "active" | "completed" | "archived"
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's task groups
- `by_event_category` - Groups by category

---

### 8. expenses

**Purpose:** Financial transactions and expense tracking

```typescript
{
  _id: Id<"expenses">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  taskId?: Id<"tasks">              // Linked task
  vendorId?: Id<"vendors">          // If paid to vendor
  
  // Amount
  amount: number                    // In cents
  currency: string                  // "USD"
  
  // Details
  description: string               // "Venue deposit", "DJ final payment"
  category: string                  // Same categories as tasks
  
  // Type
  type: "deposit" | "partial_payment" | "final_payment" | 
        "refund" | "miscellaneous"
  
  // Payment info
  paidBy: Id<"eventParticipants">
  paidDate: number
  paymentMethod?: "cash" | "credit_card" | "check" | "bank_transfer" | "other"
  
  // Splitting
  split: {
    type: "even" | "custom" | "percentage" | "no_split"
    participants: Array<{
      participantId: Id<"eventParticipants">
      amount: number                // In cents
      percentage?: number           // If percentage split
      paid: boolean
      paidDate?: number
    }>
  }
  
  // Budget tracking
  budgetCategory: string            // Which budget category
  estimatedAmount?: number          // Expected cost (from task)
  variance?: number                 // Actual - estimated (in cents)
  
  // Receipt
  receiptUrl?: string               // Storage reference
  receiptMetadata?: {
    merchant?: string
    receiptNumber?: string
    taxAmount?: number
    extractedData?: object          // OCR results
  }
  
  // AI metadata
  aiGenerated: boolean
  aiCategorization?: {
    confidence: number
    suggestedCategory: string
    alternativeCategories: string[]
  }
  
  // Status
  status: "pending" | "paid" | "cancelled" | "refunded"
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's expenses
- `by_event_category` - Expenses by category
- `by_event_paid_by` - User's paid expenses
- `by_date` - Chronological ordering
- `by_task` - Task-linked expenses
- `by_vendor` - Vendor payments

---

### 9. vendors

**Purpose:** External service providers (photographers, caterers, etc.)

```typescript
{
  _id: Id<"vendors">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">             // Event-specific vendor
  organizationId: Id<"organizations"> // Can be reused across events
  
  // Identity
  name: string                      // "Sarah Chen Photography"
  businessName?: string             // Legal business name
  
  // Category
  category: "venue" | "catering" | "photography" | "videography" | 
            "music" | "flowers" | "decor" | "planning" | "officiant" | 
            "cake" | "bar" | "transportation" | "attire" | "stationery" | 
            "photobooth" | "rentals" | "other"
  specialties: string[]             // ["wedding", "candid photography"]
  
  // Contact
  contactPerson?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  
  // Business info
  priceRange?: {
    min: number                     // In cents
    max: number                     // In cents
    currency: string
    note?: string                   // "Per hour", "package deal"
  }
  
  // Ratings
  rating?: number                   // 0-5
  reviewCount?: number
  reviewsUrl?: string
  
  // Availability
  availability: "available" | "likely_available" | "checking" | "unavailable"
  availabilityCheckedAt?: number
  
  // Booking status
  status: "suggested" | "contacted" | "quoted" | "negotiating" | 
          "contracted" | "confirmed" | "completed" | "cancelled"
  
  // Contract & payments
  contractUrl?: string              // Storage reference
  contractSignedDate?: number
  totalContractAmount?: number      // In cents
  depositAmount?: number            // In cents
  depositPaidDate?: number
  balanceDueDate?: number
  
  // Communication history
  lastContactDate?: number
  nextFollowUpDate?: number
  communicationNotes: Array<{
    id: string
    date: number
    type: "call" | "email" | "meeting" | "text"
    notes: string
    createdBy: Id<"users">
  }>
  
  // Documents
  documents: Array<{
    id: string
    name: string
    type: "contract" | "quote" | "invoice" | "portfolio" | "other"
    url: string
    uploadedAt: number
    uploadedBy: Id<"users">
  }>
  
  // AI metadata
  aiSuggested: boolean
  aiRanking?: number                // For sorting suggestions
  aiMatchScore?: number             // How well they match requirements
  
  // Status
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's vendors
- `by_event_category` - Vendors by category
- `by_event_status` - Vendors by booking status
- `by_organization` - Organization's vendor database

---

### 10. polls

**Purpose:** Group decision-making with voting

```typescript
{
  _id: Id<"polls">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  chatId?: Id<"chats">              // If created in specific chat
  
  // Poll info
  question: string                  // "Should we do buffet or plated dinner?"
  description?: string              // Additional context
  
  // Type
  type: "single_choice" | "multiple_choice" | "yes_no_maybe" | 
        "ranked_choice" | "rating" | "budget_allocation"
  
  // Options
  options: Array<{
    id: string
    label: string                   // "Buffet Style", "Plated Dinner"
    description?: string            // AI-enriched details
    pros: string[]                  // AI-generated pros
    cons: string[]                  // AI-generated cons
    estimatedCost?: {
      min: number
      max: number
      currency: string
    }
    imageUrl?: string
  }>
  
  // Voting
  votes: Array<{
    participantId: Id<"eventParticipants">
    votedAt: number
    
    // Vote value depends on poll type
    singleChoice?: string           // Option ID
    multipleChoice?: string[]       // Option IDs
    yesNoMaybe?: "yes" | "no" | "maybe"
    ranking?: string[]              // Ordered option IDs
    rating?: { [optionId: string]: number }  // 1-5 stars
    budgetAllocation?: { [optionId: string]: number }  // Percentages
  }>
  
  // Results
  results: {
    totalVotes: number
    votingParticipation: number     // Percentage
    
    // Result depends on type
    winner?: string                 // Option ID
    tied?: boolean
    distribution: {
      [optionId: string]: number    // Vote count or average
    }
    
    // AI analysis
    analysis?: {
      trend: string                 // "buffet gaining momentum"
      demographicInsights: string[]
      confidence: number
    }
  }
  
  // Settings
  settings: {
    deadline?: number               // Voting deadline
    allowChangeVote: boolean
    anonymousVotes: boolean
    requireAllVotes: boolean
    eligibleVoters: Id<"eventParticipants">[]  // Empty = all participants
    tieBreaker?: Id<"eventParticipants">       // Who decides if tied
  }
  
  // AI metadata
  aiGenerated: boolean
  aiEnriched: boolean               // Options enriched by AI
  aiRecommendation?: {
    optionId: string
    reasoning: string
    confidence: number
  }
  
  // Status
  status: "draft" | "active" | "closed" | "cancelled"
  closedAt?: number
  closedBy?: Id<"users">
  
  // Decision recorded
  decisionId?: Id<"decisions">      // Linked decision record
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's polls
- `by_status` - Active polls
- `by_chat` - Chat polls

---

### 11. decisions

**Purpose:** Record of important decisions made during planning

```typescript
{
  _id: Id<"decisions">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  pollId?: Id<"polls">              // If decided via poll
  taskId?: Id<"tasks">              // Related task
  
  // Decision
  category: string                  // "catering", "venue", etc.
  what: string                      // "Dinner service style"
  decision: string                  // "Buffet service"
  reasoning: string                 // Why this was chosen
  
  // Context
  alternatives: string[]            // Options that weren't chosen
  votingResults?: {
    winner: string
    votes: { [option: string]: number }
  }
  
  // Impact
  impacts: Array<{
    type: "budget" | "timeline" | "task" | "vendor"
    description: string
    affectedIds: string[]           // Related object IDs
  }>
  
  // Reversibility
  canBeReversed: boolean
  reversalCost: "low" | "medium" | "high"
  reversalDeadline?: number         // Last date to change
  
  // Status
  status: "active" | "revised" | "reversed"
  revisedDecisionId?: Id<"decisions">  // If decision was changed
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's decisions
- `by_event_category` - Decisions by category
- `by_poll` - Poll-driven decisions

---

### 12. chats

**Purpose:** Sub-group conversations for focused discussions

```typescript
{
  _id: Id<"chats">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  
  // Chat info
  name: string                      // "Catering Decisions", "Bachelor Party Planning"
  description?: string
  type: "main" | "subgroup" | "vendor" | "announcement"
  
  // Participants
  participants: Id<"eventParticipants">[]
  participantRoles?: {
    [participantId: string]: "admin" | "member"
  }
  
  // Settings
  settings: {
    allowNewMembers: boolean
    onlyAdminsCanPost: boolean      // For announcement channels
    pinnedMessages: Id<"messages">[]
  }
  
  // Activity
  lastMessageAt: number
  messageCount: number
  unreadCounts: {
    [participantId: string]: number
  }
  
  // Status
  isArchived: boolean
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's chats
- `by_event_type` - Chats by type
- `by_participant` - User's chats

---

### 13. messages

**Purpose:** Chat messages that drive the system

```typescript
{
  _id: Id<"messages">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  chatId: Id<"chats">
  senderId: Id<"eventParticipants">
  
  // Content
  text: string                      // Message text
  mentionedParticipants: Id<"eventParticipants">[]
  
  // Attachments
  attachments: Array<{
    id: string
    type: "image" | "file" | "receipt"
    url: string
    name: string
    size: number
    mimeType: string
  }>
  
  // Message type
  type: "user_message" | "system_message" | "ai_message" | "action_prompt"
  
  // AI detection results
  aiAnalysis?: {
    intents: Array<{
      type: "task_creation" | "expense_entry" | "poll_creation" | 
            "vendor_action" | "calendar_event" | "general_chat"
      confidence: number
      entities: object                // Extracted entities
    }>
    
    shouldTriggerAI: boolean
    recommendedAgent?: string
    contextLevel?: string
  }
  
  // Generated artifacts
  generatedArtifacts: Array<{
    type: "task" | "expense" | "poll" | "calendar_event"
    artifactId: string              // ID of created object
    createdAt: number
  }>
  
  // Quick actions (shown as buttons)
  quickActions: Array<{
    id: string
    label: string
    action: string
    completed: boolean
    completedBy?: Id<"users">
    completedAt?: number
  }>
  
  // Thread
  replyToId?: Id<"messages">        // Parent message if reply
  threadReplies: number             // Count of replies
  
  // Reactions
  reactions: {
    [emoji: string]: Id<"eventParticipants">[]
  }
  
  // Read status
  readBy: Array<{
    participantId: Id<"eventParticipants">
    readAt: number
  }>
  
  // Edit/delete
  editedAt?: number
  editHistory?: Array<{
    text: string
    editedAt: number
  }>
  
  isDeleted: boolean
  deletedAt?: number
  deletedBy?: Id<"users">
  
  // Audit
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_chat` - Chat's messages (chronological)
- `by_event` - Event's all messages
- `by_sender` - User's messages
- `by_reply_to` - Thread messages

---

### 14. calendarEvents

**Purpose:** Calendar events for meetings, deadlines, vendor calls

```typescript
{
  _id: Id<"calendarEvents">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  taskId?: Id<"tasks">              // Linked task
  vendorId?: Id<"vendors">          // Vendor meeting
  
  // Event info
  title: string                     // "Venue Tour", "DJ Consultation Call"
  description?: string
  
  // Type
  type: "meeting" | "deadline" | "vendor_call" | "milestone" | 
        "rehearsal" | "day_of" | "other"
  
  // DateTime
  startDate: number                 // Timestamp
  endDate: number                   // Timestamp
  allDay: boolean
  timezone: string
  
  // Location
  location?: {
    type: "physical" | "virtual" | "phone"
    address?: string
    meetingUrl?: string
    phoneNumber?: string
  }
  
  // Attendees
  attendees: Array<{
    participantId?: Id<"eventParticipants">
    email?: string                  // For external attendees
    name?: string
    status: "pending" | "accepted" | "declined" | "tentative"
    respondedAt?: number
  }>
  
  // Reminders
  reminders: Array<{
    type: "notification" | "email"
    minutesBefore: number           // 60 = 1 hour before
    sent: boolean
    sentAt?: number
  }>
  
  // Recurrence
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly"
    interval: number                // Every N days/weeks/months
    endDate?: number
    occurrences?: number
  }
  
  // External calendar sync
  syncedToCalendar: boolean
  externalCalendarEventId?: string
  calendarProvider?: "google" | "microsoft" | "apple"
  lastSyncedAt?: number
  
  // AI metadata
  aiGenerated: boolean
  aiSuggestedTime?: boolean
  
  // Status
  status: "scheduled" | "completed" | "cancelled" | "rescheduled"
  
  // Audit
  isDeleted: boolean
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's calendar events
- `by_start_date` - Chronological ordering
- `by_attendee` - User's calendar events
- `by_task` - Task-linked events
- `by_vendor` - Vendor meetings

---

### 15. guestList

**Purpose:** Wedding guests / event attendees with RSVP tracking

```typescript
{
  _id: Id<"guestList">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  
  // Guest info
  firstName: string
  lastName: string
  email?: string
  phone?: string
  
  // Grouping
  group?: string                    // "Family", "Friends", "Colleagues"
  plusOne: boolean
  plusOneName?: string
  
  // RSVP
  rsvpStatus: "pending" | "yes" | "no" | "maybe"
  rsvpDate?: number
  rsvpMethod?: "website" | "email" | "phone" | "mail"
  
  // Attendance details
  attendingCeremony: boolean
  attendingReception: boolean
  guestCount: number                // 1 or 2 (with plus one)
  
  // Preferences
  mealPreference?: string           // "chicken", "vegetarian", "vegan"
  dietaryRestrictions: string[]     // ["gluten-free", "nut allergy"]
  specialRequests?: string
  
  // Contact info
  mailingAddress?: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  // Invitation
  invitationSentDate?: number
  invitationType: "save_the_date" | "formal_invitation" | "both"
  invitationStatus: "not_sent" | "sent" | "delivered" | "bounced"
  
  // Seating (future feature)
  tableNumber?: string
  seatNumber?: string
  
  // Notes
  notes?: string
  
  // Status
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's guests
- `by_event_rsvp_status` - Guests by RSVP status
- `by_event_group` - Guests by group
- `by_email` - Lookup by email

---

### 16. files

**Purpose:** Document storage (contracts, receipts, inspiration, etc.)

```typescript
{
  _id: Id<"files">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  taskId?: Id<"tasks">
  expenseId?: Id<"expenses">
  vendorId?: Id<"vendors">
  
  // File info
  name: string
  storageId: Id<"_storage">         // Convex storage reference
  url: string                       // Access URL
  
  // Type
  type: "contract" | "receipt" | "invoice" | "inspiration" | 
        "design" | "photo" | "document" | "other"
  
  // Metadata
  mimeType: string
  size: number                      // In bytes
  
  // Categorization
  category?: string                 // "venue", "catering", etc.
  tags: string[]
  
  // OCR / AI processing
  ocrText?: string                  // Extracted text
  aiAnalysis?: {
    confidence: number
    extractedData: object           // Structured data from receipt/contract
    category?: string
  }
  
  // Visibility
  visibility: "all" | "coordinators_only" | "specific_users"
  allowedParticipants?: Id<"eventParticipants">[]
  
  // Status
  isDeleted: boolean
  
  // Audit
  createdAt: number
  updatedAt: number
  createdBy: Id<"users">
  updatedBy: Id<"users">
}
```

**Indexes:**
- `by_event` - Event's files
- `by_event_type` - Files by type
- `by_event_category` - Files by category
- `by_task` - Task-linked files
- `by_expense` - Expense receipts
- `by_vendor` - Vendor documents

---

### 17. aiAgentCalls

**Purpose:** Track AI agent usage and performance

```typescript
{
  _id: Id<"aiAgentCalls">
  _creationTime: number
  
  // Relationships
  eventId: Id<"events">
  messageId?: Id<"messages">        // Triggering message
  
  // Agent info
  agentType: "taskEnricher" | "promiseManager" | "budgetAnalyst" | 
             "planningAdvisor" | "dependencyAnalyzer"
  
  // Request
  intent: string                    // "task_creation", "expense_analysis"
  contextLevel: "minimal" | "standard" | "rich" | "comprehensive"
  contextTokens: number
  
  // Response
  responseValid: boolean
  responseTokens: number
  responseTime: number              // Milliseconds
  
  // Cost
  cost: number                      // In cents
  model: string                     // "claude-sonnet-4"
  
  // Outcome
  artifactsCreated: Array<{
    type: string
    artifactId: string
  }>
  
  userAccepted: boolean             // Did user accept AI suggestion?
  userFeedback?: string
  
  // Errors
  error?: string
  
  // Timestamp
  calledAt: number
}
```

**Indexes:**
- `by_event` - Event's AI calls
- `by_agent_type` - Calls by agent
- `by_date` - Chronological analysis

---

### 18. costLearnings

**Purpose:** Machine learning data for cost estimation improvement

```typescript
{
  _id: Id<"costLearnings">
  _creationTime: number
  
  // Context
  eventType: string                 // "wedding", "birthday", etc.
  taskCategory: string              // "photography", "catering"
  attendeeRange: string             // "50-100", "100-150"
  location?: string                 // City/state
  
  // Estimate
  estimatedCost: {
    min: number                     // In cents
    max: number                     // In cents
  }
  
  // Actual
  actualCost: number                // In cents
  
  // Analysis
  variance: number                  // Actual - estimated (cents)
  variancePercent: number           // Percentage
  accuracyScore: number             // 0-1
  
  // Metadata
  taskId: Id<"tasks">
  expenseId: Id<"expenses">
  
  // Timestamp
  recordedAt: number
}
```

**Indexes:**
- `by_event_type_category` - Learning by type and category
- `by_location` - Regional pricing patterns

---

## Relationship Map

```
┌──────────────────┐
│  organizations   │
└────────┬─────────┘
         │
         ├──► users (via organizationMemberships)
         │     │
         │     ├──► authProviders (multiple auth methods)
         │     │    
         │     ├──► authSessions (active sessions)
         │     │
         │     ├──► authVerificationTokens (email verify, password reset)
         │     │
         │     └──► authAuditLog (security events)
         │
         └──► events
              │
              ├──► eventParticipants
              │    │
              │    └──► tasks (assignedTo)
              │
              ├──► tasks
              │    │
              │    ├──► taskGroups
              │    ├──► expenses (linked)
              │    ├──► vendors (related)
              │    └──► calendarEvents
              │
              ├──► expenses
              │    │
              │    ├──► vendors (payment to)
              │    └──► files (receipts)
              │
              ├──► vendors
              │    │
              │    ├──► tasks (related)
              │    ├──► expenses (payments)
              │    ├──► calendarEvents (meetings)
              │    └──► files (contracts)
              │
              ├──► polls
              │    │
              │    └──► decisions (recorded)
              │
              ├──► decisions
              │
              ├──► chats
              │    │
              │    └──► messages
              │         │
              │         └──► generatedArtifacts (tasks, expenses, polls)
              │
              ├──► calendarEvents
              │
              ├──► guestList
              │
              ├──► files
              │
              ├──► aiAgentCalls (AI usage tracking)
              │
              └──► costLearnings (ML data)
```

---

## Indexes

### Organization & Access
```typescript
// organizations
"by_slug": ["slug"]

// users
"by_email": ["email"]                    // Primary lookup (unique)
"by_status": ["status"]                  // Active users
"by_phone": ["phone"]                    // Phone lookup
"by_last_active": ["lastActiveAt"]      // Activity tracking

// organizationMemberships
"by_user_organization": ["userId", "organizationId"]  // Unique combo
"by_organization": ["organizationId"]
"by_user": ["userId"]
"by_invitation_token": ["invitationToken"]
"by_organization_status": ["organizationId", "status"]
```

### Authentication & Security
```typescript
// authProviders
"by_user": ["userId"]
"by_provider_id": ["provider", "providerId"]
"by_user_provider": ["userId", "provider"]  // Unique combo

// authSessions
"by_user": ["userId"]
"by_session_token": ["sessionToken"]        // Unique
"by_user_status": ["userId", "status"]
"by_expires_at": ["expiresAt"]              // Cleanup expired

// authVerificationTokens
"by_token": ["token"]                       // Unique
"by_email_type": ["email", "tokenType"]
"by_user_type": ["userId", "tokenType"]
"by_expires_at": ["expiresAt"]              // Cleanup expired

// authAuditLog
"by_user": ["userId"]
"by_event_type": ["eventType"]
"by_timestamp": ["timestamp"]
"by_user_success": ["userId", "success"]    // Track failed attempts
"by_ip": ["ip"]                             // IP-based pattern detection
```

### Events
```typescript
// events
"by_organization": ["organizationId"]
"by_status": ["status"]
"by_date": ["date"]
"by_creator": ["createdBy"]

// eventParticipants
"by_event": ["eventId"]
"by_event_role": ["eventId", "role"]
"by_user_event": ["userId", "eventId"]
"by_email": ["email"]
```

### Tasks
```typescript
// tasks
"by_event": ["eventId"]
"by_event_status": ["eventId", "status"]
"by_event_category": ["eventId", "category"]
"by_due_date": ["dueDate"]
"by_assigned": ["assignedTo"]
"by_task_group": ["taskGroupId"]
"by_vendor": ["selectedVendor"]

// taskGroups
"by_event": ["eventId"]
"by_event_category": ["eventId", "category"]
```

### Financial
```typescript
// expenses
"by_event": ["eventId"]
"by_event_category": ["eventId", "category"]
"by_event_paid_by": ["eventId", "paidBy"]
"by_date": ["paidDate"]
"by_task": ["taskId"]
"by_vendor": ["vendorId"]
```

### Vendors
```typescript
// vendors
"by_event": ["eventId"]
"by_event_category": ["eventId", "category"]
"by_event_status": ["eventId", "status"]
"by_organization": ["organizationId"]
```

### Collaboration
```typescript
// polls
"by_event": ["eventId"]
"by_status": ["status"]
"by_chat": ["chatId"]

// decisions
"by_event": ["eventId"]
"by_event_category": ["eventId", "category"]
"by_poll": ["pollId"]

// chats
"by_event": ["eventId"]
"by_event_type": ["eventId", "type"]
"by_participant": ["participants"]

// messages
"by_chat": ["chatId", "createdAt"]  // Chronological
"by_event": ["eventId"]
"by_sender": ["senderId"]
"by_reply_to": ["replyToId"]
```

### Calendar & Guests
```typescript
// calendarEvents
"by_event": ["eventId"]
"by_start_date": ["startDate"]
"by_attendee": ["attendees"]
"by_task": ["taskId"]
"by_vendor": ["vendorId"]

// guestList
"by_event": ["eventId"]
"by_event_rsvp_status": ["eventId", "rsvpStatus"]
"by_event_group": ["eventId", "group"]
"by_email": ["email"]
```

### Files & AI
```typescript
// files
"by_event": ["eventId"]
"by_event_type": ["eventId", "type"]
"by_event_category": ["eventId", "category"]
"by_task": ["taskId"]
"by_expense": ["expenseId"]
"by_vendor": ["vendorId"]

// aiAgentCalls
"by_event": ["eventId"]
"by_agent_type": ["agentType"]
"by_date": ["calledAt"]

// costLearnings
"by_event_type_category": ["eventType", "taskCategory"]
"by_location": ["location"]
```

---

## Enums & Constants

### Event Types
```typescript
type EventType = 
  | "wedding"
  | "birthday"
  | "anniversary"
  | "baby_shower"
  | "graduation"
  | "conference"
  | "corporate"
  | "fundraiser"
  | "party"
  | "other"
```

### Event Status
```typescript
type EventStatus = 
  | "draft"          // Being set up
  | "active"         // In planning
  | "completed"      // Event happened
  | "cancelled"      // Event cancelled
```

### Event Phase
```typescript
type EventPhase = 
  | "planning"       // Pre-event planning
  | "execution"      // Event is happening
  | "post_event"     // Wrap-up
```

### Task Categories
```typescript
type TaskCategory = 
  | "venue"
  | "catering"
  | "photography"
  | "videography"
  | "music"
  | "flowers"
  | "attire"
  | "stationery"
  | "decor"
  | "transportation"
  | "accommodations"
  | "entertainment"
  | "legal"
  | "communication"
  | "other"
```

### Task Status
```typescript
type TaskStatus = 
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled"
```

### Task Priority
```typescript
type TaskPriority = 
  | "low"
  | "medium"
  | "high"
  | "urgent"
```

### Expense Types
```typescript
type ExpenseType = 
  | "deposit"
  | "partial_payment"
  | "final_payment"
  | "refund"
  | "miscellaneous"
```

### Expense Status
```typescript
type ExpenseStatus = 
  | "pending"
  | "paid"
  | "cancelled"
  | "refunded"
```

### Split Types
```typescript
type SplitType = 
  | "even"           // Split evenly
  | "custom"         // Custom amounts
  | "percentage"     // By percentage
  | "no_split"       // One person pays
```

### Vendor Status
```typescript
type VendorStatus = 
  | "suggested"      // AI-suggested
  | "contacted"      // Reached out
  | "quoted"         // Got pricing
  | "negotiating"    // In discussions
  | "contracted"     // Signed contract
  | "confirmed"      // Confirmed for event
  | "completed"      // Service delivered
  | "cancelled"      // Cancelled booking
```

### Poll Types
```typescript
type PollType = 
  | "single_choice"      // Pick one
  | "multiple_choice"    // Pick many
  | "yes_no_maybe"       // Three options
  | "ranked_choice"      // Rank preferences
  | "rating"             // Rate 1-5
  | "budget_allocation"  // Distribute percentages
```

### Poll Status
```typescript
type PollStatus = 
  | "draft"
  | "active"
  | "closed"
  | "cancelled"
```

### Decision Status
```typescript
type DecisionStatus = 
  | "active"         // Current decision
  | "revised"        // Updated decision
  | "reversed"       // Decision changed
```

### Chat Types
```typescript
type ChatType = 
  | "main"           // Main event chat
  | "subgroup"       // Focused sub-group
  | "vendor"         // Vendor communication
  | "announcement"   // One-way announcements
```

### Message Types
```typescript
type MessageType = 
  | "user_message"   // User-sent message
  | "system_message" // System notification
  | "ai_message"     // AI response
  | "action_prompt"  // Action suggestion
```

### Calendar Event Types
```typescript
type CalendarEventType = 
  | "meeting"
  | "deadline"
  | "vendor_call"
  | "milestone"
  | "rehearsal"
  | "day_of"
  | "other"
```

### Participant Roles
```typescript
type ParticipantRole = 
  | "coordinator"    // Full control
  | "collaborator"   // Can create/edit
  | "guest"          // Limited access
  | "vendor"         // External vendor
```

### RSVP Status
```typescript
type RsvpStatus = 
  | "pending"
  | "yes"
  | "no"
  | "maybe"
```

### AI Agent Types
```typescript
type AIAgentType = 
  | "taskEnricher"
  | "promiseManager"
  | "budgetAnalyst"
  | "planningAdvisor"
  | "dependencyAnalyzer"
```

### Context Levels
```typescript
type ContextLevel = 
  | "minimal"        // < 500 tokens
  | "standard"       // 500-1000 tokens
  | "rich"           // 1000-3000 tokens
  | "comprehensive"  // 3000+ tokens
```

---

## Implementation Notes

### Convex Schema Definition

All tables defined in `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Organizations
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("cancelled")
    ),
    // ... rest of fields
  }).index("by_slug", ["slug"]),
  
  // Events
  events: defineTable({
    name: v.string(),
    type: v.string(),
    date: v.number(),
    organizationId: v.id("organizations"),
    // ... rest of fields
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),
  
  // Tasks
  tasks: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    status: v.string(),
    category: v.string(),
    // ... rest of fields
  })
    .index("by_event", ["eventId"])
    .index("by_event_status", ["eventId", "status"])
    .index("by_event_category", ["eventId", "category"])
    .index("by_due_date", ["dueDate"]),
  
  // ... all other tables
});
```

### Type Generation

Convex auto-generates TypeScript types:

```typescript
// Automatically generated from schema
import { Doc, Id } from "./_generated/dataModel";

type Event = Doc<"events">;
type Task = Doc<"tasks">;
type EventId = Id<"events">;
```

### Query Patterns

```typescript
// Get event with all participants
const event = await ctx.db.get(eventId);
const participants = await ctx.db
  .query("eventParticipants")
  .withIndex("by_event", (q) => q.eq("eventId", eventId))
  .collect();

// Get active tasks for category
const tasks = await ctx.db
  .query("tasks")
  .withIndex("by_event_category", (q) =>
    q.eq("eventId", eventId).eq("category", "catering")
  )
  .filter((q) => q.eq(q.field("status"), "in_progress"))
  .collect();

// Get expenses with budget variance
const expenses = await ctx.db
  .query("expenses")
  .withIndex("by_event_category", (q) =>
    q.eq("eventId", eventId).eq("category", "venue")
  )
  .collect();
```

### Real-Time Subscriptions

```typescript
// React component subscribes to updates
const tasks = useQuery(api.tasks.getByEvent, { eventId });
const expenses = useQuery(api.expenses.getByEvent, { eventId });
const messages = useQuery(api.messages.getByChatId, { chatId });

// Auto-updates when data changes in database
```

---

**End of Schema Reference**

This comprehensive schema provides the complete foundation for the AI-powered event planning platform with all necessary tables, relationships, indexes, and patterns for real-time collaborative event planning.
