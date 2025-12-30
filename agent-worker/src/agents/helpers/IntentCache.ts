import type { Intent } from './types';

interface CacheEntry {
  intent: Intent;
  timestamp: number;
  hitCount: number;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function generateCacheKey(message: string, context: { roomType: string; taskCount: number; expenseCount?: number }): string {
  const normalized = message
    .toLowerCase()
    .replace(/@delphi\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const contextHash = hashString(JSON.stringify({
    roomType: context.roomType,
    hasOpenTasks: context.taskCount > 0,
  }));

  return `intent:${hashString(normalized)}:${contextHash}`;
}

export class IntentCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): Intent | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.intent;
  }

  set(key: string, intent: Intent): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      intent,
      timestamp: Date.now(),
      hitCount: 1,
    });
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache) {
      const age = Date.now() - entry.timestamp;
      const score = entry.hitCount / (age / 1000);
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
