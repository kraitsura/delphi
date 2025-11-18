import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar, DollarSign, MapPin, Users } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { convexQuery } from "@/lib/convex-query";
import { StatusBadge } from "./StatusBadge";

interface EventListProps {
	status?: "planning" | "active" | "completed" | "cancelled";
}

function EventListSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{[1, 2, 3].map((i) => (
				<Card
					key={i}
					className="border-2 border-black dark:border-white animate-pulse"
				>
					<CardContent className="p-0">
						<div className="p-3">
							<div className="h-5 bg-gray-300 dark:bg-gray-700 w-3/4 mb-3" />
							<div className="h-3 bg-gray-300 dark:bg-gray-700 w-full mb-2" />
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
		<>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{events.map((event) => (
					<Card
						key={event._id}
						className="border-2 border-black dark:border-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all h-full relative group"
					>
						<CardContent className="p-0 relative">
							{/* Main clickable content */}
							<Link
								to="/events/$eventId"
								params={{ eventId: event._id }}
								className="block p-3"
							>
								{/* Header with title and status */}
								<div className="mb-2">
									<h3 className="font-bold text-base uppercase tracking-tight break-words leading-tight mb-1">
										{event.name}
									</h3>
									<div className="flex items-center gap-2">
										<StatusBadge status={event.status} size="sm" />
										<span className="text-[10px] uppercase font-bold opacity-50">
											{event.type}
										</span>
									</div>
								</div>

								{/* Description */}
								{event.description && (
									<p className="text-xs leading-relaxed mb-3 opacity-70 line-clamp-2">
										{event.description}
									</p>
								)}

								{/* Compact info grid */}
								<div className="grid grid-cols-2 gap-2 text-xs">
									{event.eventDate && (
										<div className="flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
											<span className="truncate">
												{new Date(event.eventDate).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
									)}

									{event.location && (
										<div className="flex items-center gap-1.5">
											<MapPin className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
											<span className="truncate">
												{event.location.city}, {event.location.state}
											</span>
										</div>
									)}

									<div className="flex items-center gap-1.5">
										<Users className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
										<span>
											{event.guestCount?.confirmed || 0} /{" "}
											{event.guestCount?.expected || 0}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										<DollarSign className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
										<span className="truncate">
											{event.budget.spent.toLocaleString()} /{" "}
											{event.budget.total.toLocaleString()}
										</span>
									</div>
								</div>
							</Link>
						</CardContent>
					</Card>
				))}
			</div>
		</>
	);
}

export function EventList({ status }: EventListProps) {
	return (
		<Suspense fallback={<EventListSkeleton />}>
			<EventListContent status={status} />
		</Suspense>
	);
}
