# Convex: Reactive Database Guide

## Overview

Convex is a reactive, real-time database platform designed for modern application developers. It provides automatic real-time subscriptions, strong consistency guarantees, and a developer-friendly TypeScript-first API. Convex eliminates the complexity of managing WebSocket connections, cache invalidation, and state synchronization.

**Core Philosophy:** Just like React components react to state changes, Convex queries react to database changes.

## Reactive Architecture

### How It Works

1. **Dependency Tracking**: Convex automatically tracks all data dependencies for every query function
2. **Change Detection**: When any dependency changes, Convex detects it
3. **Automatic Recomputation**: Query functions are automatically rerun
4. **Push Updates**: New results are pushed to all active subscriptions

**Key Insight:** You don't manually manage subscriptions, WebSocket connections, or state synchronization—Convex handles all of this automatically.

### Automatic Real-Time

Convex is automatically real-time. If you're using:
- Query functions
- Database operations
- Client libraries

Then your app is **already real-time**. No special configuration needed.

## Core Concepts

Convex separates operations into three distinct function types:

### 1. Queries (Read-Only, Reactive)

```typescript
import { query } from './_generated/server'

export const listMessages = query({
  args: { channelId: v.id('channels') },
  handler: async (ctx, args) => {
    // Read-only operations
    return await ctx.db
      .query('messages')
      .withIndex('by_channel', (q) => q.eq('channelId', args.channelId))
      .order('desc')
      .take(50)
  },
})
```

**Characteristics:**
- Read-only (cannot modify database)
- Reactive (automatically update when data changes)
- Can be called from client or server
- Run in transactions (consistent snapshot of data)
- Subscriptions automatically managed

### 2. Mutations (Transactional Writes)

```typescript
import { mutation } from './_generated/server'

export const sendMessage = mutation({
  args: {
    channelId: v.id('channels'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Can read and write
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Unauthorized')

    return await ctx.db.insert('messages', {
      channelId: args.channelId,
      userId: user.subject,
      text: args.text,
      timestamp: Date.now(),
    })
  },
})
```

**Characteristics:**
- Can read and write data
- Run in ACID transactions
- Automatically trigger reactive updates
- Nearly impossible to corrupt data
- Prevent inconsistent states

**What Happens After a Mutation:**
1. Mutation completes successfully
2. Convex identifies modified data
3. Checks dependency graph for affected queries
4. Invalidates those queries
5. Automatically recomputes them
6. Pushes results to subscribed clients

### 3. Actions (External Operations)

```typescript
import { action } from './_generated/server'

export const sendEmail = action({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    // Can call external APIs
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
      body: JSON.stringify({ /* ... */ }),
    })

    // Can call mutations
    await ctx.runMutation(api.notifications.create, {
      type: 'email_sent',
      recipient: args.to,
    })
  },
})
```

**Characteristics:**
- For external API calls
- Non-deterministic operations
- Don't participate in reactive system
- Can call queries and mutations
- Used for side effects

## Real-Time Subscription System

### Automatic Subscription Management

When you use a query in your React component:

```typescript
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

function MessageList({ channelId }) {
  // Automatically subscribes
  const messages = useQuery(api.messages.listMessages, { channelId })

  // Updates automatically when data changes
  return (
    <div>
      {messages?.map((msg) => (
        <Message key={msg._id} {...msg} />
      ))}
    </div>
  )
}
```

**What's Happening:**
1. Component mounts → subscription created
2. Initial query result returned
3. When anyone sends a message → mutation runs
4. Convex detects `messages` table changed
5. Queries depending on `messages` rerun
6. New results pushed to your component
7. Component re-renders with fresh data

### Consistency Guarantees

```typescript
// All updates happen atomically
function MultipleSubscriptions() {
  const user = useQuery(api.users.get, { id: userId })
  const posts = useQuery(api.posts.byUser, { userId })
  const comments = useQuery(api.comments.byUser, { userId })

  // All three update at the same time when data changes
  // Never see inconsistent state between queries
  return <UserProfile user={user} posts={posts} comments={comments} />
}
```

**Key Features:**
- New results pushed from server
- All subscriptions update simultaneously
- Data is never stale
- No need for `queryClient.invalidateQueries()`
- No manual cache management

## Query Patterns & Best Practices

### 1. Use Indexes Efficiently

**❌ Bad: Filter in code**
```typescript
export const slowQuery = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect()
    return allUsers.filter((u) => u.isActive) // Inefficient!
  },
})
```

**✅ Good: Use indexes**
```typescript
// Define index in schema
export default defineSchema({
  users: defineTable({
    name: v.string(),
    isActive: v.boolean(),
  }).index('by_active', ['isActive']),
})

// Use index in query
export const fastQuery = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('users')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()
  },
})
```

**Why?**
- `.withIndex()` filters at database level
- Only loads matching documents
- Reduces bandwidth usage
- Faster query execution

### 2. Avoid Loading Large Datasets

**Problem:** All results from `.collect()` count towards bandwidth, even ones filtered out later.

**❌ Bad: Load everything then filter**
```typescript
export const inefficient = query({
  handler: async (ctx, { userId }) => {
    const allPosts = await ctx.db.query('posts').collect() // Loads everything!
    return allPosts.filter((p) => p.authorId === userId)
  },
})
```

**✅ Good: Use indexes and pagination**
```typescript
export const efficient = query({
  args: { userId: v.id('users'), cursor: v.union(v.null(), v.string()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('posts')
      .withIndex('by_author', (q) => q.eq('authorId', args.userId))
      .paginate({ cursor: args.cursor, numItems: 20 })

    return results
  },
})
```

**When to paginate:**
- Result set could exceed 1000+ documents
- Displaying data in incremental chunks
- Infinite scroll patterns
- Large list displays

### 3. Index Redundancy

**❌ Bad: Redundant indexes**
```typescript
// Don't need both!
defineTable({
  name: v.string(),
  category: v.string(),
})
  .index('by_name', ['name'])
  .index('by_name_and_category', ['name', 'category']) // Redundant!
```

**✅ Good: Use compound index**
```typescript
// Compound index covers both use cases
defineTable({
  name: v.string(),
  category: v.string(),
}).index('by_name_and_category', ['name', 'category'])

// Can query by name only
ctx.db.query('products').withIndex('by_name_and_category', (q) =>
  q.eq('name', 'Widget')
)

// Or by name and category
ctx.db.query('products').withIndex('by_name_and_category', (q) =>
  q.eq('name', 'Widget').eq('category', 'Tools')
)
```

**Benefits:**
- Reduces database storage
- Less overhead on writes
- Simpler schema

### 4. Split Hot and Cold Data

**Problem:** Frequently updated fields cause queries to rerun even when those queries don't care about those fields.

**❌ Bad: Everything in one document**
```typescript
defineTable({
  userId: v.id('users'),
  name: v.string(),
  email: v.string(),
  lastSeen: v.number(), // Updated every second!
  loginCount: v.number(), // Updated every login!
})

// This query reruns every second!
export const getUserName = query({
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    return user?.name // Only needs name, but reruns on lastSeen changes
  },
})
```

**✅ Good: Split into hot and cold tables**
```typescript
// Cold data (changes rarely)
defineTable({
  userId: v.id('users'),
  name: v.string(),
  email: v.string(),
})

// Hot data (changes frequently)
defineTable({
  userId: v.id('users'),
  lastSeen: v.number(),
  loginCount: v.number(),
}).index('by_user', ['userId'])

// Query only fetches what it needs
export const getUserName = query({
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId) // Only triggers on name/email changes
  },
})
```

### 5. Consistent Transactions

**❌ Bad: Multiple separate calls**
```typescript
export const inconsistent = action({
  handler: async (ctx) => {
    // These run in separate transactions!
    const user = await ctx.runQuery(api.users.get, { id: 'user1' })
    const posts = await ctx.runQuery(api.posts.byUser, { userId: 'user1' })

    // user and posts might be from different points in time
    return { user, posts }
  },
})
```

**✅ Good: Single query with consistent snapshot**
```typescript
export const consistent = query({
  handler: async (ctx, { userId }) => {
    // Single transaction = consistent snapshot
    const user = await ctx.db.get(userId)
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_author', (q) => q.eq('authorId', userId))
      .collect()

    return { user, posts }
  },
})
```

**Why?** Each `ctx.runMutation` or `ctx.runQuery` runs in its own transaction. Combining operations guarantees consistency.

## Avoiding Redundant Data Calls

### Problem: Over-fetching

**Common pitfall:** Loading more data than needed

**Solutions:**

#### 1. Pagination
```typescript
export const paginatedList = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query('items').paginate(args.paginationOpts)
  },
})
```

#### 2. Field Selection (Manual)
```typescript
export const getUserBasics = query({
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    if (!user) return null

    // Return only needed fields
    return {
      id: user._id,
      name: user.name,
      avatar: user.avatar,
    }
  },
})
```

#### 3. Denormalization (When Appropriate)
```typescript
// Instead of loading full user for each comment
defineTable({
  text: v.string(),
  authorId: v.id('users'),
  authorName: v.string(), // Denormalized
  authorAvatar: v.string(), // Denormalized
})

// Now we don't need separate user queries
export const getComments = query({
  handler: async (ctx, { postId }) => {
    // Has all needed data
    return await ctx.db
      .query('comments')
      .withIndex('by_post', (q) => q.eq('postId', postId))
      .collect()
  },
})
```

### Problem: Query Thrashing

**Issue:** Too many queries updating too frequently

**Solutions:**

#### 1. Debounce Subscriptions
```typescript
import { useQuery } from 'convex/react'
import { useMemo } from 'react'
import { debounce } from 'lodash'

function SearchBox() {
  const [query, setQuery] = useState('')

  // Debounce the search query
  const debouncedQuery = useMemo(
    () => debounce((q) => setQuery(q), 300),
    []
  )

  const results = useQuery(api.search.query, { query })

  return <input onChange={(e) => debouncedQuery(e.target.value)} />
}
```

#### 2. Use Appropriate Data Structures
```typescript
// For frequently updating ordered lists, use queue pattern
defineTable({
  status: v.union(v.literal('pending'), v.literal('processing'), v.literal('done')),
  priority: v.number(),
  createdAt: v.number(),
}).index('by_status_and_priority', ['status', 'priority', 'createdAt'])

// Only fetch what you need
export const getPendingTasks = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('tasks')
      .withIndex('by_status_and_priority', (q) => q.eq('status', 'pending'))
      .order('desc') // Highest priority first
      .take(10) // Only take top 10
  },
})
```

## Performance Optimization

### Query Throughput Patterns

#### 1. Queue Pattern
```typescript
// For high-throughput mutations
defineTable({
  status: v.string(),
  processedAt: v.optional(v.number()),
}).index('by_status', ['status'])

export const processNext = mutation({
  handler: async (ctx) => {
    // Only read the document we'll process
    const next = await ctx.db
      .query('jobs')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .first()

    if (next) {
      await ctx.db.patch(next._id, {
        status: 'processing',
        processedAt: Date.now(),
      })
    }

    return next
  },
})
```

#### 2. Predicate Locks
```typescript
// Take locks on specific field values
export const updateCounter = mutation({
  args: { counterId: v.id('counters') },
  handler: async (ctx, args) => {
    const counter = await ctx.db.get(args.counterId)

    // This takes a predicate lock on counter.value
    if (counter.value >= 100) {
      // Only conflicts with other mutations when value >= 100
      await ctx.db.patch(args.counterId, { status: 'complete' })
    } else {
      await ctx.db.patch(args.counterId, { value: counter.value + 1 })
    }
  },
})
```

## Transactional Guarantees

### ACID Properties

Convex provides full ACID guarantees:

- **Atomicity**: Mutations either complete fully or not at all
- **Consistency**: Data remains in valid state
- **Isolation**: Concurrent mutations don't interfere
- **Durability**: Committed data persists

### Nearly Impossible to Corrupt Data

```typescript
// This mutation is safe from race conditions
export const transfer = mutation({
  args: { fromId: v.id('accounts'), toId: v.id('accounts'), amount: v.number() },
  handler: async (ctx, args) => {
    const from = await ctx.db.get(args.fromId)
    const to = await ctx.db.get(args.toId)

    if (from.balance < args.amount) {
      throw new Error('Insufficient funds')
    }

    // Both updates succeed or both fail
    await ctx.db.patch(args.fromId, { balance: from.balance - args.amount })
    await ctx.db.patch(args.toId, { balance: to.balance + args.amount })

    // No way to leave accounts in inconsistent state
  },
})
```

## Scalability Patterns

### For Large Datasets

1. **Always use indexes** for filtering
2. **Implement pagination** for lists
3. **Split hot/cold data** into separate tables
4. **Denormalize** when join queries become bottleneck
5. **Use appropriate data structures** (queues for ordered processing)

### For High Write Volume

1. **Sculpt queries** to read minimal documents
2. **Use predicate locks** on specific fields
3. **Consider queue patterns** for sequential processing
4. **Split tables** by access patterns

### For Real-Time Updates

1. **Embrace push-based updates** (no polling)
2. **Use Convex's automatic invalidation** (no manual cache management)
3. **Debounce rapid changes** on client side when appropriate
4. **Design queries** to minimize recomputation

## Best Practices Summary

1. **Always use indexes** - Filter at database level with `.withIndex()`
2. **Paginate large datasets** - Use `.paginate()` for 1000+ documents
3. **Split hot/cold data** - Separate frequently and rarely updated fields
4. **Consistent transactions** - Combine related reads in single query
5. **Avoid redundant indexes** - Use compound indexes effectively
6. **Embrace reactivity** - Let Convex handle subscriptions automatically
7. **Trust the type system** - Use generated types for safety
8. **Design for scale** - Think about query performance from the start

## Resources

- **Official Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Best Practices**: [docs.convex.dev/understanding/best-practices](https://docs.convex.dev/understanding/best-practices/)
- **Stack Articles**: [stack.convex.dev](https://stack.convex.dev)
- **GitHub**: [github.com/get-convex](https://github.com/get-convex)
- **Community**: Convex Discord

## When to Choose Convex

Convex is ideal when you need:

- Real-time, reactive applications
- Strong consistency guarantees
- Simplified backend architecture
- TypeScript-first development
- Automatic subscription management
- Transactional data operations
- Reduced infrastructure complexity

Consider alternatives if:

- You need complex SQL joins (though Convex supports relationships)
- You require specific database features (full-text search, geospatial)
- You have existing database infrastructure you must use
