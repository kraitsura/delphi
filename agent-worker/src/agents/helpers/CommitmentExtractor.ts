import { BaseAgent, AgentContext } from '../BaseAgent';

/**
 * Message interface for commitment extraction
 */
export interface Message {
  _id: string;
  content: string;
  authorType: 'user' | 'agent' | 'system';
  authorName?: string;
  _creationTime?: number;
}

/**
 * Commitment extracted from conversation
 */
export interface Commitment {
  text: string;
  confidence: number;
  category?: string;
  mentions?: {
    cost?: number;
    deadline?: string;
    vendor?: string;
  };
}

/**
 * Result of commitment extraction
 */
export interface CommitmentExtractionResult {
  success: boolean;
  commitments: Commitment[];
  conversationSummary?: string;
  error?: string;
}

/**
 * CommitmentExtractor - Analyzes conversation to extract action items and commitments
 *
 * Uses AI to identify phrases like:
 * - "We should book a photographer"
 * - "Let's find a caterer"
 * - "I'll handle the invitations"
 * - Mentions of costs, deadlines, vendors
 */
export class CommitmentExtractor {
  constructor(
    private agent: BaseAgent,
    private context: AgentContext
  ) {}

  /**
   * Extract commitments from recent conversation messages
   * @param messages Recent conversation messages (typically last 10-20)
   * @returns Extracted commitments with confidence scores
   */
  async extractCommitments(messages: Message[]): Promise<CommitmentExtractionResult> {
    // Filter to user messages only (skip agent responses)
    const userMessages = messages.filter(m => m.authorType === 'user');

    if (userMessages.length === 0) {
      return {
        success: true,
        commitments: [],
        conversationSummary: 'No user messages to analyze'
      };
    }

    // Build conversation text
    const conversationText = userMessages
      .map(m => `${m.authorName || 'User'}: ${m.content}`)
      .join('\n');

    console.log(`[CommitmentExtractor] Analyzing ${userMessages.length} messages for commitments...`);

    try {
      const prompt = this.buildExtractionPrompt(conversationText);
      const response = await (this.agent as any).callAI(prompt);

      // Parse AI response
      const result = this.parseExtractionResponse(response);

      console.log(`[CommitmentExtractor] Found ${result.commitments.length} commitments`);

      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      console.error(`[CommitmentExtractor] Error extracting commitments: ${error.message}`);
      return {
        success: false,
        commitments: [],
        error: error.message
      };
    }
  }

  /**
   * Build prompt for AI to extract commitments
   */
  private buildExtractionPrompt(conversationText: string): string {
    const eventName = this.context.eventContext?.name || 'Unnamed Event';
    const eventDate = this.context.eventContext?.date || 'Not set';
    const eventType = this.context.eventContext?.type || 'Unknown';

    return `You are analyzing a conversation about planning an event to extract action items and commitments.

EVENT CONTEXT:
- Event: ${eventName}
- Type: ${eventType}
- Date: ${eventDate}

CONVERSATION TO ANALYZE:
${conversationText}

TASK: Extract all commitments, action items, and things that need to be done.

EXTRACTION PATTERNS:
Look for phrases that indicate commitments or action items:
✓ "we need to [action]" - Strong commitment
✓ "we should [action]" - Strong commitment
✓ "let's [action]" - Strong commitment
✓ "I'll [action]" - Strong commitment
✓ "don't forget to [action]" - Strong reminder
✓ "make sure we [action]" - Strong reminder
✓ "someone should [action]" - Moderate commitment

Also look for action verbs indicating tasks:
- Booking/book (venue, vendors, services)
- Finding/find (caterer, photographer, DJ)
- Hiring/hire (staff, vendors)
- Ordering/order (supplies, decorations)
- Sending/send (invitations, save-the-dates)
- Creating/create (guest list, timeline)
- Confirming/confirm (dates, bookings)

Look for contextual information:
- Cost mentions: "$500", "under budget", "expensive"
- Deadline mentions: "by next week", "before the event", specific dates
- Vendor mentions: specific company names, vendor types

RESPONSE FORMAT:
Respond with ONLY a JSON object in this exact format:
{
  "commitments": [
    {
      "text": "Book a photographer",
      "confidence": 0.9,
      "category": "photography",
      "mentions": {
        "cost": 1500,
        "deadline": "2025-12-01"
      }
    }
  ],
  "conversationSummary": "Brief 1-2 sentence summary of what was discussed"
}

CONFIDENCE SCORING:
- 0.9-1.0: Explicit commitment ("we will", "I'll", "let's")
- 0.7-0.9: Strong indication ("we should", "we need to")
- 0.5-0.7: Moderate indication ("maybe we should", "it might be good to")
- <0.5: Weak indication (general discussion, no clear commitment)

CATEGORY OPTIONS:
venue, catering, photography, music, decor, invitations, transportation, accommodation, planning, other

IMPORTANT:
- Only include commitments with confidence >= 0.5
- Be concise in commitment text (3-8 words)
- Include cost/deadline mentions if found in conversation
- If no clear commitments found, return empty array
- Respond with ONLY the JSON object, no other text`;
  }

  /**
   * Parse AI response to extract commitments
   */
  private parseExtractionResponse(response: string): {
    commitments: Commitment[];
    conversationSummary?: string;
  } {
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.warn('[CommitmentExtractor] No JSON found in response');
        return {
          commitments: [],
          conversationSummary: 'Failed to parse AI response'
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.commitments || !Array.isArray(parsed.commitments)) {
        console.warn('[CommitmentExtractor] Invalid response structure');
        return {
          commitments: [],
          conversationSummary: parsed.conversationSummary || 'Invalid response structure'
        };
      }

      // Filter to high-confidence commitments only (>= 0.5)
      const validCommitments = parsed.commitments
        .filter((c: any) => c.text && c.confidence >= 0.5)
        .map((c: any) => ({
          text: c.text,
          confidence: c.confidence,
          category: c.category || 'other',
          mentions: c.mentions || {}
        }));

      return {
        commitments: validCommitments,
        conversationSummary: parsed.conversationSummary || 'Analyzed conversation for commitments'
      };
    } catch (error: any) {
      console.error('[CommitmentExtractor] JSON parsing error:', error);
      return {
        commitments: [],
        conversationSummary: 'Error parsing response'
      };
    }
  }
}
