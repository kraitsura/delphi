# TanStack Start + Convex: Integration Guide & Best Practices

## Overview

This guide covers the integration of TanStack Start (full-stack React framework) with Convex (reactive database), focusing on creating synergy between their reactive systems while avoiding redundant data calls and maintaining best practices.

**Key Synergy:** TanStack Start's SSR + streaming capabilities combined with Convex's reactive, real-time database create a powerful full-stack platform for building modern applications with live updates.

## Why This Combination Works

### TanStack Start Provides:
- Full-document SSR and streaming
- Type-safe routing and server functions
- Selective SSR modes (full, data-only, client-only)
- Isomorphic loaders

### Convex Provides:
- Reactive, real-time database
- Push-based updates (no polling)
- Automatic subscription management
- Type-safe queries and mutations

### Together They Enable:
- Server-side rendering with consistent data snapshots
- Automatic live updates after hydration
- Type-safe full-stack development
- No manual cache invalidation
- Optimistic UI updates
- Real-time collaboration features

## Setup & Installation

### 1. Install Dependencies

```bash
npm install convex @convex-dev/react-query @tanstack/react-query
```

### 2. Initialize Convex

```bash
npx convex dev
```

This creates a `convex/` directory with your backend functions.

### 3. Configure TanStack Start with Convex

```typescript
// app/router.tsx
import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Use Infinity since Convex pushes updates
      staleTime: Infinity,
      // Keep in cache for smooth navigation
      gcTime: 5000,
    },
  },
})

// Create router with context
export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    convexClient,
  },
})
```

### 4. Provide Context in Root

```typescript
// app/root.tsx
import { ConvexProvider } from 'convex/react'
import { QueryClientProvider } from '@tanstack/react-query'

function App() {
  return (
    <ConvexProvider client={convexClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConvexProvider>
  )
}
```

## Integration Strategy: The React Query Approach

The recommended approach is using TanStack Query as the bridge between TanStack Start and Convex.

### Why TanStack Query?

1. **Server-side rendering support**: Prefetch on server, hydrate on client
2. **Unified caching**: Single cache for all data
3. **Familiar API**: If you know React Query, you're good
4. **Seamless integration**: Works with Start's loaders

### Basic Pattern

```typescript
import { useConvexQuery } from '@convex-dev/react-query'
import { api } from '../convex/_generated/api'

function MyComponent() {
  const { data, isLoading } = useConvexQuery(
    api.myFunction.list,
    { arg: 'value' }
  )

  return <div>{data?.map(/* ... */)}</div>
}
```

## Reactive Query Patterns

### Pattern 1: Push-Based Updates (No Polling)

Unlike traditional APIs that require polling, Convex automatically pushes updates.

**❌ Traditional API Pattern (Polling):**
```typescript
// Bad: Constant polling wastes resources
const { data } = useQuery({
  queryKey: ['messages'],
  queryFn: fetchMessages,
  refetchInterval: 1000, // Polls every second!
})
```

**✅ Convex Pattern (Push-Based):**
```typescript
// Good: Automatic push updates
const { data } = useConvexQuery(api.messages.list, { channelId })
// Updates automatically when data changes on server
// No polling, no wasted requests!
```

### Pattern 2: Automatic Invalidation

Convex handles query invalidation automatically when data changes.

**❌ Traditional Pattern (Manual Invalidation):**
```typescript
// Bad: Manual cache management
const mutation = useMutation({
  mutationFn: createMessage,
  onSuccess: () => {
    // Must manually invalidate
    queryClient.invalidateQueries(['messages'])
    queryClient.invalidateQueries(['unreadCount'])
    queryClient.invalidateQueries(['channelList'])
  }
})
```

**✅ Convex Pattern (Automatic):**
```typescript
// Good: Automatic invalidation
const createMessage = useConvexMutation(api.messages.create)

// When mutation succeeds:
// 1. Convex detects which queries depend on 'messages' table
// 2. Automatically recomputes those queries
// 3. Pushes updates to all subscribed components
// No manual invalidation needed!
```

### Pattern 3: Consistent Snapshots

All subscriptions update simultaneously with consistent data.

```typescript
function Dashboard() {
  // All three queries see consistent data
  const user = useConvexQuery(api.users.current)
  const posts = useConvexQuery(api.posts.byUser, { userId: user?._id })
  const stats = useConvexQuery(api.stats.forUser, { userId: user?._id })

  // When user updates:
  // - All three update at the same time
  // - Never see inconsistent state between them
  // - Guaranteed transactional consistency

  return <UserDashboard user={user} posts={posts} stats={stats} />
}
```

## Server-Side Rendering with Convex

### Pattern 1: SSR with useSuspenseQuery

The most powerful pattern for SSR with live updates.

```typescript
// routes/messages/$channelId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/messages/$channelId')({
  ssr: true,
  loader: async ({ context, params }) => {
    // Prefetch on server
    await context.queryClient.prefetchQuery(
      convexQuery(api.messages.list, { channelId: params.channelId })
    )
  },
})

function MessagesPage() {
  const { channelId } = Route.useParams()

  // Server-renders with prefetched data
  // Hydrates on client
  // Automatically subscribes to live updates
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.messages.list, { channelId })
  )

  return <MessageList messages={messages} />
}
```

**What Happens:**
1. **Server-side**: Loader prefetches data, component renders with data
2. **HTML sent**: Full HTML with initial data sent to client
3. **Hydration**: React hydrates with same data (no flash)
4. **Live updates**: Automatically subscribes to Convex updates
5. **Reactivity**: Component updates when new messages arrive

### Pattern 2: Selective SSR for Real-Time Features

Use `ssr: "data-only"` for features that need fast data but client-only rendering.

```typescript
export const Route = createFileRoute('/editor/$docId')({
  ssr: 'data-only', // Fetch data on server, render on client
  loader: async ({ context, params }) => {
    // Still prefetch data on server
    await context.queryClient.prefetchQuery(
      convexQuery(api.documents.get, { id: params.docId })
    )
  },
})

function CollaborativeEditor() {
  const { docId } = Route.useParams()

  // Uses server-fetched initial data
  const { data: doc } = useSuspenseQuery(
    convexQuery(api.documents.get, { id: docId })
  )

  // Live collaborative updates happen automatically
  return <RichTextEditor doc={doc} />
}
```

**When to use `ssr: "data-only"`:**
- Collaborative editors (need browser APIs)
- Real-time dashboards (complex visualizations)
- Interactive tools (canvas, drawing apps)
- Features using browser-only libraries

## Avoiding Redundant Data Calls

### Problem 1: Over-fetching in Queries

**❌ Bad: Loading unnecessary data**
```typescript
// Convex function
export const getUserDashboard = query({
  handler: async (ctx) => {
    // Loads entire user object with all fields
    const user = await ctx.db.query('users').first()

    // Loads all posts (could be thousands!)
    const posts = await ctx.db.query('posts').collect()

    return { user, posts }
  }
})
```

**✅ Good: Load only what you need**
```typescript
// Convex function
export const getUserDashboard = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Get specific user
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    // Only return needed fields
    const userBasics = {
      id: user._id,
      name: user.name,
      avatar: user.avatar,
    }

    // Paginate posts
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_author', (q) => q.eq('authorId', args.userId))
      .order('desc')
      .take(20) // Only first 20

    return { user: userBasics, posts }
  }
})
```

### Problem 2: Duplicate Queries Across Components

**❌ Bad: Each component queries separately**
```typescript
function Header() {
  const user = useConvexQuery(api.users.current) // Query 1
  return <UserAvatar user={user} />
}

function Sidebar() {
  const user = useConvexQuery(api.users.current) // Query 2 (duplicate!)
  return <UserMenu user={user} />
}

function Dashboard() {
  const user = useConvexQuery(api.users.current) // Query 3 (duplicate!)
  return <UserStats user={user} />
}
```

**✅ Good: TanStack Query deduplicates automatically**
```typescript
// Same code, but TanStack Query is smart!
// Only makes ONE subscription to Convex
// All three components share the same data
// Updates propagate to all simultaneously

function Header() {
  const user = useConvexQuery(api.users.current) // Deduplicated
  return <UserAvatar user={user} />
}

function Sidebar() {
  const user = useConvexQuery(api.users.current) // Uses cached data
  return <UserMenu user={user} />
}

function Dashboard() {
  const user = useConvexQuery(api.users.current) // Uses cached data
  return <UserStats user={user} />
}
```

**How it works:**
- TanStack Query uses query keys to deduplicate
- Multiple `useConvexQuery` calls with same args = single subscription
- Result cached and shared across all components
- No redundant network requests!

### Problem 3: Unnecessary Rerenders from Hot Data

**❌ Bad: Frequently updated fields cause unnecessary rerenders**
```typescript
// Schema with mixed hot/cold data
defineTable({
  name: v.string(),
  email: v.string(),
  lastSeen: v.number(), // Updates every few seconds!
})

// This query reruns constantly
export const getUserProfile = query({
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    return {
      name: user.name, // Only needs this
      email: user.email, // And this
    }
    // But reruns whenever lastSeen changes!
  }
})
```

**✅ Good: Split hot and cold data**
```typescript
// Cold data table (rarely changes)
defineTable('users', {
  name: v.string(),
  email: v.string(),
  avatar: v.string(),
})

// Hot data table (changes frequently)
defineTable('user_activity', {
  userId: v.id('users'),
  lastSeen: v.number(),
  status: v.string(),
}).index('by_user', ['userId'])

// Now this query only reruns when profile data changes
export const getUserProfile = query({
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    return { name: user.name, email: user.email }
  }
})

// Separate query for activity (updates frequently)
export const getUserActivity = query({
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('user_activity')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()
  }
})
```

### Problem 4: N+1 Query Problem

**❌ Bad: Querying in loops**
```typescript
// Component
function PostList() {
  const posts = useConvexQuery(api.posts.list)

  return (
    <div>
      {posts?.map(post => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  )
}

function PostCard({ post }) {
  // Makes a separate query for EACH post! (N+1 problem)
  const author = useConvexQuery(api.users.get, { id: post.authorId })
  return <div>{author?.name}: {post.title}</div>
}
```

**✅ Good: Denormalize or batch fetch**

**Option 1: Denormalize (Best for read-heavy)**
```typescript
// Include author data in posts
defineTable('posts', {
  title: v.string(),
  authorId: v.id('users'),
  authorName: v.string(), // Denormalized
  authorAvatar: v.string(), // Denormalized
})

export const listPosts = query({
  handler: async (ctx) => {
    // All data in one query!
    return await ctx.db.query('posts').take(20)
  }
})

function PostCard({ post }) {
  // No additional query needed
  return <div>{post.authorName}: {post.title}</div>
}
```

**Option 2: Fetch relations in query (Best for flexibility)**
```typescript
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query('posts').take(20)

    // Batch fetch all unique authors
    const authorIds = [...new Set(posts.map(p => p.authorId))]
    const authors = await Promise.all(
      authorIds.map(id => ctx.db.get(id))
    )
    const authorMap = new Map(authors.map(a => [a._id, a]))

    // Combine data
    return posts.map(post => ({
      ...post,
      author: authorMap.get(post.authorId)
    }))
  }
})

function PostList() {
  const posts = useConvexQuery(api.posts.listWithAuthors)

  return (
    <div>
      {posts?.map(post => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  )
}

function PostCard({ post }) {
  // Data already included
  return <div>{post.author.name}: {post.title}</div>
}
```

## Server Functions + Convex Mutations

Combine TanStack Start server functions with Convex for secure operations.

### Pattern: Server Function Calling Convex

```typescript
// Server function (TanStack Start)
import { createServerFn } from '@tanstack/start'
import { api } from '../convex/_generated/api'

export const processPayment = createServerFn('POST', async (data: PaymentData, { request }) => {
  // Server-only operations
  const user = await getSessionUser(request)
  if (!user) throw new Error('Unauthorized')

  // Call external payment API (server-only)
  const paymentResult = await stripe.charges.create({
    amount: data.amount,
    currency: 'usd',
    source: data.token,
  })

  // Store result in Convex
  await convexClient.mutation(api.payments.record, {
    userId: user.id,
    amount: data.amount,
    stripeChargeId: paymentResult.id,
  })

  return { success: true, chargeId: paymentResult.id }
})
```

**When to use Server Functions vs Convex:**

| Use Server Functions | Use Convex Directly |
|---------------------|---------------------|
| External API calls | Database operations |
| File system access | Real-time subscriptions |
| Sensitive credentials | Reactive queries |
| Third-party services | Transactional writes |
| Complex business logic | Simple CRUD operations |

## Optimistic Updates

Combine Convex mutations with optimistic UI updates.

```typescript
import { useConvexMutation } from '@convex-dev/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../convex/_generated/api'

function MessageInput({ channelId }) {
  const queryClient = useQueryClient()
  const sendMessage = useConvexMutation(api.messages.send)

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      return await sendMessage({ channelId, text })
    },
    onMutate: async (text) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] })

      // Snapshot previous value
      const previous = queryClient.getQueryData(['messages', channelId])

      // Optimistically update
      queryClient.setQueryData(['messages', channelId], (old: any) => [
        ...old,
        {
          _id: 'optimistic-' + Date.now(),
          text,
          authorId: currentUserId,
          channelId,
          _creationTime: Date.now(),
        }
      ])

      return { previous }
    },
    onError: (err, text, context) => {
      // Rollback on error
      queryClient.setQueryData(['messages', channelId], context.previous)
    },
    onSettled: () => {
      // Convex will push the real update automatically
      // No need to manually refetch!
    }
  })

  return (
    <input
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          mutation.mutate(e.target.value)
          e.target.value = ''
        }
      }}
    />
  )
}
```

## Performance Best Practices

### 1. Configure Query Options Properly

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // CRITICAL: Use Infinity for Convex queries
      staleTime: Infinity,

      // Keep in cache for smooth navigation
      gcTime: 5000,

      // Disable refetch on window focus (Convex pushes updates)
      refetchOnWindowFocus: false,

      // Disable refetch on reconnect (Convex handles it)
      refetchOnReconnect: false,

      // Retry failed queries
      retry: 3,
    },
  },
})
```

**Why `staleTime: Infinity`?**
- Convex automatically pushes new results
- No need to mark data as stale
- Prevents unnecessary refetches
- Saves bandwidth and improves performance

### 2. Prefetch on Server

Always prefetch data in loaders for SSR:

```typescript
export const Route = createFileRoute('/dashboard')({
  ssr: true,
  loader: async ({ context }) => {
    // Prefetch all dashboard queries
    await Promise.all([
      context.queryClient.prefetchQuery(convexQuery(api.stats.overview)),
      context.queryClient.prefetchQuery(convexQuery(api.tasks.list)),
      context.queryClient.prefetchQuery(convexQuery(api.users.current)),
    ])
  },
})
```

### 3. Use Suspense Boundaries

Wrap components in Suspense for better UX:

```typescript
function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  // useSuspenseQuery suspends during loading
  const { data: stats } = useSuspenseQuery(convexQuery(api.stats.overview))
  return <StatsDisplay stats={stats} />
}
```

### 4. Implement Pagination

Use Convex's built-in pagination:

```typescript
export const listPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('posts').paginate(args.paginationOpts)
  }
})

function PostsList() {
  const [paginationOpts, setPaginationOpts] = useState({ numItems: 20, cursor: null })

  const { data } = useConvexQuery(api.posts.listPosts, { paginationOpts })

  const loadMore = () => {
    if (data?.continueCursor) {
      setPaginationOpts({ numItems: 20, cursor: data.continueCursor })
    }
  }

  return (
    <div>
      {data?.page.map(post => <Post key={post._id} {...post} />)}
      {data?.isDone ? null : <button onClick={loadMore}>Load More</button>}
    </div>
  )
}
```

## Resources

- **TanStack Start Docs**: [tanstack.com/start](https://tanstack.com/start)
- **Convex Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Convex + TanStack Query**: [docs.convex.dev/client/tanstack-query](https://docs.convex.dev/client/tanstack-query)
- **Example App**: [Trellaux Example](https://tanstack.com/start/latest/docs/framework/react/examples/start-convex-trellaux)
- **Integration Guide**: [news.convex.dev/tanstack-start-with-convex](https://news.convex.dev/tanstack-start-with-convex/)

## Summary

The combination of TanStack Start and Convex provides:

1. **Server-side rendering** with consistent data snapshots
2. **Automatic live updates** without polling or manual invalidation
3. **Type-safe full-stack** development with TypeScript
4. **Optimistic UI updates** with automatic rollback
5. **Real-time collaboration** features out of the box
6. **No wasted data calls** through intelligent caching and reactive updates

Follow these patterns to build performant, real-time applications with minimal boilerplate and maximum developer experience.
