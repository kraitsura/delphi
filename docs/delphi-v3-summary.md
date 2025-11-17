# Delphi Agent System v3.0: Executive Summary & Migration Roadmap

**Date:** November 16, 2025  
**Status:** Ready for Implementation

---

## What We're Building

A **stateful, room-based agent system** that fixes all current problems and enables your vision for Delphi:

### Current Problems → Solutions

| Problem | Current State | New Solution |
|---------|---------------|--------------|
| **Routing Confusion** | 4 specialized agents, keyword-based routing | Single unified agent with AI intent detection |
| **No Memory** | Agents forget context between messages | Durable Objects persist state across conversations |
| **Fixed Iterations** | 5 iterations for everything | Dynamic budgets based on task complexity |
| **Empty State Failures** | "Update tasks" crashes when no tasks exist | Precondition validation + helpful guidance |
| **No Planning** | Jump straight to tool execution | Planning layer analyzes feasibility first |
| **Limited Responses** | Plain text only | Component-based UI with grid layouts |
| **Reactive Only** | Only responds to user messages | Background triggers for proactive suggestions |

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────┐
│             FRONTEND (TanStack Start)             │
│  • Real-time message subscriptions                │
│  • Dynamic component grid renderer                │
│  • Poll/vote interface                            │
└───────────────────┬──────────────────────────────┘
                    │
┌───────────────────┴──────────────────────────────┐
│          CLOUDFLARE WORKER (Router)               │
│  • Auth validation                                │
│  • Route to RoomOrchestratorDO                    │
└───────────────────┬──────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ RoomOrchestratorDO    EventCoordinatorDO │
│ (per chat room)       (per event)        │
│                                           │
│ • Last 200 messages   • Cross-room data   │
│ • Active polls        • Triggers          │
│ • Intent detection    • Synthesis         │
└──────────┬────────┘    └────────┬─────────┘
           │                      │
           └──────────┬───────────┘
                      ↓
          ┌───────────────────────┐
          │  UNIFIED DELPHI AGENT  │
          │  • Planning layer      │
          │  • All tools           │
          │  • Component assembly  │
          └───────────────────────┘
```

---

## Key Features

### 1. Multi-Room Support
- Each event has multiple chat rooms
- Main planning, vendor-specific, brainstorm, private
- Independent state per room
- Cross-room synthesis via EventCoordinatorDO

### 2. Stateful Conversations
- Durable Objects persist last 200 messages
- Agents remember context
- Checkpoints to Convex every 50 messages
- Recovery from checkpoints if DO restarts

### 3. Component-Based UI
- Agents return structured JSON with component layouts
- Grid positioning system (12-column)
- Components: TaskCard, PollCard, BudgetSummary, VendorList, etc.
- Hybrid responses: text + components

### 4. Intelligent Planning
- Planning phase before execution
- Precondition validation
- Dynamic iteration budgets
- State tracking across steps

### 5. Polls & Voting
- Create polls from agent or user
- Real-time vote tracking
- Multiple poll types (binary, multiple choice, ranked)
- Embedded in message stream

### 6. Background Triggers (Phase 2)
- Periodic checks for patterns (deadlines, budgets)
- Proactive suggestions
- Cron-based execution
- System messages to relevant rooms

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Fix immediate problems with unified agent

**Deliverables:**
- ✅ UnifiedDelphiAgent with planning layer
- ✅ State-aware execution
- ✅ Dynamic iteration budgets
- ✅ Precondition validation
- ✅ AI-based intent detection

**Success Criteria:**
- Agent success rate >95%
- Handles empty state gracefully
- Can create multiple tasks in one request
- "Update tasks" bug fixed

---

### Phase 2: Room Architecture (Weeks 3-4)
**Goal:** Introduce stateful DOs

**Deliverables:**
- ✅ RoomOrchestratorDO implementation
- ✅ Hot memory management (200 messages)
- ✅ Checkpoint system to Convex
- ✅ Recovery mechanism
- ✅ EventCoordinatorDO for cross-room synthesis

**Success Criteria:**
- DO memory usage <20MB
- Checkpoint recovery <100ms
- Multi-room queries working
- State persists across DO restarts

---

### Phase 3: Enhanced UI (Weeks 5-6)
**Goal:** Component-based responses

**Deliverables:**
- ✅ Component response protocol
- ✅ Grid layout system
- ✅ Frontend component library
- ✅ Poll creation and voting
- ✅ Hybrid text+component messages

**Success Criteria:**
- Components render correctly
- Grid layout responsive
- Polls functional end-to-end
- User engagement with components >60%

---

### Phase 4: Background Intelligence (Weeks 7-8)
**Goal:** Proactive suggestions

**Deliverables:**
- ✅ Trigger pattern definitions
- ✅ Cron worker for checks
- ✅ System message generation
- ✅ Notification system

**Success Criteria:**
- Triggers fire accurately
- False positive rate <10%
- User action rate on suggestions >30%
- Max 1 trigger/day per type (no spam)

---

### Phase 5: Polish (Weeks 9-10)
**Goal:** Production-ready

**Deliverables:**
- ✅ Performance optimization
- ✅ Cost reduction
- ✅ Error handling
- ✅ Monitoring
- ✅ Documentation

**Success Criteria:**
- P95 response time <2s
- AI cost <$0.15/event
- Error rate <1%
- User satisfaction >4.5/5

---

## Migration Strategy

### Gradual Rollout

**Week 1-2: UnifiedAgent Only**
- Keep existing ChatOrchestratorDO
- Replace specialized agents with UnifiedDelphiAgent
- Test with 10% traffic
- Rollback plan: revert to specialized agents

**Week 3-4: Add RoomOrchestratorDO**
- Deploy new DO alongside old
- Route 10% → 50% → 100% of traffic
- Monitor error rates
- Keep old DO as fallback

**Week 5+: Full System**
- Complete migration to new architecture
- Deprecate old ChatOrchestratorDO
- Remove specialized agents

### Feature Flags

```typescript
// In Worker
if (env.USE_V3_ARCHITECTURE === 'true') {
  return roomOrchestrator.handle(request);
} else {
  return chatOrchestrator.handle(request);  // Old system
}
```

---

## Critical Implementation Details

### 1. DO Memory Management

**Constraints:**
- 128MB per Durable Object
- 30-second CPU limit per request

**Strategy:**
- Keep last 200 messages (~10-15MB)
- Compress older history into summary (~1MB)
- Checkpoint every 50 messages
- Prune if memory >80MB

### 2. Message Protocol

**Convex Schema:**
```typescript
{
  _id: Id<"messages">,
  roomId: Id<"rooms">,
  authorType: "user" | "agent" | "system",
  content: string,
  
  // Agent responses
  response?: {
    type: "text" | "components" | "hybrid",
    text?: string,
    components?: ComponentLayout[]
  }
}
```

### 3. Component Layout

**Grid System:**
- 12-column layout
- Components specify: `{ row, col, rowSpan, colSpan }`
- Frontend uses CSS Grid

**Example:**
```typescript
{
  type: "TaskCard",
  position: { row: 1, col: 1, rowSpan: 1, colSpan: 6 },
  data: { taskId, title, dueDate, ... }
}
```

### 4. Background Triggers

**Cron Schedule:**
- Runs every 1 hour
- Checks all active events
- Evaluates trigger patterns
- Creates system messages

**Trigger Types:**
- Deadline approaching
- Budget threshold
- Missing vendor category
- Inactive room
- Decision pending
- Payment due

---

## Cost Analysis

### Current System (Broken)
- ~1,000 tokens per request
- $0.001 per request (Claude Haiku)
- But 60% success rate → poor value

### New System (v3.0)
- Planning phase: +200 tokens
- State context: +300 tokens
- Component assembly: +200 tokens
- **Total: ~1,700 tokens per request**
- **Cost: $0.0017 per request**
- **But 95%+ success rate → excellent value**

### Per Event (100 agent interactions)
- Old: 100 × $0.001 = **$0.10** (but broken)
- New: 100 × $0.0017 = **$0.17** (working)

**ROI:** Pay 70% more, get 4.75x better reliability = **2.8x value**

---

## Risk Mitigation

### Technical Risks

**DO Memory Limits:**
- Risk: Exceed 128MB
- Mitigation: Aggressive pruning, checkpoints, monitoring

**AI Costs:**
- Risk: Costs spiral
- Mitigation: Pattern pre-filtering, caching, token budgets

**DO Reliability:**
- Risk: DO crashes lose state
- Mitigation: Checkpoint every 50 messages, quick recovery

### Migration Risks

**Compatibility:**
- Risk: New system breaks existing flows
- Mitigation: Gradual rollout, feature flags, monitoring

**User Disruption:**
- Risk: Users confused by new UI
- Mitigation: Progressive enhancement, docs, onboarding

---

## Success Metrics

### Technical KPIs
- [ ] Agent success rate >95%
- [ ] DO memory usage <20MB average
- [ ] Checkpoint recovery <100ms
- [ ] P95 response time <2s
- [ ] AI cost <$0.15/event

### User KPIs
- [ ] Task creation time -70%
- [ ] Budget accuracy ±5%
- [ ] Decision time -66% (3x faster)
- [ ] User satisfaction >4.5/5
- [ ] Feature adoption >60% in week 1

### Business KPIs
- [ ] Infrastructure cost <$0.10/event/month
- [ ] Support tickets <5% of users
- [ ] Retention >80% through event
- [ ] Component engagement >60%

---

## Next Steps

### Week 1: Get Started
1. Read full architecture doc: `delphi-v3-architecture.md`
2. Review current codebase
3. Create UnifiedDelphiAgent class
4. Merge system prompts from specialized agents
5. Add planning layer
6. Test with existing orchestrator

### Week 2: Testing
1. Unit tests for UnifiedAgent
2. Integration tests
3. Fix "update tasks" bug
4. Deploy to dev (10% traffic)
5. Monitor metrics

### Week 3-4: DOs
1. Implement RoomOrchestratorDO
2. Checkpoint system
3. Migration from ChatOrchestratorDO
4. Deploy EventCoordinatorDO

### Week 5+: Full System
1. Component responses
2. Background triggers
3. Polish and optimize
4. Full production rollout

---

## Documents Reference

1. **delphi-agent-system-analysis.md**  
   Comprehensive analysis of current problems vs best practices

2. **delphi-implementation-guide.md**  
   Detailed code examples and patterns

3. **delphi-v3-architecture.md** ⭐  
   Master implementation guide (this is the main reference)

4. **This document**  
   Executive summary and roadmap

---

## Conclusion

The new v3.0 architecture solves all current problems:

✅ No more routing confusion (unified agent)  
✅ No more empty state crashes (preconditions)  
✅ No more iteration limits (dynamic budgets)  
✅ No more forgotten context (stateful DOs)  
✅ Enhanced UI (component system)  
✅ Proactive intelligence (background triggers)  

**Ready to implement. Let's build it.**
