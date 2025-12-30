import { BaseAgent, AgentContext, AgentResponse, AgenticLoopConfig } from '../BaseAgent';
import { Tool } from '../../tools';

/**
 * BudgetAgent - Specialized agent for budget and expense management
 *
 * Capabilities:
 * - Expense tracking (add, update, categorize)
 * - Budget analysis (spending vs allocated)
 * - Split management (equal, custom, percentage)
 * - Cost estimation
 * - Financial reporting and alerts
 *
 * Extracted from UnifiedDelphiAgent for focused budget operations
 */
export class BudgetAgent extends BaseAgent {
  constructor(aiKey: string, tools: Tool[]) {
    super('BudgetAgent', aiKey, tools);
  }

  getIntent(): string {
    return 'budget_management';
  }

  getSystemPrompt(context: AgentContext): string {
    const eventName = context.eventContext?.name || 'Unnamed Event';
    const eventDate = context.eventContext?.date || 'Not set';
    const eventBudget = context.eventContext?.budget || 'Not set';

    return `You are Delphi's Budget Management specialist. You handle all financial aspects of event planning including expense tracking, budget analysis, cost splitting, and financial reporting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT EVENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event ID: ${context.eventId || 'Unknown'}
Event Name: ${eventName}
Event Date: ${eventDate}
Total Budget: ${typeof eventBudget === 'number' ? `$${eventBudget.toLocaleString()}` : eventBudget}

${this.buildBudgetState(context)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CAPABILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EXPENSE TRACKING
   - Add new expenses with amount, description, category
   - Update existing expenses
   - Categorize expenses (venue, catering, photography, music, decor, etc.)
   - Track payment status (paid, pending, due)
   - Link expenses to vendors

2. BUDGET ANALYSIS
   - Calculate total spent vs budget
   - Show budget utilization percentage
   - Break down spending by category
   - Identify budget overruns
   - Project final costs based on pending expenses

3. COST SPLITTING
   - Equal splits: Divide costs evenly among participants
   - Custom splits: Based on specific contribution agreements
   - Percentage splits: Allocate by percentage
   - Track who paid what
   - Calculate balances owed

4. COST ESTIMATION
   - Estimate costs for tasks and categories
   - Provide industry standard pricing
   - Compare actual vs estimated costs
   - Alert on budget risks

5. FINANCIAL REPORTING
   - Generate spending summaries
   - Category breakdowns
   - Payment tracking
   - Budget alerts and warnings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have access to these tools:

1. convex_crud - Database operations for expenses and budget data
   Operations: create, read, update, delete
   Tables: expenses, budgets, events
   All queries are scoped to event: ${context.eventId}

EXPENSE SCHEMA (for convex_crud operations):
{
  "amount": number (REQUIRED - e.g., 1500.00),
  "description": string (REQUIRED - e.g., "Venue Deposit"),
  "paidBy": userId (REQUIRED - use autoContext.userId),
  "paidAt": timestamp (REQUIRED - use autoContext.timestamp or specific date),
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "supplies" | "transportation" | "accommodation" | "other",
  "paymentMethod": "cash" | "card" | "transfer" | "check" | "other",
  "receiptUrl": string (OPTIONAL - omit if not provided, never use null),
  "vendorId": vendor ID (OPTIONAL - if paying a specific vendor),
  "notes": string (OPTIONAL - additional details),
  "dueDate": timestamp (OPTIONAL - for pending expenses),
  "status": "paid" | "pending" | "overdue" (DEFAULT: "paid" if paidAt is set)
}

Note: eventId, roomId, and sourceMessageId are automatically injected from context.
You do NOT need to specify these fields.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPENSE OPERATIONS - CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ALWAYS USE PROPOSAL SYSTEM FOR EXPENSES:

When user asks to add/create expenses:
1. Extract expense details from message
2. Parse monetary amounts: "2k"=2000, "$500"=500, "1.5k"=1500
3. Return a PROPOSAL (do NOT create directly via convex_crud)
4. Let user review and approve before creation

PARSING RULES:
- "add expense for X for Y" = ONE expense: amount=X, description=Y
- "2k for DJ" = ONE expense: amount=2000, description="DJ"
- "set expenses $500 for flowers and $1.5k for photographer" = TWO expenses
- DO NOT split "amount + description" into separate items
- ALWAYS parse monetary amounts correctly

Example Proposal Response:
{
  "text": "I've prepared a proposal to create 1 expense...",
  "intent": "add_expense",
  "confidence": 0.95,
  "toolsUsed": [],
  "structuredData": {
    "type": "proposal",
    "proposal": {
      "proposalId": "prop_...",
      "proposalType": "budget_entries",
      "items": [
        {
          "type": "expense",
          "data": {
            "description": "DJ",
            "amount": 2000,
            "category": "music",
            "paidBy": "auto-injected",
            "paidAt": "auto-injected"
          }
        }
      ],
      "expiresAt": timestamp,
      "requiresConfirmation": true
    }
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUDGET CALCULATION & ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can perform calculations directly without tools:

Budget Presentation Format:
- Total Budget: $X,XXX.XX
- Total Spent: $X,XXX.XX (from paid expenses)
- Total Pending: $X,XXX.XX (from pending expenses)
- Remaining: $X,XXX.XX
- Utilization: XX% (spent / budget × 100)
- Projected Total: $X,XXX.XX (spent + pending)

Budget Status Alerts:
- ✅ On track: <70% utilized
- ⚠️  Watch closely: 70-90% utilized
- 🚨 Budget risk: >90% utilized
- ❌ Over budget: spent > budget

Category Breakdown:
Show spending by category with percentages:
- Venue: $X,XXX (XX%)
- Catering: $X,XXX (XX%)
- Photography: $X,XXX (XX%)
- etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST SPLITTING LOGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Equal Split:
Total Amount / Number of Participants = Amount per Person

Example:
Total: $3,000 for venue
Participants: 4 people
Each pays: $750

Custom Split:
Based on agreed amounts or percentages

Example:
Total: $2,000
- Person A pays $800 (40%)
- Person B pays $600 (30%)
- Person C pays $600 (30%)

Balance Tracking:
Track who has paid vs who owes:
- Query expenses by paidBy
- Sum amounts per person
- Calculate remaining balances
- Show who owes whom

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST ESTIMATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Industry Standard Pricing (use when estimating):

Venue: $2,000 - $10,000+
  - Community center: $500 - $2,000
  - Hotel ballroom: $3,000 - $8,000
  - Premium venue: $8,000 - $20,000+

Catering: $30 - $150 per person
  - Buffet: $30 - $60/person
  - Plated dinner: $50 - $100/person
  - Premium/custom: $100 - $150+/person

Photography: $1,500 - $5,000
  - Basic package: $1,500 - $2,500
  - Professional: $2,500 - $4,000
  - Premium: $4,000 - $8,000+

Music/DJ: $800 - $3,000
  - DJ: $800 - $1,500
  - Live band (4-piece): $2,000 - $4,000
  - Premium entertainment: $4,000+

Decor/Flowers: $500 - $5,000
  - Basic: $500 - $1,500
  - Moderate: $1,500 - $3,000
  - Elaborate: $3,000 - $8,000+

Note: Adjust estimates based on:
- Guest count
- Event location/region
- Event type (wedding, corporate, etc.)
- Seasonality
- Luxury level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Add Single Expense
User: "Add expense of $2k for DJ"

Step 1: Parse request
- Amount: 2000
- Description: "DJ"
- Category: "music" (inferred)

Step 2: Build proposal
REASONING: User wants to add one expense. I'll create a proposal with the parsed data.
COMPLETE: [Return proposal with 1 budget_entry item]

Example 2: Query Budget Status
User: "Show me the budget status"

Step 1: Query expenses
REASONING: I need to get all expenses to calculate budget status.
ACTION: convex_crud
PARAMS: {"operation": "read", "table": "expenses"}

Step 2: Calculate and present
REASONING: I have the expense data. I'll calculate totals and present the budget status.
COMPLETE: [Show formatted budget summary with totals, percentages, alerts]

Example 3: Split Costs
User: "Split the $3000 venue cost between 4 of us"

REASONING: Direct calculation, no tools needed. $3000 / 4 = $750 per person.
COMPLETE: [Show calculation breakdown and per-person amounts]

Example 4: Add Multiple Expenses
User: "Add expenses: $500 for flowers, $1500 for photographer, $800 for DJ"

Step 1: Parse multiple expenses
- Expense 1: $500, flowers, category=decor
- Expense 2: $1500, photographer, category=photography
- Expense 3: $800, DJ, category=music

Step 2: Build proposal
REASONING: User wants to add 3 expenses. I'll create a proposal for review.
COMPLETE: [Return proposal with 3 budget_entry items]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ ALWAYS use proposal system for expense creation
✓ ALWAYS parse monetary amounts correctly (2k = 2000)
✓ ALWAYS categorize expenses appropriately
✓ ALWAYS show budget alerts when >80% utilized
✓ ALWAYS format currency as $X,XXX.XX
✓ ALWAYS calculate percentages and show breakdowns
✓ NEVER create expenses directly via convex_crud
✓ NEVER skip proposal generation for expenses
✓ NEVER use null for optional fields (omit instead)
✓ Be clear about budget status and risks
✓ Be encouraging about financial progress
✓ Suggest cost-saving alternatives when appropriate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You must respond in one of these formats:

Format 1: TAKE ACTION (when you need to use a tool)
REASONING: [Your thought process - what you're doing and why]
ACTION: [tool_name]
PARAMS: {valid_json_parameters}

Format 2: TASK COMPLETE (when goal is achieved)
REASONING: [Why the goal is achieved]
COMPLETE: [Summary with financial details, formatted clearly]

Format 3: CANNOT PROCEED (when request cannot be fulfilled)
REASONING: [Why you cannot complete the request]
ABORT: [Explanation and constructive suggestion for user]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now handle the user's budget request thoughtfully. Think step-by-step before acting.
`;
  }

  /**
   * Build budget state section showing current financial status
   */
  private buildBudgetState(context: AgentContext): string {
    const lines: string[] = [];
    const budget = context.eventContext?.budget;

    if (budget != null && typeof budget === 'number') {
      lines.push(`Budget Status: Set ($${budget.toLocaleString()})`);
      lines.push('💡 Query expenses to see current spending and utilization');
    } else {
      lines.push('Budget Status: Not set');
      lines.push('⚠️  Consider setting a budget to track expenses effectively');
    }

    return lines.join('\n');
  }

  /**
   * Override handle() to implement expense proposal logic
   */
  async handle(
    context: AgentContext,
    config: Partial<AgenticLoopConfig> = {},
    intent?: string
  ): Promise<AgentResponse> {
    console.log('[BudgetAgent] Checking for expense operations...');

    const intentLower = (intent || '').toLowerCase();

    // Check if this is an expense creation request
    // ALWAYS use proposal system for expense operations
    if (
      intentLower.includes('expense') ||
      intentLower.includes('add_expense') ||
      intentLower.includes('create_expense') ||
      (intentLower.includes('add') && context.message.toLowerCase().includes('expense'))
    ) {
      console.log('[BudgetAgent] Expense operation detected - generating proposal');
      return await this.buildExpenseProposal(context, intent);
    }

    // For query/analysis operations, use normal ReAct loop
    console.log('[BudgetAgent] Normal budget operation (query/analysis)');
    return await super.handle(context, config, intent);
  }

  /**
   * Build expense proposal from user message
   * Extracts expense data and returns proposal for user review
   */
  private async buildExpenseProposal(
    context: AgentContext,
    intent?: string
  ): Promise<AgentResponse> {
    console.log('[BudgetAgent] Building expense proposal...');

    // Use AI to extract expense items from message
    const items = await this.extractExpenseItems(context);

    if (items.length === 0) {
      // If we can't extract items, ask for clarification
      return {
        text: 'I couldn\'t extract expense details from your message. Please specify the amount and description.\n\nExample: "Add expense of $500 for flowers"',
        intent: intent || 'add_expense',
        confidence: 0.5,
        toolsUsed: [],
        metadata: { wasSuccessful: false }
      };
    }

    // Generate proposal ID and expiration
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Build proposal metadata
    const proposalMetadata = {
      proposalId,
      proposalType: 'budget_entries' as const,
      items,
      expiresAt,
      requiresConfirmation: true,
      createdAt: Date.now(),
    };

    return {
      text: this.formatExpenseProposalMessage(items),
      intent: intent || 'add_expense',
      confidence: 0.95,
      toolsUsed: [],
      structuredData: {
        type: 'proposal',
        proposal: proposalMetadata,
      },
      metadata: {
        totalIterations: 0,
        wasSuccessful: true,
      },
    };
  }

  /**
   * Extract expense items from user message using AI
   */
  private async extractExpenseItems(
    context: AgentContext
  ): Promise<Array<{ type: string; data: any; reasoning?: string }>> {
    const extractionPrompt = `You are extracting expense items from a user message for budget tracking.

User Message: "${context.message}"

Extract ALL distinct expenses the user wants to create. For each expense, determine:

EXPENSE SCHEMA:
{
  "amount": number (REQUIRED - parse "2k" as 2000, "$500" as 500, "1.5k" as 1500),
  "description": string (REQUIRED - what the expense is for),
  "category": "venue" | "catering" | "photography" | "music" | "decor" | "supplies" | "transportation" | "accommodation" | "other",
  "paymentMethod": "cash" | "card" | "transfer" | "check" | "other" (if mentioned),
  "notes": string (if additional context provided)
}

CRITICAL PARSING RULES:
- "add expense for X for Y" = ONE expense: amount=X, description=Y
- "2k for DJ" = ONE expense: amount=2000, description="DJ"
- DO NOT split "amount + description" into separate items
- Parse monetary amounts: "2k"=2000, "$500"=500, "1.5k"=1500, "$1,000"=1000

CATEGORY INFERENCE:
- DJ, music, band → "music"
- Photographer, videographer, photo → "photography"
- Caterer, food, catering → "catering"
- Venue, location, hall → "venue"
- Flowers, florist, decorations → "decor"
- Default → "other"

Return ONLY a JSON array of expense items:

[
  {
    "type": "expense",
    "data": {
      "description": "DJ",
      "amount": 2000,
      "category": "music"
    },
    "reasoning": "User wants to track DJ cost"
  }
]

Examples:

User: "add expense for 2k for a DJ"
[
  {
    "type": "expense",
    "data": {
      "description": "DJ",
      "amount": 2000,
      "category": "music"
    }
  }
]

User: "set expenses $500 for flowers and $1.5k for photographer"
[
  {
    "type": "expense",
    "data": {
      "description": "Flowers",
      "amount": 500,
      "category": "decor"
    }
  },
  {
    "type": "expense",
    "data": {
      "description": "Photographer",
      "amount": 1500,
      "category": "photography"
    }
  }
]

Return only the JSON array, no other text.`;

    try {
      const response = await this.callAI(extractionPrompt);

      // Extract JSON from response
      const jsonString = this.extractJsonArray(response);
      if (!jsonString) {
        console.error('[BudgetAgent] No JSON array found in extraction response');
        return [];
      }

      const items = JSON.parse(jsonString);
      console.log(`[BudgetAgent] Extracted ${items.length} expense items`);
      return items;
    } catch (error: any) {
      console.error('[BudgetAgent] Error extracting expense items:', error.message);
      return [];
    }
  }

  /**
   * Extract JSON array from AI response with proper bracket matching
   */
  private extractJsonArray(text: string): string | null {
    const startIdx = text.indexOf('[');
    if (startIdx === -1) return null;

    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[') bracketCount++;
        if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            return text.substring(startIdx, i + 1);
          }
        }
      }
    }

    return null;
  }

  /**
   * Format proposal message for user
   */
  private formatExpenseProposalMessage(
    items: Array<{ type: string; data: any; reasoning?: string }>
  ): string {
    const summary = items
      .map((item, idx) => {
        const expense = item.data;
        return `${idx + 1}. **${expense.description}** - $${expense.amount.toLocaleString()} (${expense.category})`;
      })
      .join('\n');

    const totalAmount = items.reduce((sum, item) => sum + item.data.amount, 0);

    return `I've prepared a proposal to add ${items.length} expense${items.length > 1 ? 's' : ''}:

${summary}

**Total: $${totalAmount.toLocaleString()}**

Would you like to:
- ✅ **Accept all** - Add all ${items.length} expense${items.length > 1 ? 's' : ''} to your budget
- ✏️ **Edit** - Modify the expenses before adding
- ❌ **Reject** - Don't add these expenses

This proposal expires in 5 minutes.`;
  }

  /**
   * Build component response for budget queries
   * Returns BudgetSummaryCard and ExpensesSummary components
   */
  protected buildComponentResponse(
    intent: string,
    data: any,
    context: AgentContext
  ): Partial<AgentResponse> {
    const intentLower = intent.toLowerCase();

    // Query Budget/Expenses → BudgetSummaryCard and ExpensesSummary
    if (
      (intentLower.includes('budget') || intentLower.includes('expense')) &&
      (intentLower.includes('query') || intentLower.includes('show') ||
       intentLower.includes('list') || intentLower.includes('get') ||
       intentLower.includes('status') || intentLower.includes('summary'))
    ) {
      return {
        renderType: 'component_grid',
        componentConfig: {
          sections: [
            {
              type: 'grid',
              components: [
                {
                  type: 'BudgetSummaryCard',
                  props: {
                    eventId: context.eventId,
                    showCategories: true
                  }
                },
                {
                  type: 'ExpensesSummary',
                  props: {
                    eventId: context.eventId
                  }
                }
              ]
            }
          ]
        }
      };
    }

    return {};
  }
}
