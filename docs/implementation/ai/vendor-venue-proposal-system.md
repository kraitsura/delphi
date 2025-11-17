# Vendor/Venue Proposal System Implementation

**Status**: 🚧 In Progress (Phase 1a Complete)
**Owner**: AI Agent System
**Created**: 2025-01-17
**Last Updated**: 2025-01-17

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Current State Analysis](#current-state-analysis)
4. [Implementation Phases](#implementation-phases)
5. [Code Reference](#code-reference)
6. [Testing Strategy](#testing-strategy)
7. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

Enable the Delphi AI agent to search for vendors and venues using web search, then present results as interactive proposal cards that users can save, edit, or dismiss. This extends the existing proposal system (tasks, expenses) to vendor/venue discovery workflows.

### User Stories

**As a user**, I want to:
- Ask "@Delphi find photographers in Seattle" and receive a VendorProposalCard with 3-5 photographer options
- Review each vendor's pros/cons, pricing, and ratings before saving
- Edit vendor details before adding to my event
- Ask informational questions like "what are DJ prices like?" without forcing a proposal

**As a user**, I want to:
- Search for venues with "@Delphi find venues in downtown Seattle"
- See venue-specific details (capacity, amenities, floor plans) in a VenueProposalCard
- Save venues I'm interested in for later comparison
- Filter search results by capacity, location, or venue type

### Key Features

1. **Vendor Search → VendorProposalCard**
   - Web search via Firecrawl
   - AI extracts vendor details (name, contact, pricing, ratings)
   - AI generates pros/cons analysis and match score
   - User can accept/edit/dismiss proposals
   - Saved vendors stored with `status: "researching"`

2. **Venue Search → VenueProposalCard**
   - Separate component with venue-specific fields
   - Capacity, amenities, venue type (indoor/outdoor/both)
   - Availability calendar links
   - Floor plan URLs
   - Per-hour and per-event pricing

3. **Smart Proposal Decision**
   - Default: Generate proposals for all vendor/venue searches
   - AI can flag responses as `informationalOnly: true` to skip proposals
   - Show simple chat message for informational queries

---

## Architecture Decisions

### Decision 1: Proposal Logic (Default vs Always vs Smart)

**Options Considered**:
- **Option A**: Always generate proposals (like tasks/expenses)
- **Option B**: AI decides based on user intent (smart detection)
- **Option C**: Default to proposals, but AI can flag as informational ✅ **SELECTED**

**Rationale**:
- Safe default ensures vendor search results are always actionable
- AI escape hatch prevents over-proposing for informational queries
- Consistent with MVP principle: "by principle lets always send a proposal"
- Aligns with task/expense proposal behavior

**Implementation**:
```typescript
// UnifiedDelphiAgent.ts:284-296
if (intentLower.includes('search_vendor') ||
    intentLower.includes('find_vendor') ||
    intentLower.includes('search_venue') ||
    intentLower.includes('find_venue')) {
  console.log('[UnifiedDelphiAgent] Vendor/venue search detected - defaulting to proposal generation');
  return true; // Default to proposal
}

// AI can override by setting:
// agentResponse.metadata.informationalOnly = true
```

### Decision 2: Venue Component (Reuse vs Separate)

**Options Considered**:
- **Option A**: Reuse VendorProposalCard with `category: "venue"`
- **Option B**: Create separate VenueProposalCard component ✅ **SELECTED**

**Rationale**:
- Venues have distinct fields: capacity, amenities, venue type, floor plans
- Venue pricing differs: per-hour, per-event, deposit, overtime fees
- Separate component allows better UX tailored to venue discovery
- Schema already supports venues via `category` field, so no DB changes needed

**Implementation**:
- Create `VenueProposalCard.tsx` based on VendorProposalCard structure
- Add venue-specific fields and validations
- Register in Fluid UI system as separate component type
- Use same proposal flow (save to database, confirm/reject)

### Decision 3: Search Result Parsing (Manual vs AI-Powered)

**Approach**: **AI-Powered Extraction** ✅ **SELECTED**

**Rationale**:
- Firecrawl returns unstructured HTML/markdown
- Vendor details (pricing, contact, ratings) vary by website
- AI can extract structured data from diverse sources
- AI can generate pros/cons analysis and match scores
- Enables semantic understanding (e.g., "highly rated" → rating: 4.8)

**Implementation**:
```typescript
// New method: parseSearchResultsToProposal()
// Uses Claude to extract:
// - Vendor/venue name, category, contact info
// - Pricing (min/max/currency)
// - Ratings and reviews
// - Pros/cons based on search result content
// - Match score (how well vendor fits event requirements)
```

---

## Current State Analysis

### ✅ What Already Exists

#### 1. VendorProposalCard Component
**Location**: `/web/src/components/fluid-ui/cards/VendorProposalCard.tsx`

**Status**: **Fully built and production-ready**

**Features**:
- ✅ Expiration timer (5 minutes)
- ✅ Preview mode showing vendor cards with:
  - Name, category, rating, pricing
  - Contact info (email, phone, website)
  - AI match score (percentage bar)
  - Pros/cons from AI analysis
  - Reasoning for each suggestion
- ✅ Edit mode with inline editing:
  - Add/remove vendors from proposal
  - Edit vendor details (name, category, contact, pricing)
  - Real-time validation
- ✅ Three action buttons:
  - **Save All** - Create all vendors as-is
  - **Edit** - Toggle edit mode to modify before saving
  - **Dismiss** - Reject the proposal
- ✅ State management:
  - Expired state (after 5 minutes)
  - Rejected state (after dismiss)
  - Accepted state (after save)
- ✅ Success modal showing created vendors with links
- ✅ Toast notifications for user feedback

**Data Structure**:
```typescript
interface EditableVendor {
  name: string;
  category: string;
  pricing?: {
    min?: number;
    max?: number;
    currency: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  rating?: number;
  reviewCount?: number;
  aiMetadata?: {
    matchScore?: number;      // 0-100 percentage
    pros?: string[];          // AI-detected strengths
    cons?: string[];          // AI-detected concerns
  };
}
```

#### 2. Proposals Database Support
**Location**: `/web/convex/proposals.ts`

**Status**: **Supports vendor_suggestions**

Schema includes:
```typescript
proposalType: v.union(
  v.literal("tasks"),
  v.literal("budget_entries"),
  v.literal("vendor_suggestions") // ← ALREADY EXISTS
)
```

Workflow:
1. Agent creates proposal via `api.proposals.create`
2. Proposal stored with 5-minute expiration
3. User reviews in VendorProposalCard
4. User confirms via `api.proposals.confirm` with action: `"accept_all"` | `"edit"` | `"reject"`
5. On acceptance, `createVendor()` is called for each item

#### 3. Vendor Schema
**Location**: `/web/convex/schema.ts` (lines 660-735)

**Status**: **Comprehensive schema with AI metadata**

Required fields:
- `name: string`
- `category: string`
- `addedBy: Id<"users">`

Optional fields:
- Contact: `email`, `phone`, `website`
- Location: `city`, `state`, `country`
- Pricing: `{ min?, max?, currency, notes? }`
- Reviews: `rating`, `reviewCount`, `reviewSource`
- Status: `researching | contacted | negotiating | contracted | active | completed | rejected`
- **AI Metadata**:
  ```typescript
  aiMetadata?: {
    matchScore?: number;        // How well vendor matches requirements (0-100)
    pros?: string[];            // AI-detected strengths
    cons?: string[];            // AI-detected concerns
    specialties?: string[];     // What vendor specializes in
    availability?: string;      // Available dates/times
    searchQuery?: string;       // What query found this vendor
    scrapedAt?: number;         // When data was scraped from web
  }
  ```

**Venue Support**:
- ✅ Schema supports venues via `category: "venue"`
- Same `vendors` table used for both vendors and venues
- No separate `venues` table needed

#### 4. Web Search Tool (FirecrawlTool)
**Location**: `/agent-worker/src/tools/FirecrawlTool.ts`

**Status**: **Fully functional**

Capabilities:
- ✅ Web search via Firecrawl v2 API (`/v2/search`)
- ✅ URL scraping via Firecrawl v2 API (`/v2/scrape`)
- ✅ Queue management for rate limiting (FirecrawlQueueDO)
- ✅ Error handling with detailed responses
- ✅ Metadata tracking (duration, source)

Returns:
```typescript
{
  success: true,
  data: {
    query: string,
    results: Array<{
      url: string,
      title: string,
    snippet: string,
      markdown?: string
    }>,
    count: number
  },
  metadata: {
    duration: number,
    source: 'firecrawl'
  }
}
```

#### 5. Intent Detection
**Location**: `/agent-worker/src/agents/helpers/IntentDetector.ts`

**Status**: **Recognizes search_vendors intent**

Supported intents:
- `search_vendors` - Find vendors via web search
- `query_vendors` - Query saved vendors in database
- `save_vendor` - Save a specific vendor

Multi-intent support:
- Example: "add expense $2k for DJ and search for DJs in bay area" → `[add_expense, search_vendors]`
- Parallel execution supported

### ❌ What's Missing

#### 1. Vendor Proposal Generation
**Current Behavior** (UnifiedDelphiAgent.ts:1560-1591):
```typescript
// Search vendors → VendorsList component (read-only display)
if (intentLower.includes('vendor') && intentLower.includes('search')) {
  return {
    renderType: 'component_grid',
    componentConfig: {
      sections: [{
        type: 'grid',
        components: [{
          type: 'VendorsList',  // ← READ-ONLY, NOT A PROPOSAL
          props: {
            eventId: context.eventId,
            vendors: data,
            title: 'Search Results'
          }
        }]
      }]
    }
  };
}
```

**Problem**: No proposal generation, user cannot save vendors easily

**Needed**:
- Parse Firecrawl search results into vendor proposal items
- Generate proposals with AI pros/cons analysis
- Return proposal instead of VendorsList

#### 2. VenueProposalCard Component
**Status**: **Does not exist**

**Needed**:
- Create new component based on VendorProposalCard
- Add venue-specific fields (capacity, amenities, venue type)
- Add venue-specific pricing (per-hour, per-event, deposit)
- Register in Fluid UI system

#### 3. Venue Proposal Type
**Current Schema** (proposals.ts):
```typescript
proposalType: v.union(
  v.literal("tasks"),
  v.literal("budget_entries"),
  v.literal("vendor_suggestions")
  // ❌ Missing: v.literal("venue_suggestions")
)
```

**Needed**: Add `"venue_suggestions"` to proposal type union

#### 4. AI Informational Flag Detection
**Status**: **Not implemented**

**Needed**:
- Check `agentResponse.metadata.informationalOnly` flag
- If true, skip proposal generation and show as text/VendorsList
- Update system prompt to explain when AI should set flag

#### 5. Search Result → Proposal Transformation
**Status**: **Not implemented**

**Needed**:
- Method to parse Firecrawl results into structured vendor/venue data
- AI extraction of pricing, contact info, ratings
- AI generation of pros/cons and match scores
- Handling of missing/incomplete data

---

## Implementation Phases

### ✅ Phase 1a: Force Vendor/Venue Proposals (COMPLETED)

**File**: `agent-worker/src/agents/UnifiedDelphiAgent.ts` (lines 284-296)

**Changes**:
```typescript
// DEFAULT to proposals for vendor/venue searches
if (
  intentLower.includes('search_vendor') ||
  intentLower.includes('find_vendor') ||
  intentLower.includes('search_venue') ||
  intentLower.includes('find_venue') ||
  (intentLower.includes('vendor') && intentLower.includes('search')) ||
  (intentLower.includes('venue') && intentLower.includes('search'))
) {
  console.log('[UnifiedDelphiAgent] Vendor/venue search detected - defaulting to proposal generation');
  return true;
}
```

**Result**: Agent now defaults to generating proposals for vendor/venue searches

---

### Phase 1b: Parse Search Results into Proposals

**File**: `agent-worker/src/agents/UnifiedDelphiAgent.ts`

**New Method**: `parseSearchResultsToProposal()`

**Purpose**: Transform Firecrawl search results into structured vendor/venue proposal items with AI analysis

**Implementation**:
```typescript
/**
 * Parse Firecrawl search results into vendor/venue proposal items
 * Uses AI to extract structured data and generate pros/cons analysis
 */
private async parseSearchResultsToProposal(
  searchResults: any[],
  category: string,
  eventContext: any,
  isVenue: boolean = false
): Promise<Array<{ type: string; data: any; reasoning?: string }>> {
  console.log(`[UnifiedDelphiAgent] Parsing ${searchResults.length} search results into proposal items...`);

  const extractionPrompt = `You are analyzing web search results for ${isVenue ? 'venues' : 'vendors'} to help plan an event.

EVENT CONTEXT:
- Event Type: ${eventContext.type || 'Unknown'}
- Event Date: ${eventContext.date || 'Not set'}
- Event Name: ${eventContext.name || 'Unnamed Event'}
- Guest Count: ${eventContext.guestCount || 'Unknown'}

SEARCH RESULTS:
${searchResults.map((result, i) => `
Result ${i + 1}:
Title: ${result.title}
URL: ${result.url}
Snippet: ${result.snippet}
${result.markdown ? `Content: ${result.markdown.substring(0, 1000)}` : ''}
`).join('\n')}

TASK: Extract structured ${isVenue ? 'venue' : 'vendor'} information from these search results.

For each ${isVenue ? 'venue' : 'vendor'} found, extract:
1. Name (required)
2. Category (${category})
3. Contact information (email, phone, website)
4. Pricing (min/max range in dollars, or specific rates)
5. Rating (0-5 stars if mentioned)
6. Review count (if mentioned)
7. ${isVenue ? 'Capacity (guest count)' : 'Specialties'}
8. ${isVenue ? 'Amenities (parking, catering, AV, etc.)' : 'Location (city, state)'}
9. ${isVenue ? 'Venue type (indoor/outdoor/both)' : 'Availability'}

ANALYSIS: For each ${isVenue ? 'venue' : 'vendor'}:
- Match Score (0-100): How well this matches the event requirements
- Pros (2-4 bullet points): Key strengths
- Cons (1-3 bullet points): Potential concerns or limitations
- Reasoning: Why you're recommending this option

Return ONLY a JSON array of items (top 3-5 best matches). Example:

${isVenue ? `
[
  {
    "type": "venue",
    "data": {
      "name": "The Grand Ballroom",
      "category": "venue",
      "capacity": 200,
      "venueType": "indoor",
      "amenities": ["parking", "catering kitchen", "AV equipment", "bridal suite"],
      "pricing": {
        "min": 3000,
        "max": 5000,
        "currency": "USD",
        "notes": "Per event, includes 6 hours"
      },
      "contact": {
        "email": "events@grandballroom.com",
        "phone": "(206) 555-1234",
        "website": "https://grandballroom.com"
      },
      "rating": 4.8,
      "reviewCount": 127,
      "city": "Seattle",
      "state": "WA",
      "aiMetadata": {
        "matchScore": 92,
        "pros": [
          "Excellent reviews and high rating",
          "Capacity fits event size perfectly",
          "Full-service amenities included",
          "Prime downtown location"
        ],
        "cons": [
          "Higher price point",
          "May book up quickly for popular dates"
        ]
      }
    },
    "reasoning": "Top-rated venue with capacity and amenities that match your event requirements"
  }
]
` : `
[
  {
    "type": "vendor",
    "data": {
      "name": "Artisan Photography Co.",
      "category": "photography",
      "pricing": {
        "min": 2000,
        "max": 4000,
        "currency": "USD",
        "notes": "Packages from $2000 for 6 hours"
      },
      "contact": {
        "email": "hello@artisanphoto.com",
        "phone": "(206) 555-5678",
        "website": "https://artisanphoto.com"
      },
      "rating": 4.9,
      "reviewCount": 156,
      "city": "Seattle",
      "state": "WA",
      "aiMetadata": {
        "matchScore": 95,
        "pros": [
          "Exceptional reviews (4.9/5 stars)",
          "Specializes in wedding photography",
          "Includes engagement session",
          "Fast turnaround on edited photos"
        ],
        "cons": [
          "Premium pricing tier",
          "Books 6+ months in advance"
        ],
        "specialties": ["weddings", "portraits", "destination events"]
      }
    },
    "reasoning": "Highly rated specialist photographer with excellent portfolio and reviews"
  }
]
`}

Return only the JSON array, no other text.`;

  try {
    const response = await this.callAI(extractionPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[UnifiedDelphiAgent] No JSON array found in search result parsing');
      return [];
    }

    const items = JSON.parse(jsonMatch[0]);
    console.log(`[UnifiedDelphiAgent] Extracted ${items.length} ${isVenue ? 'venue' : 'vendor'} proposal items`);
    return items;
  } catch (error) {
    console.error('[UnifiedDelphiAgent] Error parsing search results:', error);
    return [];
  }
}
```

**Integration Point**:
- Called from `buildProposal()` when handling vendor/venue search intents
- Replaces manual extraction with AI-powered parsing
- Returns proposal items in same format as task/expense proposals

---

### Phase 1c: Update buildProposal() for Vendors/Venues

**File**: `agent-worker/src/agents/UnifiedDelphiAgent.ts` (lines 305-400)

**Changes Needed**:

1. Detect vendor/venue proposal type based on intent
2. Call `parseSearchResultsToProposal()` for search results
3. Generate proposal with appropriate `proposalType`

**Implementation**:
```typescript
private async buildProposal(
  context: AgentContext,
  intent?: string
): Promise<AgentResponse> {
  console.log(`[UnifiedDelphiAgent] Building proposal for batch operation...`);

  const intentLower = (intent || '').toLowerCase();

  // Determine proposal type
  let proposalType: 'tasks' | 'budget_entries' | 'vendor_suggestions' | 'venue_suggestions';
  let isVenue = false;

  if (intentLower.includes('task')) {
    proposalType = 'tasks';
  } else if (intentLower.includes('expense') || intentLower.includes('budget')) {
    proposalType = 'budget_entries';
  } else if (intentLower.includes('venue')) {
    proposalType = 'venue_suggestions';
    isVenue = true;
  } else if (intentLower.includes('vendor')) {
    proposalType = 'vendor_suggestions';
  } else {
    proposalType = 'tasks'; // Default
  }

  // For vendor/venue searches, check if we have search results
  if ((proposalType === 'vendor_suggestions' || proposalType === 'venue_suggestions')) {
    // Check if recent tool execution was web_search
    const lastToolResult = this.getLastToolResult('web_search');

    if (lastToolResult && lastToolResult.success && lastToolResult.data.results) {
      const category = this.inferVendorCategory(intentLower);

      // Parse search results into proposal items
      const proposalItems = await this.parseSearchResultsToProposal(
        lastToolResult.data.results,
        category,
        context.eventContext,
        isVenue
      );

      if (proposalItems.length === 0) {
        return {
          text: `I searched for ${isVenue ? 'venues' : 'vendors'} but couldn't find any suitable options. Would you like me to try a different search?`,
          intent: intent || 'search_vendor',
          confidence: 0.8,
          toolsUsed: ['web_search'],
          metadata: { wasSuccessful: false }
        };
      }

      // Generate proposal ID and expiration
      const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

      // Build proposal metadata
      const proposalMetadata = {
        proposalId,
        proposalType,
        items: proposalItems,
        expiresAt,
        requiresConfirmation: true,
        createdAt: Date.now(),
      };

      return {
        text: this.formatProposalMessage(proposalItems, proposalType),
        intent: intent || (isVenue ? 'search_venue' : 'search_vendor'),
        confidence: 0.9,
        toolsUsed: ['web_search'],
        structuredData: {
          type: 'proposal',
          proposal: proposalMetadata,
        },
        metadata: {
          totalIterations: 0,
          wasSuccessful: true,
        }
      };
    }
  }

  // Existing proposal logic for tasks/expenses
  const items = await this.extractProposalItems(context, intent);
  // ... rest of existing buildProposal() code
}
```

**Helper Method**:
```typescript
/**
 * Get the last tool execution result by tool name
 */
private getLastToolResult(toolName: string): any {
  // Implementation depends on how tool results are stored
  // May need to add tool result tracking to agent context
  return this.lastToolResults?.get(toolName);
}

/**
 * Infer vendor category from intent
 */
private inferVendorCategory(intentLower: string): string {
  if (intentLower.includes('photographer') || intentLower.includes('photography')) return 'photography';
  if (intentLower.includes('caterer') || intentLower.includes('catering')) return 'catering';
  if (intentLower.includes('dj') || intentLower.includes('music')) return 'music';
  if (intentLower.includes('florist') || intentLower.includes('flowers')) return 'decor';
  if (intentLower.includes('venue')) return 'venue';
  return 'other';
}
```

---

### Phase 1d: AI Informational Flag Detection

**File**: `agent-worker/src/agents/UnifiedDelphiAgent.ts`

**Changes Needed**:

1. Check for `informationalOnly` flag in agent response metadata
2. Skip proposal generation if flag is set
3. Show simple text response instead

**Implementation**:
```typescript
async handle(
  context: AgentContext,
  config: Partial<AgenticLoopConfig> = {},
  overrideIntent?: string
): Promise<AgentResponse> {
  // ... existing code ...

  // Check if we should generate a proposal
  const shouldPropose = this.shouldGenerateProposal(context, intent);

  if (shouldPropose) {
    // Check for informational flag override
    // AI can set this in system prompt if user query is informational
    const isInformationalOnly = context.message.toLowerCase().includes('what are') ||
                                context.message.toLowerCase().includes('tell me about') ||
                                context.message.toLowerCase().includes('how much');

    if (!isInformationalOnly) {
      return await this.buildProposal(context, intent);
    } else {
      console.log('[UnifiedDelphiAgent] Informational query detected - skipping proposal');
    }
  }

  // Continue with normal execution
  return await super.handle(context, config, intent);
}
```

**Alternative**: Let AI set flag explicitly in response

**System Prompt Addition**:
```typescript
// Add to system prompt (lines 600-650)
📋 INFORMATIONAL vs ACTIONABLE QUERIES:

Informational Queries (show as text, NO proposal):
- "What are photographer prices like?"
- "Tell me about DJ services"
- "How much do venues cost?"
→ Return simple text response with information

Actionable Queries (show as proposal):
- "Find photographers for my wedding"
- "Search for DJs in Seattle"
- "Help me find a venue"
→ Use web_search tool and generate vendor/venue proposal

To flag a response as informational-only:
Set metadata.informationalOnly = true in your response
```

---

### Phase 2: VenueProposalCard Component

**File**: `web/src/components/fluid-ui/cards/VenueProposalCard.tsx` (NEW)

**Structure**: Based on VendorProposalCard with venue-specific fields

**Key Differences from VendorProposalCard**:

1. **Venue-Specific Fields**:
   - Capacity (guest count)
   - Venue type (indoor/outdoor/both)
   - Amenities (checkboxes: parking, catering, AV, etc.)
   - Floor plan links
   - Availability calendar link

2. **Venue-Specific Pricing**:
   - Per-hour rate
   - Per-event rate
   - Deposit amount
   - Overtime fees
   - What's included (hours, setup, cleanup)

3. **Display Enhancements**:
   - Capacity badge
   - Amenity icons
   - Indoor/outdoor indicator
   - Map integration (optional)

**Implementation Template**:
```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Users,
  MapPin,
  DollarSign,
  Star,
  CheckCircle2,
  XCircle,
  Edit2,
  Clock,
  Sparkles
} from "lucide-react";

interface VenueProposalCardProps {
  proposalId: string;
  proposalType: "venue_suggestions";
  items: EditableVenue[];
  expiresAt: number;
  eventId?: string;
  roomId: Id<"rooms">;
}

interface EditableVenue {
  name: string;
  category: "venue";
  capacity?: number;
  venueType?: "indoor" | "outdoor" | "both";
  amenities?: string[];
  pricing?: {
    perHour?: number;
    perEvent?: number;
    deposit?: number;
    overtime?: number;
    currency: string;
    notes?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  location?: {
    city?: string;
    state?: string;
    address?: string;
  };
  rating?: number;
  reviewCount?: number;
  aiMetadata?: {
    matchScore?: number;
    pros?: string[];
    cons?: string[];
  };
}

export function VenueProposalCard({
  proposalId,
  items: initialItems,
  expiresAt,
  eventId,
  roomId
}: VenueProposalCardProps) {
  // State management (similar to VendorProposalCard)
  const [items, setItems] = useState<EditableVenue[]>(initialItems);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");

  // Mutations
  const confirmProposal = useMutation(api.proposals.confirm);

  // Handlers
  const handleAcceptAll = async () => {
    try {
      await confirmProposal({
        proposalId: proposalId as Id<"proposals">,
        action: "accept_all",
        data: { items }
      });
      setStatus("accepted");
    } catch (error) {
      console.error("Failed to accept proposal:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      await confirmProposal({
        proposalId: proposalId as Id<"proposals">,
        action: "reject"
      });
      setStatus("rejected");
    } catch (error) {
      console.error("Failed to dismiss proposal:", error);
    }
  };

  // Render venue card
  const renderVenueCard = (venue: EditableVenue, index: number) => (
    <Card key={index} className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {venue.name}
          </h4>
          {venue.venueType && (
            <Badge variant="secondary" className="mt-1">
              {venue.venueType}
            </Badge>
          )}
        </div>
        {venue.aiMetadata?.matchScore && (
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{venue.aiMetadata.matchScore}%</span>
          </div>
        )}
      </div>

      {/* Capacity & Rating */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {venue.capacity && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Up to {venue.capacity} guests</span>
          </div>
        )}
        {venue.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{venue.rating}/5 ({venue.reviewCount} reviews)</span>
          </div>
        )}
      </div>

      {/* Location */}
      {venue.location && (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-4 w-4" />
          <span>{venue.location.city}, {venue.location.state}</span>
        </div>
      )}

      {/* Amenities */}
      {venue.amenities && venue.amenities.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Amenities</div>
          <div className="flex flex-wrap gap-2">
            {venue.amenities.map((amenity, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      {venue.pricing && (
        <div className="flex items-start gap-2 text-sm">
          <DollarSign className="h-4 w-4 mt-0.5" />
          <div>
            {venue.pricing.perEvent && (
              <div>${venue.pricing.perEvent.toLocaleString()} per event</div>
            )}
            {venue.pricing.perHour && (
              <div>${venue.pricing.perHour.toLocaleString()} per hour</div>
            )}
            {venue.pricing.notes && (
              <div className="text-muted-foreground">{venue.pricing.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Pros/Cons */}
      {venue.aiMetadata && (
        <div className="space-y-2 pt-2 border-t">
          {venue.aiMetadata.pros && venue.aiMetadata.pros.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-green-700">Pros</div>
              <ul className="text-xs space-y-0.5">
                {venue.aiMetadata.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {venue.aiMetadata.cons && venue.aiMetadata.cons.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-amber-700">Considerations</div>
              <ul className="text-xs space-y-0.5">
                {venue.aiMetadata.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <XCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      {venue.contact?.website && (
        <a
          href={venue.contact.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Visit website →
        </a>
      )}
    </Card>
  );

  // Expiration timer (similar to VendorProposalCard)
  // Edit mode (similar to VendorProposalCard)
  // Action buttons (similar to VendorProposalCard)

  return (
    <div className="space-y-4">
      {/* Expiration timer */}
      {/* Venue cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((venue, index) => renderVenueCard(venue, index))}
      </div>
      {/* Action buttons */}
    </div>
  );
}
```

---

### Phase 3: Schema Updates

#### 3a. Add venue_suggestions to Proposals Schema

**File**: `web/convex/proposals.ts`

**Change**:
```typescript
// Line 40-50
proposalType: v.union(
  v.literal("tasks"),
  v.literal("budget_entries"),
  v.literal("vendor_suggestions"),
  v.literal("venue_suggestions")  // ← ADD THIS
)
```

#### 3b. Verify/Add Venue Fields to Vendor Schema

**File**: `web/convex/schema.ts` (lines 660-735)

**Fields to verify/add**:
```typescript
vendors: defineTable({
  // ... existing fields ...

  // Venue-specific fields
  capacity: v.optional(v.number()),           // Guest count
  venueType: v.optional(v.union(              // Indoor/outdoor/both
    v.literal("indoor"),
    v.literal("outdoor"),
    v.literal("both")
  )),
  amenities: v.optional(v.array(v.string())), // Parking, catering, AV, etc.

  // ... rest of schema
})
```

**Note**: If these fields already exist, no changes needed. The schema should support both vendors and venues.

---

### Phase 4: Rendering Integration

#### 4a. Update FluidUIMessageRenderer

**File**: `web/src/components/messages/FluidUIMessageRenderer.tsx` (lines 210-248)

**Change**:
```typescript
case "proposal":
  const { proposal } = structuredData;

  // Determine component type based on proposalType
  const componentType =
    proposal.proposalType === "tasks"
      ? "TaskProposalCard"
      : proposal.proposalType === "budget_entries"
        ? "BudgetProposalCard"
        : proposal.proposalType === "venue_suggestions"  // ← ADD THIS
          ? "VenueProposalCard"
          : "VendorProposalCard";

  return (
    <LayoutController
      config={{
        sections: [{
          type: "row",
          layout: "1:1",
          components: [{
            type: componentType,
            props: {
              proposalId: proposal.proposalId,
              proposalType: proposal.proposalType,
              items: proposal.items,
              expiresAt: proposal.expiresAt,
              eventId,
              roomId: message.roomId,
            }
          }]
        }]
      }}
      eventId={eventId}
    />
  );
```

#### 4b. Register VenueProposalCard

**File**: `web/src/lib/fluid-ui/registerMessageComponents.ts`

**Add**:
```typescript
import { VenueProposalCard } from '@/components/fluid-ui/cards/VenueProposalCard';

// In registerComponents()
register('VenueProposalCard', VenueProposalCard);
```

#### 4c. Update multi_block Rendering

**File**: `web/src/components/messages/FluidUIMessageRenderer.tsx` (lines 141-173)

**Change**:
```typescript
case "proposal":
  const proposalData = block.proposalData;
  const componentType =
    proposalData.proposalType === "tasks"
      ? "TaskProposalCard"
      : proposalData.proposalType === "budget_entries"
        ? "BudgetProposalCard"
        : proposalData.proposalType === "venue_suggestions"  // ← ADD THIS
          ? "VenueProposalCard"
          : "VendorProposalCard";
```

---

### Phase 5: System Prompt Updates

**File**: `agent-worker/src/agents/UnifiedDelphiAgent.ts` (lines 600-850)

**Additions**:

#### 5a. Document Informational Flag

```typescript
// Add after TOOL 2: web_search section (around line 724)

📋 INFORMATIONAL vs ACTIONABLE QUERIES:

When users ask about vendors/venues, determine if they want:

1. **Actionable Results** (Generate Proposal):
   - "Find photographers in Seattle"
   - "Search for venues that hold 200 people"
   - "Help me hire a DJ"
   - "Show me catering options"
   → Use web_search tool, then generate vendor/venue proposal

2. **Informational Results** (Simple Text):
   - "What are photographer prices like?"
   - "Tell me about DJ services"
   - "How much do venues cost?"
   - "What should I look for in a caterer?"
   → Provide helpful text response, NO proposal

**Default**: Generate proposals for search results (user can dismiss)
**Override**: If query is clearly informational, skip proposal
```

#### 5b. Add Venue Search Strategy

```typescript
// Add after vendor search strategy (around line 740)

🏛️ VENUE SEARCH STRATEGY:

Location-Aware Queries:
- "wedding venues [city]"
- "[venue type] event spaces near [location]"
- "indoor venues with capacity [number]"

Key Information to Extract:
1. Capacity (guest count)
2. Venue type (indoor/outdoor/both)
3. Amenities (parking, catering, AV, etc.)
4. Pricing (per-hour, per-event, deposit)
5. Location and directions
6. Availability calendar
7. Reviews and ratings

Search Sources:
- WeddingWire, The Knot, Venue Report
- Google Reviews, Yelp
- Venue-specific websites
- Local event planning sites

Analysis:
- Match capacity to event guest count
- Consider weather for outdoor venues
- Check amenity requirements (catering, parking, AV)
- Compare pricing across similar venues
- Review availability for event date
```

#### 5c. Update Tool Usage Examples

```typescript
// Update TOOL 2 examples (around line 700)

Example Vendor Search:
User: "Find photographers in Seattle for my wedding"
1. Use web_search: "wedding photographers Seattle reviews ratings"
2. Parse results (name, pricing, ratings, portfolio)
3. Generate vendor proposal with 3-5 top options
4. Include AI analysis (pros/cons, match score)

Example Venue Search:
User: "Search for venues that can hold 150 people"
1. Use web_search: "event venues 150 capacity [location]"
2. Parse results (capacity, amenities, pricing)
3. Generate venue proposal with 3-5 options
4. Include AI analysis (pros/cons, match score)

Example Informational Query:
User: "What are typical DJ prices?"
1. Use web_search: "DJ pricing wedding events"
2. Summarize pricing ranges
3. Return simple text response (NO proposal)
4. Offer to search for specific DJs if helpful
```

---

## Code Reference

### Key Files Modified

**Agent Worker** (`agent-worker/src/`):
1. ✅ `agents/UnifiedDelphiAgent.ts:284-296` - Force vendor/venue proposals
2. 🚧 `agents/UnifiedDelphiAgent.ts` - Add `parseSearchResultsToProposal()` method
3. 🚧 `agents/UnifiedDelphiAgent.ts:305-400` - Update `buildProposal()`
4. 🚧 `agents/UnifiedDelphiAgent.ts:600-850` - Update system prompt

**Web Frontend** (`web/src/`):
1. 🚧 `components/fluid-ui/cards/VenueProposalCard.tsx` - NEW component
2. 🚧 `lib/fluid-ui/registerMessageComponents.ts` - Register VenueProposalCard
3. 🚧 `components/messages/FluidUIMessageRenderer.tsx:210-248` - Add venue rendering

**Convex Schema** (`web/convex/`):
1. 🚧 `proposals.ts:40-50` - Add `venue_suggestions` type
2. ✅ `schema.ts:660-735` - Verify venue fields exist
3. ✅ `vendors.ts` - Verify `createVendor()` handles venues

### Integration Points

**Search Flow**:
```
User: "find photographers in Seattle"
  ↓
IntentDetector: search_vendors (0.95 confidence)
  ↓
shouldGenerateProposal(): TRUE (vendor search detected)
  ↓
handle() → ReAct loop
  ↓
Tool: web_search("wedding photographers Seattle")
  ↓
buildProposal():
  - Get search results from tool
  - Call parseSearchResultsToProposal()
  - AI extracts vendor details + pros/cons
  - Generate proposal with 3-5 vendors
  ↓
RoomOrchestratorDO:
  - Save proposal to database (api.proposals.create)
  - Create message with proposalId
  ↓
Frontend:
  - FluidUIMessageRenderer detects proposal
  - Renders VendorProposalCard
  - User can Accept/Edit/Dismiss
  ↓
User clicks "Save All"
  ↓
api.proposals.confirm → api.vendors.create (for each vendor)
  ↓
Vendors saved with status: "researching"
```

**Venue Flow** (same as vendor, different component):
```
User: "search for venues with 200 capacity"
  ↓
IntentDetector: search_venue
  ↓
... same flow as vendor search ...
  ↓
Frontend:
  - Renders VenueProposalCard (venue-specific fields)
  ↓
Venues saved to vendors table with category: "venue"
```

---

## Testing Strategy

### Unit Tests

**Agent Logic**:
```typescript
// test: shouldGenerateProposal() for vendor searches
describe('shouldGenerateProposal', () => {
  it('should return true for vendor searches', () => {
    const result = agent.shouldGenerateProposal(
      { message: 'find photographers', ... },
      'search_vendors'
    );
    expect(result).toBe(true);
  });

  it('should return true for venue searches', () => {
    const result = agent.shouldGenerateProposal(
      { message: 'search for venues', ... },
      'search_venue'
    );
    expect(result).toBe(true);
  });
});

// test: parseSearchResultsToProposal()
describe('parseSearchResultsToProposal', () => {
  it('should extract vendor details from search results', async () => {
    const mockResults = [
      { title: 'Best Photography Co', snippet: '...', url: '...' }
    ];
    const items = await agent.parseSearchResultsToProposal(
      mockResults,
      'photography',
      eventContext,
      false
    );
    expect(items).toHaveLength(1);
    expect(items[0].data.name).toBe('Best Photography Co');
    expect(items[0].data.aiMetadata.pros).toBeDefined();
  });
});
```

**Component Tests**:
```typescript
// test: VenueProposalCard rendering
describe('VenueProposalCard', () => {
  it('should render venue-specific fields', () => {
    const { getByText } = render(
      <VenueProposalCard
        items={[{ name: 'Grand Ballroom', capacity: 200, ... }]}
        ...
      />
    );
    expect(getByText('Up to 200 guests')).toBeInTheDocument();
    expect(getByText('Grand Ballroom')).toBeInTheDocument();
  });

  it('should call confirmProposal on accept', async () => {
    const mockConfirm = jest.fn();
    const { getByText } = render(<VenueProposalCard ... />);
    fireEvent.click(getByText('Save All'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
  });
});
```

### Integration Tests

**End-to-End Vendor Search**:
```typescript
describe('Vendor Search Integration', () => {
  it('should search, propose, and save vendors', async () => {
    // 1. Send message
    const response = await invokeAgent({
      message: 'find photographers in Seattle',
      eventId: 'test_event',
      roomId: 'test_room'
    });

    // 2. Verify proposal created
    expect(response.structuredData.type).toBe('proposal');
    expect(response.structuredData.proposal.proposalType).toBe('vendor_suggestions');

    const proposalId = response.structuredData.proposal.proposalId;

    // 3. Confirm proposal
    await confirmProposal({
      proposalId,
      action: 'accept_all',
      data: { items: response.structuredData.proposal.items }
    });

    // 4. Verify vendors created
    const vendors = await queryVendors({ eventId: 'test_event' });
    expect(vendors.length).toBeGreaterThan(0);
    expect(vendors[0].status).toBe('researching');
  });
});
```

### Manual Testing Checklist

**Vendor Search**:
- [ ] "@Delphi find photographers in Seattle" → VendorProposalCard with 3-5 options
- [ ] Vendor cards show pricing, ratings, contact info
- [ ] Pros/cons analysis appears for each vendor
- [ ] Match score displayed (percentage)
- [ ] "Save All" creates vendors with status: "researching"
- [ ] "Edit" mode allows inline editing
- [ ] "Dismiss" rejects proposal
- [ ] Expiration timer shows and expires after 5 minutes

**Venue Search**:
- [ ] "@Delphi search for venues with 200 capacity" → VenueProposalCard
- [ ] Venue cards show capacity, amenities, venue type
- [ ] Pricing shows per-hour and per-event rates
- [ ] Location and map info displayed
- [ ] "Save All" creates venues (category: "venue")
- [ ] Venue-specific fields editable in edit mode

**Informational Queries**:
- [ ] "What are photographer prices like?" → Simple text (no proposal)
- [ ] "Tell me about DJ services" → Text response with info
- [ ] "How much do venues cost?" → Text with pricing ranges

**Multi-Intent**:
- [ ] "Add expense $2k for DJ and find DJs in Seattle" → BudgetProposalCard + VendorProposalCard (multi_block)
- [ ] Both proposals work independently
- [ ] Accept one, dismiss another works correctly

---

## Future Enhancements

### Phase 6: Advanced Features

#### 6a. Vendor Comparison Tool
- Side-by-side comparison of saved vendors
- Highlight differences in pricing, ratings, amenities
- Export comparison as PDF

#### 6b. Vendor Communication Tracking
- Email templates for vendor outreach
- Track communication status (contacted, responded, negotiating)
- Set reminders for follow-ups
- Calendar integration for meetings

#### 6c. Venue Availability Calendar
- Integration with venue booking systems
- Real-time availability checking
- Date hold/deposit workflows
- Conflict detection with event date

#### 6d. Smart Vendor Recommendations
- ML-based recommendations based on:
  - Event type and budget
  - Previously hired vendors
  - User preferences and ratings
  - Similar events (collaborative filtering)

#### 6e. Budget Impact Analysis
- Show how vendor selection affects total budget
- Suggest alternatives if over budget
- Package deals and bundle savings
- Track actual costs vs estimates

#### 6f. Review Aggregation
- Pull reviews from multiple sources (Yelp, Google, The Knot, WeddingWire)
- Sentiment analysis on reviews
- Extract common themes (reliability, communication, quality)
- Show review trends over time

#### 6g. Venue Virtual Tours
- Embed 360° virtual tours
- Floor plan uploads and editing
- Seat map planning
- AR preview of venue setup

---

## Appendix

### Related Documents

- [Phase 3: AI Intelligence](./phase-3-ai-intelligence.md) - Overall AI agent architecture
- [Fluid UI Integration Plan](../FLUID_UI_INTEGRATION_PLAN.md) - Component system
- [Multi-Intent Detection](./multi-intent-detection.md) - Multi-intent handling

### Change Log

**2025-01-17**:
- Initial document creation
- Phase 1a implementation completed (force vendor/venue proposals)
- Phases 1b-5 planned and documented

### Contributors

- AI Agent System (primary implementation)
- User feedback and requirements

---

## Status Summary

| Phase | Status | Files Modified | Estimated Hours |
|-------|--------|----------------|-----------------|
| 1a. Force proposals | ✅ Complete | `UnifiedDelphiAgent.ts` | 0.5h |
| 1b. Parse search results | 🚧 Planned | `UnifiedDelphiAgent.ts` | 2-3h |
| 1c. Update buildProposal | 🚧 Planned | `UnifiedDelphiAgent.ts` | 1-2h |
| 1d. Informational flag | 🚧 Planned | `UnifiedDelphiAgent.ts` | 1h |
| 2. VenueProposalCard | 🚧 Planned | `VenueProposalCard.tsx` + registry | 3-4h |
| 3. Schema updates | 🚧 Planned | `proposals.ts`, `schema.ts` | 0.5h |
| 4. Rendering integration | 🚧 Planned | `FluidUIMessageRenderer.tsx` | 1h |
| 5. System prompt | 🚧 Planned | `UnifiedDelphiAgent.ts` | 0.5h |
| **TOTAL** | **10% Complete** | **8 files** | **9.5-12.5h** |

**Next Steps**: Implement Phase 1b (parseSearchResultsToProposal method)

---

*End of Document*
