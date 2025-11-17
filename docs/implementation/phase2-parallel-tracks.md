# Phase 2: Parallel Implementation Tracks

**Master Prompt Document**
**Version:** 1.0
**Date:** November 15, 2025
**Reference:** `docs/implementation/phase2-agent-orchestration.md`

---

## How to Use This Document

Each track below is **independent** and can be assigned to a separate agent. To start work on a track:

```
@agent I need you to implement Track [NUMBER] from phase2-parallel-tracks.md
```

**Key Principles:**
- Each track references specific line ranges from `phase2-agent-orchestration.md`
- Agents should explore the codebase to understand current implementation
- Minimal context provided - agents gather what they need
- Tracks are designed to minimize dependencies

---

## Track 1: Message Threading Schema & Backend

**Goal:** Add message threading support to Convex schema and mutations

**Reference:** Lines 147-433 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Update `web/convex/schema.ts` - Add threading fields to messages table (lines 183-203)
2. Update `web/convex/messages.ts` - Modify `send` mutation for threading (lines 352-395)
3. Add `getThread` query to `web/convex/messages.ts` (lines 1323-1363)
4. Test threading with Convex dashboard

**Key Fields to Add:**
- `parentMessageId`, `threadId`, `replyCount`, `aiMetadata`
- Indexes: `by_thread`, `by_parent`

**Context Gathering:**
- Read current `web/convex/schema.ts` to understand existing structure
- Read current `web/convex/messages.ts` to see existing mutations
- Check how messages are currently queried

**Dependencies:** None - can start immediately

**Estimated Time:** 2-3 hours

---

## Track 2: Tool System Framework

**Goal:** Build the tool infrastructure (interfaces + implementations)

**Reference:** Lines 436-758 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Create `agent-worker/src/tools/index.ts` - Tool interfaces (lines 446-471)
2. Create `agent-worker/src/tools/ConvexCRUDTool.ts` (lines 475-636)
3. Create `agent-worker/src/tools/FirecrawlTool.ts` (lines 640-757)
4. Test each tool independently

**Key Interfaces:**
- `Tool`, `ToolResult`, `ToolContext`

**Context Gathering:**
- Explore `web/convex/` to understand available mutations (tasks, expenses, vendors)
- Check `agent-worker/wrangler.toml` for environment variables
- Review Convex API docs if needed

**Dependencies:**
- Needs Convex mutations to exist (tasks, expenses, vendors)
- If they don't exist, create minimal stubs or note in implementation

**Estimated Time:** 3-4 hours

---

## Track 3: Base Agent Architecture

**Goal:** Create the foundational agent class and interfaces

**Reference:** Lines 760-911 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Create `agent-worker/src/agents/BaseAgent.ts` (lines 771-911)
2. Implement `AgentContext`, `AgentResponse` interfaces
3. Implement `handle()` method with AI calling logic
4. Test with a simple mock agent

**Key Features:**
- Abstract base class with tool integration
- AI API calling (Claude Haiku 4.5)
- Tool execution flow
- Response formatting

**Context Gathering:**
- Check existing `agent-worker/src/durable-objects/ChatOrchestratorDO.ts` for AI calling patterns
- Look for existing AI integration code
- Review environment variables for API keys

**Dependencies:**
- Track 2 (Tool interfaces) should be done first
- Can use mock tools if Track 2 not ready

**Estimated Time:** 3-4 hours

---

## Track 4: Specialized Agent Implementations

**Goal:** Build all 4 specialized agents (Task, Budget, Vendor, Event)

**Reference:** Lines 913-1123 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Create `agent-worker/src/agents/TaskAgent.ts` (lines 917-958)
2. Create `agent-worker/src/agents/BudgetAgent.ts` (lines 964-1012)
3. Create `agent-worker/src/agents/VendorAgent.ts` (lines 1017-1069)
4. Create `agent-worker/src/agents/EventAgent.ts` (lines 1074-1123)

**Key Requirements:**
- Each agent extends BaseAgent
- Unique system prompts for each agent type
- Proper tool assignment per agent
- Intent declaration

**Context Gathering:**
- Understand event planning domain if needed
- Review system prompt examples in doc
- Check what tools each agent needs

**Dependencies:**
- Track 3 (BaseAgent) must be complete
- Track 2 (Tools) should be ready

**Estimated Time:** 4-5 hours

---

## Track 5: Intent Router & DO Integration

**Goal:** Update ChatOrchestratorDO to route messages to specialized agents

**Reference:** Lines 1127-1310 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Update `agent-worker/src/durable-objects/ChatOrchestratorDO.ts`
   - Add agent initialization (lines 1150-1173)
   - Add intent detection (lines 1175-1200)
   - Update `handleAgentInvoke` (lines 1202-1309)
2. Add thread context assembly logic (lines 1240-1260)
3. Test routing with different message types

**Key Features:**
- Keyword-based intent detection
- Agent map initialization
- Thread context fetching
- Response with metadata

**Context Gathering:**
- Read existing `ChatOrchestratorDO.ts` thoroughly
- Understand current request handling flow
- Check how Convex client is currently used

**Dependencies:**
- Track 2, 3, 4 should be complete
- Can mock agents for early testing

**Estimated Time:** 3-4 hours

---

## Track 6: Frontend Threading Components

**Goal:** Add Reply functionality and thread UI to frontend

**Reference:** Lines 1314-1437 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Update `web/src/components/messages/message-item.tsx` (lines 207-268)
   - Add Reply button
   - Add thread indicators
   - Add reply count display
2. Update `web/src/components/messages/message-input.tsx` (lines 273-349)
   - Add reply context banner
   - Handle thread state
3. Update `web/src/hooks/useAgentInvoke.ts` (lines 1367-1437)
   - Add `parentMessageId` parameter

**Key Features:**
- Visual thread indicators
- Reply context UI
- Thread state management

**Context Gathering:**
- Read existing message components to understand structure
- Check current styling patterns
- Review how agent invocation currently works

**Dependencies:**
- Track 1 (Backend threading) should be complete
- Can build UI first and wire up later

**Estimated Time:** 3-4 hours

---

## Track 7: Convex CRUD Endpoints (Support Track)

**Goal:** Ensure required Convex mutations exist for tools

**Reference:** Lines 1673-1675 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Verify/create `web/convex/tasks.ts` - CRUD operations
2. Verify/create `web/convex/expenses.ts` - CRUD operations
3. Verify/create `web/convex/vendors.ts` - CRUD operations
4. Add proper auth checks and validation

**Operations Needed:**
- `create`, `update`, `delete` mutations
- `listByRoom`, `listByEvent` queries
- Proper schema definitions

**Context Gathering:**
- Check if these files already exist
- Review existing CRUD patterns in codebase
- Look at current schema definitions

**Dependencies:** None - can start immediately

**Estimated Time:** 2-3 hours

---

## Integration & Testing Track

**Goal:** Wire everything together and test end-to-end

**Reference:** Lines 1441-1621 in `phase2-agent-orchestration.md`

**Deliverables:**
1. Integration testing following checklist (lines 1443-1474)
2. Run real scenario test (lines 1477-1500)
3. Fix integration issues
4. Verify all success criteria (lines 1591-1621)

**Test Scenarios:**
- Threading works end-to-end
- Each agent type responds correctly
- Tools execute successfully
- Data persists to Convex

**Context Gathering:**
- Review demo script (lines 1504-1588)
- Understand expected behavior
- Set up test data

**Dependencies:** All tracks 1-7 must be complete

**Estimated Time:** 4-6 hours

---

## Dependency Graph

```
Track 1 (Schema) ─┐
                  ├──> Track 6 (Frontend)
Track 7 (CRUD) ───┤
                  │
                  └──> Track 2 (Tools) ──> Track 3 (BaseAgent) ──> Track 4 (Agents) ──> Track 5 (Router)
                                                                                              │
                                                                                              ▼
                                                                                      Integration Testing
```

**Recommended Parallel Execution:**

**Phase 1 (Start Together):**
- Track 1 (Schema)
- Track 7 (CRUD)

**Phase 2 (After Phase 1):**
- Track 2 (Tools)
- Track 6 (Frontend) - can start if Track 1 done

**Phase 3 (After Track 2):**
- Track 3 (BaseAgent)

**Phase 4 (After Track 3):**
- Track 4 (Agents) - all 4 agents in parallel if multiple developers
- Track 5 (Router)

**Phase 5 (After all):**
- Integration & Testing

---

## Quick Reference Commands

**Start a track:**
```bash
# Example: Assign Track 2 to an agent
@agent Implement Track 2 (Tool System Framework) from phase2-parallel-tracks.md
```

**Check dependencies:**
```bash
# Before starting Track X, verify its dependencies are complete
@agent Check if dependencies for Track X are ready
```

**Integration:**
```bash
# When ready to integrate
@agent Run integration testing following the Integration track
```

---

## Success Metrics

Each track should:
- ✅ Pass TypeScript compilation
- ✅ Have no console errors
- ✅ Include basic error handling
- ✅ Match the reference implementation from phase2-agent-orchestration.md
- ✅ Be testable independently (unit or manual)

---

**Questions?** Reference the main document at `docs/implementation/phase2-agent-orchestration.md`

**Ready to start?** Pick a track and let's build! 🚀
