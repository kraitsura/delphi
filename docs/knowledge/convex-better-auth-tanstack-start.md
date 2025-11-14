# Integrating Convex with Better Auth in TanStack Start

Complete guide for implementing full-stack authentication using Convex, Better Auth, and TanStack Start.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites & Installation](#prerequisites--installation)
4. [Backend Configuration (Convex)](#backend-configuration-convex)
5. [Frontend Configuration (TanStack Start)](#frontend-configuration-tanstack-start)
6. [Authentication Flows](#authentication-flows)
7. [Server-Side vs Client-Side Patterns](#server-side-vs-client-side-patterns)
8. [Route Protection](#route-protection)
9. [Complete Examples](#complete-examples)
10. [Common Gotchas](#common-gotchas)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This integration combines three powerful technologies:

- **Convex**: Backend-as-a-service with real-time database and server functions
- **Better Auth**: Modern, framework-agnostic authentication library
- **TanStack Start**: Full-stack React framework with SSR and file-based routing

### Key Features

- ✅ Server-side session management via Convex
- ✅ Client-side authentication hooks
- ✅ OAuth (Google, GitHub, etc.) support
- ✅ Email/password authentication
- ✅ SSR support with session persistence
- ✅ Type-safe authentication flows
- ✅ Real-time session updates

---

## Architecture

### Authentication Flow Diagram

```
┌─────────────────────┐
│  TanStack Start     │
│   Frontend          │
│  (React Router)     │
└──────────┬──────────┘
           │
           │ /api/auth/*
           ↓
┌─────────────────────┐
│ reactStartHandler   │
│   (Proxy Layer)     │
└──────────┬──────────┘
           │
           │ Proxies to Convex
           ↓
┌─────────────────────┐
│  Convex Backend     │
│  HTTP Routes        │
│  (convex/http.ts)   │
└──────────┬──────────┘
           │
           │ Better Auth
           ↓
┌─────────────────────┐
│  Convex Database    │
│  (Auth Tables)      │
│  - user             │
│  - session          │
│  - account          │
│  - verification     │
└─────────────────────┘
```

### Key Architectural Decisions

1. **OAuth callbacks go to Convex backend, not frontend**
   - Redirect URI: `https://your-deployment.convex.cloud/api/auth/callback/google`
   - Convex handles the callback and creates session
   - User redirected to frontend with session cookie

2. **Session storage in Convex database**
   - Better Auth stores sessions in Convex tables
   - Managed automatically by the Better Auth Convex component

3. **Query pausing with `expectAuth: true`**
   - Prevents race conditions
   - Waits for auth to load before executing queries
   - Essential for protected data

4. **SSR authentication**
   - Session fetched server-side in route loaders
   - Token set on Convex client for SSR queries
   - Prevents flash of unauthenticated content

---

## Prerequisites & Installation

### Minimum Requirements

- **Node.js**: 18+
- **Convex**: 1.25.0+ (recommended: latest)
- **Better Auth**: 1.3.27 (exact version recommended)

### Installation

```bash
# Install Better Auth (exact version)
npm install better-auth@1.3.27 --save-exact

# Install Convex and Better Auth integration
npm install convex@latest @convex-dev/better-auth

# Install Convex React Query integration (for TanStack Start)
npm install @convex-dev/react-query
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "better-auth": "1.3.27",
    "convex": "^1.27.3",
    "@convex-dev/better-auth": "latest",
    "@convex-dev/react-query": "0.0.0-alpha.11",
    "@tanstack/react-router": "latest",
    "@tanstack/react-start": "latest"
  }
}
```

---

## Backend Configuration (Convex)

### Step 1: Register Better Auth Component

**File: `convex/convex.config.ts`**

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

### Step 2: Create Auth Configuration

**File: `convex/auth.config.ts`**

```typescript
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

> **Important**: Use `CONVEX_SITE_URL` (`.convex.site` domain), not `CONVEX_URL` (`.convex.cloud`)

### Step 3: Create Better Auth Instance

**File: `convex/auth.ts`**

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

// Create the auth component client
export const authComponent = createClient<DataModel>(components.betterAuth);

// Create Better Auth instance
export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true for production
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      // Add other providers as needed
      // github: {
      //   clientId: process.env.GITHUB_CLIENT_ID!,
      //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // },
    },
    plugins: [convex()], // Required for Convex integration
  });
};

// Helper query to get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
```

### Step 4: Register HTTP Routes

**File: `convex/http.ts`**

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth HTTP routes
authComponent.registerRoutes(http, createAuth);

// Add other HTTP routes here
// http.route({
//   path: "/custom-endpoint",
//   method: "GET",
//   handler: async (request, ctx) => {
//     return new Response("Hello");
//   },
// });

export default http;
```

### Step 5: Set Environment Variables

Generate a secure secret and set environment variables in Convex:

```bash
# Generate a secure random secret
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Set your site URL (where your frontend runs)
npx convex env set SITE_URL http://localhost:3000

# For production
# npx convex env set SITE_URL https://your-production-domain.com

# For OAuth providers
npx convex env set GOOGLE_CLIENT_ID=your_google_client_id
npx convex env set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Backend `.env` file (for reference):**

```bash
CONVEX_DEPLOYMENT=dev:adjective-animal-123
CONVEX_URL=https://adjective-animal-123.convex.cloud
SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-generated-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Frontend Configuration (TanStack Start)

### Step 1: Create Auth Client

**File: `src/lib/auth.ts`**

```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  // Do NOT set baseURL - auth requests go through /api/auth/* proxy
  plugins: [convexClient()],
});

// Export hooks for convenience
export const {
  useSession,
  signIn,
  signUp,
  signOut
} = authClient;
```

> **Critical**: Do not set `baseURL` on the auth client. Auth requests automatically route through `/api/auth/*` which proxies to Convex.

### Step 2: Create API Route Handler

**File: `src/routes/api/auth/$.ts`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { reactStartHandler } from '@convex-dev/better-auth/react-start';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return reactStartHandler(request);
      },
      POST: async ({ request }) => {
        return reactStartHandler(request);
      },
    },
  },
});
```

This route catches all requests to `/api/auth/*` and proxies them to your Convex backend.

### Step 3: Configure Convex Provider

**File: `src/integrations/convex/provider.tsx`**

```typescript
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import { authClient } from '@/lib/auth';

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error('Missing environment variable: VITE_CONVEX_URL');
}

// Create Convex client with auth expectations
const convexClient = new ConvexReactClient(CONVEX_URL, {
  expectAuth: true, // Pauses queries until auth is ready
});

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

> **Important**: Use `ConvexBetterAuthProvider`, not the regular `ConvexProvider`

### Step 4: Update Root Route with SSR Auth

**File: `src/routes/__root.tsx`**

```typescript
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router';
import { createServerFn, getCookie, getRequest } from '@tanstack/react-start/server';
import { fetchSession, getCookieName } from '@convex-dev/better-auth/react-start';

import ConvexProvider from '../integrations/convex/provider';
import type { QueryClient } from '@tanstack/react-query';

interface MyRouterContext {
  queryClient: QueryClient;
  userId?: string;
  token?: string;
}

// Server function to fetch auth session
const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { createAuth } = await import('../../convex/auth');
  const { session } = await fetchSession(getRequest());
  const sessionCookieName = getCookieName(createAuth);
  const token = getCookie(sessionCookieName);
  return { userId: session?.user.id, token };
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),

  // SSR authentication
  beforeLoad: async () => {
    const { userId, token } = await fetchAuth();
    return { userId, token };
  },

  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider>
          <Outlet />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

### Step 5: Create Server Auth Utilities

**File: `src/lib/auth-server.ts`**

```typescript
import { createAuth } from '../../convex/auth';
import { setupFetchClient } from '@convex-dev/better-auth/react-start';
import { getCookie } from '@tanstack/react-start/server';

// Setup fetch client for server-side Convex operations
export const { fetchQuery, fetchMutation, fetchAction } =
  await setupFetchClient(createAuth, getCookie);
```

### Step 6: Set Frontend Environment Variables

**File: `.env` or `.env.local`**

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_SITE_URL=http://localhost:3000
```

**File: `.env.example`**

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_SITE_URL=http://localhost:3000
```

---

## Authentication Flows

### Sign Up with Email/Password

**Client-side component:**

```typescript
import { authClient } from '@/lib/auth';
import { useState } from 'react';

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: '/dashboard',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### Sign In with Email/Password

```typescript
import { authClient } from '@/lib/auth';

export function SignInForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await authClient.signIn.email({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        callbackURL: '/dashboard',
      });
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### OAuth Sign In (Google)

```typescript
import { authClient } from '@/lib/auth';

export function GoogleSignIn() {
  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    });
  };

  return (
    <button onClick={handleGoogleSignIn}>
      Sign in with Google
    </button>
  );
}
```

**OAuth Setup:**

1. Configure OAuth redirect URI in your provider (Google, GitHub, etc.):
   ```
   https://your-deployment.convex.cloud/api/auth/callback/google
   ```

2. Set environment variables in Convex:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID=your_client_id
   npx convex env set GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Sign Out

```typescript
import { authClient } from '@/lib/auth';
import { useNavigate } from '@tanstack/react-router';

export function SignOutButton() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: '/auth/sign-in' });
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Get Session (Client-Side)

```typescript
import { useSession } from '@/lib/auth';

export function UserProfile() {
  const { data: session, isPending, error } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading session</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h2>Welcome, {session.user.name}!</h2>
      <p>Email: {session.user.email}</p>
      <img src={session.user.image} alt="Profile" />
    </div>
  );
}
```

### Get Session (Server-Side)

```typescript
import { createServerFn } from '@tanstack/react-start';
import { fetchSession } from '@convex-dev/better-auth/react-start';
import { getRequest } from '@tanstack/react-start/server';

const getServerUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { session } = await fetchSession(getRequest());

  if (!session) {
    throw new Error('Not authenticated');
  }

  return session.user;
});

// Use in component
export function ServerUserProfile() {
  const user = getServerUser.useServerAction();
  // ...
}
```

---

## Server-Side vs Client-Side Patterns

### Client-Side (React Components)

Use the auth client hooks directly in React components:

```typescript
import { useSession, authClient } from '@/lib/auth';

function ClientComponent() {
  const { data: session, isPending } = useSession();

  // Direct client usage
  const handleAction = async () => {
    await authClient.signOut();
  };

  return <div>{session?.user.name}</div>;
}
```

### Server-Side (Server Functions)

Use `setupFetchClient` for Convex operations in server functions:

```typescript
import { createServerFn } from '@tanstack/react-start';
import { fetchMutation } from '@/lib/auth-server';
import { api } from '../../convex/_generated/api';

export const updateUserProfile = createServerFn({ method: 'POST' })
  .validator((data) => {
    return { name: String(data.name) };
  })
  .handler(async ({ data }) => {
    // This automatically includes auth context
    await fetchMutation(api.users.updateProfile, {
      name: data.name,
    });
    return { success: true };
  });
```

### Convex Mutations with Auth Context

**File: `convex/users.ts`**

```typescript
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { createAuth, authComponent } from './auth';

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Update user profile
    await ctx.db.patch(user._id, {
      name: args.name,
    });

    return { success: true };
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Get auth context with headers
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    // Use Better Auth API
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });

    return { success: true };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      return null;
    }

    return user;
  },
});
```

---

## Route Protection

### Protect Individual Routes

```typescript
// src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    if (!context.userId) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: '/dashboard',
        },
      });
    }
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  return <div>Protected Dashboard</div>;
}
```

### Global Route Protection

Protect multiple routes from the root:

```typescript
// src/routes/__root.tsx
beforeLoad: async (ctx) => {
  const { userId } = await fetchAuth();

  // Define public routes
  const publicRoutes = ['/auth/sign-in', '/auth/sign-up', '/'];
  const isPublicRoute = publicRoutes.includes(ctx.location.pathname);

  // Redirect to sign-in if not authenticated and accessing protected route
  if (!userId && !isPublicRoute) {
    throw redirect({
      to: '/auth/sign-in',
      search: {
        redirect: ctx.location.pathname,
      },
    });
  }

  return { userId };
}
```

### Handle Redirect After Sign In

```typescript
// src/routes/auth/sign-in.tsx
import { useNavigate, useSearch } from '@tanstack/react-router';
import { authClient } from '@/lib/auth';

export function SignInPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/sign-in' });

  const handleSignIn = async (email: string, password: string) => {
    await authClient.signIn.email({
      email,
      password,
      callbackURL: search.redirect || '/dashboard',
    });
  };

  // ...
}
```

### Server-Side Authorization

```typescript
import { createServerFn } from '@tanstack/react-start';
import { fetchSession } from '@convex-dev/better-auth/react-start';
import { getRequest } from '@tanstack/react-start/server';

const protectedAction = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const { session } = await fetchSession(getRequest());

    if (!session) {
      throw new Error('Unauthorized');
    }

    // Proceed with authorized action
    return { success: true };
  });
```

---

## Complete Examples

### Example 1: Protected Dashboard

```typescript
// src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSession, authClient } from '@/lib/auth';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: '/auth/sign-in' });
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const { data: session } = useSession();
  const userProfile = useQuery(api.users.getMyProfile);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = '/auth/sign-in';
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <button onClick={handleSignOut}>Sign Out</button>
      </header>

      <section className="user-info">
        <h2>User Information</h2>
        {session && (
          <div>
            <p><strong>Name:</strong> {session.user.name}</p>
            <p><strong>Email:</strong> {session.user.email}</p>
            {session.user.image && (
              <img src={session.user.image} alt="Profile" />
            )}
          </div>
        )}
      </section>

      <section className="profile">
        <h2>Convex Profile Data</h2>
        {userProfile ? (
          <pre>{JSON.stringify(userProfile, null, 2)}</pre>
        ) : (
          <p>Loading profile...</p>
        )}
      </section>
    </div>
  );
}
```

### Example 2: Server Function with Auth

```typescript
// src/lib/auth-server.ts
import { createAuth } from '../../convex/auth';
import { setupFetchClient } from '@convex-dev/better-auth/react-start';
import { getCookie } from '@tanstack/react-start/server';

export const { fetchQuery, fetchMutation, fetchAction } =
  await setupFetchClient(createAuth, getCookie);

// src/actions/profile.ts
import { createServerFn } from '@tanstack/react-start';
import { fetchMutation } from '@/lib/auth-server';
import { api } from '../../convex/_generated/api';

export const updateProfileName = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data');
    }
    const { name } = data as { name: string };
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Name is required');
    }
    return { name };
  })
  .handler(async ({ data }) => {
    await fetchMutation(api.users.updateProfile, {
      name: data.name,
    });
    return { success: true };
  });

// Use in component
import { updateProfileName } from '@/actions/profile';

function ProfileForm() {
  const updateMutation = updateProfileName.useServerAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;

    const result = await updateMutation({ data: { name } });
    if (result.success) {
      alert('Profile updated!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Your name" required />
      <button type="submit">Update Name</button>
    </form>
  );
}
```

### Example 3: Multi-Provider Auth Page

```typescript
// src/routes/auth/sign-in.tsx
import { createFileRoute } from '@tanstack/react-router';
import { authClient } from '@/lib/auth';
import { useState } from 'react';

export const Route = createFileRoute('/auth/sign-in')({
  component: SignInPage,
});

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authClient.signIn.email({
        email,
        password,
        callbackURL: '/dashboard',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    });
  };

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/dashboard',
    });
  };

  return (
    <div className="auth-page">
      <h1>Sign In</h1>

      <form onSubmit={handleEmailSignIn}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In with Email'}
        </button>
      </form>

      <div className="divider">OR</div>

      <div className="social-providers">
        <button onClick={handleGoogleSignIn}>
          Sign in with Google
        </button>
        <button onClick={handleGitHubSignIn}>
          Sign in with GitHub
        </button>
      </div>

      <p>
        Don't have an account? <a href="/auth/sign-up">Sign up</a>
      </p>
    </div>
  );
}
```

---

## Common Gotchas

### 1. Don't Set baseURL on authClient

```typescript
// ❌ WRONG
createAuthClient({
  baseURL: convexUrl,
  plugins: [convexClient()],
})

// ✅ CORRECT
createAuthClient({
  plugins: [convexClient()],
})
```

Auth requests automatically route through `/api/auth/*`.

### 2. Use CONVEX_SITE_URL, Not CONVEX_URL

```typescript
// auth.config.ts
export default {
  providers: [
    {
      // ✅ CORRECT - uses .convex.site
      domain: process.env.CONVEX_SITE_URL,

      // ❌ WRONG - uses .convex.cloud
      // domain: process.env.CONVEX_URL,
    },
  ],
};
```

### 3. OAuth Callbacks Point to Convex Backend

Configure OAuth redirect URIs to point to your Convex deployment:

```
✅ CORRECT:
https://your-deployment.convex.cloud/api/auth/callback/google

❌ WRONG:
http://localhost:3000/api/auth/callback/google
```

### 4. Environment Variables Must Match

```bash
# Backend (Convex)
SITE_URL=http://localhost:3000

# Frontend
VITE_SITE_URL=http://localhost:3000

# These MUST be the same!
```

### 5. Use ConvexBetterAuthProvider

```typescript
// ✅ CORRECT
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';

<ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
  {children}
</ConvexBetterAuthProvider>

// ❌ WRONG
import { ConvexProvider } from 'convex/react';

<ConvexProvider client={convexClient}>
  {children}
</ConvexProvider>
```

### 6. Query Pausing Requires expectAuth

```typescript
// ✅ CORRECT
new ConvexReactClient(CONVEX_URL, {
  expectAuth: true, // Waits for auth before querying
})

// ❌ WRONG (may cause race conditions)
new ConvexReactClient(CONVEX_URL)
```

### 7. Server Functions Need setupFetchClient

```typescript
// ✅ CORRECT (TanStack Start)
import { setupFetchClient } from '@convex-dev/better-auth/react-start';

// ❌ WRONG (from Next.js docs)
import { getToken } from '@convex-dev/better-auth/nextjs';
```

Each framework has its own integration package.

### 8. Better Auth Plugin is Required

```typescript
// ✅ CORRECT
betterAuth({
  // ...
  plugins: [convex()], // Required!
})

// ❌ WRONG
betterAuth({
  // ...
  // Missing plugins
})
```

---

## Troubleshooting

### Issue: "Failed to fetch session"

**Cause**: Auth cookie not being set or read correctly.

**Solution**:
1. Check that `SITE_URL` matches between frontend and backend
2. Ensure you're using `https` in production
3. Check cookie settings in browser DevTools

### Issue: OAuth redirect fails

**Cause**: Incorrect redirect URI configuration.

**Solution**:
1. Set redirect URI in OAuth provider to: `https://your-deployment.convex.cloud/api/auth/callback/google`
2. NOT your frontend URL
3. Verify environment variables are set in Convex

### Issue: Queries run before auth loads

**Cause**: Missing `expectAuth: true` setting.

**Solution**:
```typescript
new ConvexReactClient(CONVEX_URL, {
  expectAuth: true, // Add this!
})
```

### Issue: "Not authenticated" in Convex mutations

**Cause**: Auth context not being passed correctly.

**Solution**:
1. Use `authComponent.getAuthUser(ctx)` in mutations
2. Ensure frontend is using `ConvexBetterAuthProvider`
3. Check that session cookie is being sent

### Issue: TypeScript errors with auth

**Cause**: Missing generated types.

**Solution**:
```bash
# Regenerate Convex types
npx convex dev

# Or
npx convex codegen
```

### Issue: Changes not reflecting

**Cause**: Better Auth component not rebuilt.

**Solution**:
```bash
# Restart Convex dev server
npx convex dev

# Component will rebuild automatically
```

---

## Best Practices

### 1. Error Handling

Always wrap auth operations in try/catch:

```typescript
try {
  await authClient.signIn.email({ email, password });
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  setError(message);
}
```

### 2. Loading States

Show appropriate loading states during auth operations:

```typescript
const { data: session, isPending } = useSession();

if (isPending) {
  return <LoadingSpinner />;
}
```

### 3. Redirect Handling

Store intended destination before redirecting to sign-in:

```typescript
// Before redirect
throw redirect({
  to: '/auth/sign-in',
  search: { redirect: '/protected-page' },
});

// After sign in
await authClient.signIn.email({
  email,
  password,
  callbackURL: searchParams.redirect || '/dashboard',
});
```

### 4. Type Safety

Use generated types from Convex:

```typescript
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const user: Id<"user"> = session.user.id;
```

### 5. Security

- Never commit `.env` files
- Use strong secrets (32+ characters)
- Enable email verification in production
- Validate all inputs
- Use HTTPS in production

### 6. Testing

Mock auth in tests:

```typescript
// Test utilities
export function mockAuthSession(user: Partial<User>) {
  return {
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        ...user,
      },
      session: { /* ... */ },
    },
    isPending: false,
    error: null,
  };
}
```

---

## Additional Resources

- [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)
- [Better Auth TanStack Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [Convex Better Auth Guide](https://convex-better-auth.netlify.app/framework-guides/tanstack-start)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Convex Documentation](https://docs.convex.dev)

---

## Quick Reference Checklist

### Backend Setup
- [ ] Install dependencies: `better-auth`, `convex`, `@convex-dev/better-auth`
- [ ] Register Better Auth component in `convex.config.ts`
- [ ] Create `convex/auth.config.ts`
- [ ] Create `convex/auth.ts` with Better Auth instance
- [ ] Register routes in `convex/http.ts`
- [ ] Set environment variables: `BETTER_AUTH_SECRET`, `SITE_URL`, OAuth credentials

### Frontend Setup
- [ ] Create `src/lib/auth.ts` with auth client
- [ ] Create `src/routes/api/auth/$.ts` route handler
- [ ] Update Convex provider to use `ConvexBetterAuthProvider`
- [ ] Add SSR auth to `__root.tsx`
- [ ] Create `src/lib/auth-server.ts` for server functions
- [ ] Set environment variables: `VITE_CONVEX_URL`, `VITE_SITE_URL`
- [ ] Create sign-in/sign-up pages

### OAuth Setup (Optional)
- [ ] Configure OAuth app (Google, GitHub, etc.)
- [ ] Set redirect URI to Convex backend: `https://your-deployment.convex.cloud/api/auth/callback/provider`
- [ ] Set OAuth credentials in Convex environment variables

---

## Summary

This integration provides a robust, type-safe authentication solution with:

- **Server-side session management** via Convex
- **Multiple authentication methods** (email/password, OAuth)
- **SSR support** for authenticated pages
- **Real-time updates** through Convex subscriptions
- **Type safety** with generated TypeScript types

Follow this guide step-by-step to implement authentication in your TanStack Start application using Convex and Better Auth.
