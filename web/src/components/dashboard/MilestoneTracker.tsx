import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface MilestoneTrackerProps {
	eventId: Id<"events">;
	customMilestones?: Array<{
		name: string;
		targetDate: number;
		category: string;
	}>;
}

type Milestone = {
	name: string;
	targetDate: number;
	category: string;
	status: "completed" | "in_progress" | "not_started";
	tasksCompleted: number;
	tasksTotal: number;
};

export function MilestoneTracker(props: MilestoneTrackerProps) {
	const event = useQuery(api.events.getById, { eventId: props.eventId });
	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const milestones = useMemo(() => {
		if (!event || !tasks) return [];

		const eventDate = event.date;
		const now = Date.now();

		// Calculate days from event
		const _daysToEvent = (eventDate - now) / (1000 * 60 * 60 * 24);

		// Define standard milestones based on event date
		const standardMilestones: Milestone[] = [
			{
				name: "Venue Booked",
				targetDate: eventDate - 180 * 24 * 60 * 60 * 1000,
				category: "venue",
				status: "not_started",
				tasksCompleted: 0,
				tasksTotal: 0,
			},
			{
				name: "Save-the-Dates Sent",
				targetDate: eventDate - 120 * 24 * 60 * 60 * 1000,
				category: "invitations",
				status: "not_started",
				tasksCompleted: 0,
				tasksTotal: 0,
			},
			{
				name: "Vendors Confirmed",
				targetDate: eventDate - 60 * 24 * 60 * 60 * 1000,
				category: "vendor",
				status: "not_started",
				tasksCompleted: 0,
				tasksTotal: 0,
			},
			{
				name: "Final Headcount",
				targetDate: eventDate - 14 * 24 * 60 * 60 * 1000,
				category: "planning",
				status: "not_started",
				tasksCompleted: 0,
				tasksTotal: 0,
			},
			{
				name: "Day-of Coordination",
				targetDate: eventDate - 1 * 24 * 60 * 60 * 1000,
				category: "planning",
				status: "not_started",
				tasksCompleted: 0,
				tasksTotal: 0,
			},
		];

		// Use custom milestones if provided
		const milestonesToUse = props.customMilestones
			? props.customMilestones.map((m) => ({
					...m,
					status: "not_started" as const,
					tasksCompleted: 0,
					tasksTotal: 0,
				}))
			: standardMilestones;

		// Determine status based on tasks
		return milestonesToUse.map((milestone) => {
			const relatedTasks = tasks.filter(
				(t) => t.category === milestone.category,
			);

			const completedTasks = relatedTasks.filter(
				(t) => t.status === "completed",
			).length;
			const totalTasks = relatedTasks.length;

			let status: Milestone["status"];
			if (totalTasks === 0) {
				// If no tasks, base on target date
				if (milestone.targetDate < now) {
					status = "in_progress";
				} else {
					status = "not_started";
				}
			} else if (completedTasks === totalTasks) {
				status = "completed";
			} else if (completedTasks > 0) {
				status = "in_progress";
			} else {
				status = "not_started";
			}

			return {
				...milestone,
				status,
				tasksCompleted: completedTasks,
				tasksTotal: totalTasks,
			};
		});
	}, [event, tasks, props.customMilestones]);

	const progress = useMemo(() => {
		const completed = milestones.filter((m) => m.status === "completed").length;
		const total = milestones.length;
		return total > 0 ? (completed / total) * 100 : 0;
	}, [milestones]);

	if (event === undefined || tasks === undefined) {
		return <MilestoneTrackerSkeleton />;
	}

	if (milestones.length === 0) {
		return <MilestoneTrackerEmpty />;
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	const getStatusIcon = (status: Milestone["status"]) => {
		switch (status) {
			case "completed":
				return SYMBOLS.CHECK_MARK;
			case "in_progress":
				return SYMBOLS.BLACK_CIRCLE;
			case "not_started":
				return "○";
			default:
				return "○";
		}
	};

	const getStatusColor = (status: Milestone["status"]) => {
		switch (status) {
			case "completed":
				return "text-green-600";
			case "in_progress":
				return "text-blue-600";
			case "not_started":
				return "text-muted-foreground";
			default:
				return "text-muted-foreground";
		}
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.HEXAGON} Milestones
				</CardTitle>
				<div className="text-sm text-muted-foreground">
					{progress.toFixed(0)}% Complete
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Progress bar */}
				<div className="mb-6 space-y-2">
					<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
						<div
							className="h-full bg-green-600 transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				{/* Milestone list */}
				<div className="relative">
					{/* Vertical line */}
					<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

					<div className="space-y-4">
						{milestones.map((milestone, index) => (
							<div
								key={index}
								className="relative pl-12 hover:bg-accent/30 -ml-2 p-2 rounded-md transition-colors"
							>
								{/* Status marker */}
								<div
									className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 ${
										milestone.status === "completed"
											? "border-green-600"
											: milestone.status === "in_progress"
												? "border-blue-600"
												: "border-border"
									} flex items-center justify-center text-lg ${getStatusColor(milestone.status)}`}
								>
									{getStatusIcon(milestone.status)}
								</div>

								{/* Content */}
								<div>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											<h4 className="font-normal text-base">
												{milestone.name}
											</h4>
											{milestone.tasksTotal > 0 && (
												<p className="text-sm text-muted-foreground mt-1">
													{milestone.tasksCompleted} / {milestone.tasksTotal}{" "}
													tasks completed
												</p>
											)}
										</div>

										<div className="text-sm text-muted-foreground text-right shrink-0">
											{formatDate(milestone.targetDate)}
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

function MilestoneTrackerSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-2 w-full rounded-full" />
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

function MilestoneTrackerEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.HEXAGON} Milestones
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No milestones defined</p>
			</CardContent>
		</Card>
	);
}

export const MilestoneTrackerMetadata = {
	name: "MilestoneTracker",
	description: "Track progress through key event milestones",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "350px",
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
	},
};
