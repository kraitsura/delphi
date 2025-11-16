import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { TaskEditor } from "./TaskEditor";

export interface TaskDetailsProps {
	taskId: Id<"tasks">;
	modalId: string;
}

export function TaskDetails(props: TaskDetailsProps) {
	const { taskId, modalId } = props;

	// Zustand actions
	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Convex queries and mutations
	const task = useQuery(api.tasks.getById, { taskId });
	const updateStatus = useMutation(api.tasks.updateStatus);
	const removeTask = useMutation(api.tasks.remove);

	// Local state
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleClose = () => {
		closeModal(modalId);
	};

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleSave = () => {
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
	};

	const handleStatusChange = async (newStatus: "not_started" | "in_progress" | "blocked" | "completed") => {
		try {
			await updateStatus({ taskId, status: newStatus });
			showToast(`Task marked as ${newStatus.replace("_", " ")}`, "success");
		} catch (error) {
			console.error("Failed to update status:", error);
			addError("Failed to update task status");
		}
	};

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
			return;
		}

		setIsDeleting(true);

		try {
			await removeTask({ taskId });
			showToast("Task deleted successfully", "success");
			handleClose();
		} catch (error) {
			console.error("Failed to delete task:", error);
			addError("Failed to delete task");
		} finally {
			setIsDeleting(false);
		}
	};

	// Loading state
	if (task === undefined) {
		return (
			<Dialog open onOpenChange={handleClose}>
				<DialogContent className="max-w-2xl">
					<TaskDetailsSkeleton />
				</DialogContent>
			</Dialog>
		);
	}

	// Error state
	if (!task) {
		return (
			<Dialog open onOpenChange={handleClose}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Task Not Found</DialogTitle>
						<DialogDescription>
							The task you're looking for doesn't exist or has been deleted.
						</DialogDescription>
					</DialogHeader>
					<Button onClick={handleClose}>Close</Button>
				</DialogContent>
			</Dialog>
		);
	}

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

	const formatDate = (timestamp: number | undefined): string => {
		if (!timestamp) return "No date set";
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatDateTime = (timestamp: number | undefined): string => {
		if (!timestamp) return "Unknown";
		return new Date(timestamp).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	// Show editor if in edit mode
	if (isEditing) {
		return (
			<Dialog open onOpenChange={handleClose}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>
							Update task details and save your changes.
						</DialogDescription>
					</DialogHeader>
					<TaskEditor
						taskId={taskId}
						onSave={handleSave}
						onCancel={handleCancelEdit}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	// Read-only view
	return (
		<Dialog open onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						<span className={`text-xl priority-indicator--${task.priority}`}>
							{getPrioritySymbol(task.priority)}
						</span>
						<span className="flex-1">{task.title}</span>
					</DialogTitle>
					<DialogDescription>
						<div className="flex flex-wrap items-center gap-2 mt-2">
							<Badge className={`status-badge status-badge--${task.status.replace("_", "-")}`}>
								{task.status.replace("_", " ")}
							</Badge>
							{task.category && (
								<Badge variant="outline">{task.category}</Badge>
							)}
							<Badge variant="outline" className={`priority-indicator--${task.priority}`}>
								{task.priority}
							</Badge>
						</div>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Description */}
					{task.description && (
						<div>
							<h4 className="text-sm font-normal text-muted-foreground mb-2">
								Description
							</h4>
							<p className="text-sm leading-relaxed">{task.description}</p>
						</div>
					)}

					<Separator />

					{/* Task Details Grid */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="text-xs font-normal text-muted-foreground mb-1">
								Due Date
							</h4>
							<p className="text-sm">{formatDate(task.dueDate)}</p>
						</div>

						{task.estimatedTime && (
							<div>
								<h4 className="text-xs font-normal text-muted-foreground mb-1">
									Estimated Time
								</h4>
								<p className="text-sm">{task.estimatedTime}</p>
							</div>
						)}

						{task.estimatedCost && (
							<div>
								<h4 className="text-xs font-normal text-muted-foreground mb-1">
									Estimated Cost
								</h4>
								<p className="text-sm fluid-mono">
									${task.estimatedCost.min.toFixed(2)} - ${task.estimatedCost.max.toFixed(2)}
								</p>
							</div>
						)}

						{task.assigneeId && (
							<div>
								<h4 className="text-xs font-normal text-muted-foreground mb-1">
									Assigned To
								</h4>
								<p className="text-sm">{task.assigneeId.substring(0, 8)}...</p>
							</div>
						)}
					</div>

					{/* AI Suggestions */}
					{task.aiEnriched && task.aiSuggestions && (
						<>
							<Separator />
							<div>
								<h4 className="text-sm font-normal text-muted-foreground mb-3">
									{SYMBOLS.SPARKLE} AI Suggestions
								</h4>

								{task.aiSuggestions.vendors && task.aiSuggestions.vendors.length > 0 && (
									<div className="mb-3">
										<p className="text-xs text-muted-foreground mb-1">Recommended Vendors:</p>
										<div className="flex flex-wrap gap-2">
											{task.aiSuggestions.vendors.map((vendor, i) => (
												<Badge key={i} variant="secondary" className="text-xs">
													{vendor}
												</Badge>
											))}
										</div>
									</div>
								)}

								{task.aiSuggestions.tips && task.aiSuggestions.tips.length > 0 && (
									<div className="mb-3">
										<p className="text-xs text-muted-foreground mb-1">Tips:</p>
										<ul className="space-y-1">
											{task.aiSuggestions.tips.map((tip, i) => (
												<li key={i} className="text-xs pl-4">
													{SYMBOLS.BLACK_CIRCLE} {tip}
												</li>
											))}
										</ul>
									</div>
								)}

								{task.aiSuggestions.questionsToAsk && task.aiSuggestions.questionsToAsk.length > 0 && (
									<div>
										<p className="text-xs text-muted-foreground mb-1">Questions to Ask:</p>
										<ul className="space-y-1">
											{task.aiSuggestions.questionsToAsk.map((question, i) => (
												<li key={i} className="text-xs pl-4">
													{SYMBOLS.BLACK_CIRCLE} {question}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</>
					)}

					<Separator />

					{/* Metadata */}
					<div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
						<div>
							<p>Created: {formatDateTime(task.createdAt)}</p>
							<p>Updated: {formatDateTime(task.updatedAt)}</p>
						</div>
						<div>
							{task.completedAt && (
								<p>Completed: {formatDateTime(task.completedAt)}</p>
							)}
						</div>
					</div>

					<Separator />

					{/* Quick Actions */}
					<div className="space-y-3">
						<h4 className="text-sm font-normal text-muted-foreground">
							Quick Actions
						</h4>
						<div className="flex flex-wrap gap-2">
							{task.status !== "completed" && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleStatusChange("completed")}
									className="fluid-button"
								>
									{SYMBOLS.CHECK} Mark Complete
								</Button>
							)}
							{task.status !== "in_progress" && task.status !== "completed" && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleStatusChange("in_progress")}
									className="fluid-button"
								>
									{SYMBOLS.TRIANGLE_RIGHT} Start Task
								</Button>
							)}
							{task.status !== "blocked" && task.status !== "completed" && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleStatusChange("blocked")}
									className="fluid-button"
								>
									{SYMBOLS.CROSS} Mark Blocked
								</Button>
							)}
						</div>
					</div>

					<Separator />

					{/* Main Actions */}
					<div className="flex gap-2">
						<Button
							onClick={handleEdit}
							className="fluid-button flex-1"
							variant="default"
						>
							Edit Task
						</Button>
						<Button
							onClick={handleDelete}
							disabled={isDeleting}
							variant="destructive"
							className="fluid-button"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
						<Button
							onClick={handleClose}
							variant="outline"
							className="fluid-button"
						>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function TaskDetailsSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-3/4 mb-2" />
				<div className="flex gap-2">
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-6 w-16" />
				</div>
			</div>
			<Skeleton className="h-20 w-full" />
			<div className="grid grid-cols-2 gap-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}

export const TaskDetailsMetadata = {
	name: "TaskDetails",
	description: "Full task detail modal with read/edit modes and quick actions",
	layoutRules: {
		canShare: false,
		mustSpanFull: false,
		preferredRatio: "1fr",
	},
	zustand: {
		role: "detail",
		reads: ["modals"],
		writes: [],
		behavior: "Modal overlay showing full task details. Switches between read-only and edit modes. Provides quick status change actions and delete functionality.",
	},
	props: {
		taskId: {
			type: "string",
			required: true,
			description: "Task ID to display",
		},
		modalId: {
			type: "string",
			required: true,
			description: "Modal instance ID for Zustand",
		},
	},
};
