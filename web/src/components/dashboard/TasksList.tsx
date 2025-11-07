import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface TasksListProps {
	eventId: Id<"events">;
	status?: "not_started" | "in_progress" | "blocked" | "completed" | "all";
	assignee?: Id<"users">;
	category?: string;
	priority?: "low" | "medium" | "high" | "urgent" | "all";
	dueDate?: number;
	limit?: number;
	sortBy?: "dueDate" | "priority" | "status" | "createdAt";
	showFilters?: boolean;
	onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function TasksList(props: TasksListProps) {
	const {
		status = "all",
		priority = "all",
		limit,
		sortBy = "dueDate",
		showFilters = false,
		onTaskSelect,
	} = props;

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const [showFiltersPanel, setShowFiltersPanel] = useState(showFilters);

	const filteredAndSorted = useMemo(() => {
		if (!tasks) return [];

		let filtered = tasks;

		// Filter by status
		if (status !== "all") {
			filtered = filtered.filter((t) => t.status === status);
		}

		// Filter by priority
		if (priority !== "all") {
			filtered = filtered.filter((t) => t.priority === priority);
		}

		// Filter by assignee
		if (props.assignee) {
			filtered = filtered.filter((t) => t.assignedTo === props.assignee);
		}

		// Filter by category
		if (props.category) {
			filtered = filtered.filter((t) => t.category === props.category);
		}

		// Sort
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "dueDate":
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return a.dueDate - b.dueDate;
				case "priority": {
					const priorityOrder = {
						urgent: 0,
						high: 1,
						medium: 2,
						low: 3,
					};
					return priorityOrder[a.priority] - priorityOrder[b.priority];
				}
				case "status":
					return a.status.localeCompare(b.status);
				case "createdAt":
					return a._creationTime - b._creationTime;
				default:
					return 0;
			}
		});

		// Limit
		return limit ? sorted.slice(0, limit) : sorted;
	}, [tasks, status, priority, props.assignee, props.category, sortBy, limit]);

	if (tasks === undefined) {
		return <TasksListSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TasksListEmpty />;
	}

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return "No due date";

		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.ceil(
			(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		const _isOverdue = diffDays < 0;

		if (diffDays < 0) {
			return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
		} else if (diffDays === 0) {
			return { text: "Due today", isOverdue: false };
		} else if (diffDays === 1) {
			return { text: "Due tomorrow", isOverdue: false };
		} else if (diffDays < 7) {
			return { text: `Due in ${diffDays}d`, isOverdue: false };
		} else {
			return {
				text: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				isOverdue: false,
			};
		}
	};

	const getPrioritySymbol = (priority: string) => {
		switch (priority) {
			case "urgent":
				return SYMBOLS.THUNDERBOLT;
			case "high":
				return SYMBOLS.TRIANGLE_UP;
			case "medium":
				return SYMBOLS.BLACK_CIRCLE;
			case "low":
				return SYMBOLS.TRIANGLE_DOWN;
			default:
				return SYMBOLS.BLACK_CIRCLE;
		}
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks
				</CardTitle>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						{filteredAndSorted.length} task
						{filteredAndSorted.length !== 1 ? "s" : ""}
					</span>
					{showFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowFiltersPanel(!showFiltersPanel)}
						>
							Filters
						</Button>
					)}
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-2">
					{filteredAndSorted.map((task) => {
						const dueInfo = formatDate(task.dueDate);
						return (
							<div
								key={task._id}
								className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors cursor-pointer"
								onClick={() => onTaskSelect?.(task._id)}
							>
								<div className="flex items-start gap-3">
									{/* Priority indicator */}
									<span
										className={`priority-indicator priority-indicator--${task.priority} text-lg leading-none mt-0.5`}
									>
										{getPrioritySymbol(task.priority)}
									</span>

									{/* Task content */}
									<div className="flex-1 min-w-0">
										<h4 className="font-normal text-base">{task.title}</h4>

										<div className="flex flex-wrap items-center gap-2 mt-1">
											<Badge
												className={`status-badge status-badge--${task.status.replace("_", "-")} text-xs`}
											>
												{task.status.replace("_", " ")}
											</Badge>

											{task.category && (
												<Badge variant="outline" className="text-xs">
													{task.category}
												</Badge>
											)}

											{task.dueDate && (
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

										{task.description && (
											<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
												{task.description}
											</p>
										)}
									</div>

									{/* Assignee */}
									{task.assignedTo && (
										<Avatar className="h-8 w-8">
											<AvatarFallback className="text-xs">
												{task.assignedTo.substring(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{filteredAndSorted.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<p>No tasks match your filters</p>
					</div>
				)}
			</CardContent>

			<div className="fluid-component-footer px-6 pb-6">
				<Button variant="outline" size="sm" className="w-full">
					Add Task
				</Button>
			</div>
		</Card>
	);
}

function TasksListSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-2">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="p-3 border rounded-md space-y-2">
						<Skeleton className="h-5 w-2/3" />
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

function TasksListEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const TasksListMetadata = {
	name: "TasksList",
	description: "Filterable task list with inline actions",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "350px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: true,
		emits: ["taskSelected", "statusChanged"],
		listensTo: ["categorySelected", "assigneeSelected"],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		status: {
			type: "enum",
			required: false,
			values: ["not_started", "in_progress", "blocked", "completed", "all"],
			description: "Filter by status",
		},
		priority: {
			type: "enum",
			required: false,
			values: ["low", "medium", "high", "urgent", "all"],
			description: "Filter by priority",
		},
		sortBy: {
			type: "enum",
			required: false,
			values: ["dueDate", "priority", "status", "createdAt"],
			description: "Sort tasks by field",
		},
		showFilters: {
			type: "boolean",
			required: false,
			description: "Show filter controls",
		},
	},
};
