# Event Planning Platform - Core Features

## 1. Smart Task Creation
**From Natural Conversation to Structured Tasks**

- AI detects task-related language in chat messages automatically
- Converts casual mentions into actionable task items with one tap
- "We should book a photographer" → Generates task with suggested due date, category, and assignee
- Learns from repeated mentions (3+ times) and proactively suggests task creation
- Extracts task details from context: deadlines, budget, dependencies
- Smart defaults based on event type and timeline (e.g., "Book venue" gets 6-month lead time for weddings)

---

## 2. Vendor Suggestions & AI Enrichment
**Intelligent Vendor Matching Under Task Context**

- Tasks auto-populate with relevant vendor recommendations
- "Book DJ" task includes 3-5 DJ suggestions with ratings, pricing, availability
- AI enriches tasks with:
  - Typical costs for the service
  - Timeline recommendations (when to book)
  - Questions to ask vendors
  - Contract checklist items
- Vendor ratings pulled from reviews, past user experiences, and industry data
- Direct inquiry/booking flows from within tasks
- Tracks vendor communication history per task

---

## 3. Smart Interactive Inline Polls
**Frictionless Decision-Making in Conversation**

- Create polls directly in chat with natural language: "Should we do buffet or plated dinner?"
- Multiple poll types:
  - Simple yes/no/maybe
  - Multiple choice
  - Ranked preference
  - Rating scale (1-5 stars)
  - Budget allocation (distribute % across options)
- Real-time vote counting visible to all participants
- Automatic deadline reminders for pending voters
- Results feed directly into event decisions and timeline updates
- Poll results stored as decision points for future reference
- "Re-poll" option if circumstances change

---

## 4. Expense Tracker & Smart Split
**Transparent Budget Management**

- Add expenses directly in chat: "$500 for venue deposit"
- Automatic category detection (venue, catering, decor, etc.)
- Visual budget dashboard:
  - Total spent vs. budget
  - Breakdown by category (pie chart)
  - Forecast to completion
  - Overspend warnings
- Smart expense splitting:
  - Split evenly across all collaborators
  - Custom splits by person or percentage
  - Role-based splits (coordinator pays deposit, guests split rest)
  - Payment tracking: who paid, who owes, reminders
- Receipt attachment and storage
- Export reports for tax/reimbursement purposes

---

## 5. Contextual Reply System
**Input Box Transforms Based on AI Message Context**

When replying to AI messages, the chat input adapts intelligently:

- **Venue Suggestions** → Quick actions: [Schedule Tour] [Save] [Pass] + auto-complete for questions
- **Budget Queries** → Inline expense entry form with category dropdown
- **Task Prompts** → Pre-filled task creation with smart defaults
- **Polls** → Vote buttons appear inline
- **Guest RSVPs** → Status update controls (Yes/No/Maybe)

**Smart Autofill Engine:**
- Typing "yes" to venue suggestion → "Yes, schedule tour at Brooklyn Loft"
- Typing "$" in budget context → Expense entry form expands
- Typing "@name" in task context → Assignment autocomplete
- Typing date/time → Calendar picker appears

System detects keywords, intent, entities (dates, money, names) and provides contextual completions that reduce typing and accelerate actions.

---

## 6. Fluid On-Demand Dashboard UI
**Dynamic Interface That Responds to Conversation**

The main event dashboard is chat-first with contextual panels that appear based on AI interactions:

**Always Visible Widgets** (top of chat):
- Days until event
- Budget: spent/remaining
- Tasks: complete/total  
- RSVPs: confirmed/pending
- Next milestone

**Dynamic Panels** (appear on-demand):
- Discussing budget → Expense breakdown expands
- Talking venue → Map + photos slide in
- Mentioning tasks → Task board overlay appears
- Guest list questions → RSVP tracker shows
- Timeline concerns → Gantt chart displays

**Interaction Model:**
- AI detects topic shifts and surfaces relevant panels automatically
- User can pin frequently used panels
- Panels collapse when topic changes
- "Show me..." commands bring up specific views
- Drag-to-reorder panel priority

---

## 7. Magic Keywords System
**Preset Panels via Autocomplete Triggers**

Type special keywords in the main dashboard chat to summon specific views:

- **"tasks"** → Full task board with filters, sorting, assignments
- **"budget"** → Complete expense breakdown + split calculator  
- **"timeline"** → Gantt chart with milestones and dependencies
- **"guests"** → RSVP tracker with contact info and meal preferences
- **"vendors"** → Directory of all vendors with status and contracts
- **"files"** → Document repository (contracts, inspiration, receipts)
- **"votes"** → All active and past polls with results
- **"calendar"** → Upcoming meetings, calls, deadlines
- **"roadmap"** → High-level event progress and next steps

**Smart Fallback:**
- Typing partial matches still works (e.g., "task" creates a new task vs. "tasks" shows board)
- AI interprets non-keyword natural language and shows what it deems relevant
- Keywords only activate via autocomplete suggestion acceptance
- Prevents accidental triggers while having normal conversations

---

## 8. Integrated Calendar & Reminders
**Schedule Everything, Miss Nothing**

- Create calendar events directly from chat: "Schedule venue tour next Saturday at 2pm"
- Event types:
  - Vendor meetings/calls
  - Planning meetups with collaborators  
  - Milestone deadlines (deposit due, RSVP deadline)
  - Rehearsals and day-of timeline
- Automatic reminder system:
  - 1 week before, 1 day before, 1 hour before (customizable)
  - Urgent task notifications based on dependency chains
  - "Running behind" alerts if critical path is at risk
- Sync with personal calendars (Google, Apple, Outlook)
- Availability detection for group scheduling
- AI finds mutual availability: "When can the bridal party meet?" → Suggests overlapping free times

---

## 9. Master Plan View
**Complete Event Overview with AI Guidance**

A comprehensive command center showing the entire event at a glance:

**All Users Section:**
- Participant directory with roles (coordinator, guest, vendor)
- Individual task assignments per person
- Contribution tracking (who's doing what)
- Communication activity levels

**Tasks Overview:**
- Categorized by phase (planning, execution, post-event)
- Status indicators (not started, in progress, blocked, complete)
- Critical path highlighting (tasks that could delay the event)
- Dependency visualization (Task B can't start until Task A is done)

**Expenses Dashboard:**
- Full budget allocation vs. actual spend
- Payment status by expense
- Upcoming payment deadlines
- Cost optimization suggestions from AI

**Main Event Plan:**
- High-level timeline from start to event day
- Major milestones with progress indicators
- Phase completion percentages
- Risk indicators (tasks behind schedule, budget overruns)

**AI-Powered Roadmap:**
- **Next Steps**: Top 3-5 priorities right now
- **Urgent**: Overdue or time-sensitive items
- **Blocked**: Tasks waiting on decisions or dependencies
- **Upcoming**: What's coming in next 2 weeks
- **Completed**: Recent wins to celebrate

**Non-Blocking Design:**
- Master Plan is a reference tool, not required for workflow
- Accessible via magic keyword "roadmap" or menu
- Provides bird's-eye view without interrupting chat-based work
- AI proactively surfaces Master Plan when user seems lost or asks "what's next?"

---

## 10. Sub-Group Chats
**Organized Collaboration with Role-Based Access**

Create focused conversation spaces for different aspects of event planning:

**Chat Types:**
- **Main Event Chat**: Core planning team + AI assistant
- **Sub-Group Chats**: Topic or role-specific (e.g., "Catering Decisions", "Bachelor Party Planning")
- **Vendor Chats**: Direct communication with external vendors
- **Guest Announcements**: Broadcast-only channel for updates

**Role-Based Permissions:**
- **Coordinator**: Full access, can create tasks, approve expenses, manage all chats
- **Collaborator**: Can participate, create tasks, add expenses, limited admin rights
- **Guest**: View-only on main plan, full participation in guest-specific chats
- **Vendor**: Access only to their relevant chat, can see related tasks/timeline

**Information Flow:**
- Decisions made in sub-chats auto-update main event timeline
- AI synthesizes discussions from all chats into Master Plan
- Cross-chat mentions: "@Sarah in #catering can you review the menu?"
- Sub-chat creations inherits context from main event (budget, timeline, participants)

**Use Cases:**
- "Bridesmaids Dress Shopping" sub-chat → Only bridesmaids participate
- "Surprise Element Planning" → Hidden from guest of honor
- "Budget Committee" → Only coordinator + financial collaborators
- "Venue Walk-Through" → Coordinator + venue vendor + key stakeholders

---

## 11. Predictive Suggestions & Decision Synthesis
**AI Anticipates Needs and Consolidates Choices**

**Predictive Suggestions:**
- Analyzes conversation patterns and proactively recommends actions
- "You've mentioned photographer 5 times → Want me to add 'Book Photographer' task?"
- "Most weddings book venues 12 months out, you're at 10 months → Should we prioritize this?"
- "Your catering budget is higher than typical for this guest count → Want alternatives?"
- Learns from similar events and user preferences
- Suggests next logical steps based on event phase

**Decision Synthesis:**
- Reads across ALL group chats to understand the full picture
- Summarizes scattered discussions: "Across 3 chats, here's what we've decided about catering..."
- Identifies contradictions: "Main chat voted Italian, but sub-chat is exploring Mexican options"
- Flags unresolved decisions: "Venue color scheme has no consensus after 10 messages"
- Creates decision timeline: "Here's every major decision made, when, and by whom"

**Consensus Detection:**
- Monitors sentiment in conversations
- "7 out of 10 people prefer buffet style → Should we lock this in?"
- Highlights dissenting opinions: "Sarah raised concerns about outdoor venue weather risk"
- Suggests when to escalate to formal vote

**Timeline Intelligence:**
- Compares your progress to typical event timelines
- "Most events at this stage have locked down venue and caterer. You're ahead on venue, behind on catering."
- Surfaces bottlenecks: "3 tasks are waiting on Sarah's input"

---

## 12. Natural Language Event Building
**Describe Your Event, AI Builds the Structure**

Turn event vision into actionable plan through conversation:

**Kickoff Conversation:**
- User: "Planning my wedding for 150 guests, June 2026, budget $40,000"
- AI scaffolds entire event structure:
  - Creates task categories (venue, catering, photography, music, etc.)
  - Generates timeline with typical milestones
  - Sets up budget allocations by category
  - Suggests collaborator roles
  - Pre-populates vendor task list

**Iterative Refinement:**
- User: "Actually, it's a destination wedding in Italy"
- AI adjusts:
  - Adds travel and accommodation tasks
  - Updates budget to account for destination costs
  - Suggests Italy-specific vendors
  - Adjusts timeline for longer planning horizon

**Query-Based Modifications:**
- "What's left to do?" → AI generates prioritized task list
- "Who hasn't responded?" → Instant RSVP status report
- "Are we under budget?" → Current spend analysis with forecast
- "When should we book the DJ?" → Timeline recommendation with reasoning

**Template Application:**
- "Make this like a corporate gala" → Applies corporate event template
- "This is a casual backyard party" → Simplifies structure, removes formal elements
- Hybrid approaches: "Wedding but with a casual vibe"

---

## 13. Smart Mentions & Auto-Assignment
**Effortless Task Delegation via Conversation**

**@ Mention Magic:**
- "@John can you research caterers?" → Auto-creates task "Research caterers", assigns to John
- "@Sarah @Mike decide on color scheme" → Creates collaborative task for both
- "@anyone handle DJ booking" → Creates unassigned task, notifies all collaborators

**Context-Aware Assignment:**
- System learns roles and expertise
- "@decorator" mentions auto-route to designated decorator
- First-time mentions prompt role definition: "Should I remember Sarah as the florist?"

**Assignment Intelligence:**
- AI suggests assignees based on task type and past assignments
- "This is a photography task, you usually assign these to Mike"
- Workload balancing: "John has 8 tasks, Sarah has 2 → Suggest assigning this to Sarah?"

**Notification Control:**
- Mentions trigger notifications only for assigned individuals
- "@all" for urgent group-wide alerts (used sparingly)
- Can mention without assigning: "@FYI Sarah, we picked the venue"

**Assignment Tracking:**
- Each user sees "My Tasks" view filtered to their assignments
- Coordinators see all assignments across all users
- Overdue assignment reminders escalate: assignee → coordinator → group

---

## 14. Contextual Quick Actions
**One-Tap Actions From AI Suggestions**

Appear as button chips in chat when AI presents actionable information:

**Venue Context:**
- AI: "Found 5 venues in your budget"
- Actions: [View All] [Schedule Tours] [Save Favorites] [Get More Options]

**Budget Context:**
- AI: "You're 60% through budget with 40% of tasks done"
- Actions: [View Breakdown] [Add Expense] [Adjust Budget] [Find Savings]

**Task Context:**
- AI: "You have 3 overdue tasks"
- Actions: [View Tasks] [Extend Deadlines] [Reassign] [Mark Complete]

**Guest Context:**
- AI: "12 guests haven't RSVP'd"
- Actions: [Send Reminders] [View List] [Update Status] [Export Contacts]

**Decision Context:**
- AI: "Catering vote is tied"
- Actions: [View Results] [Extend Voting] [Cast Tie-Breaker] [Create New Poll]

**Vendor Context:**
- AI: "Photographer contract expires in 3 days"
- Actions: [Review Contract] [Contact Vendor] [Sign Now] [Find Alternative]

**Quick Actions Principles:**
- Maximum 4 action buttons to avoid overwhelm
- Most important action is leftmost/primary styled
- Actions execute immediately or with single confirmation
- All actions are undo-able within 5 seconds
- Actions disappear after execution or topic change

---

## Feature Integration Map

**How Features Work Together:**

1. **Conversation → Task Creation** → Populates **Master Plan** → Triggers **Calendar Reminders**

2. **Vendor Suggestions** (in tasks) → Enables **Smart Mentions** → Creates **Sub-Group Chats** (vendor-specific)

3. **Inline Polls** → Feeds **Decision Synthesis** → Updates **Master Plan** → Informs **Predictive Suggestions**

4. **Expense Tracker** → Powers **Budget Dashboard** (in Fluid UI) → Influences **AI Recommendations**

5. **Contextual Reply System** → Activates **Quick Actions** → Uses **Magic Keywords** → Surfaces **Dynamic Panels**

6. **Natural Language Building** → Generates **Tasks** → Assigns via **Smart Mentions** → Organizes in **Sub-Group Chats**

7. **Master Plan View** → Consolidates all features → Provides **AI Roadmap** → Enables **Predictive Suggestions**

---

## Core User Flows

### Flow 1: Starting a New Event
1. User enters event description in natural language
2. AI scaffolds structure (tasks, budget, timeline)
3. User invites collaborators (auto-assigned roles)
4. Sub-group chats created for major categories
5. Master Plan populated with initial roadmap

### Flow 2: Making a Group Decision
1. Topic discussed in chat
2. Inline poll created naturally ("Should we...?")
3. Participants vote via contextual quick actions
4. Results synthesized by AI
5. Decision recorded in Master Plan
6. Related tasks updated automatically

### Flow 3: Managing Budget
1. Expense mentioned in chat ("Paid $500 deposit")
2. AI prompts categorization via contextual reply
3. Expense logged, budget dashboard updates
4. Smart split activated if multiple payers
5. Budget warnings issued if threshold exceeded
6. Master Plan reflects financial status

### Flow 4: Coordinating with Vendors
1. Task created: "Book DJ"
2. AI enriches with vendor suggestions
3. Coordinator creates vendor sub-chat
4. Negotiation happens in dedicated space
5. Contract terms logged
6. Calendar events set for calls/deadlines
7. Payment tracked in expense system

### Flow 5: Day-of Coordination
1. Master Plan switches to "Event Day" mode
2. Timeline shows minute-by-minute schedule
3. Task checklist for setup, execution, teardown
4. Real-time updates via chat
5. Quick actions for common issues
6. Post-event wrap-up tasks auto-generated

---

## Design Philosophy

**Chat-First, Structure-Second**
- Primary interface is conversation
- Structured data emerges from natural interaction
- Forms and dashboards appear only when needed

**AI as Coordinator, Not Commander**
- AI suggests, never demands
- Users always have final say
- Predictive features are helpful nudges, not mandates

**Progressive Disclosure**
- Simple at first, complexity on-demand
- New users aren't overwhelmed by features
- Power users access advanced functions quickly

**Multiplayer-Native**
- Every feature considers multiple roles and perspectives
- Permissions ensure appropriate access
- Collaboration is seamless, not afterthought

**Flexible Without Chaos**
- Structure adapts to event needs (wedding vs. corporate vs. birthday)
- Templates provide starting points, not constraints
- Events can be as detailed or casual as users want

---

## Success Metrics

**User Engagement:**
- Daily active users per event
- Messages sent per user
- Feature adoption rate (% of users using each feature)

**Efficiency Gains:**
- Time from event creation to first task completion
- Average time to make group decisions (pre vs. post inline polls)
- Task completion rate vs. traditional planning tools

**Quality Indicators:**
- Budget variance (planned vs. actual)
- On-time task completion rate
- User satisfaction score (post-event survey)
- % of events that stay within timeline

**AI Effectiveness:**
- Predictive suggestion acceptance rate
- Contextual reply usage vs. manual typing
- Decision synthesis accuracy (user corrections needed)
- Natural language event building success rate

---

**Total Features:** 14 core capabilities, deeply integrated for seamless event planning from conversation to execution.
