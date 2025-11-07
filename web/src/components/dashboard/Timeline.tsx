import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface TimelineProps {
	eventId: Id<"events">;
	startDate?: number;
	endDate?: number;
	showTasks?: boolean;
	showMilestones?: boolean;
	showEvents?: boolean;
}

type TimelineItem = {
	id: string;
	type: "task" | "milestone" | "event";
	title: string;
	date: number;
	status?: string;
	category?: string;
};

export function Timeline(props: TimelineProps) {
	const { showTasks = true, showMilestones = true, showEvents = true } = props;

	const event = useQuery(api.events.getById, { eventId: props.eventId });
	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const timelineItems = useMemo(() => {
		if (!event || !tasks) return [];

		const items: TimelineItem[] = [];

		// Add event date
		if (showEvents) {
			items.push({
				id: event._id,
				type: "event",
				title: event.name,
				date: event.date,
			});
		}

		// Add tasks with due dates
		if (showTasks) {
			tasks.forEach((task) => {
				if (task.dueDate) {
					items.push({
						id: task._id,
						type: "task",
						title: task.title,
						date: task.dueDate,
						status: task.status,
						category: task.category,
					});
				}
			});
		}

		// Sort by date
		return items.sort((a, b) => a.date - b.date);
	}, [event, tasks, showTasks, showEvents]);

	if (event === undefined || tasks === undefined) {
		return <TimelineSkeleton />;
	}

	if (timelineItems.length === 0) {
		return <TimelineEmpty />;
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const getItemIcon = (type: string) => {
		switch (type) {
			case "event":
				return "★";
			case "milestone":
				return SYMBOLS.HEXAGON;
			case "task":
				return SYMBOLS.BLACK_CIRCLE;
			default:
				return SYMBOLS.BLACK_CIRCLE;
		}
	};

	const getItemColor = (item: TimelineItem) => {
		if (item.type === "event") return "text-yellow-600";
		if (item.type === "milestone") return "text-purple-600";
		if (item.status === "completed") return "text-green-600";
		if (item.status === "blocked") return "text-red-600";
		if (item.status === "in_progress") return "text-blue-600";
		return "text-muted-foreground";
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.ARROW_RIGHT} Timeline
				</CardTitle>
				<span className="text-sm text-muted-foreground">
					{timelineItems.length} item
					{timelineItems.length !== 1 ? "s" : ""}
				</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="relative">
					{/* Timeline line */}
					<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

					{/* Timeline items */}
					<div className="space-y-6">
						{timelineItems.map((item, _index) => (
							<div
								key={item.id}
								className="relative pl-12 hover:bg-accent/30 -ml-2 p-2 rounded-md transition-colors cursor-pointer"
							>
								{/* Marker */}
								<div
									className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-lg ${getItemColor(item)}`}
								>
									{getItemIcon(item.type)}
								</div>

								{/* Content */}
								<div>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											<h4 className="font-normal text-base">{item.title}</h4>
											<div className="flex items-center gap-2 mt-1">
												<Badge variant="outline" className="text-xs">
													{item.type}
												</Badge>
												{item.status && (
													<Badge
														className={`status-badge status-badge--${item.status.replace("_", "-")} text-xs`}
													>
														{item.status.replace("_", " ")}
													</Badge>
												)}
												{item.category && (
													<Badge variant="outline" className="text-xs">
														{item.category}
													</Badge>
												)}
											</div>
										</div>

										<div className="text-sm text-muted-foreground text-right shrink-0">
											{formatDate(item.date)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TimelineSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-6">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="flex gap-4">
						<Skeleton className="h-8 w-8 rounded-full shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-4 w-1/3" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function TimelineEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.ARROW_RIGHT} Timeline
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No timeline items</p>
			</CardContent>
		</Card>
	);
}

export const TimelineMetadata = {
	name: "Timeline",
	description: "Visual timeline of tasks, events, and deadlines",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "300px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["taskSelected", "dateSelected"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showTasks: {
			type: "boolean",
			required: false,
			description: "Show tasks on timeline",
		},
		showMilestones: {
			type: "boolean",
			required: false,
			description: "Show milestones on timeline",
		},
		showEvents: {
			type: "boolean",
			required: false,
			description: "Show event date on timeline",
		},
	},
};
