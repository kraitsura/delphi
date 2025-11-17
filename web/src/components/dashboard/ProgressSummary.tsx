import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface ProgressSummaryProps {
	eventId: Id<"events">;
	showBreakdown?: boolean;
}

export function ProgressSummary(props: ProgressSummaryProps) {
	const { showBreakdown = true } = props;

	// Fetch data from Convex
	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const milestones = useQuery(api.milestones.listByEvent, {
		eventId: props.eventId,
	});

	const progress = useMemo(() => {
		if (!tasks || !milestones) return null;

		// Task progress
		const totalTasks = tasks.length;
		const completedTasks = tasks.filter((t) => t.status === "completed").length;
		const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;
		const taskPercentage = Math.round(taskProgress * 100);

		// Milestone progress
		const totalMilestones = milestones.length;
		const completedMilestones = milestones.filter(
			(m) => m.status === "completed",
		).length;
		const milestoneProgress =
			totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
		const milestonePercentage = Math.round(milestoneProgress * 100);

		// Weighted overall progress: Tasks 70%, Milestones 30%
		const overallProgress = taskProgress * 0.7 + milestoneProgress * 0.3;
		const overallPercentage = Math.round(overallProgress * 100);

		// Determine status based on overall progress
		const status =
			overallPercentage >= 70
				? "good"
				: overallPercentage >= 40
					? "warning"
					: "danger";

		return {
			overall: overallPercentage,
			tasks: {
				percentage: taskPercentage,
				completed: completedTasks,
				total: totalTasks,
			},
			milestones: {
				percentage: milestonePercentage,
				completed: completedMilestones,
				total: totalMilestones,
			},
			status,
		};
	}, [tasks, milestones]);

	if (tasks === undefined || milestones === undefined) {
		return <ProgressSummarySkeleton />;
	}

	if (!progress) {
		return <ProgressSummaryEmpty />;
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "good":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "danger":
				return "text-red-600";
			default:
				return "text-muted-foreground";
		}
	};

	const getStatusBgColor = (status: string) => {
		switch (status) {
			case "good":
				return "bg-green-600";
			case "warning":
				return "bg-yellow-600";
			case "danger":
				return "bg-red-600";
			default:
				return "bg-muted";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "good":
				return "On Track";
			case "warning":
				return "At Risk";
			case "danger":
				return "Behind Schedule";
			default:
				return "Unknown";
		}
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Overall Progress
				</CardTitle>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className={getStatusColor(progress.status)}>
						{getStatusLabel(progress.status)}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Circular Progress Display */}
				<div className="flex flex-col items-center justify-center mb-6">
					{/* Circular progress indicator */}
					<div className="relative w-32 h-32 mb-4">
						<svg
							className="w-full h-full transform -rotate-90"
							viewBox="0 0 100 100"
						>
							{/* Background circle */}
							<circle
								cx="50"
								cy="50"
								r="45"
								fill="none"
								stroke="currentColor"
								strokeWidth="8"
								className="text-secondary"
							/>
							{/* Progress circle */}
							<circle
								cx="50"
								cy="50"
								r="45"
								fill="none"
								stroke="currentColor"
								strokeWidth="8"
								strokeDasharray={`${2 * Math.PI * 45}`}
								strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress.overall / 100)}`}
								className={getStatusColor(progress.status)}
								strokeLinecap="round"
							/>
						</svg>
						{/* Percentage text in center */}
						<div className="absolute inset-0 flex items-center justify-center">
							<span
								className={`text-3xl font-light ${getStatusColor(progress.status)}`}
							>
								{progress.overall}%
							</span>
						</div>
					</div>

					<p className="text-sm text-muted-foreground text-center">
						Event Completion
					</p>
				</div>

				{/* Progress bar alternative (horizontal) */}
				<div className="mb-6">
					<div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
						<div
							className={`h-full transition-all duration-500 ${getStatusBgColor(progress.status)}`}
							style={{ width: `${progress.overall}%` }}
						/>
					</div>
				</div>

				{/* Breakdown section */}
				{showBreakdown && (
					<div className="space-y-4">
						<h4 className="text-sm text-muted-foreground uppercase tracking-wide">
							Breakdown
						</h4>

						{/* Tasks breakdown */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									<span>{SYMBOLS.CHECK_MARK}</span>
									<span className="font-medium">Tasks</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground">
										{progress.tasks.completed}/{progress.tasks.total}
									</span>
									<Badge variant="outline" className="text-xs">
										{progress.tasks.percentage}%
									</Badge>
								</div>
							</div>
							<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
								<div
									className="h-full bg-blue-600 transition-all duration-300"
									style={{ width: `${progress.tasks.percentage}%` }}
								/>
							</div>
						</div>

						{/* Milestones breakdown */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									<span>{SYMBOLS.HEXAGON}</span>
									<span className="font-medium">Milestones</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground">
										{progress.milestones.completed}/{progress.milestones.total}
									</span>
									<Badge variant="outline" className="text-xs">
										{progress.milestones.percentage}%
									</Badge>
								</div>
							</div>
							<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
								<div
									className="h-full bg-purple-600 transition-all duration-300"
									style={{ width: `${progress.milestones.percentage}%` }}
								/>
							</div>
						</div>

						{/* Weighted calculation note */}
						<div className="mt-4 p-3 bg-muted/50 rounded-lg">
							<p className="text-xs text-muted-foreground">
								Overall progress is weighted: Tasks (70%) + Milestones (30%)
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ProgressSummarySkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Circular progress skeleton */}
				<div className="flex flex-col items-center">
					<Skeleton className="w-32 h-32 rounded-full mb-4" />
					<Skeleton className="h-4 w-24" />
				</div>
				{/* Progress bar skeleton */}
				<Skeleton className="h-4 w-full rounded-full" />
				{/* Breakdown skeleton */}
				<div className="space-y-4">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function ProgressSummaryEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Overall Progress
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No progress data available</p>
				<p className="text-xs mt-2">
					Add tasks and milestones to track progress
				</p>
			</CardContent>
		</Card>
	);
}

export const ProgressSummaryMetadata = {
	name: "ProgressSummary",
	description:
		"Event completion tracking with weighted tasks and milestones progress",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	zustand: {
		role: "listener",
		writes: [],
		reads: [],
		behavior:
			"Read-only display component. Does not interact with Zustand store.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showBreakdown: {
			type: "boolean",
			required: false,
			description: "Show detailed breakdown of tasks and milestones",
		},
	},
};
