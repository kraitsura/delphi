import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface TasksByPhaseProps {
	eventId: Id<"events">;
	showProgress?: boolean;
	compact?: boolean;
}

export function TasksByPhase(props: TasksByPhaseProps) {
	const { showProgress = true, compact = false } = props;

	// Zustand state - read selected phase from store
	const selectedPhase = useDashboardStore((state) => state.selections.phase);
	const select = useDashboardStore((state) => state.select);
	const clearSelection = useDashboardStore((state) => state.clearSelection);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const phases = useMemo(() => {
		return [
			{ id: "planning", label: "Planning", icon: SYMBOLS.PENCIL, color: "bg-blue-100 dark:bg-blue-900" },
			{ id: "vendor_selection", label: "Vendor Selection", icon: SYMBOLS.HANDSHAKE, color: "bg-purple-100 dark:bg-purple-900" },
			{ id: "design", label: "Design", icon: SYMBOLS.PALETTE, color: "bg-pink-100 dark:bg-pink-900" },
			{ id: "logistics", label: "Logistics", icon: SYMBOLS.TRUCK, color: "bg-yellow-100 dark:bg-yellow-900" },
			{ id: "day_of", label: "Day Of", icon: SYMBOLS.CALENDAR, color: "bg-green-100 dark:bg-green-900" },
			{ id: "post_event", label: "Post Event", icon: SYMBOLS.CHECK_MARK, color: "bg-gray-100 dark:bg-gray-800" },
		];
	}, []);

	const groupedTasks = useMemo(() => {
		if (!tasks) return new Map();

		const groups = new Map<string, typeof tasks>();

		// Initialize all phases
		phases.forEach((phase) => {
			groups.set(phase.id, []);
		});

		// Group tasks by phase
		tasks.forEach((task: any) => {
			const phase = task.phase || "planning";
			const existing = groups.get(phase) || [];
			groups.set(phase, [...existing, task]);
		});

		return groups;
	}, [tasks, phases]);

	const handlePhaseClick = (phaseId: string, phaseName: string) => {
		const newPhase = selectedPhase === phaseId ? null : phaseId;

		if (newPhase) {
			// Update Zustand store with selected phase
			select("phase", newPhase);
		} else {
			// Clear phase selection in Zustand
			clearSelection("phase");
		}
	};

	const handleTaskClick = (taskId: string, taskData: any) => {
		// Update Zustand store with selected task
		select("taskId", taskId);
	};

	const calculatePhaseProgress = (phaseTasks: any[]) => {
		if (phaseTasks.length === 0) return 0;
		const completed = phaseTasks.filter((t) => t.status === "completed").length;
		return Math.round((completed / phaseTasks.length) * 100);
	};

	if (tasks === undefined) {
		return <TasksByPhaseSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TasksByPhaseEmpty />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks by Phase
				</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-3">
					{phases.map((phase) => {
						const phaseTasks = groupedTasks.get(phase.id) || [];
						const progress = calculatePhaseProgress(phaseTasks);
						const isSelected = selectedPhase === phase.id;

						return (
							<div key={phase.id} className="border border-border rounded-lg overflow-hidden">
								{/* Phase header */}
								<div
									className={`p-3 cursor-pointer transition-colors ${
										isSelected
											? "bg-accent/70 border-b-2 border-primary"
											: "bg-card hover:bg-accent/30"
									}`}
									onClick={() => handlePhaseClick(phase.id, phase.label)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-lg">{phase.icon}</span>
											<h3 className="font-medium text-sm">{phase.label}</h3>
											<Badge variant="outline" className="text-xs">
												{phaseTasks.length}
											</Badge>
										</div>

										{showProgress && phaseTasks.length > 0 && (
											<div className="flex items-center gap-2">
												<div className="w-24 bg-secondary h-2 rounded-full overflow-hidden">
													<div
														className="h-full bg-primary transition-all"
														style={{ width: `${progress}%` }}
													/>
												</div>
												<span className="text-xs text-muted-foreground w-8 text-right">
													{progress}%
												</span>
											</div>
										)}
									</div>
								</div>

								{/* Phase tasks (collapsed when not selected, unless compact mode is off) */}
								{(!compact || isSelected) && phaseTasks.length > 0 && (
									<div className={`p-3 space-y-2 ${compact && !isSelected ? "hidden" : ""}`}>
										{phaseTasks.slice(0, compact ? 3 : 10).map((task: any) => (
											<div
												key={task._id}
												className="p-2 rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer border border-border/50"
												onClick={(e) => {
													e.stopPropagation();
													handleTaskClick(task._id, task);
												}}
											>
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1 min-w-0">
														<h4 className="font-normal text-sm truncate">
															{task.title}
														</h4>
														<div className="flex flex-wrap items-center gap-1 mt-1">
															<Badge
																variant="outline"
																className={`text-xs ${
																	task.status === "completed"
																		? "bg-green-100 dark:bg-green-900"
																		: task.status === "blocked"
																			? "bg-red-100 dark:bg-red-900"
																			: task.status === "in_progress"
																				? "bg-blue-100 dark:bg-blue-900"
																				: ""
																}`}
															>
																{task.status.replace("_", " ")}
															</Badge>
															{task.priority !== "medium" && (
																<Badge variant="outline" className="text-xs">
																	{task.priority}
																</Badge>
															)}
															{task.vendor && (
																<Badge variant="outline" className="text-xs">
																	{task.vendor}
																</Badge>
															)}
															{task.criticalPath && (
																<span className="text-xs text-red-600 font-semibold">
																	{SYMBOLS.STAR} Critical
																</span>
															)}
														</div>
													</div>
													{task.assignee && (
														<span className="text-xs text-muted-foreground">
															{task.assignee}
														</span>
													)}
												</div>
											</div>
										))}

										{compact && phaseTasks.length > 3 && (
											<div className="text-center py-1 text-xs text-muted-foreground">
												+{phaseTasks.length - 3} more tasks
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksByPhaseSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksByPhaseEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks by Phase
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const TasksByPhaseMetadata = {
	name: "TasksByPhase",
	description: "Groups tasks by event planning phase (Master component using Zustand)",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	zustand: {
		role: "master",
		writes: ["selections.phase", "selections.taskId"],
		reads: ["selections.phase"],
		behavior: "Clicking a phase updates selections.phase. Clicking again clears it. Clicking a task updates selections.taskId.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showProgress: {
			type: "boolean",
			required: false,
			description: "Show progress bars for each phase",
		},
		compact: {
			type: "boolean",
			required: false,
			description: "Show collapsed view by default",
		},
	},
};
