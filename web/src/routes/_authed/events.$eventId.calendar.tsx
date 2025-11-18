import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";
import { ModalRenderer } from "@/lib/fluid-ui/ModalRenderer";

export const Route = createFileRoute("/_authed/events/$eventId/calendar")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: CalendarPage,
});

function CalendarPage() {
	const { eventId } = Route.useParams();
	const typedEventId = eventId as Id<"events">;

	return (
		<DashboardStoreProvider>
			<CalendarView
				eventId={typedEventId}
				view="month"
				showTasks={true}
				showMilestones={true}
			/>
			<ModalRenderer />
		</DashboardStoreProvider>
	);
}
