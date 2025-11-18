import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	createFileRoute,
	Link,
	Outlet,
	useMatches,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useEventHeader } from "@/hooks/useEventHeader";
import { convexQuery } from "@/lib/convex-query";
import { cn } from "@/lib/utils";

/**
 * Layout route for event pages
 * This provides shared data loading and an outlet for child routes:
 * - /events/$eventId (index) - Event dashboard
 * - /events/$eventId/team - Team management
 * - /events/$eventId/rooms - Rooms list
 * - /events/$eventId/rooms/$roomId - Room detail
 */
export const Route = createFileRoute("/_authed/events/$eventId")({
	ssr: false, // Disable SSR - auth token not available during server rendering
	loader: async ({ params, context }) => {
		const eventId = params.eventId as Id<"events">;

		// Prefetch event data, stats, and room list in parallel
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.events.getById, { eventId }),
			),
			context.queryClient.ensureQueryData(
				convexQuery(api.events.getStats, { eventId }),
			),
			context.queryClient.ensureQueryData(
				convexQuery(api.rooms.listAccessibleForEvent, { eventId }),
			),
		]);
	},
	component: EventLayout,
});

function EventLayout() {
	const { eventId } = Route.useParams();
	const matches = useMatches();

	// Set event header in app header using hook
	useEventHeader();

	// Check if navigation is in progress to prevent tab flash during transitions
	const isNavigating = useRouterState({ select: (s) => s.isLoading });

	// Track previous isRoomDetailActive state to maintain layout during navigation
	const prevIsRoomDetailActiveRef = useRef(false);

	// Determine active tab using route matching
	// Checks all route matches (not just last one) to handle nested layouts correctly
	// Memoized to prevent recalculation on every render and ensure stable highlighting
	const {
		isDashboardActive,
		isRoomsActive,
		isTeamActive,
		isCalendarActive,
		isSettingsActive,
		isRoomDetailActive,
	} = useMemo(() => {
		// Get all route IDs in the current match hierarchy
		const routeIds = matches.map((m) => m.routeId);
		const lastRouteId = routeIds[routeIds.length - 1] || "";

		// Check if any route in the hierarchy matches our target routes
		const isSettingsActive = routeIds.includes(
			"/_authed/events/$eventId/settings",
		);
		const isCalendarActive = routeIds.includes(
			"/_authed/events/$eventId/calendar",
		);
		const isTeamActive = routeIds.includes("/_authed/events/$eventId/team");
		const isRoomDetailActive = routeIds.includes(
			"/_authed/events/$eventId/rooms/$roomId",
		);

		// For rooms, match the layout or index route
		const isRoomsListActive =
			routeIds.includes("/_authed/events/$eventId/rooms") ||
			routeIds.includes("/_authed/events/$eventId/rooms/");
		const isRoomsActive = isRoomDetailActive || isRoomsListActive;

		// Dashboard is active when we're exactly on the event route (no child routes beyond event)
		const isDashboardActive =
			(lastRouteId === "/_authed/events/$eventId/" ||
				lastRouteId === "/_authed/events/$eventId") &&
			!isRoomsActive &&
			!isTeamActive &&
			!isCalendarActive &&
			!isSettingsActive;

		return {
			isDashboardActive,
			isRoomsActive,
			isTeamActive,
			isCalendarActive,
			isSettingsActive,
			isRoomDetailActive,
		};
	}, [matches]);

	// Update ref with current room state after navigation completes
	useEffect(() => {
		if (!isNavigating) {
			prevIsRoomDetailActiveRef.current = isRoomDetailActive;
		}
	}, [isRoomDetailActive, isNavigating]);

	// Hide tabs and use full viewport for room detail view
	// During navigation, maintain previous view state to prevent layout flash
	const showTabs = isNavigating
		? !prevIsRoomDetailActiveRef.current // Use previous state during navigation
		: !isRoomDetailActive; // Use current state when idle

	return (
		<div
			className={cn(
				showTabs ? "container max-w-6xl mx-auto p-4 pb-6" : "h-full",
			)}
		>
			{/* Tab Navigation - Hidden for room detail view */}
			{showTabs && (
				<div className="sticky top-0 z-10 flex gap-8 border-b mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 -mt-4 px-4 pt-2">
					<Link
						to="/events/$eventId"
						params={{ eventId }}
						className={cn(
							"pb-3 px-1 text-sm font-medium transition-colors duration-150 relative",
							isDashboardActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Dashboard
						{isDashboardActive && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-150" />
						)}
					</Link>
					<Link
						to="/events/$eventId/calendar"
						params={{ eventId }}
						className={cn(
							"pb-3 px-1 text-sm font-medium transition-colors duration-150 relative",
							isCalendarActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Calendar
						{isCalendarActive && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-150" />
						)}
					</Link>
					<Link
						to="/events/$eventId/rooms"
						params={{ eventId }}
						className={cn(
							"pb-3 px-1 text-sm font-medium transition-colors duration-150 relative",
							isRoomsActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Rooms
						{isRoomsActive && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-150" />
						)}
					</Link>
					<Link
						to="/events/$eventId/team"
						params={{ eventId }}
						className={cn(
							"pb-3 px-1 text-sm font-medium transition-colors duration-150 relative",
							isTeamActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Team
						{isTeamActive && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-150" />
						)}
					</Link>
					<Link
						to="/events/$eventId/settings"
						params={{ eventId }}
						className={cn(
							"pb-3 px-1 text-sm font-medium transition-colors duration-150 relative",
							isSettingsActive
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Settings
						{isSettingsActive && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-all duration-150" />
						)}
					</Link>
				</div>
			)}

			{/* Child Routes */}
			<Outlet />
		</div>
	);
}
