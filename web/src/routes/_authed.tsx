import { api } from "@convex/_generated/api";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Suspense, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeConvexSync } from "@/components/theme-convex-sync";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import { EventProvider } from "@/contexts/EventContext";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import ConvexProvider from "@/integrations/convex/provider";
import { useSession } from "@/lib/auth";

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
					verified: false,
					redirect: location.pathname,
				},
			});
		}

		// Check if user's email is verified
		// Note: context.user is set by __root.tsx from Better Auth session
		if (context.user && !context.user.emailVerified) {
			// Redirect unverified users to verification prompt
			throw redirect({
				to: "/verify-email",
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
 * ProfileCreator Component
 * Fallback mechanism to create user profile if Better Auth trigger failed
 * Triggers should create profile automatically, but this ensures profile exists
 * Waits for session to be ready before attempting profile creation
 */
function ProfileCreator() {
	const { data: session } = useSession();
	const userProfile = useQuery(api.users.getMyProfile);
	const createProfile = useMutation(api.users.createOrUpdateProfile);
	const isCreatingRef = useRef(false);

	useEffect(() => {
		// Wait for session to be fully loaded before checking profile
		if (!session?.user) {
			console.log("[ProfileCreator] Waiting for session to load...");
			return;
		}

		console.log("[ProfileCreator] Session loaded:", {
			email: session.user.email,
			verified: session.user.emailVerified,
			profileStatus:
				userProfile === undefined
					? "loading"
					: userProfile === null
						? "missing"
						: "exists",
		});

		// If profile is still loading, wait
		if (userProfile === undefined) {
			return;
		}

		// If user is loaded and profile doesn't exist, create it
		// Guard against multiple simultaneous calls
		if (userProfile === null && !isCreatingRef.current) {
			console.log("[ProfileCreator] Creating profile for:", session.user.email);
			isCreatingRef.current = true;
			createProfile({})
				.then(() => {
					console.log("[ProfileCreator] Profile created successfully");
				})
				.catch((error) => {
					console.error(
						"[ProfileCreator] Failed to create user profile:",
						error,
					);
					isCreatingRef.current = false; // Reset on error to allow retry
				});
		} else if (userProfile) {
			console.log("[ProfileCreator] Profile already exists, skipping creation");
		}
	}, [session, userProfile, createProfile]);

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
			<ProfileCreator />
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
							<div className="flex-1 min-h-0 overflow-auto">
								<div>Loading...</div>
							</div>
						</SidebarInset>
					</SidebarProvider>
				}
			>
				<EventProvider userId={userId}>
					<SidebarProvider>
						<AppSidebar />
						<SidebarInset className="flex flex-col md:mb-2">
							<SidebarAwareHeader />
							<div className="flex-1 min-h-0 overflow-auto">
								<Outlet />
							</div>
						</SidebarInset>
					</SidebarProvider>
				</EventProvider>
			</Suspense>
		</ConvexProvider>
	);
}
