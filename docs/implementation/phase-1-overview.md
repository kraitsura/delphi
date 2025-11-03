# Phase 1 Overview: Database & CRUD Operations

> **Status:** Phase 1 - In Progress (Phase 1.1 Complete ✅)
> **Timeline:** Weeks 1-2
> **Last Updated:** January 2025

---

## Current Implementation Status

**✅ Completed:**
- Phase 1.1: Authentication & Authorization (80% - core auth working, helpers pending)

**🚧 In Progress:**
- Phase 1.0: Database Schema (not started - placeholder schema only)

**❌ Not Started:**
- Phase 1.2-1.7: Blocked by Phase 1.0 completion

---

## Introduction

Welcome to Phase 1 of the Delphi implementation! This phase establishes the complete foundation for the event planning platform, including database schema, authentication, and all CRUD operations for core entities.

Phase 1 has been divided into **8 focused sub-phases** to enable better implementation quality, clearer documentation, and more effective AI agent collaboration.

### Important: Better Auth Component Architecture

**Key Architectural Note:** This app uses **Better Auth with Convex component integration**, which means:

- **Better Auth manages authentication tables** (user, session, account, verification) in a separate component namespace
- **Your app schema** (`/web/convex/schema.ts`) defines **extended/app-specific tables** (users with role/preferences, events, rooms, messages)
- **The relationship:** Better Auth handles authentication; your schema extends with application data
- **Integration point:** Use `authComponent.getAuthUser(ctx)` to access authenticated user, then link to extended profile

This separation keeps auth logic isolated while allowing flexible app-specific user data.

---

## Phase Structure

### Phase 1.0: Database Schema & Foundation
**Time:** 2-3 hours | [📄 Documentation](./phase-1.0-database-schema.md)

**Status:** ❌ **NOT STARTED** - Placeholder schema only (products, todos)

**What You'll Build:**
- Complete Convex schema for all entities
- Proper indexes for efficient querying
- Junction tables for many-to-many relationships
- Environment setup and deployment

**Key Deliverables:**
- ❌ Schema definition with 9 tables (not implemented)
- ❌ Optimized indexes (not implemented)
- ✅ Development environment configured

**Start Here:** [Phase 1.0 Documentation](./phase-1.0-database-schema.md)

---

### Phase 1.1: Authentication & Authorization
**Time:** 3-4 hours | [📄 Documentation](./phase-1.1-authentication.md)

**Status:** ✅ **80% COMPLETE** - Core auth working, helpers/guards pending

**What You'll Build:**
- Better Auth + Convex integration
- Google OAuth provider
- Role-based access control (RBAC)
- Protected query/mutation wrappers
- Route guards

**Key Deliverables:**
- ✅ Email/password + OAuth authentication (DONE)
- ✅ Better Auth + Convex component configured (DONE)
- ✅ Sign-in/sign-up forms with Google button (DONE)
- ✅ Basic route protection (dashboard) (DONE)
- ✅ User menu component (DONE)
- ❌ 4 user roles (pending schema)
- ❌ auth-helpers.ts with RBAC functions (not implemented)
- ❌ Protected query/mutation wrappers (not implemented)
- ❌ Standardized route guards (not implemented)

**Continue to:** [Phase 1.1 Documentation](./phase-1.1-authentication.md)

---

### Phase 1.2: Users CRUD Operations
**Time:** 2-3 hours | [📄 Documentation](./phase-1.2-users-crud.md)

**Status:** ❌ **NOT STARTED** - Blocked by Phase 1.0 (schema required)

**What You'll Build:**
- User profile management
- Avatar upload with Convex storage
- User preferences
- Activity tracking
- User search

**Key Deliverables:**
- ❌ Complete user CRUD (not implemented)
- ❌ Avatar image upload (not implemented)
- ❌ Profile preferences (not implemented)
- ❌ Last active tracking (not implemented)

**Prerequisites:**
- ⚠️ **Requires Phase 1.0:** users table must be defined in schema

**Continue to:** [Phase 1.2 Documentation](./phase-1.2-users-crud.md)

---

### Phase 1.3: Events CRUD Operations
**Time:** 2-3 hours | [📄 Documentation](./phase-1.3-events-crud.md)

**What You'll Build:**
- Event creation and management
- Event access control
- Co-coordinator management
- Event statistics
- Budget tracking

**Key Deliverables:**
- ✅ Event CRUD with permissions
- ✅ Main room auto-creation
- ✅ Co-coordinator system
- ✅ Event statistics dashboard

**Continue to:** [Phase 1.3 Documentation](./phase-1.3-events-crud.md)

---

### Phase 1.4: Rooms & Participants CRUD
**Time:** 2-3 hours | [📄 Documentation](./phase-1.4-rooms-crud.md)

**What You'll Build:**
- Room creation and management
- Participant management
- Room permissions
- Room types (main, vendor, topic, private)

**Key Deliverables:**
- ✅ Room CRUD operations
- ✅ Participant add/remove
- ✅ Permission management
- ✅ 5 room types

**Continue to:** [Phase 1.4 Documentation](./phase-1.4-rooms-crud.md)

---

### Phase 1.5: Messages & Real-time Chat
**Time:** 3-4 hours | [📄 Documentation](./phase-1.5-messages-crud.md)

**What You'll Build:**
- Real-time messaging
- Message CRUD operations
- Read tracking
- Unread counts
- Message pagination

**Key Deliverables:**
- ✅ Send, edit, delete messages
- ✅ Real-time subscriptions
- ✅ Read receipts
- ✅ Unread count badges

**Continue to:** [Phase 1.5 Documentation](./phase-1.5-messages-crud.md)

---

### Phase 1.6: Advanced Patterns & Optimization
**Time:** 2-3 hours | [📄 Documentation](./phase-1.6-advanced-patterns.md)

**What You'll Build:**
- Optimistic UI updates
- Infinite scroll pagination
- Denormalization strategies
- N+1 query prevention
- Performance best practices

**Key Deliverables:**
- ✅ Optimistic updates pattern
- ✅ Infinite scroll
- ✅ Batch fetching
- ✅ Performance guidelines

**Continue to:** [Phase 1.6 Documentation](./phase-1.6-advanced-patterns.md)

---

### Phase 1.7: Testing & Validation
**Time:** 3-4 hours | [📄 Documentation](./phase-1.7-testing.md)

**What You'll Build:**
- Unit tests with Vitest
- E2E tests with Playwright
- Seed data for development
- Testing utilities

**Key Deliverables:**
- ✅ Unit test suite
- ✅ E2E test coverage
- ✅ Seed data script
- ✅ Testing checklist

**Continue to:** [Phase 1.7 Documentation](./phase-1.7-testing.md)

---

## Implementation Roadmap

### Week 1: Core Infrastructure (Phases 1.0-1.3)

**Days 1-2: Foundation**
- [ ] Phase 1.0: Database Schema (2-3 hours)
- [ ] Phase 1.1: Authentication (3-4 hours)

**Days 3-4: User & Event Management**
- [ ] Phase 1.2: Users CRUD (2-3 hours)
- [ ] Phase 1.3: Events CRUD (2-3 hours)

**Day 5: Review & Testing**
- [ ] Test authentication flows
- [ ] Test user and event operations
- [ ] Verify permissions

### Week 2: Communication & Polish (Phases 1.4-1.7)

**Days 1-2: Chat Infrastructure**
- [ ] Phase 1.4: Rooms & Participants (2-3 hours)
- [ ] Phase 1.5: Messages & Real-time (3-4 hours)

**Day 3: Optimization**
- [ ] Phase 1.6: Advanced Patterns (2-3 hours)
- [ ] Performance testing
- [ ] Real-time subscription testing

**Days 4-5: Testing & Documentation**
- [ ] Phase 1.7: Testing (3-4 hours)
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Create seed data
- [ ] Final QA

---

## Success Criteria

### Phase 1 is Complete When:

**Authentication & Users ✅**
- [ ] Users can sign up with email/password
- [ ] Users can sign in with Google OAuth
- [ ] Users can update their profile and avatar
- [ ] User roles are enforced
- [ ] Route guards protect authenticated routes

**Events ✅**
- [ ] Coordinators can create events
- [ ] Events auto-create main room
- [ ] Co-coordinators can be added/removed
- [ ] Event statistics display correctly
- [ ] Only coordinators can edit events

**Rooms ✅**
- [ ] Rooms can be created in events
- [ ] Participants can be added/removed
- [ ] Permissions are enforced
- [ ] Users only see their rooms

**Messages ✅**
- [ ] Messages send in real-time
- [ ] Messages can be edited/deleted
- [ ] Read tracking works
- [ ] Unread counts display
- [ ] Pagination loads older messages

**Testing ✅**
- [ ] All unit tests pass
- [ ] E2E tests cover critical flows
- [ ] Seed data creates sample environment
- [ ] No console errors in development

---

## Current Project Structure

```
web/
├── convex/                       # Convex backend (co-located with frontend)
│   ├── _generated/               # Auto-generated Convex types
│   ├── convex.config.ts          # ✅ Better Auth component registered
│   ├── auth.config.ts            # ✅ Better Auth provider config
│   ├── auth.ts                   # ✅ Better Auth instance + getCurrentUser
│   ├── http.ts                   # ✅ HTTP routes for auth endpoints
│   ├── schema.ts                 # ⚠️ Placeholder only (needs full schema)
│   ├── todos.ts                  # Example CRUD (can be removed)
│   │
│   │ # To be implemented:
│   ├── auth-helpers.ts           # ❌ RBAC helpers (not implemented)
│   ├── users.ts                  # ❌ User CRUD (not implemented)
│   ├── events.ts                 # ❌ Event CRUD (not implemented)
│   ├── rooms.ts                  # ❌ Room CRUD (not implemented)
│   ├── messages.ts               # ❌ Message CRUD (not implemented)
│   ├── storage.ts                # ❌ File upload (not implemented)
│   └── seed.ts                   # ❌ Development data (not implemented)
│
└── src/
    ├── lib/
    │   ├── auth.ts               # ✅ Client auth with hooks
    │   ├── auth-server.ts        # ✅ Server auth utilities
    │   ├── utils.ts              # ✅ Utility functions
    │   └── route-guards.ts       # ❌ Route protection (not implemented)
    │
    ├── components/
    │   ├── auth/
    │   │   ├── sign-in-form.tsx  # ✅ Email + Google OAuth
    │   │   ├── sign-up-form.tsx  # ✅ Email + Google OAuth
    │   │   └── user-menu.tsx     # ✅ Dropdown with sign out
    │   ├── ui/                   # ✅ Shadcn UI components
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   └── separator.tsx
    │   └── Header.tsx            # ✅ Header with UserMenu
    │
    ├── integrations/
    │   ├── convex/
    │   │   └── provider.tsx      # ✅ ConvexBetterAuthProvider
    │   └── tanstack-query/
    │       ├── root-provider.tsx
    │       └── devtools.tsx
    │
    ├── routes/
    │   ├── __root.tsx            # ✅ Root with SSR auth context
    │   ├── index.tsx             # ✅ Home page
    │   ├── dashboard.tsx         # ✅ Protected dashboard
    │   ├── auth/
    │   │   ├── sign-in.tsx       # ✅ Sign in page
    │   │   └── sign-up.tsx       # ✅ Sign up page
    │   └── api/auth/$.ts         # ✅ Auth API proxy to Convex
    │
    ├── router.tsx                # ✅ Router configuration
    └── styles.css                # ✅ Global styles (Tailwind)
```

**Legend:**
- ✅ Implemented and working
- ⚠️ Exists but incomplete
- ❌ Not yet implemented

---

## Common Patterns Across All Phases

### Backend Pattern: Authenticated Mutation
```typescript
import { authenticatedMutation } from "./auth-helpers";

export const create = authenticatedMutation(
  async ({ db, user }, args: { /* ... */ }) => {
    // user is automatically available
    // user has been verified as authenticated
    // user includes role information
  }
);
```

### Backend Pattern: Protected Query
```typescript
import { authenticatedQuery } from "./auth-helpers";

export const get = authenticatedQuery(
  async ({ db, user }, args: { /* ... */ }) => {
    // Verify permissions before returning data
  }
);
```

### Frontend Pattern: Real-time Query
```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";

const { data } = useSuspenseQuery(
  convexQuery(api.messages.list, { roomId })
);
// Automatically updates in real-time!
```

### Frontend Pattern: Optimistic Mutation
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onMutate: async (data) => {
    // Cancel queries and show optimistic update
  },
  onError: (err, data, context) => {
    // Rollback on error
  },
});
```

---

## Troubleshooting Guide

### Common Issues

**Issue: "Unauthorized: No authenticated user"**
- Verify session is valid
- Check auth-helpers.ts is imported correctly
- Ensure authenticatedMutation/Query is used

**Issue: "Forbidden: Not a member of this room"**
- Verify user is in roomParticipants table
- Check room access permissions
- Ensure user is part of event

**Issue: Real-time updates not working**
- Verify using `convexQuery()` not regular fetch
- Check Convex dev server is running
- Ensure query is not cached incorrectly

**Issue: N+1 query performance**
- Use batch fetching pattern (see Phase 1.6)
- Check indexes are being used
- Review query patterns

---

## Getting Help

### Documentation References
- **Convex Docs:** https://docs.convex.dev
- **Better Auth Docs:** https://better-auth.com
- **TanStack Query:** https://tanstack.com/query
- **TanStack Router:** https://tanstack.com/router

### Internal References
- [Architecture Overview](../architecure/overview.md)
- [Delphi Scope](../../delphi-scope.md)
- [Main Reference Docs](../reference/)

---

## Next Phase

After completing Phase 1, you'll have a fully functional event planning platform with:
- ✅ User authentication and authorization
- ✅ Event creation and management
- ✅ Real-time chat in rooms
- ✅ Role-based permissions
- ✅ Complete test coverage

**You're ready for Phase 2: Core Features**
- AI-powered task extraction from chat
- Expense tracking and budget management
- Poll creation and voting
- Advanced collaboration features
- Calendar integration

---

## Completion Checklist

Mark each sub-phase as complete:

- [ ] **Phase 1.0:** Database Schema & Foundation ❌ (Not started)
- [x] **Phase 1.1:** Authentication & Authorization ✅ (80% complete - helpers pending)
- [ ] **Phase 1.2:** Users CRUD Operations ❌ (Not started - blocked by 1.0)
- [ ] **Phase 1.3:** Events CRUD Operations ❌ (Not started - blocked by 1.0)
- [ ] **Phase 1.4:** Rooms & Participants CRUD ❌ (Not started - blocked by 1.0)
- [ ] **Phase 1.5:** Messages & Real-time Chat ❌ (Not started - blocked by 1.0)
- [ ] **Phase 1.6:** Advanced Patterns & Optimization ❌ (Not started)
- [ ] **Phase 1.7:** Testing & Validation ❌ (Not started)

**Estimated Total Time:** 18-24 hours
**Timeline:** 2 weeks (part-time) or 1 week (full-time)

**Current Progress:** ~5% (core auth working)
**Next Priority:** Complete Phase 1.0 (Database Schema) to unblock remaining phases

---

**Happy Building! 🚀**

When ready, proceed to: [Phase 1.0: Database Schema & Foundation](./phase-1.0-database-schema.md)
