# Phase 1.1: Authentication & Authorization

> **Status:** ✅ 80% COMPLETE - Core auth working, helpers/guards pending
> **Last Updated:** January 2025
> **Prerequisites:** Phase 1.0 (Database Schema) ⚠️ Partially required (roles need schema)
> **Estimated Time:** 3-4 hours (1-2 hours remaining)

---

## Current Implementation Status

### ✅ Completed
- Email/password authentication fully working
- Google OAuth configured and functional
- Better Auth + Convex component integration
- Frontend: Sign-in/sign-up forms with Google button
- Frontend: User menu with sign-out
- Frontend: Basic route protection (dashboard)
- SSR authentication with session context
- Auth API proxy route (`/api/auth/*`)

### ❌ Not Yet Implemented
- `auth-helpers.ts` with RBAC functions
- Protected query/mutation wrappers
- Role-based access control (pending users schema)
- Standardized route guards utility
- User role assignment on signup

**Current Blocker:** Role system requires `users` table in schema (Phase 1.0)

---

## Table of Contents

1. [Overview](#overview)
2. [What's Already Working](#whats-already-working)
3. [Better Auth + Convex Integration](#better-auth--convex-integration)
4. [Google OAuth Provider](#google-oauth-provider)
5. [Role-Based Access Control](#role-based-access-control)
6. [Protected Query/Mutation Helpers](#protected-querymutation-helpers)
7. [Frontend Route Guards](#frontend-route-guards)
8. [Testing Authentication](#testing-authentication)
9. [Next Steps](#next-steps)

---

## Overview

This phase implements a complete authentication and authorization system using Better Auth with Convex. The core authentication is **already working** - users can sign up, sign in with email/password or Google OAuth, and access protected routes.

**What's Already Built:**
- ✅ Email/password + Google OAuth authentication
- ✅ Better Auth + Convex component integration
- ✅ Frontend auth forms and user menu
- ✅ Basic route protection
- ✅ SSR authentication context

**What Remains:**
- ❌ Role-based access control (RBAC) system
- ❌ Protected query/mutation wrappers
- ❌ Standardized route guards
- ❌ User role assignment on signup

**User Roles (To Be Implemented):**
- **Coordinator** - Event owner, full permissions
- **Collaborator** - Team member, can edit and manage
- **Guest** - Invited attendee, read-only access
- **Vendor** - Service provider, limited event access

---

## What's Already Working

### Backend (Convex)

**File: `/web/convex/auth.ts`** ✅
- Better Auth instance configured
- Email/password enabled
- Google OAuth provider configured
- `getCurrentUser` query available
- Convex plugin integrated

**File: `/web/convex/http.ts`** ✅
- Auth routes registered
- Handles `/api/auth/*` endpoints

**File: `/web/convex/convex.config.ts`** ✅
- Better Auth component registered

### Frontend

**Files: `/web/src/lib/auth.ts` and `/web/src/lib/auth-server.ts`** ✅
- Auth client with `useSession`, `signIn`, `signUp`, `signOut` hooks
- Server-side auth utilities (`fetchQuery`, `fetchMutation`, `fetchAction`)

**File: `/web/src/routes/api/auth/$.ts`** ✅
- API route handler that proxies to Convex

**Files: `/web/src/components/auth/*.tsx`** ✅
- `sign-in-form.tsx` - Email + Google OAuth button
- `sign-up-form.tsx` - Email + Google OAuth button
- `user-menu.tsx` - Dropdown with user info and sign-out

**File: `/web/src/routes/__root.tsx`** ✅
- `fetchAuth` server function for SSR
- `userId` and `token` provided via router context

**Protected Route Example:** `/web/src/routes/dashboard.tsx` ✅
```typescript
beforeLoad: async ({ context }) => {
  if (!context.userId) {
    throw redirect({ to: "/auth/sign-in" });
  }
},
```

---

## Better Auth + Convex Integration

### Complete Auth Configuration

Update `mono/packages/backend/convex/auth.ts`:

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
  ctx: GenericCtx<DataModel>,
  { optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),

    // Email/Password
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable in production!
    },

    // 🆕 OAuth Providers
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${siteUrl}/api/auth/callback/google`,
      },
      // Future: Add more providers
      // github: { ... },
      // microsoft: { ... },
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
    },

    plugins: [convex()],

    // 🆕 Callbacks for custom logic
    callbacks: {
      async afterSignUp({ user, account }) {
        // Create user profile in our schema
        const userId = user.id as any; // Better Auth ID

        // Default role for new users
        const defaultRole = "collaborator";

        // This would be a mutation call to create user profile
        // We'll implement this in Phase 1.2
      },
    },
  });
}

export { createAuth };

// Existing getCurrentUser query
export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  handler: async function (ctx, args) {
    return authComponent.getAuthUser(ctx);
  },
});

// 🆕 Get current user with role
export const getCurrentUserWithRole = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return null;

    // Fetch user profile with role
    const userProfile = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", authUser.email))
      .first();

    return {
      ...authUser,
      role: userProfile?.role || "guest",
      avatar: userProfile?.avatar,
      preferences: userProfile?.preferences,
    };
  },
});
```

### Environment Variables

Create or update `.env` in `mono/packages/backend/`:

```bash
# Site URL (update for production)
SITE_URL=http://localhost:3000
CONVEX_SITE_URL=http://localhost:3000

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Google OAuth (Get from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Session Security
SESSION_SECRET=generate-random-32-char-string
```

Create `.env.example`:

```bash
# Site Configuration
SITE_URL=http://localhost:3000
CONVEX_SITE_URL=http://localhost:3000

# Convex
CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Security
SESSION_SECRET=
```

---

## Google OAuth Provider

### Step 1: Get Credentials from Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create new project "Delphi"
3. Enable "Google+ API"
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy **Client ID** and **Client Secret**

### Step 2: Add to Environment Variables

Add to `.env`:

```bash
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

### Step 3: Frontend OAuth Buttons

Create `mono/apps/web/src/components/oauth-buttons.tsx`:

```typescript
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard", // Redirect after auth
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Show error toast
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className="w-full"
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google icon SVG */}
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </Button>
  );
}
```

### Step 4: Update Sign-In Form

Update `mono/apps/web/src/components/sign-in-form.tsx`:

```typescript
import { GoogleSignInButton } from "./oauth-buttons";

export function SignInForm() {
  return (
    <div className="space-y-4">
      {/* Existing email/password form */}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleSignInButton />
    </div>
  );
}
```

---

## Role-Based Access Control

### Auth Helper Functions

Create `mono/packages/backend/convex/auth-helpers.ts`:

```typescript
import { QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { Id } from "./_generated/dataModel";

/**
 * User roles in the system
 */
export type Role = "coordinator" | "collaborator" | "guest" | "vendor";

/**
 * Get authenticated user or throw error
 */
export async function getAuthUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new Error("Unauthorized: No authenticated user");
  }
  return user;
}

/**
 * Get authenticated user with role information
 */
export async function getAuthUserWithRole(ctx: QueryCtx | MutationCtx) {
  const authUser = await getAuthUserOrThrow(ctx);

  // Fetch user profile
  const userProfile = await ctx.db
    .query("users")
    .withIndex("by_email", q => q.eq("email", authUser.email))
    .first();

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  return {
    id: userProfile._id,
    email: authUser.email,
    name: userProfile.name,
    role: userProfile.role,
    avatar: userProfile.avatar,
  };
}

/**
 * Check if user has required role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[]
) {
  const user = await getAuthUserWithRole(ctx);

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(", ")}] but user has role "${user.role}"`
    );
  }

  return user;
}

/**
 * Check if user is coordinator of an event
 */
export async function requireEventCoordinator(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
) {
  const user = await getAuthUserWithRole(ctx);
  const event = await ctx.db.get(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  const isCoordinator =
    event.coordinatorId === user.id ||
    event.coCoordinatorIds?.includes(user.id);

  if (!isCoordinator) {
    throw new Error("Forbidden: Only event coordinators can perform this action");
  }

  return { user, event };
}

/**
 * Check if user is member of a room
 */
export async function requireRoomMember(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">
) {
  const user = await getAuthUserWithRole(ctx);

  const membership = await ctx.db
    .query("roomParticipants")
    .withIndex("by_room_and_user", q =>
      q.eq("roomId", roomId).eq("userId", user.id)
    )
    .first();

  if (!membership) {
    throw new Error("Forbidden: Not a member of this room");
  }

  return { user, membership };
}

/**
 * Check if user can post in room
 */
export async function requireCanPostInRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">
) {
  const { membership } = await requireRoomMember(ctx, roomId);

  if (!membership.canPost) {
    throw new Error("Forbidden: No permission to post in this room");
  }

  return membership;
}
```

---

## Protected Query/Mutation Helpers

Add to `mono/packages/backend/convex/auth-helpers.ts`:

```typescript
import { query, mutation } from "./_generated/server";

/**
 * Authenticated query - requires logged in user
 */
export const authenticatedQuery = <Args, Output>(
  handler: (
    ctx: QueryCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return query({
    handler: async (ctx, args) => {
      const user = await getAuthUserWithRole(ctx);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Role-based query - requires specific role
 */
export const roleBasedQuery = <Args, Output>(
  allowedRoles: Role[],
  handler: (
    ctx: QueryCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return query({
    handler: async (ctx, args) => {
      const user = await requireRole(ctx, allowedRoles);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Authenticated mutation - requires logged in user
 */
export const authenticatedMutation = <Args, Output>(
  handler: (
    ctx: MutationCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return mutation({
    handler: async (ctx, args) => {
      const user = await getAuthUserWithRole(ctx);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};

/**
 * Role-based mutation - requires specific role
 */
export const roleBasedMutation = <Args, Output>(
  allowedRoles: Role[],
  handler: (
    ctx: MutationCtx & { user: Awaited<ReturnType<typeof getAuthUserWithRole>> },
    args: Args
  ) => Promise<Output>
) => {
  return mutation({
    handler: async (ctx, args) => {
      const user = await requireRole(ctx, allowedRoles);
      return handler({ ...ctx, user }, args as Args);
    },
  });
};
```

### Usage Example

```typescript
// mono/packages/backend/convex/events.ts
import { v } from "convex/values";
import { authenticatedMutation, roleBasedQuery } from "./auth-helpers";

// Only authenticated users can create events
export const create = authenticatedMutation(
  async ({ db, user }, args: { name: string; type: string; budget: number }) => {
    // User is automatically available in context
    const eventId = await db.insert("events", {
      name: args.name,
      type: args.type as any,
      budget: {
        total: args.budget,
        spent: 0,
        committed: 0,
      },
      guestCount: {
        expected: 0,
        confirmed: 0,
      },
      coordinatorId: user.id,
      status: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user.id,
    });

    return eventId;
  }
);

// Only coordinators and collaborators can view event details
export const get = roleBasedQuery(
  ["coordinator", "collaborator"],
  async ({ db }, args: { eventId: Id<"events"> }) => {
    return await db.get(args.eventId);
  }
);
```

---

## Frontend Route Guards

### Route Guard Utilities

Create `mono/apps/web/src/lib/route-guards.ts`:

```typescript
import { redirect } from "@tanstack/react-router";
import { fetchSession } from "./auth-server";
import { getRequest } from "vinxi/http";

/**
 * Require authentication for route
 */
export async function requireAuth() {
  const { session } = await fetchSession(getRequest());

  if (!session) {
    throw redirect({
      to: "/sign-in",
      search: {
        redirect: window.location.pathname,
      },
    });
  }

  return session;
}

/**
 * Require specific role for route
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();

  // Fetch user role from Convex
  const userRole = session.user.role || "guest";

  if (!allowedRoles.includes(userRole)) {
    throw redirect({
      to: "/unauthorized",
    });
  }

  return session;
}
```

### Usage in Routes

```typescript
// mono/apps/web/src/routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    // Protect route - redirects if not authenticated
    await requireAuth();
  },
  component: DashboardPage,
});
```

```typescript
// mono/apps/web/src/routes/events.$eventId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { convexClient } from "@/lib/convex-client";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/events/$eventId")({
  beforeLoad: async ({ params }) => {
    const session = await requireAuth();

    // Verify user has access to event
    const event = await convexClient.query(api.events.getById, {
      eventId: params.eventId,
    });

    if (!event) {
      throw redirect({ to: "/dashboard" });
    }

    return { event };
  },
  component: EventPage,
});
```

---

## Testing Authentication

### Manual Testing Checklist

**Email/Password Authentication:**
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign out
- [ ] Protected route redirects to sign-in
- [ ] After sign-in, redirect to original page

**Google OAuth:**
- [ ] Click "Continue with Google"
- [ ] Redirect to Google consent screen
- [ ] Authorize and redirect back to app
- [ ] User profile created with default role
- [ ] Session persists across page refreshes

**Role-Based Access:**
- [ ] Coordinator can create events
- [ ] Collaborator can view events
- [ ] Guest cannot create events (403 error)
- [ ] Vendor has limited access

### Test User Creation Script

Create `mono/packages/backend/convex/test-users.ts`:

```typescript
import { mutation } from "./_generated/server";

export const createTestUsers = mutation({
  handler: async (ctx) => {
    // Coordinator
    const coordinator = await ctx.db.insert("users", {
      email: "coordinator@test.com",
      name: "Test Coordinator",
      role: "coordinator",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Collaborator
    const collaborator = await ctx.db.insert("users", {
      email: "collaborator@test.com",
      name: "Test Collaborator",
      role: "collaborator",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Guest
    const guest = await ctx.db.insert("users", {
      email: "guest@test.com",
      name: "Test Guest",
      role: "guest",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Vendor
    const vendor = await ctx.db.insert("users", {
      email: "vendor@test.com",
      name: "Test Vendor",
      role: "vendor",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Test users created!");
    return { coordinator, collaborator, guest, vendor };
  },
});
```

Run test users:

```bash
bunx convex run test-users:createTestUsers
```

---

## Next Steps

With authentication and authorization in place, you're ready to proceed to:

**Phase 1.2: Users CRUD Operations**
- User profile management
- Profile updates
- Avatar upload
- Activity tracking

**Estimated Time to Complete Phase 1.1:** 3-4 hours
- Google OAuth setup: 30 minutes
- Auth helper functions: 1 hour
- Protected wrappers: 1 hour
- Route guards: 30 minutes
- Testing: 1 hour

---

**Previous Document:** [Phase 1.0: Database Schema & Foundation](./phase-1.0-database-schema.md)

**Next Document:** [Phase 1.2: Users CRUD Operations](./phase-1.2-users-crud.md)
