import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface AddTaskModalProps {
	eventId: Id<"events">;
	modalId: string;
}

export function AddTaskModal(props: AddTaskModalProps) {
	const { eventId, modalId } = props;
	const createTask = useMutation(api.tasks.create);

	// Fetch the main room for this event
	const rooms = useQuery(api.rooms.listByEvent, { eventId });
	const mainRoom = rooms?.find(room => room.type === "main");

	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<
		"todo" | "in_progress" | "blocked" | "completed"
	>("todo");
	const [priority, setPriority] = useState<
		"low" | "medium" | "high" | "urgent"
	>("medium");
	const [category, setCategory] = useState<
		"venue" | "catering" | "photography" | "music" | "decor" | "invitations" | "transportation" | "other" | ""
	>("");

	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim()) {
			addError("Task title is required");
			return;
		}

		if (!mainRoom) {
			addError("No main room found for this event");
			return;
		}

		try {
			setIsSaving(true);
			const validCategories = ["venue", "catering", "photography", "music", "decor", "invitations", "transportation", "other"] as const;
			const categoryValue = validCategories.includes(category as any) ? category : undefined;

			await createTask({
				eventId,
				roomId: mainRoom._id,
				title,
				description: description || undefined,
				status,
				priority,
				category: categoryValue as typeof validCategories[number] | undefined,
			});
			showToast("The task has been added successfully.", "success");
			closeModal(modalId);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to create task",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={() => closeModal(modalId)}>
			<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add New Task</DialogTitle>
					<DialogDescription>
						Create a new task for this event
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
					<div className="overflow-y-auto flex-1 space-y-4 px-1">
						{/* Title */}
						<div className="space-y-2">
							<Label htmlFor="title">
								Title <span className="text-red-500">*</span>
							</Label>
							<Input
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter task title"
								required
							/>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter task description"
								rows={4}
							/>
						</div>

						{/* Status and Priority */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="status">Status</Label>
								<Select
									value={status}
									onValueChange={(value) => setStatus(value as typeof status)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todo">Not Started</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="blocked">Blocked</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="priority">Priority</Label>
								<Select
									value={priority}
									onValueChange={(value) => setPriority(value as typeof priority)}
								>
									<SelectTrigger>
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

						{/* Category */}
						<div className="space-y-2">
							<Label htmlFor="category">Category (optional)</Label>
							<Input
								id="category"
								value={category}
								onChange={(e) => setCategory(e.target.value as typeof category)}
								placeholder="e.g., Planning, Setup, Coordination"
							/>
						</div>
					</div>

					<DialogFooter className="mt-4 flex-shrink-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => closeModal(modalId)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? "Creating..." : "Create Task"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
