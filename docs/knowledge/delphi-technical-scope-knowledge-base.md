# Delphi: Technical Scope & Knowledge Base
## AI-Powered Event Planning Platform

**Version:** 2.0 - Integrated Knowledge Base  
**Last Updated:** November 12, 2025  
**Status:** Active Development  
**Document Purpose:** Single source of truth for technical implementation

---

## 1. Executive Summary

### Project Vision
Delphi is a conversational event planning platform that transforms group chat messages into structured project management through embedded multi-agent AI. The system eliminates context-switching between communication and coordination by making chat the primary interface for planning weddings, corporate events, and celebrations.

### Core Innovation
- **Conversational Intelligence**: Natural language automatically transforms into structured plans
- **Stateful Multi-Agent System**: Specialized AI agents with persistent memory across months
- **Edge-Native Architecture**: Cloudflare Durable Objects + Convex for global sub-100ms response
- **Three-Tier Memory Model**: Unlimited context within 128MB DO constraints

### Key Metrics & Targets
- **Response Time**: < 50ms hot queries, < 200ms with deep context
- **Memory Efficiency**: 10-20MB DO footprint (vs 128MB limit)
- **Planning Friction**: 70% reduction in coordination overhead
- **Budget Accuracy**: Keep users within 5% of planned budget
- **Decision Speed**: 3x faster group consensus through structured polls
- **Scale**: Handle 10-10,000 concurrent events automatically

---

## 2. System Architecture

### 2.1 Technology Stack

```yaml
Frontend:
  Framework: TanStack Start (React 19 + TypeScript)
  Realtime: Convex subscriptions via TanStack Query
  Rendering: Selective SSR with streaming UI
  
Edge Compute:
  Runtime: Cloudflare Workers
  Stateful: Durable Objects (orchestrators)
  Queues: Cloudflare Queues for workflows
  
Data Layer:
  Database: Convex (reactive, real-time)
  Storage: Three-tier memory hierarchy
  Search: Vector embeddings in Convex
  
AI Layer:
  LLM: Claude Sonnet 4 / GPT-4
  Pattern: Regex pre-filtering (< 5ms)
  Agents: Specialized domain experts
```

### 2.2 Three-Tier Memory Architecture

```
┌────────────────────────────────────────────────┐
│ TIER 1: HOT MEMORY (Durable Objects)           │
│ • Last 200 items in memory (~10-20MB)          │
│ • Sub-millisecond access (< 10ms)              │
│ • Active working memory                        │
│ • Sliding window with FIFO eviction            │
└────────────────────────────────────────────────┘
           ↓ Checkpoint every 50 items
┌────────────────────────────────────────────────┐
│ TIER 2: WARM STORAGE (Convex Active)           │
│ • Recent 30 days of data                       │
│ • Fast indexed queries (10-50ms)               │
│ • Real-time UI subscriptions                   │
│ • Checkpoint snapshots from DOs                │
└────────────────────────────────────────────────┘
           ↓ Archive completed events
┌────────────────────────────────────────────────┐
│ TIER 3: COLD STORAGE (Convex Historical)       │
│ • Complete audit trail                         │
│ • Unlimited retention                          │
│ • Analytics and ML training data               │
│ • Comprehensive queries (50-200ms)             │
└────────────────────────────────────────────────┘
```

### 2.3 Multi-Agent Orchestration Pattern

```yaml
Event Level:
  EventCoordinatorDO:
    - Cross-chat synthesis
    - Master timeline/budget view
    - Event-wide decisions
    - Memory: ~5MB digests only

Chat Level:
  ChatOrchestratorDO (per chat):
    - Last 200 messages
    - Intent detection
    - Agent routing
    - Memory: ~15MB per chat

Agent Pool (shared):
  TaskAgentDO:
    - Task enrichment
    - Vendor suggestions
    - Dependency analysis
    
  BudgetAgentDO:
    - Expense tracking
    - Split calculations
    - Forecast analysis
    
  VendorAgentDO:
    - Vendor matching
    - Contract analysis
    - Negotiation guidance
```

---

## 3. Core Features & Implementation

### 3.1 Smart Task Creation

**User Flow:**
1. User types: "We should book a photographer"
2. Regex detects commitment pattern (< 5ms)
3. ChatOrchestratorDO routes to TaskAgentDO
4. AI enriches with vendors, timeline, budget
5. Task appears in chat with quick actions

**Pattern Detection:**
```javascript
COMMITMENT_PRIMARY = /\b(we should|need to|let's|i'll|have to)\s+(book|order|find|hire)\b/i
Confidence Threshold: 0.7
```

**AI Context Assembly:**
```typescript
{
  eventType: "wedding",
  eventDate: "2026-06-15",
  budget: { total: 40000, photography: 3500 },
  existingTasks: [...],
  vendorPreferences: { style: "candid" }
}
```

**Expected Output:**
- Task with title, description, category
- Cost estimate (min/max range)
- Suggested deadline based on event type
- 3-5 vendor recommendations
- Dependency mapping
- Next action steps

### 3.2 Vendor Management

**User Flow:**
1. Vendor chat created or mentioned
2. VendorAgentDO analyzes requirements
3. Matches against vendor database
4. Enriches with reviews, availability
5. Tracks all vendor communications

**Vendor Chat States:**
```yaml
Discovery: Initial research phase
Negotiating: Active price/terms discussion
Contracted: Agreement signed
Active: Service delivery phase
Completed: Post-event status
```

### 3.3 Budget Intelligence

**User Flow:**
1. User mentions expense: "$500 for flowers"
2. BudgetAgentDO categorizes automatically
3. Updates running totals and forecasts
4. Alerts if approaching limits
5. Suggests fair splits among participants

**Expense Categories:**
```yaml
Major: Venue, Catering, Photography
Services: DJ, Florist, Coordinator
Supplies: Decorations, Favors, Invitations
Logistics: Transportation, Accommodation
```

### 3.4 Decision Orchestration

**User Flow:**
1. Debate detected in chat (multiple opinions)
2. AI suggests creating poll
3. Poll embedded inline with options
4. Real-time vote tracking
5. Results stored as decision points

**Poll Types:**
- Binary (Yes/No)
- Multiple Choice
- Ranked Preference
- Budget Allocation
- Date/Time Selection

---

## 4. Data Schemas

### 4.1 Core Event Schema

```typescript
Event {
  id: string
  name: string
  type: "wedding" | "corporate" | "party" | "travel"
  date: timestamp
  budget: { total: number, allocated: Record<category, number> }
  status: "planning" | "active" | "completed"
  coordinatorId: userId
  guestCount: number
}
```

### 4.2 Chat & Message Schema

```typescript
Chat {
  eventId: string
  chatType: "main" | "vendor" | "budget" | "collaborator"
  doInstanceId: string  // Orchestrator DO
  members: userId[]
  lastActivity: timestamp
}

Message {
  chatId: string
  authorId: userId
  content: string
  type: "user" | "agent" | "system"
  metadata?: {
    intent?: string
    entities?: Entity[]
    agentResponse?: AgentAction
  }
}
```

### 4.3 Agent State Schema

```typescript
ChatAgentState {
  chatId: string
  doInstanceId: string
  checkpointId: number
  hotMemory: {
    messageCount: number
    activeIntents: string[]
    lastSync: timestamp
  }
}

AgentAction {
  agentType: "task" | "budget" | "vendor" | "planning"
  actionType: "suggestion" | "creation" | "decision"
  confidence: number
  content: any
  status: "pending" | "accepted" | "dismissed"
}
```

---

## 5. User Flows & Scenarios

### 5.1 Wedding Planning Journey (12 months)

**Month 1-2: Foundation**
- Create event and core planning chat
- Set budget and guest count
- AI suggests timeline milestones
- Book major vendors (venue, catering)

**Month 3-6: Detail Planning**
- Multiple vendor chats active
- Task dependencies tracked
- Budget monitoring with alerts
- Group decisions via polls

**Month 7-10: Execution**
- Final vendor confirmations
- Guest RSVP tracking
- Payment reminders
- Timeline adjustments

**Month 11-12: Final Phase**
- Last-minute coordination
- Day-of timeline management
- Vendor payment completion
- Post-event wrap-up

### 5.2 Multi-Chat Coordination Example

```yaml
"Core Planning Team" Chat:
  - Major decisions and approvals
  - Budget oversight
  - Timeline management

"Friends Input" Chat:
  - Brainstorming and suggestions
  - Non-binding polls
  - Task volunteering

"Vendor: Brooklyn Loft" Chat:
  - Contract negotiation
  - Payment tracking
  - Setup coordination

Cross-Chat Intelligence:
  - Color decision in Core → Applied to vendor chats
  - Vendor quotes → Budget updates in Core
  - Friend suggestions → Polls in Core
```

---

## 6. AI Agent Specifications

### 6.1 Task Enricher Agent

**Responsibilities:**
- Transform commitments into detailed tasks
- Estimate costs and timelines
- Suggest relevant vendors
- Identify task dependencies

**Context Requirements:**
- Event type and date
- Existing task list
- Budget constraints
- Historical patterns

**Temperature:** 0.7 (balanced creativity)  
**Max Tokens:** 1000  
**Response Time Target:** < 2s

### 6.2 Budget Analyst Agent

**Responsibilities:**
- Categorize expenses automatically
- Calculate fair splits
- Forecast spending trends
- Alert on overages

**Context Requirements:**
- Total budget and allocations
- Spending history
- Participant roles
- Payment records

**Temperature:** 0.3 (precise calculations)  
**Max Tokens:** 500  
**Response Time Target:** < 1s

### 6.3 Vendor Agent

**Responsibilities:**
- Match vendors to requirements
- Analyze contracts and terms
- Track negotiation history
- Monitor service delivery

**Context Requirements:**
- Service requirements
- Budget range
- Location and dates
- Past vendor interactions

**Temperature:** 0.5 (factual matching)  
**Max Tokens:** 800  
**Response Time Target:** < 1.5s

---

## 7. Performance & Optimization

### 7.1 Pattern Detection Pipeline

```yaml
Stage 1: Regex Filtering (< 5ms)
  - 90% messages filtered out
  - High recall, acceptable precision
  - Runs on edge (Cloudflare Workers)

Stage 2: Intent Classification (< 20ms)
  - Refined classification of detected patterns
  - Confidence scoring
  - Agent routing decision

Stage 3: AI Processing (< 2s)
  - Only triggered for high-confidence intents
  - Streamed responses for perceived speed
  - Cached for similar queries
```

### 7.2 Memory Management Strategy

**Hot Memory (DO):**
- Sliding window of 200 items
- Checkpoint every 50 new items
- Prune to 100 items if > 80MB
- Store only essential fields

**Checkpoint Process:**
```typescript
if (items.length % 50 === 0) {
  await convex.mutation(api.checkpoints.create, {
    chatId,
    snapshot: compress(items.slice(-200)),
    timestamp: Date.now()
  });
}
```

**Recovery Process:**
```typescript
async reconstructFromCheckpoint() {
  const checkpoint = await convex.query(api.checkpoints.latest, { chatId });
  this.hotMemory = decompress(checkpoint.snapshot);
  this.metadata = checkpoint.metadata;
}
```

### 7.3 Scaling Strategy

**Horizontal Scaling:**
- Each chat gets independent DO (128MB each)
- Shared agent pool serves all chats
- Convex handles unlimited data storage

**Cost Optimization:**
- DOs sleep when idle (0 cost)
- Wake on request (milliseconds)
- 30-second CPU limit per request
- Unlimited lifetime via checkpointing

---

## 8. Critical Implementation Details

### 8.1 DO Lifecycle Management

**Request Model:**
```
Request → DO wakes → Load state → Process → Save state → Sleep
         (0→active)   (<50ms)    (<30s)    (persist)   (0 cost)
```

**State Persistence:**
- DO Storage: Working memory between requests
- Convex: Permanent record and checkpoints
- Recovery: Automatic on DO restart

### 8.2 Real-time Synchronization

**Data Flow:**
```
User Message → Worker → DO → Convex → UI Subscription
              (route)  (process) (store) (real-time update)
```

**Subscription Pattern:**
```typescript
// Frontend
const messages = useQuery(api.messages.list, { chatId });
// Auto-updates when Convex data changes
```

### 8.3 Error Handling & Recovery

**Graceful Degradation:**
- If AI fails → Show task without enrichment
- If DO crashes → Reconstruct from checkpoint
- If Convex down → Queue in DO storage
- If Worker fails → Retry with exponential backoff

**Monitoring Points:**
- DO memory usage (alert at 60MB)
- Checkpoint success rate
- AI response times
- Pattern detection accuracy

---

## 9. Security & Privacy

### 9.1 Data Isolation
- Each event completely isolated
- Chats have separate DO instances
- No cross-event data leakage

### 9.2 Access Control
- Role-based permissions (coordinator, collaborator, viewer)
- Vendor chats restricted to participants
- Budget visibility controls

### 9.3 Compliance
- GDPR-compliant data handling
- Right to deletion supported
- Audit trail maintained

---

## 10. Development Priorities

### Phase 1: Core Chat & Tasks (Months 1-2)
- [ ] Basic chat with real-time sync
- [ ] Pattern detection for tasks
- [ ] Task enrichment AI
- [ ] Simple budget tracking

### Phase 2: Multi-Agent System (Months 3-4)
- [ ] ChatOrchestratorDO implementation
- [ ] Agent pool architecture
- [ ] Checkpoint system
- [ ] Cross-chat coordination

### Phase 3: Advanced Features (Months 5-6)
- [ ] Vendor management system
- [ ] Complex polls and decisions
- [ ] Timeline intelligence
- [ ] Mobile optimization

### Phase 4: Scale & Polish (Months 7-8)
- [ ] Performance optimization
- [ ] Advanced AI capabilities
- [ ] Analytics dashboard
- [ ] Enterprise features

---

## 11. Success Metrics

### Technical KPIs
- DO memory usage < 20MB average
- Checkpoint recovery < 100ms
- AI response time < 2s P95
- Pattern detection accuracy > 85%

### User KPIs
- Task creation time reduced by 70%
- Budget accuracy within 5%
- Decision time reduced by 3x
- User satisfaction > 4.5/5

### Business KPIs
- Infrastructure cost < $0.10/event/month
- Support tickets < 5% of active users
- Feature adoption > 60% within first week
- Retention > 80% through event completion

---

## 12. Technical Debt & Future Considerations

### Known Limitations
- DO 128MB limit requires careful memory management
- 30-second request limit constrains complex operations
- Convex query complexity limits for massive datasets

### Future Enhancements
- Multi-language support
- Voice message transcription
- AR venue visualization
- Predictive analytics from historical data
- White-label enterprise deployment

### Research Areas
- Federated learning for personalized AI
- Blockchain for vendor contracts
- Computer vision for venue analysis
- Natural language to structured query

---

## Appendix A: Pattern Library Quick Reference

### Task Patterns
```javascript
COMMITMENT: /\b(we should|need to|let's|i'll)\s+(book|order|find)\b/i
OWNERSHIP: /\b(i'm on|i've got|i'll handle)\b/i
DEADLINE: /\b(by|before|until|due)\s+(monday|tuesday|...|january|...|\d{1,2})/i
```

### Money Patterns
```javascript
CURRENCY: /\$[\d,]+\.?\d*|\b\d+\s*(dollars|bucks|usd)\b/i
EXPENSE: /\b(paid|spent|cost|charged|invoice|bill)\b/i
SPLIT: /\b(split|divide|share|each pays|per person)\b/i
```

### Decision Patterns
```javascript
QUESTION: /\b(should we|what if|how about|do you think)\b/i
OPTIONS: /\b(either|or|versus|vs|instead of)\b/i
POLL_TRIGGER: /\b(vote|poll|decide|choose between)\b/i
```

---

## Appendix B: Agent Prompt Templates

### Task Enrichment Template
```
Role: Expert event planner specializing in {eventType}
Context: {eventContext}
Task: Transform "{userMention}" into detailed, actionable task

Required Output:
1. Clear task title and description
2. Cost estimate (min/max based on {guestCount} guests)
3. Deadline recommendation relative to {eventDate}
4. Dependencies on other tasks
5. 3-5 relevant vendor suggestions with ratings
6. Next concrete action steps

Format: JSON following TaskSchema
```

### Budget Analysis Template
```
Role: Financial analyst for event planning
Context: Total budget {totalBudget}, spent {totalSpent}
Task: Analyze expense "{expenseText}"

Required Output:
1. Expense category classification
2. Impact on remaining budget
3. Fair split calculation among {participants}
4. Cost optimization suggestions if over budget
5. Payment tracking requirements

Format: JSON following ExpenseSchema
```

---

## Document Maintenance

This knowledge base should be updated when:
- New features are implemented
- Architecture changes occur
- Performance targets change
- User feedback indicates gaps
- Scale requirements evolve

**Last Technical Review:** November 12, 2025  
**Next Scheduled Review:** December 12, 2025  
**Document Owner:** Delphi Technical Team  
**Version Control:** Git-tracked with semantic versioning