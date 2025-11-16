import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { TasksList } from "./TasksList";

export interface TaskGroupDetailsProps {
	id: string;
	eventId: Id<"events">;
	showGroupStats?: boolean;
	showAddButton?: boolean;
	allowBulkActions?: boolean;
}

export function TaskGroupDetails(props: TaskGroupDetailsProps) {
	const {
		id,
		eventId,
		showGroupStats = true,
		showAddButton = true,
		allowBulkActions = false,
	} = props;

	// Zustand selections
	const selectedPhase = useDashboardStore((state) => state.selections.phase);
	const selectedVendor = useDashboardStore((state) => state.selections.vendorId);
	const selectedCategory = useDashboardStore((state) => state.selections.category);
	const selectedAssignee = useDashboardStore((state) => state.selections.assigneeId);
	const selectedStatus = useDashboardStore((state) => state.selections.status);
	const openModal = useDashboardStore((state) => state.openModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const expandPanel = useDashboardStore((state) => state.expandPanel);

	// Convex data
	const tasks = useQuery(api.tasks.listByEvent, { eventId });
	const updateStatus = useMutation(api.tasks.updateStatus);

	// Local state
	const [isCompletingAll, setIsCompletingAll] = useState(false);

	// Filter tasks based on active selections
	const filteredTasks = useMemo(() => {
		if (!tasks) return [];

		let filtered = tasks;

		if (selectedPhase) {
			// Note: phase field doesn't exist in schema yet, so this will filter nothing for now
			filtered = filtered.filter((t) => (t as any).phase === selectedPhase);
		}

		if (selectedVendor) {
			// Note: vendorId field doesn't exist in schema yet, so this will filter nothing for now
			filtered = filtered.filter((t) => (t as any).vendorId === selectedVendor);
		}

		if (selectedCategory) {
			filtered = filtered.filter((t) => t.category === selectedCategory);
		}

		if (selectedAssignee) {
			filtered = filtered.filter((t) => t.assigneeId === selectedAssignee);
		}

		if (selectedStatus) {
			filtered = filtered.filter((t) => t.status === selectedStatus);
		}

		return filtered;
	}, [tasks, selectedPhase, selectedVendor, selectedCategory, selectedAssignee, selectedStatus]);

	// Calculate group stats
	const stats = useMemo(() => {
		const total = filteredTasks.length;
		const completed = filteredTasks.filter((t) => t.status === "completed").length;
		const inProgress = filteredTasks.filter((t) => t.status === "in_progress").length;
		const blocked = filteredTasks.filter((t) => t.status === "blocked").length;
		const notStarted = filteredTasks.filter((t) => t.status === "not_started").length;
		const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

		return {
			total,
			completed,
			inProgress,
			blocked,
			notStarted,
			completionPercent,
		};
	}, [filteredTasks]);

	// Determine group title
	const groupTitle = useMemo(() => {
		const parts: string[] = [];

		if (selectedPhase) parts.push(`Phase: ${selectedPhase}`);
		if (selectedVendor) parts.push(`Vendor: ${selectedVendor.substring(0, 8)}...`);
		if (selectedCategory) parts.push(`Category: ${selectedCategory}`);
		if (selectedAssignee) parts.push(`Assignee: ${selectedAssignee.substring(0, 8)}...`);
		if (selectedStatus) parts.push(`Status: ${selectedStatus.replace("_", " ")}`);

		return parts.length > 0 ? parts.join(" • ") : "All Tasks";
	}, [selectedPhase, selectedVendor, selectedCategory, selectedAssignee, selectedStatus]);

	const handleAddTask = () => {
		// Expand the task creator panel if it exists
		expandPanel("task-creator");
		showToast("Task creator opened", "info");
	};

	const handleCompleteAll = async () => {
		if (!confirm(`Mark all ${stats.total - stats.completed} incomplete tasks as completed?`)) {
			return;
		}

		setIsCompletingAll(true);

		try {
			const incompleteTasks = filteredTasks.filter((t) => t.status !== "completed");

			// Update all tasks in parallel
			await Promise.all(
				incompleteTasks.map((task) =>
					updateStatus({ taskId: task._id, status: "completed" })
				)
			);

			showToast(`${incompleteTasks.length} tasks marked as completed`, "success");
		} catch (error) {
			console.error("Failed to complete all tasks:", error);
			showToast("Failed to complete all tasks", "error");
		} finally {
			setIsCompletingAll(false);
		}
	};

	const handleTaskSelect = (taskId: Id<"tasks">) => {
		// Open task details modal
		openModal(`task-details-${taskId}`, "TaskDetails", { taskId, modalId: `task-details-${taskId}` });
	};

	// Loading state
	if (tasks === undefined) {
		return <TaskGroupDetailsSkeleton />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<CardTitle className="fluid-component-title">
							{SYMBOLS.BLACK_SQUARE} {groupTitle}
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							{stats.total} task{stats.total !== 1 ? "s" : ""}
							{stats.total > 0 && ` • ${stats.completionPercent}% complete`}
						</p>
					</div>

					{showAddButton && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleAddTask}
							className="fluid-button"
						>
							{SYMBOLS.PLUS} Add
						</Button>
					)}
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Group Statistics */}
				{showGroupStats && stats.total > 0 && (
					<div className="mb-6 space-y-3">
						{/* Progress Bar */}
						<div className="space-y-1">
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>Progress</span>
								<span className="fluid-mono">{stats.completionPercent}%</span>
							</div>
							<Progress value={stats.completionPercent} className="h-2" />
						</div>

						{/* Status Breakdown */}
						<div className="flex flex-wrap gap-3 text-xs">
							{stats.completed > 0 && (
								<div className="flex items-center gap-1">
									<Badge className="status-badge status-badge--completed">
										Completed
									</Badge>
									<span className="text-muted-foreground fluid-mono">
										{stats.completed}
									</span>
								</div>
							)}
							{stats.inProgress > 0 && (
								<div className="flex items-center gap-1">
									<Badge className="status-badge status-badge--in-progress">
										In Progress
									</Badge>
									<span className="text-muted-foreground fluid-mono">
										{stats.inProgress}
									</span>
								</div>
							)}
							{stats.blocked > 0 && (
								<div className="flex items-center gap-1">
									<Badge className="status-badge status-badge--blocked">
										Blocked
									</Badge>
									<span className="text-muted-foreground fluid-mono">
										{stats.blocked}
									</span>
								</div>
							)}
							{stats.notStarted > 0 && (
								<div className="flex items-center gap-1">
									<Badge className="status-badge status-badge--not-started">
										Not Started
									</Badge>
									<span className="text-muted-foreground fluid-mono">
										{stats.notStarted}
									</span>
								</div>
							)}
						</div>

						{/* Bulk Actions */}
						{allowBulkActions && stats.total > stats.completed && (
							<div className="pt-2">
								<Button
									size="sm"
									variant="outline"
									onClick={handleCompleteAll}
									disabled={isCompletingAll}
									className="fluid-button"
								>
									{isCompletingAll ? "Completing..." : `${SYMBOLS.CHECK} Complete All`}
								</Button>
							</div>
						)}
					</div>
				)}

				{/* Task List */}
				{stats.total > 0 ? (
					<TasksList
						eventId={eventId}
						status="all"
						priority="all"
						sortBy="dueDate"
						showFilters={false}
						onTaskSelect={handleTaskSelect}
					/>
				) : (
					<div className="text-center py-12 text-muted-foreground">
						<p className="mb-4">No tasks in this group</p>
						{showAddButton && (
							<Button
								variant="outline"
								onClick={handleAddTask}
								className="fluid-button"
							>
								{SYMBOLS.PLUS} Add First Task
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function TaskGroupDetailsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
				<Skeleton className="h-4 w-1/4 mt-2" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-2 w-full" />
				<div className="flex gap-2">
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-6 w-16" />
				</div>
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-20 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export const TaskGroupDetailsMetadata = {
	name: "TaskGroupDetails",
	description: "Group view with task list, stats, and bulk actions based on Zustand selections",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "400px",
		minHeight: "500px",
	},
	zustand: {
		role: "detail",
		reads: [
			"selections.phase",
			"selections.vendorId",
			"selections.category",
			"selections.assigneeId",
			"selections.status",
		],
		writes: [],
		behavior:
			"Shows filtered task list based on active Zustand selections. Displays group statistics (total, completion %, status breakdown). Opens task creator on add. Opens TaskDetails modal when task is clicked. Supports bulk complete all action.",
	},
	props: {
		id: {
			type: "string",
			required: true,
			description: "Component instance ID",
		},
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showGroupStats: {
			type: "boolean",
			required: false,
			description: "Show group statistics (default: true)",
		},
		showAddButton: {
			type: "boolean",
			required: false,
			description: "Show add task button (default: true)",
		},
		allowBulkActions: {
			type: "boolean",
			required: false,
			description: "Allow bulk complete all action (default: false)",
		},
	},
};
