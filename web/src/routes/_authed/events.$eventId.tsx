import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowRight,
	Calendar,
	DollarSign,
	MapPin,
	MessageSquare,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authed/events/$eventId")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();

	const event = useQuery(api.events.getById, {
		eventId: eventId as Id<"events">,
	});

	const stats = useQuery(api.events.getStats, {
		eventId: eventId as Id<"events">,
	});

	if (event === undefined) {
		return (
			<div className="container max-w-6xl mx-auto p-6">
				<Skeleton className="h-10 w-96 mb-8" />
				<div className="grid gap-6 md:grid-cols-2 mb-8">
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
				</div>
				<div className="grid gap-4 md:grid-cols-4">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="container max-w-6xl mx-auto p-6">
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Event not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "planning":
				return "bg-blue-100 text-blue-700";
			case "in_progress":
				return "bg-green-100 text-green-700";
			case "completed":
				return "bg-gray-100 text-gray-700";
			case "cancelled":
				return "bg-red-100 text-red-700";
			case "archived":
				return "bg-yellow-100 text-yellow-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	return (
		<div className="container max-w-6xl mx-auto p-6">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<h1 className="text-3xl font-bold mb-2">{event.name}</h1>
						{event.description && (
							<p className="text-gray-600 text-lg">{event.description}</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						<Link to="/events/$eventId/rooms" params={{ eventId }}>
							<Button variant="outline">
								<MessageSquare className="h-4 w-4 mr-2" />
								Rooms
							</Button>
						</Link>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
								event.status,
							)}`}
						>
							{event.status.replace("_", " ")}
						</span>
					</div>
				</div>
				<div className="text-sm text-gray-500">
					<span className="capitalize">{event.type}</span> • Created{" "}
					{new Date(event.createdAt).toLocaleDateString()}
				</div>
			</div>

			{/* Event Details */}
			<div className="grid gap-6 md:grid-cols-2 mb-8">
				<Card>
					<CardHeader>
						<CardTitle>Event Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{event.date && (
							<div className="flex items-center gap-3">
								<Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
								<div>
									<div className="text-sm text-gray-500">Event Date</div>
									<div className="font-medium">
										{new Date(event.date).toLocaleDateString("en-US", {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</div>
								</div>
							</div>
						)}

						{event.location && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-1" />
								<div>
									<div className="text-sm text-gray-500">Location</div>
									<div className="font-medium">{event.location.address}</div>
									<div className="text-sm text-gray-600">
										{event.location.city}, {event.location.state}
									</div>
									<div className="text-sm text-gray-600">
										{event.location.country}
									</div>
								</div>
							</div>
						)}

						<div className="flex items-center gap-3">
							<Users className="h-5 w-5 text-gray-500 flex-shrink-0" />
							<div>
								<div className="text-sm text-gray-500">Guest Count</div>
								<div className="font-medium">
									{event.guestCount.confirmed} confirmed /{" "}
									{event.guestCount.expected} expected
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Budget</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-3">
							<DollarSign className="h-5 w-5 text-gray-500 flex-shrink-0" />
							<div className="flex-1">
								<div className="text-sm text-gray-500 mb-2">
									Budget Overview
								</div>
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Spent</span>
										<span className="font-medium">
											${event.budget.spent.toLocaleString()}
										</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full transition-all"
											style={{
												width: `${Math.min(
													(event.budget.spent / event.budget.total) * 100,
													100,
												)}%`,
											}}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-2 pt-2">
							<div className="flex justify-between">
								<span className="text-sm text-gray-600">Total Budget</span>
								<span className="font-semibold">
									${event.budget.total.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-gray-600">Committed</span>
								<span className="text-sm">
									${event.budget.committed.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-gray-600">Remaining</span>
								<span
									className={`text-sm font-medium ${
										event.budget.total - event.budget.spent > 0
											? "text-green-600"
											: "text-red-600"
									}`}
								>
									${(event.budget.total - event.budget.spent).toLocaleString()}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Statistics */}
			{stats && (
				<div>
					<h2 className="text-xl font-semibold mb-4">Event Statistics</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardContent className="pt-6">
								<div className="text-3xl font-bold mb-1">
									{stats.tasks.total}
								</div>
								<div className="text-sm text-gray-600">Total Tasks</div>
								{stats.tasks.total > 0 && (
									<div className="mt-2 text-xs text-gray-500">
										{stats.tasks.completed} completed • {stats.tasks.inProgress}{" "}
										in progress
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="text-3xl font-bold mb-1 text-green-600">
									{stats.tasks.completed}
								</div>
								<div className="text-sm text-gray-600">Completed Tasks</div>
								{stats.tasks.total > 0 && (
									<div className="mt-2 text-xs text-gray-500">
										{Math.round(
											(stats.tasks.completed / stats.tasks.total) * 100,
										)}
										% complete
									</div>
								)}
							</CardContent>
						</Card>

						<Link to="/events/$eventId/rooms" params={{ eventId }}>
							<Card className="hover:shadow-lg transition-shadow cursor-pointer group border-l-4 border-l-blue-500">
								<CardContent className="pt-6">
									<div className="flex items-start justify-between">
										<div>
											<div className="text-3xl font-bold mb-1 group-hover:text-blue-600 transition-colors">
												{stats.rooms}
											</div>
											<div className="text-sm text-gray-600">Chat Rooms</div>
											<div className="mt-2 text-xs text-gray-500">
												Communication channels
											</div>
										</div>
										<MessageSquare className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
									</div>
									<div className="mt-3 flex items-center text-sm text-blue-600 font-medium">
										View Rooms <ArrowRight className="h-4 w-4 ml-1" />
									</div>
								</CardContent>
							</Card>
						</Link>

						<Card>
							<CardContent className="pt-6">
								<div className="text-3xl font-bold mb-1">
									{stats.participants}
								</div>
								<div className="text-sm text-gray-600">Team Members</div>
								<div className="mt-2 text-xs text-gray-500">
									Active collaborators
								</div>
							</CardContent>
						</Card>
					</div>

					{stats.expenses.count > 0 && (
						<Card className="mt-4">
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-2xl font-bold">
											${stats.expenses.total.toLocaleString()}
										</div>
										<div className="text-sm text-gray-600">
											Total Expenses ({stats.expenses.count} items)
										</div>
									</div>
									<DollarSign className="h-8 w-8 text-gray-400" />
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
