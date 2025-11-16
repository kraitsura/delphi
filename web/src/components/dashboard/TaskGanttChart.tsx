import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface TaskGanttChartProps {
	eventId: Id<"events">;
	showDependencies?: boolean;
	viewRange?: "week" | "month" | "full";
}

export function TaskGanttChart(props: TaskGanttChartProps) {
	const { showDependencies = false, viewRange = "month" } = props;

	// Zustand state - read selected phase from store
	const selectedPhase = useDashboardStore((state) => state.selections.phase);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const event = useQuery(api.events.getById, { eventId: props.eventId });

	const { timelineData, dateRange } = useMemo(() => {
		if (!tasks || !event) return { timelineData: [], dateRange: { start: 0, end: 0, days: 0 } };

		// Filter by selected phase if any
		const filteredTasks = selectedPhase
			? tasks.filter((t: any) => (t.phase || "planning") === selectedPhase)
			: tasks;

		// Calculate date range
		const now = Date.now();
		const eventDate = event.date;

		let start: number, end: number;

		if (viewRange === "week") {
			start = now - 3 * 24 * 60 * 60 * 1000;
			end = now + 7 * 24 * 60 * 60 * 1000;
		} else if (viewRange === "month") {
			start = now - 7 * 24 * 60 * 60 * 1000;
			end = now + 30 * 24 * 60 * 60 * 1000;
		} else {
			// Full range from earliest task to event date
			const taskDates = filteredTasks
				.map((t: any) => t.dueDate)
				.filter((d: any) => d !== undefined);
			start = taskDates.length > 0 ? Math.min(...taskDates, now) : now;
			end = Math.max(eventDate, ...taskDates);
		}

		const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

		// Build timeline data
		const data = filteredTasks
			.filter((t: any) => t.dueDate)
			.map((task: any) => {
				const dueDate = task.dueDate;
				const duration = task.estimatedDuration || 60; // minutes
				const taskEnd = dueDate;
				const taskStart = dueDate - duration * 60 * 1000;

				const leftPercent = ((taskStart - start) / (end - start)) * 100;
				const widthPercent = ((taskEnd - taskStart) / (end - start)) * 100;

				return {
					task,
					leftPercent: Math.max(0, Math.min(100, leftPercent)),
					widthPercent: Math.max(1, Math.min(100 - leftPercent, widthPercent)),
				};
			})
			.sort((a, b) => {
				// Sort by phase first, then by start date
				const phaseOrder = ["planning", "vendor_selection", "design", "logistics", "day_of", "post_event"];
				const aPhase = phaseOrder.indexOf(a.task.phase || "planning");
				const bPhase = phaseOrder.indexOf(b.task.phase || "planning");
				if (aPhase !== bPhase) return aPhase - bPhase;
				return (a.task.dueDate || 0) - (b.task.dueDate || 0);
			});

		return {
			timelineData: data,
			dateRange: { start, end, days },
		};
	}, [tasks, event, selectedPhase, viewRange]);

	const handleTaskClick = (taskId: string, taskData: any) => {
		emit({
			type: "taskSelected",
			payload: { taskId, taskData },
		});
	};

	if (tasks === undefined || event === undefined) {
		return <TaskGanttChartSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TaskGanttChartEmpty />;
	}

	const today = Date.now();
	const todayPercent = ((today - dateRange.start) / (dateRange.end - dateRange.start)) * 100;

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CardTitle className="fluid-component-title">
							{SYMBOLS.BLACK_SQUARE} Task Timeline
						</CardTitle>
						{selectedPhase && (
							<Badge variant="outline" className="capitalize">
								{selectedPhase.replace("_", " ")}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span>
							{new Date(dateRange.start).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})}
						</span>
						<span>→</span>
						<span>
							{new Date(dateRange.end).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})}
						</span>
					</div>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="relative">
					{/* Today marker */}
					{todayPercent >= 0 && todayPercent <= 100 && (
						<div
							className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
							style={{ left: `${todayPercent}%` }}
						>
							<div className="absolute -top-1 -left-3 bg-primary text-primary-foreground text-xs px-1 py-0.5 rounded">
								Today
							</div>
						</div>
					)}

					{/* Timeline bars */}
					<div className="space-y-1.5 py-8">
						{timelineData.map((item, index) => {
							const task = item.task;
							const isOverdue =
								task.dueDate < today && task.status !== "completed";

							return (
								<div key={task._id} className="relative h-10 group">
									{/* Task label */}
									<div className="absolute left-0 -ml-2 top-0 bottom-0 flex items-center w-48 pr-2">
										<div className="truncate text-sm">
											<span className="font-normal">{task.title}</span>
											{task.criticalPath && (
												<span className="ml-1 text-red-600">{SYMBOLS.STAR}</span>
											)}
										</div>
									</div>

									{/* Timeline bar */}
									<div className="absolute left-48 right-0 top-0 bottom-0 flex items-center">
										<div
											className={`h-6 rounded cursor-pointer transition-all group-hover:h-7 ${
												task.status === "completed"
													? "bg-green-600"
													: task.status === "blocked"
														? "bg-red-600"
														: task.status === "in_progress"
															? "bg-blue-600"
															: "bg-gray-400"
											} ${isOverdue ? "border-2 border-red-800" : ""}`}
											style={{
												marginLeft: `${item.leftPercent}%`,
												width: `${item.widthPercent}%`,
											}}
											onClick={() => handleTaskClick(task._id, task)}
										>
											{/* Tooltip on hover */}
											<div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-0 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg border z-20 whitespace-nowrap">
												<div className="font-medium">{task.title}</div>
												<div className="text-muted-foreground">
													Due:{" "}
													{new Date(task.dueDate).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
													})}
												</div>
												{task.estimatedDuration && (
													<div className="text-muted-foreground">
														Duration: {task.estimatedDuration}min
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Legend */}
					<div className="flex items-center gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-gray-400 rounded" />
							<span>Not Started</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-blue-600 rounded" />
							<span>In Progress</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-red-600 rounded" />
							<span>Blocked</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-green-600 rounded" />
							<span>Completed</span>
						</div>
						{showDependencies && (
							<div className="flex items-center gap-1">
								<span>{SYMBOLS.STAR}</span>
								<span>Critical Path</span>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TaskGanttChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TaskGanttChartEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Task Timeline
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks with due dates yet</p>
			</CardContent>
		</Card>
	);
}

export const TaskGanttChartMetadata = {
	name: "TaskGanttChart",
	description: "Gantt-style timeline showing task schedules (Detail component using Zustand)",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "400px",
		minWidth: "100%",
	},
	zustand: {
		role: "detail",
		reads: ["selections.phase"],
		writes: [],
		behavior: "Filters timeline by selected phase from Zustand store. Shows all tasks when no phase is selected.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showDependencies: {
			type: "boolean",
			required: false,
			description: "Highlight task dependencies and critical path",
		},
		viewRange: {
			type: "enum",
			required: false,
			values: ["week", "month", "full"],
			description: "Time range to display",
		},
	},
};
