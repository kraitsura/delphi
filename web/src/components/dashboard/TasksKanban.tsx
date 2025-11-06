import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface TasksKanbanProps {
	eventId: Id<"events">;
	columns?: string[];
	groupBy?: "status" | "priority" | "assignee" | "category";
	showCounts?: boolean;
	onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function TasksKanban(props: TasksKanbanProps) {
	const { groupBy = "status", showCounts = true, onTaskSelect } = props;

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const columns = useMemo(() => {
		if (groupBy === "status") {
			return [
				{
					id: "not_started",
					label: "Not Started",
					color: "bg-gray-100 dark:bg-gray-800",
				},
				{
					id: "in_progress",
					label: "In Progress",
					color: "bg-blue-100 dark:bg-blue-900",
				},
				{
					id: "blocked",
					label: "Blocked",
					color: "bg-red-100 dark:bg-red-900",
				},
				{
					id: "completed",
					label: "Completed",
					color: "bg-green-100 dark:bg-green-900",
				},
			];
		}
		return [];
	}, [groupBy]);

	const groupedTasks = useMemo(() => {
		if (!tasks) return new Map();

		const groups = new Map<string, typeof tasks>();

		// Initialize all columns
		columns.forEach((col) => {
			groups.set(col.id, []);
		});

		// Group tasks
		tasks.forEach((task) => {
			const key =
				groupBy === "status"
					? task.status
					: groupBy === "priority"
						? task.priority
						: groupBy === "assignee"
							? task.assignedTo || "unassigned"
							: task.category || "uncategorized";

			const existing = groups.get(key) || [];
			groups.set(key, [...existing, task]);
		});

		return groups;
	}, [tasks, columns, groupBy]);

	if (tasks === undefined) {
		return <TasksKanbanSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TasksKanbanEmpty />;
	}

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return null;

		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.ceil(
			(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays < 0) {
			return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
		} else if (diffDays === 0) {
			return { text: "Today", isOverdue: false };
		} else if (diffDays === 1) {
			return { text: "Tomorrow", isOverdue: false };
		} else if (diffDays < 7) {
			return { text: `${diffDays}d`, isOverdue: false };
		}
		return null;
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks Board
				</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="grid grid-cols-4 gap-4">
					{columns.map((column) => {
						const columnTasks = groupedTasks.get(column.id) || [];

						return (
							<div key={column.id} className="flex flex-col min-h-[400px]">
								{/* Column header */}
								<div className="mb-3 pb-2 border-b">
									<h3 className="font-normal text-sm uppercase tracking-wide text-muted-foreground">
										{column.label}
									</h3>
									{showCounts && (
										<span className="text-xs text-muted-foreground">
											{columnTasks.length} task
											{columnTasks.length !== 1 ? "s" : ""}
										</span>
									)}
								</div>

								{/* Column content */}
								<div className="flex-1 space-y-2 overflow-y-auto">
									{columnTasks.map((task) => {
										const dueInfo = formatDate(task.dueDate);

										return (
											<div
												key={task._id}
												className="p-3 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
												onClick={() => onTaskSelect?.(task._id)}
											>
												<h4 className="font-normal text-sm line-clamp-2">
													{task.title}
												</h4>

												<div className="flex flex-wrap items-center gap-1.5 mt-2">
													{task.priority !== "medium" && (
														<Badge variant="outline" className="text-xs">
															{task.priority}
														</Badge>
													)}

													{task.category && (
														<Badge variant="outline" className="text-xs">
															{task.category}
														</Badge>
													)}

													{dueInfo && (
														<span
															className={`text-xs ${
																dueInfo.isOverdue
																	? "text-red-600 font-semibold"
																	: "text-muted-foreground"
															}`}
														>
															{dueInfo.text}
														</span>
													)}
												</div>

												{/* Assignee */}
												{task.assignedTo && (
													<div className="mt-2 flex items-center gap-2">
														<Avatar className="h-6 w-6">
															<AvatarFallback className="text-xs">
																{task.assignedTo.substring(0, 2).toUpperCase()}
															</AvatarFallback>
														</Avatar>
													</div>
												)}
											</div>
										);
									})}

									{columnTasks.length === 0 && (
										<div className="text-center py-8 text-muted-foreground text-sm">
											No tasks
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksKanbanSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksKanbanEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks Board
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const TasksKanbanMetadata = {
	name: "TasksKanban",
	description: "Kanban board view with status columns",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minWidth: "100%",
		minHeight: "400px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["taskSelected"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		groupBy: {
			type: "enum",
			required: false,
			values: ["status", "priority", "assignee", "category"],
			description: "Group tasks by field",
		},
		showCounts: {
			type: "boolean",
			required: false,
			description: "Show task counts per column",
		},
	},
};
