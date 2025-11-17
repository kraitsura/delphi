# Delphi Agent System Overhaul - Master Implementation Prompt

**Version:** 1.0
**Date:** November 16, 2025
**Purpose:** Parallel execution guide for agent system refactor

---

## Project Context

Delphi is an event planning platform with an AI agent system that currently has critical flaws:
- 4 specialized agents causing routing confusion
- Fixed 5-iteration limit
- No state persistence between conversations
- Crashes on empty state (e.g., "update tasks" when no tasks exist)
- Keyword-based intent detection (brittle)

**Goal:** Migrate to unified, stateful agent architecture with planning layer, dynamic iteration budgets, and component-based UI.

**Tech Stack:**
- Cloudflare Workers + Durable Objects
- Convex (database + real-time sync)
- Claude AI (Anthropic API)
- TanStack Start (frontend)

---

## Reference Documents

1. **Implementation Guide** (`delphi-implementation-guide.md`)
   Concrete code patterns and immediate fixes

2. **Architecture Guide** (`delphi-v3-architecture.md`)
   Full system design and master implementation plan

3. **Summary** (`delphi-v3-summary.md`)
   Executive overview and migration roadmap

---

## Independent Execution Tracks

Each track can be executed in parallel by separate agents. Dependencies are noted where present.

---

## 🔵 TRACK 1: Unified Agent Foundation

**Goal:** Create single UnifiedDelphiAgent to replace 4 specialized agents

**Dependencies:** None (can start immediately)

**Reference:**
- `delphi-v3-architecture.md` lines 298-386 (Agent System Design)
- `delphi-implementation-guide.md` lines 541-784 (UnifiedDelphiAgent implementation)
- `delphi-v3-summary.md` lines 107-122 (Phase 1 goals)

**Tasks:**
1. Create `agent-worker/src/agents/UnifiedDelphiAgent.ts`
2. Implement base class extending `BaseAgent`
3. Merge system prompts from 4 specialized agents:
   - Find existing: `agent-worker/src/agents/*Agent.ts`
   - Combine capabilities into unified prompt (see lines 564-705 in implementation guide)
4. Implement `getSystemPrompt()` with:
   - Event context display (lines 707-732)
   - Tool documentation with examples (lines 584-644)
   - Workflow instructions (lines 646-675)
   - Contextual rules based on state (lines 734-778)
5. Add tool initialization in constructor (lines 554-562)

**Validation:**
- Agent can be instantiated
- System prompt includes all domain capabilities (tasks, budgets, vendors, search)
- Prompt adapts to event state (shows warnings for empty state)

**Files to Create:**
- `agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Files to Modify:**
- None (this track is purely additive)

---

## 🟢 TRACK 2: Precondition Validation & Intent Detection

**Goal:** Add AI-based intent detection and precondition checking to prevent crashes

**Dependencies:** None (can start immediately, integrates with Track 1 later)

**Reference:**
- `delphi-implementation-guide.md` lines 18-110 (Immediate Fix)
- `delphi-implementation-guide.md` lines 113-216 (AI Intent Detection)
- `delphi-v3-architecture.md` lines 679-750 (Intent Detection design)

**Tasks:**
1. Add `validateRequest()` method to `ChatOrchestratorDO.ts`
   - Implementation pattern: lines 25-77 in implementation guide
   - Validate preconditions for each intent type
   - Return helpful messages when conditions not met
2. Implement `detectIntentWithAI()` method
   - Implementation: lines 120-199 in implementation guide
   - Use Claude Haiku for fast intent classification
   - Extract entities and confidence scores
   - Handle JSON parsing robustly
3. Add type definitions:
   - `ValidationResult` (lines 104-109)
   - `IntentResult` (lines 205-215)
4. Update `invoke()` method in orchestrator (lines 80-98)
   - Call validation before agent execution
   - Return early with suggestions if invalid

**Validation:**
- "Show me my tasks" with 0 tasks → helpful message, no crash
- "Update tasks" with 0 tasks → suggests creating tasks first
- "Show budget" with no budget → asks user to set budget
- Intent detection accuracy >70% on test cases

**Files to Modify:**
- `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`

---

## 🟡 TRACK 3: State Management & Execution Tracking

**Goal:** Add state tracking to agent execution for multi-step awareness

**Dependencies:** Track 1 (requires BaseAgent to exist)

**Reference:**
- `delphi-implementation-guide.md` lines 219-366 (State-Aware Execution)
- `delphi-implementation-guide.md` lines 372-537 (Dynamic Iteration Budget)
- `delphi-v3-architecture.md` lines 754-821 (State Management)

**Tasks:**
1. Add `ExecutionState` interface and class to `BaseAgent.ts`
   - Schema: lines 226-234 in implementation guide
   - Track: tasksCreated, tasksQueried, budgetData, vendorsFound, errors
2. Implement state tracking methods:
   - `buildStateAwarePrompt()` (lines 245-276)
   - `formatExecutionState()` (lines 278-308)
   - `updateState()` (lines 310-343)
   - `generateProgressSummary()` (lines 345-365)
3. Add iteration budget system:
   - `getIterationConfig()` (lines 386-456)
   - Define configs for different intent types
   - Query: 3 iterations, Create: 5, Bulk: 20, Planning: 25
4. Update `handle()` method (lines 458-536):
   - Use dynamic config instead of fixed limit
   - Track reasoning vs action budget
   - Update state after each tool execution
   - Check if goal achieved early
5. Implement `isGoalAchieved()` (lines 517-536)

**Validation:**
- Agent remembers created tasks across iterations
- Doesn't create duplicate tasks
- Stops early when goal met (not always max iterations)
- Different request types get appropriate iteration budgets
- Progress summary accurate and helpful

**Files to Modify:**
- `agent-worker/src/agents/BaseAgent.ts`

**Files to Create:**
- Type definitions can go in `agent-worker/src/agents/types.ts`

---

## 🔴 TRACK 4: Multi-Task Creation Helper

**Goal:** Enable bulk task creation without hitting iteration limits

**Dependencies:** Track 1 and Track 3 (requires UnifiedAgent + state tracking)

**Reference:**
- `delphi-implementation-guide.md` lines 863-1029 (MultiTaskCreator)
- `delphi-v3-architecture.md` lines 420-443 (Bulk operations)

**Tasks:**
1. Create `agent-worker/src/agents/helpers/MultiTaskCreator.ts`
2. Implement `MultiTaskCreator` class (lines 868-1011):
   - Constructor takes agent and context
   - `createMultipleTasks()` method (lines 874-941)
   - Batch limit of 15 tasks
   - Sequential creation with progress tracking
3. Implement helper methods:
   - `buildTaskCreationPrompt()` (lines 943-987)
   - `buildSummaryMessage()` (lines 989-1010)
4. Add type definitions (lines 1013-1028)
5. Integrate with UnifiedDelphiAgent:
   - Detect multi-task requests
   - Delegate to MultiTaskCreator
   - Return batch results

**Validation:**
- Can create 10 tasks in one request
- Shows progress (3/10 created...)
- Handles partial failures gracefully
- Doesn't exceed max batch size
- Returns summary of created vs failed tasks

**Files to Create:**
- `agent-worker/src/agents/helpers/MultiTaskCreator.ts`

**Files to Modify:**
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (integration)

---

## 🟣 TRACK 5: RoomOrchestratorDO Implementation

**Goal:** Create stateful Durable Object for per-room conversation persistence

**Dependencies:** Track 1 (requires UnifiedDelphiAgent)

**Reference:**
- `delphi-v3-architecture.md` lines 184-246 (RoomOrchestratorDO spec)
- `delphi-v3-architecture.md` lines 1207-1260 (DO State Persistence pattern)
- `delphi-v3-architecture.md` lines 1262-1294 (Agent Invocation pattern)
- `delphi-v3-summary.md` lines 125-140 (Phase 2 goals)

**Tasks:**
1. Create `agent-worker/src/durable-objects/RoomOrchestratorDO.ts`
2. Implement state schema (lines 189-216 in architecture):
   - roomId, eventId, roomType
   - messageHistory (last 200 messages)
   - messageSummary (compressed older messages)
   - activePolls
   - pendingActions
   - agentMemory
3. Implement key methods (lines 219-239):
   - `handleMessage()` - main entry point
   - `detectIntent()` - can reuse from Track 2
   - `invokeAgent()` - pattern at lines 1265-1294
   - `checkpoint()` - save state to Convex every 50 messages
   - `recover()` - load from Convex checkpoint
4. Memory management (lines 242-246):
   - Keep last 200 messages in full
   - Compress older into summary
   - Monitor memory usage
   - Prune if >80MB
5. State persistence pattern (lines 1207-1260):
   - Load state on `fetch()`
   - Process request
   - Save state after processing
   - Checkpoint periodically

**Validation:**
- DO persists state across requests
- Checkpoint created every 50 messages
- Recovery works after simulated crash
- Memory usage <20MB average
- Message history accessible in agent context

**Files to Create:**
- `agent-worker/src/durable-objects/RoomOrchestratorDO.ts`

**Files to Modify:**
- `agent-worker/wrangler.toml` (add DO binding)
- `agent-worker/src/index.ts` (route to RoomOrchestratorDO)

---

## 🟠 TRACK 6: EventCoordinatorDO Implementation

**Goal:** Create event-level coordinator for cross-room synthesis and triggers

**Dependencies:** Track 5 (works alongside RoomOrchestratorDO)

**Reference:**
- `delphi-v3-architecture.md` lines 248-296 (EventCoordinatorDO spec)
- `delphi-v3-architecture.md` lines 291-296 (Use cases)

**Tasks:**
1. Create `agent-worker/src/durable-objects/EventCoordinatorDO.ts`
2. Implement state schema (lines 252-272):
   - eventId, eventMetadata
   - roomSummaries (digest from each room)
   - globalTimeline, budgetOverview, allTasks
   - majorDecisions
   - lastTriggerCheck, activeAlerts
3. Implement synthesis methods (lines 275-289):
   - `synthesizeRoomData()` - aggregate across rooms
   - `checkTriggers()` - evaluate patterns (Phase 2)
   - `queryAllRooms()` - cross-room queries
   - `makeEventDecision()` - event-level decisions
4. Implement aggregation logic:
   - Query all rooms for event
   - Combine task counts, budget totals
   - Build event overview
5. Add Convex functions if needed:
   - `rooms:listByEvent`
   - `tasks:countByEvent`
   - `budgets:totalByEvent`

**Validation:**
- Can aggregate data from multiple rooms
- "Show all tasks across all rooms" works
- "Total budget vs spent" accurate
- Event-level queries <500ms
- Handles rooms being added/removed

**Files to Create:**
- `agent-worker/src/durable-objects/EventCoordinatorDO.ts`

**Files to Modify:**
- `agent-worker/wrangler.toml` (add DO binding)
- `agent-worker/src/index.ts` (route to EventCoordinatorDO)
- `web/convex/*.ts` (add cross-room query functions)

---

## 🔵 TRACK 7: Component Response System

**Goal:** Enable agent to return structured UI components instead of just text

**Dependencies:** Track 1 (UnifiedDelphiAgent needs to assemble components)

**Reference:**
- `delphi-v3-architecture.md` lines 389-489 (Message & Response Protocol)
- `delphi-v3-architecture.md` lines 823-875 (Response Assembly)
- `delphi-v3-architecture.md` lines 1298-1346 (Component Assembly Pattern)
- `delphi-v3-summary.md` lines 143-158 (Phase 3 goals)

**Tasks:**
1. Update Convex schema in `web/convex/schema.ts`:
   - Add response field to messages table (lines 396-442 in architecture)
   - Support type: "text" | "components" | "hybrid"
   - Add components array with position + data
2. Create component type definitions:
   - `web/src/types/components.ts`
   - ComponentLayout, ComponentType, etc.
   - See lines 1511-1522 in architecture for types
3. Implement component assembly in UnifiedDelphiAgent:
   - `assembleResponse()` function (lines 826-875)
   - Map created entities → component types
   - Calculate grid positions (12-column)
   - Pattern at lines 1300-1346
4. Create frontend component library:
   - `web/src/components/agent/TaskCard.tsx`
   - `web/src/components/agent/BudgetImpact.tsx`
   - `web/src/components/agent/VendorList.tsx`
   - `web/src/components/agent/PollCard.tsx`
5. Implement grid renderer:
   - `web/src/components/agent/ComponentGrid.tsx`
   - Render based on position (lines 502-527)
   - CSS Grid layout

**Validation:**
- Agent returns component response when creating task
- Grid layout displays correctly
- Components are interactive
- Hybrid messages show text + components
- Responsive on mobile

**Files to Create:**
- `web/src/types/components.ts`
- `web/src/components/agent/ComponentGrid.tsx`
- `web/src/components/agent/TaskCard.tsx`
- `web/src/components/agent/BudgetImpact.tsx`
- `web/src/components/agent/VendorList.tsx`
- `web/src/components/agent/PollCard.tsx`

**Files to Modify:**
- `web/convex/schema.ts` (add response field)
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (add assembleResponse)
- `web/src/components/messages/message-item.tsx` (render components)

---

## 🟢 TRACK 8: Poll System Implementation

**Goal:** Add voting/polling capability to rooms

**Dependencies:** Track 5 (RoomOrchestratorDO manages active polls), Track 7 (PollCard component)

**Reference:**
- `delphi-v3-architecture.md` lines 531-580 (Poll System)
- `delphi-v3-architecture.md` lines 236-238 (RoomOrchestratorDO poll methods)

**Tasks:**
1. Add polls schema to Convex:
   - `web/convex/schema.ts` add polls table
   - Schema: lines 534-558 in architecture
   - Fields: question, type, options, status, votes, result
2. Create poll Convex functions:
   - `web/convex/polls.ts`
   - `create`, `vote`, `close`, `getResults`
3. Add poll management to RoomOrchestratorDO:
   - `createPoll()` method
   - `recordVote()` method
   - `closePoll()` method
   - Track active polls in state
4. Add poll tool to agent:
   - `agent-worker/src/tools/PollTool.ts`
   - Integrate with UnifiedDelphiAgent
5. Create PollCard component (from Track 7):
   - Display question and options
   - Real-time vote counts
   - Vote button for current user
   - Show status (active/closed)
   - Pattern at lines 561-579

**Validation:**
- Agent can create poll from request
- Users can vote via UI
- Real-time vote updates work
- Poll closes and shows final results
- Multiple poll types work (binary, multiple choice)

**Files to Create:**
- `web/convex/polls.ts`
- `agent-worker/src/tools/PollTool.ts`

**Files to Modify:**
- `web/convex/schema.ts` (add polls table)
- `agent-worker/src/durable-objects/RoomOrchestratorDO.ts` (poll methods)
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (add poll tool)
- `web/src/components/agent/PollCard.tsx` (from Track 7)

---

## 🟡 TRACK 9: Background Trigger System

**Goal:** Proactive suggestions based on event patterns and deadlines

**Dependencies:** Track 6 (EventCoordinatorDO), can be done later (Phase 4)

**Reference:**
- `delphi-v3-architecture.md` lines 879-1003 (Background Processing)
- `delphi-v3-architecture.md` lines 1005-1047 (Pattern Matching)
- `delphi-v3-summary.md` lines 161-175 (Phase 4 goals)

**Tasks:**
1. Define trigger patterns:
   - Create `agent-worker/src/triggers/definitions.ts`
   - Pattern library at lines 1009-1027
   - Trigger definitions at lines 905-937
   - Types: deadline_approaching, budget_threshold, missing_vendor, etc.
2. Implement trigger evaluation in EventCoordinatorDO:
   - `checkTriggers()` method (lines 972-1002)
   - `evaluateTrigger()` for each type
   - `buildSystemMessage()` from trigger
   - Mark triggers as fired (no spam)
3. Create Cron worker:
   - `agent-worker/src/scheduled.ts`
   - Runs every 1 hour
   - Pattern at lines 941-967
   - Check all active events
   - Create system messages for matches
4. Add pattern pre-filtering in Worker:
   - Quick regex checks before AI
   - Pattern at lines 1030-1047
   - Save costs on simple messages
5. Configure cron in `wrangler.toml`:
   - Add scheduled event handler
   - Set interval to "0 * * * *" (hourly)

**Validation:**
- Triggers fire for test scenarios
- "Photography 6 months before event" → suggestion
- "Budget >80%" → alert
- No duplicate triggers (debouncing works)
- False positive rate <10%
- System messages appear in correct rooms

**Files to Create:**
- `agent-worker/src/triggers/definitions.ts`
- `agent-worker/src/scheduled.ts`

**Files to Modify:**
- `agent-worker/src/durable-objects/EventCoordinatorDO.ts` (add checkTriggers)
- `agent-worker/wrangler.toml` (add cron schedule)
- `web/convex/messages.ts` (support system messages)

---

## 🔴 TRACK 10: Orchestrator Migration & Integration

**Goal:** Integrate all pieces and migrate from ChatOrchestratorDO to new system

**Dependencies:** Tracks 1, 2, 3, 5 (requires UnifiedAgent, validation, state, RoomDO)

**Reference:**
- `delphi-implementation-guide.md` lines 786-858 (Migration code)
- `delphi-v3-summary.md` lines 196-227 (Migration Strategy)
- `delphi-v3-architecture.md` lines 1053-1122 (Migration Path)

**Tasks:**
1. Update ChatOrchestratorDO to use UnifiedDelphiAgent:
   - Remove specialized agent routing
   - Replace with single agent call
   - Pattern at lines 791-858 in implementation guide
2. Add context enrichment:
   - `getTaskCount()`, `checkBudgetExists()`, `getVendorCount()`
   - Build rich AgentContext
   - Lines 808-857
3. Implement feature flag in Worker:
   - `USE_V3_ARCHITECTURE` env var
   - Gradual rollout logic
   - Pattern at lines 1114-1120 in architecture
4. Create migration helper functions:
   - Copy state from old DO to new DO
   - Backfill checkpoints
5. Add monitoring:
   - Log success/failure rates
   - Track iteration counts
   - Monitor costs
   - Pattern at lines 1137-1153 in implementation guide

**Validation:**
- Old system still works with flag off
- New system works with flag on
- Can toggle between systems
- Metrics show improvement:
  - Success rate >95% (was ~60%)
  - Handles empty state gracefully
  - Dynamic iterations working
- No data loss during migration

**Files to Modify:**
- `agent-worker/src/durable-objects/ChatOrchestratorDO.ts` (use UnifiedAgent)
- `agent-worker/src/index.ts` (add feature flag routing)
- `agent-worker/.dev.vars.example` (add USE_V3_ARCHITECTURE)

---

## 🟣 TRACK 11: Testing & Validation

**Goal:** Comprehensive test coverage for new system

**Dependencies:** All other tracks (tests the complete system)

**Reference:**
- `delphi-v3-architecture.md` lines 1350-1440 (Testing Strategy)
- `delphi-implementation-guide.md` lines 1100-1129 (Testing Script)
- `delphi-v3-summary.md` lines 348-369 (Success Metrics)

**Tasks:**
1. Create unit tests:
   - `agent-worker/test/UnifiedDelphiAgent.test.ts`
   - Test planning phase (lines 1388-1412)
   - Test precondition detection
   - Test state tracking
2. Create DO tests:
   - `agent-worker/test/RoomOrchestratorDO.test.ts`
   - Test state persistence (lines 1356-1382)
   - Test checkpoint/recovery
   - Test memory management
3. Create integration tests:
   - End-to-end flow (lines 1418-1440)
   - User message → agent response → UI render
   - Poll creation and voting
   - Multi-room queries
4. Create test scripts:
   - `agent-worker/scripts/test-scenarios.sh`
   - Empty state handling (lines 1103-1107)
   - Task creation (lines 1109-1114)
   - Multi-task creation (lines 1116-1122)
   - Complex planning (lines 1124-1128)
5. Performance tests:
   - Load testing with realistic message volume
   - Memory profiling
   - Cost analysis

**Success Criteria:**
(From lines 348-369 in summary)
- [ ] Agent success rate >95%
- [ ] DO memory usage <20MB average
- [ ] Checkpoint recovery <100ms
- [ ] P95 response time <2s
- [ ] AI cost <$0.15/event
- [ ] Task creation time -70%
- [ ] Component engagement >60%

**Files to Create:**
- `agent-worker/test/UnifiedDelphiAgent.test.ts`
- `agent-worker/test/RoomOrchestratorDO.test.ts`
- `agent-worker/test/integration/message-flow.test.ts`
- `agent-worker/scripts/test-scenarios.sh`

---

## 🟠 TRACK 12: Documentation & Polish

**Goal:** Production-ready documentation and error handling

**Dependencies:** All tracks complete

**Reference:**
- `delphi-v3-architecture.md` lines 1444-1481 (Monitoring)
- `delphi-v3-architecture.md` lines 1485-1503 (Future Enhancements)
- `delphi-v3-summary.md` lines 178-194 (Phase 5 goals)

**Tasks:**
1. Add structured logging:
   - Pattern at lines 1470-1481
   - Log all key events with context
   - Include metrics (processing time, memory, etc.)
2. Create monitoring dashboard queries:
   - Success rate by intent
   - Average iterations per request
   - Cost per event
   - Error breakdown
3. Error handling improvements:
   - Graceful degradation
   - Retry logic with backoff
   - User-friendly error messages
4. Write documentation:
   - `docs/AGENT_SYSTEM.md` - How it works
   - `docs/DEPLOYMENT.md` - How to deploy
   - `docs/TROUBLESHOOTING.md` - Common issues
5. Code cleanup:
   - Remove old specialized agents
   - Archive deprecated code
   - Update comments
   - Format consistently

**Deliverables:**
- Monitoring dashboard
- Complete documentation
- Production-ready error handling
- Clean codebase

**Files to Create:**
- `docs/AGENT_SYSTEM.md`
- `docs/DEPLOYMENT.md`
- `docs/TROUBLESHOOTING.md`

**Files to Modify:**
- Add logging throughout all agent files
- Clean up deprecated code

---

## Execution Strategy

### Parallel Execution Groups

**GROUP A - Foundation (Start First):**
- Track 1: Unified Agent Foundation
- Track 2: Precondition Validation & Intent Detection
- Track 3: State Management & Execution Tracking

**GROUP B - Infrastructure (After Group A):**
- Track 5: RoomOrchestratorDO Implementation (needs Track 1)
- Track 6: EventCoordinatorDO Implementation (independent)
- Track 4: Multi-Task Creation Helper (needs Tracks 1, 3)

**GROUP C - UI & Features (After Group A, parallel with B):**
- Track 7: Component Response System (needs Track 1)
- Track 8: Poll System Implementation (needs Tracks 5, 7)

**GROUP D - Advanced (After Group B):**
- Track 9: Background Trigger System (needs Track 6)
- Track 10: Orchestrator Migration & Integration (needs Tracks 1, 2, 3, 5)

**GROUP E - Completion (Last):**
- Track 11: Testing & Validation (needs all)
- Track 12: Documentation & Polish (needs all)

### Recommended Agent Assignment

**4 Agents (Optimal):**
- Agent 1: Tracks 1, 4, 10
- Agent 2: Tracks 2, 5, 11
- Agent 3: Tracks 3, 6, 9
- Agent 4: Tracks 7, 8, 12

**3 Agents (Minimum):**
- Agent 1: Tracks 1, 2, 5, 10
- Agent 2: Tracks 3, 4, 6, 9
- Agent 3: Tracks 7, 8, 11, 12

**6 Agents (Maximum Parallelism):**
- Agent 1: Tracks 1, 10
- Agent 2: Tracks 2, 11
- Agent 3: Tracks 3, 9
- Agent 4: Tracks 4, 12
- Agent 5: Tracks 5, 7
- Agent 6: Tracks 6, 8

---

## Success Validation

After all tracks complete, verify:

**Technical Metrics:**
- [ ] All tests passing (Track 11)
- [ ] Agent success rate >95%
- [ ] No empty state crashes
- [ ] Multi-task creation works (10+ tasks)
- [ ] State persists across DO restarts
- [ ] Components render correctly
- [ ] Polls functional
- [ ] Background triggers fire accurately

**Code Quality:**
- [ ] No TODO comments
- [ ] All TypeScript types defined
- [ ] Consistent formatting
- [ ] Documentation complete
- [ ] No deprecated code remaining

**Deployment:**
- [ ] Feature flag working
- [ ] Gradual rollout plan ready
- [ ] Rollback procedure tested
- [ ] Monitoring dashboard live

---

## Emergency Rollback Plan

If critical issues arise:

1. **Quick Rollback** (5 minutes)
   - Set `USE_V3_ARCHITECTURE=false` in env
   - Redeploy worker
   - Old system takes over

2. **Gradual Rollback** (if partial failure)
   - Reduce rollout percentage: 100% → 50% → 10% → 0%
   - Monitor error rates at each step
   - Fix issues in parallel
   - Re-enable when stable

3. **Data Recovery** (if state corruption)
   - Load from Convex checkpoints
   - Replay recent messages
   - Manual correction if needed

---

## Final Notes

- Each track has clear inputs, outputs, and validation criteria
- Tracks are designed to minimize merge conflicts
- Reference line numbers for quick context lookup
- Test continuously, don't wait until Track 11
- Ask questions early if anything is unclear

**Ready to execute. Choose your track(s) and begin!**
