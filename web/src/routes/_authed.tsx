import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import ConvexProvider from '@/integrations/convex/provider'
import { useActivityTracker } from '@/hooks/use-activity-tracker'

/**
 * Authenticated Layout Route
 *
 * This layout route protects all child routes with authentication.
 * - beforeLoad: Checks if user is authenticated, redirects to sign-in if not
 * - Wraps children with ConvexProvider (only for authenticated users)
 * - Runs activity tracker to update lastActiveAt
 *
 * All routes under _authed/ directory will:
 * 1. Require authentication
 * 2. Have access to Convex queries/mutations
 * 3. Automatically track user activity
 */

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    // Check if user is authenticated (set by __root.tsx)
    if (!context.userId) {
      // Redirect to sign-in with return URL
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: location.pathname,
        },
      })
    }

    // Pass userId to child routes
    return {
      userId: context.userId,
    }
  },
  component: AuthenticatedLayout,
})

/**
 * ActivityTracker Component
 * Tracks user activity and updates lastActiveAt timestamp
 */
function ActivityTracker() {
  useActivityTracker()
  return null
}

/**
 * Authenticated Layout Component
 * Wraps children with ConvexProvider and activity tracking
 */
function AuthenticatedLayout() {
  return (
    <ConvexProvider>
      <ActivityTracker />
      <Outlet />
    </ConvexProvider>
  )
}
