# Phase 2: Chat Foundation - Implementation Overview

> **Status:** Phase 2 - Real-Time Messaging Infrastructure
> **Last Updated:** October 31, 2025
> **Duration:** 3-5 weeks
> **Prerequisites:** Phase 1 Complete (Database Schema, Auth, Basic CRUD)

---

## Introduction

Phase 2 transforms your application from a static event manager into a **real-time collaborative platform** with production-ready chat capabilities. This phase is broken down into 8 focused sub-phases, each building upon the previous one.

### Why Phase 2 Matters

- **Foundation for AI Features:** Phase 3's AI capabilities need chat data to analyze
- **Core Product Value:** Chat is where teams coordinate and collaborate
- **Technical Infrastructure:** Real-time patterns used across the app
- **User Engagement:** Active discussions drive retention

### What You'll Build

By the end of Phase 2, you'll have:
- ✅ Real-time messaging with 200-500ms latency
- ✅ Multi-room navigation with unread tracking
- ✅ Rich messaging (@mentions, reactions, editing)
- ✅ Image uploads and media sharing
- ✅ Participant management and permissions
- ✅ Full-text message search
- ✅ Production-ready with rate limiting and monitoring

---

## Implementation Roadmap

Phase 2 is divided into **7 focused sub-phases** that build upon each other. Each phase should be completed and tested before moving to the next.

### 📊 Phase Breakdown

```
Phase 2.0 ──▶ Phase 2.1 ──▶ Phase 2.2 ──▶ Phase 2.3
   (1 week)     (3-4 days)    (3-4 days)    (4-5 days)
      │              │             │             │
      ▼              ▼             ▼             ▼
  Foundation    Pagination    Multi-Room    Rich Features
      │              │             │             │
      └──────────────┴─────────────┴─────────────┘
                          │
                          ▼
            Phase 2.4 ──▶ Phase 2.5 ──▶ Phase 2.6 ──▶ Phase 2.7
            (3-4 days)    (3-4 days)    (2-3 days)    (2-3 days)
                │             │             │             │
                ▼             ▼             ▼             ▼
            Media      Collaboration   Search      Production
```

---

## Sub-Phase Guides

### **[Phase 2.0: Real-Time Messaging Foundation](./phase-2.0-messaging-foundation.md)**
**Duration:** 1 week | **Priority:** Critical

Build the core send/receive functionality with Convex real-time subscriptions.

**What You'll Build:**
- Send messages with real-time delivery
- Receive messages via subscriptions (no polling!)
- Optimistic UI updates for instant feedback
- Auto-scrolling message list
- Basic message display with author info

**Why Start Here:**
- Foundation for all other features
- Tests your Convex setup
- Validates real-time architecture

**Success Criteria:**
- ✅ Can send messages that appear instantly
- ✅ Messages sync across browser tabs
- ✅ Auto-scroll works correctly
- ✅ Error handling works (network disconnect test)

---

### **[Phase 2.1: Message History & Pagination](./phase-2.1-message-history-pagination.md)**
**Duration:** 3-4 days | **Priority:** High

Add efficient message history loading and performance optimizations.

**What You'll Build:**
- "Load More" button for older messages
- Infinite scroll pagination
- Virtual scrolling for 1000+ messages
- Smooth scroll position management

**Why This Matters:**
- Performance at scale
- Support for long conversations
- Better user experience

**Success Criteria:**
- ✅ Can load older messages smoothly
- ✅ Scroll position maintained when loading more
- ✅ Virtual scrolling works for 1000+ messages
- ✅ No performance issues or lag

---

### **[Phase 2.2: Room Management & Navigation](./phase-2.2-room-management.md)**
**Duration:** 3-4 days | **Priority:** High

Transform single-room chat into multi-room application with navigation.

**What You'll Build:**
- Room list sidebar with live updates
- Unread count badges per room
- Room switching with state management
- Room header with metadata
- Mark messages as read

**Why This Matters:**
- Organize conversations by topic
- Track unread messages
- Essential for multi-event support

**Success Criteria:**
- ✅ Can switch between multiple rooms
- ✅ Unread counts display correctly
- ✅ Room list sorted properly
- ✅ URL persists room selection

---

### **[Phase 2.3: Rich Messaging Features](./phase-2.3-rich-messaging.md)**
**Duration:** 4-5 days | **Priority:** Medium-High

Add interactive features that make conversations engaging.

**What You'll Build:**
- @Mentions with autocomplete dropdown
- Emoji reactions on messages
- Message editing with history
- Message deletion (soft delete)
- Notification on mentions

**Why This Matters:**
- Professional chat experience
- Essential collaboration features
- Increases engagement

**Success Criteria:**
- ✅ @Mentions work with autocomplete
- ✅ Reactions add/remove correctly
- ✅ Message editing works with time limit
- ✅ All features work in real-time across clients

---

### **[Phase 2.4: Media & Attachments](./phase-2.4-media-attachments.md)**
**Duration:** 3-4 days | **Priority:** Medium

Enable sharing of images and files using Convex storage.

**What You'll Build:**
- Image upload to Convex storage
- Image preview in messages
- File size validation (5MB limit)
- Drag & drop upload

**Why This Matters:**
- Rich media sharing
- Visual communication
- Event photos and documents

**Success Criteria:**
- ✅ Can upload images up to 5MB
- ✅ Images display inline in messages
- ✅ File size validation works
- ✅ Images load from CDN

---

### **[Phase 2.5: Multi-User Collaboration](./phase-2.5-multi-user-collaboration.md)**
**Duration:** 3-4 days | **Priority:** Medium

Enable team management and permissions.

**What You'll Build:**
- Invite users to events
- Participant list UI
- Role-based permissions
- Remove participants
- Add users to specific rooms

**Why This Matters:**
- Team collaboration
- Access control
- Scalable to large events

**Success Criteria:**
- ✅ Can invite users by email
- ✅ Role selection works (collaborator vs guest)
- ✅ Permissions enforced correctly
- ✅ Real-time updates when participants added/removed

---

### **[Phase 2.6: Search & Discovery](./phase-2.6-search-discovery.md)**
**Duration:** 2-3 days | **Priority:** Medium-Low

Add powerful search to find messages quickly.

**What You'll Build:**
- Full-text message search
- Search within specific rooms
- Jump to message from search results
- Search highlighting

**Why This Matters:**
- Find important information quickly
- Navigate large chat histories
- Improved UX for power users

**Success Criteria:**
- ✅ Can search messages in room
- ✅ Results highlight search terms
- ✅ Click result jumps to message
- ✅ Search is fast (<200ms)

---

### **[Phase 2.7: Production Readiness & Testing](./phase-2.7-production-readiness.md)**
**Duration:** 2-3 days | **Priority:** Critical

Harden application for production deployment.

**What You'll Build:**
- Rate limiting for message sending
- Error handling and recovery
- Connection status indicators
- Performance monitoring
- Comprehensive testing suite

**Why This Matters:**
- Production stability
- Security and abuse prevention
- Monitoring and debugging
- Quality assurance

**Success Criteria:**
- ✅ Rate limiting prevents spam
- ✅ Error boundaries catch failures
- ✅ Connection status displays correctly
- ✅ All tests passing
- ✅ Production deployment successful

---

## Development Approach

### Sequential Implementation

**⚠️ Important:** Complete each phase in order. Each phase builds upon the previous one.

```
DO THIS:
Phase 2.0 (complete) → Phase 2.1 (complete) → Phase 2.2 (complete) → ...

DON'T DO THIS:
Phase 2.0 (50%) + Phase 2.3 (25%) + Phase 2.5 (10%) = Broken app
```

### Testing Strategy

After each phase:
1. ✅ Manual testing checklist (in each phase doc)
2. ✅ Write unit tests for new backend functions
3. ✅ Add E2E tests for critical flows
4. ✅ Test across multiple browsers
5. ✅ Test real-time sync with multiple users

### Git Workflow

Recommended branch strategy:
```
main
└── phase-2
    ├── phase-2.0-messaging-foundation
    ├── phase-2.1-history-pagination
    ├── phase-2.2-room-management
    ├── phase-2.3-rich-messaging
    ├── phase-2.4-media-attachments
    ├── phase-2.5-collaboration
    ├── phase-2.6-search
    └── phase-2.7-production
```

Merge to `phase-2` after each sub-phase is complete and tested.

---

## Technical Architecture

### Real-Time Stack

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)           │
│  ┌─────────────────────────────────────┐  │
│  │   TanStack Router + React Query     │  │
│  │   @convex-dev/react-query           │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ▼
         WebSocket Connection
                    ▼
┌─────────────────────────────────────────────┐
│              Convex Backend                 │
│  ┌─────────────────────────────────────┐  │
│  │  Mutations (insert, update, delete) │  │
│  │  Queries (subscribe, search)        │  │
│  │  Real-time Push Updates             │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│           Convex Database + CDN             │
│  - Messages, Rooms, Participants            │
│  - File Storage (images, attachments)       │
│  - Search Indexes                           │
└─────────────────────────────────────────────┘
```

### Key Patterns

1. **Optimistic Updates**
   - Update UI immediately
   - Send to server in background
   - Rollback on error

2. **Real-Time Subscriptions**
   - Use `convexQuery` with `useSuspenseQuery`
   - Automatic updates when data changes
   - No manual polling or refetching

3. **Pagination**
   - Load latest 50 messages by default
   - Load older messages on demand
   - Virtual scrolling for 1000+ messages

4. **Permission Checks**
   - Every mutation verifies permissions
   - Room membership required
   - Role-based access control

---

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Message send latency | < 300ms | < 1s |
| Real-time update latency | < 500ms | < 2s |
| Initial load time | < 1s | < 3s |
| Search response time | < 200ms | < 1s |
| Concurrent users | 100+ | 50+ |

---

## Common Pitfalls to Avoid

### ❌ Don't Skip Testing
**Problem:** Moving to next phase before current one works
**Solution:** Complete manual testing checklist for each phase

### ❌ Don't Over-Engineer
**Problem:** Adding features not in the current phase
**Solution:** Follow the phase docs strictly, add extras later

### ❌ Don't Ignore Performance
**Problem:** Loading all messages at once
**Solution:** Implement pagination and virtual scrolling

### ❌ Don't Forget Security
**Problem:** Missing permission checks
**Solution:** Use `authenticatedMutation` and verify membership

### ❌ Don't Skip Error Handling
**Problem:** No retry logic or error boundaries
**Solution:** Add error boundaries and connection status

---

## Phase 2 Completion Checklist

Before moving to Phase 3, verify:

### Core Functionality
- [ ] Can send/receive messages in real-time
- [ ] Multiple rooms with navigation working
- [ ] Unread counts accurate
- [ ] @Mentions and reactions working
- [ ] Image uploads functional
- [ ] Search returns relevant results

### Performance
- [ ] Initial load < 1s
- [ ] Message send latency < 500ms
- [ ] Smooth scrolling with 1000+ messages
- [ ] No memory leaks

### Production Readiness
- [ ] Rate limiting enabled
- [ ] Error boundaries in place
- [ ] Connection status indicator working
- [ ] Tests passing (unit + E2E)
- [ ] Deployed to production
- [ ] Monitoring active

### User Experience
- [ ] Intuitive navigation
- [ ] Clear visual feedback
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation)

---

## Getting Help

### Debugging Real-Time Issues

1. **Messages not syncing?**
   - Check browser console for errors
   - Verify `convexQuery` usage (not regular `useQuery`)
   - Check Convex dashboard for connection status

2. **Slow performance?**
   - Review database indexes
   - Implement virtual scrolling
   - Check for unnecessary re-renders

3. **Permission errors?**
   - Verify room membership
   - Check `requireCanPostInRoom` logic
   - Review `roomParticipants` table

### Resources

- **Convex Docs:** https://docs.convex.dev
- **React Query Docs:** https://tanstack.com/query/latest
- **Phase 2 Implementation Docs:** See individual phase files

---

## Next Steps

### Ready to Start?

1. **Read Phase 2.0:** [Real-Time Messaging Foundation](./phase-2.0-messaging-foundation.md)
2. **Set up environment:** Ensure Convex deployment is configured
3. **Create feature branch:** `git checkout -b phase-2.0-messaging-foundation`
4. **Start coding:** Follow the implementation guide step-by-step

### After Phase 2?

Once Phase 2 is complete, you'll move to:
- **Phase 3:** AI Features (pattern detection, task creation, expense tracking)
- **Phase 4:** Advanced Real-Time (presence indicators, typing indicators via Durable Objects)
- **Phase 5:** Polish & Scale (performance optimization, advanced features)

---

## Quick Start Commands

```bash
# Start development server
cd mono
bun dev

# Deploy schema to Convex
npx convex deploy

# Run tests
bun test

# Build for production
bun build
```

---

**Ready to build real-time chat? Start with [Phase 2.0: Real-Time Messaging Foundation](./phase-2.0-messaging-foundation.md)!** 🚀
