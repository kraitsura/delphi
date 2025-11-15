import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BudgetCard } from "@/components/events/detail/BudgetCard";
import { EventHeader } from "@/components/events/detail/EventHeader";
import { EventInfoCard } from "@/components/events/detail/EventInfoCard";
import { EventStatsSection } from "@/components/events/detail/EventStatsSection";
import { TeamSection } from "@/components/events/detail/TeamSection";
import { Card, CardContent } from "@/components/ui/card";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/events/$eventId/")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();

	// Use useSuspenseQuery to read prefetched data
	const { data: event } = useSuspenseQuery(
		convexQuery(api.events.getById, {
			eventId: eventId as Id<"events">,
		}),
	);

	const { data: stats } = useSuspenseQuery(
		convexQuery(api.events.getStats, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Get user's role in this event
	const { data: userRole } = useSuspenseQuery(
		convexQuery(api.events.getUserRole, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Event not found check
	if (!event) {
		return (
			<div className="container max-w-6xl mx-auto p-4 pb-6">
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Event not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container max-w-6xl mx-auto p-4 pb-6">
			<EventHeader
				eventId={eventId as Id<"events">}
				name={event.name}
				description={event.description}
				status={event.status}
				type={event.type}
				createdAt={event.createdAt}
			/>

			<div className="grid gap-6 md:grid-cols-2 mb-8">
				<EventInfoCard
					date={event.date}
					location={event.location}
					guestCount={event.guestCount}
				/>
				<BudgetCard budget={event.budget} />
			</div>

			{stats && (
				<EventStatsSection stats={stats} eventId={eventId as Id<"events">} />
			)}

			{userRole === "coordinator" && (
				<TeamSection eventId={eventId as Id<"events">} />
			)}
		</div>
	);
}
