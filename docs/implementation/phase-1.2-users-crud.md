# Phase 1.2: Users CRUD Operations

> **Status:** ✅ MOSTLY COMPLETE (Avatar upload deferred)
> **Last Updated:** November 2025
> **Prerequisites:**
> - ✅ Phase 1.0 (Database Schema) - Complete
> - ✅ Phase 1.1 (Authentication) - Complete
> **Completion:** ~85% (Core CRUD, auth helpers, and activity tracking complete; avatar upload pending)

---

## Current Implementation Status

### ✅ Implemented Features

**Backend (Convex):**
- ✅ `convex/schema.ts` - Complete users table with all fields and indexes
- ✅ `convex/authHelpers.ts` - Comprehensive auth helpers (exceeds spec requirements)
  - `authenticatedQuery` and `authenticatedMutation` wrappers
  - Role-based authorization helpers
  - Event and room permission helpers
- ✅ `convex/users.ts` - Full CRUD operations
  - Get current profile (`getMyProfile`)
  - Get user by ID/IDs (`getById`, `getByIds`)
  - Create/update profile (`createOrUpdateProfile`)
  - Update profile fields (name, avatar, bio, location, preferences)
  - Activity tracking (`updateLastActive`)
  - Soft delete (`deactivate`, `reactivate`)
  - User search by name/email (`searchByName`)
- ✅ `convex/auth.ts` - Auto profile creation callback on signup

**Frontend (React):**
- ✅ `src/hooks/use-activity-tracker.ts` - Activity tracking hook (updates every 5min)
- ✅ `src/routes/_authed.tsx` - Activity tracker integrated in auth layout
- ✅ `src/routes/_authed/profile.tsx` - Complete profile page
- ✅ `src/components/user/profile-form.tsx` - Full profile form with all fields

**Database:**
- ✅ Users table with all required fields
- ✅ Indexes: by_email, by_role, by_active
- ✅ Role-based access control (coordinator, collaborator, guest, vendor)
- ✅ Preferences object (theme, notifications, timezone)

### ⚠️ Partially Implemented

**Auto Profile Creation:**
- ✅ Better Auth callback implemented in `convex/auth.ts`
- ✅ Creates profile automatically on signup (email or OAuth)
- ⚠️ Uses email-based lookup instead of ID-based (potential future improvement)

### ❌ Not Yet Implemented

**Avatar Upload:**
- ❌ `convex/storage.ts` - Backend file upload functions
- ❌ `src/components/user/avatar-upload.tsx` - Upload component
- ⚠️ Profile page shows avatar placeholder with "Avatar upload coming soon"
- ℹ️ **Deferred** - Will be implemented when file upload is needed

**What Works Now:**
- ✅ Complete user profile management (except avatar upload)
- ✅ All CRUD operations functional
- ✅ Activity tracking active
- ✅ Auto profile creation on signup
- ✅ Role-based access control ready

---

## Table of Contents

1. [Overview](#overview)
2. [Understanding Better Auth User vs Extended Profile](#understanding-better-auth-user-vs-extended-profile)
3. [Backend: User Queries & Mutations](#backend-user-queries--mutations)
4. [Avatar Upload Implementation](#avatar-upload-implementation)
5. [Frontend Components](#frontend-components)
6. [Testing User Operations](#testing-user-operations)
7. [Next Steps](#next-steps)

---

## Overview

This phase implements complete user profile management with CRUD operations. Users can view, update, and manage their **extended profiles** (beyond what Better Auth provides).

**⚠️ Important:** This phase extends Better Auth's user data with app-specific fields. Better Auth already provides basic user authentication data (email, name, image), and this phase adds application-specific data (role, preferences, activity tracking).

**What You'll Build:**
- ❌ Create extended user profile (linked to Better Auth user)
- ❌ Get current user profile
- ❌ Get user by ID
- ❌ Update profile (name, preferences)
- ❌ Avatar upload with Convex storage
- ❌ Update last active timestamp
- ❌ Soft delete (deactivate) user

**Key Features:**
- Extended profile creation on Better Auth signup callback
- Avatar image upload to Convex storage
- User preferences (theme, notifications, timezone)
- Activity tracking (last active timestamp)
- Role-based access control
- Soft delete for user deactivation

---

## Understanding Better Auth User vs Extended Profile

### Two Sources of User Data

**Better Auth User** (managed by Better Auth component):
```typescript
// Access via authComponent.getAuthUser(ctx)
{
  _id: Id<"betterAuth/user">,
  email: "user@example.com",
  name: "John Doe",
  emailVerified: true,
  image: "https://...",  // From Google OAuth
  // Cannot add custom fields here
}
```

**Extended Profile** (your app's users table):
```typescript
// Stored in your schema.ts users table
{
  _id: Id<"users">,
  email: "user@example.com",  // Links to Better Auth user
  role: "coordinator",        // App-specific
  avatar: "https://...",      // Custom uploaded avatar
  preferences: {
    theme: "dark",
    notifications: true,
    timezone: "America/Los_Angeles",
  },
  lastActiveAt: 1234567890,
  bio: "Event planning enthusiast",
  location: "San Francisco, CA",
  isActive: true,
}
```

### Integration Point: Creating Extended Profile

✅ **IMPLEMENTED** - The extended profile is automatically created when a user signs up:

```typescript
// In convex/auth.ts - Auto profile creation callback
export const createAuth = (ctx: GenericCtx<DataModel>, options) => {
  return betterAuth({
    // ... existing config
    hooks: {
      after: createAuthMiddleware(async (hookCtx) => {
        // Create extended profile after signup (email or OAuth)
        if (hookCtx.path.startsWith("/sign-up")) {
          const newSession = hookCtx.context.newSession;
          if (newSession?.user) {
            const user = newSession.user;
            // Check if profile already exists
            const existing = await ctx.db
              .query("users")
              .withIndex("by_email", (q) => q.eq("email", user.email))
              .first();

            if (!existing) {
              // Create extended profile
              await ctx.db.insert("users", {
                email: user.email,
                name: user.name,
                role: "collaborator", // default role
                preferences: {
                  notifications: true,
                  theme: "light",
                  timezone: "UTC",
                },
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now(),
              });
            }
          }
        }
      }),
    },
  });
};
```

**Implementation Notes:**
- Uses Better Auth's `after` hooks with `createAuthMiddleware` from `better-auth/api`
- Triggers on any `/sign-up` path (email or OAuth)
- Checks for existing profile to prevent duplicates
- Sets default role to "collaborator" for new users
- Initializes preferences with sensible defaults

---

## Backend: User Queries & Mutations

✅ **IMPLEMENTED** - All user CRUD operations are complete in `/web/convex/users.ts`

**Implementation Status:**
- ✅ Create/update profile with `createOrUpdateProfile`
- ✅ Get current user profile with `getMyProfile`
- ✅ Get user(s) by ID with `getById` and `getByIds`
- ✅ Update profile fields with `updateProfile`
- ✅ Activity tracking with `updateLastActive`
- ✅ Soft delete with `deactivate` / `reactivate`
- ✅ User search with `searchByName`

**Reference Implementation:** `/web/convex/users.ts`

The following shows the expected interface (actual implementation may have minor variations):

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserWithRole, authenticatedMutation, authenticatedQuery } from "./auth-helpers";

/**
 * Create user profile after Better Auth signup
 * Called from Better Auth callback or manually
 */
export const createProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.optional(v.union(
      v.literal("coordinator"),
      v.literal("collaborator"),
      v.literal("guest"),
      v.literal("vendor")
    )),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new profile
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role || "collaborator", // Default role
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get current user profile
 */
export const getCurrentProfile = authenticatedQuery(
  async ({ db, user }) => {
    return await db.get(user.id);
  }
);

/**
 * Get user by ID (public)
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    // Don't expose sensitive fields for public queries
    if (user) {
      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      };
    }

    return null;
  },
});

/**
 * Get multiple users by IDs (batch fetch)
 */
export const getByIds = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map(id => ctx.db.get(id))
    );

    // Filter out nulls and return only public fields
    return users
      .filter(user => user !== null)
      .map(user => ({
        _id: user!._id,
        name: user!.name,
        avatar: user!.avatar,
        role: user!.role,
      }));
  },
});

/**
 * Update user profile
 */
export const updateProfile = authenticatedMutation(
  async ({ db, user }, args: {
    name?: string;
    avatar?: string;
    preferences?: {
      notifications?: boolean;
      theme?: "light" | "dark";
      timezone?: string;
    };
  }) => {
    const currentProfile = await db.get(user.id);
    if (!currentProfile) {
      throw new Error("Profile not found");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name) {
      updates.name = args.name;
    }

    if (args.avatar !== undefined) {
      updates.avatar = args.avatar;
    }

    if (args.preferences) {
      updates.preferences = {
        ...currentProfile.preferences,
        ...args.preferences,
      };
    }

    await db.patch(user.id, updates);

    return await db.get(user.id);
  }
);

/**
 * Soft delete user (deactivate)
 */
export const deactivate = authenticatedMutation(
  async ({ db, user }) => {
    await db.patch(user.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  }
);

/**
 * Reactivate user
 */
export const reactivate = authenticatedMutation(
  async ({ db, user }) => {
    await db.patch(user.id, {
      isActive: true,
      updatedAt: Date.now(),
    });
  }
);

/**
 * Update last active timestamp
 * Call this periodically (e.g., every 5 minutes) to track user activity
 */
export const updateLastActive = authenticatedMutation(
  async ({ db, user }) => {
    await db.patch(user.id, {
      lastActiveAt: Date.now(),
    });
  }
);

/**
 * Search users by name (for @mentions, invitations)
 */
export const searchByName = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get all users and filter (Convex doesn't have text search on regular indexes)
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_active", q => q.eq("isActive", true))
      .collect();

    // Filter by name containing search term (case-insensitive)
    const searchLower = args.searchTerm.toLowerCase();
    const filtered = allUsers
      .filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
      .slice(0, limit);

    return filtered.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    }));
  },
});
```

---

## Avatar Upload Implementation

❌ **NOT IMPLEMENTED** - Deferred to future phase

**Status:** Avatar upload functionality is not yet implemented. The profile page includes a placeholder UI with "Avatar upload coming soon" message.

**When Implemented:**
- Backend file upload via Convex storage
- Frontend upload component with preview
- Storage cleanup for replaced avatars

**Current Workaround:**
- OAuth providers (Google) may provide avatar URLs
- Avatar field accepts URL strings for manual entry
- Profile page displays avatar if URL is set

### Backend: Storage Functions (Deferred)

To be created in `/web/convex/storage.ts`:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserWithRole } from "./auth-helpers";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Verify user is authenticated
    await getAuthUserWithRole(ctx);

    // Use Convex file storage
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save avatar URL to user profile after upload
 */
export const saveAvatarUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserWithRole(ctx);

    // Get URL from storage ID
    const url = await ctx.storage.getUrl(args.storageId);

    if (!url) {
      throw new Error("Failed to get storage URL");
    }

    // Update user profile
    await ctx.db.patch(user.id, {
      avatar: url,
      updatedAt: Date.now(),
    });

    return url;
  },
});

/**
 * Delete file from storage
 */
export const deleteFile = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    await getAuthUserWithRole(ctx);

    await ctx.storage.delete(args.storageId);
  },
});
```

---

## Frontend Components

✅ **IMPLEMENTED** - All core frontend components are complete

**Implemented Components:**
- ✅ `/src/components/user/profile-form.tsx` - Full profile editing form
- ✅ `/src/routes/_authed/profile.tsx` - Complete profile page
- ✅ `/src/hooks/use-activity-tracker.ts` - Activity tracking hook

**Deferred:**
- ❌ Avatar upload component (pending backend implementation)

### User Profile Form

✅ **IMPLEMENTED** - See `/src/components/user/profile-form.tsx`

The following shows the expected interface (actual implementation may have variations):

```typescript
import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function UserProfileForm() {
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.users.getCurrentProfile, {})
  );

  const updateProfile = useConvexMutation(api.users.updateProfile);

  const [name, setName] = useState(profile?.name || "");
  const [theme, setTheme] = useState<"light" | "dark">(
    profile?.preferences?.theme || "light"
  );

  const mutation = useMutation({
    mutationFn: async () => {
      return await updateProfile({
        name,
        preferences: {
          theme,
          notifications: profile?.preferences?.notifications ?? true,
          timezone: profile?.preferences?.timezone || "UTC",
        },
      });
    },
    onSuccess: () => {
      toast.success("Profile updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <select
          id="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value as "light" | "dark")}
          className="w-full rounded-md border p-2"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
```

### Avatar Upload Component

❌ **NOT IMPLEMENTED** - Deferred to future phase

To be created in `/src/components/user/avatar-upload.tsx`:

```typescript
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export function AvatarUpload({ currentAvatar }: { currentAvatar?: string }) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);

  const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);
  const saveAvatar = useConvexMutation(api.storage.saveAvatarUrl);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl({});

      // Step 2: Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Save to user profile
      const url = await saveAvatar({ storageId });

      return url;
    },
    onSuccess: (url) => {
      setPreview(url);
      toast.success("Avatar updated!");
    },
    onError: (error) => {
      toast.error(`Failed to upload avatar: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    mutation.mutate(file);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200">
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            <Upload className="h-8 w-8" />
          </div>
        )}

        {mutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div>
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={mutation.isPending}
        />
        <label htmlFor="avatar-upload">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            asChild
          >
            <span>
              {mutation.isPending ? "Uploading..." : "Change Avatar"}
            </span>
          </Button>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          JPG, PNG or GIF (max 5MB)
        </p>
      </div>
    </div>
  );
}
```

### User Profile Page

✅ **IMPLEMENTED** - See `/src/routes/_authed/profile.tsx`

The following shows the expected interface (actual implementation may have variations):

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/route-guards";
import { UserProfileForm } from "@/components/user-profile-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { useConvexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    await requireAuth();
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.users.getCurrentProfile, {})
  );

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-8 text-3xl font-bold">Profile Settings</h1>

      <div className="space-y-8">
        {/* Avatar Section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Profile Picture</h2>
          <AvatarUpload currentAvatar={profile?.avatar} />
        </section>

        {/* Profile Form */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
          <UserProfileForm />
        </section>

        {/* Account Info (Read-only) */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Account Information</h2>
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div>
              <span className="font-medium">Email:</span> {profile?.email}
            </div>
            <div>
              <span className="font-medium">Role:</span>{" "}
              <span className="capitalize">{profile?.role}</span>
            </div>
            <div>
              <span className="font-medium">Member since:</span>{" "}
              {new Date(profile?.createdAt || 0).toLocaleDateString()}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

### Activity Tracker Hook

✅ **IMPLEMENTED** - See `/src/hooks/use-activity-tracker.ts`

The following shows the expected interface (actual implementation matches this):

```typescript
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useEffect } from "react";

/**
 * Track user activity - updates lastActiveAt every 5 minutes
 */
export function useActivityTracker() {
  const updateLastActive = useConvexMutation(api.users.updateLastActive);

  useEffect(() => {
    // Update immediately
    updateLastActive({});

    // Update every 5 minutes
    const interval = setInterval(() => {
      updateLastActive({});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateLastActive]);
}
```

✅ **IMPLEMENTED** - Usage in authenticated layout:

```typescript
// /src/routes/_authed.tsx
import { useActivityTracker } from "@/hooks/use-activity-tracker";

function ActivityTracker() {
  useActivityTracker();
  return null;
}

function AuthenticatedLayout() {
  return (
    <ConvexProvider>
      <ActivityTracker />
      <Outlet />
    </ConvexProvider>
  );
}
```

**Implementation Notes:**
- Activity tracker runs only for authenticated users
- Integrated into `_authed` layout (not root layout)
- Updates activity every 5 minutes automatically

---

## Testing User Operations

### Manual Testing Checklist

**Profile Creation:**
- [ ] Sign up creates user profile automatically
- [ ] Profile has default role "collaborator"
- [ ] Profile has correct email and name from auth

**Profile Updates:**
- [ ] Update name successfully
- [ ] Update theme preference
- [ ] Changes reflect immediately in UI
- [ ] Updated timestamp is current

**Avatar Upload:**
- [ ] Upload image file (JPG, PNG, GIF)
- [ ] Preview shows before upload completes
- [ ] Avatar displays in profile after upload
- [ ] Avatar URL is persisted in database
- [ ] Large files (> 5MB) are rejected

**Activity Tracking:**
- [ ] lastActiveAt updates on page load
- [ ] lastActiveAt updates every 5 minutes
- [ ] Timestamp is accurate

**User Search:**
- [ ] Search by name returns results
- [ ] Search by email returns results
- [ ] Search is case-insensitive
- [ ] Results limited to 10 by default

### Unit Tests

Create `mono/packages/backend/convex/users.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Users CRUD", () => {
  it("should create user profile", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Test User",
      role: "coordinator",
    });

    expect(userId).toBeDefined();

    const user = await t.query(api.users.getById, { userId });
    expect(user?.name).toBe("Test User");
    expect(user?.role).toBe("coordinator");
  });

  it("should update user profile", async () => {
    const t = convexTest(schema);

    // Create user
    const userId = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "Old Name",
    });

    // Update profile (requires auth context)
    // This will need auth mocking in real tests
  });

  it("should not create duplicate profiles", async () => {
    const t = convexTest(schema);

    const userId1 = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "User 1",
    });

    const userId2 = await t.mutation(api.users.createProfile, {
      email: "test@example.com",
      name: "User 2",
    });

    // Should return same ID
    expect(userId1).toBe(userId2);
  });
});
```

---

## Next Steps

✅ **Phase 1.2 is 85% complete!** Core user profile management is fully functional.

### Completed in This Phase:
- ✅ All backend CRUD operations
- ✅ Comprehensive auth helpers (exceeds requirements)
- ✅ Auto profile creation on signup
- ✅ Activity tracking system
- ✅ Complete frontend profile management UI
- ✅ Database schema with all fields and indexes

### Deferred to Future Phase:
- ❌ Avatar upload functionality (backend + frontend)
  - Not blocking any current features
  - OAuth avatars work as interim solution
  - Will implement when file uploads are needed elsewhere

### Ready to Proceed To:

**Phase 1.3: Events CRUD Operations**
- Create and manage events
- Event permissions
- Event queries and filters
- Event collaborators

**Actual Time Spent on Phase 1.2:** ~2 hours
- Backend CRUD operations: ✅ Complete
- Auth helpers: ✅ Complete (exceeds spec)
- Activity tracking: ✅ Complete
- Auto profile creation: ✅ Complete
- Frontend components: ✅ Complete (minus avatar upload)
- Avatar upload: ⏸️ Deferred

---

**Previous Document:** [Phase 1.1: Authentication & Authorization](./phase-1.1-authentication.md)

**Next Document:** [Phase 1.3: Events CRUD Operations](./phase-1.3-events-crud.md)
