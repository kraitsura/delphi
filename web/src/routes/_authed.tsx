import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import ConvexProvider from '@/integrations/convex/provider'
import { useActivityTracker } from '@/hooks/use-activity-tracker'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'

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
 * Wraps children with ConvexProvider, sidebar navigation, and activity tracking
 */
function AuthenticatedLayout() {
  return (
    <ConvexProvider>
      <ActivityTracker />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ConvexProvider>
  )
}
