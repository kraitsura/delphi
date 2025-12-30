/**
 * FastIntentRouter - Regex-based fast-path intent detection
 *
 * Provides instant intent matching for common operations without AI calls.
 * Falls back to AI-powered IntentDetector for complex/ambiguous cases.
 *
 * Performance benefits:
 * - ~1ms regex matching vs ~500-1000ms AI call
 * - Zero API cost for common queries
 * - Predictable, deterministic results
 *
 * Usage:
 * ```typescript
 * const router = new FastIntentRouter();
 * const match = router.match(message);
 * if (match && match.confidence >= 0.9) {
 *   // Use fast-path intent
 *   return match.intent;
 * } else {
 *   // Fall back to AI detection
 *   return await intentDetector.detectIntent(message, roomContext);
 * }
 * ```
 */

export interface FastRouteMatch {
  intent: string;
  confidence: number;
  extractedParams: Record<string, string>;
}

interface RoutePattern {
  pattern: RegExp;
  intent: string;
  confidence: number;
  extractor?: (match: RegExpMatchArray) => Record<string, string>;
}

/**
 * Fast route patterns ordered by specificity (most specific first)
 * Each pattern should be:
 * - Precise: Minimal false positives
 * - Common: Frequently used operations
 * - Simple: No complex context needed
 */
const FAST_ROUTES: RoutePattern[] = [
  // ========== QUERY OPERATIONS (read-only, fastest path) ==========

  // Task queries
  {
    pattern: /^(show|list|view|display|get)\s+(my\s+)?(all\s+)?(current\s+)?tasks?$/i,
    intent: 'query_tasks',
    confidence: 0.95,
  },
  {
    pattern: /^what\s+(are\s+)?(my\s+)?(current\s+)?tasks?\??$/i,
    intent: 'query_tasks',
    confidence: 0.95,
  },
  {
    pattern: /^(show|display)\s+me\s+(the\s+)?tasks?$/i,
    intent: 'query_tasks',
    confidence: 0.95,
  },
  {
    pattern: /^tasks?\??$/i,
    intent: 'query_tasks',
    confidence: 0.90,
  },

  // Budget queries
  {
    pattern: /^(show|list|view|display|get)\s+(the\s+)?(my\s+)?(current\s+)?budget$/i,
    intent: 'query_budget',
    confidence: 0.95,
  },
  {
    pattern: /^what'?s\s+(the\s+)?(my\s+)?budget\??$/i,
    intent: 'query_budget',
    confidence: 0.95,
  },
  {
    pattern: /^(show|display)\s+me\s+(the\s+)?budget$/i,
    intent: 'query_budget',
    confidence: 0.95,
  },
  {
    pattern: /^budget\??$/i,
    intent: 'query_budget',
    confidence: 0.90,
  },

  // Expense queries
  {
    pattern: /^(show|list|view|display|get)\s+(my\s+)?(all\s+)?expenses?$/i,
    intent: 'query_budget',
    confidence: 0.93,
  },
  {
    pattern: /^what\s+(are\s+)?(my\s+)?expenses?\??$/i,
    intent: 'query_budget',
    confidence: 0.93,
  },

  // Vendor queries
  {
    pattern: /^(show|list|view|display|get)\s+(my\s+)?(saved\s+)?vendors?$/i,
    intent: 'query_vendors',
    confidence: 0.95,
  },
  {
    pattern: /^what\s+vendors?\s+(do\s+)?i\s+have\??$/i,
    intent: 'query_vendors',
    confidence: 0.95,
  },
  {
    pattern: /^vendors?\??$/i,
    intent: 'query_vendors',
    confidence: 0.90,
  },

  // ========== CREATE OPERATIONS ==========

  // Task creation with simple patterns
  {
    pattern: /^create\s+(a\s+)?task\s+(.+)$/i,
    intent: 'create_task',
    confidence: 0.92,
    extractor: (match) => ({
      description: match[2].trim()
    })
  },
  {
    pattern: /^add\s+(a\s+)?task\s+(.+)$/i,
    intent: 'create_task',
    confidence: 0.92,
    extractor: (match) => ({
      description: match[2].trim()
    })
  },
  {
    pattern: /^(make|new)\s+task:?\s+(.+)$/i,
    intent: 'create_task',
    confidence: 0.90,
    extractor: (match) => ({
      description: match[2].trim()
    })
  },

  // Expense creation with amount extraction
  {
    pattern: /^(add|create|set|record)\s+(an?\s+)?expense\s+(?:of\s+)?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:for\s+)?(.+)$/i,
    intent: 'add_expense',
    confidence: 0.93,
    extractor: (match) => ({
      amount: match[3].replace(/,/g, ''),
      category: match[4].trim()
    })
  },
  {
    pattern: /^(add|create|set|record)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:expense\s+)?(?:for\s+)?(.+)$/i,
    intent: 'add_expense',
    confidence: 0.91,
    extractor: (match) => ({
      amount: match[2].replace(/,/g, ''),
      category: match[3].trim()
    })
  },

  // Budget creation with total amount
  {
    pattern: /^(set|create|make)\s+(a\s+)?budget\s+(?:of\s+)?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)$/i,
    intent: 'create_budget',
    confidence: 0.94,
    extractor: (match) => ({
      total: match[3].replace(/,/g, '')
    })
  },
  {
    pattern: /^budget\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)$/i,
    intent: 'create_budget',
    confidence: 0.92,
    extractor: (match) => ({
      total: match[1].replace(/,/g, '')
    })
  },

  // ========== SEARCH OPERATIONS ==========

  // Vendor search with category and location
  {
    pattern: /^(search|find|look\s+for)\s+(?:for\s+)?(.+?)\s+(?:in|near|around)\s+(.+)$/i,
    intent: 'search_vendors',
    confidence: 0.93,
    extractor: (match) => ({
      category: match[2].trim(),
      location: match[3].trim()
    })
  },
  {
    pattern: /^(search|find|look\s+for)\s+(?:for\s+)?(.+?)(?:\s+vendors?)?$/i,
    intent: 'search_vendors',
    confidence: 0.88,
    extractor: (match) => ({
      category: match[2].trim()
    })
  },

  // Specific vendor categories (high confidence)
  {
    pattern: /^(find|search|show)\s+(dj|photographer|caterer|florist|venue|videographer|baker|band)s?\s+(?:in|near|around)\s+(.+)$/i,
    intent: 'search_vendors',
    confidence: 0.95,
    extractor: (match) => ({
      category: match[2].trim(),
      location: match[3].trim()
    })
  },
  {
    pattern: /^(find|search|show)\s+(dj|photographer|caterer|florist|venue|videographer|baker|band)s?$/i,
    intent: 'search_vendors',
    confidence: 0.93,
    extractor: (match) => ({
      category: match[2].trim()
    })
  },

  // ========== UPDATE OPERATIONS ==========

  // Task updates (sync from conversation)
  {
    pattern: /^(update|sync|refresh)\s+(the\s+)?tasks?(\s+list)?$/i,
    intent: 'sync_conversation_to_tasks',
    confidence: 0.88, // Lower confidence - context-dependent
  },
  {
    pattern: /^(create|add|make)\s+tasks?\s+from\s+(our\s+)?(conversation|discussion|chat)$/i,
    intent: 'sync_conversation_to_tasks',
    confidence: 0.93,
  },

  // Budget updates
  {
    pattern: /^(update|change)\s+(the\s+)?budget\s+to\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)$/i,
    intent: 'update_budget',
    confidence: 0.94,
    extractor: (match) => ({
      total: match[3].replace(/,/g, '')
    })
  },

  // ========== DELETE OPERATIONS ==========

  // Generic delete (requires AI for disambiguation)
  {
    pattern: /^(delete|remove)\s+task\s+(.+)$/i,
    intent: 'delete_task',
    confidence: 0.85,
    extractor: (match) => ({
      description: match[2].trim()
    })
  },

  // ========== HELP COMMANDS ==========

  {
    pattern: /^(help|what\s+can\s+you\s+do|commands?|how\s+do\s+i)$/i,
    intent: 'general_question',
    confidence: 0.95,
  },
  {
    pattern: /^what\s+(are|is)\s+(.+?)\??$/i,
    intent: 'general_question',
    confidence: 0.75,
    extractor: (match) => ({
      topic: match[2].trim()
    })
  },
  {
    pattern: /^how\s+(do\s+i|to)\s+(.+?)\??$/i,
    intent: 'general_question',
    confidence: 0.75,
    extractor: (match) => ({
      action: match[2].trim()
    })
  },

  // ========== POLL/VOTING ==========

  {
    pattern: /^(create|make|start)\s+(a\s+)?poll\s+(.+)$/i,
    intent: 'create_poll',
    confidence: 0.92,
    extractor: (match) => ({
      topic: match[3].trim()
    })
  },
  {
    pattern: /^(vote|poll)\s+(on|about)\s+(.+)$/i,
    intent: 'create_poll',
    confidence: 0.90,
    extractor: (match) => ({
      topic: match[3].trim()
    })
  },
];

/**
 * FastIntentRouter - Lightning-fast regex-based intent matching
 *
 * Order of operations:
 * 1. Strip @delphi mentions
 * 2. Normalize whitespace
 * 3. Try each pattern in order (most specific first)
 * 4. Return first match with confidence score
 * 5. Return null if no match (caller should use AI)
 */
export class FastIntentRouter {
  /**
   * Match message against fast route patterns
   * @param message User message to analyze
   * @returns FastRouteMatch if pattern matched, null otherwise
   */
  match(message: string): FastRouteMatch | null {
    // Strip @delphi mentions and normalize whitespace
    const cleaned = message
      .replace(/@delphi\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Empty message after cleaning
    if (!cleaned) {
      return null;
    }

    // Try each route in order
    for (const route of FAST_ROUTES) {
      const match = cleaned.match(route.pattern);
      if (match) {
        // Extract parameters if extractor provided
        const extractedParams = route.extractor?.(match) || {};

        console.log(`[FastIntentRouter] Fast-path match: "${cleaned}" -> ${route.intent} (confidence: ${route.confidence})`);
        if (Object.keys(extractedParams).length > 0) {
          console.log(`[FastIntentRouter] Extracted params:`, extractedParams);
        }

        return {
          intent: route.intent,
          confidence: route.confidence,
          extractedParams,
        };
      }
    }

    // No match found
    console.log(`[FastIntentRouter] No fast-path match for: "${cleaned}"`);
    return null;
  }

  /**
   * Check if intent should use fast path based on confidence threshold
   * @param match FastRouteMatch from match()
   * @param threshold Minimum confidence required (default 0.9)
   * @returns true if confidence meets threshold
   */
  shouldUseFastPath(match: FastRouteMatch | null, threshold: number = 0.9): boolean {
    return match !== null && match.confidence >= threshold;
  }

  /**
   * Get all supported intents in fast router
   * Useful for debugging and documentation
   */
  getSupportedIntents(): string[] {
    const intents = new Set<string>();
    FAST_ROUTES.forEach(route => intents.add(route.intent));
    return Array.from(intents).sort();
  }

  /**
   * Get pattern count for statistics
   */
  getPatternCount(): number {
    return FAST_ROUTES.length;
  }
}
