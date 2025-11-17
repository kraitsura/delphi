import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for rooms section
 * Provides an outlet for child routes:
 * - /events/$eventId/rooms (index) - Rooms list
 * - /events/$eventId/rooms/$roomId - Room detail
 */
export const Route = createFileRoute("/_authed/events/$eventId/rooms")({
	component: RoomsLayout,
});

function RoomsLayout() {
	return <Outlet />;
}
