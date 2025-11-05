import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { convexQuery } from "@/lib/convex-query";

/**
 * Layout route for event pages
 * This provides shared data loading and an outlet for child routes:
 * - /events/$eventId (index) - Event dashboard
 * - /events/$eventId/rooms - Rooms list
 * - /events/$eventId/rooms/$roomId - Room detail
 */
export const Route = createFileRoute("/_authed/events/$eventId")({
	ssr: false, // Disable SSR - auth token not available during server rendering
	loader: async ({ params, context }) => {
		const eventId = params.eventId as Id<"events">;

		// Prefetch event data for EventContext and child routes
		await context.queryClient.ensureQueryData(
			convexQuery(api.events.getById, { eventId })
		);

		// Prefetch stats data
		await context.queryClient.ensureQueryData(
			convexQuery(api.events.getStats, { eventId })
		);
	},
	component: EventLayout,
});

function EventLayout() {
	return <Outlet />;
}
