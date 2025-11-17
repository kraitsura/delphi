import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { EventDeleteDialog } from "@/components/events/event-delete-dialog";
import { EventEditDialog } from "@/components/events/event-edit-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/events/$eventId/settings")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: SettingsPage,
});

function SettingsPage() {
	const { eventId } = Route.useParams();

	// Use useSuspenseQuery to read prefetched data
	const { data: event } = useSuspenseQuery(
		convexQuery(api.events.getById, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Get user's role in this event
	const { data: userRole } = useSuspenseQuery(
		convexQuery(api.events.getUserRole, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Event not found check (shouldn't happen due to parent loader)
	if (!event) {
		return <div className="text-muted-foreground">Event not found</div>;
	}

	const canManage = userRole === "coordinator";

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-semibold">Event Settings</h2>
			</div>

			{/* Event Information */}
			<Card className="mb-6">
				<CardHeader>
					<div className="flex items-center gap-2">
						<SettingsIcon className="h-5 w-5 text-muted-foreground" />
						<CardTitle>Event Information</CardTitle>
					</div>
					<CardDescription>Basic information about your event</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<p className="text-sm text-muted-foreground">Event Name</p>
						<p className="text-lg font-medium">{event.name}</p>
					</div>

					{event.description && (
						<div>
							<p className="text-sm text-muted-foreground">Description</p>
							<p className="text-base">{event.description}</p>
						</div>
					)}

					<div>
						<p className="text-sm text-muted-foreground">Event Type</p>
						<p className="text-base capitalize">{event.type}</p>
					</div>

					{event.eventDate && (
						<div>
							<p className="text-sm text-muted-foreground">Event Date</p>
							<p className="text-base">
								{new Date(event.eventDate).toLocaleDateString("en-US", {
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</p>
						</div>
					)}

					<div>
						<p className="text-sm text-muted-foreground">Created</p>
						<p className="text-base">
							{new Date(event.createdAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Event Management - Only for coordinators */}
			{canManage && (
				<Card>
					<CardHeader>
						<CardTitle>Event Management</CardTitle>
						<CardDescription>Update or delete this event</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<EventEditDialog
							eventId={eventId as Id<"events">}
							trigger={
								<Button variant="outline" className="w-full justify-start">
									<Pencil className="mr-2 h-4 w-4" />
									Edit Event Details
								</Button>
							}
						/>

						<EventDeleteDialog
							eventId={eventId as Id<"events">}
							redirectAfterDelete={true}
							trigger={
								<Button
									variant="outline"
									className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Event
								</Button>
							}
						/>
					</CardContent>
				</Card>
			)}

			{/* Permission Notice for non-coordinators */}
			{!canManage && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-sm text-muted-foreground text-center">
							Only event coordinators can manage event settings
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
