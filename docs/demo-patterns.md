# TanStack Start Demo Patterns

This document captures the key patterns demonstrated in the `/demo` routes before they were removed.

## 1. Convex Integration Pattern

**File**: `src/routes/demo/convex.tsx`

### Key Concepts

```tsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/demo/convex')({
  ssr: false, // Convex doesn't support SSR
  component: ConvexTodos,
})

function ConvexTodos() {
  // Real-time queries - automatically re-renders on data changes
  const todos = useQuery(api.todos.list)

  // Mutations for data updates
  const addTodo = useMutation(api.todos.add)
  const toggleTodo = useMutation(api.todos.toggle)
  const removeTodo = useMutation(api.todos.remove)

  // Use mutations with await
  await addTodo({ text: newTodo.trim() })
  await toggleTodo({ id })
}
```

### Pattern Highlights

- **Real-time sync**: `useQuery` automatically subscribes to changes
- **Type safety**: Generated types from `api` and `dataModel`
- **SSR disabled**: Convex queries don't work with SSR (`ssr: false`)
- **Loading states**: `useQuery` returns `undefined` while loading
- **Optimistic mutations**: Mutations are async but UI updates automatically

---

## 2. TanStack Query Pattern

**File**: `src/routes/demo/tanstack-query.tsx`

### Key Concepts

```tsx
import { useQuery, useMutation } from '@tanstack/react-query'

function TanStackQueryDemo() {
  // Query with fetch
  const { data, refetch } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => fetch('/demo/api/tq-todos').then((res) => res.json()),
    initialData: [],
  })

  // Mutation with manual refetch
  const { mutate: addTodo } = useMutation({
    mutationFn: (todo: string) =>
      fetch('/demo/api/tq-todos', {
        method: 'POST',
        body: JSON.stringify(todo),
      }).then((res) => res.json()),
    onSuccess: () => refetch(), // Manually refetch after mutation
  })
}
```

### Pattern Highlights

- **Query keys**: Used for caching and invalidation (`['todos']`)
- **Initial data**: Prevents loading state on first render
- **Manual refetch**: Unlike Convex, must manually refetch after mutations
- **Fetch-based**: Works with any API endpoint

---

## 3. TanStack Router SSR Patterns

**File**: `src/routes/demo/start/ssr/full-ssr.tsx`

### Key Concepts

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { getPunkSongs } from '@/data/demo.punk-songs'

export const Route = createFileRoute('/demo/start/ssr/full-ssr')({
  component: RouteComponent,
  loader: async () => await getPunkSongs(), // Runs on server
})

function RouteComponent() {
  const punkSongs = Route.useLoaderData() // Access loader data
  return <div>{/* Render with data */}</div>
}
```

### Pattern Highlights

- **Server-side data loading**: `loader` runs on server before rendering
- **Type-safe data**: `Route.useLoaderData()` is fully typed
- **Automatic hydration**: Data passed to client for hydration
- **No loading state**: Data always available on first render

### SSR Modes

The demo showed multiple SSR strategies:

1. **Full SSR** (`full-ssr.tsx`): Complete server-side rendering
2. **Data-only** (`data-only.tsx`): Fetch data on server, render on client
3. **SPA mode** (`spa-mode.tsx`): Client-side only, no SSR

---

## 4. Server Functions Pattern

**File**: `src/routes/demo/start/server-funcs.tsx`

### Key Concepts

```tsx
import { createServerFn } from '@tanstack/react-start'
import fs from 'node:fs' // Node APIs available!

// GET server function
const getTodos = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Server-side logic with Node.js APIs
  return await readTodos()
})

// POST server function with validation
const addTodo = createServerFn({ method: 'POST' })
  .inputValidator((d: string) => d)
  .handler(async ({ data }) => {
    const todos = await readTodos()
    todos.push({ id: todos.length + 1, name: data })
    await fs.promises.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2))
    return todos
  })

export const Route = createFileRoute('/demo/start/server-funcs')({
  component: Home,
  loader: async () => await getTodos(), // Use in loader
})

function Home() {
  const router = useRouter()

  const submitTodo = async () => {
    await addTodo({ data: todo }) // Call from client
    router.invalidate() // Invalidate to refetch loader data
  }
}
```

### Pattern Highlights

- **Node.js APIs**: Full access to `fs`, `path`, etc.
- **Input validation**: Type-safe input with `.inputValidator()`
- **RPC-style**: Call server functions like regular async functions
- **Router invalidation**: Use `router.invalidate()` to refetch loaders
- **Type safety**: Fully typed inputs and outputs

### Middleware (Commented Example)

```tsx
const loggingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    console.log("Request:", request.url)
    return next()
  }
)

const loggedServerFunction = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware])
```

---

## 5. API Routes Pattern

**File**: `src/routes/demo/api/names.ts`

### Key Concepts

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/demo/api/names')({
  server: {
    handlers: {
      GET: () => json(['Alice', 'Bob', 'Charlie']),
    },
  },
})
```

### Pattern Highlights

- **File-based routing**: API route matches file path (`/demo/api/names`)
- **HTTP method handlers**: Define handlers for GET, POST, PUT, DELETE, etc.
- **JSON helper**: Use `json()` helper for JSON responses
- **Full Request/Response**: Access to Request and Response objects

### Example with POST

```tsx
export const Route = createFileRoute('/demo/api/tq-todos')({
  server: {
    handlers: {
      GET: () => json(todos),
      POST: async ({ request }) => {
        const body = await request.text()
        const todo = JSON.parse(body)
        todos.push({ id: todos.length + 1, name: todo })
        return json(todos)
      },
    },
  },
})
```

---

## 6. Router Configuration Pattern

**File**: `src/router.tsx`

### Key Concepts

```tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import {
  StartRoute,
  StartQueryClient,
} from '@tanstack/react-start'

export function createRouter() {
  const queryClient = new QueryClient()

  return createTanStackRouter({
    routeTree,
    context: {
      queryClient, // Share QueryClient across routes
    },
    defaultPreload: 'intent', // Preload on hover/focus
    Wrap: ({ children }) => (
      <StartQueryClient client={queryClient}>
        {children}
      </StartQueryClient>
    ),
  })
}
```

### Pattern Highlights

- **Shared QueryClient**: Pass QueryClient to all routes via context
- **Preload strategies**: `intent`, `viewport`, or `false`
- **SSR integration**: `StartQueryClient` handles SSR hydration

---

## Summary: When to Use Each Pattern

| Pattern | Use Case | SSR Support | Real-time |
|---------|----------|-------------|-----------|
| **Convex** | Real-time apps, collaborative features | ❌ No | ✅ Yes |
| **TanStack Query** | REST APIs, standard CRUD | ✅ Yes | ❌ No |
| **Server Functions** | Server-side logic, file system, DBs | ✅ Yes | ❌ No |
| **API Routes** | Public APIs, webhooks, third-party integrations | ✅ Yes | ❌ No |
| **SSR Loaders** | SEO-critical data, initial page load | ✅ Yes | ❌ No |

---

## Integration Examples

### Combining Patterns

You can mix patterns in the same app:

```tsx
// Use Convex for real-time chat
const messages = useQuery(api.messages.list) // Convex

// Use TanStack Query for REST API
const { data: weather } = useQuery({
  queryKey: ['weather'],
  queryFn: () => fetch('/api/weather').then(r => r.json())
})

// Use server functions for file uploads
const uploadFile = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    await fs.promises.writeFile(`uploads/${data.name}`, data.content)
  })
```

### Best Practices

1. **Convex**: Use for real-time features (chat, collaboration, notifications)
2. **TanStack Query**: Use for external APIs and non-real-time data
3. **Server Functions**: Use for server-side logic (file system, email, etc.)
4. **API Routes**: Use for public-facing APIs and webhooks
5. **SSR Loaders**: Use for SEO-critical data and initial page loads

---

## References

- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Start Docs](https://tanstack.com/start)
- [TanStack Query Docs](https://tanstack.com/query)
- [Convex Docs](https://docs.convex.dev)
