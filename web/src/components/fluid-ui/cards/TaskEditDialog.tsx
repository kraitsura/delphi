import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface TaskEditDialogProps {
	taskId: Id<"tasks"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TaskEditDialog({
	taskId,
	open,
	onOpenChange,
}: TaskEditDialogProps) {
	const [isSaving, setIsSaving] = useState(false);

	// Track the current edit generation to prevent stale saves
	const editGenerationRef = useRef(0);
	const currentTaskIdRef = useRef<Id<"tasks"> | null>(null);

	// Fetch current task data
	const task = useQuery(api.tasks.getById, taskId ? { taskId } : "skip");
	const updateTask = useMutation(api.tasks.update);

	// Local state for inputs
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<
		"todo" | "in_progress" | "blocked" | "completed" | "cancelled"
	>("todo");
	const [priority, setPriority] = useState<
		"low" | "medium" | "high" | "urgent"
	>("medium");
	const [category, setCategory] = useState<string>("other");
	const [deadline, setDeadline] = useState("");

	// Debounced values for auto-save
	const debouncedTitle = useDebounce(title, 500);
	const debouncedDescription = useDebounce(description, 500);

	// Initialize form with task data and handle taskId changes
	useEffect(() => {
		// When taskId changes, increment generation to invalidate pending saves
		if (currentTaskIdRef.current !== taskId) {
			editGenerationRef.current += 1;
			currentTaskIdRef.current = taskId;
		}

		if (task && taskId) {
			// Initialize form with task data
			setTitle(task.title);
			setDescription(task.description || "");
			setStatus(task.status);
			setPriority(task.priority);
			setCategory(task.category);
			setDeadline(
				task.deadline
					? new Date(task.deadline).toISOString().split("T")[0]
					: "",
			);
		} else if (!taskId) {
			// Reset form state when dialog closes
			setTitle("");
			setDescription("");
			setStatus("todo");
			setPriority("medium");
			setCategory("other");
			setDeadline("");
		}
	}, [task, taskId]);

	// Auto-save title (debounced)
	useEffect(() => {
		if (!taskId || !task) return;
		if (debouncedTitle === task.title) return;
		if (!debouncedTitle.trim()) return;

		// Capture current generation to detect stale effects
		const currentGeneration = editGenerationRef.current;
		let isCancelled = false;

		const save = async () => {
			// Check if this effect is stale before saving
			if (isCancelled || currentGeneration !== editGenerationRef.current) {
				return;
			}

			setIsSaving(true);
			try {
				await updateTask({
					taskId,
					title: debouncedTitle.trim(),
				});
			} catch (error) {
				console.error("Failed to update title:", error);
				toast.error("Failed to update title");
			} finally {
				// Only clear saving state if this generation is still current
				if (currentGeneration === editGenerationRef.current) {
					setIsSaving(false);
				}
			}
		};

		save();

		// Cleanup: cancel this effect if taskId changes
		return () => {
			isCancelled = true;
		};
	}, [debouncedTitle, taskId, task, updateTask]);

	// Auto-save description (debounced)
	useEffect(() => {
		if (!taskId || !task) return;
		if (debouncedDescription === (task.description || "")) return;

		// Capture current generation to detect stale effects
		const currentGeneration = editGenerationRef.current;
		let isCancelled = false;

		const save = async () => {
			// Check if this effect is stale before saving
			if (isCancelled || currentGeneration !== editGenerationRef.current) {
				return;
			}

			setIsSaving(true);
			try {
				await updateTask({
					taskId,
					description: debouncedDescription.trim() || undefined,
				});
			} catch (error) {
				console.error("Failed to update description:", error);
				toast.error("Failed to update description");
			} finally {
				// Only clear saving state if this generation is still current
				if (currentGeneration === editGenerationRef.current) {
					setIsSaving(false);
				}
			}
		};

		save();

		// Cleanup: cancel this effect if taskId changes
		return () => {
			isCancelled = true;
		};
	}, [debouncedDescription, taskId, task, updateTask]);

	// Auto-save status (immediate)
	const handleStatusChange = async (newStatus: string) => {
		if (!taskId) return;

		// Capture current generation and taskId
		const currentGeneration = editGenerationRef.current;
		const capturedTaskId = taskId;

		setStatus(newStatus as any);
		setIsSaving(true);
		try {
			// Check if still current before saving
			if (currentGeneration !== editGenerationRef.current) {
				return;
			}

			await updateTask({
				taskId: capturedTaskId,
				status: newStatus as any,
			});
		} catch (error) {
			console.error("Failed to update status:", error);
			toast.error("Failed to update status");
		} finally {
			// Only clear saving state if this generation is still current
			if (currentGeneration === editGenerationRef.current) {
				setIsSaving(false);
			}
		}
	};

	// Auto-save priority (immediate)
	const handlePriorityChange = async (newPriority: string) => {
		if (!taskId) return;

		// Capture current generation and taskId
		const currentGeneration = editGenerationRef.current;
		const capturedTaskId = taskId;

		setPriority(newPriority as any);
		setIsSaving(true);
		try {
			// Check if still current before saving
			if (currentGeneration !== editGenerationRef.current) {
				return;
			}

			await updateTask({
				taskId: capturedTaskId,
				priority: newPriority as any,
			});
		} catch (error) {
			console.error("Failed to update priority:", error);
			toast.error("Failed to update priority");
		} finally {
			// Only clear saving state if this generation is still current
			if (currentGeneration === editGenerationRef.current) {
				setIsSaving(false);
			}
		}
	};

	// Auto-save category (immediate)
	const handleCategoryChange = async (newCategory: string) => {
		if (!taskId) return;

		// Capture current generation and taskId
		const currentGeneration = editGenerationRef.current;
		const capturedTaskId = taskId;

		setCategory(newCategory);
		setIsSaving(true);
		try {
			// Check if still current before saving
			if (currentGeneration !== editGenerationRef.current) {
				return;
			}

			await updateTask({
				taskId: capturedTaskId,
				category: newCategory as any,
			});
		} catch (error) {
			console.error("Failed to update category:", error);
			toast.error("Failed to update category");
		} finally {
			// Only clear saving state if this generation is still current
			if (currentGeneration === editGenerationRef.current) {
				setIsSaving(false);
			}
		}
	};

	// Auto-save deadline (immediate)
	const handleDeadlineChange = async (newDeadline: string) => {
		if (!taskId) return;

		// Capture current generation and taskId
		const currentGeneration = editGenerationRef.current;
		const capturedTaskId = taskId;

		setDeadline(newDeadline);
		setIsSaving(true);
		try {
			// Check if still current before saving
			if (currentGeneration !== editGenerationRef.current) {
				return;
			}

			await updateTask({
				taskId: capturedTaskId,
				deadline: newDeadline ? new Date(newDeadline).getTime() : undefined,
			});
		} catch (error) {
			console.error("Failed to update deadline:", error);
			toast.error("Failed to update deadline");
		} finally {
			// Only clear saving state if this generation is still current
			if (currentGeneration === editGenerationRef.current) {
				setIsSaving(false);
			}
		}
	};

	if (!task) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle className="sr-only">Edit Task</DialogTitle>
						{/* Saving indicator */}
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							{isSaving ? (
								<>
									<Loader2 className="h-3 w-3 animate-spin" />
									<span>Saving...</span>
								</>
							) : (
								<>
									<Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
									<span>Saved</span>
								</>
							)}
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Title - Large, borderless, inline */}
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Task title..."
						className={cn(
							"w-full text-2xl font-bold bg-transparent border-none outline-none",
							"placeholder:text-gray-300 focus:outline-none",
							"px-0",
						)}
					/>

					{/* Description - Borderless textarea */}
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Add a description..."
						rows={3}
						className={cn(
							"w-full resize-none bg-transparent border-none outline-none",
							"placeholder:text-muted-foreground/50 text-foreground",
							"px-0 leading-relaxed",
						)}
					/>

					{/* Metadata section - subtle, inline selects */}
					<div className="space-y-4 pt-4 border-t border-border">
						<div className="grid grid-cols-2 gap-6">
							{/* Status */}
							<div className="flex items-center gap-3">
								<span className="text-sm text-muted-foreground min-w-[70px]">
									Status
								</span>
								<Select value={status} onValueChange={handleStatusChange}>
									<SelectTrigger className="h-8 border-border focus:ring-1 focus:ring-ring transition-all duration-150">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todo">To Do</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="blocked">Blocked</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Priority */}
							<div className="flex items-center gap-3">
								<span className="text-sm text-muted-foreground min-w-[70px]">
									Priority
								</span>
								<Select value={priority} onValueChange={handlePriorityChange}>
									<SelectTrigger className="h-8 border-border focus:ring-1 focus:ring-ring transition-all duration-150">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-6">
							{/* Category */}
							<div className="flex items-center gap-3">
								<span className="text-sm text-muted-foreground min-w-[70px]">
									Category
								</span>
								<Select value={category} onValueChange={handleCategoryChange}>
									<SelectTrigger className="h-8 border-border focus:ring-1 focus:ring-ring transition-all duration-150">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="venue">Venue</SelectItem>
										<SelectItem value="catering">Catering</SelectItem>
										<SelectItem value="photography">Photography</SelectItem>
										<SelectItem value="music">Music</SelectItem>
										<SelectItem value="decor">Decor</SelectItem>
										<SelectItem value="invitations">Invitations</SelectItem>
										<SelectItem value="transportation">
											Transportation
										</SelectItem>
										<SelectItem value="accommodation">Accommodation</SelectItem>
										<SelectItem value="planning">Planning</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Deadline */}
							<div className="flex items-center gap-3">
								<span className="text-sm text-muted-foreground min-w-[70px]">
									Deadline
								</span>
								<input
									type="date"
									value={deadline}
									onChange={(e) => handleDeadlineChange(e.target.value)}
									className={cn(
										"flex-1 h-8 px-3 text-sm border border-border rounded-md",
										"focus:outline-none focus:ring-1 focus:ring-ring transition-all duration-150",
									)}
								/>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
