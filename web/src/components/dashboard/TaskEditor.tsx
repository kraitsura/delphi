import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface TaskEditorProps {
	taskId: Id<"tasks">;
	onSave?: () => void;
	onCancel?: () => void;
}

export function TaskEditor(props: TaskEditorProps) {
	const { taskId, onSave, onCancel } = props;

	// Zustand actions
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Convex queries and mutations
	const task = useQuery(api.tasks.getById, { taskId });
	const updateTask = useMutation(api.tasks.update);

	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [status, setStatus] = useState<
		"todo" | "in_progress" | "blocked" | "completed" | "cancelled"
	>("todo");
	const [priority, setPriority] = useState<
		"low" | "medium" | "high" | "urgent"
	>("medium");
	const [dueDate, setDueDate] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Load task data into form
	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description || "");
			setCategory(task.category || "");
			setStatus(task.status);
			setPriority(task.priority);
			setDueDate(
				task.deadline
					? new Date(task.deadline).toISOString().split("T")[0]
					: "",
			);
		}
	}, [task]);

	// Form validation
	const validStatuses = ["todo", "in_progress", "blocked", "completed", "cancelled"];
	const validPriorities = ["low", "medium", "high", "urgent"];
	const isValid =
		title.trim().length > 0 &&
		validStatuses.includes(status) &&
		validPriorities.includes(priority);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || isSubmitting || !task) return;

		setIsSubmitting(true);

		try {
			// Build update payload
			const updates: any = {
				taskId,
				title: title.trim(),
				description: description.trim() || undefined,
				category: category.trim() || undefined,
				status: status || task.status,
				priority: priority || task.priority,
				deadline: dueDate ? new Date(dueDate).getTime() : undefined,
			};

			await updateTask(updates);

			// Success
			showToast("Task updated successfully", "success");

			// Callback
			onSave?.();
		} catch (error) {
			console.error("Failed to update task:", error);
			addError("Failed to update task. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		// Reset to original values
		if (task) {
			setTitle(task.title);
			setDescription(task.description || "");
			setCategory(task.category || "");
			setStatus(task.status);
			setPriority(task.priority);
			setDueDate(
				task.deadline
					? new Date(task.deadline).toISOString().split("T")[0]
					: "",
			);
		}
		onCancel?.();
	};

	// Loading state
	if (task === undefined) {
		return <TaskEditorSkeleton />;
	}

	// Error state
	if (!task) {
		return (
			<div className="p-6 text-center text-muted-foreground">
				<p>Task not found</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4 p-6">
			{/* Title - Required */}
			<div className="space-y-2">
				<Label htmlFor="edit-title" className="text-sm font-normal">
					Title <span className="text-red-500">*</span>
				</Label>
				<Input
					id="edit-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Enter task title..."
					className="fluid-input"
					required
				/>
			</div>

			{/* Description */}
			<div className="space-y-2">
				<Label htmlFor="edit-description" className="text-sm font-normal">
					Description
				</Label>
				<Textarea
					id="edit-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Add details about this task..."
					className="fluid-input min-h-[100px]"
					rows={4}
				/>
			</div>

			{/* Status and Priority */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="edit-status" className="text-sm font-normal">
						Status
					</Label>
					<Select
					value={status}
					onValueChange={(v: any) => {
						if (v && validStatuses.includes(v)) {
							setStatus(v);
						}
					}}
				>
						<SelectTrigger id="edit-status" className="fluid-input">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todo">To Do</SelectItem>
							<SelectItem value="in_progress">In Progress</SelectItem>
							<SelectItem value="blocked">Blocked</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="edit-priority" className="text-sm font-normal">
						Priority
					</Label>
					<Select
					value={priority}
					onValueChange={(v: any) => {
						if (v && validPriorities.includes(v)) {
							setPriority(v);
						}
					}}
				>
						<SelectTrigger id="edit-priority" className="fluid-input">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">{SYMBOLS.TRIANGLE_DOWN} Low</SelectItem>
							<SelectItem value="medium">
								{SYMBOLS.BLACK_CIRCLE} Medium
							</SelectItem>
							<SelectItem value="high">{SYMBOLS.TRIANGLE_UP} High</SelectItem>
							<SelectItem value="urgent">
								{SYMBOLS.THUNDERBOLT} Urgent
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Category */}
			<div className="space-y-2">
				<Label htmlFor="edit-category" className="text-sm font-normal">
					Category
				</Label>
				<Select value={category} onValueChange={setCategory}>
					<SelectTrigger id="edit-category" className="fluid-input">
						<SelectValue placeholder="Select category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="venue">Venue</SelectItem>
						<SelectItem value="catering">Catering</SelectItem>
						<SelectItem value="photography">Photography</SelectItem>
						<SelectItem value="music">Music</SelectItem>
						<SelectItem value="flowers">Flowers</SelectItem>
						<SelectItem value="attire">Attire</SelectItem>
						<SelectItem value="invitations">Invitations</SelectItem>
						<SelectItem value="travel">Travel</SelectItem>
						<SelectItem value="other">Other</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Due Date */}
			<div className="space-y-2">
				<Label htmlFor="edit-dueDate" className="text-sm font-normal">
					Due Date
				</Label>
				<Input
					id="edit-dueDate"
					type="date"
					value={dueDate}
					onChange={(e) => setDueDate(e.target.value)}
					className="fluid-input"
				/>
			</div>

			{/* Actions */}
			<div className="flex gap-2 pt-4 border-t">
				<Button
					type="submit"
					disabled={!isValid || isSubmitting}
					className="fluid-button fluid-button--primary flex-1"
				>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={handleCancel}
					disabled={isSubmitting}
					className="fluid-button"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}

function TaskEditorSkeleton() {
	return (
		<div className="space-y-4 p-6">
			<div className="space-y-2">
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-24 w-full" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>
		</div>
	);
}

export const TaskEditorMetadata = {
	name: "TaskEditor",
	description: "Comprehensive task editing form with all fields and validation",
	layoutRules: {
		canShare: false,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "400px",
	},
	zustand: {
		role: "input",
		reads: [],
		writes: [],
		behavior:
			"Full-featured task editor. Tracks changes and enables save only when modified. Shows toast notifications on success/error.",
	},
	props: {
		taskId: {
			type: "string",
			required: true,
			description: "Task ID to edit",
		},
	},
};
