import { FastIntentRouter } from './FastIntentRouter';
import { KeywordHeuristics } from './KeywordHeuristics';
import { IntentCache, generateCacheKey } from './IntentCache';
import { IntentDetector, RoomContext, Intent } from './IntentDetector';
import type { AgentContext } from '../BaseAgent';

interface IntentMetrics {
  tier: 'fast' | 'heuristic' | 'cache' | 'ai';
  latencyMs: number;
  confidence: number;
  intent: string;
  timestamp: number;
}

export class TieredIntentDetector {
  private fastRouter: FastIntentRouter;
  private heuristics: KeywordHeuristics;
  private cache: IntentCache;
  private aiDetector: IntentDetector;
  private metrics: IntentMetrics[] = [];

  constructor(env: any, context: AgentContext) {
    this.fastRouter = new FastIntentRouter();
    this.heuristics = new KeywordHeuristics();
    this.cache = new IntentCache();
    this.aiDetector = new IntentDetector(env, context);
  }

  async detect(
    message: string,
    context: RoomContext
  ): Promise<{ intent: Intent; tier: 'fast' | 'heuristic' | 'cache' | 'ai' }> {
    const start = performance.now();

    // Tier 1: Regex fast-path (0ms)
    const fastMatch = this.fastRouter.match(message);
    if (fastMatch && fastMatch.confidence >= 0.85) {
      const intent = this.toIntent(fastMatch);
      this.recordMetrics('fast', start, intent);
      return { intent, tier: 'fast' };
    }

    // Tier 2: Keyword heuristics (1ms)
    const heuristicScores = this.heuristics.analyze(message);
    if (heuristicScores[0]?.score >= 0.7) {
      const intent = this.heuristicToIntent(heuristicScores[0]);
      this.recordMetrics('heuristic', start, intent);
      return { intent, tier: 'heuristic' };
    }

    // Tier 3: Cache lookup (0ms)
    const cacheKey = generateCacheKey(message, {
      roomType: context.roomType,
      taskCount: context.taskCount,
    });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.recordMetrics('cache', start, cached);
      return { intent: cached, tier: 'cache' };
    }

    // Tier 4: AI detection (300ms)
    const aiIntent = await this.aiDetector.detectIntent(message, context);

    // Cache the result
    this.cache.set(cacheKey, aiIntent);
    this.recordMetrics('ai', start, aiIntent);

    return { intent: aiIntent, tier: 'ai' };
  }

  private toIntent(match: { intent: string; confidence: number; extractedParams: Record<string, string> }): Intent {
    const [domain, action] = this.parseIntentDomainAction(match.intent);
    return {
      primaryIntent: match.intent,
      confidence: match.confidence,
      reasoning: 'Fast-path regex match',
      domain,
      action,
      preconditionsMet: true,
      missingInformation: [],
      entities: Object.entries(match.extractedParams).map(([type, value]) => ({ type, value })),
    };
  }

  private heuristicToIntent(score: { intent: string; score: number; keywords: string[] }): Intent {
    const [domain, action] = this.parseIntentDomainAction(score.intent);
    return {
      primaryIntent: score.intent,
      confidence: score.score,
      reasoning: `Keyword heuristic match: ${score.keywords.join(', ')}`,
      domain,
      action,
      preconditionsMet: true,
      missingInformation: [],
    };
  }

  private parseIntentDomainAction(intent: string): ['tasks' | 'budget' | 'vendors' | 'planning' | 'general', 'create' | 'read' | 'update' | 'delete' | 'plan' | 'sync'] {
    // Normalize intent string
    const lower = intent.toLowerCase();

    // Tasks domain
    if (lower.includes('task')) {
      if (lower.includes('create') || lower.includes('add') || lower.includes('new')) return ['tasks', 'create'];
      if (lower.includes('query') || lower.includes('show') || lower.includes('list') || lower.includes('view')) return ['tasks', 'read'];
      if (lower.includes('update') || lower.includes('modify') || lower.includes('edit') || lower.includes('change')) return ['tasks', 'update'];
      if (lower.includes('delete') || lower.includes('remove')) return ['tasks', 'delete'];
      if (lower.includes('sync')) return ['tasks', 'sync'];
      return ['tasks', 'read']; // Default for task-related
    }

    // Budget domain
    if (lower.includes('budget') || lower.includes('expense')) {
      if (lower.includes('create') || lower.includes('add') || lower.includes('set')) return ['budget', 'create'];
      if (lower.includes('query') || lower.includes('show') || lower.includes('list') || lower.includes('view')) return ['budget', 'read'];
      if (lower.includes('update') || lower.includes('modify') || lower.includes('change')) return ['budget', 'update'];
      return ['budget', 'read']; // Default for budget-related
    }

    // Vendors domain
    if (lower.includes('vendor')) {
      if (lower.includes('search') || lower.includes('find')) return ['vendors', 'read'];
      if (lower.includes('save') || lower.includes('add')) return ['vendors', 'create'];
      if (lower.includes('query') || lower.includes('show') || lower.includes('list')) return ['vendors', 'read'];
      return ['vendors', 'read']; // Default for vendor-related
    }

    // Planning domain
    if (lower.includes('plan') || lower.includes('poll')) {
      return ['planning', 'plan'];
    }

    // General domain (fallback)
    return ['general', 'plan'];
  }

  private recordMetrics(tier: IntentMetrics['tier'], startTime: number, intent: Intent): void {
    this.metrics.push({
      tier,
      latencyMs: performance.now() - startTime,
      confidence: intent.confidence,
      intent: intent.primaryIntent,
      timestamp: Date.now(),
    });

    // Keep last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  getMetrics(): IntentMetrics[] {
    return [...this.metrics];
  }

  getStats(): { total: number; byTier: Record<string, number>; avgLatency: Record<string, number> } {
    const byTier: Record<string, number> = { fast: 0, heuristic: 0, cache: 0, ai: 0 };
    const latencySum: Record<string, number> = { fast: 0, heuristic: 0, cache: 0, ai: 0 };

    for (const m of this.metrics) {
      byTier[m.tier]++;
      latencySum[m.tier] += m.latencyMs;
    }

    const avgLatency: Record<string, number> = {};
    for (const tier of Object.keys(byTier)) {
      avgLatency[tier] = byTier[tier] > 0 ? latencySum[tier] / byTier[tier] : 0;
    }

    return { total: this.metrics.length, byTier, avgLatency };
  }
}
