/**
 * TaskListCard - Displays existing tasks in a compact card format
 *
 * Features:
 * - Compact list view for AI message responses
 * - Status indicators (pending, in-progress, completed)
 * - Category and priority badges
 * - Quick actions (mark complete, view details)
 * - Filters by status
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, ChevronRight, Circle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TaskEditDialog } from "./TaskEditDialog";

interface TaskListCardProps {
	eventId: Id<"events">;
	roomId?: Id<"rooms">;
	filter?: "all" | "pending" | "completed";
	limit?: number;
	title?: string;
}

export function TaskListCard({
	eventId,
	filter = "all",
	limit = 10,
	title = "Tasks",
}: TaskListCardProps) {
	const [selectedStatus] = useState<string | null>(null);
	const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | null>(null);

	// Query tasks for the event
	const tasks = useQuery(api.tasks.listByEvent, { eventId });

	// Mutation to update task status
	const updateTask = useMutation(api.tasks.updateStatus);

	const handleToggleComplete = async (
		taskId: Id<"tasks">,
		currentStatus: string,
	) => {
		try {
			const newStatus = currentStatus === "completed" ? "todo" : "completed";
			await updateTask({
				taskId: taskId,
				status: newStatus,
			});
			toast.success(
				newStatus === "completed" ? "Task completed!" : "Task marked as todo",
			);
		} catch (error) {
			toast.error("Failed to update task");
			console.error("Task update error:", error);
		}
	};

	// Filter tasks based on selected filter
	const filteredTasks = tasks
		? tasks.filter((task) => {
				if (filter === "pending") return task.status !== "completed";
				if (filter === "completed") return task.status === "completed";
				if (selectedStatus) return task.status === selectedStatus;
				return true;
			})
		: [];

	const pendingCount =
		tasks?.filter((t) => t.status !== "completed").length || 0;
	const completedCount =
		tasks?.filter((t) => t.status === "completed").length || 0;

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "urgent":
				return "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400";
			case "high":
				return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
			case "medium":
				return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
			case "low":
				return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
			default:
				return "bg-muted/50 text-muted-foreground";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle2 className="h-4 w-4 text-green-600" />;
			case "in-progress":
				return <Clock className="h-4 w-4 text-blue-600" />;
			default:
				return <Circle className="h-4 w-4 text-gray-400" />;
		}
	};

	if (!tasks) {
		return (
			<Card className="border-border/60 bg-card shadow-sm">
				<CardContent className="py-8">
					<div className="text-center text-sm text-muted-foreground">
						Loading tasks...
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-border/60 bg-card shadow-sm">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-medium text-foreground">
						{title}
					</CardTitle>
					<div className="flex gap-2 text-xs">
						<span className="px-2 py-0.5 bg-muted/50 text-muted-foreground rounded-full">
							{pendingCount} pending
						</span>
						<span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-full">
							{completedCount} done
						</span>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-1.5">
				{filteredTasks.length === 0 ? (
					<div className="text-center py-6 text-sm text-muted-foreground">
						{filter === "completed"
							? "No completed tasks yet"
							: filter === "pending"
								? "No pending tasks"
								: "No tasks found"}
					</div>
				) : (
					<div className="space-y-1.5">
						{filteredTasks.slice(0, limit).map((task) => (
							<div
								key={task._id}
								className={cn(
									"group/task px-3 py-2 bg-card border rounded-md transition-all hover:shadow-sm hover:border-border",
									task.status === "completed"
										? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
										: "border-border/40",
								)}
							>
								<div className="flex items-start gap-2">
									{/* Status toggle button */}
									<button
										type="button"
										onClick={() => handleToggleComplete(task._id, task.status)}
										className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
										aria-label={
											task.status === "completed"
												? "Mark as pending"
												: "Mark as completed"
										}
									>
										{getStatusIcon(task.status)}
									</button>

									{/* Task content */}
									<div className="flex-1 min-w-0">
										<div
											className={cn(
												"font-medium text-sm",
												task.status === "completed"
													? "line-through text-muted-foreground"
													: "text-foreground",
											)}
										>
											{task.title}
										</div>
										{task.description && (
											<div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
												{task.description}
											</div>
										)}
										<div className="flex items-center gap-1.5 mt-1.5">
											{task.category && (
												<span className="text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground rounded">
													{task.category}
												</span>
											)}
											{task.priority && (
												<span
													className={`text-[10px] px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}
												>
													{task.priority}
												</span>
											)}
											{task.deadline && (
												<span className="text-[10px] text-muted-foreground">
													Due:{" "}
													{new Date(task.deadline).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
													})}
												</span>
											)}
										</div>
									</div>

									{/* View details button (shown on hover) */}
									<button
										type="button"
										onClick={() => setEditingTaskId(task._id)}
										className="flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity"
										aria-label="View task details"
									>
										<ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
									</button>
								</div>
							</div>
						))}

						{/* Show "View all" if there are more tasks */}
						{tasks.length > limit && (
							<div className="pt-2 text-center">
								<Button
									size="sm"
									variant="link"
									className="h-7 text-xs text-primary"
								>
									View all {tasks.length} tasks
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>

			{/* Task Edit Dialog */}
			<TaskEditDialog
				taskId={editingTaskId}
				open={editingTaskId !== null}
				onOpenChange={(open) => {
					if (!open) setEditingTaskId(null);
				}}
			/>
		</Card>
	);
}
