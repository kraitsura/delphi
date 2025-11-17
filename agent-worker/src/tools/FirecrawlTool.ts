import { Tool, ToolResult } from './index';

export class FirecrawlTool implements Tool {
  name = 'web_search';
  description = 'Search and scrape web content (vendor websites, reviews, etc.)';

  private apiKey: string;
  private queue?: DurableObjectStub;

  constructor(apiKey: string, queue?: DurableObjectStub) {
    this.apiKey = apiKey;
    this.queue = queue;
  }

  async execute(params: {
    query?: string;
    url?: string;
    maxResults?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (params.url) {
        // Scrape specific URL
        return await this.executeWithQueue('scrape', params, () => this.scrapeUrl(params.url!));
      } else if (params.query) {
        // Search and scrape multiple results
        return await this.executeWithQueue('search', params, () => this.searchAndScrape(params.query!, params.maxResults || 5));
      } else {
        throw new Error('Either url or query must be provided');
      }
    } catch (error) {
      console.error('[FirecrawlTool Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          duration: Date.now() - startTime,
        }
      };
    }
  }

  private async executeWithQueue<T>(
    type: 'search' | 'scrape',
    params: any,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.queue) {
      // No queue configured, execute directly
      return await operation();
    }

    const requestId = crypto.randomUUID();

    // Enqueue request
    const enqueueResponse = await this.queue.fetch('https://queue/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestId,
        type,
        params,
        timestamp: Date.now(),
      }),
    });

    const queueStatus = await enqueueResponse.json<{
      status: string;
      position: number;
      activeRequests: number;
    }>();

    if (queueStatus.status === 'queued') {
      console.log(`[FirecrawlTool] Queued at position ${queueStatus.position}, waiting...`);
      // Wait a bit before checking status
      // In a production system, you'd want to poll or use WebSockets
      await new Promise(resolve => setTimeout(resolve, 2000 * queueStatus.position));
    }

    try {
      // Execute the operation
      const result = await operation();
      return result;
    } finally {
      // Mark as complete
      await this.queue.fetch('https://queue/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }),
      });
    }
  }

  private async scrapeUrl(url: string): Promise<ToolResult> {
    const startTime = Date.now();

    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      })
    });

    if (!response.ok) {
      const errorDetails = await this.getErrorDetails(response);
      throw new Error(`Firecrawl API error (${response.status}): ${errorDetails}`);
    }

    const data = await response.json() as any;

    return {
      success: true,
      data: {
        url,
        markdown: data.data?.markdown || data.markdown,
        html: data.data?.html || data.html,
        metadata: data.data?.metadata || data.metadata,
      },
      metadata: {
        duration: Date.now() - startTime,
        source: 'firecrawl',
      }
    };
  }

  private async searchAndScrape(query: string, maxResults: number): Promise<ToolResult> {
    const startTime = Date.now();

    // Use Firecrawl's v2 search endpoint
    const response = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
      })
    });

    if (!response.ok) {
      const errorDetails = await this.getErrorDetails(response);
      throw new Error(`Firecrawl search error (${response.status}): ${errorDetails}`);
    }

    const data = await response.json() as any;

    // v2 API returns data.web, data.images, data.news
    const results = data.data?.web || data.web || [];

    return {
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
      metadata: {
        duration: Date.now() - startTime,
        source: 'firecrawl',
      }
    };
  }

  private async getErrorDetails(response: Response): Promise<string> {
    try {
      const errorBody = await response.json();
      console.error('[FirecrawlTool] Error response:', errorBody);
      return JSON.stringify(errorBody);
    } catch (e) {
      // If JSON parsing fails, try to get text
      try {
        const text = await response.text();
        if (text) return text;
      } catch (textError) {
        // Fallback to status text
      }
      return response.statusText;
    }
  }
}
