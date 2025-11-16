import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface DayOfChecklistProps {
	eventId: Id<"events">;
	showTimes?: boolean;
	autoScroll?: boolean;
}

export function DayOfChecklist(props: DayOfChecklistProps) {
	const { showTimes = true, autoScroll = false } = props;

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const event = useQuery(api.events.getById, { eventId: props.eventId });

	// Zustand state
	const select = useDashboardStore((state) => state.select);

	const dayOfTasks = useMemo(() => {
		if (!tasks || !event) return [];

		// Filter for day-of tasks and sort by sequence
		return tasks
			.filter((t: any) => t.phase === "day_of" && t.dayOfSequence !== undefined)
			.sort((a: any, b: any) => (a.dayOfSequence || 0) - (b.dayOfSequence || 0))
			.map((task: any, index) => {
				// Calculate estimated time based on sequence and duration
				const eventDate = new Date(event.date);
				let estimatedTime = eventDate.getTime();

				// Add cumulative duration from previous tasks
				for (let i = 0; i < index; i++) {
					const prevTask = tasks.filter((t: any) => t.phase === "day_of")[i];
					estimatedTime += (prevTask?.estimatedDuration || 30) * 60 * 1000;
				}

				return {
					...task,
					estimatedTime,
				};
			});
	}, [tasks, event]);

	const handleTaskToggle = (taskId: string, task: any, checked: boolean) => {
		// In a real app, this would update the task status via Convex mutation
		// For now, just update Zustand selection
		select("taskId", taskId);
	};

	const currentTaskIndex = useMemo(() => {
		if (!dayOfTasks.length) return -1;

		const now = Date.now();

		// Find the task that should be happening now
		for (let i = dayOfTasks.length - 1; i >= 0; i--) {
			if (now >= dayOfTasks[i].estimatedTime) {
				return i;
			}
		}

		return -1;
	}, [dayOfTasks]);

	if (tasks === undefined || event === undefined) {
		return <DayOfChecklistSkeleton />;
	}

	if (!dayOfTasks || dayOfTasks.length === 0) {
		return <DayOfChecklistEmpty />;
	}

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const now = Date.now();

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Event Day Checklist
				</CardTitle>
				<Badge variant="outline">{dayOfTasks.length} tasks</Badge>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Current task indicator */}
				{currentTaskIndex >= 0 && currentTaskIndex < dayOfTasks.length && (
					<div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-primary">{SYMBOLS.STAR}</span>
							<span className="font-medium">Current task:</span>
							<span>{dayOfTasks[currentTaskIndex].title}</span>
						</div>
					</div>
				)}

				{/* Checklist */}
				<div className="space-y-2">
					{dayOfTasks.map((task: any, index) => {
						const isCompleted = task.status === "completed";
						const isCurrent = index === currentTaskIndex;
						const isPast = task.estimatedTime < now;
						const isUpcoming = task.estimatedTime > now;

						return (
							<div
								key={task._id}
								className={`p-3 rounded-lg border transition-all ${
									isCurrent
										? "border-primary bg-primary/5 ring-2 ring-primary/20"
										: isCompleted
											? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900"
											: "border-border"
								} ${isPast && !isCompleted ? "opacity-60" : ""}`}
							>
								<div className="flex items-start gap-3">
									{/* Checkbox */}
									<Checkbox
										checked={isCompleted}
										onCheckedChange={(checked) =>
											handleTaskToggle(task._id, task, checked as boolean)
										}
										className="mt-1"
									/>

									{/* Task content */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											{showTimes && (
												<span className="text-xs font-mono text-muted-foreground">
													{formatTime(task.estimatedTime)}
												</span>
											)}
											<Badge variant="outline" className="text-xs">
												#{task.dayOfSequence}
											</Badge>
											{task.estimatedDuration && (
												<span className="text-xs text-muted-foreground">
													{task.estimatedDuration}min
												</span>
											)}
										</div>

										<h4
											className={`font-normal text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}
										>
											{task.title}
										</h4>

										<div className="flex flex-wrap items-center gap-1.5 mt-2">
											{task.assignee && (
												<Badge variant="outline" className="text-xs">
													{task.assignee}
												</Badge>
											)}
											{task.vendor && (
												<Badge variant="outline" className="text-xs">
													{SYMBOLS.HANDSHAKE} {task.vendor}
												</Badge>
											)}
											{task.criticalPath && (
												<span className="text-xs text-red-600 font-semibold">
													{SYMBOLS.STAR} Critical
												</span>
											)}
										</div>

										{task.description && (
											<p className="text-xs text-muted-foreground mt-2">
												{task.description}
											</p>
										)}
									</div>

									{/* Status indicator */}
									<div className="flex flex-col items-end gap-1">
										{isCurrent && (
											<Badge className="bg-primary text-xs">Now</Badge>
										)}
										{isCompleted && (
											<span className="text-green-600">{SYMBOLS.CHECK_MARK}</span>
										)}
										{task.status === "blocked" && (
											<Badge variant="destructive" className="text-xs">
												Blocked
											</Badge>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Progress summary */}
				<div className="mt-6 pt-4 border-t">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-muted-foreground">Overall Progress</span>
						<span className="text-sm font-medium">
							{dayOfTasks.filter((t: any) => t.status === "completed").length}/
							{dayOfTasks.length} complete
						</span>
					</div>
					<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all"
							style={{
								width: `${(dayOfTasks.filter((t: any) => t.status === "completed").length / dayOfTasks.length) * 100}%`,
							}}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function DayOfChecklistSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-20 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function DayOfChecklistEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Event Day Checklist
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No event day tasks yet</p>
				<p className="text-xs mt-2">Add tasks with the &quot;Day Of&quot; phase</p>
			</CardContent>
		</Card>
	);
}

export const DayOfChecklistMetadata = {
	name: "DayOfChecklist",
	description: "Minute-by-minute checklist for event day execution",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "500px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["taskSelected", "taskStatusChanged"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showTimes: {
			type: "boolean",
			required: false,
			description: "Show estimated times for each task",
		},
		autoScroll: {
			type: "boolean",
			required: false,
			description: "Auto-scroll to current task",
		},
	},
};
