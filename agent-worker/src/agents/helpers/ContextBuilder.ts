import { BaseAgent, AgentContext } from '../BaseAgent';
import { CommitmentExtractor, Message, Commitment } from './CommitmentExtractor';
import { RoomContext } from './IntentDetector';

/**
 * Context building options
 */
export interface ContextBuildOptions {
  includeCommitments?: boolean; // Default: true
  messageLimit?: number; // Default: 10
  cacheCommitments?: boolean; // Default: true
}

/**
 * ContextBuilder - Builds enriched room context for intent detection
 *
 * Orchestrates:
 * - Event state retrieval
 * - Message history
 * - Commitment extraction
 */
export class ContextBuilder {
  private commitmentCache: Map<string, Commitment[]> = new Map();

  constructor(
    private agent: BaseAgent,
    private context: AgentContext
  ) {}

  /**
   * Build comprehensive room context for intent detection
   * @param roomType Type of room (main, vendor, brainstorm, private)
   * @param recentMessages Recent conversation messages
   * @param eventState Current event state (taskCount, hasBudget, vendorCount)
   * @param options Context building options
   * @returns Room context with commitments
   */
  async buildRoomContext(
    roomType: 'main' | 'vendor' | 'brainstorm' | 'private',
    recentMessages: Message[],
    eventState: {
      taskCount: number;
      hasBudget: boolean;
      vendorCount: number;
    },
    options: ContextBuildOptions = {}
  ): Promise<RoomContext> {
    const {
      includeCommitments = true,
      messageLimit = 10,
      cacheCommitments = true
    } = options;

    // Limit messages
    const limitedMessages = recentMessages.slice(-messageLimit);

    // Extract commitments if enabled
    let extractedCommitments: Commitment[] = [];

    if (includeCommitments) {
      extractedCommitments = await this.getCommitments(
        limitedMessages,
        cacheCommitments
      );
    }

    console.log(`[ContextBuilder] Built room context: ${roomType}, ${eventState.taskCount} tasks, ${extractedCommitments.length} commitments`);

    return {
      roomType,
      taskCount: eventState.taskCount,
      hasBudget: eventState.hasBudget,
      vendorCount: eventState.vendorCount,
      recentMessages: limitedMessages,
      extractedCommitments
    };
  }

  /**
   * Get commitments from messages (with optional caching)
   */
  private async getCommitments(
    messages: Message[],
    useCache: boolean
  ): Promise<Commitment[]> {
    // Generate cache key based on message IDs
    const cacheKey = messages.map(m => m._id).join('-');

    // Check cache
    if (useCache && this.commitmentCache.has(cacheKey)) {
      console.log('[ContextBuilder] Using cached commitments');
      return this.commitmentCache.get(cacheKey)!;
    }

    // Extract fresh
    const extractor = new CommitmentExtractor(this.agent, this.context);
    const result = await extractor.extractCommitments(messages);

    if (result.success) {
      // Cache the result
      if (useCache) {
        this.commitmentCache.set(cacheKey, result.commitments);

        // Cleanup old cache entries (keep last 20)
        if (this.commitmentCache.size > 20) {
          const firstKey = this.commitmentCache.keys().next().value;
          if (firstKey !== undefined) {
            this.commitmentCache.delete(firstKey);
          }
        }
      }

      return result.commitments;
    }

    console.warn('[ContextBuilder] Commitment extraction failed, returning empty array');
    return [];
  }

  /**
   * Clear commitment cache (e.g., on checkpoint rollover)
   */
  clearCache(): void {
    this.commitmentCache.clear();
    console.log('[ContextBuilder] Commitment cache cleared');
  }

  /**
   * Get cache stats (for debugging/monitoring)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.commitmentCache.size,
      keys: Array.from(this.commitmentCache.keys())
    };
  }
}
