import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface EventDetailsProps {
	eventId: Id<"events">;
	showStatus?: boolean;
	showBudget?: boolean;
	showLocation?: boolean;
	compact?: boolean;
}

export function EventDetails(props: EventDetailsProps) {
	const {
		showStatus = true,
		showBudget = true,
		showLocation = true,
		compact = false,
	} = props;

	const event = useQuery(api.events.getById, { eventId: props.eventId });

	if (event === undefined) {
		return <EventDetailsSkeleton />;
	}

	if (!event) {
		return <EventDetailsEmpty />;
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const budgetPercentage = event.budget
		? ((event.budget.spent + event.budget.committed) / event.budget.total) * 100
		: 0;

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex flex-col gap-2">
					<CardTitle className="fluid-component-title text-2xl">
						{event.name}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{event.type}</Badge>
						{showStatus && (
							<Badge
								className={`status-badge status-badge--${event.status.replace("_", "-")}`}
							>
								{event.status.replace("_", " ")}
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{!compact && (
					<div className="grid grid-cols-3 gap-6 mb-6">
						{/* Date */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground uppercase tracking-wide">
								Date
							</span>
							<span className="text-base">{formatDate(event.date)}</span>
						</div>

						{/* Location */}
						{showLocation && event.location && (
							<div className="flex flex-col gap-1">
								<span className="text-xs text-muted-foreground uppercase tracking-wide">
									Location
								</span>
								<span className="text-base">{event.location}</span>
							</div>
						)}

						{/* Guest Count */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground uppercase tracking-wide">
								Expected Guests
							</span>
							<span className="text-base">{event.guestCount || "TBD"}</span>
						</div>
					</div>
				)}

				{/* Description */}
				{event.description && !compact && (
					<div className="mb-6">
						<p className="text-sm text-muted-foreground">{event.description}</p>
					</div>
				)}

				{/* Budget Overview */}
				{showBudget && event.budget && (
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-xs text-muted-foreground uppercase tracking-wide">
								Budget
							</span>
							<span className="text-sm">
								${event.budget.spent.toLocaleString()} / $
								{event.budget.total.toLocaleString()}
							</span>
						</div>
						<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
							<div className="flex h-full">
								{/* Spent */}
								<div
									className="bg-green-600"
									style={{
										width: `${(event.budget.spent / event.budget.total) * 100}%`,
									}}
								/>
								{/* Committed */}
								<div
									className="bg-yellow-600"
									style={{
										width: `${(event.budget.committed / event.budget.total) * 100}%`,
									}}
								/>
							</div>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-green-600">
								Spent: ${event.budget.spent.toLocaleString()}
							</span>
							<span className="text-yellow-600">
								Committed: ${event.budget.committed.toLocaleString()}
							</span>
							<span className="text-muted-foreground">
								Remaining: $
								{(
									event.budget.total -
									event.budget.spent -
									event.budget.committed
								).toLocaleString()}
							</span>
						</div>

						{/* Budget health indicator */}
						{budgetPercentage > 90 && (
							<div className="text-xs text-red-600 mt-2">
								{SYMBOLS.THUNDERBOLT} Budget at {budgetPercentage.toFixed(0)}% -
								Monitor closely
							</div>
						)}
						{budgetPercentage > 100 && (
							<div className="text-xs text-red-600 font-semibold">
								{SYMBOLS.THUNDERBOLT} Over budget by $
								{(
									event.budget.spent +
									event.budget.committed -
									event.budget.total
								).toLocaleString()}
							</div>
						)}
					</div>
				)}
			</CardContent>

			{!compact && (
				<div className="fluid-component-footer px-6 pb-6">
					<div className="flex gap-2">
						<Button variant="outline" size="sm">
							Edit Event
						</Button>
						<Button variant="outline" size="sm">
							View Rooms
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}

function EventDetailsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-8 w-2/3 mb-2" />
				<div className="flex gap-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-24" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-3 gap-6">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-2 w-full rounded-full" />
			</CardContent>
		</Card>
	);
}

function EventDetailsEmpty() {
	return (
		<Card>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>Event not found</p>
			</CardContent>
		</Card>
	);
}

export const EventDetailsMetadata = {
	name: "EventDetails",
	description: "Comprehensive event information with status and budget",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "250px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: false,
		emits: [],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showStatus: {
			type: "boolean",
			required: false,
			description: "Show event status badge",
		},
		showBudget: {
			type: "boolean",
			required: false,
			description: "Show budget overview",
		},
		showLocation: {
			type: "boolean",
			required: false,
			description: "Show location information",
		},
		compact: {
			type: "boolean",
			required: false,
			description: "Compact display mode",
		},
	},
};
