# Cloudflare Durable Objects: Complete Guide

## Overview

Cloudflare Durable Objects provide **stateful serverless computing** at the edge. Each Durable Object is a special kind of Cloudflare Worker that combines compute with strongly consistent storage, enabling you to build real-time, collaborative, and stateful applications without managing infrastructure.

**Key Innovation:** Globally unique instances with their own fast, strongly consistent SQL storage that automatically scale to millions of instances.

## What are Durable Objects?

Durable Objects are:
- **Stateful**: Each object maintains persistent state across requests
- **Strongly Consistent**: Single-threaded execution eliminates race conditions
- **Globally Distributed**: Run on Cloudflare's global network
- **Auto-scaling**: Spin up millions of instances on-demand
- **Cost-effective**: Hibernate between requests to reduce costs

### Core Characteristics

1. **Unique Instances**: Each Durable Object has a unique ID and handles requests serially
2. **Persistent Storage**: Up to 10 GB of durable storage per object (SQLite-backed)
3. **In-Memory State**: Keep hot data in memory for ultra-fast access
4. **WebSocket Support**: Long-lived connections with hibernation API
5. **Transactional Storage**: ACID-compliant storage operations

## Architecture & Concepts

### Single-Threaded Execution

Each Durable Object instance processes requests one at a time, guaranteeing:
- No race conditions
- Strong consistency
- Predictable state management
- Serializable operations

### Control & Data Plane Pattern

```
┌─────────────────────────────────────────┐
│         Control Plane (Worker)          │
│  - Routes requests to correct objects   │
│  - Handles authentication               │
│  - Manages object lifecycle             │
└─────────┬───────────────────────────────┘
          │
          ├──────────────┬──────────────┬─────────────┐
          ▼              ▼              ▼             ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ DO #1    │   │ DO #2    │   │ DO #3    │   │ DO #N    │
    │ User A   │   │ User B   │   │ Room 1   │   │ Room N   │
    │ Storage  │   │ Storage  │   │ Storage  │   │ Storage  │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘
         Data Plane - Each DO handles its own data
```

**Benefits:**
- Performance isn't limited by a single instance
- Shared across thousands or millions of Durable Objects
- Each DO manages its own resource data directly

## Setup & Installation

### Prerequisites

- Node.js 16.13.0 or later
- npm or yarn
- Cloudflare account
- Wrangler CLI

### Step 1: Install Wrangler

```bash
npm install -g wrangler
# or
npm install --save-dev wrangler
```

### Step 2: Authenticate

```bash
wrangler login
```

This opens your browser to authenticate with Cloudflare.

### Step 3: Create a New Project

```bash
# Create from template
npm create cloudflare@latest my-durable-object-app

# Choose options:
# - Framework: "Worker + Durable Objects"
# - Language: TypeScript (recommended)
```

This creates:
```
my-durable-object-app/
├── src/
│   └── index.ts           # Worker + Durable Object code
├── wrangler.jsonc         # Configuration
├── package.json
└── tsconfig.json
```

### Step 4: Configure wrangler.jsonc

```jsonc
{
  "name": "my-durable-object-app",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",

  // Define Durable Objects
  "durable_objects": {
    "bindings": [
      {
        "name": "CHAT_ROOM",              // Binding name
        "class_name": "ChatRoom",         // Class name
        "script_name": "my-durable-object-app"
      }
    ]
  },

  // Migrations (for schema changes)
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["ChatRoom"],
      "new_sqlite_classes": ["ChatRoom"]  // Use SQLite backend
    }
  ]
}
```

### Step 5: Implement Durable Object

```typescript
// src/index.ts
export interface Env {
  CHAT_ROOM: DurableObjectNamespace
}

// Durable Object class
export class ChatRoom {
  private state: DurableObjectState
  private storage: DurableObjectStorage
  private sessions: Set<WebSocket>

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage
    this.sessions = new Set()
  }

  async fetch(request: Request): Promise<Response> {
    // Handle HTTP requests to this Durable Object
    const url = new URL(request.url)

    if (url.pathname === '/websocket') {
      // Upgrade to WebSocket
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      this.state.acceptWebSocket(server)
      this.sessions.add(server)

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    return new Response('Not found', { status: 404 })
  }

  // WebSocket message handler
  async webSocketMessage(ws: WebSocket, message: string) {
    // Broadcast to all connected clients
    for (const session of this.sessions) {
      try {
        session.send(message)
      } catch (err) {
        // Client disconnected
        this.sessions.delete(session)
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws)
  }
}

// Worker (entry point)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Extract room ID from URL
    const url = new URL(request.url)
    const roomId = url.pathname.slice(1) || 'default'

    // Get Durable Object instance
    const id = env.CHAT_ROOM.idFromName(roomId)
    const stub = env.CHAT_ROOM.get(id)

    // Forward request to Durable Object
    return stub.fetch(request)
  },
}
```

### Step 6: Develop Locally

```bash
npm run dev
# or
wrangler dev
```

This starts a local development server.

### Step 7: Deploy

```bash
npm run deploy
# or
wrangler deploy
```

## Storage API

### SQLite Backend (Recommended)

All new Durable Objects should use the SQLite backend for better performance and features.

```typescript
export class MyDurableObject {
  private sql: SqlStorage

  constructor(state: DurableObjectState, env: Env) {
    this.sql = state.storage.sql
  }

  async addUser(name: string, email: string) {
    // Execute SQL directly
    await this.sql.exec(`
      INSERT INTO users (name, email, created_at)
      VALUES (?, ?, ?)
    `, name, email, Date.now())
  }

  async getUsers() {
    // Query with results
    const result = await this.sql.exec(`
      SELECT * FROM users ORDER BY created_at DESC
    `)
    return result.toArray()
  }

  async updateUser(id: number, name: string) {
    await this.sql.exec(`
      UPDATE users SET name = ? WHERE id = ?
    `, name, id)
  }
}
```

### Key-Value Storage API

For simpler use cases, use the key-value API:

```typescript
export class Counter {
  private storage: DurableObjectStorage

  constructor(state: DurableObjectState) {
    this.storage = state.storage
  }

  async increment() {
    // Read
    const count = (await this.storage.get<number>('count')) || 0

    // Write
    await this.storage.put('count', count + 1)

    return count + 1
  }

  async get() {
    return (await this.storage.get<number>('count')) || 0
  }

  // Transactional operations
  async transaction() {
    await this.storage.transaction(async (txn) => {
      const value1 = await txn.get('key1')
      const value2 = await txn.get('key2')

      await txn.put('key1', value2)
      await txn.put('key2', value1)
      // All operations succeed or fail together
    })
  }

  // Batch operations
  async batchOperations() {
    const values = await this.storage.get(['key1', 'key2', 'key3'])

    await this.storage.put({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    })
  }
}
```

## WebSocket Hibernation API

The WebSocket Hibernation API reduces duration charges by allowing Durable Objects to hibernate during inactivity.

### Why Use Hibernation?

- **Cost Savings**: No billable duration during inactivity
- **Better Performance**: Wake only when messages arrive
- **Persistent Connections**: Maintain WebSocket connections across hibernations

### Implementation

```typescript
export class ChatRoom {
  private state: DurableObjectState

  constructor(state: DurableObjectState, env: Env) {
    this.state = state

    // Set up hibernation tags for connection metadata
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        JSON.stringify({ type: 'ping' }),
        JSON.stringify({ type: 'pong' })
      )
    )
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      // Accept WebSocket with hibernation
      this.state.acceptWebSocket(server, ['user-123', 'room-abc'])

      // Attach metadata that persists across hibernations
      server.serializeAttachment({
        userId: 'user-123',
        joinedAt: Date.now(),
        username: 'Alice',
      })

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    return new Response('Expected WebSocket', { status: 400 })
  }

  // Wakes from hibernation when message received
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Retrieve persisted metadata
    const metadata = ws.deserializeAttachment()

    const data = JSON.parse(message.toString())

    // Broadcast to all connections with specific tag
    const connections = this.state.getWebSockets('room-abc')
    for (const conn of connections) {
      conn.send(JSON.stringify({
        from: metadata.username,
        message: data.message,
        timestamp: Date.now(),
      }))
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Clean up when connection closes
    ws.close(code, reason)
  }

  async webSocketError(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error)
    ws.close(1011, 'Internal error')
  }
}
```

### Key Methods

```typescript
// Accept WebSocket with tags
this.state.acceptWebSocket(ws, ['tag1', 'tag2'])

// Get all WebSockets with specific tag
const connections = this.state.getWebSockets('tag1')

// Attach metadata that persists
ws.serializeAttachment({ userId: 'user-123' })

// Retrieve metadata
const metadata = ws.deserializeAttachment()

// Get tags
const tags = ws.getTags()
```

## Common Patterns

### Pattern 1: One Database Per User

Create isolated storage for each user:

```typescript
export class UserDatabase {
  private sql: SqlStorage

  constructor(state: DurableObjectState, env: Env) {
    this.sql = state.storage.sql

    // Run migrations on initialization
    this.initializeSchema()
  }

  async initializeSchema() {
    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  async createNote(title: string, content: string) {
    const now = Date.now()
    return await this.sql.exec(`
      INSERT INTO notes (title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `, title, content, now, now)
  }

  async getNotes() {
    const result = await this.sql.exec(`
      SELECT * FROM notes ORDER BY updated_at DESC
    `)
    return result.toArray()
  }
}

// Worker routing
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userId = request.headers.get('X-User-ID')
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Each user gets their own Durable Object instance
    const id = env.USER_DB.idFromName(userId)
    const stub = env.USER_DB.get(id)
    return stub.fetch(request)
  },
}
```

### Pattern 2: Rate Limiting

Per-user rate limiting:

```typescript
export class RateLimiter {
  private state: DurableObjectState
  private storage: DurableObjectStorage

  constructor(state: DurableObjectState) {
    this.state = state
    this.storage = state.storage
  }

  async fetch(request: Request): Promise<Response> {
    const now = Date.now()
    const windowSize = 60 * 1000 // 1 minute
    const maxRequests = 100

    // Get request timestamps
    const requests = (await this.storage.get<number[]>('requests')) || []

    // Filter out old requests
    const recentRequests = requests.filter(
      (timestamp) => timestamp > now - windowSize
    )

    if (recentRequests.length >= maxRequests) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      })
    }

    // Add current request
    recentRequests.push(now)
    await this.storage.put('requests', recentRequests)

    return new Response('OK', { status: 200 })
  }
}
```

## Best Practices

### 1. Initialize from Storage on First Access

```typescript
export class MyObject {
  private initialized = false
  private data: any

  async ensureInitialized() {
    if (!this.initialized) {
      this.data = await this.state.storage.get('data')
      this.initialized = true
    }
  }

  async fetch(request: Request) {
    await this.ensureInitialized()
    // Use this.data
  }
}
```

### 2. Don't Rely on In-Memory State for WebSocket Data

**❌ Bad:**
```typescript
private userNames = new Map() // Lost during hibernation!

async webSocketMessage(ws: WebSocket, message: string) {
  const userName = this.userNames.get(ws) // May be undefined!
}
```

**✅ Good:**
```typescript
async fetch(request: Request) {
  const server = acceptWebSocket()
  server.serializeAttachment({ userName: 'Alice' }) // Persisted!
}

async webSocketMessage(ws: WebSocket, message: string) {
  const { userName } = ws.deserializeAttachment() // Always available
}
```

### 3. Use Point-in-Time Recovery

SQLite-backed Durable Objects support recovering to any point in the past 30 days:

```typescript
// Create a bookmark
const bookmark = await this.state.storage.sql.createBookmark()

// Later, restore to that point
await this.state.storage.sql.restoreBookmark(bookmark)
```

## Use Cases

### Ideal For:

1. **Real-time chat applications**
2. **Collaborative editing** (docs, code, design)
3. **Multiplayer games**
4. **Live dashboards**
5. **IoT device coordination**
6. **Session management**
7. **Rate limiting**
8. **Presence tracking**
9. **Live notifications**
10. **Distributed locks**

### Not Ideal For:

- Large data warehouses
- Long-running background jobs
- Static content serving
- Pure compute without state

## Pricing

- **Requests**: $0.15 per million requests
- **Duration**: $12.50 per million GB-seconds
- **Storage**: $0.20 per GB per month

**Hibernation benefit**: During hibernation, no duration charges!

## Resources

- **Official Docs**: [developers.cloudflare.com/durable-objects](https://developers.cloudflare.com/durable-objects/)
- **Examples**: [developers.cloudflare.com/durable-objects/examples](https://developers.cloudflare.com/durable-objects/examples/)
- **Chat Demo**: [github.com/cloudflare/workers-chat-demo](https://github.com/cloudflare/workers-chat-demo)
- **Discord**: Cloudflare Developers Discord

## Integration with TanStack Start & Convex

You can use Durable Objects alongside Convex for different purposes:

- **Convex**: Primary database for application data, queries, mutations
- **Durable Objects**: Real-time coordination, WebSocket connections, ephemeral state

```typescript
// TanStack Start server function
import { createServerFn } from '@tanstack/start'

export const joinGameRoom = createServerFn('POST', async (gameId: string) => {
  // Store game data in Convex
  const game = await convex.query(api.games.get, { id: gameId })

  // Get WebSocket URL for Durable Object
  const wsUrl = `wss://your-worker.workers.dev/game/${gameId}`

  return { game, wsUrl }
})
```

This combination gives you:
- **Convex**: Persistent, queryable data with reactive updates
- **Durable Objects**: Real-time coordination and WebSocket connections

## Summary

Cloudflare Durable Objects provide a powerful platform for building stateful, real-time applications:

- **Strong consistency** with single-threaded execution
- **Persistent storage** with SQLite or key-value APIs
- **WebSocket hibernation** for cost-effective real-time connections
- **Global distribution** on Cloudflare's edge network
- **Auto-scaling** to millions of instances
- **Zero infrastructure management**

Perfect for chat apps, collaborative tools, multiplayer games, and any application requiring coordination between multiple clients with strong consistency guarantees.
