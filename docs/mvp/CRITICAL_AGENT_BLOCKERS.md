# Critical Agent Blockers - Must Fix to Enable Agent Usage

**Status:** 4 blockers preventing agent from being usable
**Total Effort:** ~3 hours
**Priority:** All P0 (Critical)

---

## Overview

The Delphi agent infrastructure is **85% complete** but cannot be used in production due to 4 critical gaps:

1. **Component Registration Gap** - 2 components not accessible to agent
2. **Response Format Gap** - Agent doesn't use new rendering pipeline
3. **Tool Awareness Gap** - Agent doesn't know when to use Firecrawl
4. **Component Knowledge Gap** - Agent can't generate dashboards on demand

**Fix these 4 items → Agent becomes fully usable**

---

## BLOCKER 1: Missing Component Registrations

**Impact:** Agent cannot return KPIDashboard or ProgressSummary in messages
**Effort:** 5 minutes
**Priority:** P0 - Blocks dashboard generation

### Problem

Two fully implemented components are not registered in the component registry:
- `/web/src/components/dashboard/KPIDashboard.tsx` (256 lines, fully functional)
- `/web/src/components/dashboard/ProgressSummary.tsx` (313 lines, fully functional)

Without registration, agent cannot include them in responses.

### Solution

**File:** `/web/src/lib/fluid-ui/registerMessageComponents.ts`

**Action:** Add after line 404 (after InventoryCard registration):

```typescript
import { KPIDashboard } from "@/components/dashboard/KPIDashboard";
import { ProgressSummary } from "@/components/dashboard/ProgressSummary";

// Add inside registerAllComponents() function:

// Track 3: Dashboard Summary Components
registerComponent("KPIDashboard", KPIDashboard, {
  name: "KPI Dashboard",
  category: "dashboard",
  description: "Key metrics overview: Budget (spent/total), Tasks (complete/total), Days until event, RSVP (confirmed/expected)",
  layoutRules: {
    canShare: true,
    preferredRatio: "2fr",
    minWidth: "600px",
    preferredHeight: "200px"
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
    emits: [],
    listensTo: []
  },
  props: {
    eventId: {
      type: "string",
      required: true,
      description: "Event ID to fetch metrics for"
    },
    showDetails: {
      type: "boolean",
      required: false,
      default: false,
      description: "Show detailed breakdown for each metric"
    }
  }
});

registerComponent("ProgressSummary", ProgressSummary, {
  name: "Progress Summary",
  category: "dashboard",
  description: "Overall event completion percentage with task/milestone breakdown (weighted: 70% tasks, 30% milestones)",
  layoutRules: {
    canShare: true,
    preferredRatio: "1fr",
    minWidth: "350px",
    preferredHeight: "250px"
  },
  connections: {
    canBeMaster: false,
    canBeDetail: false,
    emits: [],
    listensTo: []
  },
  props: {
    eventId: {
      type: "string",
      required: true,
      description: "Event ID to calculate progress for"
    },
    showBreakdown: {
      type: "boolean",
      required: false,
      default: true,
      description: "Show task and milestone completion breakdown"
    }
  }
});
```

### Verification

After adding, verify component count:
```typescript
// Should show 11 registered components
console.log(getRegisteredComponents().length); // Should be 11
```

**Acceptance Criteria:**
- [ ] KPIDashboard appears in registry
- [ ] ProgressSummary appears in registry
- [ ] No TypeScript errors
- [ ] Application builds successfully

---

## BLOCKER 2: Agent Response Format Gap

**Impact:** Agent responses don't trigger new Track 4 renderers (ComponentGrid, InteractivePrompt, Mixed)
**Effort:** 30 minutes
**Priority:** P0 - Blocks advanced rendering

### Problem

Agent returns `structuredData` but doesn't populate:
- `renderType` (text | component_grid | interactive_prompt | mixed)
- `componentConfig` (for dashboard layouts)
- `interactivePrompt` (for polls, confirmations)

**Current Code:** `/agent-worker/src/durable-objects/RoomOrchestratorDO.ts:476-488`

```typescript
// CURRENT (Incomplete):
aiMetadata: {
  intent: intent.primaryIntent,
  confidence: intent.confidence,
  agentType: 'UnifiedDelphiAgent',
  toolsUsed: agentResponse.toolsUsed || [],
  structuredData: agentResponse.structuredData,
  // Missing: renderType, componentConfig, interactivePrompt
}
```

### Solution

**File:** `/agent-worker/src/durable-objects/RoomOrchestratorDO.ts`

**Action:** Replace lines 476-488 with:

```typescript
// Save AI message with full metadata
const aiMessageId = await this.convex.mutation(api.messages.create, {
  roomId: this.state.roomId,
  eventId: this.state.eventId,
  content: agentResponse.text || agentResponse.content || '',
  authorType: 'agent' as const,
  aiMetadata: {
    // Core metadata
    intent: intent.primaryIntent,
    confidence: intent.confidence,
    agentType: 'UnifiedDelphiAgent',
    toolsUsed: agentResponse.toolsUsed || [],

    // Legacy support
    structuredData: agentResponse.structuredData,

    // NEW: Track 4 rendering fields
    renderType: agentResponse.renderType ||
                (agentResponse.structuredData ? "text" : "text"),
    componentConfig: agentResponse.componentConfig || undefined,
    interactivePrompt: agentResponse.interactivePrompt || undefined,
  },

  // Threading support
  parentMessageId: originalMessage.parentMessageId,
  threadId: originalMessage.threadId || originalMessage._id,
});
```

### Also Update Agent Response Type

**File:** `/agent-worker/src/agents/BaseAgent.ts` (or wherever AgentResponse is defined)

**Action:** Ensure AgentResponse interface includes:

```typescript
export interface AgentResponse {
  success: boolean;
  text?: string;
  content?: string;

  // Tool execution
  toolsUsed?: string[];

  // Legacy structured data
  structuredData?: {
    type: "proposal" | "task_result" | "dashboard";
    proposal?: ProposalMetadata;
    result?: TaskResult;
    config?: DashboardConfig;
  };

  // NEW: Track 4 rendering
  renderType?: "text" | "component_grid" | "interactive_prompt" | "mixed";
  componentConfig?: {
    sections: Array<{
      type: "text" | "grid";
      content?: string;
      components?: Array<{
        type: string;
        props: Record<string, any>;
      }>;
    }>;
  };
  interactivePrompt?: {
    promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
    data: any;
    responses?: any[];
  };

  // Proposal confirmation
  requiresConfirmation?: boolean;
  metadata?: Record<string, any>;
}
```

### Verification

Test by having agent return a dashboard:
```typescript
// Agent should be able to return:
return {
  success: true,
  text: "Here's your event overview:",
  renderType: "component_grid",
  componentConfig: {
    sections: [{
      type: "grid",
      components: [
        { type: "KPIDashboard", props: { eventId } },
        { type: "ProgressSummary", props: { eventId } }
      ]
    }]
  }
};
```

**Acceptance Criteria:**
- [ ] aiMetadata includes renderType
- [ ] aiMetadata includes componentConfig when present
- [ ] aiMetadata includes interactivePrompt when present
- [ ] Messages saved to Convex with full metadata
- [ ] FluidUIMessageRenderer can access all fields

---

## BLOCKER 3: Firecrawl Tool Awareness Gap

**Impact:** Agent has Firecrawl tool but doesn't know when/how to use it
**Effort:** 15 minutes
**Priority:** P0 - Blocks vendor search functionality

### Problem

`FirecrawlTool` is registered and functional (`/agent-worker/src/tools/FirecrawlTool.ts`), but agent's system prompt doesn't mention it.

**Result:** When user asks "search for photographers", agent doesn't use Firecrawl.

### Solution

**File:** `/agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Action:** Update system prompt (around line 20-50, inside constructor):

```typescript
constructor(
  private anthropicApiKey: string,
  private tools: Tool[],
  private convex: ConvexClient
) {
  this.systemPrompt = `You are Delphi, an AI assistant for event planning.

## Available Tools

### 1. ConvexCRUD Tool
Use for database operations:
- Create tasks, expenses, vendors, inventory items
- Query existing data (tasks.list, expenses.listByEvent, vendors.listByEvent)
- Update or delete records
- All operations are scoped to the current event context

### 2. Firecrawl Tool (NEW - IMPORTANT)
Use for vendor research and web scraping:

**When to use:**
- User asks to "search for vendors" (photographers, caterers, florists, DJs, venues, etc.)
- User wants to "find" or "research" service providers
- User asks about vendor pricing or availability in a specific location

**How to use:**
{
  "tool": "firecrawl",
  "operation": "searchAndScrape",
  "params": {
    "query": "wedding photographers San Francisco",
    "maxResults": 5,
    "extractSchema": {
      "name": "string",
      "contact": "string",
      "pricing": "string",
      "specialties": "array",
      "rating": "number"
    }
  }
}

**Important:** Format Firecrawl results as VendorProposalCard with scraped data

**Example flow:**
User: "Search for wedding photographers in San Francisco"
→ Use Firecrawl to scrape vendor websites
→ Extract business name, contact info, pricing, reviews
→ Return as VendorProposalCard with 3-5 vendors
→ User can save vendors to their event

## Response Formats

### For Multi-Create Operations (3+ items):
Return proposal with type="proposal":
{
  "structuredData": {
    "type": "proposal",
    "proposal": {
      "proposalId": "prop_xxx",
      "proposalType": "tasks",
      "items": [/* array of items */],
      "expiresAt": timestamp
    }
  }
}

### For Vendor Search:
Return proposal with type="vendor_suggestions":
{
  "structuredData": {
    "type": "proposal",
    "proposal": {
      "proposalId": "prop_xxx",
      "proposalType": "vendor_suggestions",
      "items": [/* vendor data from Firecrawl */],
      "expiresAt": timestamp
    }
  }
}

### For Dashboard Requests (Advanced - Future):
Return component grid:
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [{
      "type": "grid",
      "components": [
        { "type": "TaskListCard", "props": { "eventId": "...", "limit": 5 } },
        { "type": "BudgetSummaryCard", "props": { "eventId": "..." } }
      ]
    }]
  }
}

## Guidelines

1. **Vendor Searches:** ALWAYS use Firecrawl tool when user asks about finding vendors
2. **Multi-Create:** Generate proposals for 3+ items (efficiency)
3. **Context Awareness:** Use room context to infer event details
4. **Proactive:** Suggest next steps based on event timeline

## Current Context

Event Type: {{eventType}}
Event Date: {{eventDate}}
Days Until Event: {{daysUntil}}
Budget: {{budget}}
Task Count: {{taskCount}}
Vendor Count: {{vendorCount}}

You have access to recent conversation history and can create structured plans.`;
}
```

### Verification

Test with:
```
User: "Search for wedding photographers in San Francisco"
Expected: Agent uses Firecrawl → Returns VendorProposalCard
```

**Acceptance Criteria:**
- [ ] System prompt mentions Firecrawl
- [ ] Includes usage examples
- [ ] Agent uses Firecrawl for vendor searches
- [ ] Returns VendorProposalCard with scraped data

---

## BLOCKER 4: Component Knowledge Gap

**Impact:** Agent cannot generate dashboards on demand (doesn't know what components exist)
**Effort:** 2 hours
**Priority:** P0 - Blocks dynamic UI generation

### Problem

Agent doesn't know:
- What components are available (TaskListCard, BudgetSummaryCard, etc.)
- What props each component requires
- How to structure componentConfig for layouts

**Result:** Cannot respond to "show me my event overview" with dashboard

### Solution (Two-Part)

#### Part A: Export Component Registry Metadata (30 min)

**File:** `/web/src/lib/fluid-ui/registry.ts`

**Action:** Add export function around line 50:

```typescript
export function getComponentMetadataForAgent(): string {
  const components = Array.from(registry.entries());

  const metadata = components.map(([type, component]) => ({
    type,
    name: component.name,
    description: component.description,
    category: component.category,
    props: Object.entries(component.props).map(([name, schema]) => ({
      name,
      type: schema.type,
      required: schema.required,
      description: schema.description,
      default: schema.default
    })),
    layoutRules: {
      preferredRatio: component.layoutRules.preferredRatio,
      minWidth: component.layoutRules.minWidth
    },
    connections: component.connections
  }));

  return `
Available Components for Dynamic UI:

${metadata.map(c => `
### ${c.name} (${c.type})
Category: ${c.category}
Description: ${c.description}

Required Props:
${c.props.filter(p => p.required).map(p => `  - ${p.name}: ${p.type} - ${p.description}`).join('\n')}

Optional Props:
${c.props.filter(p => !p.required).map(p => `  - ${p.name}: ${p.type} (default: ${p.default}) - ${p.description}`).join('\n') || '  (none)'}

Layout: ${c.layoutRules.preferredRatio} ratio, min ${c.layoutRules.minWidth}

${c.connections.canBeMaster ? '🔵 Master Component - Emits: ' + c.connections.emits.join(', ') : ''}
${c.connections.canBeDetail ? '🟢 Detail Component - Listens: ' + c.connections.listensTo.join(', ') : ''}
`).join('\n---\n')}

## How to Use Components

### Single Component Response:
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [{
      "type": "grid",
      "components": [
        { "type": "TaskListCard", "props": { "eventId": "evt_123", "limit": 10 } }
      ]
    }]
  }
}

### Dashboard Layout (Multiple Components):
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [
      {
        "type": "text",
        "content": "# Event Overview\\nHere are your key metrics:"
      },
      {
        "type": "grid",
        "components": [
          { "type": "KPIDashboard", "props": { "eventId": "evt_123" } },
          { "type": "ProgressSummary", "props": { "eventId": "evt_123" } }
        ]
      },
      {
        "type": "grid",
        "components": [
          { "type": "TaskListCard", "props": { "eventId": "evt_123", "limit": 5 } },
          { "type": "BudgetSummaryCard", "props": { "eventId": "evt_123" } }
        ]
      }
    ]
  }
}

### Master-Detail Pattern:
Place master component (e.g., TasksByVendor) in first grid, detail component (e.g., VendorTaskBoard) in second grid.
When user clicks in master, detail component filters automatically via Zustand.
`;
}
```

#### Part B: Inject Metadata into Agent Context (1.5 hours)

**File:** `/agent-worker/src/durable-objects/RoomOrchestratorDO.ts`

**Action:** Update buildAgentContext method (around line 936):

```typescript
private async buildAgentContext(
  message: Message,
  intent: Intent
): Promise<AgentContext> {
  const baseContext = {
    roomId: this.state.roomId,
    eventId: this.state.eventId,
    roomType: this.state.roomType,
    userMessage: message.content,
    intent: intent.primaryIntent,
    conversationHistory: this.state.messageHistory.slice(-10),

    // Event data
    eventType: this.state.eventData?.type,
    eventDate: this.state.eventData?.date,
    daysUntil: this.state.eventData?.date
      ? Math.floor((this.state.eventData.date - Date.now()) / (1000*60*60*24))
      : null,
    budget: this.state.eventData?.budget,

    // Counts
    taskCount: this.state.taskCount,
    vendorCount: this.state.vendorCount,

    // NEW: Component registry metadata (for dashboard generation)
    availableComponents: this.getComponentMetadata(),
  };

  // Room-type-specific context
  if (this.state.roomType === 'main') {
    return {
      ...baseContext,
      canAccessEventWide: true,
      eventData: await this.getEventData(),
      allRoomSummaries: await this.getAllRoomSummaries()
    };
  }

  if (this.state.roomType === 'vendor') {
    return {
      ...baseContext,
      scopedToVendor: this.state.vendorId,
      vendorContext: await this.getVendorContext(),
      contractStatus: await this.getContractStatus()
    };
  }

  return baseContext;
}

// NEW: Method to fetch component metadata
private getComponentMetadata(): string {
  // This will be populated from frontend registry
  // For now, hardcode the 11 registered components
  return `
Available Components:

1. TaskListCard (eventId, limit?) - Compact task list with filters
2. BudgetSummaryCard (eventId) - Budget breakdown with category chart
3. VendorCard (vendorId, eventId) - Single vendor details
4. VendorsList (eventId, category?) - Vendor directory (Master component, emits vendorId)
5. InventoryCard (eventId, category?) - Inventory CRUD
6. InlinePoll (pollId, question, options, eventId, roomId) - Interactive voting
7. QuickActions (actions, onAction) - Suggested action buttons
8. ConfirmationPrompt (question, onConfirm) - Yes/No prompt
9. KPIDashboard (eventId) - Key metrics: Budget, Tasks, Days, RSVP
10. ProgressSummary (eventId) - Overall completion percentage
11. TaskProposalCard (proposalId, items) - Task proposal with accept/reject

Use component_grid renderType with componentConfig to show dashboards.
Example: Show event overview = KPIDashboard + ProgressSummary in grid layout.
`;
}
```

**Then update UnifiedDelphiAgent to use context:**

**File:** `/agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Action:** In buildPrompt method (around line 200), inject component metadata:

```typescript
private buildPrompt(context: AgentContext, userMessage: string): string {
  return `
${this.systemPrompt}

## Available Components
${context.availableComponents || 'Loading component registry...'}

## Current Event Context
Event ID: ${context.eventId}
Event Type: ${context.eventType || 'Unknown'}
Event Date: ${context.eventDate ? new Date(context.eventDate).toLocaleDateString() : 'Not set'}
Days Until Event: ${context.daysUntil || 'N/A'}
Budget: ${context.budget ? '$' + context.budget.toLocaleString() : 'Not set'}

Tasks: ${context.taskCount} total
Vendors: ${context.vendorCount} registered

## Recent Conversation
${context.conversationHistory.slice(-5).map(m => `${m.authorType}: ${m.content}`).join('\n')}

## User Request
${userMessage}

## Instructions
1. Analyze user request and event context
2. Determine appropriate response format:
   - For vendor searches: Use Firecrawl tool
   - For multi-create (3+ items): Generate proposal
   - For dashboard requests: Use component_grid with available components
   - For polls: Use interactive_prompt with InlinePoll
3. Return structured response with appropriate renderType
`;
}
```

### Verification

Test with:
```
User: "Show me my event overview"
Expected: Agent returns component_grid with KPIDashboard + ProgressSummary
```

**Acceptance Criteria:**
- [ ] Component metadata exported from registry
- [ ] Agent context includes availableComponents
- [ ] Agent can generate component_grid responses
- [ ] Agent uses correct component types and props
- [ ] Dashboard renders correctly in frontend

---

## Implementation Checklist

### Phase 1: Quick Wins (50 minutes)
- [ ] **Blocker 1:** Register KPIDashboard & ProgressSummary (5 min)
- [ ] **Blocker 2:** Fix agent aiMetadata response (30 min)
- [ ] **Blocker 3:** Add Firecrawl prompt (15 min)

**After Phase 1:** Agent can create proposals and use Firecrawl (60% functionality)

### Phase 2: Full Agent Capability (2 hours)
- [ ] **Blocker 4a:** Export component metadata from registry (30 min)
- [ ] **Blocker 4b:** Inject metadata into agent context (1.5 hours)

**After Phase 2:** Agent can generate dashboards on demand (100% functionality)

---

## Testing After Fixes

### Test Scenario 1: Create Tasks via Proposal
```
User: "Create tasks for photographer, caterer, DJ"
Expected:
1. Agent detects multi-create
2. Returns proposal with 3 tasks
3. TaskProposalCard renders
4. User accepts
5. 3 tasks created in Convex
```

### Test Scenario 2: Search Vendors with Firecrawl
```
User: "Search for wedding photographers in San Francisco"
Expected:
1. Agent uses Firecrawl tool
2. Scrapes vendor websites
3. Returns VendorProposalCard with 3-5 vendors
4. User can save vendors
```

### Test Scenario 3: Show Dashboard
```
User: "Show me my event overview"
Expected:
1. Agent returns component_grid
2. KPIDashboard + ProgressSummary render
3. Real-time data from Convex
4. Color-coded status indicators
```

### Test Scenario 4: Create Poll
```
Agent: "Should we do buffet or plated dinner?"
Expected:
1. Agent returns interactive_prompt
2. InlinePoll renders with 2 options
3. Users can vote
4. Results update in real-time
```

---

## Post-Fix Capabilities

Once all 4 blockers are resolved, agent can:

✅ **Create structured plans** - Multi-task proposals with enrichment
✅ **Search vendors** - Use Firecrawl to find photographers, caterers, etc.
✅ **Generate dashboards** - Show KPIs, progress, tasks on demand
✅ **Create polls** - Interactive voting in chat
✅ **Manage inventory** - CRUD operations for rentals, decorations
✅ **Provide context-aware suggestions** - Based on event timeline and budget
✅ **Real-time collaboration** - All updates sync via Convex

---

## Environment Setup (Required)

Before testing, ensure environment variables are set:

**File:** `/agent-worker/.dev.vars`

```env
# Copy from .dev.vars.example and add real keys:
CLOUDFLARE_ACCOUNT_ID=your_account_id
ANTHROPIC_API_KEY=sk-ant-xxx  # Claude API key
FIRECRAWL_API_KEY=fc-xxx      # Firecrawl API key
CONVEX_DEPLOY_URL=http://localhost:8000  # or production URL
```

**Verify configuration:**
```bash
cd agent-worker
cat .dev.vars  # Should show real API keys (not example values)
```

---

## Rollout Plan

### Day 1: Core Functionality (50 min)
- Fix Blockers 1-3
- Test task proposals
- Test vendor search

### Day 2: Dashboard Generation (2 hours)
- Fix Blocker 4
- Test dashboard rendering
- Test component layouts

### Day 3: Polish & User Testing
- Run manual test scenarios
- Fix any edge cases
- Deploy to staging

---

## Success Metrics

After fixes, agent should achieve:
- ✅ 95%+ intent detection accuracy
- ✅ 90%+ proposal acceptance rate
- ✅ 100% component rendering success
- ✅ <2s response time (P95)
- ✅ 0 critical errors

---

**Total Effort to Unblock Agent:** ~3 hours focused work
**Outcome:** Fully functional AI assistant for event planning

---

*Last Updated: November 16, 2025*
*Reference: `/docs/mvp/MASTER_IMPLEMENTATION_PROMPT.md` for full context*
