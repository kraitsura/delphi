# Auth & Data Access Patterns Reference

> Comprehensive guide for TanStack Start + Convex + Better Auth patterns used in this project

## Table of Contents
1. [Auth Setup](#1-auth-setup--configuration)
2. [Authentication Flows](#2-authentication-flows)
3. [Data Fetching](#3-data-fetching-patterns)
4. [Route Protection](#4-route-protection)
5. [Mutations](#5-data-mutations)
6. [Real-Time](#6-real-time-patterns)
7. [Performance](#7-performance-best-practices)
8. [Gotchas](#8-common-gotchas)
9. [Pattern Guide](#9-pattern-selection-guide)
10. [Checklist](#10-implementation-checklist)

---

## 1. Auth Setup & Configuration

### Backend (Convex)

**Key Pattern:** Per-request auth validation (confirmed best practice for SSR)

```typescript
// convex/auth.ts - Core auth instance
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx, { optionsOnly } = { optionsOnly: false }) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx), // Store sessions in Convex DB
    emailAndPassword: { enabled: true },
    socialProviders: { google: { clientId, clientSecret } },
    plugins: [convex()], // REQUIRED for Convex integration!
  });
};
```

**Environment Variables:**
```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32)  # Generate secure secret
SITE_URL=http://localhost:3000                 # Frontend URL
CONVEX_SITE_URL=https://your-app.convex.site  # Backend URL
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Frontend (TanStack Start)

```typescript
// src/lib/auth.ts - Client-side auth
export const authClient = createAuthClient({
  // ✅ DO: Let it route through /api/auth/* proxy automatically
  // ❌ DON'T: Set baseURL - causes CORS issues
  plugins: [convexClient()],
});

// src/integrations/convex/provider.tsx
const convexClient = new ConvexReactClient(CONVEX_URL, {
  expectAuth: true, // ✅ Pauses queries until auth ready (critical for SSR)
});

// ✅ DO: Use ConvexBetterAuthProvider
// ❌ DON'T: Use plain ConvexProvider
<ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
  {children}
</ConvexBetterAuthProvider>
```

**SSR Auth Integration:**
```typescript
// src/routes/__root.tsx - Validates auth on EVERY request
const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { session } = await fetchSession(getRequest());
  const token = getCookie(getCookieName(createAuth));
  return {
    userId: session?.user.id,
    token // Pass to Convex queries
  };
});

export const Route = createRootRoute({
  beforeLoad: async (ctx) => {
    const { userId, token } = await fetchAuth(); // ✅ Validates every navigation
    return { userId, token };
  },
});
```

---

## 2. Authentication Flows

### Client-Side Auth

```typescript
// Sign Up
await authClient.signUp.email({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secure-password',
  callbackURL: '/dashboard', // Redirect after sign up
});

// Sign In (Email + Password)
await authClient.signIn.email({
  email: 'john@example.com',
  password: 'secure-password',
  callbackURL: '/dashboard',
});

// Sign In (OAuth)
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
});

// Sign Out
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => router.navigate({ to: '/auth/sign-in' }),
  },
});

// Get Current Session
const { data: session, isPending, error } = useSession();
if (session) {
  console.log(session.user.name, session.user.email);
}
```

### Server-Side Auth (in Route Loaders)

```typescript
// src/lib/auth-server.ts - Server-side utilities
export const { fetchQuery, fetchMutation, fetchAction } =
  await setupFetchClient(createAuth, getCookie);

// Usage in server functions
const updateProfile = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    // ✅ Auth context automatically available
    await fetchMutation(api.users.updateProfile, data);
  });
```

### Convex Functions with Auth

```typescript
// convex/users.ts - Authenticated query
export const getMyProfile = query({
  handler: async (ctx) => {
    // Get authenticated user (throws if not authed)
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error('Unauthenticated');

    return await ctx.db.get(user.id);
  },
});

// Using Better Auth API in mutations
export const changePassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});
```

---

## 3. Data Fetching Patterns

### Client-Side: Real-Time Queries

```typescript
// Basic Convex query - auto-subscribes to updates
const messages = useQuery(api.messages.list);
// ✅ Real-time updates pushed automatically
// ✅ No polling needed
// ✅ Automatic invalidation when data changes

// With arguments
const event = useQuery(api.events.getById, {
  eventId: eventId as Id<"events">
});

// Conditional query (skip when param missing)
const event = useQuery(
  api.events.getById,
  eventId ? { eventId: eventId as Id<"events"> } : "skip"
);
```

### Server-Side: SSR Data Fetching

**Pattern:** Prefetch in loader + useSuspenseQuery in component

```typescript
// ✅ Recommended SSR pattern (what we implemented)
export const Route = createFileRoute('/_authed/events/$eventId')({
  loader: async ({ params, context }) => {
    const eventId = params.eventId as Id<"events">;

    // Prefetch data on server with auth context
    await context.queryClient.ensureQueryData(
      convexQuery(api.events.getById, { eventId })
    );

    await context.queryClient.ensureQueryData(
      convexQuery(api.events.getStats, { eventId })
    );
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();

  // ✅ Reads prefetched data immediately (no loading state)
  // ✅ Auto-subscribes to real-time updates after hydration
  const { data: event } = useSuspenseQuery(
    convexQuery(api.events.getById, {
      eventId: eventId as Id<"events">
    })
  );

  const { data: stats } = useSuspenseQuery(
    convexQuery(api.events.getStats, {
      eventId: eventId as Id<"events">
    })
  );

  // No need for loading checks - Suspense handles it
  return <div>{event.name}</div>;
}
```

**What Happens:**
1. **Server**: Loader prefetches with auth → renders with data
2. **HTML**: Sent to client with embedded data
3. **Client**: Hydrates instantly (no loading state)
4. **Live**: Auto-subscribes for real-time updates

### SSR Mode Selection

```typescript
// Full SSR - Server renders everything
ssr: true

// Data-only SSR - Fetch on server, render on client
ssr: 'data-only' // Use for: canvas, WebGL, browser-only libraries

// Client-only - No SSR
ssr: false // Use when using Convex useQuery without TanStack Query
```

---

## 4. Route Protection

### Per-Route Protection

```typescript
export const Route = createFileRoute('/_authed/dashboard')({
  beforeLoad: async ({ context, location }) => {
    if (!context.userId) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: location.pathname // Return to this page after login
        },
      });
    }
    return { userId: context.userId };
  },
});
```

### Global Protection (Recommended)

```typescript
// src/routes/_authed.tsx - Layout protecting all child routes
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    if (!context.userId) {
      throw redirect({
        to: '/auth/sign-in',
        search: { redirect: location.pathname },
      });
    }
    return { userId: context.userId }; // Pass down to children
  },
  component: AuthenticatedLayout,
});

// All routes under _authed/ directory are now protected
// Example: _authed/dashboard.tsx, _authed/events/$eventId.tsx
```

---

## 5. Data Mutations

### Client-Side Mutations

```typescript
// Basic mutation
const addTask = useMutation(api.tasks.create);

async function handleSubmit() {
  await addTask({
    title: 'New task',
    eventId: eventId as Id<"events">,
  });
  // ✅ All subscribed queries auto-refresh!
  // ✅ No manual invalidation needed
}
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: async (text: string) => {
    return await sendMessage({ channelId, text });
  },

  onMutate: async (text) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

    // Snapshot current state
    const previous = queryClient.getQueryData(['messages', channelId]);

    // Optimistically update UI
    queryClient.setQueryData(['messages', channelId], (old: any) => [
      ...old,
      {
        _id: 'optimistic-' + Date.now(), // Temporary ID
        text,
        authorId: currentUserId,
        createdAt: Date.now(),
      }
    ]);

    return { previous }; // For rollback
  },

  onError: (err, text, context) => {
    // Rollback on failure
    queryClient.setQueryData(['messages', channelId], context.previous);
  },

  onSettled: () => {
    // ✅ Convex pushes real update automatically
    // ❌ DON'T manually refetch - Convex handles it!
  }
});
```

### Server Functions + Convex

```typescript
// src/routes/payments.ts - Server function
import { fetchMutation } from '@/lib/auth-server';

export const processPayment = createServerFn('POST')
  .handler(async (data: PaymentData, { request }) => {
    // Server-only: External API call
    const paymentResult = await stripe.charges.create({
      amount: data.amount,
      currency: 'usd',
      source: data.token,
    });

    // Store result in Convex
    await fetchMutation(api.payments.record, {
      userId: data.userId,
      amount: data.amount,
      stripeChargeId: paymentResult.id,
    });

    return { success: true };
  });
```

**Decision Guide:**
- **Convex Mutations**: Database operations, real-time updates
- **Server Functions**: External APIs, file system, sensitive operations

---

## 6. Real-Time Patterns

### Push-Based Updates (vs Polling)

```typescript
// ❌ Traditional API - Wasteful polling
const { data } = useQuery({
  queryKey: ['messages'],
  queryFn: fetchMessages,
  refetchInterval: 1000, // Polls every second!
});

// ✅ Convex - Efficient push updates
const { data } = useConvexQuery(api.messages.list, { channelId });
// Auto-updates when server data changes
// Zero network overhead when data is stable
```

### Automatic Query Deduplication

```typescript
// Multiple components using same query = single subscription
function Header() {
  const user = useConvexQuery(api.users.current); // Query 1
}

function Sidebar() {
  const user = useConvexQuery(api.users.current); // Shares Query 1
}

function Dashboard() {
  const user = useConvexQuery(api.users.current); // Shares Query 1
}

// ✅ Only ONE Convex subscription for all three components
// ✅ All three update simultaneously when data changes
```

### Consistent Data Snapshots

```typescript
// All queries see consistent, transactional data
const user = useConvexQuery(api.users.current);
const posts = useConvexQuery(api.posts.byUser, { userId: user?._id });
const stats = useConvexQuery(api.stats.forUser, { userId: user?._id });

// When user updates:
// ✅ All three queries update at the SAME time
// ✅ Never see inconsistent state between them
// ✅ Guaranteed transactional consistency
```

---

## 7. Performance Best Practices

### QueryClient Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // ✅ CRITICAL for Convex queries
      // Why? Convex pushes updates, so data never goes stale

      gcTime: 5000, // Cache for 5s after unmount

      refetchOnWindowFocus: false, // ✅ Convex pushes updates
      refetchOnReconnect: false,   // ✅ Convex handles reconnect

      retry: 3, // Retry failed queries
    },
  },
});
```

### Avoid N+1 Query Problem

```typescript
// ❌ BAD: N+1 queries
function PostList() {
  const posts = useConvexQuery(api.posts.list);
  return posts?.map(post => <PostCard post={post} />);
}

function PostCard({ post }) {
  // Separate query for EACH post!
  const author = useConvexQuery(api.users.get, { id: post.authorId });
  return <div>{author?.name}: {post.title}</div>;
}

// ✅ GOOD: Fetch relations in single query
export const listPostsWithAuthors = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query('posts').take(20);

    // Batch fetch all unique authors
    const authorIds = [...new Set(posts.map(p => p.authorId))];
    const authors = await Promise.all(
      authorIds.map(id => ctx.db.get(id))
    );
    const authorMap = new Map(authors.map(a => [a._id, a]));

    // Combine data
    return posts.map(post => ({
      ...post,
      author: authorMap.get(post.authorId)
    }));
  }
});
```

### Split Hot and Cold Data

```typescript
// ❌ BAD: Mixed hot/cold data causes unnecessary rerenders
defineTable('users', {
  name: v.string(),        // Cold - changes rarely
  email: v.string(),       // Cold
  lastSeen: v.number(),    // Hot - changes every few seconds!
});

// ✅ GOOD: Separate tables
defineTable('users', {
  name: v.string(),
  email: v.string(),
});

defineTable('user_activity', {
  userId: v.id('users'),
  lastSeen: v.number(),
  status: v.string(),
}).index('by_user', ['userId']);

// Now profile queries don't rerun when lastSeen updates!
```

### Implement Pagination

```typescript
// Convex function
export const listPosts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query('posts').paginate(args.paginationOpts);
  }
});

// Component
function PostsList() {
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 20,
    cursor: null
  });

  const { data } = useConvexQuery(
    api.posts.listPosts,
    { paginationOpts }
  );

  const loadMore = () => {
    if (data?.continueCursor) {
      setPaginationOpts({
        numItems: 20,
        cursor: data.continueCursor
      });
    }
  };

  return (
    <div>
      {data?.page.map(post => <Post key={post._id} {...post} />)}
      {!data?.isDone && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

---

## 8. Common Gotchas

### Auth Configuration Errors

```typescript
// ❌ DON'T: Set baseURL on auth client
createAuthClient({
  baseURL: 'https://your-app.convex.cloud' // WRONG - causes CORS
})

// ✅ DO: Let it route through proxy
createAuthClient({
  plugins: [convexClient()] // Routes through /api/auth/*
})
```

```typescript
// ❌ DON'T: Use CONVEX_URL in auth.config.ts
domain: process.env.CONVEX_URL // WRONG - uses .convex.cloud

// ✅ DO: Use CONVEX_SITE_URL
domain: process.env.CONVEX_SITE_URL // CORRECT - uses .convex.site
```

```typescript
// ❌ DON'T: Use ConvexProvider
<ConvexProvider client={convexClient}>

// ✅ DO: Use ConvexBetterAuthProvider
<ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
```

```typescript
// ❌ DON'T: Forget expectAuth
new ConvexReactClient(CONVEX_URL)

// ✅ DO: Enable expectAuth for SSR
new ConvexReactClient(CONVEX_URL, { expectAuth: true })
```

### OAuth Configuration

```bash
# OAuth redirect URI points to CONVEX BACKEND, not frontend

# ✅ CORRECT
https://your-deployment.convex.cloud/api/auth/callback/google

# ❌ WRONG
http://localhost:3000/api/auth/callback/google
```

### Environment Variables Must Match

```bash
# Backend (.env.local in project root)
SITE_URL=http://localhost:3000

# Frontend (web/.env.local)
VITE_SITE_URL=http://localhost:3000

# ⚠️ These MUST be identical or auth breaks!
```

### SSR with Convex Queries

```typescript
// ❌ WRONG: Convex useQuery without SSR support
export const Route = createFileRoute('/messages')({
  ssr: true, // SSR enabled but...
});

function Messages() {
  // This fails during SSR - no auth token available!
  const messages = useQuery(api.messages.list);
}

// ✅ CORRECT: Use convexQuery + useSuspenseQuery for SSR
export const Route = createFileRoute('/messages')({
  ssr: true,
  loader: async ({ context }) => {
    // Prefetch with auth
    await context.queryClient.ensureQueryData(
      convexQuery(api.messages.list)
    );
  },
});

function Messages() {
  // Reads prefetched data, works with SSR
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.messages.list)
  );
}
```

---

## 9. Pattern Selection Guide

| Pattern | Use Case | SSR | Real-time | Auth |
|---------|----------|-----|-----------|------|
| **Convex `useQuery`** | Real-time features, client-only | ❌ No | ✅ Yes | ✅ Yes |
| **`convexQuery` + `useSuspenseQuery`** | Real-time with SSR | ✅ Yes | ✅ Yes | ✅ Yes |
| **TanStack `useQuery`** | External REST APIs | ✅ Yes | ❌ No | Manual |
| **Server Functions** | File system, Node APIs, external services | ✅ Yes | ❌ No | ✅ Yes |
| **Route Loaders** | Initial page data, SEO-critical content | ✅ Yes | ❌ No | ✅ Yes |

### When to Use Each

**Use `convexQuery` + `useSuspenseQuery` when:**
- You need SSR for SEO or performance
- You want instant page loads (data in HTML)
- You still need real-time updates after hydration
- ✅ **This is the recommended pattern for most pages**

**Use Convex `useQuery` when:**
- You don't need SSR (client-only app sections)
- You want the simplest code
- Real-time updates are critical

**Use Server Functions when:**
- Calling external APIs with sensitive keys
- Accessing file system or Node.js APIs
- Complex server-only business logic
- Sending emails, processing payments

---

## 10. Implementation Checklist

### Backend Setup

- [ ] Register Better Auth component in `convex.config.ts`
- [ ] Create `convex/auth.config.ts` with provider configuration
- [ ] Create `convex/auth.ts` with Better Auth instance
- [ ] Register auth routes in `convex/http.ts`
- [ ] Set environment variables:
  - [ ] `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
  - [ ] `SITE_URL` (frontend URL)
  - [ ] `CONVEX_SITE_URL` (backend .convex.site URL)
  - [ ] OAuth credentials (if using social login)

### Frontend Setup

- [ ] Create `src/lib/auth.ts` with auth client (NO baseURL!)
- [ ] Create `src/routes/api/auth/$.ts` proxy handler
- [ ] Create `src/integrations/convex/provider.tsx` with `ConvexBetterAuthProvider`
- [ ] Set `expectAuth: true` on ConvexReactClient
- [ ] Add SSR auth to `src/routes/__root.tsx` with `fetchAuth` function
- [ ] Create `src/lib/auth-server.ts` for server-side utilities
- [ ] Set environment variables:
  - [ ] `VITE_CONVEX_URL`
  - [ ] `VITE_SITE_URL` (must match backend `SITE_URL`)

### OAuth Configuration (if using)

- [ ] Create OAuth app with provider (Google, GitHub, etc.)
- [ ] Set redirect URI to Convex backend: `https://your-app.convex.cloud/api/auth/callback/[provider]`
- [ ] Add OAuth credentials to Convex environment variables
- [ ] Test OAuth flow in development and production

### Verification Steps

- [ ] Test sign up flow
- [ ] Test sign in flow (email and OAuth)
- [ ] Test sign out and session clearing
- [ ] Verify protected routes redirect to login
- [ ] Test SSR data fetching (view page source - should have data)
- [ ] Verify real-time updates work (open two tabs)
- [ ] Check that auth validates on every navigation (open DevTools Network tab)

---

## Quick Reference: Our EventContext Implementation

This is the production pattern we use throughout the app:

```typescript
// 1. Create context with SSR-compatible query
export function EventProvider({ children, userId }: EventProviderProps) {
  const params = useParams({ strict: false });
  const eventId = "eventId" in params ? params.eventId : null;

  // ✅ Uses useSuspenseQuery with convexQuery for SSR
  const { data: event } = useSuspenseQuery(
    eventId
      ? convexQuery(api.events.getById, { eventId: eventId as Id<"events"> })
      : { queryKey: ["no-event"], queryFn: () => Promise.resolve(null) }
  );

  // ... rest of provider logic
}

// 2. Add to _authed.tsx wrapped in Suspense
<Suspense fallback={<LoadingLayout />}>
  <EventProvider userId={userId}>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  </EventProvider>
</Suspense>

// 3. Prefetch in route loaders
export const Route = createFileRoute("/_authed/events/$eventId")({
  loader: async ({ params, context }) => {
    // Prefetch for EventContext
    await context.queryClient.ensureQueryData(
      convexQuery(api.events.getById, {
        eventId: params.eventId as Id<"events">
      })
    );
  },
});

// 4. Use in components
function MyComponent() {
  const { event, isInEventContext } = useEvent();
  // Data is available immediately, no loading state!
}
```

**Result:**
- ✅ SSR-compatible
- ✅ Instant page loads
- ✅ Real-time updates
- ✅ No authentication errors
- ✅ Works throughout the app

---

## Summary

**Key Takeaways:**

1. **Auth:** Per-request validation in `beforeLoad` (runs every navigation)
2. **SSR Data:** Prefetch in loaders + `useSuspenseQuery` in components
3. **Real-time:** Convex auto-pushes updates, no polling needed
4. **Performance:** Set `staleTime: Infinity`, avoid N+1, split hot/cold data
5. **Patterns:** Use `convexQuery` + `useSuspenseQuery` for most pages
6. **Protection:** Use `_authed.tsx` layout for global route protection
7. **Mutations:** Client mutations auto-refresh all subscribed queries

**When in Doubt:**
- ✅ Use the EventContext pattern as a reference
- ✅ Always prefetch auth data in route loaders for SSR
- ✅ Use `useSuspenseQuery` with `convexQuery` for SSR pages
- ✅ Keep `staleTime: Infinity` for Convex queries
- ✅ Let Convex handle invalidation (don't refetch manually)

This reference contains all patterns needed for building with TanStack Start + Convex + Better Auth. Refer to it when implementing new features.
