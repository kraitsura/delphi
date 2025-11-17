# Delphi Agent System v3.1 - Master Implementation Prompt

**Version:** 3.1 (Refined Architecture)
**Date:** November 16, 2025
**Purpose:** Parallel execution guide for v3.1 proposal-based, simplified architecture

---

## 🎯 Architecture Overview

You've implemented through Track 6 of the old v3.0 architecture. Now we're **pivoting to v3.1** with three major changes:

### 1. **Proposal System** (NEW)
Instead of iterative execution, agent returns **proposed actions** for user review:
- User: "Create tasks for photographer, caterer, DJ"
- Agent: Returns proposal with 3 tasks
- User: Reviews → Accept/Edit/Reject
- System: Batch creates all at once

### 2. **Context-Aware Intent** (ENHANCED)
Pragmatic interpretation of user messages:
- "Update tasks" with 0 tasks → Create from conversation commitments
- Considers conversation history and room state
- Extracts implicit action items

### 3. **Simplified DO Architecture** (MAJOR)
- **ONE DO type**: `RoomOrchestratorDO` for ALL room types
- **NO EventCoordinatorDO** (background triggers in worker instead)
- Room type (`main`/`vendor`/`brainstorm`/`private`) determines behavior
- Much simpler, consistent architecture

---

## 📚 Reference Documents

**PRIMARY REFERENCES:**
1. **v3.1 Refined Architecture** (`delphi-v3.1-refined-architecture.md`) ⭐
   - Lines 35-521: Proposal System implementation
   - Lines 525-793: Context-Aware Intent Detection
   - Lines 796-1243: Simplified DO Architecture
   - Lines 1247-1412: Migration Guide

2. **Implementation Guide** (`delphi-implementation-guide.md`)
   - Lines 18-110: Precondition validation patterns
   - Lines 113-216: AI intent detection base
   - Lines 541-784: UnifiedDelphiAgent structure

**Tech Stack:**
- Cloudflare Workers + Durable Objects
- Convex (database + real-time sync)
- Claude Haiku 4.5 (fast intent) + Sonnet (complex tasks)
- TanStack Start (frontend)

---

## 🗑️ What We're Removing

These are **deprecated** from v3.0, do NOT implement:
- ❌ `EventCoordinatorDO` (Track 6 from old prompt)
- ❌ Specialized agents (`TaskAgent`, `BudgetAgent`, `VendorAgent`, `EventAgent`)
- ❌ Multi-DO coordination patterns
- ❌ Iteration-based batch creation (`MultiTaskCreator` helper)

---

## 🚀 Independent Execution Tracks

Each track can be executed in parallel. Dependencies noted.

---

## 🔵 TRACK 1: Proposal System Foundation

**Goal:** Implement proposal-confirm-execute flow for batch operations

**Dependencies:** None (can start immediately)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 35-91 (Proposal System concept)
- `delphi-v3.1-refined-architecture.md` lines 92-128 (Schema)
- `delphi-v3.1-refined-architecture.md` lines 130-193 (Agent implementation)

**Tasks:**

1. **Add Proposals Schema to Convex**
   ```typescript
   // web/convex/schema.ts
   ```
   - Add `proposals` table (lines 92-128 in v3.1)
   - Fields: `roomId`, `eventId`, `proposalType`, `items`, `status`, `messageId`, `expiresAt`
   - Indexes: `by_room`, `by_message`
   - Types: `tasks`, `budget_entries`, `vendor_suggestions`
   - Status: `pending`, `accepted`, `rejected`, `expired`

2. **Create Proposal Mutations**
   ```typescript
   // web/convex/proposals.ts
   ```
   - `confirm` mutation (lines 437-464 in v3.1)
   - Forwards to worker with `proposalId`, `action`, `editedItems`
   - Actions: `accept_all`, `edit`, `reject`

3. **Update UnifiedDelphiAgent to Generate Proposals**
   ```typescript
   // agent-worker/src/agents/UnifiedDelphiAgent.ts
   ```
   - Modify `handle()` method (lines 136-156)
   - Detect multi-create scenarios: `createSteps.length > 1`
   - Return proposal instead of executing
   - Implement `buildProposal()` (lines 158-193)
   - Include `requiresConfirmation: true` flag
   - 5-minute expiration: `Date.now() + (5 * 60 * 1000)`

**Validation:**
- Agent detects "Create 3 tasks" → returns proposal
- Proposal includes metadata: `proposalId`, `proposedItems`, `expiresAt`
- Response type is `components` with `TaskProposalCard`
- Single creates still execute immediately (no proposal)

**Files to Create:**
- `web/convex/proposals.ts`

**Files to Modify:**
- `web/convex/schema.ts` (add proposals table)
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (proposal logic)

---

## 🟢 TRACK 2: Context-Aware Intent Detection

**Goal:** Implement pragmatic intent detection that considers conversation context

**Dependencies:** None (enhances existing intent detection)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 525-613 (Pragmatic Intent Detection)
- `delphi-v3.1-refined-architecture.md` lines 675-727 (Conversation Context Extraction)
- `delphi-v3.1-refined-architecture.md` lines 729-792 (Best Practices)

**Tasks:**

1. **Enhance Intent Detection Prompt**
   ```typescript
   // agent-worker/src/agents/UnifiedDelphiAgent.ts
   ```
   - Update `detectIntent()` method (lines 553-612 in v3.1)
   - Include room context in prompt:
     - `taskCount`, `hasBudget`, `roomType`
     - Last 10 messages from conversation
     - Extracted commitments from conversation
   - Add new intent: `sync_conversation_to_tasks` (line 582)
   - Pragmatic rules (lines 590-595):
     - "Update tasks" with 0 tasks + commitments = sync
     - "Show tasks" with 0 tasks = explain + offer to create

2. **Implement Commitment Extraction**
   ```typescript
   // agent-worker/src/agents/helpers/CommitmentExtractor.ts
   ```
   - `extractCommitments()` function (lines 702-726)
   - Pattern matching:
     - "We should...", "We need to..."
     - "Let's...", "I'll..."
     - Booking, hiring, finding, ordering mentions
     - Deadline and cost mentions
   - Returns array of commitment strings
   - Uses Claude for extraction

3. **Build Rich Room Context**
   ```typescript
   // agent-worker/src/durable-objects/RoomOrchestratorDO.ts
   ```
   - `buildRoomContext()` method (lines 687-700)
   - Includes: `roomType`, `taskCount`, `hasBudget`, `recentMessages`, `extractedCommitments`
   - Cache context per message (lines 732-749)

4. **Intent-Based Planning**
   ```typescript
   // agent-worker/src/agents/UnifiedDelphiAgent.ts
   ```
   - `planConversationSync()` method (lines 637-672)
   - Creates execution plan from extracted commitments
   - Returns proposal for multi-task sync
   - Falls back if no commitments found

**Validation:**
- "Update our tasks" with 0 tasks + recent commitments → creates tasks from conversation
- "Show me tasks" with 0 tasks → helpful message, offer to create
- Commitment extraction finds: "We should book photographer" → ["book photographer"]
- Intent confidence >0.7 for common scenarios
- Low confidence (<0.7) → asks for clarification

**Files to Create:**
- `agent-worker/src/agents/helpers/CommitmentExtractor.ts`

**Files to Modify:**
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (enhanced intent detection)
- `agent-worker/src/durable-objects/RoomOrchestratorDO.ts` (room context)

---

## 🟡 TRACK 3: Simplified RoomOrchestratorDO

**Goal:** Single DO type for all room types, simplified architecture

**Dependencies:** Track 2 (uses context-aware intent)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 796-832 (Simplified Architecture Decision)
- `delphi-v3.1-refined-architecture.md` lines 834-1095 (RoomOrchestratorDO Implementation)
- `delphi-v3.1-refined-architecture.md` lines 1098-1146 (Worker Routing)

**Tasks:**

1. **Implement Single RoomOrchestratorDO**
   ```typescript
   // agent-worker/src/durable-objects/RoomOrchestratorDO.ts
   ```
   - Complete implementation (lines 837-1095)
   - State schema (lines 842-866):
     - `roomId`, `eventId`, `roomType` (determines behavior)
     - `messageHistory` (last 200 messages)
     - `messageSummary` (compressed older messages)
     - `activePolls`, `pendingProposals` (Map)
     - `agentMemory`, `lastActivity`, `checkpointId`

2. **Core Message Handling**
   - `fetch()` method (lines 873-889): Routes based on action
   - `handleMessage()` (lines 892-924): Main flow
     1. Add to history
     2. Detect intent (context-aware)
     3. Validate preconditions
     4. Build agent context
     5. Invoke unified agent
     6. Handle response (proposals, polls)
     7. Save state + checkpoint

3. **Room-Type-Aware Context**
   - `buildAgentContext()` (lines 927-960)
   - Main room: event-wide access, all room summaries
   - Vendor room: scoped to vendor, contract status
   - Brainstorm room: standard access
   - Private room: standard access

4. **State Management**
   - `loadState()` / `saveState()` (lines 963-981)
   - Checkpoint every 50 messages (lines 983-1004)
   - Recovery from checkpoint (lines 1006-1021)
   - Memory management (lines 1024-1048):
     - Keep last 200 messages in full
     - Compress older → summary
     - Estimate memory usage
     - Prune if >80MB

5. **Proposal Management**
   - `confirmProposal()` method (lines 228-252 from earlier section)
   - `executeProposal()` (lines 254-281)
   - Batch create with `Promise.all()`
   - Cleanup after execution
   - Cleanup expired proposals (lines 284-291)

**Validation:**
- Single DO handles all room types
- Main room has `canAccessEventWide: true`
- Vendor room scoped to `vendorId`
- State persists across requests
- Checkpoint created every 50 messages
- Proposals stored in DO memory
- Memory usage <20MB average

**Files to Create:**
- `agent-worker/src/durable-objects/RoomOrchestratorDO.ts` (complete rewrite)

**Files to Modify:**
- `agent-worker/wrangler.toml` (update DO binding if needed)
- `agent-worker/src/index.ts` (simplified routing, lines 1103-1145)

---

## 🔴 TRACK 4: Frontend Message Handler for AI Responses

**Goal:** Setup frontend to render component-based AI responses using existing Fluid UI system

**Dependencies:** None (can start immediately, uses existing Fluid UI)

**What We Found:**
Your codebase already has a complete **Fluid UI framework** (`web/src/lib/fluid-ui/`) with:
- Grid layout system with flexible ratios (not 12-column, better!)
- Component registry and metadata system
- TextRow and GridRow renderers
- Dashboard components (TasksList, PollsList, etc.)
- Event bus and Zustand store

**What's Missing:**
- Message schema doesn't support `responseType` or `responseConfig`
- MessageItem component only renders text (ChatBubble)
- No MessageResponseRenderer to use Fluid UI in messages
- No message-specific components registered (TaskProposalCard, etc.)
- Agent response structure is just `string`, not structured

**Tasks:**

1. **Extend Message Schema**
   ```typescript
   // web/convex/schema.ts (add to messages table around line 349)
   ```
   Add optional fields:
   ```typescript
   responseType: v.optional(v.union(
     v.literal("text"),        // Current: plain markdown
     v.literal("components"),   // New: Fluid UI components only
     v.literal("hybrid")        // New: text + components
   )),
   responseConfig: v.optional(v.object({
     sections: v.array(v.any())  // DashboardConfig from Fluid UI
   })),
   ```

2. **Create MessageResponseRenderer Component**
   ```typescript
   // web/src/components/messages/MessageResponseRenderer.tsx (NEW)
   ```
   - Accepts `responseConfig: DashboardConfig`
   - Uses existing `TextRow` and `GridRow` from Fluid UI
   - Wraps in message bubble styling
   - Handles component rendering with registry
   - **Pattern:** Similar to `/web/src/components/dashboard/dashboard-renderer.tsx`
   - Key difference: Applies message-specific styling (max-width, padding, etc.)

3. **Update MessageItem Component**
   ```typescript
   // web/src/components/messages/message-item.tsx (line ~100)
   ```
   - After checking `isAIGenerated`, check `message.responseType`
   - If `responseType === "text"` or undefined → use `ChatBubble` (current)
   - If `responseType === "components"` or `"hybrid"`:
     ```tsx
     {message.responseType === "hybrid" && message.text && (
       <ChatBubble message={message} {...props} />
     )}
     {message.responseConfig && (
       <MessageResponseRenderer config={message.responseConfig} />
     )}
     ```

4. **Create Initial Message Components**
   ```typescript
   // web/src/components/message-components/ (NEW directory)
   ```
   Create compact versions for message rendering (NOT dashboard):
   - `TaskProposalCard.tsx` - Displays proposed task with Accept/Edit/Reject
   - `BudgetSummaryCard.tsx` - Quick budget overview (compact)
   - `PollWidgetCompact.tsx` - Inline poll voting
   - `VendorCardCompact.tsx` - Vendor info card

   **Design constraints:**
   - Max width: 400-500px (fits in message bubble)
   - Compact: minimal padding, smaller fonts
   - Interactive: buttons for actions (Accept, Vote, etc.)
   - Uses Convex mutations for actions
   - Each accepts: `eventId`, `roomId` for context

5. **Register Message Components**
   ```typescript
   // web/src/lib/fluid-ui/message-components-init.ts (NEW)
   ```
   Register components with metadata:
   ```typescript
   import { registerComponent } from "./registry";
   import TaskProposalCard from "@/components/message-components/TaskProposalCard";

   registerComponent("TaskProposalCard", TaskProposalCard, {
     name: "Task Proposal",
     description: "Task creation proposal for agent responses",
     layoutRules: {
       canShare: true,
       mustSpanFull: false,
       preferredRatio: "1fr",
       minWidth: "300px",
       minHeight: "200px"
     },
     props: {
       proposalId: { type: "string", required: true },
       tasks: { type: "array", required: true },
       eventId: { type: "string", required: true },
       roomId: { type: "string", required: true }
     }
   });
   ```
   Call this init from app entry point

6. **Update Agent Response Structure**
   ```typescript
   // agent-worker/src/agents/UnifiedDelphiAgent.ts
   ```
   Modify response to include structured format:
   ```typescript
   return {
     success: true,
     responseType: "hybrid",  // or "components" or "text"
     text: "I've created a proposal with 3 tasks:",
     responseConfig: {
       sections: [
         {
           type: "row",
           layout: "1:1",
           components: [
             {
               type: "TaskProposalCard",
               props: {
                 proposalId: "prop_123",
                 tasks: [...],
                 eventId: context.eventId,
                 roomId: context.roomId
               }
             }
           ]
         }
       ]
     }
   };
   ```

7. **Update useAgentInvoke Hook**
   ```typescript
   // web/src/hooks/useAgentInvoke.ts
   ```
   - Update `AgentInvokeResponse` interface to include:
     ```typescript
     interface AgentInvokeResponse {
       success: boolean;
       responseType?: "text" | "components" | "hybrid";
       text?: string;
       responseConfig?: DashboardConfig;
       // ... existing fields
     }
     ```
   - Update message creation to include new fields

8. **Update Message Send Mutation**
   ```typescript
   // web/convex/messages.ts (send mutation)
   ```
   - Add optional args: `responseType`, `responseConfig`
   - Store in message document when creating AI messages

**Validation:**
- Message schema has `responseType` and `responseConfig` fields
- MessageResponseRenderer renders Fluid UI configs correctly
- TaskProposalCard displays in message and is interactive
- Agent can return structured responses
- Message with `responseType: "components"` displays grid layout
- Message with `responseType: "hybrid"` shows text + components
- Components registered and discoverable via registry

**Files to Create:**
- `web/src/components/messages/MessageResponseRenderer.tsx`
- `web/src/components/message-components/TaskProposalCard.tsx`
- `web/src/components/message-components/BudgetSummaryCard.tsx`
- `web/src/components/message-components/PollWidgetCompact.tsx`
- `web/src/components/message-components/VendorCardCompact.tsx`
- `web/src/lib/fluid-ui/message-components-init.ts`

**Files to Modify:**
- `web/convex/schema.ts` (add responseType, responseConfig to messages)
- `web/src/components/messages/message-item.tsx` (conditional rendering)
- `web/src/hooks/useAgentInvoke.ts` (structured response handling)
- `web/convex/messages.ts` (send mutation args)
- `agent-worker/src/agents/UnifiedDelphiAgent.ts` (structured response)

**Integration with Existing Fluid UI:**
- Uses existing `TextRow` component for text sections
- Uses existing `GridRow` component for component rows
- Uses existing `ComponentRenderer` for individual components
- Uses existing `registry.ts` for component lookup
- Uses existing layout calculation from registry
- Uses existing event bus if components emit events

---

## 🟣 TRACK 5: Proposal Components (Specialized)

**Goal:** Create specialized UI components for proposal review, edit, and confirmation

**Dependencies:** Track 1 (proposals schema), Track 4 (message renderer setup)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 295-434 (TaskProposalCard Component)
- `delphi-v3.1-refined-architecture.md` lines 467-521 (Best Practices)

**Tasks:**

1. **Create TaskProposalCard Component**
   ```typescript
   // web/src/components/agent/TaskProposalCard.tsx
   ```
   - Full implementation (lines 298-417)
   - State: `editing`, `items`
   - Actions:
     - `handleAcceptAll()`: confirms with `action: 'accept_all'`
     - `handleEdit()`: enters edit mode
     - `handleSaveEdits()`: confirms with `action: 'edit'` + edited items
     - `handleReject()`: confirms with `action: 'reject'`
   - Uses `useMutation(api.proposals.confirm)`

2. **Create TaskPreview Subcomponent**
   - Display task details (lines 419-433)
   - Show: title, description, category, priority, due date
   - Visual: border-left indicator, compact layout

3. **Create TaskEditor Subcomponent**
   - Inline editing of proposed tasks
   - Fields: title, description, category, priority, due date
   - Add/remove tasks from proposal
   - Validation before save

4. **Add to Message Renderer**
   ```typescript
   // web/src/components/messages/message-item.tsx
   ```
   - Detect `response.type === 'components'`
   - Find component type `TaskProposalCard`
   - Render with proposal data
   - Handle expiration (5 minutes)

**Validation:**
- Proposal card displays proposed tasks
- Accept All button creates all tasks
- Edit mode allows inline modifications
- Reject button dismisses proposal
- Expiration timer shows (5 minutes)
- Real-time updates after confirmation

**Files to Create:**
- `web/src/components/agent/TaskProposalCard.tsx`
- `web/src/components/agent/TaskEditor.tsx` (if separate)

**Files to Modify:**
- `web/src/components/messages/message-item.tsx` (render proposals)

---

## 🟠 TRACK 6: Background Triggers (Worker-Based)

**Goal:** Proactive suggestions WITHOUT EventCoordinatorDO

**Dependencies:** Track 3 (RoomOrchestratorDO for message posting)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 1148-1217 (Background Triggers)
- `delphi-v3.1-refined-architecture.md` lines 1220-1243 (When to Add EventDO - Don't!)

**Tasks:**

1. **Create Trigger Definitions**
   ```typescript
   // agent-worker/src/triggers/definitions.ts
   ```
   - Trigger types (lines 1187-1217):
     - `deadline_approaching`: Photography 6 months before event
     - `budget_threshold`: Spent >80% of budget
     - `missing_vendor`: Key vendor category not filled
     - `inactive_room`: No activity in N days
   - Trigger structure: `type`, `id`, `message`, `priority`

2. **Implement Scheduled Worker**
   ```typescript
   // agent-worker/src/scheduled.ts
   ```
   - `scheduled()` handler (lines 1153-1185)
   - Get all active events from Convex
   - For each event:
     - Query tasks, budget, rooms from Convex (direct)
     - Evaluate triggers with `evaluateTriggers()`
     - Create system messages via Convex mutation
   - No DO needed!

3. **Trigger Evaluation Logic**
   - `evaluateTriggers()` function (lines 1187-1217)
   - Check conditions:
     - Time-based: `now > sixMonthsOut`
     - Budget-based: `spent / total > 0.8`
     - Data-based: task categories, vendor presence
   - Returns array of triggered messages

4. **Configure Cron**
   ```typescript
   // agent-worker/wrangler.toml
   ```
   - Add cron trigger: `"0 * * * *"` (hourly)
   - Export scheduled handler from `index.ts`

**Validation:**
- Triggers fire hourly via cron
- Photography trigger fires 6 months before event
- Budget trigger fires at 80% spent
- System messages appear in main room
- No EventDO created or used
- False positive rate <10%

**Files to Create:**
- `agent-worker/src/triggers/definitions.ts`
- `agent-worker/src/scheduled.ts`

**Files to Modify:**
- `agent-worker/wrangler.toml` (add cron schedule)
- `agent-worker/src/index.ts` (export scheduled handler)
- `web/convex/messages.ts` (support system messages if needed)

---

## 🔵 TRACK 7: Migration & Cleanup

**Goal:** Remove old systems, migrate fully to v3.1

**Dependencies:** Tracks 1, 2, 3 (core new systems in place)

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 1247-1412 (Migration Guide)
- `delphi-implementation-guide.md` lines 1033-1096 (Migration Checklist)

**Tasks:**

1. **Remove Deprecated Code**
   - Delete specialized agents:
     - `agent-worker/src/agents/TaskAgent.ts` ❌
     - `agent-worker/src/agents/BudgetAgent.ts` ❌
     - `agent-worker/src/agents/VendorAgent.ts` ❌
     - `agent-worker/src/agents/EventAgent.ts` ❌
   - Delete if exists:
     - `agent-worker/src/durable-objects/EventCoordinatorDO.ts` ❌
     - `agent-worker/src/agents/helpers/MultiTaskCreator.ts` ❌ (replaced by proposals)
   - Remove from wrangler.toml bindings

2. **Update ChatOrchestratorDO → RoomOrchestratorDO**
   ```typescript
   // Migration strategy (lines 1249-1340)
   ```
   - Replace `ChatOrchestratorDO` with `RoomOrchestratorDO`
   - Update all routing in worker
   - Migrate state if needed (checkpoint-based)

3. **Feature Flags for Gradual Rollout**
   ```typescript
   // agent-worker/src/index.ts
   ```
   - Add flags (lines 1386-1411):
     - `USE_PROPOSALS`: enable/disable proposal system
     - `USE_CONTEXT_INTENT`: enable/disable context-aware intent
   - Gradual rollout percentage: 10% → 50% → 100%
   - Keep old code path as fallback during migration

4. **Update Worker Routing**
   - Simplify to single DO type (lines 1100-1146)
   - All rooms use `RoomOrchestratorDO`
   - Route based on `roomId` only
   - Remove EventDO routing logic

5. **Clean Up Imports and Dependencies**
   - Remove unused imports
   - Update type definitions
   - Fix broken references
   - Update package.json if needed

**Validation:**
- No specialized agents remaining
- No EventCoordinatorDO code
- All rooms use RoomOrchestratorDO
- Feature flags working
- Can roll back to old system if needed
- No build errors or warnings

**Files to Delete:**
- `agent-worker/src/agents/TaskAgent.ts`
- `agent-worker/src/agents/BudgetAgent.ts`
- `agent-worker/src/agents/VendorAgent.ts`
- `agent-worker/src/agents/EventAgent.ts`
- `agent-worker/src/durable-objects/EventCoordinatorDO.ts` (if exists)
- `agent-worker/src/durable-objects/ChatOrchestratorDO.ts` (replaced by Room)
- `agent-worker/src/agents/helpers/MultiTaskCreator.ts` (if exists)

**Files to Modify:**
- `agent-worker/src/index.ts` (routing + feature flags)
- `agent-worker/wrangler.toml` (remove old bindings)

---

## 🟢 TRACK 8: Enhanced Testing

**Goal:** Test new proposal system and context-aware intent

**Dependencies:** All implementation tracks complete

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 1538-1584 (Testing)
- `delphi-v3.1-refined-architecture.md` lines 1588-1617 (Success Metrics)

**Tasks:**

1. **Unit Tests - Intent Detection**
   ```typescript
   // agent-worker/test/intent-detection.test.ts
   ```
   - Test context-aware detection (lines 1543-1557)
   - `sync_conversation_to_tasks` intent when:
     - 0 tasks + "update tasks" + commitments in conversation
   - Confidence >0.7 for clear intents
   - Clarification for ambiguous (<0.7)

2. **Integration Tests - Proposal Flow**
   ```typescript
   // agent-worker/test/proposal-system.test.ts
   ```
   - End-to-end proposal flow (lines 1563-1583):
     1. Send message: "Book photographer and find caterer"
     2. Receive proposal with 2 tasks
     3. Confirm with `accept_all`
     4. Verify 2 tasks created in DB
   - Test edit flow
   - Test reject flow
   - Test expiration (5 minutes)

3. **Load Tests - DO Memory**
   - Test with 200+ messages
   - Verify compression of old messages
   - Check memory usage <20MB
   - Checkpoint creation every 50 messages
   - Recovery from checkpoint

4. **Cost Analysis**
   - Measure tokens per request
   - Compare iteration-based vs proposal-based
   - Target: <$0.15 per event
   - Proposal system should reduce costs (fewer AI calls)

**Success Criteria:**
(From lines 1590-1617 in v3.1)
- [ ] Proposal usage >60% of multi-creates
- [ ] Intent accuracy >90%
- [ ] DO memory <20MB average
- [ ] P95 response time <2s
- [ ] Proposal acceptance >80%
- [ ] AI cost <$0.15/event
- [ ] Success rate >95%

**Files to Create:**
- `agent-worker/test/intent-detection.test.ts`
- `agent-worker/test/proposal-system.test.ts`
- `agent-worker/test/room-orchestrator-do.test.ts`
- `agent-worker/test/load/memory-test.ts`

---

## 🟡 TRACK 9: Documentation & Best Practices

**Goal:** Document v3.1 architecture and best practices

**Dependencies:** All tracks complete

**Reference:**
- `delphi-v3.1-refined-architecture.md` lines 1415-1537 (Best Practices)
- `delphi-v3.1-refined-architecture.md` lines 1620-1669 (Quick Reference)

**Tasks:**

1. **Update Architecture Documentation**
   - `docs/ARCHITECTURE_V3.1.md`
   - Explain proposal system
   - Explain context-aware intent
   - Document single DO architecture
   - Include diagrams

2. **Best Practices Guide**
   - Type safety patterns (lines 1419-1437)
   - Error handling (lines 1440-1467)
   - Structured logging (lines 1469-1486)
   - Performance (lines 1488-1536):
     - Lazy loading
     - Batching operations
     - Caching intent detection

3. **Quick Reference**
   - Proposal flow diagram (lines 1622-1629)
   - Intent detection flow (lines 1631-1638)
   - DO architecture diagram (lines 1640-1648)
   - Key files reference (lines 1651-1669)

4. **Migration Guide**
   - From v3.0 to v3.1
   - Breaking changes
   - Deprecation notices
   - Rollback procedures

**Deliverables:**
- `docs/ARCHITECTURE_V3.1.md`
- `docs/PROPOSAL_SYSTEM.md`
- `docs/MIGRATION_V3.0_TO_V3.1.md`
- `docs/BEST_PRACTICES.md`

**Files to Create:**
- `docs/ARCHITECTURE_V3.1.md`
- `docs/PROPOSAL_SYSTEM.md`
- `docs/MIGRATION_V3.0_TO_V3.1.md`
- `docs/BEST_PRACTICES.md`

---

## 📋 Execution Strategy

### Parallel Execution Groups

**PHASE 1 - Core Systems (Parallel):**
- Track 1: Proposal System Foundation
- Track 2: Context-Aware Intent Detection
- Track 3: Simplified RoomOrchestratorDO
- Track 4: Frontend Message Handler (can start immediately, uses existing Fluid UI)

**PHASE 2 - UI & Triggers (Parallel, after Phase 1):**
- Track 5: Proposal Components (needs Tracks 1, 4)
- Track 6: Background Triggers (needs Track 3)
- Track 7: Migration & Cleanup (needs Tracks 1, 2, 3)

**PHASE 3 - Quality (After Phase 2):**
- Track 8: Enhanced Testing (needs all implementation)
- Track 9: Documentation (needs all)

### Recommended Agent Assignment

**3 Agents (Recommended):**
- **Agent 1 (Backend Core):** Tracks 1, 3, 6 (Proposal system, RoomDO, Triggers)
- **Agent 2 (Intelligence):** Tracks 2, 7, 8 (Intent detection, Cleanup, Testing)
- **Agent 3 (Frontend):** Tracks 4, 5, 9 (Message handler, Proposal UI, Docs)

**4 Agents (Faster):**
- **Agent 1:** Tracks 1, 6 (Backend proposals + triggers)
- **Agent 2:** Tracks 2, 8 (Intent + testing)
- **Agent 3:** Tracks 3, 7 (RoomDO + cleanup)
- **Agent 4:** Tracks 4, 5, 9 (All frontend)

**2 Agents (Minimum):**
- **Agent 1 (Backend):** Tracks 1, 2, 3, 6, 7 (All backend + cleanup)
- **Agent 2 (Frontend & QA):** Tracks 4, 5, 8, 9 (All frontend + testing + docs)

---

## ✅ Success Validation

After all tracks complete:

**Technical Metrics:**
- [ ] Proposal system working (1 AI call for batch)
- [ ] Context-aware intent accuracy >90%
- [ ] Single RoomOrchestratorDO handles all room types
- [ ] NO EventCoordinatorDO in codebase
- [ ] Background triggers fire from worker
- [ ] All old specialized agents removed
- [ ] DO memory <20MB average
- [ ] Tests passing (proposal flow, intent detection)

**User Experience:**
- [ ] Proposal acceptance rate >80%
- [ ] Edit rate 20-30% (users refining)
- [ ] Intent clarification requests <5%
- [ ] Multi-task efficiency +70% (vs iteration)
- [ ] Success rate >95%

**Code Quality:**
- [ ] No deprecated code (specialized agents, EventDO)
- [ ] Feature flags working
- [ ] Comprehensive documentation
- [ ] Type safety throughout
- [ ] Structured logging

---

## 🚨 Migration Notes

### What Changed from v3.0 → v3.1

**REMOVED:**
- ❌ `EventCoordinatorDO` - Background triggers now in worker
- ❌ `MultiTaskCreator` - Replaced by proposal system
- ❌ Iteration-based batch creation - Replaced by proposals
- ❌ Specialized agents - Already removed

**ADDED:**
- ✅ Proposal System - Review before execution
- ✅ Context-Aware Intent - Pragmatic interpretation
- ✅ Simplified DO - Single `RoomOrchestratorDO` type

**CHANGED:**
- 🔄 Intent Detection - Now considers conversation context
- 🔄 Batch Operations - Via proposals, not iterations
- 🔄 Background Triggers - In worker, not EventDO

### Rollback Strategy

**Feature Flags:**
```typescript
// Can disable proposals and context-aware intent
if (env.USE_PROPOSALS === 'false') {
  // Fall back to iteration-based
}

if (env.USE_CONTEXT_INTENT === 'false') {
  // Fall back to simple intent detection
}
```

**Gradual Rollout:**
- Start: 10% of requests use v3.1
- Monitor: Proposal acceptance, intent accuracy, errors
- Increase: 50% → 100%
- Rollback: If acceptance <70% or errors spike

---

## 📖 Quick Reference

### Proposal Flow
```
User: "Create tasks for A, B, C"
  ↓
Agent detects multi-create (N > 1)
  ↓
Returns proposal (1 AI call)
  ↓
Frontend renders TaskProposalCard
  ↓
User: Accept All / Edit / Reject
  ↓
Batch execution (Promise.all)
  ↓
Confirmation message
```

### Context-Aware Intent
```
User: "Update tasks" (with 0 tasks)
  ↓
Build room context:
  - taskCount: 0
  - recentMessages: [...conversation...]
  - extractedCommitments: ["book photographer"]
  ↓
Claude analyzes pragmatics
  ↓
Intent: sync_conversation_to_tasks
  ↓
Creates tasks from commitments
```

### DO Architecture
```
All Rooms → RoomOrchestratorDO (single type)
  ├─ Main Room (eventWide: true)
  ├─ Vendor Room (scopedTo: vendorId)
  ├─ Brainstorm Room (standard)
  └─ Private Room (standard)

Background: Cron Worker (no EventDO)
```

### Key Files
```
agent-worker/src/
├── agents/
│   └── UnifiedDelphiAgent.ts          (proposals + context-aware)
├── durable-objects/
│   └── RoomOrchestratorDO.ts          (single type, all rooms)
├── triggers/
│   └── definitions.ts                  (trigger patterns)
├── scheduled.ts                        (background worker)
└── index.ts                            (routing)

web/
├── convex/
│   ├── proposals.ts                    (mutations)
│   └── schema.ts                       (messages + proposals tables)
├── src/
│   ├── lib/fluid-ui/                   (EXISTING! Grid system)
│   │   ├── registry.ts                 (component registry)
│   │   ├── grid-row.tsx                (row renderer)
│   │   ├── component-renderer.tsx      (component renderer)
│   │   └── message-components-init.ts  (NEW: register message components)
│   ├── components/
│   │   ├── messages/
│   │   │   ├── message-item.tsx        (UPDATE: check responseType)
│   │   │   └── MessageResponseRenderer.tsx  (NEW: render Fluid UI in messages)
│   │   └── message-components/         (NEW directory)
│   │       ├── TaskProposalCard.tsx    (compact task proposal)
│   │       ├── BudgetSummaryCard.tsx   (budget overview)
│   │       ├── PollWidgetCompact.tsx   (inline poll)
│   │       └── VendorCardCompact.tsx   (vendor info)
│   └── hooks/
│       └── useAgentInvoke.ts           (UPDATE: structured responses)
```

---

## 🎯 Final Notes

**Critical Differences from Old Prompt:**
1. **NO EventCoordinatorDO** - Completely removed!
2. **Proposal System is NEW** - Track 1 is critical
3. **Context-Aware Intent is ENHANCED** - Track 2 much more sophisticated
4. **Single DO Architecture** - Track 3 simplified significantly
5. **Frontend Message Handler is NEW** - Track 4 leverages existing Fluid UI
6. **Proposal Components** - Track 5 builds on Track 4
7. **Background Triggers in Worker** - Track 6, no EventDO needed
8. **Migration Track** - Track 7 removes all deprecated code

**Remember:**
- **You already have Fluid UI!** Track 4 uses existing grid system, component registry, and renderers
- Start with Phase 1 (Tracks 1, 2, 3, 4) - these can all run in parallel
- Track 4 is critical - it bridges agent responses to frontend UI
- Proposals change how batch operations work fundamentally
- Context-aware intent fixes the "update tasks" bug elegantly
- Single DO is much simpler than old multi-DO architecture
- Remove old code aggressively (Track 7)
- 9 tracks total (was 8, added Track 4 for message rendering)

**Key Files from Exploration:**
- `web/src/lib/fluid-ui/` - Already exists! Grid system, registry, renderers
- `web/src/components/messages/message-item.tsx` - Update to check responseType
- `web/convex/schema.ts` - Add responseType and responseConfig fields
- Track 4 creates the bridge between agent responses and Fluid UI

**Ready to execute v3.1. Choose your track(s) and begin!**
