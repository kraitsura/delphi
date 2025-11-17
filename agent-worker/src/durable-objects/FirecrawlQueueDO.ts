import { DurableObject } from 'cloudflare:workers';

interface QueuedRequest {
  id: string;
  type: 'search' | 'scrape';
  params: {
    query?: string;
    url?: string;
    maxResults?: number;
  };
  timestamp: number;
}

interface ActiveRequest {
  id: string;
  startTime: number;
}

/**
 * FirecrawlQueueDO manages a global queue for Firecrawl API requests
 * to respect the 2 concurrent request limit on the free plan.
 */
export class FirecrawlQueueDO extends DurableObject {
  private queue: QueuedRequest[] = [];
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private readonly MAX_CONCURRENT = 2;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/enqueue' && request.method === 'POST') {
        const body = await request.json<QueuedRequest>();
        return await this.enqueue(body);
      } else if (path === '/complete' && request.method === 'POST') {
        const { id } = await request.json<{ id: string }>();
        return await this.complete(id);
      } else if (path === '/status' && request.method === 'GET') {
        return this.getStatus();
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('[FirecrawlQueueDO] Error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async enqueue(req: QueuedRequest): Promise<Response> {
    console.log(`[FirecrawlQueueDO] Enqueuing request ${req.id} (${req.type})`);

    // Clean up any timed-out requests
    this.cleanupTimedOutRequests();

    // Check if we can execute immediately
    if (this.activeRequests.size < this.MAX_CONCURRENT) {
      // Start immediately
      this.activeRequests.set(req.id, {
        id: req.id,
        startTime: Date.now(),
      });

      console.log(`[FirecrawlQueueDO] Request ${req.id} starting immediately (${this.activeRequests.size}/${this.MAX_CONCURRENT} active)`);

      return new Response(
        JSON.stringify({
          status: 'ready',
          position: 0,
          activeRequests: this.activeRequests.size,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add to queue
    this.queue.push(req);
    console.log(`[FirecrawlQueueDO] Request ${req.id} queued (position ${this.queue.length}, ${this.activeRequests.size}/${this.MAX_CONCURRENT} active)`);

    return new Response(
      JSON.stringify({
        status: 'queued',
        position: this.queue.length,
        activeRequests: this.activeRequests.size,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async complete(id: string): Promise<Response> {
    console.log(`[FirecrawlQueueDO] Request ${id} completed`);

    this.activeRequests.delete(id);

    // Process next in queue if available
    const nextRequest = this.queue.shift();
    if (nextRequest) {
      this.activeRequests.set(nextRequest.id, {
        id: nextRequest.id,
        startTime: Date.now(),
      });

      console.log(`[FirecrawlQueueDO] Request ${nextRequest.id} promoted from queue (${this.activeRequests.size}/${this.MAX_CONCURRENT} active)`);

      // Return the next request to process
      return new Response(
        JSON.stringify({
          status: 'ok',
          nextRequest,
          activeRequests: this.activeRequests.size,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        activeRequests: this.activeRequests.size,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private getStatus(): Response {
    return new Response(
      JSON.stringify({
        activeRequests: this.activeRequests.size,
        queuedRequests: this.queue.length,
        maxConcurrent: this.MAX_CONCURRENT,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private cleanupTimedOutRequests(): void {
    const now = Date.now();
    const timedOut: string[] = [];

    for (const [id, req] of this.activeRequests.entries()) {
      if (now - req.startTime > this.REQUEST_TIMEOUT) {
        timedOut.push(id);
      }
    }

    for (const id of timedOut) {
      console.warn(`[FirecrawlQueueDO] Request ${id} timed out, removing from active`);
      this.activeRequests.delete(id);
    }

    // If we cleaned up any requests, try to process queued ones
    while (this.activeRequests.size < this.MAX_CONCURRENT && this.queue.length > 0) {
      const nextRequest = this.queue.shift()!;
      this.activeRequests.set(nextRequest.id, {
        id: nextRequest.id,
        startTime: Date.now(),
      });
      console.log(`[FirecrawlQueueDO] Request ${nextRequest.id} promoted from queue after cleanup`);
    }
  }
}
