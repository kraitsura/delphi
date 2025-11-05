import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import ConvexProvider from "@/integrations/convex/provider";
import { ThemeConvexSync } from "@/components/theme-convex-sync";
import { EventProvider } from "@/contexts/EventContext";
import { useSession } from "@/lib/auth";
import { Suspense } from "react";

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

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    // Check if user is authenticated (set by __root.tsx)
    if (!context.userId) {
      // Redirect to sign-in with return URL
      throw redirect({
        to: "/auth/sign-in",
        search: {
          redirect: location.pathname,
        },
      });
    }

    // Pass userId to child routes
    return {
      userId: context.userId,
    };
  },
  component: AuthenticatedLayout,
});

/**
 * ActivityTracker Component
 * Tracks user activity and updates lastActiveAt timestamp
 */
function ActivityTracker() {
  useActivityTracker();
  return null;
}

/**
 * SidebarAwareHeader Component
 * Header that adjusts styling based on sidebar expansion state
 */
function SidebarAwareHeader() {
  const { state } = useSidebar();
  const isInsetExpanded = state === "expanded";

  return (
    <header
      className={`flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 ${
        isInsetExpanded ? "md:-mt-2" : ""
      }`}
    >
      <SidebarTrigger className="-ml-1.5 mt-1" />
      <div className="flex-1" />
    </header>
  );
}

/**
 * Authenticated Layout Component
 * Wraps children with ConvexProvider, EventProvider, sidebar navigation, and activity tracking
 */
function AuthenticatedLayout() {
  const { userId } = Route.useRouteContext();
  const { data: session } = useSession();

  return (
    <ConvexProvider>
      <ActivityTracker />
      {/* Only sync theme once session is ready to avoid unauthenticated queries */}
      <Suspense fallback={null}>
        {session?.user && <ThemeConvexSync />}
      </Suspense>
      <Suspense
        fallback={
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="flex flex-col">
              <SidebarAwareHeader />
              <div className="flex-1 overflow-auto">
                <div className="flex flex-col gap-4 p-4 h-full">
                  <div>Loading...</div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        }
      >
        <EventProvider userId={userId}>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="flex flex-col">
              <SidebarAwareHeader />
              <div className="flex-1 overflow-auto">
                <div className="flex flex-col gap-4 p-4 h-full">
                  <Outlet />
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </EventProvider>
      </Suspense>
    </ConvexProvider>
  );
}
