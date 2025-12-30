/**
 * Keyword-based heuristic scoring for intent detection
 * Provides fast, lightweight intent scoring without AI calls
 */

export interface HeuristicScore {
  intent: string;
  score: number;
  keywords: string[];
}

/**
 * Keyword weights and their associated intents
 * Weight range: 0.1 (weak signal) to 0.4 (strong signal)
 * Scores are capped at 0.85 to indicate heuristic limitations
 */
const KEYWORD_WEIGHTS: Record<string, { weight: number; intents: string[] }> = {
  // Task keywords (strong signals)
  task: { weight: 0.3, intents: ['task_create', 'task_update', 'query_tasks'] },
  tasks: { weight: 0.3, intents: ['query_tasks', 'task_create', 'task_update'] },
  todo: { weight: 0.3, intents: ['task_create', 'query_tasks'] },
  todos: { weight: 0.3, intents: ['query_tasks', 'task_create'] },
  deadline: { weight: 0.2, intents: ['task_create', 'task_update'] },
  due: { weight: 0.2, intents: ['task_create', 'task_update'] },
  assign: { weight: 0.25, intents: ['task_create', 'task_update'] },
  assigned: { weight: 0.25, intents: ['task_update', 'query_tasks'] },
  complete: { weight: 0.2, intents: ['task_update', 'query_tasks'] },
  completed: { weight: 0.2, intents: ['query_tasks', 'task_update'] },
  priority: { weight: 0.2, intents: ['task_create', 'task_update'] },
  urgent: { weight: 0.2, intents: ['task_create', 'task_update'] },
  important: { weight: 0.2, intents: ['task_create', 'task_update'] },
  checklist: { weight: 0.25, intents: ['task_create', 'query_tasks'] },

  // Budget keywords
  budget: { weight: 0.35, intents: ['create_budget', 'query_budget', 'update_budget'] },
  expense: { weight: 0.3, intents: ['add_expense', 'query_budget'] },
  expenses: { weight: 0.3, intents: ['query_budget', 'add_expense'] },
  cost: { weight: 0.25, intents: ['add_expense', 'query_budget'] },
  costs: { weight: 0.25, intents: ['query_budget', 'add_expense'] },
  paid: { weight: 0.25, intents: ['add_expense', 'update_budget'] },
  payment: { weight: 0.25, intents: ['add_expense', 'update_budget'] },
  spend: { weight: 0.25, intents: ['add_expense', 'query_budget'] },
  spending: { weight: 0.25, intents: ['query_budget', 'add_expense'] },
  split: { weight: 0.2, intents: ['add_expense', 'update_budget'] },
  price: { weight: 0.2, intents: ['add_expense', 'query_budget'] },
  pricing: { weight: 0.2, intents: ['query_budget', 'search_vendors'] },
  total: { weight: 0.15, intents: ['query_budget'] },
  remaining: { weight: 0.15, intents: ['query_budget'] },
  allocated: { weight: 0.2, intents: ['query_budget', 'update_budget'] },

  // Vendor keywords
  vendor: { weight: 0.35, intents: ['search_vendors', 'query_vendors', 'save_vendor'] },
  vendors: { weight: 0.35, intents: ['query_vendors', 'search_vendors'] },
  photographer: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  photography: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  caterer: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  catering: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  dj: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  music: { weight: 0.2, intents: ['search_vendors', 'general_planning'] },
  florist: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  flowers: { weight: 0.25, intents: ['search_vendors', 'general_planning'] },
  venue: { weight: 0.35, intents: ['search_vendors', 'save_vendor', 'general_planning'] },
  location: { weight: 0.2, intents: ['search_vendors', 'general_planning'] },
  bakery: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  cake: { weight: 0.25, intents: ['search_vendors', 'general_planning'] },
  decorator: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  decoration: { weight: 0.25, intents: ['search_vendors', 'general_planning'] },
  bartender: { weight: 0.3, intents: ['search_vendors', 'save_vendor'] },
  bar: { weight: 0.2, intents: ['search_vendors', 'general_planning'] },

  // Action keywords - Create
  create: { weight: 0.3, intents: ['task_create', 'create_budget', 'create_poll'] },
  add: { weight: 0.3, intents: ['task_create', 'add_expense', 'save_vendor'] },
  make: { weight: 0.25, intents: ['task_create', 'create_budget', 'create_poll'] },
  new: { weight: 0.25, intents: ['task_create', 'create_budget', 'search_vendors'] },
  set: { weight: 0.2, intents: ['create_budget', 'add_expense', 'task_create'] },
  setup: { weight: 0.2, intents: ['create_budget', 'task_create', 'general_planning'] },

  // Action keywords - Read
  show: { weight: 0.3, intents: ['query_tasks', 'query_budget', 'query_vendors'] },
  list: { weight: 0.3, intents: ['query_tasks', 'query_vendors', 'query_budget'] },
  view: { weight: 0.3, intents: ['query_tasks', 'query_budget', 'query_vendors'] },
  see: { weight: 0.25, intents: ['query_tasks', 'query_budget', 'query_vendors'] },
  display: { weight: 0.25, intents: ['query_tasks', 'query_budget', 'query_vendors'] },
  what: { weight: 0.2, intents: ['query_tasks', 'query_budget', 'query_vendors', 'general_question'] },
  check: { weight: 0.2, intents: ['query_tasks', 'query_budget', 'query_vendors'] },

  // Action keywords - Update
  update: { weight: 0.3, intents: ['task_update', 'update_budget', 'sync_conversation_to_tasks'] },
  change: { weight: 0.25, intents: ['task_update', 'update_budget'] },
  modify: { weight: 0.25, intents: ['task_update', 'update_budget'] },
  edit: { weight: 0.25, intents: ['task_update', 'update_budget'] },
  sync: { weight: 0.35, intents: ['sync_conversation_to_tasks'] },

  // Action keywords - Delete
  delete: { weight: 0.3, intents: ['delete_task'] },
  remove: { weight: 0.3, intents: ['delete_task'] },
  clear: { weight: 0.25, intents: ['delete_task'] },

  // Action keywords - Search/Find
  search: { weight: 0.35, intents: ['search_vendors', 'query_vendors', 'query_tasks'] },
  find: { weight: 0.35, intents: ['search_vendors', 'query_vendors', 'query_tasks'] },
  lookup: { weight: 0.3, intents: ['search_vendors', 'query_vendors'] },
  browse: { weight: 0.25, intents: ['search_vendors', 'query_vendors'] },

  // Planning keywords
  plan: { weight: 0.3, intents: ['general_planning', 'task_create'] },
  planning: { weight: 0.3, intents: ['general_planning', 'task_create'] },
  organize: { weight: 0.25, intents: ['general_planning', 'task_create'] },
  schedule: { weight: 0.25, intents: ['task_create', 'general_planning'] },
  timeline: { weight: 0.25, intents: ['task_create', 'general_planning'] },

  // Poll keywords
  poll: { weight: 0.4, intents: ['create_poll'] },
  vote: { weight: 0.35, intents: ['create_poll'] },
  voting: { weight: 0.35, intents: ['create_poll'] },
  decide: { weight: 0.2, intents: ['create_poll', 'general_planning'] },
  choice: { weight: 0.2, intents: ['create_poll', 'general_planning'] },

  // Question indicators
  how: { weight: 0.15, intents: ['general_question', 'general_planning'] },
  why: { weight: 0.15, intents: ['general_question'] },
  when: { weight: 0.15, intents: ['general_question', 'query_tasks'] },
  where: { weight: 0.15, intents: ['general_question', 'search_vendors'] },
  who: { weight: 0.15, intents: ['general_question', 'query_tasks'] },
  help: { weight: 0.2, intents: ['general_question', 'general_planning'] },

  // Sync/conversation keywords
  conversation: { weight: 0.25, intents: ['sync_conversation_to_tasks', 'general_planning'] },
  discussed: { weight: 0.2, intents: ['sync_conversation_to_tasks', 'general_planning'] },
  mentioned: { weight: 0.2, intents: ['sync_conversation_to_tasks', 'general_planning'] },
  talked: { weight: 0.2, intents: ['sync_conversation_to_tasks', 'general_planning'] },
};

/**
 * KeywordHeuristics - Fast keyword-based intent scoring
 *
 * Provides lightweight intent detection without AI calls.
 * Useful for:
 * - Fallback when AI is unavailable
 * - Quick pre-filtering before AI analysis
 * - Confidence boosting for AI results
 *
 * Limitations:
 * - Cannot understand context or nuance
 * - No semantic understanding
 * - Scores capped at 0.85 to indicate heuristic nature
 */
export class KeywordHeuristics {
  /**
   * Analyze message and return scored intent candidates
   * @param message User message to analyze
   * @returns Array of intents sorted by score (highest first)
   */
  analyze(message: string): HeuristicScore[] {
    // Normalize and tokenize
    const words = message
      .toLowerCase()
      .replace(/[.,!?;:]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 0);

    // Track intent scores and matched keywords
    const intentScores = new Map<string, { score: number; keywords: string[] }>();

    // Score each word
    for (const word of words) {
      const weightData = KEYWORD_WEIGHTS[word];
      if (weightData) {
        for (const intent of weightData.intents) {
          const current = intentScores.get(intent) || { score: 0, keywords: [] };
          current.score += weightData.weight;
          current.keywords.push(word);
          intentScores.set(intent, current);
        }
      }
    }

    // Convert to array and apply caps
    return Array.from(intentScores.entries())
      .map(([intent, data]) => ({
        intent,
        score: Math.min(data.score, 0.85), // Cap at 0.85 to indicate heuristic limitation
        keywords: [...new Set(data.keywords)], // Remove duplicates
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending
  }

  /**
   * Get the top intent from keyword analysis
   * @param message User message to analyze
   * @returns Top scoring intent or null if no keywords matched
   */
  getTopIntent(message: string): HeuristicScore | null {
    const results = this.analyze(message);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Check if message contains any keywords for a specific intent
   * @param message User message to analyze
   * @param intent Intent to check for
   * @returns True if any keywords match this intent
   */
  hasKeywordsFor(message: string, intent: string): boolean {
    const results = this.analyze(message);
    return results.some(result => result.intent === intent);
  }

  /**
   * Get keyword coverage score (0-1)
   * Indicates how many words in the message matched keywords
   * @param message User message to analyze
   * @returns Ratio of matched words to total words
   */
  getCoverageScore(message: string): number {
    const words = message
      .toLowerCase()
      .replace(/[.,!?;:]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 0) return 0;

    const matchedWords = words.filter(word => KEYWORD_WEIGHTS[word]);
    return matchedWords.length / words.length;
  }
}
