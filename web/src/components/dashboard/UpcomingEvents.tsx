import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface UpcomingEventsProps {
	status?: "planning" | "in_progress" | "completed" | "all";
	limit?: number;
	sortBy?: "date" | "name" | "status";
	compact?: boolean;
	onEventSelect?: (eventId: Id<"events">) => void;
}

export function UpcomingEvents(props: UpcomingEventsProps) {
	const {
		status = "all",
		limit = 5,
		sortBy = "date",
		compact = false,
		onEventSelect,
	} = props;

	const events = useQuery(api.events.listUserEvents, {});

	const filteredAndSorted = useMemo(() => {
		if (!events) return [];

		let filtered = events;

		// Filter by status
		if (status !== "all") {
			filtered = filtered.filter((e) => e.status === status);
		}

		// Sort
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "date":
					if (!a.date) return 1;
					if (!b.date) return -1;
					return a.date - b.date;
				case "name":
					return a.name.localeCompare(b.name);
				case "status":
					return a.status.localeCompare(b.status);
				default:
					return 0;
			}
		});

		// Limit
		return sorted.slice(0, limit);
	}, [events, status, sortBy, limit]);

	if (events === undefined) {
		return <UpcomingEventsSkeleton />;
	}

	if (!events || events.length === 0) {
		return <UpcomingEventsEmpty />;
	}

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return "No date set";

		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.ceil(
			(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays < 0) {
			return `${Math.abs(diffDays)} days ago`;
		} else if (diffDays === 0) {
			return "Today";
		} else if (diffDays === 1) {
			return "Tomorrow";
		} else if (diffDays < 7) {
			return `in ${diffDays} days`;
		} else {
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		}
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Upcoming Events
				</CardTitle>
				<span className="text-sm text-muted-foreground">
					{filteredAndSorted.length} event
					{filteredAndSorted.length !== 1 ? "s" : ""}
				</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-3">
					{filteredAndSorted.map((event) => (
						<button
							type="button"
							key={event._id}
							className="w-full text-left p-3 rounded-md border border-border hover:bg-accent/50 transition-colors cursor-pointer"
							onClick={() => onEventSelect?.(event._id)}
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 min-w-0">
									<h4 className="font-normal text-base truncate">
										{event.name}
									</h4>
									<div className="flex items-center gap-2 mt-1">
										<Badge variant="outline" className="text-xs">
											{event.type}
										</Badge>
										<Badge
											className={`status-badge status-badge--${event.status.replace("_", "-")} text-xs`}
										>
											{event.status.replace("_", " ")}
										</Badge>
									</div>
								</div>

								<div className="text-sm text-muted-foreground text-right shrink-0">
									{formatDate(event.date)}
								</div>
							</div>

							{!compact && event.description && (
								<p className="text-sm text-muted-foreground mt-2 line-clamp-2">
									{event.description}
								</p>
							)}
						</button>
					))}
				</div>

				{filteredAndSorted.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<p>No events match your filters</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function UpcomingEventsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="p-3 border rounded-md space-y-2">
						<div className="flex justify-between">
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-5 w-20" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function UpcomingEventsEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Upcoming Events
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No events yet. Create one to get started!</p>
			</CardContent>
		</Card>
	);
}

export const UpcomingEventsMetadata = {
	name: "UpcomingEvents",
	description: "List of upcoming events with filtering and sorting",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "350px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["eventSelected"],
		listensTo: [],
	},
	props: {
		status: {
			type: "enum",
			required: false,
			values: ["planning", "in_progress", "completed", "all"],
			description: "Filter events by status",
		},
		limit: {
			type: "number",
			required: false,
			description: "Maximum number of events to display",
		},
		sortBy: {
			type: "enum",
			required: false,
			values: ["date", "name", "status"],
			description: "Sort events by field",
		},
		compact: {
			type: "boolean",
			required: false,
			description: "Compact display mode",
		},
	},
};
