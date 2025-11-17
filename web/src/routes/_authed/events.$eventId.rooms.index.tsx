import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RoomCreateDialog } from "@/components/rooms/room-create-dialog";
import { RoomList } from "@/components/rooms/room-list";
import { Card, CardContent } from "@/components/ui/card";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/events/$eventId/rooms/")({
	ssr: false, // Disable SSR - auth token not available during server rendering
	loader: async ({ params, context }) => {
		const eventId = params.eventId as Id<"events">;

		// Prefetch rooms list
		await context.queryClient.ensureQueryData(
			convexQuery(api.rooms.listByEvent, { eventId }),
		);

		// Prefetch user profile
		await context.queryClient.ensureQueryData(
			convexQuery(api.users.getMyProfile, {}),
		);
	},
	component: RoomsPage,
});

function RoomsPage() {
	const { eventId } = Route.useParams();

	// Use useSuspenseQuery to read prefetched data
	const { data: event } = useSuspenseQuery(
		convexQuery(api.events.getById, {
			eventId: eventId as Id<"events">,
		}),
	);

	const { data: rooms } = useSuspenseQuery(
		convexQuery(api.rooms.listByEvent, {
			eventId: eventId as Id<"events">,
		}),
	);

	const { data: userProfile } = useSuspenseQuery(
		convexQuery(api.users.getMyProfile, {}),
	);

	// Event not found check
	if (!event) {
		return <div className="text-muted-foreground">Event not found</div>;
	}

	if (!userProfile) {
		return <div className="text-muted-foreground">User profile not found</div>;
	}

	// Check if user is coordinator or co-coordinator
	const canManage =
		event.coordinatorId === userProfile._id ||
		event.coCoordinatorIds?.includes(userProfile._id) ||
		false;

	return (
		<div>
			{/* Header with Create Button */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-semibold">Chat Rooms</h2>
				{canManage && (
					<RoomCreateDialog
						eventId={eventId as Id<"events">}
						onSuccess={() => {
							// Rooms will auto-refresh via reactive query
						}}
					/>
				)}
			</div>

			{/* Rooms List */}
			<RoomList eventId={eventId as Id<"events">} />
			{/* Help Text */}
			{canManage && rooms && rooms.length === 0 && (
				<Card className="mt-6 bg-blue-50 border-blue-200">
					<CardContent className="pt-6">
						<h3 className="font-semibold text-blue-900 mb-2">
							Get Started with Rooms
						</h3>
						<p className="text-sm text-blue-700 mb-4">
							Rooms help organize conversations for different aspects of your
							event. Here are some suggestions:
						</p>
						<ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
							<li>
								<strong>Topic Rooms:</strong> Create rooms for specific topics
								like catering, music, decorations
							</li>
							<li>
								<strong>Vendor Rooms:</strong> Dedicated spaces for coordinating
								with individual vendors
							</li>
							<li>
								<strong>Private Rooms:</strong> Coordinator-only discussions for
								sensitive planning
							</li>
							<li>
								<strong>Guest Announcements:</strong> Broadcast important
								updates to all guests
							</li>
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
