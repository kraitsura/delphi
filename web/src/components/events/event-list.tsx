import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { convexQuery } from "@/lib/convex-query";
import { EventDeleteDialog } from "./event-delete-dialog";
import { EventEditDialog } from "./event-edit-dialog";
import { StatusBadge } from "./StatusBadge";

interface EventListProps {
	status?: "planning" | "active" | "completed" | "cancelled";
}

function EventListSkeleton() {
	return (
		<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{[1, 2, 3].map((i) => (
				<Card
					key={i}
					className="border-2 border-black dark:border-white animate-pulse"
				>
					<CardContent className="p-0">
						<div className="border-b-2 border-black dark:border-white p-4">
							<div className="h-5 bg-gray-300 dark:bg-gray-700 w-3/4" />
						</div>
						<div className="p-4 space-y-3">
							<div className="h-3 bg-gray-300 dark:bg-gray-700 w-full" />
							<div className="h-3 bg-gray-300 dark:bg-gray-700 w-full" />
							<div className="h-3 bg-gray-300 dark:bg-gray-700 w-2/3" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function EventListContent({ status }: EventListProps) {
	const { data: events } = useSuspenseQuery(
		convexQuery(api.events.listUserEvents, { status }),
	);

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
		<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{events.map((event) => (
				<Card
					key={event._id}
					className="border-2 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors h-full relative group"
				>
					<CardContent className="p-0">
						{/* Header with title and status */}
						<div className="border-b-2 border-black dark:border-white p-4 flex items-center justify-between">
							<Link
								to="/events/$eventId"
								params={{ eventId: event._id }}
								className="flex-1 min-w-0 hover:underline"
							>
								<h3 className="font-bold text-base uppercase tracking-tight line-clamp-1">
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
											className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
						<Link
							to="/events/$eventId"
							params={{ eventId: event._id }}
							className="block p-4"
						>
							{event.description && (
								<p className="text-xs leading-relaxed mb-4 opacity-80 line-clamp-2">
									{event.description}
								</p>
							)}

							<div className="space-y-2 text-xs">
								{event.eventDate && (
									<div className="flex items-start gap-2">
										<span className="opacity-50 min-w-[60px]">DATE:</span>
										<span className="flex-1">
											{new Date(event.eventDate).toLocaleDateString()}
										</span>
									</div>
								)}

								{event.location && (
									<div className="flex items-start gap-2">
										<span className="opacity-50 min-w-[60px]">LOC:</span>
										<span className="flex-1 line-clamp-1">
											{event.location.city}, {event.location.state}
										</span>
									</div>
								)}

								<div className="flex items-start gap-2">
									<span className="opacity-50 min-w-[60px]">GUESTS:</span>
									<span className="flex-1">
										{event.guestCount?.confirmed || 0} /{" "}
										{event.guestCount?.expected || 0}
									</span>
								</div>

								<div className="flex items-start gap-2">
									<span className="opacity-50 min-w-[60px]">BUDGET:</span>
									<span className="flex-1">
										${event.budget.spent.toLocaleString()} / $
										{event.budget.total.toLocaleString()}
									</span>
								</div>

								<div className="flex items-start gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
									<span className="opacity-50 min-w-[60px]">TYPE:</span>
									<span className="flex-1 uppercase">{event.type}</span>
								</div>
							</div>
						</Link>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export function EventList({ status }: EventListProps) {
	return (
		<Suspense fallback={<EventListSkeleton />}>
			<EventListContent status={status} />
		</Suspense>
	);
}
