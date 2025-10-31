# Firecrawl: Web Data API Guide

## Overview

Firecrawl is an AI-powered web crawler and scraping service developed by Mendable.ai that transforms websites into clean, LLM-ready data formats. It handles the complexity of modern web scraping including JavaScript rendering, anti-bot bypass, and intelligent content extraction.

**Core Value:** Turn entire websites into structured data (Markdown, JSON) optimized for AI applications, RAG systems, and automated workflows.

## What Firecrawl Solves

Traditional web scraping challenges:
- JavaScript-heavy websites don't render
- Anti-bot systems block scrapers
- HTML is messy and hard to parse
- Content extraction is unreliable
- Dynamic content loading issues
- Proxy rotation complexity

Firecrawl handles all of this automatically.

## Core Features

### 1. LLM-Ready Output Formats

Firecrawl converts web content into clean formats:

- **Markdown**: Clean, structured text perfect for LLMs
- **Structured JSON**: Extracted data with AI-powered schema mapping
- **HTML**: Raw HTML when needed
- **Screenshots**: Visual captures of pages
- **Metadata**: Links, images, titles, descriptions

### 2. JavaScript Rendering

Executes JavaScript to capture dynamically loaded content:
- Single-page applications (SPAs)
- Lazy-loaded content
- Infinite scroll pages
- Client-rendered data

### 3. Anti-Bot Bypass

Sophisticated evasion techniques:
- Rotating proxies
- Browser fingerprinting
- Realistic user behavior simulation
- Automatic CAPTCHA handling (in some plans)

### 4. Intelligent Content Extraction

Automatically identifies and extracts main content while filtering out:
- Navigation menus
- Advertisements
- Footers and sidebars
- Cookie banners
- Boilerplate content

## API Endpoints

Firecrawl provides five primary endpoints for different use cases:

### 1. Scrape - Single Page Extraction

Scrape a single URL and get its content in LLM-ready format.

**Use when:** You need data from a specific page

**Endpoint:** `POST /scrape`

**Request:**
```json
{
  "url": "https://example.com/article",
  "formats": ["markdown", "html", "screenshot"],
  "onlyMainContent": true,
  "waitFor": 3000,
  "actions": [
    {
      "type": "click",
      "selector": "#load-more-button"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Article Title\n\nContent here...",
    "html": "<html>...</html>",
    "screenshot": "base64-encoded-image",
    "metadata": {
      "title": "Article Title",
      "description": "Article description",
      "language": "en",
      "sourceURL": "https://example.com/article",
      "statusCode": 200
    },
    "links": ["https://example.com/link1", "..."]
  }
}
```

**Parameters:**
- `url` (required): The URL to scrape
- `formats`: Array of desired formats (markdown, html, screenshot, links)
- `onlyMainContent`: Extract only main content (default: true)
- `waitFor`: Milliseconds to wait for JavaScript rendering
- `actions`: Browser interactions to perform (click, type, wait)
- `headers`: Custom HTTP headers
- `includeHtml`: Include raw HTML in response
- `includeTags`: Include specific HTML tags
- `excludeTags`: Exclude specific HTML tags

### 2. Crawl - Full Website Extraction

Scrape all URLs from a website and return content in LLM-ready format.

**Use when:** You need to extract an entire website

**Endpoint:** `POST /crawl`

**Request:**
```json
{
  "url": "https://docs.example.com",
  "limit": 100,
  "scrapeOptions": {
    "formats": ["markdown"]
  },
  "crawlOptions": {
    "maxDepth": 3,
    "allowedDomains": ["docs.example.com"],
    "excludePaths": ["/api/*", "/admin/*"],
    "includePaths": ["/guides/*", "/tutorials/*"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "id": "crawl_123abc",
  "status": "completed",
  "total": 47,
  "completed": 47,
  "data": [
    {
      "url": "https://docs.example.com/guide",
      "markdown": "# Guide\n\nContent...",
      "metadata": { /* ... */ }
    }
    // ... more pages
  ]
}
```

**Parameters:**
- `url` (required): Starting URL
- `limit`: Maximum number of pages to crawl
- `maxDepth`: How deep to crawl (link depth)
- `allowedDomains`: Only crawl these domains
- `includePaths`: Only crawl URLs matching these patterns
- `excludePaths`: Skip URLs matching these patterns
- `scrapeOptions`: Options for each page scrape

**Async Pattern:**
```javascript
// Start crawl
const { id } = await firecrawl.crawl({ url: 'https://example.com' })

// Check status
const status = await firecrawl.getCrawlStatus(id)

// Get results when done
if (status.status === 'completed') {
  const results = status.data
}
```

### 3. Map - Fast URL Discovery

Get all URLs from a website extremely fast without scraping content.

**Use when:** You need a sitemap or list of URLs to scrape later

**Endpoint:** `POST /map`

**Request:**
```json
{
  "url": "https://example.com",
  "search": "documentation"
}
```

**Response:**
```json
{
  "success": true,
  "links": [
    "https://example.com/",
    "https://example.com/about",
    "https://example.com/docs",
    "https://example.com/docs/getting-started",
    // ... all discovered URLs
  ]
}
```

**Use cases:**
- Generate sitemaps
- Discover pages before crawling
- Find specific page patterns
- Analyze site structure

### 4. Extract - AI-Powered Structured Data

Get structured data from pages using AI to extract specific fields.

**Use when:** You need specific data points extracted with AI

**Endpoint:** `POST /extract`

**Request:**
```json
{
  "urls": ["https://example.com/product/123"],
  "schema": {
    "type": "object",
    "properties": {
      "productName": { "type": "string" },
      "price": { "type": "number" },
      "inStock": { "type": "boolean" },
      "features": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["productName", "price"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productName": "Awesome Widget",
    "price": 29.99,
    "inStock": true,
    "features": [
      "Durable construction",
      "Easy to use",
      "2-year warranty"
    ]
  }
}
```

**Benefits:**
- AI understands content semantically
- Works even when HTML structure changes
- Handles variations in page layouts
- Extracts meaningful data, not just HTML selectors

### 5. Search - Web Search + Scrape

Perform web searches and scrape the results in one operation.

**Use when:** You need to find and scrape pages on a topic

**Endpoint:** `POST /search`

**Request:**
```json
{
  "query": "best project management tools 2025",
  "limit": 10,
  "scrapeOptions": {
    "formats": ["markdown"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "url": "https://example.com/article",
      "title": "Best Project Management Tools",
      "markdown": "# Content...",
      "metadata": { /* ... */ }
    }
    // ... more results
  ]
}
```

## Use Cases & Patterns

### 1. Research Automation

Automate website scraping on specific topics.

```typescript
// Research pattern
const researchTopic = async (topic: string) => {
  // Search for relevant pages
  const searchResults = await firecrawl.search({
    query: topic,
    limit: 20,
    scrapeOptions: { formats: ['markdown'] }
  })

  // Extract structured insights
  const insights = await Promise.all(
    searchResults.data.map(result =>
      firecrawl.extract({
        urls: [result.url],
        schema: {
          type: 'object',
          properties: {
            keyPoints: { type: 'array', items: { type: 'string' } },
            date: { type: 'string' },
            author: { type: 'string' }
          }
        }
      })
    )
  )

  return insights
}
```

### 2. Content Aggregation

Collect and organize content from multiple sources.

```typescript
// Content aggregation pattern
const aggregateNews = async (sources: string[]) => {
  const allContent = await Promise.all(
    sources.map(url =>
      firecrawl.crawl({
        url,
        limit: 50,
        crawlOptions: {
          maxDepth: 2,
          includePaths: ['/news/*', '/articles/*']
        },
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true
        }
      })
    )
  )

  // Combine and process
  return allContent.flatMap(result => result.data)
}
```

### 3. AI Training & RAG Systems

Extract documentation to train or inform AI agents.

```typescript
// RAG ingestion pattern
const ingestDocumentation = async (docsUrl: string) => {
  // Get all documentation URLs
  const { links } = await firecrawl.map({ url: docsUrl })

  // Scrape all pages in parallel (with rate limiting)
  const chunks = chunkArray(links, 10)
  const allDocs = []

  for (const chunk of chunks) {
    const docs = await Promise.all(
      chunk.map(url =>
        firecrawl.scrape({
          url,
          formats: ['markdown'],
          onlyMainContent: true
        })
      )
    )
    allDocs.push(...docs)
  }

  // Convert to vector embeddings and store
  for (const doc of allDocs) {
    const embedding = await generateEmbedding(doc.markdown)
    await vectorDB.insert({
      content: doc.markdown,
      embedding,
      metadata: doc.metadata
    })
  }
}
```

### 4. E-commerce & Price Monitoring

Track product prices and availability.

```typescript
// Price monitoring pattern
const monitorPrices = async (productUrls: string[]) => {
  const products = await Promise.all(
    productUrls.map(url =>
      firecrawl.extract({
        urls: [url],
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            inStock: { type: 'boolean' },
            rating: { type: 'number' }
          }
        }
      })
    )
  )

  // Check for price changes
  for (const product of products) {
    const previous = await db.getLastPrice(product.name)
    if (previous && product.price < previous.price) {
      await notify.priceDropAlert(product)
    }
    await db.savePrice(product)
  }
}
```

### 5. Competitive Analysis

Monitor competitor websites for changes.

```typescript
// Competitor monitoring pattern
const monitorCompetitors = async (competitors: string[]) => {
  for (const competitorUrl of competitors) {
    const data = await firecrawl.crawl({
      url: competitorUrl,
      crawlOptions: {
        includePaths: ['/products/*', '/pricing', '/features']
      },
      scrapeOptions: {
        formats: ['markdown', 'screenshot']
      }
    })

    // Detect changes
    const previous = await db.getLastSnapshot(competitorUrl)
    const changes = detectChanges(previous, data)

    if (changes.length > 0) {
      await notify.competitorUpdate(competitorUrl, changes)
    }

    await db.saveSnapshot(competitorUrl, data)
  }
}
```

### 6. Sentiment Analysis

Collect and analyze customer reviews.

```typescript
// Review analysis pattern
const analyzeSentiment = async (productName: string) => {
  // Search for reviews
  const reviews = await firecrawl.search({
    query: `${productName} reviews`,
    limit: 50,
    scrapeOptions: { formats: ['markdown'] }
  })

  // Extract review data
  const structuredReviews = await Promise.all(
    reviews.data.map(result =>
      firecrawl.extract({
        urls: [result.url],
        schema: {
          type: 'object',
          properties: {
            rating: { type: 'number' },
            reviewText: { type: 'string' },
            pros: { type: 'array', items: { type: 'string' } },
            cons: { type: 'array', items: { type: 'string' } }
          }
        }
      })
    )
  )

  // Analyze sentiment with AI
  const sentiment = await analyzeSentimentWithAI(structuredReviews)
  return sentiment
}
```

## SDK Usage

Firecrawl provides official SDKs for multiple languages.

### Node.js / TypeScript

```bash
npm install @mendable/firecrawl-js
```

```typescript
import FirecrawlApp from '@mendable/firecrawl-js'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

// Scrape
const result = await firecrawl.scrapeUrl('https://example.com', {
  formats: ['markdown', 'html']
})

// Crawl
const crawlResult = await firecrawl.crawlUrl('https://example.com', {
  limit: 100,
  scrapeOptions: { formats: ['markdown'] }
})

// Extract
const extracted = await firecrawl.extract({
  urls: ['https://example.com'],
  schema: { /* your schema */ }
})
```

### Python

```bash
pip install firecrawl-py
```

```python
from firecrawl import FirecrawlApp

firecrawl = FirecrawlApp(api_key=os.environ['FIRECRAWL_API_KEY'])

# Scrape
result = firecrawl.scrape_url('https://example.com', {
    'formats': ['markdown', 'html']
})

# Crawl
crawl_result = firecrawl.crawl_url('https://example.com', {
    'limit': 100,
    'scrapeOptions': {'formats': ['markdown']}
})
```

### Other Languages

Firecrawl also provides SDKs for:
- **Rust**: Native performance
- **Go**: Concurrent scraping

Check the official documentation for language-specific examples.

## Authentication

All Firecrawl API requests require authentication via API key.

**Get API Key:**
1. Sign up at [firecrawl.dev](https://firecrawl.dev)
2. Navigate to API settings
3. Generate API key

**Authentication Header:**
```
Authorization: Bearer YOUR_API_KEY
```

**SDK Authentication:**
```typescript
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
})
```

## Best Practices

### 1. Rate Limiting

Be mindful of API rate limits:

```typescript
// Batch requests with delays
async function batchScrape(urls: string[], batchSize = 5, delay = 1000) {
  const results = []
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(url => firecrawl.scrapeUrl(url))
    )
    results.push(...batchResults)
    if (i + batchSize < urls.length) {
      await sleep(delay)
    }
  }
  return results
}
```

### 2. Error Handling

Always handle failures gracefully:

```typescript
async function safeScrape(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await firecrawl.scrapeUrl(url)
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(1000 * (i + 1)) // Exponential backoff
    }
  }
}
```

### 3. Content Filtering

Use `onlyMainContent` to get clean data:

```typescript
const cleanContent = await firecrawl.scrapeUrl(url, {
  formats: ['markdown'],
  onlyMainContent: true, // Remove navigation, ads, etc.
  excludeTags: ['script', 'style', 'nav', 'footer']
})
```

### 4. Cost Optimization

Minimize unnecessary scrapes:

```typescript
// Use map first to discover URLs
const { links } = await firecrawl.map({ url: baseUrl })

// Filter URLs before scraping
const relevantUrls = links.filter(url =>
  url.includes('/docs/') && !url.includes('/api/')
)

// Only scrape what you need
const docs = await Promise.all(
  relevantUrls.map(url => firecrawl.scrapeUrl(url))
)
```

### 5. Caching

Cache results to avoid duplicate scrapes:

```typescript
const cache = new Map()

async function cachedScrape(url: string) {
  if (cache.has(url)) {
    return cache.get(url)
  }

  const result = await firecrawl.scrapeUrl(url)
  cache.set(url, result)
  return result
}
```

## Integration with TanStack Start & Convex

Use Firecrawl in server functions for web scraping:

```typescript
// Server function in TanStack Start
import { createServerFn } from '@tanstack/start'
import FirecrawlApp from '@mendable/firecrawl-js'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

export const scrapeUrl = createServerFn('POST', async (url: string) => {
  const result = await firecrawl.scrapeUrl(url, {
    formats: ['markdown']
  })
  return result
})

// Store in Convex
import { mutation } from './_generated/server'

export const saveScrapedContent = mutation({
  args: { url: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('scraped_pages', {
      url: args.url,
      content: args.content,
      scrapedAt: Date.now()
    })
  }
})
```

## Pricing & Plans

Firecrawl offers different pricing tiers:

- **Free Tier**: Limited requests for testing
- **Pro Plans**: Higher rate limits and advanced features
- **Enterprise**: Custom limits, SLAs, and support

Check [firecrawl.dev/pricing](https://firecrawl.dev/pricing) for current pricing.

## Resources

- **Official Docs**: [docs.firecrawl.dev](https://docs.firecrawl.dev)
- **GitHub**: [github.com/firecrawl/firecrawl](https://github.com/firecrawl/firecrawl)
- **API Reference**: [docs.firecrawl.dev/api-reference](https://docs.firecrawl.dev/api-reference)
- **Playground**: Test endpoints at [firecrawl.dev/playground](https://firecrawl.dev/playground)

## When to Use Firecrawl

Choose Firecrawl when you need:

- LLM-ready web content
- JavaScript-heavy site scraping
- Anti-bot bypass capabilities
- AI-powered data extraction
- Content for RAG systems
- Clean markdown from HTML
- Reliable web scraping at scale

Consider alternatives if:

- You need simple static HTML scraping (use Cheerio)
- You have custom scraping infrastructure
- You need browser automation (use Playwright/Puppeteer directly)
- Budget is very limited (self-hosted solutions)

## Summary

Firecrawl simplifies web scraping by handling the complex parts:
- JavaScript rendering
- Anti-bot systems
- Content extraction
- Format conversion
- Rate limiting
- Proxy management

It's the ideal choice for AI applications, RAG systems, and any project that needs clean, structured web data.
