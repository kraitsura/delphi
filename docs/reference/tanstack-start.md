# TanStack Start: Full-Stack React Framework Guide

## Overview

TanStack Start is a modern, full-stack React framework that provides a client-first developer experience while delivering powerful server-side capabilities. Built on top of TanStack Router, Start is designed for building type-safe, performant web applications with rich interactivity and server-side rendering.

**Status:** Currently in beta (as of 2025), moving towards 1.0 release

## Philosophy: Client-First Approach

Unlike traditional server-first frameworks, TanStack Start takes a fundamentally different path by staying true to client-side development patterns while providing full-featured server-side capabilities. This means you get:

- Familiar React development patterns
- Rich client-side interactivity
- Server capabilities when needed
- No compromise on user experience

## Core Features

### 1. Full-Document SSR & Streaming

TanStack Start includes powerful capabilities for full-document server-side rendering with streaming support:

- **Streaming SSR**: Progressive content delivery for faster perceived performance
- **Above-the-fold rendering**: Prioritize visible content first
- **Incremental HTML delivery**: Stream HTML and data to the client without extra complexity
- Streaming is baked into the core, not an afterthought

### 2. Type-Safe Routing

Built on TanStack Router, Start comes with a powerfully-unmatched routing system:

- **100% type safety**: Full TypeScript support across routes
- **URL state management**: Manage state in the URL with type safety
- **Integrated data fetching**: Co-locate data requirements with routes
- **Nested search parameters**: Advanced parameter handling
- **Strict relative navigation**: Predictable navigation patterns

### 3. Server Functions & RPCs

Server functions allow you to write backend logic that runs securely on the server:

```typescript
// Define a server function
import { createServerFn } from '@tanstack/start'

const getUser = createServerFn('GET', async (userId: string) => {
  // This runs on the server
  const user = await db.users.get(userId)
  return user
})

// Call from anywhere - loaders, hooks, components
function UserProfile({ userId }) {
  const user = await getUser(userId)
  return <div>{user.name}</div>
}
```

**Key Benefits:**
- No manual endpoint wiring required
- More seamless than traditional API routes
- End-to-end type safety maintained
- Secure server-side execution (database queries, auth, external fetches)

### 4. Server & API Routes

Build backend endpoints alongside your frontend:

- Server routes for server-side logic
- API routes for REST endpoints
- Middleware & context for request/response handling
- Full-stack bundling optimized for both client and server

### 5. Rich Interactivity

TanStack Start excels at building highly interactive applications:

- Client-side state management
- Real-time updates
- Optimistic UI updates
- Progressive enhancement
- Collaborative features

## Selective SSR Patterns

One of Start's most powerful features is **Selective SSR**, which allows you to configure server-side handling on a per-route basis.

### SSR Modes

#### 1. `ssr: true` (Default - Full SSR)

```typescript
export const Route = createFileRoute('/dashboard')({
  ssr: true,
  loader: async () => {
    // Runs on server, then on client after hydration
    return await fetchDashboardData()
  },
})
```

**When to use:**
- SEO-critical pages
- Fast initial load times required
- Content should be visible immediately
- Standard SSR behavior

**What happens:**
- `beforeLoad` and `loader` run on server
- Route renders on server
- HTML sent to client
- Loaders run again on client
- Route re-renders with hydration

#### 2. `ssr: "data-only"` (Data Fetching Only)

```typescript
export const Route = createFileRoute('/app')({
  ssr: 'data-only',
  loader: async () => {
    // Runs on server for data fetching
    return await fetchAppData()
  },
})
```

**When to use:**
- Fast data fetching needed
- Components use browser-only APIs
- Dynamic display based on client environment
- Components don't fit server rendering

**What happens:**
- Loaders run on server
- Data sent to client
- Component renders client-side only
- Faster than client-only, better than full SSR for browser-dependent components

#### 3. `ssr: false` (Client-Only)

```typescript
export const Route = createFileRoute('/editor')({
  ssr: false,
  component: RichTextEditor,
})
```

**When to use:**
- Heavily interactive components
- Browser-specific functionality
- No SEO requirements
- Third-party libraries that don't support SSR

**What happens:**
- No server rendering
- Everything happens client-side
- Fastest server response, slowest initial render

### SSR Inheritance Rules

- Child routes inherit parent's SSR configuration
- Can only become **more restrictive** (true → data-only → false)
- Cannot become less restrictive (prevents SSR mismatches)

```typescript
// Parent route
export const Route = createFileRoute('/app')({
  ssr: true, // Full SSR
})

// Child can be data-only or false, but not true if parent is data-only
export const ChildRoute = createFileRoute('/app/settings')({
  ssr: 'data-only', // ✅ Valid
})
```

## Data Loading Best Practices

### Isomorphic Loaders

Loaders run on both server and client, providing flexibility:

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    // Runs on server for SSR
    // Runs on client for navigation
    return await getPost(params.postId)
  },
  component: PostComponent,
})
```

### Integration with TanStack Query

TanStack Query is a natural companion for optimal caching and performance:

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/posts')({
  loader: async ({ context }) => {
    // Prefetch on server
    await context.queryClient.prefetchQuery({
      queryKey: ['posts'],
      queryFn: getPosts,
    })
  },
})

function PostsList() {
  // Uses server-fetched data, updates live on client
  const { data } = useSuspenseQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  return <PostList posts={data} />
}
```

**Benefits:**
- Component-level data fetching
- Server fetching with SSR
- Streaming support
- Automatic caching
- No convenience sacrificed

### Server Function Patterns

#### Stream Data

```typescript
const streamData = createServerFn('GET', async function* () {
  yield { progress: 0 }
  await processStep1()
  yield { progress: 50 }
  await processStep2()
  yield { progress: 100 }
})
```

#### Compose with Middleware

```typescript
const authenticatedFn = createServerFn('POST')
  .middleware(async ({ next }) => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')
    return next({ context: { user } })
  })
  .handler(async ({ context }) => {
    // Access context.user
  })
```

#### Build-Time Caching

```typescript
const getStaticData = createServerFn('GET', async () => {
  return await fetchStaticContent()
}).cache({ ttl: Infinity }) // Cache at build time
```

## Use Cases

TanStack Start is ideal for:

1. **Full-Stack Applications**: Need both server and client capabilities
2. **Rich Interactive UIs**: Heavy client-side interactivity required
3. **Type-Safe Development**: End-to-end TypeScript safety
4. **SEO + Interactivity**: Pages need SEO with rich client features
5. **Real-Time Collaboration**: Building collaborative tools with live updates
6. **Progressive Enhancement**: Start with SSR, enhance with client features

## Best Practices

### 1. Choose the Right SSR Mode

- Use `ssr: true` for landing pages, marketing content, blogs
- Use `ssr: "data-only"` for dashboards with browser APIs
- Use `ssr: false` for editors, canvas apps, games

### 2. Leverage Server Functions

- Keep sensitive operations server-side
- Use server functions for database queries
- Compose functions with middleware for DRY code
- Stream large datasets instead of blocking

### 3. Optimize Data Loading

- Prefetch data in loaders
- Use TanStack Query for caching
- Implement pagination for large lists
- Cache static data at build time

### 4. Type Safety

- Define strict types for server functions
- Use TypeScript for route parameters
- Validate data at boundaries
- Leverage inference where possible

### 5. Performance

- Stream critical content first
- Use selective SSR strategically
- Implement code splitting
- Monitor bundle sizes

## Architecture Patterns

### Full-Stack Feature Module

```typescript
// routes/todos/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getTodos } from './api'

export const Route = createFileRoute('/todos/')({
  ssr: true,
  loader: async ({ context }) => {
    // Server-side data loading
    return await getTodos()
  },
  component: TodosPage,
})

function TodosPage() {
  const todos = Route.useLoaderData()
  return <TodoList todos={todos} />
}
```

```typescript
// routes/todos/api.ts
import { createServerFn } from '@tanstack/start'

export const getTodos = createServerFn('GET', async () => {
  return await db.todos.findMany()
})

export const createTodo = createServerFn('POST', async (data: TodoInput) => {
  return await db.todos.create({ data })
})
```

### Collaborative Real-Time Feature

```typescript
// Combine TanStack Start with real-time subscriptions
export const Route = createFileRoute('/collab/$docId')({
  ssr: 'data-only', // Fetch initial data on server
  loader: async ({ params }) => {
    return await getDocument(params.docId)
  },
})

function CollabEditor() {
  const initialDoc = Route.useLoaderData()

  // Real-time updates happen client-side
  const { data: doc } = useRealtimeSubscription({
    initialData: initialDoc,
    channel: `doc-${params.docId}`,
  })

  return <Editor doc={doc} />
}
```

## Resources

- **Official Docs**: [tanstack.com/start](https://tanstack.com/start)
- **TanStack Router Docs**: [tanstack.com/router](https://tanstack.com/router)
- **GitHub**: [github.com/tanstack/start](https://github.com/tanstack/start)
- **Community**: TanStack Discord

## Current Status & Roadmap

As of 2025, TanStack Start is in **beta** with active development towards 1.0 release. The framework is production-ready for early adopters but expect API changes as it stabilizes.

**Coming Soon:**
- Enhanced streaming capabilities
- More deployment targets
- Improved dev tooling
- Additional middleware patterns
- Extended plugin ecosystem
