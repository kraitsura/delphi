# Delphi: AI-Assisted Event Planning Platform
## Project Scope & Vision Document

> **Last Updated:** October 31, 2025
> **Document Version:** 1.0
> **Status:** Active Development

---

## Executive Summary

**Delphi** is a next-generation event planning application that fundamentally reimagines how groups coordinate complex events. By embedding an intelligent AI assistant within a natural group chat interface, Delphi eliminates the friction between conversation and coordination—allowing teams to plan weddings, corporate events, parties, and destination celebrations through natural dialogue rather than forms, spreadsheets, and dashboards.

### The Core Innovation

Traditional event planning tools force users to context-switch between communication platforms (iMessage, Slack, email) and task management systems (spreadsheets, project trackers). Delphi solves this by making **chat the primary interface**, where all structured data—tasks, budgets, decisions, timelines—emerges organically from conversation through intelligent AI pattern detection and enrichment.

### Key Differentiators

1. **Conversational Intelligence** - Natural language transforms into structured event plans automatically
2. **Multi-Agent AI System** - Specialized AI agents for tasks, budgets, decisions, and vendor coordination
3. **Real-Time Multiplayer** - True collaborative planning with instant synchronization across all participants
4. **Context-Aware UI** - Dynamic panels and controls appear based on conversation topics
5. **Predictive Guidance** - AI learns from millions of events to provide proactive suggestions
6. **Zero Infrastructure Overhead** - Fully serverless architecture on modern edge computing platform

---

## Vision & Strategic Goals

### Primary Mission

**Democratize sophisticated event planning** by making complex coordination accessible to any group, regardless of project management expertise or organizational skills.

### Target Outcomes

1. **Eliminate Planning Friction** - Reduce time spent on coordination overhead by 70%
2. **Improve Budget Accuracy** - Help users stay within 5% of planned budget
3. **Accelerate Decision-Making** - Enable groups to reach consensus 3x faster through structured polls and synthesis
4. **Reduce Stress** - Proactive timeline management prevents last-minute scrambles
5. **Enhance Collaboration** - Enable distributed teams to coordinate seamlessly across time zones

### Market Positioning

**Primary Target:** Wedding planning (12-month cycles, $30K-50K budgets, 100-200 guests)
**Secondary Markets:** Corporate events, milestone celebrations, destination travel coordination
**Competitive Advantage:** Only chat-native platform with embedded multi-agent AI

---

## User Personas & Scenarios

### 1. Event Coordinators (Primary Planners)

**Profile:** The person ultimately responsible for event success (bride/groom, corporate event manager, party host)

**Needs:**
- Visibility into all moving parts without manual tracking
- Confidence that nothing falls through cracks
- Ability to delegate tasks while maintaining oversight
- Budget control with spending transparency
- Timeline management that adapts to delays

**Pain Points Delphi Solves:**
- Scattered communication across text/email/calls
- Manual task list maintenance in spreadsheets
- Uncertainty about vendor quality and pricing
- Difficulty tracking who committed to what
- Last-minute surprises from poor timeline planning

### 2. Collaborators (Co-Planners)

**Profile:** Friends, family, wedding party members assisting with planning

**Needs:**
- Clear understanding of their responsibilities
- Context about decisions made when they weren't present
- Ability to contribute ideas without overwhelming coordinator
- Transparency into budget constraints
- Recognition for their contributions

**Pain Points Delphi Solves:**
- Unclear task ownership ("I thought you were handling that")
- Decision fatigue from endless group text debates
- Feeling out of the loop on key discussions
- Awkwardness around money/budget discussions

### 3. Guests (Event Attendees)

**Profile:** Invitees who need basic event information

**Needs:**
- Event date, time, location, dress code
- RSVP mechanism
- Accommodation/travel information
- Gift registry or preferences
- Updates if plans change

**Pain Points Delphi Solves:**
- Fragmented information across multiple messages
- Missing RSVP deadlines
- Uncertainty about event details
- No single source of truth

### 4. Vendors (Service Providers)

**Profile:** Photographers, caterers, florists, venues, DJs, etc.

**Needs:**
- Clear scope and requirements
- Timeline for deliverables
- Payment schedule visibility
- Direct communication channel
- Contract and file sharing

**Pain Points Delphi Solves:**
- Slow email response times
- Confusion about requirements
- Payment delays from poor tracking
- Lost files and contracts

---

## Core Architecture

### Technology Stack Philosophy

Delphi is built on a **modern, serverless-first architecture** that prioritizes:
- **Developer Velocity** - Ship features fast with type safety and great DX
- **Cost Efficiency** - Pay only for actual usage, no idle server costs
- **Performance** - Edge computing for sub-100ms response times globally
- **Scalability** - Automatic scaling from 10 to 10,000 concurrent events
- **Real-Time Sync** - No polling or manual cache invalidation

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend Layer                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TanStack Start (React 19 + TypeScript)                     │ │
│  │  • Type-safe routing with TanStack Router                   │ │
│  │  • Real-time subscriptions via TanStack Query + Convex      │ │
│  │  • Selective SSR (full/data-only/client-only rendering)     │ │
│  │  • Streaming UI for progressive content delivery            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Pattern Detection Engine                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Cloudflare Workers (Edge Computing)                        │ │
│  │  • Regex-based message analysis (< 5ms per message)         │ │
│  │  • Intent classification (task, expense, poll, calendar)    │ │
│  │  • Entity extraction (dates, people, money, vendors)        │ │
│  │  • Confidence scoring for AI trigger decisions              │ │
│  │  • 90% message filtering before AI (cost optimization)      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              AI Agent Orchestration Layer                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Convex Backend Functions                                   │ │
│  │  • Routes to specialized agents based on detected intent    │ │
│  │  • Assembles contextual information (4 levels)              │ │
│  │  • Manages agent collaboration & response merging           │ │
│  │  • Queues AI requests with priority handling                │ │
│  │  • Streams responses to frontend in real-time               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
        ┌─────────────────────────────────────────────┐
        │         Specialized AI Agents                │
        │  ┌───────────────────────────────────────┐  │
        │  │  Claude API (claude-sonnet-4)         │  │
        │  │                                        │  │
        │  │  1. Task Enricher Agent                │  │
        │  │     • Converts commitments → tasks     │  │
        │  │     • Estimates costs & timelines      │  │
        │  │     • Suggests vendors & next steps    │  │
        │  │                                        │  │
        │  │  2. Promise Manager Agent              │  │
        │  │     • Tracks expense commitments       │  │
        │  │     • Monitors payment fulfillment     │  │
        │  │     • Sends reminders                  │  │
        │  │                                        │  │
        │  │  3. Budget Analyst Agent               │  │
        │  │     • Spending analysis & forecasts    │  │
        │  │     • Fair split calculations          │  │
        │  │     • Cost optimization suggestions    │  │
        │  │                                        │  │
        │  │  4. Planning Advisor Agent             │  │
        │  │     • Strategic guidance               │  │
        │  │     • Bottleneck detection             │  │
        │  │     • Timeline recommendations         │  │
        │  │                                        │  │
        │  │  5. Dependency Analyzer Agent          │  │
        │  │     • Task relationship mapping        │  │
        │  │     • Critical path identification     │  │
        │  │     • Scheduling optimization          │  │
        │  └───────────────────────────────────────┘  │
        └─────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Data & Storage Layer                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Convex Database (Serverless Reactive DB)                   │ │
│  │  • Real-time push updates to all clients                    │ │
│  │  • ACID transactions with strong consistency                │ │
│  │  • Automatic TypeScript type generation                     │ │
│  │  • 4-level context assembly for AI agents                   │ │
│  │                                                             │ │
│  │  Cloudflare R2 (Object Storage)                             │ │
│  │  • Zero egress fees for file storage                        │ │
│  │  • Presigned URLs for direct uploads                        │ │
│  │  • Receipt images, contracts, vendor materials              │ │
│  │                                                             │ │
│  │  Cloudflare Vectorize (Vector Database)                     │ │
│  │  • 768-dimensional embeddings via Workers AI                │ │
│  │  • Semantic search for vendor/task discovery                │ │
│  │  • Sub-100ms queries with metadata filtering                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              Real-Time Coordination Layer                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Cloudflare Durable Objects                                 │ │
│  │  • Stateful WebSocket connections per event                 │ │
│  │  • Presence indicators (who's online)                       │ │
│  │  • Live typing indicators                                   │ │
│  │  • Connection hibernation for cost efficiency               │ │
│  │  • SQLite-backed persistent storage                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack Components

#### Frontend Framework: TanStack Start (Beta)

**Rationale:**
- **Full-Stack Type Safety** - End-to-end TypeScript from UI to database
- **Selective SSR** - Choose per-route whether to render on server, stream data, or client-only
- **Server Functions** - Seamless RPC calls without manual API endpoint wiring
- **Modern React** - Built on React 19+ with improved performance
- **Streaming Support** - Progressive content delivery for AI responses

**Alternatives Considered:**
- Next.js 15 (too opinionated, vendor lock-in concerns)
- Remix (less flexible SSR strategies)
- Create React App (no SSR, outdated patterns)

#### Database & Backend: Convex

**Rationale:**
- **Real-Time by Default** - Automatic push updates to clients (no polling)
- **ACID Transactions** - Strong consistency guarantees for concurrent updates
- **Type Generation** - Automatic TypeScript types for all database operations
- **Serverless** - Zero infrastructure management, scales automatically
- **AI-Friendly** - Structured schema perfect for context assembly

**Alternatives Considered:**
- Firebase (limited query flexibility, vendor lock-in)
- Supabase (PostgreSQL good but lacks real-time elegance)
- Traditional REST API + PostgreSQL (too much infrastructure overhead)

#### Edge Computing: Cloudflare Workers

**Rationale:**
- **Global Distribution** - Code runs close to users worldwide (< 50ms latency)
- **Pattern Detection** - Pre-filter messages before expensive AI calls
- **Scheduled Jobs** - Cron-like workers for background processing
- **Durable Objects** - Stateful WebSocket coordination
- **Cost Efficient** - Pay per request, not per server

#### AI Provider: Claude API (Anthropic)

**Rationale:**
- **Best-in-Class Reasoning** - Superior understanding of nuanced planning conversations
- **Long Context Windows** - 200K tokens enables rich context assembly
- **JSON Mode** - Structured outputs for task creation, budget analysis
- **Streaming** - Progressive response delivery for better UX
- **Safety** - Strong alignment for user-facing applications

**Alternatives Considered:**
- GPT-4 (good but Claude better at following complex instructions)
- Open-source models (Llama, Mistral) - insufficient reasoning quality

#### Vector Search: Cloudflare Vectorize + Workers AI

**Rationale:**
- **Integrated Ecosystem** - Seamless integration with Workers
- **Free Tier** - 100M vector dimensions included
- **Edge Embeddings** - Workers AI generates embeddings on edge network
- **Low Latency** - Sub-100ms semantic search queries
- **Cost Effective** - ~$0.01 per 1K embeddings

#### Object Storage: Cloudflare R2

**Rationale:**
- **Zero Egress Fees** - Massive cost savings vs AWS S3
- **S3 Compatible** - Easy migration if needed
- **Presigned URLs** - Secure direct uploads from clients
- **Global Distribution** - Integrated with Cloudflare CDN

#### Web Scraping: Firecrawl

**Rationale:**
- **LLM-Ready Output** - Extracts clean markdown from vendor websites
- **JavaScript Rendering** - Handles modern SPAs
- **Anti-Bot Bypass** - Circumvents common scraping protections
- **Rate Limit Handling** - Automatic retries and backoff

#### Monorepo Management: Turborepo + Bun

**Rationale:**
- **Turborepo** - Intelligent caching and parallel task execution
- **Bun** - 2-3x faster than npm/yarn, excellent TypeScript support
- **Shared Packages** - Type-safe code sharing between apps

**Monorepo Structure:**
```
mono/
├── apps/
│   ├── web/              # TanStack Start frontend
│   ├── backend/          # Convex backend functions
│   └── workers/          # Cloudflare Workers
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components
│   └── utils/            # Shared utility functions
└── docs/                 # Architecture & reference docs
```

---

## Feature Specification

### Feature Design Philosophy

Every feature in Delphi adheres to core principles:

1. **Chat-First** - Primary interaction is conversational
2. **Structured-Second** - Data emerges from conversation, not forms
3. **Proactive, Not Reactive** - AI anticipates needs before user asks
4. **Multiplayer-Native** - Every feature considers all user roles
5. **Progressive Disclosure** - Complexity appears only when needed

### 14 Core Features

---

#### 1. Smart Task Creation

**User Experience:**
User types in chat: "We should book a photographer by March"

AI detects task intent → Offers inline quick action: **[Create Task]**

User taps button → AI creates enriched task:
- **Title:** "Book Wedding Photographer"
- **Due Date:** March 15, 2026 (inferred)
- **Category:** Photography
- **Estimated Cost:** $2,500 - $4,000 (industry average)
- **Time Estimate:** 2-3 hours (research + booking)
- **Dependencies:** Venue must be booked first (detected from conversation history)
- **Vendor Suggestions:** 3-5 local photographers with ratings
- **Next Steps:** "Create shot list, schedule engagement session, review portfolios"
- **Tips:** "Book 12 months ahead for summer weddings, ask about second shooter"

**AI Agent:** Task Enricher Agent

**Context Requirements:** Standard (recent messages, event date, budget, existing tasks)

**Technical Implementation:**
1. Pattern Detection Engine identifies task-related keywords ("should book", "need to", "must hire")
2. Extracts entities: action (book), object (photographer), deadline (March)
3. Confidence score > 0.7 → Trigger Task Enricher Agent
4. Agent assembles context: event type, date, budget, existing tasks, typical timelines
5. Claude API call with structured JSON output schema
6. Response validation against schema
7. Task stored in Convex with real-time sync to all clients
8. Quick action buttons appear in chat for user confirmation

**Success Metrics:**
- Task creation time: < 10 seconds from mention to created task
- Enrichment accuracy: 90%+ useful suggestions
- User acceptance rate: 80%+ (users keep AI-created tasks vs deleting)

---

#### 2. Vendor Suggestions & AI Enrichment

**User Experience:**
Task created → AI automatically populates "Vendors" section with 3-5 recommendations

Each vendor card shows:
- Business name + rating (4.5/5 from 127 reviews)
- Price range: $$ (relative indicator)
- Specialties: "Natural light portraits, candid moments"
- Availability: "Likely available" (based on typical booking lead times)
- Website link + Instagram
- Quick actions: **[Contact]** **[Save]** **[Pass]**

User taps **[Contact]** → Pre-filled inquiry form with event details

**AI Agent:** Task Enricher Agent + Firecrawl

**Context Requirements:** Minimal (task type, event location, event date, budget)

**Technical Implementation:**
1. Task Enricher Agent identifies vendor type from task (photographer, caterer, etc)
2. Vector search in Vectorize for vendors matching:
   - Geographic proximity to event location
   - Specialty match (wedding photographer vs portrait photographer)
   - Price range alignment with event budget
3. If insufficient vendors in database:
   - Firecrawl scrapes The Knot, WeddingWire, Yelp
   - Extracts: name, contact, pricing, reviews, specialties
   - Workers AI generates embeddings
   - Stores in Vectorize for future queries
4. AI generates vendor-specific guidance:
   - "Questions to ask photographers"
   - "Red flags in photography contracts"
   - "Typical deposit: 25-50%"
5. Real-time sync to task view

**Success Metrics:**
- Vendor relevance score: 85%+ users find at least 1 viable vendor
- Inquiry conversion: 30%+ users contact suggested vendors
- Booking rate: 15%+ users book suggested vendor

---

#### 3. Smart Interactive Inline Polls

**User Experience:**
User types: "Should we do buffet or plated dinner?"

AI detects poll intent → Offers quick action: **[Create Poll]**

User taps → Inline poll appears in chat:
```
📊 Catering Style Decision
○ Buffet ($15/person)
○ Plated Dinner ($28/person)

Votes: 0/8 collaborators
Deadline: 48 hours
```

As collaborators vote, counts update in real-time

After deadline, AI summarizes:
```
✅ Poll Closed: Plated Dinner (5 votes vs 3)

Budget Impact: +$1,300 (100 guests)
Next Steps: Contact caterers for plated menu options
```

**Poll Types:**
- Simple choice (this or that)
- Multiple choice (select all that apply)
- Ranked preference (drag to order)
- Rating scale (1-5 stars)
- Budget allocation (percentage splits)

**AI Agent:** Planning Advisor Agent

**Context Requirements:** Minimal (participants, event budget)

**Technical Implementation:**
1. Pattern Detection identifies question patterns ("should we", "which is better", "thoughts on")
2. Extracts options from message or prompts user to specify
3. AI enriches each option:
   - Cost implications
   - Timeline impact
   - Pros/cons
4. Creates poll document in Convex
5. Real-time subscription pushes updates as votes come in
6. After deadline or unanimous vote, Planning Advisor synthesizes outcome
7. Automatically updates related tasks/budget based on result

**Success Metrics:**
- Poll creation rate: 80%+ of ambiguous questions convert to polls
- Participation rate: 90%+ collaborators vote
- Decision speed: 3x faster than unstructured debate

---

#### 4. Expense Tracker & Smart Split

**User Experience:**
User types: "$500 venue deposit paid by Sarah"

AI detects expense → Creates entry automatically:
```
💰 Expense Added
Venue Deposit: $500
Paid by: Sarah
Category: Venue (auto-detected)
Date: Oct 31, 2025

Budget: $5,500 / $40,000 (14%)
```

Dashboard shows visual budget breakdown:
- Pie chart by category (venue 40%, catering 25%, photography 15%, etc)
- Spending timeline (monthly burn rate)
- Forecast to completion: "On track to spend $42,300 (5% over budget)"
- Top spending categories

**Smart Split Options:**
1. **Even Split** - Divide equally among all collaborators
2. **Proportional Split** - Based on income or preference (35/35/30)
3. **Role-Based Split** - Coordinator covers deposits, guests split rest
4. **Custom** - Manual per-person amounts

Payment tracking:
```
Venue Deposit ($500)
✅ Sarah: $500 (paid Nov 1)
⏳ John: $0 (owes $250)
⏳ Mike: $0 (owes $250)

[Send Reminder]
```

**AI Agent:** Budget Analyst Agent

**Context Requirements:** Standard (all expenses, event budget, participants, roles)

**Technical Implementation:**
1. Pattern Detection identifies monetary values + context ("$500 for venue", "paid $1200 deposit")
2. Extracts: amount, category, payer, payee
3. Budget Analyst Agent categorizes expense
4. Convex transaction updates:
   - Expense record
   - Budget totals
   - Payment obligations
5. Real-time sync updates dashboard
6. AI generates forecast using linear regression on spending trajectory

**Success Metrics:**
- Expense capture rate: 95%+ expenses logged
- Budget accuracy: 90%+ events within 10% of planned budget
- Payment completion: 80%+ obligations settled by event date

---

#### 5. Contextual Reply System

**User Experience:**
AI sends message: "I found 5 highly-rated photographers in your area. Would you like to see them?"

Instead of typing, user sees contextual buttons:
**[Show All]** **[Top 3 Only]** **[Set Price Filter]** **[Maybe Later]**

User taps **[Top 3 Only]** → AI immediately responds with vendor cards

When user types "$" in chat:
→ Input box transforms to inline expense form with fields: Amount, Category, Payer

When user types "@":
→ Autocomplete shows all collaborators for mentions/assignments

When discussing dates:
→ Inline calendar picker appears below input

**Context Triggers:**
- Vendor suggestions → Browsing controls
- Budget questions → Expense entry form
- Task mentions → Task creation shortcuts
- Dates → Calendar picker
- Polls → Vote buttons
- Decisions → Confirmation actions

**Technical Implementation:**
1. Frontend maintains conversation context state
2. AI response includes metadata: `"contextActions": ["show_vendors", "filter_price", "dismiss"]`
3. React components render appropriate button chips based on metadata
4. Actions trigger server functions with context pre-filled
5. No round-trip to AI needed for simple actions

**Success Metrics:**
- Action button usage: 60%+ interactions use contextual actions vs typing
- Task completion speed: 40% faster with contextual shortcuts

---

#### 6. Fluid On-Demand Dashboard UI

**User Experience:**

**Base State:**
Chat interface with minimal sidebar showing:
- Days until event: **237 days**
- Budget: **$5,500 / $40,000** (14%)
- Tasks: **12 / 47** complete (26%)
- RSVPs: **23 / 150** confirmed (15%)

**Dynamic Behavior:**

Conversation shifts to budget → Budget panel slides in from right:
```
┌─────────────────────────┐
│ Budget Breakdown        │
├─────────────────────────┤
│ 🏛️ Venue       $12,000  │
│ 🍽️ Catering     $8,000  │
│ 📸 Photography  $3,500  │
│ ...                     │
│                         │
│ [Add Expense] [Export]  │
└─────────────────────────┘
```

Conversation shifts to venue → Map panel appears showing venue locations with ratings

Conversation shifts to tasks → Kanban board overlay slides in:
```
┌──────────────────────────────────────┐
│ To Do │ In Progress │ Blocked │ Done │
├───────┼─────────────┼─────────┼──────┤
│ ...   │    ...      │   ...   │ ...  │
└──────────────────────────────────────┘
```

Conversation shifts back to general topic → Panels auto-collapse

Users can **pin** frequently used panels to keep them visible

**Magic Keywords:**
Type "budget" → Budget panel expands
Type "tasks" → Task board appears
Type "timeline" → Gantt chart displays
Type "guests" → RSVP tracker shows

**Technical Implementation:**
1. AI responses include metadata: `"relevantPanels": ["budget", "expenses"]`
2. Frontend maintains panel visibility state
3. CSS transitions handle smooth slide-in/out
4. Panel content uses Convex subscriptions for live data
5. User preferences stored for pinned panels

**Success Metrics:**
- Panel engagement: 70%+ users interact with dynamic panels
- Context switching: 50% reduction in navigation clicks

---

#### 7. Integrated Calendar & Reminders

**User Experience:**
User types: "Schedule venue tour next Saturday at 2pm"

AI creates calendar event:
```
📅 Event Added to Calendar
Venue Tour - The Grand Estate
📍 123 Main St, San Francisco
⏰ Saturday, Nov 9, 2025 at 2:00 PM

Attendees: Sarah, John (coordinators)
Reminders: 1 week, 1 day, 1 hour before

[Add to Google Cal] [Add to Apple Cal]
```

**Automatic Reminders:**
1 week before: "Reminder: Venue tour in 7 days. Have questions ready?"
1 day before: "Tomorrow at 2pm: Venue tour. Address: 123 Main St"
1 hour before: "Venue tour starts in 1 hour. Travel time: 15 min from your location"

**Critical Path Alerts:**
"⚠️ Photographer booking is overdue by 5 days. This delays engagement session (depends on photographer)"

**AI Scheduling Assistant:**
User: "When can we all meet to taste cakes?"

AI: "Looking at everyone's calendars... Available slots:
- Thursday Nov 7, 6-8pm ✅ All 4 free
- Saturday Nov 9, 2-4pm ❌ John busy
- Sunday Nov 10, 11am-1pm ✅ All 4 free

[Schedule Thursday] [Schedule Sunday] [Show More Options]"

**Technical Implementation:**
1. Pattern Detection identifies temporal phrases + actions ("schedule", "book appointment", "remind me")
2. Extracts: event type, date/time, location, attendees
3. Planning Advisor Agent enriches:
   - Suggested duration
   - Preparation checklist
   - Related tasks
4. Stores in Convex with reminder jobs scheduled
5. Cloudflare Workers cron triggers reminders
6. Calendar sync via iCal export or API integration

**Success Metrics:**
- Event capture rate: 90%+ calendar-worthy mentions converted
- Reminder effectiveness: 95%+ users attend scheduled events
- No-show reduction: 60% vs no reminder system

---

#### 8. Master Plan View

**User Experience:**

User types "show master plan" or taps pinned Master Plan button

Full-page view appears with comprehensive event overview:

```
╔══════════════════════════════════════════════════════════════╗
║                    Master Plan: Sarah & John's Wedding        ║
║                    June 14, 2026 • 237 days remaining         ║
╚══════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────┐
│ AI Roadmap                                                      │
├────────────────────────────────────────────────────────────────┤
│ ⚡ NEXT STEPS (Do This Week)                                   │
│   1. Book photographer (3 vendors shortlisted)                 │
│   2. Finalize guest list for save-the-dates                    │
│   3. Schedule cake tasting (coordinator availability found)    │
│                                                                │
│ 🚨 URGENT (Overdue or Time-Sensitive)                          │
│   1. Venue deposit due Nov 5 ($2,000)                          │
│   2. Dress alterations appointment needed ASAP                 │
│                                                                │
│ ⏸️ BLOCKED (Waiting on Dependencies)                            │
│   1. Invitations design (waiting on engagement photo)          │
│   2. Menu selection (waiting on caterer quotes)                │
│                                                                │
│ 📅 UPCOMING (Next 2 Weeks)                                     │
│   1. Send save-the-dates (ready after guest list finalized)   │
│   2. Book hotel room block (waiting on venue confirmation)     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 👥 People & Roles (12 collaborators)                           │
├────────────────────────────────────────────────────────────────┤
│ Sarah Chen (Coordinator)          8 tasks • 4 complete         │
│ John Williams (Coordinator)        6 tasks • 2 complete        │
│ Emily (Maid of Honor)             4 tasks • 3 complete         │
│ Mike (Best Man)                   3 tasks • 1 complete         │
│ [+8 more]                                                      │
│                                                                │
│ 🏆 Most Active: Emily (15 messages today)                      │
│ ⚠️ Needs Attention: Mike (no activity in 5 days)               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ ✅ Tasks Overview (47 total)                                   │
├────────────────────────────────────────────────────────────────┤
│ Planning Phase (12 / 25 complete)                              │
│   🏛️ Venue & Location      ████████░░ 80%                      │
│   🍽️ Catering & Bar        ██░░░░░░░░ 20%                      │
│   📸 Photography & Video    ████░░░░░░ 40%                      │
│   🎵 Music & Entertainment  ░░░░░░░░░░ 0%                       │
│   💐 Flowers & Decor        ██░░░░░░░░ 20%                      │
│                                                                │
│ Critical Path: Venue → Catering → Invitations → RSVPs         │
│ At Risk: Music booking delayed (should book by Dec 1)          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 💰 Budget Dashboard ($40,000 total)                            │
├────────────────────────────────────────────────────────────────┤
│ Spent: $5,500 (14%)    Committed: $18,000 (45%)               │
│ Remaining: $16,500 (41%)                                       │
│                                                                │
│     Spent    Committed   Budget                                │
│ 🏛️ $3,000    $9,000      $12,000  ████████████░░ 100%         │
│ 🍽️ $500      $7,500      $8,000   ████████████░░ 100%         │
│ 📸 $0        $3,500      $3,500   ████████████░░ 100%         │
│ 💐 $2,000    $0          $4,000   ████░░░░░░░░░░ 50%          │
│                                                                │
│ ⚠️ Forecast: $42,300 (5.8% over budget)                        │
│ 💡 Suggestion: Reduce floral arrangements to stay on budget    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 📊 Timeline (9 months remaining)                               │
├────────────────────────────────────────────────────────────────┤
│ Nov 2025  ━━━━━━━●─────  Venue & Catering Locked (On Track)   │
│ Dec 2025  ─────────○────  Photography Booked (At Risk)         │
│ Jan 2026  ──────────○───  Save-the-Dates Sent (Not Started)   │
│ Feb 2026  ───────────○──  Dress & Attire Finalized            │
│ Mar 2026  ────────────○─  Invitations Sent                     │
│ Apr 2026  ─────────────●  RSVP Deadline (Critical)             │
│ May 2026  ─────────────○  Final Details & Rehearsal            │
│ Jun 2026  ──────────────● WEDDING DAY                          │
│                                                                │
│ ● Completed   ○ In Progress   ─ Not Started                   │
└────────────────────────────────────────────────────────────────┘

[Export PDF] [Share Link] [Print] [Back to Chat]
```

**AI-Powered Insights:**
- Bottleneck detection: "3 tasks waiting on Sarah's approval"
- Risk identification: "Photographer booking behind schedule for June weddings"
- Optimization suggestions: "Combine venue tour and cake tasting (same location)"
- Budget forecasting: Predicts final spend based on trajectory

**Technical Implementation:**
1. Planning Advisor Agent + Dependency Analyzer Agent collaborate
2. Queries Convex for:
   - All tasks with dependencies, status, assignees
   - All expenses with categories, payment status
   - All collaborators with activity metrics
   - Timeline milestones
3. AI analyzes for:
   - Critical path (longest dependent task chain)
   - Bottlenecks (high-dependency tasks not started)
   - Workload imbalance (one person has 80% of tasks)
   - Budget variance (planned vs actual by category)
4. Generates prioritized action list
5. Renders React components with data visualizations

**Success Metrics:**
- Engagement: 60%+ users check Master Plan weekly
- Action completion: 70%+ "Next Steps" completed within week
- Bottleneck resolution: 50% faster identification and correction

---

#### 9. Sub-Group Chats

**User Experience:**

Main Event Chat: "Sarah & John's Wedding" (8 coordinators/collaborators + AI)

User creates sub-group: **[+ Create Sub-Chat]** → "Catering Decisions"

Sub-chat inherits:
- Event context (date, location, budget)
- Relevant tasks (catering-related)
- AI assistant (scoped to catering domain)

**Common Sub-Groups:**
- **Vendor Chats** - Direct communication with photographer, caterer, etc.
- **Role Chats** - Bridesmaids, groomsmen planning
- **Topic Chats** - "Menu Selection", "Music Playlist", "Decorations"
- **Guest Chat** - Broadcast announcements, RSVP questions

**Permission Levels:**
- **Coordinators** - Full access to all chats
- **Collaborators** - Access to main + assigned sub-chats
- **Vendors** - Access only to their vendor chat
- **Guests** - Read-only main chat + guest sub-chat

**Cross-Chat Intelligence:**
User in Catering sub-chat: "Let's go with Italian menu, $28/person"

AI in Main Chat: "✅ Decision made in #catering: Italian menu selected. Budget impact: +$800"

Master Plan auto-updates:
- Catering budget: $7,000 → $7,800
- Catering task: "Menu selection" → Completed
- Timeline: Next milestone updated

**Technical Implementation:**
1. Each chat is Convex document with:
   - Participants with roles
   - Parent event reference
   - Inherited context
   - Permission rules
2. AI agents scope context to chat topic
3. Durable Objects manage WebSocket connections per chat
4. Cross-chat mentions trigger notifications
5. Decision synthesis agents monitor all chats in event

**Success Metrics:**
- Sub-chat adoption: 70%+ events create at least 2 sub-chats
- Focus improvement: 40% reduction in off-topic messages in main chat
- Vendor satisfaction: 80%+ vendors prefer sub-chat vs email

---

#### 10. Predictive Suggestions & Decision Synthesis

**User Experience:**

**Predictive Suggestions:**

Chat shows repeated mentions:
- "photographer" mentioned 5 times in 3 days
- No task created yet

AI message:
```
💡 Suggestion: You've discussed photographers several times.
Should I create a task to research and book one?

Typical timeline: Book 10-12 months before wedding
Your event: 8 months away (cutting it close!)
Estimated cost: $2,500 - $4,000

[Create Task] [Not Yet] [Don't Suggest This Again]
```

**Timeline Nudges:**
```
⏰ Timeline Alert
Most summer weddings book venues 12-14 months in advance.
You're at 10 months for June 14, 2026.

Recommendation: Lock in venue within next 2 weeks to avoid limited availability.

[View Venue Suggestions] [Mark as Priority]
```

**Budget Intelligence:**
```
💰 Budget Insight
Your catering budget ($8,000 for 150 guests = $53/person) is 25% above
typical for your event type ($42/person average).

Suggestion: Consider buffet style ($35/person) to save $2,700 while
maintaining quality.

[Explore Buffet Options] [Keep Current Plan]
```

**Decision Synthesis:**

AI monitors all chats and detects:
- Main chat: 7 out of 10 prefer buffet
- Catering sub-chat: Discussing plated dinner options
- Budget chat: Concerns about catering overspend

AI message to coordinators:
```
🤔 Decision Conflict Detected

**Main chat poll:** 70% prefer buffet (cost-conscious)
**Catering sub-chat:** Leaning toward plated dinner (more formal)
**Budget constraint:** Plated is 40% over budget

Recommendation: Schedule call with Emily (catering lead) to reconcile.
Consider: Plated dinner for intimate guest tier, buffet for general guests?

[Schedule Reconciliation] [Create Poll for Final Decision]
```

**Technical Implementation:**
1. Scheduled Convex functions run hourly:
   - Count keyword mentions without associated tasks
   - Compare timeline vs typical events (learned from data)
   - Detect sentiment conflicts across chats
2. Planning Advisor Agent generates suggestions with:
   - Confidence score (only show if > 0.8)
   - Impact analysis (cost/timeline/scope)
   - Specific actionable recommendations
3. Machine learning model (future):
   - Learns from historical events
   - Predicts cost overruns
   - Suggests optimal booking windows
4. Decision synthesis uses NLP to:
   - Extract positions from conversations
   - Count votes/sentiment
   - Identify contradictions
   - Flag unresolved debates

**Success Metrics:**
- Suggestion relevance: 75%+ suggestions accepted or engaged
- Timeline adherence: 50% improvement in on-time task completion
- Decision speed: 2x faster conflict resolution

---

#### 11. Natural Language Event Building

**User Experience:**

**Initial Setup:**

User: "I'm planning a wedding for 150 guests on June 14, 2026 in San Francisco. Budget is $40,000."

AI (in 3 seconds):
```
✨ Event Created: Sarah & John's Wedding

I've scaffolded your wedding plan with:
✅ 47 essential tasks organized by category
✅ Budget allocations by vendor type
✅ 9-month timeline with key milestones
✅ Collaborator role templates

📋 Top 5 Priorities:
1. Book venue (due: Nov 30, 2025)
2. Hire photographer (due: Dec 15, 2025)
3. Select caterer (due: Jan 15, 2026)
4. Order dress/suit (due: Feb 1, 2026)
5. Send save-the-dates (due: Jan 31, 2026)

[View Full Plan] [Customize] [Start Planning]
```

**Iterative Refinement:**

User: "Actually it's a destination wedding in Tuscany, Italy"

AI (in 5 seconds):
```
🌍 Updated to Destination Wedding: Tuscany, Italy

Changes applied:
✅ Added travel & accommodation tasks (hotel blocks, welcome bags)
✅ Adjusted timeline (+2 months for international planning)
✅ Updated vendor suggestions (Italy-based photographers, caterers)
✅ Budget increased 30% (typical for destination weddings)
✅ Added visa/passport reminders for guests
✅ Currency: EUR for Italian vendors, USD for guest-side costs

New total budget: $52,000
[View Changes] [Undo] [Keep Planning]
```

**Conversational Queries:**

User: "What's left to do?"

AI:
```
📝 Remaining Tasks (35 of 47)

High Priority (5 tasks):
• Book venue - Due in 12 days
• Hire photographer - Due in 28 days
• Finalize guest list - Due in 15 days

Waiting on Decisions (3 tasks):
• Menu selection - Blocked by caterer quotes
• Color scheme - Poll results pending

[View All Tasks] [Focus on High Priority]
```

User: "Who hasn't responded to the RSVP?"

AI:
```
📩 RSVP Status: 23 / 150 guests confirmed

Not Responded (127):
• 85 haven't received invitation yet (send Jan 1)
• 42 received, no response (sent 2 weeks ago)

Overdue Responses (12 guests):
• Emily Johnson - emily@example.com
• Mike Davis - mike@example.com
• [+10 more]

[Send Reminder] [Export List] [View Details]
```

User: "Are we under budget?"

AI:
```
💰 Budget Analysis

Current Status: $1,800 UNDER budget (4.5%)
• Spent: $5,500 (14%)
• Committed: $18,000 (45%)
• Remaining: $16,500 (41%)

Forecast: $42,300 at completion (5.8% OVER)
⚠️ Projection exceeds budget by $2,300

Risk Areas:
• Catering trending high ($8,500 vs $8,000 budget)
• Photography quotes 20% above estimate

Savings Opportunities:
• Floral: $800 by using seasonal flowers
• Bar: $500 by limiting premium liquor selection

[View Full Breakdown] [Adjust Budget] [Find Savings]
```

User: "When should we book the DJ?"

AI:
```
🎵 DJ Booking Timeline Recommendation

Optimal booking window: **Now - Dec 15, 2025**

Reasoning:
• Your wedding: June 14, 2026 (8 months away)
• Peak season: June weddings book 8-12 months ahead
• Current availability: 75% of top DJs still available
• Wait risk: By January, only 40% will remain

Price impact:
• Book now: $1,200 - $1,800 average
• Book Jan+: $1,800 - $2,500 (higher demand)

Dependencies:
✅ Venue confirmed (location known)
✅ Reception time set (hours needed)
⏳ Music preferences undefined (should discuss first)

Next steps:
1. Create music preferences poll (5 min)
2. Get 3 DJ quotes (2 days)
3. Book preferred DJ (1 week)

[Create DJ Task] [Get Recommendations] [Schedule Later]
```

**Template Application:**

User: "Make this more like a casual backyard party"

AI:
```
🎉 Switching to Casual Backyard Party Template

Simplified:
❌ Removed: Formal venue task
❌ Removed: Plated dinner catering
❌ Removed: Professional videographer
❌ Removed: Formal invitations
✅ Added: Backyard setup & rentals
✅ Added: BBQ/food truck catering options
✅ Added: DIY decoration ideas
✅ Added: Playlist creation (instead of DJ)

Budget reduced: $40,000 → $15,000 (-62%)
Timeline shortened: 9 months → 3 months

[Apply Changes] [Preview Plan] [Cancel]
```

**Technical Implementation:**
1. Initial event creation:
   - NLP extracts: event type, date, location, guest count, budget
   - Planning Advisor Agent applies template
   - Generates 40-50 standard tasks for event type
   - Budget Analyst allocates budget by category (learned from historical data)
   - Dependency Analyzer establishes task ordering
2. Iterative refinement:
   - Detects delta in user message vs current plan
   - Identifies affected components (tasks, budget, timeline, vendors)
   - Planning Advisor re-scaffolds with changes
   - Preserves user customizations
3. Conversational queries:
   - Intent classification determines agent routing
   - Minimal context assembly (only relevant data)
   - Structured response with quick actions
4. Templates:
   - Pre-defined JSON structures per event type
   - Customizable by users (future)
   - Applied via diff algorithm to preserve custom data

**Success Metrics:**
- Onboarding completion: 90%+ users complete initial setup
- Setup time: < 2 minutes from account creation to actionable plan
- Query success: 85%+ conversational queries return useful answers
- Template adoption: 60%+ users start with template

---

#### 12. Smart Mentions & Auto-Assignment

**User Experience:**

**Direct Assignment:**

User types: "@John research caterers and get 3 quotes"

AI instantly creates:
```
✅ Task Created & Assigned

Research Caterers
Assigned to: John Williams
Details: Get 3 quotes
Due: Nov 14, 2025 (2 weeks from now)
Category: Catering

John will be notified via push notification.

[View Task] [Reassign] [Edit]
```

**Collaborative Assignment:**

User types: "@Sarah @Mike decide on color scheme by Friday"

AI creates:
```
✅ Collaborative Task Created

Decide Color Scheme
Assigned to: Sarah Chen, Mike Davis
Due: Friday, Nov 8, 2025
Category: Decorations

Both Sarah and Mike will be notified.

[Create Poll] [View Task]
```

**Open Assignment:**

User types: "@anyone handle DJ booking"

AI creates:
```
✅ Open Task Created

Handle DJ Booking
Assigned to: Unassigned (any collaborator can claim)
Due: Dec 15, 2025
Category: Music & Entertainment

All collaborators notified. First to claim gets assignment.

[Claim Task] [View Details]
```

**Role-Based Mention:**

User types: "@decorator pick out centerpieces"

AI (if role defined):
```
✅ Task Assigned to Emily (Decorator)
```

AI (if role not defined):
```
❓ Who is the decorator?
Please assign this role:
• Emily Johnson
• Sarah Chen
• Mike Davis
• [Other]

This helps me route future decoration tasks automatically.
```

**Workload Intelligence:**

User tries to assign another task to John (who has 12 tasks)

AI warning:
```
⚠️ Workload Imbalance

John currently has 12 tasks (40% of all tasks)
Sarah has 3 tasks (10%)
Mike has 2 tasks (7%)

Suggestion: Assign to Sarah or Mike to balance workload?

[Assign to Sarah] [Assign to Mike] [Keep John] [Unassigned]
```

**@FYI Mentions (No Assignment):**

User types: "@FYI Emily we booked the venue!"

Sends notification to Emily but doesn't create task or assignment

**Technical Implementation:**
1. Pattern Detection identifies "@username" in messages
2. Extracts:
   - Mention type (task assignment, FYI, question)
   - Action verb (research, book, decide, handle)
   - Context (what needs to be done)
   - Deadline (if specified)
3. Task Enricher Agent creates task with:
   - Title from context
   - Due date (inferred or prompted)
   - Category (auto-detected)
   - Enrichment (cost, vendors, tips)
4. Convex stores task with assignee references
5. Push notifications via Convex scheduled functions
6. Workload calculated in real-time from task counts

**Success Metrics:**
- Assignment capture: 95%+ "@name action" patterns create tasks
- Notification delivery: 99%+ push notifications received
- Claim rate: 70%+ open tasks claimed within 24 hours
- Workload balance: 30% more even distribution vs manual assignment

---

#### 13. Magic Keywords System

**User Experience:**

User types "tasks" in chat input

Autocomplete appears: **tasks** (View all event tasks)

User hits Enter → Task board panel slides in

**Available Keywords:**
- **tasks** → Task board with filters
- **budget** → Budget dashboard
- **timeline** → Gantt chart / milestone view
- **guests** → RSVP tracker
- **vendors** → Vendor directory
- **files** → Document library (contracts, receipts)
- **votes** → Active polls summary
- **calendar** → Event calendar
- **roadmap** → AI-generated priority list
- **help** → Delphi user guide

**Smart Autocomplete:**
User types "ta" → Shows "tasks" suggestion
User types "bu" → Shows "budget" suggestion

**Fallback to Natural Language:**
If user types "show me the expenses" (not keyword) → AI interprets and shows budget panel

**Accidental Trigger Prevention:**
Keywords only activate via:
1. Autocomplete selection
2. Exact match with Enter key
3. Never trigger mid-sentence ("We should review tasks later" doesn't trigger)

**Technical Implementation:**
1. Frontend input component watches for keyword matches
2. Autocomplete powered by Trie data structure for instant suggestions
3. On keyword activation:
   - Sets UI state to show relevant panel
   - Fetches data via Convex subscription
   - No AI call needed (client-side routing)
4. Fallback: If no keyword match, message sent to AI for interpretation

**Success Metrics:**
- Keyword adoption: 50%+ users discover and use keywords
- Navigation speed: 80% faster than clicking through menus

---

#### 14. Contextual Quick Actions

**User Experience:**

**Venue Context:**

AI message: "I found 5 venues that match your criteria."

Quick actions appear:
**[View All]** **[Schedule Tours]** **[Filter by Price]** **[Save Favorites]**

User taps **[Schedule Tours]** →
```
Select venues to tour:
☐ The Grand Estate ($12,000)
☐ Riverside Gardens ($8,500)
☐ Historic Mansion ($15,000)

Available tour slots:
• Saturday Nov 9, 10am-4pm
• Sunday Nov 10, 11am-3pm

[Schedule Selected] [Cancel]
```

**Budget Context:**

AI message: "You're 5% over budget in catering category."

Quick actions:
**[View Breakdown]** **[Find Savings]** **[Adjust Budget]** **[Add Funds]**

User taps **[Find Savings]** → AI analyzes and suggests:
```
💡 Cost Reduction Options

1. Switch to buffet style: Save $2,700 (28%)
2. Reduce bar package: Save $800 (8%)
3. Eliminate late-night snack: Save $600 (6%)

[Apply Option 1] [Combine Options] [Custom Savings Plan]
```

**Task Context:**

AI message: "You have 5 tasks overdue."

Quick actions:
**[View Tasks]** **[Extend Deadlines]** **[Reassign]** **[Mark Complete]**

User taps **[Extend Deadlines]** →
```
Overdue Tasks:
✓ Book photographer (5 days overdue) → Extend to Nov 15
✓ Finalize guest list (2 days overdue) → Extend to Nov 10
☐ Menu selection (12 days overdue) → Extend to Nov 20

New deadline for all: [Date Picker]
Or extend individually: [Customize]

[Apply Extensions] [Cancel]
```

**Decision Context:**

AI message: "Color scheme poll results are tied: 5 votes gold, 5 votes rose gold."

Quick actions:
**[View Results]** **[Extend Voting]** **[Cast Tie-Breaker]** **[Create New Poll]**

**Vendor Context:**

AI message: "Photographer sent contract for review."

Quick actions:
**[Review Contract]** **[Schedule Call]** **[Sign Now]** **[Request Changes]**

**Rules:**
- Maximum 4 buttons (avoid overwhelm)
- Most common action first (left to right)
- All actions undo-able within 5 seconds
- Actions execute immediately or with minimal confirmation

**Technical Implementation:**
1. AI responses include metadata:
   ```json
   {
     "message": "You're 5% over budget...",
     "contextActions": [
       {"label": "View Breakdown", "action": "show_budget_detail"},
       {"label": "Find Savings", "action": "analyze_cost_reduction"},
       {"label": "Adjust Budget", "action": "open_budget_editor"},
       {"label": "Add Funds", "action": "increase_budget_allocation"}
     ]
   }
   ```
2. Frontend renders button chips dynamically
3. Button clicks trigger server functions with pre-filled context
4. Optimistic UI updates (immediate visual feedback)
5. Undo buffer maintains last 5 actions

**Success Metrics:**
- Quick action usage: 65%+ interactions use buttons vs manual commands
- Error reduction: 40% fewer mistakes from pre-validated actions
- User satisfaction: 85%+ prefer quick actions vs typing

---

## Development Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

**Goal:** Foundational architecture and basic AI integration

**Deliverables:**
1. Monorepo setup (Turborepo + Bun)
   - TanStack Start app scaffold
   - Convex backend integration
   - Cloudflare Workers setup
2. Authentication & user management
   - Email/password + OAuth (Google)
   - User roles and permissions system
3. Event creation and chat interface
   - Basic messaging UI
   - Convex real-time subscriptions
   - Message history and persistence
4. Pattern Detection Engine
   - Regex library for intent classification
   - Entity extraction (dates, money, people)
   - Confidence scoring logic
5. AI agent orchestration framework
   - Claude API integration
   - Agent routing logic
   - Context assembly system (4 levels)
   - Streaming response handling

**Success Criteria:**
- Users can create account, create event, send messages
- Pattern Detection correctly classifies 80%+ intents
- AI agent responds with structured output in < 3 seconds

---

### Phase 2: Core Features (Weeks 3-5)

**Goal:** Implement 7 most critical features

**Deliverables:**
1. Smart Task Creation
   - Task Enricher Agent implementation
   - Vendor suggestions (basic, no Firecrawl yet)
   - Task CRUD operations
   - Task assignment and due dates
2. Expense Tracker & Smart Split
   - Budget Analyst Agent implementation
   - Expense logging from chat
   - Budget dashboard visualizations
   - Split calculation algorithms
3. Smart Inline Polls
   - Poll creation from questions
   - Real-time vote counting
   - Result synthesis
4. Master Plan View
   - Planning Advisor Agent implementation
   - Task overview with categories
   - Budget summary
   - Timeline visualization
5. Sub-Group Chats
   - Chat hierarchy (parent event → sub-chats)
   - Role-based permissions
   - Cross-chat context inheritance
6. Contextual Reply System
   - Button chip rendering framework
   - Action metadata in AI responses
   - Common action handlers
7. Smart Mentions & Auto-Assignment
   - @mention parsing
   - Auto-task creation
   - Notification system

**Success Criteria:**
- All 7 features functional end-to-end
- < 1 second UI response for local actions
- < 3 seconds for AI-powered features

---

### Phase 3: Intelligence Layer (Weeks 6-7)

**Goal:** Advanced AI features and proactive suggestions

**Deliverables:**
1. Predictive Suggestions
   - Repeated mention tracking
   - Timeline comparison vs typical events
   - Budget anomaly detection
2. Decision Synthesis
   - Cross-chat conversation analysis
   - Sentiment detection and vote counting
   - Conflict identification
3. Natural Language Event Building
   - Template system (wedding, corporate, party)
   - Iterative plan refinement
   - Conversational query handling
4. Integrated Calendar & Reminders
   - Event extraction from chat
   - Reminder scheduling (Cloudflare Workers cron)
   - Calendar export (iCal)
5. Contextual Quick Actions
   - Action button library
   - Undo system (5-second buffer)

**Success Criteria:**
- 75%+ suggestion acceptance rate
- < 2 minutes initial event setup time
- 90%+ conversational query success rate

---

### Phase 4: Scale & Polish (Weeks 8-10)

**Goal:** Real-time coordination, vector search, production-ready

**Deliverables:**
1. Real-Time Coordination
   - Cloudflare Durable Objects setup
   - WebSocket connections per event
   - Presence indicators (who's online)
   - Typing indicators
   - Connection hibernation optimization
2. Vector Search Integration
   - Cloudflare Vectorize setup
   - Workers AI embeddings generation
   - Vendor semantic search
   - Task discovery by description
3. Vendor Suggestions (Enhanced)
   - Firecrawl integration
   - Web scraping for vendor data
   - Review aggregation
   - Rating system
4. Fluid On-Demand Dashboard UI
   - Dynamic panel system
   - Magic keywords implementation
   - Panel pinning preferences
5. File Storage
   - Cloudflare R2 setup
   - Presigned URL uploads
   - Receipt and contract storage
6. Performance Optimization
   - Query optimization (Convex)
   - Lazy loading and code splitting
   - Image optimization
   - Caching strategies

**Success Criteria:**
- Sub-100ms WebSocket latency
- Sub-100ms vector search queries
- 90+ Lighthouse performance score

---

### Phase 5: Production Launch (Weeks 11-12)

**Goal:** Beta testing, monitoring, marketing site

**Deliverables:**
1. Monitoring & Analytics
   - Error tracking (Sentry or similar)
   - Performance monitoring (Web Vitals)
   - AI agent performance metrics
   - Cost tracking per feature
2. User Onboarding
   - Welcome flow
   - Interactive tutorial
   - Sample event for exploration
3. Marketing Site
   - Landing page
   - Feature showcase
   - Pricing page (future)
   - Documentation
4. Beta Testing Program
   - 10-20 real events
   - Feedback collection
   - Bug triage and fixes
5. Security Audit
   - Authentication flow review
   - Permission system verification
   - Data privacy compliance (GDPR)
   - Rate limiting and abuse prevention

**Success Criteria:**
- Zero critical bugs in beta
- 90%+ beta user satisfaction
- < 1% error rate in production

---

### Post-Launch: Continuous Improvement (Months 4+)

**Priorities:**
1. **Learning Systems**
   - Cost estimation ML model (learns from actual expenses)
   - Timeline prediction improvements
   - Personalization based on user preferences
2. **Mobile Apps**
   - iOS and Android native apps
   - Push notifications
   - Offline support
3. **Integrations**
   - Google Calendar sync
   - Slack/Discord notifications
   - Payment processing (Stripe for deposits)
   - Email integration (vendor correspondence)
4. **Advanced Features**
   - Contract management and e-signatures
   - Video call scheduling (Zoom/Meet integration)
   - Guest website generation
   - Post-event recap and analytics
5. **Marketplace**
   - Verified vendor directory
   - Direct booking and payments
   - Review system
   - Vendor analytics dashboard

---

## Design Philosophy & Principles

### 1. Chat-First, Structure-Second

**Principle:** The primary interface is natural conversation. Structured data (tasks, budgets, decisions) emerges organically from dialogue, not forms.

**Implementation:**
- No "Create Task" button until AI detects task intent in conversation
- Budget entries come from natural statements like "paid $500 for deposit"
- Polls appear when AI detects questions with options
- Dashboard panels appear contextually based on conversation topics

**Anti-Patterns to Avoid:**
- ❌ Forcing users to fill out forms before chatting
- ❌ Requiring manual categorization (AI should infer)
- ❌ Showing empty states that demand data entry
- ✅ Let users talk naturally, structure emerges automatically

### 2. AI as Coordinator, Not Commander

**Principle:** AI suggests and assists, but never makes decisions or takes actions without user confirmation.

**Implementation:**
- Suggestions always include **[Accept]** **[Modify]** **[Decline]** options
- AI explains reasoning behind recommendations
- Users can override any AI suggestion
- Important decisions (budget changes, task deletion) always require explicit confirmation

**Anti-Patterns to Avoid:**
- ❌ AI automatically booking vendors or spending money
- ❌ AI deleting tasks or changing deadlines without permission
- ❌ Hiding AI decision-making logic from users
- ✅ AI proposes, user approves

### 3. Progressive Disclosure

**Principle:** Simple at first, complexity on-demand. New users aren't overwhelmed, power users access advanced functions quickly.

**Implementation:**
- Initial chat shows minimal UI (just chat input and basic stats)
- Advanced features appear contextually (panels slide in when relevant)
- Settings and customizations behind optional menus
- Onboarding focuses on immediate value (chat → first task in 60 seconds)

**Anti-Patterns to Avoid:**
- ❌ Showing full dashboard with empty states on first load
- ❌ Requiring users to learn all features before using any
- ❌ Cluttered UI with every option visible
- ✅ Start simple, reveal complexity gradually

### 4. Multiplayer-Native

**Principle:** Every feature considers multiple roles, perspectives, and concurrent access. Collaboration is seamless, not an afterthought.

**Implementation:**
- Real-time updates (no refresh needed)
- Optimistic UI (instant feedback, sync in background)
- Role-based permissions (coordinators vs collaborators vs guests)
- Activity indicators (who's online, who's typing)
- Conflict resolution (last-write-wins with undo support)

**Anti-Patterns to Avoid:**
- ❌ Single-user mindset (building solo app then "adding collaboration")
- ❌ Polling for updates (use real-time subscriptions)
- ❌ Ignoring concurrent edit conflicts
- ✅ Design every feature for simultaneous multi-user interaction

### 5. Flexible Without Chaos

**Principle:** Structure adapts to event needs. Templates provide starting points, not rigid constraints.

**Implementation:**
- Templates for common event types (wedding, corporate, party)
- Users can add/remove/modify any task or category
- AI learns from user customizations (doesn't reset to template)
- Budget categories flexible (not hard-coded list)

**Anti-Patterns to Avoid:**
- ❌ One-size-fits-all task list
- ❌ Mandatory fields that don't apply to all event types
- ❌ Rigid workflows that frustrate users who want to customize
- ✅ Opinionated defaults, but full customization supported

### 6. Fail Gracefully

**Principle:** AI failures don't break functionality. System always provides value, even with degraded AI performance.

**Implementation:**
- If AI agent fails → Fall back to simpler logic (regex-only task creation)
- If Claude API down → Queue requests, notify user of delay, offer manual entry
- If context too large → Summarize or paginate instead of failing
- If confidence score low → Ask user to clarify instead of guessing

**Anti-Patterns to Avoid:**
- ❌ Blank screen if AI fails
- ❌ Error messages that blame user ("AI couldn't understand you")
- ❌ Blocking core functionality on AI availability
- ✅ Degrade gracefully, maintain core value

### 7. Transparency & Control

**Principle:** Users understand why AI made suggestions, can see decision history, and control their data.

**Implementation:**
- AI explanations: "I suggested plated dinner because..." (show reasoning)
- Decision history: Who decided what, when, and why
- Data export: Users can download all event data
- Privacy controls: Choose what AI can access (future: don't analyze vendor sub-chats)

**Anti-Patterns to Avoid:**
- ❌ "Black box" AI suggestions with no explanation
- ❌ Hidden decision-making without attribution
- ❌ Data lock-in (can't export or delete)
- ✅ Full transparency into AI logic and data handling

### 8. Reduce Cognitive Load

**Principle:** Don't make users think about system mechanics. Focus their attention on event planning, not app navigation.

**Implementation:**
- Auto-categorization (users don't manually tag tasks)
- Smart defaults (due dates suggested, not blank)
- One-tap confirmations (not multi-step wizards)
- Undo support (mistakes easily reversed)

**Anti-Patterns to Avoid:**
- ❌ Requiring users to understand system terminology
- ❌ Multi-step flows for simple actions
- ❌ Irreversible actions without confirmation
- ✅ Minimize decisions, maximize defaults, enable quick corrections

---

## Success Metrics & KPIs

### User Engagement Metrics

1. **Daily Active Users (DAU) per Event**
   - Target: 60%+ collaborators active daily during active planning phase
   - Indicates: Feature stickiness and value

2. **Messages per User per Day**
   - Target: 10+ messages per active user
   - Indicates: Engagement with chat-first interface

3. **Feature Adoption Rate**
   - Target: 70%+ users use at least 5 core features
   - Indicates: Comprehensive value delivery

### Efficiency Metrics

1. **Time to First Task**
   - Target: < 2 minutes from account creation
   - Indicates: Onboarding friction and initial value

2. **Decision Speed**
   - Target: 3x faster group decisions vs unstructured chat
   - Measurement: Time from question to resolution (with polls vs without)
   - Indicates: Collaboration efficiency

3. **Task Completion Rate**
   - Target: 85%+ tasks completed before event
   - Indicates: Planning thoroughness and tool effectiveness

### Quality Metrics

1. **Budget Variance**
   - Target: 90%+ events within 10% of planned budget
   - Indicates: Accuracy of AI cost estimates and user discipline

2. **On-Time Task Completion**
   - Target: 80%+ tasks completed by original due date
   - Indicates: Timeline realism and user follow-through

3. **Post-Event Satisfaction**
   - Target: 4.5+ / 5.0 average rating
   - Indicates: Overall event success and app value

### AI Performance Metrics

1. **Suggestion Acceptance Rate**
   - Target: 75%+ AI suggestions accepted or engaged
   - Indicates: Relevance and quality of AI recommendations

2. **Contextual Reply Usage**
   - Target: 60%+ interactions use quick action buttons vs manual typing
   - Indicates: Effectiveness of context-aware UI

3. **Natural Language Query Success**
   - Target: 85%+ conversational queries return useful answers
   - Indicates: AI comprehension and response quality

4. **Pattern Detection Accuracy**
   - Target: 90%+ intents correctly classified
   - Indicates: Regex engine effectiveness

### Business Metrics (Post-Launch)

1. **User Acquisition Cost (CAC)**
   - Target: < $50 per user (via organic and referrals)

2. **Monthly Active Events**
   - Target: 1,000+ active events by Month 6

3. **Revenue per Event (Future Monetization)**
   - Target: $50-200 per event (freemium model)

4. **Vendor Marketplace GMV (Future)**
   - Target: $1M+ gross booking volume by Month 12

---

## Risk Analysis & Mitigation

### Technical Risks

**Risk 1: TanStack Start Stability (Beta Framework)**
- **Impact:** High (entire frontend)
- **Probability:** Medium (production-ready but new)
- **Mitigation:**
  - Maintain fallback plan to migrate to Next.js 15 if needed
  - Contribute to TanStack community to accelerate stabilization
  - Isolate framework-specific code in adapter layer for easier migration

**Risk 2: AI Cost Overruns**
- **Impact:** High (could make product uneconomical)
- **Probability:** Medium (depends on usage patterns)
- **Mitigation:**
  - Aggressive pattern detection filtering (90%+ messages skip AI)
  - Token budget per request (summarize if context too large)
  - Caching frequent queries (typical timelines, cost estimates)
  - Monitor per-user costs, implement rate limiting if needed

**Risk 3: Claude API Reliability**
- **Impact:** Medium (degrades features but doesn't break core)
- **Probability:** Low (Anthropic SLA is strong)
- **Mitigation:**
  - Queue system with retries
  - Fallback to simpler regex-only logic
  - Cache responses for similar queries
  - Consider secondary AI provider (GPT-4 fallback)

**Risk 4: Convex Scaling**
- **Impact:** High (affects entire backend)
- **Probability:** Low (proven at scale)
- **Mitigation:**
  - Load testing before launch
  - Query optimization early
  - Consider sharding strategy for 10K+ events
  - Maintain export capability if migration needed

### Product Risks

**Risk 5: User Adoption of Chat Interface**
- **Impact:** High (core assumption)
- **Probability:** Medium (some users prefer traditional dashboards)
- **Mitigation:**
  - Provide traditional views (Master Plan) as alternative
  - A/B test chat-first vs dashboard-first onboarding
  - User research to validate hypothesis
  - Ensure quick actions reduce typing burden

**Risk 6: AI Over-Reliance**
- **Impact:** Medium (users may distrust AI suggestions)
- **Probability:** Medium (varies by user sophistication)
- **Mitigation:**
  - Always show AI reasoning
  - Require explicit user confirmation for important actions
  - Allow easy overrides and customization
  - Highlight AI as "assistant" not "autopilot"

**Risk 7: Feature Overload**
- **Impact:** Medium (confuses users, reduces adoption)
- **Probability:** High (14 features is a lot)
- **Mitigation:**
  - Progressive disclosure (hide advanced features initially)
  - Onboarding focuses on 3-4 core features
  - Usage analytics to identify underused features
  - Consider phased rollout (fewer features at launch)

### Market Risks

**Risk 8: Competition (Zola, The Knot, WeddingWire)**
- **Impact:** High (established players with large user bases)
- **Probability:** High (market is not empty)
- **Mitigation:**
  - Differentiation via AI and chat-first UX (competitors don't have this)
  - Focus on collaboration features (multiplayer-native vs single-planner tools)
  - Faster iteration than incumbents (modern tech stack)
  - Target underserved segments first (destination weddings, corporate events)

**Risk 9: Monetization Uncertainty**
- **Impact:** Medium (need sustainable business model)
- **Probability:** Medium (freemium conversion rates vary)
- **Mitigation:**
  - Start with free tier to build user base
  - Identify high-value features for premium tier
  - Vendor marketplace as alternative revenue stream
  - Explore B2B sales (event planning agencies)

---

## Future Vision (12-24 Months)

### AI Advancements

1. **Multimodal AI**
   - Image analysis: Upload venue photos, AI suggests decoration improvements
   - Voice input: Dictate tasks while driving
   - Video context: Analyze vendor portfolio videos

2. **Personalization Engine**
   - Learn user preferences (formal vs casual, frugal vs luxury)
   - Predict needs before explicit mention
   - Custom suggestion models per user

3. **Autonomous Agents**
   - AI proactively reaches out to vendors for quotes
   - Automated follow-ups on overdue RSVPs
   - Smart rescheduling when dependencies shift

### Platform Expansion

1. **Post-Event Features**
   - Photo/video sharing gallery
   - Thank-you note coordination
   - Vendor reviews and ratings
   - Event analytics and insights

2. **Vendor Ecosystem**
   - Verified vendor network
   - Direct booking and payments
   - Vendor CRM for managing leads
   - Commission-based marketplace

3. **Mobile Apps**
   - iOS and Android native apps
   - Push notifications for urgent items
   - Offline mode for day-of coordination
   - Camera integration for receipt capture

4. **Integrations**
   - Calendar sync (Google, Apple, Outlook)
   - Payment processing (Stripe, Venmo splits)
   - Email client (vendor correspondence)
   - Social media (Instagram inspiration boards)

### Market Expansion

1. **Event Type Diversification**
   - Conferences and trade shows
   - Non-profit fundraising galas
   - School events (proms, reunions)
   - Festivals and community gatherings

2. **Geographic Expansion**
   - Localized vendor databases per region
   - Currency and language support
   - Cultural customization (wedding traditions vary globally)

3. **B2B Offering**
   - White-label platform for event planning agencies
   - Enterprise tier for corporate event teams
   - API for third-party integrations

---

## Conclusion

Delphi represents a fundamental reimagining of event coordination—moving from fragmented tools (spreadsheets, forms, separate chat apps) to a unified, AI-assisted conversational platform. By making **chat the primary interface** and allowing **structured data to emerge naturally from conversation**, we eliminate the cognitive overhead that makes event planning stressful and time-consuming.

### Core Innovations Summary

1. **Chat-Native UX** - Planning through conversation, not forms
2. **Multi-Agent AI** - Specialized AI coordinators for tasks, budgets, decisions
3. **Real-Time Collaboration** - True multiplayer with instant sync
4. **Context-Aware Intelligence** - UI adapts to conversation topics
5. **Predictive Guidance** - AI anticipates needs and prevents problems
6. **Modern Architecture** - Serverless, edge-first, fully type-safe

### Why This Will Succeed

1. **Massive Market** - $50B+ event planning industry (weddings alone)
2. **Clear Pain Point** - Existing tools force context-switching between chat and management
3. **Technical Moat** - Multi-agent AI system difficult to replicate quickly
4. **Network Effects** - More events → better cost estimates and timelines → more value
5. **Passionate Users** - Event planning is high-stakes, users will pay for quality tools

### Next Steps

1. **Week 1-2:** Complete core infrastructure setup
2. **Week 3:** Begin user research with 10 wedding planners
3. **Week 4:** Ship first usable prototype (chat + basic task creation)
4. **Week 6:** Private alpha with 5 real events
5. **Week 10:** Public beta launch
6. **Week 12:** Production launch with marketing push

**Delphi is not just a tool—it's a paradigm shift in how groups coordinate complex events. Let's build it.**

---

*Document maintained by: Delphi Core Team*
*For questions or updates: [Contact placeholder]*
