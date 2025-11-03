# Event Planning Platform: AI-Powered Feature Implementation Plan

**Version:** 1.0  
**Date:** October 30, 2025  
**Purpose:** Technical implementation strategy mapping features to AI architecture

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Feature-by-Feature Implementation](#feature-by-feature-implementation)
3. [Cross-Feature AI Patterns](#cross-feature-ai-patterns)
4. [Agent Collaboration Workflows](#agent-collaboration-workflows)
5. [Context Assembly Strategies](#context-assembly-strategies)
6. [Trigger & Response Flows](#trigger--response-flows)
7. [Performance & Optimization](#performance--optimization)

---

## Implementation Overview

### Architecture Mapping Strategy

This document details how each of the 14 core features will be implemented using our specialized AI agent system. Each feature leverages one or more agents with carefully orchestrated triggers, context assembly, and response patterns.

### AI Agent Quick Reference

- **Task Enricher Agent**: Transforms commitments into detailed tasks
- **Promise Manager Agent**: Tracks expense fulfillment after task completion
- **Budget Analyst Agent**: Analyzes spending and recommends splits
- **Planning Advisor Agent**: Provides strategic planning guidance
- **Dependency Analyzer Agent**: Manages task relationships and timelines

### Implementation Principles

1. **Right Agent, Right Time**: Match features to appropriate specialized agents
2. **Progressive Context Loading**: Start minimal, scale up only when needed
3. **Fail Gracefully**: Always provide value even if AI fails
4. **Stream Everything**: Real-time feedback enhances user experience
5. **Learn Continuously**: Use actual outcomes to improve predictions

---

## Feature-by-Feature Implementation

### Feature 1: Smart Task Creation

**AI Implementation Strategy**

**Pattern Detection Phase:**
```
User Message: "We should book a photographer"
↓
Pattern Detection Engine (< 5ms)
- Regex: /we should|need to|let's|have to/ + action verb
- Intent Classification: task_commitment
- Confidence: 0.92
- Decision: Trigger taskEnricher agent
```

**Agent Orchestration:**
- **Primary Agent**: Task Enricher (rich context)
- **Supporting Agents**: Dependency Analyzer, Budget Analyst
- **Temperature**: 0.7 (creative suggestions)
- **Max Tokens**: 1000

**Context Assembly:**
```typescript
{
  // Rich context for task enrichment
  eventType: "wedding",
  eventDate: "2026-06-15",
  budget: { total: 40000, spent: 12000 },
  existingTasks: [
    { id: "t1", name: "Book venue", status: "completed" },
    { id: "t2", name: "Create guest list", status: "in_progress" }
  ],
  attendeeCount: 150,
  recentMessages: [...last 10 messages...],
  userPreferences: { photoStyle: "candid", budget: "mid-range" }
}
```

**Prompt Engineering:**
```
System: You are an expert event planner. Transform this casual mention into 
a detailed, actionable task with:
- Clear description and next steps
- Cost estimate (min/max range) based on wedding with 150 guests
- Suggested deadline (photographer should be booked 6-9 months before)
- Dependencies (venue must be booked first)
- Vendor suggestions (3-5 photographers in their area/budget)

Format as JSON with schema: {...}

User mention: "We should book a photographer"
Event context: {context}
```

**Response Processing:**
```typescript
{
  taskId: "t3",
  name: "Book Wedding Photographer",
  description: "Find and secure a professional wedding photographer...",
  estimatedCost: { min: 2500, max: 4500 },
  suggestedDeadline: "2025-12-15", // 6 months before event
  category: "photography",
  priority: "high",
  dependsOn: ["t1"], // Venue must be booked
  nextSteps: [
    "Review portfolio samples from suggested vendors",
    "Schedule consultation calls",
    "Confirm availability for June 15, 2026",
    "Compare packages and pricing"
  ],
  vendorSuggestions: [
    { name: "Sarah Chen Photography", rating: 4.8, price: "$3,200" },
    { name: "Moments by Mike", rating: 4.6, price: "$2,800" },
    { name: "Lens & Love Studio", rating: 4.9, price: "$4,200" }
  ],
  planningTips: [
    "Book photographer early as good ones fill up 12-18 months out",
    "Request to see full wedding albums, not just highlight reels",
    "Confirm they have backup equipment and a second shooter"
  ]
}
```

**Repeat Mention Detection:**
```typescript
// Track mention frequency
const mentionTracker = {
  "photographer": { count: 3, firstMention: "2025-10-28", lastMention: "2025-10-30" },
  "DJ": { count: 2, firstMention: "2025-10-29", lastMention: "2025-10-30" }
}

// Trigger proactive suggestion on 3rd mention
if (mentionTracker["photographer"].count >= 3) {
  sendProactiveMessage({
    text: "I've noticed you've mentioned booking a photographer 3 times. " +
          "Would you like me to create a task and suggest some vendors?",
    actions: ["Create Task", "Not Yet", "Remind Me Later"]
  });
}
```

**UI Integration:**
- Show task creation in real-time as AI generates response
- Stream vendor suggestions as they arrive
- Display quick actions: [Assign to Someone] [Schedule Calls] [View Full Task]
- Auto-open task detail panel with enriched information

---

### Feature 2: Vendor Suggestions & AI Enrichment

**AI Implementation Strategy**

**Trigger Point:** Task creation or "Find vendors" command

**Agent Orchestration:**
- **Primary Agent**: Task Enricher (handles vendor matching logic)
- **Context Level**: Rich (task details, budget, location, preferences)
- **External APIs**: Vendor database, review aggregators, pricing APIs

**Context Assembly:**
```typescript
{
  taskDetails: {
    name: "Book DJ",
    category: "entertainment",
    eventType: "wedding",
    eventDate: "2026-06-15",
    estimatedBudget: { min: 800, max: 1500 }
  },
  eventLocation: {
    venue: "Brooklyn Loft, Brooklyn, NY",
    coordinates: { lat: 40.6782, lng: -73.9442 }
  },
  userPreferences: {
    musicStyle: "mix of classic and contemporary",
    mustHave: ["wireless mic system", "dance floor lighting"]
  },
  pastVendorRatings: [] // Learn from user's past ratings
}
```

**Enrichment Process:**

**Step 1: Vendor Matching**
```typescript
// Query vendor database with AI-enhanced filters
const vendors = await vendorDB.search({
  category: "DJ",
  location: { near: coordinates, radius: 25 miles },
  availability: eventDate,
  priceRange: { min: 800, max: 1500 },
  ratings: { min: 4.0 }
});

// AI ranks vendors by fit
const rankedVendors = await taskEnricher.rankVendors({
  vendors,
  preferences: userPreferences,
  eventContext: { type: "wedding", formality: "semi-formal", guests: 150 }
});
```

**Step 2: Cost Intelligence**
```typescript
// AI provides typical cost breakdown
const costIntelligence = {
  typicalCost: {
    min: 900,
    max: 1400,
    median: 1150,
    basedOn: "150-200 guest weddings in Brooklyn"
  },
  costFactors: [
    "4-hour minimum is standard",
    "Lighting packages add $200-400",
    "Prices 20% higher for Saturday nights"
  ],
  budgetTip: "Your $800-1500 budget is appropriate for this market"
}
```

**Step 3: Timeline Recommendations**
```typescript
// AI generates booking timeline
const timeline = await taskEnricher.generateTimeline({
  taskType: "book_dj",
  eventDate: "2026-06-15",
  currentDate: "2025-10-30"
});

// Result:
{
  urgency: "medium",
  idealBookingWindow: "4-6 months before event",
  currentStatus: "7.5 months out - good timing",
  milestones: [
    { action: "Initial inquiries", deadline: "2025-11-15" },
    { action: "Schedule consultations", deadline: "2025-12-01" },
    { action: "Make final decision", deadline: "2025-12-15" },
    { action: "Sign contract & pay deposit", deadline: "2026-01-01" }
  ]
}
```

**Step 4: Question Generation**
```typescript
// AI creates vendor-specific questions
const questionsToAsk = await taskEnricher.generateQuestions({
  vendorType: "DJ",
  eventType: "wedding"
});

// Result:
{
  essential: [
    "Are you available June 15, 2026?",
    "What's included in your standard package?",
    "Do you have backup equipment and a contingency plan?",
    "Can we request specific songs and create a do-not-play list?"
  ],
  recommended: [
    "How do you handle song requests from guests?",
    "What's your process for reading the room and adjusting music?",
    "Do you provide wireless mics for toasts and announcements?",
    "Can you MC the event (introductions, timeline coordination)?"
  ],
  contractChecklist: [
    "Confirm exact hours of service and overtime rates",
    "Verify equipment list (speakers, lights, mics)",
    "Clarify cancellation and postponement policies",
    "Check if they require vendor meal and break times"
  ]
}
```

**Response Format:**
```json
{
  "vendorSuggestions": [
    {
      "id": "v123",
      "name": "Groove Masters DJ Service",
      "rating": 4.8,
      "reviewCount": 127,
      "priceRange": "$1,100 - $1,400",
      "availability": "likely_available",
      "distance": "3.2 miles",
      "specialties": ["weddings", "crowd reading", "lighting"],
      "highlights": [
        "Veteran wedding DJ with 200+ events",
        "Full dance floor lighting included",
        "Wireless mic system for toasts"
      ],
      "recentReview": {
        "text": "Made our wedding reception unforgettable!",
        "rating": 5,
        "date": "2025-09-14"
      },
      "quickActions": [
        { "label": "View Portfolio", "action": "open_portfolio" },
        { "label": "Send Inquiry", "action": "send_message" },
        { "label": "Schedule Call", "action": "schedule_consultation" }
      ]
    },
    // ... 4 more vendors ...
  ],
  "costGuidance": {
    "yourBudget": { "min": 800, "max": 1500 },
    "marketRange": { "min": 900, "max": 1400 },
    "assessment": "Your budget is appropriate for quality DJs in this market",
    "savingTips": [
      "Book on Friday or Sunday to save 10-15%",
      "Basic package without extra lighting saves $200-300"
    ]
  },
  "timeline": { /* as above */ },
  "questionsToAsk": { /* as above */ },
  "nextSteps": [
    "Review portfolios and select top 3 DJs",
    "Send inquiry messages through our platform",
    "Schedule phone/video consultations",
    "Compare packages and make decision by December 15"
  ]
}
```

**Communication Tracking:**
```typescript
// Store all vendor interactions
interface VendorCommunication {
  vendorId: string;
  taskId: string;
  type: "inquiry" | "response" | "call" | "meeting";
  timestamp: Date;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  nextAction?: string;
}

// AI analyzes communication history
const analysisPrompt = `
Based on this communication history with Groove Masters DJ:
- Initial inquiry sent: Oct 30
- Response received: Nov 1 (positive, provided pricing)
- Call scheduled: Nov 8 at 2pm
- Call completed: Nov 8 (went well, liked their vibe)
- Quote received: Nov 9 ($1,250 for standard package)

Status assessment: This vendor looks promising. They're responsive, 
price is within budget, and call went well. 
Recommendation: Schedule in-person meeting to finalize.
```

---

### Feature 3: Smart Interactive Inline Polls

**AI Implementation Strategy**

**Poll Creation Detection:**
```typescript
// Pattern detection for poll-like language
const pollPatterns = [
  /should we (.*) or (.*)\?/i,
  /what do you (think|prefer|want).*\?/i,
  /vote.*between (.*) and (.*)/i,
  /(buffet|plated|family style|cocktail)/i // food service detection
];

// User: "Should we do buffet or plated dinner?"
const detected = {
  intent: "create_poll",
  pollType: "multiple_choice",
  question: "Should we do buffet or plated dinner?",
  options: ["Buffet", "Plated Dinner"],
  context: "catering decision",
  confidence: 0.94
}
```

**Agent Orchestration:**
- **Primary Agent**: Planning Advisor (understands decision context)
- **Context Level**: Standard (recent discussion, event details, stakeholders)
- **Purpose**: Enrich poll with context and consequences

**Context-Aware Poll Enhancement:**
```typescript
// AI enriches simple poll with context
const enrichedPoll = await planningAdvisor.enrichPoll({
  originalQuestion: "Should we do buffet or plated dinner?",
  eventContext: {
    type: "wedding",
    guests: 150,
    budget: { catering: { allocated: 9000, spent: 0 } },
    venueType: "indoor loft",
    formality: "semi-formal"
  }
});

// Result:
{
  pollId: "p123",
  question: "Dinner Service Style",
  description: "Choose the meal service format for your wedding reception",
  pollType: "multiple_choice",
  options: [
    {
      id: "opt1",
      label: "Buffet Style",
      description: "Guests serve themselves from food stations",
      pros: [
        "More variety and guest choice",
        "Can accommodate dietary needs better",
        "More casual and social atmosphere"
      ],
      cons: [
        "Can create lines and wait times",
        "Food presentation less formal",
        "Requires more space for buffet setup"
      ],
      typicalCost: "$65-85 per person",
      aiInsight: "Buffet works well for your semi-formal loft setting and allows guests to mingle"
    },
    {
      id: "opt2",
      label: "Plated Dinner",
      description: "Pre-selected meals served at tables",
      pros: [
        "More elegant and formal",
        "Controlled portions and timing",
        "No lines or waiting"
      ],
      cons: [
        "Requires collecting meal preferences in advance",
        "Less flexibility for dietary restrictions",
        "More formal service may slow down reception"
      ],
      typicalCost: "$75-95 per person",
      aiInsight: "Plated service adds formality and ensures precise timing for your event flow"
    }
  ],
  aiRecommendation: {
    suggestion: "Consider a hybrid: plated appetizer and salad, then buffet entrées",
    reasoning: "Combines elegance with variety and keeps costs moderate at ~$70/person",
    budgetImpact: "Would cost approximately $10,500 for 150 guests"
  },
  votingDeadline: "2025-11-15", // AI suggests reasonable deadline
  participants: ["@coordinator", "@all_collaborators"],
  tieBreaker: "coordinator"
}
```

**Real-time Vote Processing:**
```typescript
// AI tracks votes and provides insights
interface VoteAnalysis {
  currentResults: {
    buffet: { votes: 5, percentage: 62.5, voters: ["Alice", "Bob", "Carol", "Dave", "Eve"] },
    plated: { votes: 3, percentage: 37.5, voters: ["Frank", "Grace", "Henry"] }
  },
  
  trendAnalysis: {
    momentum: "buffet",
    reason: "Last 3 votes all for buffet",
    projectedWinner: "buffet (if trend continues)"
  },
  
  demographicInsights: {
    byRole: {
      familyMembers: { buffet: 4, plated: 1 },
      friends: { buffet: 1, plated: 2 }
    },
    aiObservation: "Family members strongly prefer buffet style"
  },
  
  pendingVoters: ["Ian", "Julia", "Kate"],
  
  aiNudge: {
    message: "Only 3 votes left! Buffet is leading but outcome could still change.",
    urgency: "medium",
    suggestedAction: "Send reminder to pending voters"
  }
}
```

**Poll Result Synthesis:**
```typescript
// When poll closes, AI synthesizes decision
const synthesis = await planningAdvisor.synthesizePollResults({
  pollId: "p123",
  finalResults: { buffet: 8, plated: 4 },
  context: eventContext
});

// Result:
{
  decision: "Buffet Style Dinner",
  confidence: "strong (67% voted buffet)",
  summary: "The group has decided on buffet-style service for the wedding reception",
  
  nextSteps: [
    {
      action: "Update catering task with buffet specifications",
      auto: true // Automatically applied
    },
    {
      action: "Create task: Source buffet menu options",
      priority: "high",
      assignTo: "@coordinator"
    },
    {
      action: "Contact caterers to confirm buffet pricing",
      deadline: "2025-11-20"
    }
  ],
  
  budgetUpdate: {
    category: "catering",
    estimatedCost: { min: 9750, max: 12750 },
    note: "Buffet typically $65-85/person for 150 guests"
  },
  
  impactAnalysis: {
    timeline: "No change needed",
    dependencies: [
      "Will need to confirm buffet table space with venue",
      "May need to add task for buffet decor/signage"
    ],
    risks: [
      {
        risk: "Lines may form during service",
        mitigation: "Consider multiple buffet stations or staggered table release"
      }
    ]
  },
  
  recordedDecision: {
    id: "dec123",
    category: "catering",
    what: "Dinner service style",
    decision: "Buffet",
    why: "Group vote: 8 for buffet, 4 for plated. Family members preferred casual atmosphere.",
    when: "2025-11-05",
    impact: "medium"
  }
}
```

**Re-Poll Handling:**
```typescript
// If circumstances change
// User: "Actually, venue says buffet space is limited. Should we reconsider?"

const rePollAnalysis = await planningAdvisor.assessRePoll({
  originalPoll: "p123",
  originalDecision: "buffet",
  newContext: "Venue has limited space for buffet stations",
  timeSinceDecision: "5 days"
});

// Result:
{
  rePollJustified: true,
  reasoning: "Significant constraint (venue space) was not known during original vote",
  
  suggestedApproach: "hybrid_solution",
  hybridProposal: {
    option: "Plated main course + buffet appetizer station",
    benefits: [
      "Works within venue space constraints",
      "Still offers some variety and choice",
      "May satisfy both voter preferences"
    ],
    needsVote: true
  },
  
  rePollOptions: [
    "Plated dinner (original runner-up)",
    "Hybrid: plated + appetizer buffet",
    "Persist with buffet (venue should accommodate)"
  ],
  
  aiMessage: "New venue constraints suggest reconsidering the dinner service. " +
              "I recommend voting on a hybrid approach that satisfies both the desire " +
              "for variety and venue limitations."
}
```

---

### Feature 4: Expense Tracker & Smart Split

**AI Implementation Strategy**

**Expense Detection:**
```typescript
// Pattern detection for expenses
const expensePatterns = [
  /\$\d+(\.\d{2})?/,  // Dollar amounts
  /paid \d+/i,
  /cost(ed)? \d+/i,
  /spent \d+/i,
  /deposit of/i
];

// User: "$500 for venue deposit"
const detected = {
  intent: "expense_entry",
  amount: 500,
  category: "venue",
  type: "deposit",
  confidence: 0.88
}
```

**Agent Orchestration:**
- **Primary Agent**: Budget Analyst (expense categorization and splitting)
- **Supporting Agent**: Promise Manager (if linked to task completion)
- **Context Level**: Rich (all expenses, budget, participants, payment history)

**Automatic Category Detection:**
```typescript
// AI categorizes expenses intelligently
const categorization = await budgetAnalyst.categorizeExpense({
  description: "$500 for venue deposit",
  existingCategories: [
    "venue", "catering", "photography", "music", "decor", 
    "attire", "flowers", "stationery", "other"
  ],
  eventContext: { type: "wedding", existingTasks: [...] }
});

// Result:
{
  primaryCategory: "venue",
  confidence: 0.96,
  subCategory: "deposit",
  reasoning: "Keywords 'venue' and 'deposit' clearly indicate venue expense",
  
  suggestedMetadata: {
    paymentType: "deposit",
    isRecurring: false,
    requiresFollowup: true,
    followupNote: "Remainder of venue payment typically due 30 days before event"
  },
  
  relatedTask: {
    taskId: "t1",
    taskName: "Book venue",
    shouldMarkComplete: true,
    note: "Venue deposit typically indicates task is complete or nearly complete"
  }
}
```

**Visual Budget Dashboard Data:**
```typescript
// AI generates dashboard insights
const dashboardData = await budgetAnalyst.generateBudgetDashboard({
  totalBudget: 40000,
  spentToDate: 12500,
  allocatedByCategory: { /* budget plan */ },
  actualByCategory: { /* actual expenses */ },
  completedTasks: 12,
  totalTasks: 48,
  eventDate: "2026-06-15"
});

// Result:
{
  summary: {
    totalBudget: 40000,
    spent: 12500,
    remaining: 27500,
    percentSpent: 31.25,
    percentTasksComplete: 25,
    
    healthStatus: "on_track",
    aiAssessment: "Spending is slightly ahead of task completion pace, " +
                  "but well within acceptable range. On track to stay under budget."
  },
  
  categoryBreakdown: [
    {
      category: "venue",
      allocated: 12000,
      spent: 5000,
      remaining: 7000,
      percentSpent: 41.7,
      status: "under_budget",
      forecast: {
        estimatedTotal: 11200,
        confidence: "high",
        reasoning: "Deposit paid, final payment will be ~$6,200 based on contract"
      }
    },
    {
      category: "photography",
      allocated: 4000,
      spent: 0,
      remaining: 4000,
      percentSpent: 0,
      status: "not_started",
      urgency: "high",
      forecast: {
        estimatedTotal: 3500,
        confidence: "medium",
        reasoning: "Based on vendor quotes, likely to come in under budget"
      }
    },
    // ... other categories ...
  ],
  
  forecastToCompletion: {
    projectedTotal: 38750,
    varianceFromBudget: -1250,
    likelihood: "will_come_under_budget",
    confidence: 0.72,
    
    assumptions: [
      "Remaining vendor quotes are accurate",
      "No major scope changes",
      "All deposits reflect full contracted amounts"
    ],
    
    risks: [
      {
        category: "catering",
        risk: "Guest count may increase",
        potentialCost: "+$2,000",
        likelihood: "medium"
      }
    ]
  },
  
  warnings: [
    {
      severity: "info",
      category: "catering",
      message: "Catering decision needed soon - 60% of budget allocated but nothing spent",
      action: "Finalize catering vendor this month to lock in pricing"
    }
  ],
  
  optimizationSuggestions: [
    {
      category: "flowers",
      currentAllocated: 3000,
      suggestion: "Consider reducing by $500",
      reasoning: "You're under budget overall, but floral costs often spiral. " +
                 "Starting with a slightly lower allocation leaves buffer room.",
      potentialSavings: 500
    }
  ]
}
```

**Smart Expense Splitting:**
```typescript
// AI recommends split method
const splitRecommendation = await budgetAnalyst.recommendSplit({
  expense: {
    amount: 5000,
    description: "Venue deposit",
    paidBy: "Alice"
  },
  participants: [
    { id: "alice", role: "coordinator", contributions: 8200 },
    { id: "bob", role: "coordinator", contributions: 4300 },
    { id: "carol", role: "collaborator", contributions: 0 }
  ],
  eventContext: { type: "wedding", hosts: ["alice", "bob"] }
});

// Result:
{
  recommendedMethod: "custom_split",
  reasoning: "Alice and Bob are listed as coordinators/hosts. Wedding expenses " +
             "are typically covered by hosts rather than split among all participants.",
  
  splitOptions: [
    {
      method: "even_split_coordinators",
      label: "Split evenly between coordinators",
      description: "Alice and Bob each responsible for 50%",
      splits: [
        { person: "Alice", amount: 2500, status: "already_paid" },
        { person: "Bob", owes: 2500, payTo: "Alice" }
      ],
      total: 5000,
      recommended: true
    },
    {
      method: "proportional",
      label: "Proportional to previous contributions",
      description: "Based on existing contribution ratio (Alice 66%, Bob 34%)",
      splits: [
        { person: "Alice", amount: 3300, status: "already_paid", owes: 0 },
        { person: "Bob", amount: 1700, owes: 0, payTo: "Alice" }
      ],
      note: "Alice overpaid by $1,700, Bob should reimburse"
    },
    {
      method: "even_split_all",
      label: "Split among all participants",
      description: "Alice, Bob, and Carol each pay 1/3",
      splits: [
        { person: "Alice", amount: 1666.67, status: "already_paid", overpaid: 3333.33 },
        { person: "Bob", amount: 1666.67, owes: 1666.67, payTo: "Alice" },
        { person: "Carol", amount: 1666.67, owes: 1666.67, payTo: "Alice" }
      ],
      recommended: false,
      note: "Carol is a collaborator, not a host, so this split may not be appropriate"
    }
  ],
  
  paymentTracking: {
    totalOwed: 2500,
    owedTo: "Alice",
    owedBy: [
      { person: "Bob", amount: 2500, status: "pending" }
    ],
    reminders: [
      {
        when: "7_days_after_expense",
        message: "Friendly reminder: Bob, please reimburse Alice $2,500 for venue deposit"
      }
    ]
  },
  
  aiSuggestion: "I recommend splitting this expense between Alice and Bob only, " +
                "since they're the coordinators/hosts. Even 50/50 split seems fair."
}
```

**Receipt Management:**
```typescript
// AI processes receipt uploads
interface ReceiptProcessing {
  receiptImage: File;
  expenseId: string;
}

const receiptAnalysis = await budgetAnalyst.processReceipt({
  image: receiptImageData,
  existingExpense: {
    amount: 5000,
    description: "Venue deposit",
    category: "venue"
  }
});

// Result (using vision-capable AI):
{
  extractedData: {
    merchant: "Brooklyn Loft Spaces",
    amount: 5000.00,
    date: "2025-10-30",
    paymentMethod: "Credit Card ****1234",
    items: [
      { description: "Venue rental deposit", amount: 5000.00 }
    ],
    taxAmount: 0,
    total: 5000.00
  },
  
  validation: {
    matchesExpense: true,
    amountMatch: "exact",
    confidence: 0.98,
    discrepancies: []
  },
  
  metadata: {
    receiptNumber: "INV-2025-10-0847",
    dueBalance: 7000.00,
    dueDate: "2026-05-15",
    notes: "Remainder due 30 days before event"
  },
  
  suggestedActions: [
    {
      action: "create_reminder",
      description: "Reminder to pay venue balance",
      amount: 7000,
      dueDate: "2026-05-15"
    },
    {
      action: "update_budget_forecast",
      category: "venue",
      projectedTotal: 12000
    }
  ],
  
  storageInfo: {
    stored: true,
    path: "/receipts/venue/2025-10-30-brooklyn-loft.pdf",
    accessible: ["coordinators"]
  }
}
```

**Export Reports:**
```typescript
// AI generates formatted expense reports
const exportReport = await budgetAnalyst.generateReport({
  eventId: "evt123",
  reportType: "tax_reimbursement",
  dateRange: { start: "2025-01-01", end: "2025-12-31" },
  categories: ["all"],
  groupBy: "category"
});

// Result:
{
  reportFormat: "PDF",
  sections: [
    {
      title: "Event Budget Summary",
      content: "Complete financial overview with totals by category"
    },
    {
      title: "Itemized Expenses",
      content: "All expenses with dates, amounts, payers, and receipts"
    },
    {
      title: "Payment Tracking",
      content: "Who paid what, who owes whom, payment status"
    },
    {
      title: "Tax-Deductible Items",
      content: "Expenses that may qualify for tax deductions (if applicable)",
      note: "AI identifies potentially deductible items but user should consult tax advisor"
    }
  ],
  
  downloadUrl: "/reports/evt123-tax-reimbursement-2025.pdf",
  
  aiSummary: "Total expenses: $38,750. All receipts attached. " +
             "Alice paid $24,200, Bob paid $14,550. All balances settled."
}
```

---

### Feature 5: Contextual Reply System

**AI Implementation Strategy**

**Dynamic Input Transformation:**
```typescript
// AI detects message context and transforms input UI
interface ContextualReplyEngine {
  analyzeAIMessageContext(
    lastAIMessage: Message,
    conversationHistory: Message[]
  ): Promise<ReplyContext>
}

// Last AI message: "Here are 5 venues in your budget..."
const context = await analyzeAIMessageContext(lastAIMessage);

// Result:
{
  messageType: "venue_suggestions",
  detectedEntities: [
    { type: "venue", name: "Brooklyn Loft", id: "v1" },
    { type: "venue", name: "Rooftop Garden", id: "v2" },
    // ... 3 more venues
  ],
  
  suggestedReplyMode: "quick_actions",
  
  inputTransformation: {
    mode: "contextual_venue_reply",
    
    quickActions: [
      { label: "Schedule Tours", icon: "calendar", action: "bulk_schedule_tours" },
      { label: "Save Favorites", icon: "heart", action: "save_to_favorites" },
      { label: "Pass on All", icon: "x", action: "mark_not_interested" },
      { label: "Get More Options", icon: "search", action: "expand_search" }
    ],
    
    autoCompleteContext: {
      entityType: "venue",
      entities: [...detectedEntities...],
      
      smartCompletions: [
        {
          trigger: "yes",
          expansion: "Yes, I'd like to schedule a tour at Brooklyn Loft",
          confidence: 0.89
        },
        {
          trigger: "schedule",
          expansions: [
            "Schedule tour at Brooklyn Loft this Saturday",
            "Schedule tours at all 5 venues next week",
            "Schedule a call with Brooklyn Loft to discuss availability"
          ]
        },
        {
          trigger: "no",
          expansion: "No thanks, these venues don't fit our style. Can you find...",
          followupPrompt: "What are you looking for instead?"
        }
      ]
    },
    
    inlineEntityActions: {
      venue: {
        hoverActions: ["View Details", "Schedule Tour", "Save", "Pass"],
        clickAction: "expand_venue_card"
      }
    }
  }
}
```

**Smart Autofill Examples:**

**Budget Context:**
```typescript
// AI message: "You're at 60% of budget with 40% of tasks done"
// User starts typing: "$"

const autofill = await generateContextualAutofill({
  userInput: "$",
  messageContext: "budget_status",
  recentExpenses: [...],
  pendingTasks: [...]
});

// Result:
{
  inputMode: "expense_entry",
  
  formExpansion: {
    show: true,
    fields: [
      {
        name: "amount",
        type: "currency",
        placeholder: "$0.00",
        autoFocus: true,
        value: "" // User is typing
      },
      {
        name: "description",
        type: "text",
        placeholder: "What was this for?",
        smartSuggestions: [
          "Venue final payment",
          "Photography deposit",
          "Catering deposit"
        ]
      },
      {
        name: "category",
        type: "dropdown",
        options: ["venue", "catering", "photography", "music", "decor", "other"],
        smartDefault: "auto_detect" // AI will categorize from description
      },
      {
        name: "paidBy",
        type: "dropdown",
        options: ["Alice", "Bob", "Carol"],
        default: "current_user"
      }
    ],
    
    quickSubmit: true,
    
    aiAssist: {
      enabled: true,
      features: [
        "auto_category_detection",
        "smart_split_recommendation",
        "receipt_ocr_option"
      ]
    }
  },
  
  alternativeActions: [
    { label: "View Budget Breakdown", action: "show_budget_dashboard" },
    { label: "Add Planned Expense", action: "show_forecast_entry" }
  ]
}
```

**Task Assignment Context:**
```typescript
// AI message: "You have 3 overdue tasks"
// User types: "@"

const autofill = await generateContextualAutofill({
  userInput: "@",
  messageContext: "overdue_tasks",
  availableUsers: ["Alice", "Bob", "Carol", "Dave"],
  workloadData: {
    alice: { activeTasks: 8, overdueTaskOverdue: 1 },
    bob: { activeTasks: 3, overdueTaskOverdue: 0 },
    carol: { activeTasks: 5, overdueTaskOverdue: 2 },
    dave: { activeTasks: 1, overdueTaskOverdue: 0 }
  }
});

// Result:
{
  inputMode: "mention_assignment",
  
  mentionSuggestions: [
    {
      id: "dave",
      name: "Dave",
      displayName: "@Dave",
      avatar: "...",
      priority: "highest",
      reason: "Lightest workload (1 task, no overdue)",
      metadata: {
        role: "collaborator",
        specialties: ["music", "entertainment"],
        responseRate: "fast (avg 2 hours)"
      }
    },
    {
      id: "bob",
      name: "Bob",
      displayName: "@Bob",
      avatar: "...",
      priority: "high",
      reason: "Moderate workload (3 tasks, none overdue)",
      metadata: {
        role: "coordinator",
        specialties: ["budget", "contracts"],
        responseRate: "medium (avg 6 hours)"
      }
    },
    {
      id: "anyone",
      name: "Anyone available",
      displayName: "@anyone",
      icon: "users",
      priority: "medium",
      reason: "Creates unassigned task, notifies all",
      action: "broadcast_assignment"
    }
  ],
  
  contextAwareSuggestion: {
    text: "Dave has the lightest workload and responds quickly. Consider assigning to him.",
    confidence: 0.78
  },
  
  completionExamples: [
    "@Dave can you handle the DJ booking?",
    "@Bob @Carol decide on the color scheme together",
    "@anyone take care of the party favor orders"
  ]
}
```

**Date/Time Context:**
```typescript
// AI message: "Schedule vendor calls this week"
// User types: "next"

const autofill = await generateContextualAutofill({
  userInput: "next",
  messageContext: "scheduling",
  currentDate: "2025-10-30",
  userCalendar: [...availability...],
  vendorAvailability: [...]
});

// Result:
{
  inputMode: "datetime_picker",
  
  smartSuggestions: [
    {
      text: "next Tuesday at 2pm",
      datetime: "2025-11-04T14:00:00",
      confidence: 0.85,
      reasoning: "Most common meeting time, user typically free then"
    },
    {
      text: "next week",
      datetime: "2025-11-04T09:00:00", // Start of next week
      isRange: true,
      reasoning: "User said 'this week' - suggesting next week as alternative"
    },
    {
      text: "next Saturday",
      datetime: "2025-11-01T10:00:00",
      confidence: 0.62,
      reasoning: "Weekend time, good for vendor meetings"
    }
  ],
  
  calendarWidget: {
    show: true,
    defaultView: "week",
    highlightedDays: ["2025-11-04", "2025-11-05", "2025-11-06"],
    availabilityOverlay: true,
    
    aiInsights: [
      {
        date: "2025-11-04",
        note: "3 participants available 2-4pm",
        confidence: "high"
      }
    ]
  },
  
  contextualCompletions: [
    "Next Tuesday at 2pm with all vendors",
    "Next week, find mutual availability for the team",
    "Next Saturday morning for venue tour"
  ]
}
```

---

### Feature 6: Fluid On-Demand Dashboard UI

**AI Implementation Strategy**

**Topic Detection & Panel Routing:**
```typescript
// Real-time topic analysis as conversation flows
interface TopicAnalyzer {
  analyzeConversationTopic(
    currentMessage: string,
    recentMessages: Message[],
    currentPanels: Panel[]
  ): Promise<PanelOrchestration>
}

// User says: "How are we doing on budget?"
const panelOrchestration = await topicAnalyzer.analyze({
  currentMessage: "How are we doing on budget?",
  recentMessages: [...],
  currentPanels: ["task_summary", "countdown"]
});

// Result:
{
  detectedTopics: [
    {
      topic: "budget",
      confidence: 0.94,
      subtopics: ["spending_status", "budget_health"]
    }
  ],
  
  panelActions: [
    {
      action: "expand",
      panelId: "budget_dashboard",
      priority: "high",
      
      panelConfig: {
        view: "expense_breakdown",
        showCharts: true,
        highlightedMetrics: ["percentage_spent", "remaining_budget"],
        
        dataToLoad: {
          allExpenses: true,
          categoryBreakdown: true,
          forecast: true,
          recentTransactions: { limit: 10 }
        }
      },
      
      animation: {
        type: "slide_in_right",
        duration: 300
      }
    },
    {
      action: "minimize",
      panelId: "task_board",
      reason: "Not relevant to current topic",
      delay: 500 // Wait for budget panel to appear first
    }
  ],
  
  autoPin: false, // Don't auto-pin, user might just have quick question
  
  aiGeneratedContent: {
    panelHeader: "Budget Overview",
    quickStats: [
      { label: "Spent", value: "$12,500", status: "neutral" },
      { label: "Remaining", value: "$27,500", status: "positive" },
      { label: "% of Budget", value: "31%", status: "positive" }
    ],
    
    summaryText: "You've spent $12,500 (31%) of your $40,000 budget. " +
                 "This is on track for 25% task completion. Looking good!"
  }
}
```

**Dynamic Panel Appearance Examples:**

**Venue Discussion → Map + Photos:**
```typescript
// User: "Tell me more about Brooklyn Loft"
const response = await topicAnalyzer.analyze({
  currentMessage: "Tell me more about Brooklyn Loft",
  detectedEntities: [{ type: "venue", id: "v1", name: "Brooklyn Loft" }]
});

// Result:
{
  panelActions: [
    {
      action: "show",
      panelId: "venue_detail",
      
      panelContent: {
        venueId: "v1",
        venueName: "Brooklyn Loft",
        
        sections: [
          {
            type: "image_gallery",
            images: [
              { url: "...", caption: "Main event space" },
              { url: "...", caption: "Rooftop terrace" },
              { url: "...", caption: "Bridal suite" }
            ],
            layout: "carousel"
          },
          {
            type: "map",
            location: {
              address: "123 Main St, Brooklyn, NY 11201",
              coordinates: { lat: 40.6782, lng: -73.9442 }
            },
            showDirections: true,
            nearbyPOIs: ["Subway: 0.2mi", "Parking: on-site", "Hotels: 3 within 1mi"]
          },
          {
            type: "key_info",
            data: {
              capacity: "Up to 200 guests",
              pricing: "$8,000 - $12,000",
              availability: "Available June 15, 2026",
              included: [
                "Tables, chairs, linens",
                "In-house sound system",
                "Bridal suite access",
                "8-hour venue access"
              ]
            }
          },
          {
            type: "quick_actions",
            actions: [
              { label: "Schedule Tour", icon: "calendar" },
              { label: "Request Quote", icon: "file" },
              { label: "Save to Favorites", icon: "heart" },
              { label: "Compare with Others", icon: "compare" }
            ]
          }
        ]
      },
      
      position: "right_panel",
      width: "40%",
      resizable: true
    }
  ]
}
```

**Task Discussion → Task Board Overlay:**
```typescript
// User: "What tasks are still pending?"
const response = await topicAnalyzer.analyze({
  currentMessage: "What tasks are still pending?",
  intent: "task_query"
});

// Result:
{
  panelActions: [
    {
      action: "show_overlay",
      panelId: "task_board",
      
      panelConfig: {
        viewMode: "board", // vs. "list" or "timeline"
        
        columns: [
          {
            status: "not_started",
            tasks: [...],
            count: 18,
            aiHighlight: true,
            highlightReason: "These are your pending tasks"
          },
          {
            status: "in_progress",
            tasks: [...],
            count: 12
          },
          {
            status: "completed",
            tasks: [...],
            count: 18
          }
        ],
        
        filters: {
          applied: ["status:not_started", "status:in_progress"],
          available: ["assignee", "category", "priority", "deadline"]
        },
        
        sorting: "deadline_asc",
        
        aiInsights: {
          show: true,
          content: [
            {
              type: "alert",
              severity: "medium",
              message: "5 tasks are overdue",
              action: "View Overdue Tasks"
            },
            {
              type: "suggestion",
              message: "Consider assigning 'Book DJ' to someone this week",
              reasoning: "This task has been pending for 3 weeks"
            }
          ]
        }
      },
      
      overlayStyle: {
        type: "modal",
        size: "large",
        backdrop: "translucent",
        closeOnOutsideClick: true
      }
    }
  ]
}
```

**"Show me..." Commands:**
```typescript
// User: "Show me the timeline"
const magicKeywordDetection = {
  trigger: "show me",
  keyword: "timeline",
  matchedPanel: "gantt_timeline",
  confidence: 0.98
};

// Directly show panel without additional AI processing
const panelConfig = {
  panelId: "gantt_timeline",
  
  content: {
    viewType: "gantt",
    
    milestones: [
      { id: "m1", name: "Venue booked", date: "2025-11-01", status: "completed" },
      { id: "m2", name: "Save-the-dates sent", date: "2026-01-15", status: "not_started" },
      { id: "m3", name: "Vendors finalized", date: "2026-02-01", status: "in_progress" },
      { id: "m4", name: "Final headcount", date: "2026-05-15", status: "upcoming" },
      { id: "m5", name: "Wedding day!", date: "2026-06-15", status: "future" }
    ],
    
    taskGroups: [
      {
        category: "venue",
        tasks: [...],
        timespan: { start: "2025-08-01", end: "2025-11-01" }
      },
      {
        category: "catering",
        tasks: [...],
        timespan: { start: "2025-11-01", end: "2026-05-01" }
      }
      // ... other categories ...
    ],
    
    dependencies: [
      { from: "t1:book_venue", to: "t5:finalize_layout", type: "finish-to-start" },
      { from: "t8:guest_list", to: "t12:catering_count", type: "finish-to-start" }
    ],
    
    criticalPath: ["t1", "t12", "t15", "t42"], // Tasks that can't be delayed
    
    aiAnalysis: {
      onTrack: true,
      daysAhead: 3,
      riskyTasks: [
        {
          taskId: "t23",
          taskName: "Order invitations",
          risk: "Cutting it close - only 4 weeks of buffer",
          recommendation: "Finalize design and place order within 2 weeks"
        }
      ]
    }
  },
  
  interactivity: {
    draggable: true, // Can drag tasks to reschedule
    zoomable: true, // Zoom timeline in/out
    clickableNodes: true, // Click tasks for details
    
    contextActions: [
      { action: "Reschedule", applies: "all_tasks" },
      { action: "View Dependencies", applies: "tasks_with_deps" },
      { action: "Mark Complete", applies: "all_tasks" }
    ]
  }
};
```

---

### Feature 7: Magic Keywords System

**AI Implementation Strategy**

**Keyword Detection & Intent Disambiguation:**
```typescript
// Real-time autocomplete-based keyword detection
interface MagicKeywordEngine {
  detectKeyword(
    userInput: string,
    cursorPosition: number,
    conversationContext: Context
  ): KeywordMatch | null
}

// User types: "tas"
const match = await magicKeywordEngine.detectKeyword({
  userInput: "tas",
  cursorPosition: 3,
  conversationContext: {...}
});

// Result:
{
  partialMatch: true,
  suggestions: [
    {
      keyword: "tasks",
      matchScore: 0.95,
      action: "show_task_board",
      description: "View all tasks in board format",
      icon: "checklist"
    },
    {
      keyword: "task",
      matchScore: 0.85,
      action: "create_new_task",
      description: "Create a new task",
      icon: "plus"
    }
  ],
  
  disambiguationNeeded: true,
  disambiguationStrategy: "show_both_in_autocomplete"
}
```

**Keyword → Panel Mapping:**
```typescript
// Each magic keyword maps to specific panel configuration
const MAGIC_KEYWORDS = {
  "tasks": {
    panelId: "task_board",
    viewConfig: {
      mode: "board",
      filters: { status: ["not_started", "in_progress"] },
      sorting: "priority_desc",
      showCompleted: false
    },
    aiEnhancements: {
      highlightOverdue: true,
      suggestAssignments: true,
      showCriticalPath: true
    }
  },
  
  "budget": {
    panelId: "expense_dashboard",
    viewConfig: {
      mode: "breakdown",
      charts: ["pie_category", "line_spending_over_time"],
      tables: ["recent_expenses", "category_summary"]
    },
    aiEnhancements: {
      showForecasts: true,
      highlightOverspends: true,
      suggestOptimizations: true
    }
  },
  
  "timeline": {
    panelId: "gantt_chart",
    viewConfig: {
      mode: "gantt",
      granularity: "week",
      showMilestones: true,
      showDependencies: true
    },
    aiEnhancements: {
      highlightCriticalPath: true,
      predictDelays: true,
      suggestParallelization: true
    }
  },
  
  "guests": {
    panelId: "rsvp_tracker",
    viewConfig: {
      mode: "table",
      columns: ["name", "rsvp_status", "meal_preference", "plus_one", "notes"],
      filters: { rsvp_status: "all" },
      sorting: "last_name_asc"
    },
    aiEnhancements: {
      highlightPendingRSVPs: true,
      detectDietaryPatterns: true,
      suggestSeating: false // That's a different feature
    }
  },
  
  "vendors": {
    panelId: "vendor_directory",
    viewConfig: {
      mode: "grid",
      groupBy: "category",
      showContractStatus: true,
      showPaymentStatus: true
    },
    aiEnhancements: {
      highlightPendingContracts: true,
      flagUpcomingPayments: true,
      trackCommunicationStatus: true
    }
  },
  
  "files": {
    panelId: "document_repository",
    viewConfig: {
      mode: "grid",
      groupBy: "type",
      categories: ["contracts", "inspiration", "receipts", "designs", "other"]
    },
    aiEnhancements: {
      smartCategorization: true,
      ocrEnabled: true,
      findDuplicates: true
    }
  },
  
  "votes": {
    panelId: "poll_manager",
    viewConfig: {
      mode: "list",
      showActive: true,
      showClosed: true,
      sorting: "deadline_asc"
    },
    aiEnhancements: {
      highlightTies: true,
      trackParticipation: true,
      showTrendAnalysis: true
    }
  },
  
  "calendar": {
    panelId: "event_calendar",
    viewConfig: {
      mode: "month",
      eventTypes: ["meetings", "deadlines", "vendor_calls", "milestones"],
      showPersonalCalendar: true
    },
    aiEnhancements: {
      findMutualAvailability: true,
      suggestMeetingTimes: true,
      detectScheduleConflicts: true
    }
  },
  
  "roadmap": {
    panelId: "master_plan",
    viewConfig: {
      mode: "overview",
      sections: ["next_steps", "urgent", "blocked", "upcoming", "completed"]
    },
    aiEnhancements: {
      prioritize: true,
      identifyBottlenecks: true,
      suggestActions: true
    }
  }
};
```

**Smart Fallback with NLU:**
```typescript
// If user types something that's not an exact keyword
// User types: "show spending"

const nlpFallback = await planningAdvisor.interpretNonKeyword({
  userInput: "show spending",
  availableKeywords: Object.keys(MAGIC_KEYWORDS),
  conversationContext: {...}
});

// Result:
{
  bestMatch: {
    keyword: "budget",
    confidence: 0.88,
    reasoning: "'spending' is most related to budget/expenses",
    
    suggestion: {
      text: "Did you mean to view the budget dashboard?",
      actions: [
        { label: "Yes, show budget", action: "trigger_keyword:budget" },
        { label: "No, I meant something else", action: "continue_typing" }
      ]
    }
  },
  
  alternativeInterpretations: [
    {
      interpretation: "User wants to see expense list",
      action: "show_expense_list",
      confidence: 0.72
    },
    {
      interpretation: "User wants to add an expense",
      action: "open_expense_entry",
      confidence: 0.45
    }
  ]
}
```

**Keyword Autocomplete UI:**
```typescript
// As user types, show autocomplete dropdown
const autocompleteUI = {
  trigger: "user_typing",
  input: "ta",
  
  dropdownContent: {
    sections: [
      {
        title: "Magic Keywords",
        items: [
          {
            text: "tasks",
            description: "View all tasks",
            icon: "checklist",
            badge: "18 pending",
            action: "trigger_magic_keyword"
          },
          {
            text: "task",
            description: "Create a new task",
            icon: "plus",
            action: "start_task_creation"
          }
        ]
      },
      {
        title: "Recent Mentions",
        items: [
          {
            text: "Table decorations",
            description: "From 2 days ago",
            icon: "message",
            action: "jump_to_message"
          }
        ]
      }
    ]
  },
  
  selectionBehavior: {
    enter: "confirm_selection",
    tab: "confirm_selection",
    escape: "dismiss_dropdown",
    arrowKeys: "navigate_items"
  }
};
```

---

### Feature 8: Integrated Calendar & Reminders

**AI Implementation Strategy**

**Natural Language Event Creation:**
```typescript
// User: "Schedule venue tour next Saturday at 2pm"
const eventDetection = await planningAdvisor.parseCalendarRequest({
  userInput: "Schedule venue tour next Saturday at 2pm",
  currentDate: "2025-10-30",
  eventContext: {...}
});

// Result:
{
  intent: "create_calendar_event",
  confidence: 0.94,
  
  extractedEvent: {
    type: "venue_meeting",
    title: "Venue Tour",
    specificVenue: null, // Not specified, needs disambiguation
    
    datetime: {
      date: "2025-11-02", // Next Saturday
      time: "14:00",
      timezone: "America/New_York",
      confidence: 0.96
    },
    
    duration: {
      estimated: 60, // minutes
      reasoning: "Venue tours typically last 1 hour"
    },
    
    participants: {
      required: ["coordinator"], // User who created event
      suggested: ["co_coordinator"], // Should both coordinators attend?
      optional: []
    },
    
    location: {
      type: "external",
      address: null, // Venue address TBD
      needsDisambiguation: true,
      options: [
        { venue: "Brooklyn Loft", address: "123 Main St, Brooklyn" },
        { venue: "Rooftop Garden", address: "456 Park Ave, Manhattan" }
      ]
    },
    
    relatedTask: {
      taskId: "t1",
      taskName: "Book venue",
      shouldUpdateTask: true,
      updateType: "add_event_to_task"
    }
  },
  
  disambiguationNeeded: true,
  
  clarificationQuestion: {
    text: "Which venue would you like to tour?",
    type: "multiple_choice",
    options: [
      { label: "Brooklyn Loft", value: "v1" },
      { label: "Rooftop Garden", value: "v2" },
      { label: "Both (schedule 2 tours)", value: "both" },
      { label: "Other venue", value: "custom" }
    ]
  }
}
```

**Availability Detection:**
```typescript
// User: "When can the bridal party meet?"
const availabilityRequest = await planningAdvisor.findMutualAvailability({
  participants: ["Alice", "Bob", "Carol", "Dave", "Eve"],
  timeframe: "next_2_weeks",
  meetingDuration: 60,
  preferences: {
    excludeWeekdayMornings: true,
    preferWeekends: true,
    excludeAfter: "21:00"
  }
});

// Result:
{
  analysisMethod: "calendar_api_sync",
  
  optimalSlots: [
    {
      datetime: "2025-11-02T14:00:00",
      duration: 90, // minutes
      allAvailable: true,
      participantCount: 5,
      confidence: 0.95,
      reasoning: "Saturday afternoon, all participants free",
      location: "suggested:video_call"
    },
    {
      datetime: "2025-11-06T19:00:00",
      duration: 90,
      allAvailable: true,
      participantCount: 5,
      confidence: 0.88,
      reasoning: "Wednesday evening, all free but less ideal than weekend",
      location: "suggested:video_call"
    }
  ],
  
  partialAvailabilitySlots: [
    {
      datetime: "2025-11-03T10:00:00",
      availableCount: 4,
      unavailable: ["Dave"],
      reasoning: "Sunday morning, Dave has conflict"
    }
  ],
  
  noAvailability: [
    {
      date: "2025-11-01",
      reason: "Friday evening - 3 participants busy"
    }
  ],
  
  aiRecommendation: {
    slot: "2025-11-02T14:00:00",
    reasoning: "Saturday Nov 2 at 2pm works for everyone and is traditionally good for group meetings",
    alternativeIfDeclined: "2025-11-06T19:00:00"
  },
  
  proposalMessage: {
    text: "I found Saturday, November 2 at 2pm works for everyone in the bridal party. " +
          "Should I send calendar invites?",
    actions: [
      { label: "Yes, Send Invites", action: "create_and_send" },
      { label: "Show Other Times", action: "view_alternatives" },
      { label: "Manually Enter Time", action: "custom_time" }
    ]
  }
}
```

**Automatic Reminder System:**
```typescript
// AI generates intelligent reminder schedule
interface ReminderOrchestration {
  event: CalendarEvent;
  taskDependencies: Task[];
  userPreferences: ReminderPreferences;
}

const reminders = await planningAdvisor.generateReminderSchedule({
  event: {
    id: "cal123",
    type: "vendor_meeting",
    title: "DJ Consultation Call",
    datetime: "2025-11-15T15:00:00",
    participants: ["Alice", "Bob"],
    relatedTask: "t15:Book DJ"
  },
  taskDependencies: [],
  userPreferences: {
    leadTimes: { week: true, day: true, hour: true },
    methods: ["in_app", "email", "push"]
  }
});

// Result:
{
  reminders: [
    {
      id: "rem1",
      type: "advance_notice",
      triggerTime: "2025-11-08T15:00:00", // 1 week before
      message: "Reminder: DJ consultation call with Groove Masters is next week",
      actions: [
        { label: "View Details", action: "open_event" },
        { label: "Reschedule", action: "reschedule_event" },
        { label: "Prepare Questions", action: "open_vendor_questions" }
      ],
      priority: "medium"
    },
    {
      id: "rem2",
      type: "day_before",
      triggerTime: "2025-11-14T15:00:00", // 1 day before
      message: "Tomorrow at 3pm: DJ consultation call. Confirm you're ready?",
      actions: [
        { label: "I'm Ready", action: "dismiss" },
        { label: "View Prep Checklist", action: "show_prep_items" },
        { label: "Need to Reschedule", action: "reschedule_event" }
      ],
      priority: "high",
      aiChecklist: [
        "Review DJ's portfolio and package options",
        "Prepare must-have songs list",
        "Have budget range ready to discuss",
        "List any special requests (lighting, MC duties, etc.)"
      ]
    },
    {
      id: "rem3",
      type: "imminent",
      triggerTime: "2025-11-15T14:00:00", // 1 hour before
      message: "DJ consultation call starts in 1 hour",
      actions: [
        { label: "Join Call", action: "open_video_link", display: "primary" },
        { label: "View Notes", action: "open_meeting_notes" }
      ],
      priority: "urgent",
      includeCallLink: true
    }
  ],
  
  taskBasedReminders: [
    {
      id: "rem_task1",
      type: "dependency_alert",
      relatedTask: "t15",
      triggerTime: "2025-11-20T09:00:00", // 5 days after call
      condition: "if_task_not_completed",
      message: "It's been 5 days since your DJ call. Ready to make a decision?",
      reasoning: "Booking decisions typically take 3-7 days after consultations",
      priority: "medium"
    }
  ],
  
  criticalPathAlert: {
    enabled: true,
    condition: "task_becomes_overdue",
    message: "Warning: 'Book DJ' is now on the critical path. " +
             "Delays could affect event timeline.",
    escalation: "notify_all_coordinators"
  }
}
```

**"Running Behind" Detection:**
```typescript
// AI monitors critical path and alerts proactively
const criticalPathMonitor = await dependencyAnalyzer.assessTimeline({
  allTasks: [...],
  eventDate: "2026-06-15",
  currentDate: "2025-10-30"
});

// Result:
{
  timelineStatus: "at_risk",
  
  criticalPath: [
    { taskId: "t1", name: "Book venue", status: "completed", daysAgo: 15 },
    { taskId: "t12", name: "Finalize guest list", status: "in_progress", dueIn: 45 },
    { taskId: "t15", name: "Book caterer", status: "not_started", dueIn: 30 },
    { taskId: "t42", name: "Send invitations", status: "not_started", dueIn: 180 }
  ],
  
  riskyTasks: [
    {
      taskId: "t15",
      taskName: "Book caterer",
      risk: "behind_schedule",
      severity: "high",
      
      details: {
        idealStartDate: "2025-10-01",
        actualStartDate: null,
        daysDelayed: 29,
        
        impact: [
          "If delayed 2 more weeks, catering options will be limited",
          "Prices may increase for last-minute bookings",
          "Menu tasting schedule will be compressed"
        ]
      },
      
      aiRecommendation: {
        action: "urgent_start",
        message: "I recommend starting the catering search this week. " +
                 "You're already 4 weeks behind the typical timeline.",
        suggestedSteps: [
          "Review 3-5 caterer suggestions I've compiled",
          "Schedule tastings for next 2 weeks",
          "Make decision by November 30"
        ]
      },
      
      alert: {
        type: "running_behind_critical",
        notify: ["coordinators"],
        frequency: "daily_until_resolved",
        escalate: true
      }
    }
  ],
  
  overallProjection: {
    onTimeCompletion: "unlikely (62% confidence)",
    projectedDelay: "2-3 weeks",
    
    mitigationStrategies: [
      {
        strategy: "Parallelize non-dependent tasks",
        tasks: ["t23:Order invitations", "t27:Book photographer"],
        potentialTimeSaved: "1 week"
      },
      {
        strategy: "Reduce scope on non-critical items",
        tasks: ["t38:Create custom signage"],
        potentialTimeSaved: "Few days, but minimal impact"
      }
    ]
  }
}
```

---

### Feature 9: Master Plan View

**AI Implementation Strategy**

**Comprehensive Data Aggregation:**
```typescript
// AI assembles complete event overview
const masterPlanData = await planningAdvisor.generateMasterPlan({
  eventId: "evt123",
  includeAll: true
});

// Result:
{
  eventOverview: {
    name: "Alice & Bob's Wedding",
    type: "wedding",
    date: "2026-06-15",
    daysUntil: 228,
    location: "Brooklyn Loft, Brooklyn, NY",
    attendees: 150
  },
  
  // SECTION 1: All Users
  participants: {
    total: 12,
    
    byRole: {
      coordinators: [
        {
          id: "alice",
          name: "Alice Smith",
          role: "Coordinator",
          joinedDate: "2025-08-01",
          activeTasks: 8,
          completedTasks: 5,
          contributionAmount: 24200,
          lastActive: "2 hours ago",
          activityLevel: "high"
        },
        {
          id: "bob",
          name: "Bob Johnson",
          role: "Coordinator",
          joinedDate: "2025-08-01",
          activeTasks: 3,
          completedTasks: 7,
          contributionAmount: 14550,
          lastActive: "1 day ago",
          activityLevel: "medium"
        }
      ],
      
      collaborators: [
        {
          id: "carol",
          name: "Carol White",
          role: "Collaborator",
          specialty: "Design & Decor",
          activeTasks: 5,
          completedTasks: 2,
          lastActive: "3 hours ago",
          activityLevel: "high"
        },
        // ... more collaborators
      ],
      
      guests: [
        {
          id: "dave",
          name: "Dave Brown",
          role: "Guest",
          rsvpStatus: "yes",
          mealPreference: "chicken",
          plusOne: true
        },
        // ... more guests
      ],
      
      vendors: [
        {
          id: "v123",
          name: "Groove Masters DJ",
          type: "entertainment",
          status: "contracted",
          contractSigned: "2025-11-10",
          nextPayment: { amount: 600, due: "2026-05-15" }
        },
        // ... more vendors
      ]
    },
    
    taskDistribution: {
      mostAssigned: { name: "Alice", count: 8 },
      leastAssigned: { name: "Bob", count: 3 },
      unassigned: 12,
      
      aiRecommendation: "Consider redistributing some of Alice's tasks to balance workload"
    },
    
    communicationActivity: {
      totalMessages: 847,
      last24Hours: 23,
      mostActive: ["Alice", "Carol"],
      leastActive: ["Bob"],
      
      aiInsight: "Bob has been less active lately. May want to check in."
    }
  },
  
  // SECTION 2: Tasks Overview
  tasks: {
    total: 48,
    completed: 18,
    inProgress: 12,
    notStarted: 15,
    blocked: 3,
    
    byPhase: {
      planning: {
        total: 28,
        completed: 15,
        percentage: 54
      },
      execution: {
        total: 15,
        completed: 3,
        percentage: 20
      },
      postEvent: {
        total: 5,
        completed: 0,
        percentage: 0
      }
    },
    
    byCategory: {
      venue: { total: 4, completed: 3, budget: 12000, spent: 5000 },
      catering: { total: 6, completed: 1, budget: 9000, spent: 0 },
      photography: { total: 3, completed: 0, budget: 4000, spent: 0 },
      // ... more categories
    },
    
    criticalPath: [
      { taskId: "t12", name: "Finalize guest list", dueIn: 45, status: "in_progress" },
      { taskId: "t15", name: "Book caterer", dueIn: 30, status: "not_started", flagged: true },
      { taskId: "t42", name: "Send invitations", dueIn: 180, status: "not_started" }
    ],
    
    dependencies: {
      total: 23,
      met: 18,
      unmet: 5,
      
      blockedTasks: [
        {
          taskId: "t42",
          taskName: "Send invitations",
          blockedBy: ["t12:Finalize guest list", "t38:Order invitations"],
          canStartAfter: "2025-12-15"
        }
      ]
    },
    
    aiAnalysis: {
      healthScore: 72, // out of 100
      status: "caution",
      issues: [
        "3 tasks are overdue",
        "2 critical tasks haven't been started",
        "Catering decision is becoming urgent"
      ],
      strengths: [
        "Venue and photography are ahead of schedule",
        "Budget management is excellent",
        "Strong team communication"
      ]
    }
  },
  
  // SECTION 3: Expenses Dashboard
  expenses: {
    budget: {
      total: 40000,
      allocated: 40000,
      spent: 12500,
      committed: 8200, // Contracted but not yet paid
      remaining: 19300,
      percentSpent: 31.25
    },
    
    byCategory: [
      {
        category: "venue",
        allocated: 12000,
        spent: 5000,
        committed: 7000,
        status: "on_budget",
        variance: 0,
        percentOfTotal: 30
      },
      {
        category: "catering",
        allocated: 9000,
        spent: 0,
        committed: 0,
        status: "not_started",
        forecast: 10500,
        variance: 1500,
        warning: "May exceed budget based on current quotes"
      },
      // ... more categories
    ],
    
    payments: {
      paid: 12500,
      pending: 8200,
      upcoming: [
        { vendor: "Brooklyn Loft", amount: 7000, due: "2026-05-15" },
        { vendor: "Groove Masters DJ", amount: 600, due: "2026-05-15" }
      ]
    },
    
    splits: {
      alice: { paid: 24200, owed: 0, balance: "paid_in_full" },
      bob: { paid: 14550, owed: 0, balance: "paid_in_full" },
      
      note: "All expenses have been split and settled between coordinators"
    },
    
    forecast: {
      projectedTotal: 38750,
      varianceFromBudget: -1250,
      confidence: 0.72,
      aiPrediction: "Likely to come in $1,000-1,500 under budget",
      
      potentialOverages: [
        {
          category: "catering",
          risk: "+$1,500",
          reason: "Guest count may increase"
        }
      ]
    }
  },
  
  // SECTION 4: Main Event Plan
  timeline: {
    phase: "planning",
    daysUntilEvent: 228,
    
    milestones: [
      {
        name: "Venue Booked",
        targetDate: "2025-11-01",
        actualDate: "2025-10-25",
        status: "completed_early",
        daysEarlyLate: -7
      },
      {
        name: "Save-the-Dates Sent",
        targetDate: "2026-01-15",
        actualDate: null,
        status: "upcoming",
        daysUntil: 77
      },
      {
        name: "All Vendors Finalized",
        targetDate: "2026-02-01",
        actualDate: null,
        status: "at_risk",
        daysUntil: 94,
        reason: "Catering and flowers not yet booked"
      },
      // ... more milestones
    ],
    
    phaseProgress: {
      planning: {
        start: "2025-08-01",
        end: "2026-03-01",
        progress: 54,
        status: "on_track"
      },
      execution: {
        start: "2026-03-01",
        end: "2026-06-15",
        progress: 0,
        status: "not_started"
      },
      postEvent: {
        start: "2026-06-16",
        end: "2026-07-15",
        progress: 0,
        status: "not_started"
      }
    },
    
    riskIndicators: [
      {
        type: "task_delay",
        severity: "high",
        issue: "Catering not booked (4 weeks behind schedule)",
        impact: "Could limit menu options and increase costs"
      },
      {
        type: "budget_warning",
        severity: "medium",
        issue: "Catering quotes coming in higher than allocated",
        impact: "May need to adjust budget or reduce guest count"
      }
    ]
  },
  
  // SECTION 5: AI-Powered Roadmap
  aiRoadmap: {
    nextSteps: [
      {
        priority: 1,
        task: "Finalize catering vendor",
        reason: "Critical task, already behind schedule",
        dueBy: "2025-11-15",
        steps: [
          "Review quotes from 3 caterers",
          "Schedule tastings this week",
          "Make decision and book by Nov 15"
        ],
        assignedTo: "Alice"
      },
      {
        priority: 2,
        task: "Complete guest list",
        reason: "Blocks invitation ordering and catering count",
        dueBy: "2025-12-01",
        steps: [
          "Finalize family lists with both sides",
          "Add plus-ones",
          "Confirm final count with venue capacity"
        ],
        assignedTo: "Alice and Bob"
      },
      {
        priority: 3,
        task: "Book photographer",
        reason: "Good photographers fill up early",
        dueBy: "2025-11-30",
        steps: [
          "Review portfolio samples",
          "Schedule consultation calls",
          "Compare packages and pricing",
          "Book by end of November"
        ],
        assignedTo: "Carol"
      }
    ],
    
    urgent: [
      {
        taskId: "t23",
        taskName: "Order invitations",
        reason: "Overdue by 5 days",
        originalDue: "2025-10-25",
        impact: "May delay save-the-date mailing",
        action: "Complete this week"
      },
      {
        taskId: "t27",
        taskName: "Finalize ceremony music",
        reason: "Musician requires 6-month notice",
        daysLeft: 12,
        impact: "Musicians may be unavailable if delayed",
        action: "Make decision by Nov 10"
      }
    ],
    
    blocked: [
      {
        taskId: "t42",
        taskName: "Send invitations",
        blockedBy: [
          { taskId: "t12", taskName: "Finalize guest list", eta: "2025-12-01" },
          { taskId: "t38", taskName: "Order invitations", eta: "2025-11-10" }
        ],
        canStartAfter: "2025-12-01",
        aiNote: "Guest list is the critical blocker here"
      }
    ],
    
    upcoming: [
      {
        taskName: "Book florist",
        dueIn: 45,
        category: "flowers",
        aiSuggestion: "Start researching florists. Good ones book 3-4 months out."
      },
      {
        taskName: "Order wedding cake",
        dueIn: 60,
        category: "catering",
        aiSuggestion: "Wait until caterer is booked, then coordinate dessert options."
      }
    ],
    
    completed: [
      {
        taskId: "t1",
        taskName: "Book venue",
        completedDate: "2025-10-25",
        category: "venue",
        celebrationNote: "🎉 Venue secured! Brooklyn Loft looks amazing."
      },
      {
        taskId: "t8",
        taskName: "Engagement party",
        completedDate: "2025-09-15",
        category: "events"
      },
      // ... more completed tasks (show last 5)
    ]
  },
  
  // AI Summary
  executiveSummary: {
    tldr: "Event planning is 54% complete with 228 days to go. " +
          "You're slightly behind on catering decisions but ahead on venue. " +
          "Budget is healthy with $19,300 remaining.",
    
    status: "mostly_on_track",
    confidence: 0.78,
    
    priorities: [
      "Book caterer this month (urgent)",
      "Finalize guest list by December 1",
      "Book photographer by November 30"
    ],
    
    risks: [
      "Catering delay could cascade to invitations and final headcount",
      "Budget may tighten if guest count increases"
    ],
    
    strengths: [
      "Venue booked early (7 days ahead of schedule)",
      "Strong budget management",
      "Active team collaboration"
    ]
  }
}
```

**Non-Blocking Access Pattern:**
```typescript
// Master Plan is never required, only helpful
interface MasterPlanAccessPattern {
  triggers: string[];
  neverBlockWorkflow: boolean;
  proactiveDisplay: boolean;
}

const accessPattern = {
  triggers: [
    "user_types_roadmap_keyword",
    "user_asks_whats_next",
    "user_seems_lost", // AI detects confusion
    "major_milestone_reached",
    "weekly_summary_prompt"
  ],
  
  neverBlockWorkflow: true, // Never mandatory
  proactiveDisplay: false, // Don't force it on users
  
  aiProactiveTriggers: {
    seemsLost: {
      detection: [
        "User asks vague questions 3+ times",
        "User hasn't interacted with tasks in 5+ days",
        "Multiple overdue tasks and no activity"
      ],
      
      response: {
        message: "You seem like you might need a bird's-eye view. " +
                 "Would you like to see the Master Plan to get oriented?",
        tone: "helpful_not_pushy",
        actions: [
          { label: "Yes, Show Master Plan", action: "open_master_plan" },
          { label: "No Thanks", action: "dismiss" }
        ]
      }
    },
    
    majorMilestone: {
      detection: "Task or phase completion reaches 25%, 50%, 75%, 100%",
      
      response: {
        message: "🎉 You've hit 50% task completion! Check out your progress in the Master Plan.",
        tone: "celebratory",
        auto: false, // Don't auto-open, just suggest
        actions: [
          { label: "View Master Plan", action: "open_master_plan" },
          { label: "Later", action: "dismiss" }
        ]
      }
    }
  }
};
```

---

## Cross-Feature AI Patterns

### Pattern 1: Context Propagation

**How context flows between features:**

```typescript
// Example: Task Creation → Vendor Suggestions → Sub-Group Chat
const contextFlow = {
  step1: {
    feature: "Smart Task Creation",
    userAction: "Mentions booking photographer",
    agentUsed: "Task Enricher",
    contextGenerated: {
      taskId: "t3",
      category: "photography",
      estimatedCost: { min: 2500, max: 4500 },
      vendorSuggestions: [...]
    }
  },
  
  step2: {
    feature: "Vendor Suggestions",
    trigger: "Task created with vendor needs",
    agentUsed: "Task Enricher (same agent, extended call)",
    contextInherited: { taskId: "t3", category: "photography" },
    contextAdded: {
      vendorDetails: [...],
      questionsToAsk: [...],
      contractChecklist: [...]
    }
  },
  
  step3: {
    feature: "Sub-Group Chats",
    userAction: "User clicks 'Contact Vendor'",
    contextInherited: {
      taskId: "t3",
      vendorId: "v123",
      vendorName: "Sarah Chen Photography",
      preparedQuestions: [...]
    },
    aiAssist: {
      agent: "Planning Advisor",
      action: "Pre-populate first message with relevant questions",
      contextUsed: "Task details + vendor info + generated questions"
    }
  }
};
```

### Pattern 2: Multi-Agent Collaboration

**How agents work together on complex requests:**

```typescript
// User asks: "What should I prioritize this week?"
const agentCollaboration = {
  orchestrator: {
    requestAnalysis: {
      complexity: "high",
      requiresMultipleAgents: true,
      estimatedAgents: 3
    },
    
    agentSequence: [
      {
        agent: "Dependency Analyzer",
        purpose: "Identify critical path tasks",
        contextNeeded: "all_tasks",
        expectedOutput: "prioritized_task_list"
      },
      {
        agent: "Budget Analyst",
        purpose: "Flag any budget-related urgencies",
        contextNeeded: "expenses_and_budget",
        expectedOutput: "financial_priorities"
      },
      {
        agent: "Planning Advisor",
        purpose: "Synthesize and provide actionable recommendations",
        contextNeeded: "all_previous_outputs + event_context",
        expectedOutput: "comprehensive_priority_list"
      }
    ]
  },
  
  execution: {
    // Agent 1: Dependency Analyzer
    dependencyAnalysis: {
      criticalTasks: [
        { taskId: "t15", urgency: "high", reason: "blocks catering decisions" },
        { taskId: "t23", urgency: "high", reason: "already overdue" }
      ],
      timelineSensitive: [
        { taskId: "t27", daysLeft: 12, reason: "vendor requires advance notice" }
      ]
    },
    
    // Agent 2: Budget Analyst
    budgetAnalysis: {
      urgentPayments: [
        { vendor: "Venue", amount: 7000, due: "2026-05-15", daysUntil: 197 }
      ],
      budgetDecisions: [
        { category: "catering", status: "needs_decision", impact: "high" }
      ]
    },
    
    // Agent 3: Planning Advisor (synthesizes)
    synthesis: {
      topPriorities: [
        {
          rank: 1,
          action: "Finalize caterer",
          reasoning: "Critical task, behind schedule, blocks other decisions",
          urgency: "this_week",
          impact: "high",
          
          sources: [
            "Dependency Analyzer: blocks invitation count",
            "Budget Analyst: decision needed for budget allocation"
          ]
        },
        {
          rank: 2,
          action: "Complete overdue invitation task",
          reasoning: "Already 5 days overdue, affects timeline",
          urgency: "immediately",
          impact: "medium",
          
          sources: [
            "Dependency Analyzer: identified as overdue",
            "Timeline: affects save-the-date mailing"
          ]
        },
        {
          rank: 3,
          action: "Book ceremony musician",
          reasoning: "Window closing (12 days left for 6-month notice)",
          urgency: "this_week",
          impact: "medium",
          
          sources: [
            "Dependency Analyzer: time-sensitive",
            "Vendor requirements: 6-month advance notice"
          ]
        }
      ],
      
      weeklyFocus: "This week, focus on: 1) Caterer decision, " +
                    "2) Invitation task, 3) Musician booking. " +
                    "These will unblock significant downstream work.",
      
      aiConfidence: 0.87
    }
  }
};
```

### Pattern 3: Learning Loops

**How system improves from outcomes:**

```typescript
// Continuous learning across features
const learningSystem = {
  // Example 1: Cost Estimation Improvement
  costLearning: {
    prediction: {
      agent: "Task Enricher",
      task: "Book DJ",
      eventType: "wedding",
      guests: 150,
      estimatedCost: { min: 900, max: 1400 }
    },
    
    actualOutcome: {
      expense: {
        amount: 1250,
        vendor: "Groove Masters DJ",
        date: "2025-11-10"
      },
      variance: {
        absolute: -150, // $150 less than median of range
        percentage: -12
      }
    },
    
    learning: {
      action: "update_cost_model",
      dataPoint: {
        eventType: "wedding",
        taskCategory: "entertainment:DJ",
        attendeeRange: "150-200",
        actualCost: 1250,
        estimatedRange: { min: 900, max: 1400 }
      },
      
      modelAdjustment: {
        newEstimate: { min: 950, max: 1350 },
        confidence: "improved (+5%)",
        reason: "Incorporating actual costs narrows range"
      }
    }
  },
  
  // Example 2: Timeline Prediction Improvement
  timelineLearning: {
    prediction: {
      agent: "Dependency Analyzer",
      task: "Book photographer",
      suggestedDeadline: "6 months before event",
      reasoning: "Industry standard for wedding photographers"
    },
    
    actualOutcome: {
      taskCompleted: "2025-11-25",
      actualLeadTime: "6.5 months before event",
      
      userFeedback: {
        implicit: "User booked slightly later than suggested but still successful",
        explicit: null
      }
    },
    
    learning: {
      action: "validate_timeline_recommendation",
      result: "recommendation_was_accurate",
      
      note: "6-month lead time is still appropriate for photographers. " +
            "No model adjustment needed."
    }
  },
  
  // Example 3: Vendor Suggestion Relevance
  vendorSuggestionLearning: {
    prediction: {
      agent: "Task Enricher",
      suggestedVendors: [
        { id: "v123", name: "Sarah Chen Photography", ranking: 1 },
        { id: "v124", name: "Moments by Mike", ranking: 2 },
        { id: "v125", name: "Lens & Love", ranking: 3 }
      ],
      rankingFactors: [
        "price range match",
        "style compatibility",
        "availability",
        "ratings"
      ]
    },
    
    actualOutcome: {
      userSelection: { id: "v125", name: "Lens & Love", ranking: 3 },
      
      userBehavior: {
        viewedProfile: ["v123", "v124", "v125"],
        sentInquiry: ["v123", "v125"],
        scheduledCall: ["v125"],
        booked: "v125"
      }
    },
    
    learning: {
      action: "analyze_selection_factors",
      
      discoveredFactors: [
        "User prioritized portfolio style over price",
        "User valued vendor responsiveness (Lens & Love replied within 2 hours)",
        "Top-ranked vendor (Sarah Chen) was not as responsive"
      ],
      
      modelAdjustment: {
        newRankingWeights: {
          priceRange: 0.2, // decreased
          style: 0.35, // increased
          ratings: 0.25,
          responseTime: 0.2 // new factor added
        },
        
        note: "For this user (and potentially similar users), style fit and " +
              "vendor responsiveness are more important than price."
      }
    }
  }
};
```

---

## Agent Collaboration Workflows

### Workflow 1: Natural Language Event Building

**From initial description to complete event structure:**

```typescript
// User: "Planning my wedding for 150 guests, June 2026, budget $40,000"

const eventBuildingWorkflow = {
  phase1_initialScaffolding: {
    agent: "Planning Advisor",
    contextLevel: "minimal", // Just the user's description
    temperature: 0.6,
    
    input: {
      userDescription: "Planning my wedding for 150 guests, June 2026, budget $40,000",
      userLocation: "Brooklyn, NY" // From user profile
    },
    
    task: "Create initial event structure",
    
    output: {
      eventData: {
        type: "wedding",
        date: "2026-06-15", // Mid-June
        location: "Brooklyn, NY",
        attendees: 150,
        budget: 40000
      },
      
      taskCategories: [
        { category: "venue", priority: 1 },
        { category: "catering", priority: 2 },
        { category: "photography", priority: 3 },
        { category: "music", priority: 4 },
        { category: "flowers", priority: 5 },
        { category: "attire", priority: 6 },
        { category: "stationery", priority: 7 },
        { category: "transportation", priority: 8 },
        { category: "accommodations", priority: 9 }
      ],
      
      budgetAllocation: {
        venue: 12000,
        catering: 9000,
        photography: 4000,
        music: 2000,
        flowers: 3000,
        attire: 4000,
        stationery: 1500,
        transportation: 1500,
        accommodations: 0, // Local wedding
        contingency: 3000
      },
      
      collaboratorRoles: [
        { role: "coordinator", suggestedCount: 2 },
        { role: "collaborator", suggestedCount: "3-5" }
      ]
    }
  },
  
  phase2_taskGeneration: {
    agent: "Task Enricher",
    contextLevel: "standard",
    
    task: "Generate complete task list for wedding",
    
    output: {
      tasks: [
        // Venue tasks
        {
          id: "t1",
          name: "Research and book venue",
          category: "venue",
          priority: "high",
          suggestedDeadline: "2025-12-15", // 6 months before
          dependencies: [],
          estimatedCost: { min: 10000, max: 14000 },
          nextSteps: [
            "Create venue wishlist (capacity, style, amenities)",
            "Research 5-10 venues in Brooklyn",
            "Schedule tours",
            "Compare pricing and availability",
            "Book venue and pay deposit"
          ]
        },
        // ... 47 more tasks across all categories
      ],
      
      timeline: {
        phase1: {
          name: "Foundation (Now - 6 months before)",
          duration: "8 months",
          keyTasks: ["venue", "date_confirmation", "save_the_dates", "major_vendors"]
        },
        phase2: {
          name: "Details (6-3 months before)",
          duration: "3 months",
          keyTasks: ["invitations", "attire", "decor", "final_vendor_confirmations"]
        },
        phase3: {
          name: "Finalization (3-1 months before)",
          duration: "2 months",
          keyTasks: ["rsvps", "seating_chart", "timeline", "final_payments"]
        },
        phase4: {
          name: "Final Countdown (Last month)",
          duration: "1 month",
          keyTasks: ["final_walkthrough", "rehearsal", "day_of_coordination"]
        }
      }
    }
  },
  
  phase3_vendorPrePopulation: {
    agent: "Task Enricher",
    contextLevel: "rich",
    
    task: "Add vendor suggestions to relevant tasks",
    
    output: {
      enrichedTasks: [
        {
          taskId: "t1",
          taskName: "Research and book venue",
          vendorSuggestions: [
            {
              name: "Brooklyn Loft",
              type: "venue",
              priceRange: "$8,000-12,000",
              rating: 4.7,
              availability: "likely_available"
            },
            // ... 4 more venue suggestions
          ]
        },
        {
          taskId: "t5",
          taskName: "Book photographer",
          vendorSuggestions: [
            {
              name: "Sarah Chen Photography",
              type: "photographer",
              priceRange: "$2,500-4,500",
              rating: 4.8,
              specialty: "wedding"
            },
            // ... 4 more photographer suggestions
          ]
        }
        // ... vendor suggestions for all relevant tasks
      ]
    }
  },
  
  phase4_iterativeRefinement: {
    // User: "Actually, it's a destination wedding in Italy"
    
    agent: "Planning Advisor",
    contextLevel: "comprehensive",
    
    task: "Adjust event structure for destination wedding",
    
    adjustments: {
      // Update event data
      eventData: {
        type: "destination_wedding",
        location: "Tuscany, Italy",
        isDestination: true
      },
      
      // Add new tasks
      newTasks: [
        {
          id: "t49",
          name: "Research Italy wedding requirements",
          category: "legal",
          priority: "urgent"
        },
        {
          id: "t50",
          name: "Book accommodations for guests",
          category: "accommodations",
          priority: "high"
        },
        {
          id: "t51",
          name: "Arrange group travel",
          category: "transportation",
          priority: "high"
        },
        {
          id: "t52",
          name: "Plan welcome dinner",
          category: "events",
          priority: "medium"
        },
        {
          id: "t53",
          name: "Create Italy travel guide for guests",
          category: "communication",
          priority: "medium"
        }
      ],
      
      // Update budget
      budgetAdjustments: {
        accommodations: 8000, // New category
        transportation: 5000, // Increased
        total: 53000, // Increased from 40k
        
        note: "Destination weddings typically cost 25-50% more. " +
              "New budget accounts for travel, accommodations, and extended event."
      },
      
      // Update timeline
      timelineAdjustments: {
        planningHorizon: "12-18 months", // Longer than domestic
        keyDeadlines: {
          venue: "12 months before",
          travelInfo: "10 months before",
          accommodations: "8 months before"
        }
      },
      
      // Update vendor suggestions
      vendorAdjustments: {
        replaceCriteria: {
          location: "Tuscany, Italy",
          languagePreference: "English-speaking or bilingual",
          experienceWith: "international couples"
        },
        
        newVendorSuggestions: [
          {
            category: "venue",
            vendors: ["Villa Castello", "Borgo Santo Pietro", "Tenuta di Artimino"]
          },
          {
            category: "wedding_planner",
            vendors: ["Tuscan Dreams", "Italy Weddings", "La Dolce Vita Events"],
            note: "Destination weddings benefit greatly from local wedding planner"
          }
        ]
      }
    }
  }
};
```

### Workflow 2: Complex Decision-Making

**Multi-agent collaboration for group decisions:**

```typescript
// User creates poll: "Should we do buffet or plated dinner?"

const decisionMakingWorkflow = {
  phase1_pollCreation: {
    agent: "Planning Advisor",
    task: "Enrich poll with context and implications",
    
    input: {
      rawQuestion: "Should we do buffet or plated dinner?",
      eventContext: {
        type: "wedding",
        guests: 150,
        budget: { catering: { allocated: 9000 } },
        venue: "Brooklyn Loft"
      }
    },
    
    output: {
      enrichedPoll: {
        question: "Dinner Service Style",
        options: [
          {
            option: "Buffet",
            pros: [...],
            cons: [...],
            typicalCost: "$65-85/person",
            totalEstimate: "$9,750-12,750"
          },
          {
            option: "Plated",
            pros: [...],
            cons: [...],
            typicalCost: "$75-95/person",
            totalEstimate: "$11,250-14,250"
          }
        ],
        aiRecommendation: {
          suggestion: "hybrid",
          reasoning: "..."
        }
      }
    }
  },
  
  phase2_votingPeriod: {
    // Real-time vote tracking and analysis
    agent: "Planning Advisor",
    task: "Monitor voting and provide insights",
    
    realTimeAnalysis: {
      currentResults: { buffet: 5, plated: 3 },
      participation: "67% (8 of 12 voted)",
      trend: "buffet gaining momentum",
      
      insights: [
        "Family members prefer buffet (4 of 5 votes)",
        "Friends are split (1 buffet, 3 plated)",
        "Only 4 people left to vote"
      ],
      
      predictions: {
        likelyWinner: "buffet",
        confidence: 0.72
      }
    }
  },
  
  phase3_resultSynthesis: {
    // After poll closes
    agent: "Planning Advisor",
    contextLevel: "comprehensive",
    task: "Synthesize results and update event plan",
    
    output: {
      decision: "Buffet Style Dinner",
      confidence: "strong (8 to 4)",
      
      // Multi-agent coordination
      cascadingUpdates: {
        // Agent 1: Budget Analyst updates budget
        budgetUpdate: {
          agent: "Budget Analyst",
          action: "update_category_allocation",
          category: "catering",
          newEstimate: { min: 9750, max: 12750 },
          note: "Based on buffet pricing"
        },
        
        // Agent 2: Task Enricher creates follow-up tasks
        taskCreation: {
          agent: "Task Enricher",
          newTasks: [
            {
              name: "Select buffet menu with caterer",
              priority: "high",
              dependsOn: ["t15:Book caterer"]
            },
            {
              name: "Confirm buffet space requirements with venue",
              priority: "medium",
              dependsOn: ["t15:Book caterer"]
            }
          ]
        },
        
        // Agent 3: Dependency Analyzer checks impacts
        dependencyCheck: {
          agent: "Dependency Analyzer",
          affectedTasks: [
            {
              taskId: "t15",
              taskName: "Book caterer",
              update: "Add buffet service to vendor criteria"
            },
            {
              taskId: "t28",
              taskName: "Plan venue layout",
              update: "Need space for buffet stations"
            }
          ]
        },
        
        // Agent 4: Planning Advisor records decision
        decisionRecording: {
          agent: "Planning Advisor",
          record: {
            id: "dec123",
            category: "catering",
            decision: "Buffet service style",
            reasoning: "Group vote: 8 to 4. Family preference was strong factor.",
            implications: [
              "More casual atmosphere",
              "Need multiple buffet stations for 150 guests",
              "Budget: $9,750-12,750 (within allocated $9,000 but may need adjustment)"
            ],
            reversible: true,
            reversalCost: "low (if done before caterer is booked)"
          }
        }
      }
    }
  },
  
  phase4_consequenceTracking: {
    // Monitor decision impact over time
    agent: "Planning Advisor",
    
    tracking: {
      decisionId: "dec123",
      
      subsequentEvents: [
        {
          event: "Caterer booked",
          date: "2025-11-10",
          buffetConfirmed: true,
          actualCost: 11200
        },
        {
          event: "Venue confirms buffet space available",
          date: "2025-11-12",
          spaceAdequate: true
        }
      ],
      
      outcomeValidation: {
        decisionWasCorrect: true,
        noMajorIssues: true,
        budgetWithinEstimate: true,
        
        learning: "Buffet decision was sound. Group voting process worked well."
      }
    }
  }
};
```

---

## Context Assembly Strategies

### Context Level Guidelines

**Minimal Context (< 500 tokens):**
```typescript
// Use for: Quick follow-ups, confirmations, simple queries
const minimalContext = {
  currentMessage: "...",
  lastAIMessage: "...",
  userProfile: { name, role, preferences: {lightweight: true} },
  eventBasics: { type, date, budget: totalOnly }
};

// Example agents using minimal:
// - Promise Manager (expense follow-ups)
// - Quick confirmations
```

**Standard Context (500-1000 tokens):**
```typescript
// Use for: Task creation, expense logging, basic queries
const standardContext = {
  recentMessages: [...last 10...],
  userProfile: { ...full profile... },
  eventData: { type, date, location, attendees, budget },
  relevantTasks: [...filtered by current topic...],
  relevantExpenses: [...filtered by category...]
};

// Example agents using standard:
// - Task Enricher (simple task creation)
// - Promise Manager (expense categorization)
```

**Rich Context (1000-3000 tokens):**
```typescript
// Use for: Complex task enrichment, budget analysis, vendor suggestions
const richContext = {
  conversationHistory: [...last 20 messages...],
  fullEventData: { ...everything about event... },
  allTasks: [...with dependencies...],
  allExpenses: [...with splits...],
  vendorData: [...if relevant...],
  userBehaviorHistory: { ...past preferences and patterns... }
};

// Example agents using rich:
// - Task Enricher (complex enrichment with vendors)
// - Budget Analyst (spending analysis)
// - Dependency Analyzer (critical path)
```

**Comprehensive Context (3000+ tokens):**
```typescript
// Use for: Master Plan generation, event-wide analysis, major decisions
const comprehensiveContext = {
  completeEventState: {
    allMessages: [...],
    allTasks: [...],
    allExpenses: [...],
    allParticipants: [...],
    allVendors: [...],
    allDecisions: [...],
    fullTimeline: {...},
    completeBudgetHistory: {...}
  },
  
  externalData: {
    calendarEvents: [...],
    vendorCommunications: [...],
    documents: [...]
  }
};

// Example agents using comprehensive:
// - Planning Advisor (Master Plan)
// - Natural Language Event Building
// - Major decision synthesis
```

---

## Trigger & Response Flows

### Trigger Categories & Response Patterns

**1. Pattern-Based Triggers (Regex/NLP):**
```typescript
const patternTriggers = {
  expenseMention: {
    patterns: [/\$\d+/, /paid \d+/, /cost \d+/, /spent \d+/],
    confidence_threshold: 0.85,
    
    response_flow: {
      detect: "< 5ms",
      classify_intent: "< 10ms",
      route_to_agent: "Budget Analyst or Promise Manager",
      get_context: "standard",
      call_ai: "500-800ms",
      process_response: "50-100ms",
      update_ui: "streaming"
    }
  },
  
  taskMention: {
    patterns: [/we should|need to|let's|have to/ + /book|order|buy|find/],
    confidence_threshold: 0.80,
    
    response_flow: {
      detect: "< 5ms",
      classify_intent: "< 10ms",
      route_to_agent: "Task Enricher",
      get_context: "rich",
      call_ai: "800-1200ms",
      process_response: "100-200ms",
      update_ui: "streaming + panel expansion"
    }
  }
};
```

**2. Event-Based Triggers:**
```typescript
const eventTriggers = {
  taskCompleted: {
    event: "task.status.updated",
    condition: "newStatus === 'completed'",
    
    response_flow: {
      check_task_type: "immediate",
      if_purchase_task: {
        trigger_agent: "Promise Manager",
        contextLevel: "standard",
        action: "generate_expense_followup",
        delay: "5 seconds", // Give user moment to process
        message_tone: "friendly_inquiry"
      }
    }
  },
  
  milestoneReached: {
    event: "tasks.percentage.changed",
    conditions: [
      "percentage === 25",
      "percentage === 50",
      "percentage === 75",
      "percentage === 100"
    ],
    
    response_flow: {
      trigger_agent: "Planning Advisor",
      contextLevel: "comprehensive",
      action: "generate_milestone_celebration",
      include: {
        summary: true,
        nextPriorities: true,
        offerMasterPlan: true
      }
    }
  }
};
```

**3. Time-Based Triggers:**
```typescript
const timeTriggers = {
  dailyDigest: {
    schedule: "cron:0 9 * * *", // 9am daily
    
    response_flow: {
      check_activity: "past_24_hours",
      if_has_updates: {
        trigger_agent: "Planning Advisor",
        contextLevel: "comprehensive",
        generate_summary: {
          include: [
            "tasks_completed_yesterday",
            "expenses_added",
            "upcoming_deadlines",
            "overdue_items",
            "today_priorities"
          ],
          tone: "motivational"
        }
      }
    }
  },
  
  reminderChecks: {
    schedule: "every_15_minutes",
    
    response_flow: {
      query_calendar_events: "upcoming_in_next_hour",
      query_task_deadlines: "due_today_or_overdue",
      
      if_reminders_needed: {
        send_notifications: {
          method: ["in_app", "push", "email"],
          priority: "by_urgency"
        }
      }
    }
  }
};
```

---

## Performance & Optimization

### Response Time Targets

```typescript
const performanceTargets = {
  patternDetection: "< 5ms",
  intentClassification: "< 10ms",
  contextAssembly: {
    minimal: "< 20ms",
    standard: "< 50ms",
    rich: "< 100ms",
    comprehensive: "< 200ms"
  },
  
  agentResponseTime: {
    promiseManager: "< 2s",
    taskEnricher: "< 3s",
    budgetAnalyst: "< 2.5s",
    planningAdvisor: "< 3.5s",
    dependencyAnalyzer: "< 2s"
  },
  
  endToEndLatency: {
    simpleQuery: "< 2s",
    taskCreation: "< 3.5s",
    complexAnalysis: "< 5s",
    masterPlanGeneration: "< 6s"
  },
  
  streamingDisplay: {
    firstTokenLatency: "< 800ms",
    tokenThroughput: "> 30 tokens/second",
    userPerceivedLatency: "feels real-time"
  }
};
```

### Cost Optimization

```typescript
const costManagement = {
  contextMinimization: {
    strategy: "Only load what agent needs",
    
    savings: {
      minimalVsComprehensive: "~85% token reduction",
      standardVsComprehensive: "~60% token reduction",
      
      exampleCosts: {
        minimal: "$0.001 per request",
        standard: "$0.003 per request",
        rich: "$0.008 per request",
        comprehensive: "$0.020 per request"
      }
    }
  },
  
  agentSelection: {
    strategy: "Use most specialized, smallest-context agent possible",
    
    example: {
      bad: "Using Planning Advisor with comprehensive context for expense entry",
      cost: "$0.020",
      
      good: "Using Budget Analyst with standard context for expense entry",
      cost: "$0.003",
      
      savings: "85%"
    }
  },
  
  batchingWhere possible: {
    strategy: "Combine related AI calls when user intent spans multiple domains",
    
    example: {
      singleAgent: "Task Enricher generates task AND vendor suggestions in one call",
      instead_of: "Separate calls to create task, then get vendors",
      savings: "~40% fewer API calls"
    }
  },
  
  cachingStrategies: {
    vendorData: "Cache vendor listings for 24 hours",
    costEstimates: "Cache typical costs by event type for 7 days",
    userPreferences: "Cache learned preferences indefinitely, update on explicit change"
  },
  
  projectedCostPerEvent: {
    smallEvent_20people: "$0.40 (200 messages avg)",
    mediumEvent_100people: "$1.10 (500 messages avg)",
    largeEvent_200plus: "$2.50 (1000+ messages avg)",
    
    note: "Costs decrease over time as more data is cached and fewer AI calls needed"
  }
};
```

---

## Implementation Summary

### Phase 1 Priorities (Days 1-3)

1. **Core Agent System**
   - Implement agent registry and routing
   - Build context assembly engine
   - Create prompt templates for each agent

2. **Pattern Detection**
   - Build regex/NLP pattern matchers
   - Implement intent classification
   - Set up trigger system

3. **Initial Features**
   - Smart Task Creation (Task Enricher)
   - Expense Detection (Budget Analyst)
   - Basic contextual replies

### Phase 2 Priorities (Days 4-7)

4. **Advanced Features**
   - Vendor Suggestions
   - Poll Creation & Synthesis
   - Smart Mentions & Assignment

5. **Dashboard Intelligence**
   - Dynamic panel routing
   - Magic keyword system
   - Master Plan generation

### Phase 3 Priorities (Days 8-14)

6. **Refinement**
   - Learning loops
   - Performance optimization
   - Agent collaboration workflows

7. **Polish**
   - Streaming improvements
   - Error handling
   - Edge case management

---

## Success Metrics

### AI Performance Metrics

```typescript
const successMetrics = {
  accuracy: {
    intentClassification: "> 90%",
    taskExtraction: "> 85%",
    expenseCategor ization: "> 92%",
    vendorRelevance: "> 80%"
  },
  
  userSatisfaction: {
    aiHelpfulness: "> 4.0/5.0",
    suggestionAcceptance: "> 60%",
    featureAdoption: "> 70%",
    taskCompletionRate: "> 85%"
  },
  
  performance: {
    avgResponseTime: "< 3s",
    p95ResponseTime: "< 5s",
    streamingLatency: "< 1s to first token",
    uptime: "> 99.5%"
  },
  
  efficiency: {
    costPerEvent: "< $2.00",
    contextTokenAvg: "< 1800 tokens",
    apiCallsPerFeature: "< 2 avg"
  }
};
```

---

**Document Complete**

This implementation plan provides a comprehensive, feature-by-feature mapping of how to build your event planning platform using the specialized AI agent architecture. Each feature leverages specific agents, context levels, and orchestration patterns to create an intelligent, responsive system that feels magical to users while remaining cost-effective and performant.
