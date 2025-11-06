import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Calendar,
	DollarSign,
	MapPin,
	MoreVertical,
	Pencil,
	Trash2,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventDeleteDialog } from "./event-delete-dialog";
import { EventEditDialog } from "./event-edit-dialog";
import { StatusBadge } from "./StatusBadge";

interface EventListProps {
	status?: "planning" | "in_progress" | "completed" | "cancelled" | "archived";
}

export function EventList({ status }: EventListProps) {
	const events = useQuery(api.events.listUserEvents, {
		status,
	});

	if (events === undefined) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="animate-pulse">
						<CardContent className="p-6">
							<div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
							<div className="h-4 bg-gray-200 rounded w-full mb-2" />
							<div className="h-4 bg-gray-200 rounded w-2/3" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500 mb-4">No events found</p>
				<Link
					to="/events/new"
					className="text-blue-600 hover:text-blue-700 font-medium"
				>
					Create your first event
				</Link>
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{events.map((event) => (
				<Card
					key={event._id}
					className="hover:shadow-lg transition-shadow h-full relative"
				>
					<CardContent className="p-6">
						{/* Header with title, status, and actions */}
						<div className="flex items-start justify-between mb-4">
							<Link
								to={`/events/${event._id}`}
								className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
							>
								<h3 className="font-semibold text-lg line-clamp-1">
									{event.name}
								</h3>
							</Link>
							<div className="flex items-center gap-2 ml-2 flex-shrink-0">
								<StatusBadge status={event.status} size="sm" />
								{/* Actions Dropdown Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={(e) => e.stopPropagation()}
										>
											<MoreVertical className="h-4 w-4" />
											<span className="sr-only">Open menu</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<EventEditDialog
											eventId={event._id}
											trigger={
												<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
													<Pencil className="mr-2 h-4 w-4" />
													Edit
												</DropdownMenuItem>
											}
										/>
										<EventDeleteDialog
											eventId={event._id}
											redirectAfterDelete={false}
											trigger={
												<DropdownMenuItem
													onSelect={(e) => e.preventDefault()}
													className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											}
										/>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* Rest of card content - wrapped in Link */}
						<Link to={`/events/${event._id}`} className="block">
							{event.description && (
								<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
									{event.description}
								</p>
							)}

							<div className="space-y-2 text-sm text-muted-foreground">
								{event.date && (
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 flex-shrink-0" />
										<span>{new Date(event.date).toLocaleDateString()}</span>
									</div>
								)}

								{event.location && (
									<div className="flex items-start gap-2">
										<MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
										<span className="line-clamp-1">
											{event.location.city}, {event.location.state}
										</span>
									</div>
								)}

								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 flex-shrink-0" />
									<span>
										{event.guestCount.confirmed} / {event.guestCount.expected}{" "}
										guests
									</span>
								</div>

								<div className="flex items-center gap-2">
									<DollarSign className="h-4 w-4 flex-shrink-0" />
									<span>
										${event.budget.spent.toLocaleString()} / $
										{event.budget.total.toLocaleString()}
									</span>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
								<span className="capitalize">{event.type}</span> •{" "}
								{new Date(event.createdAt).toLocaleDateString()}
							</div>
						</Link>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
