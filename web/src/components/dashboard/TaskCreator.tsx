import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface TaskCreatorProps {
	id: string;
	eventId: Id<"events">;
	roomId: Id<"rooms">;
	defaultCategory?: string;
	defaultAssignee?: Id<"users">;
	onTaskCreated?: (taskId: Id<"tasks">) => void;
}

export function TaskCreator(props: TaskCreatorProps) {
	const {
		id,
		eventId,
		roomId,
		defaultCategory,
		defaultAssignee,
		onTaskCreated,
	} = props;

	// Zustand state - check if expanded
	const isExpanded = useDashboardStore((state) => state.expandedPanels.has(id));
	const togglePanel = useDashboardStore((state) => state.togglePanel);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Convex mutation
	const createTask = useMutation(api.tasks.create);

	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState(defaultCategory || "");
	const [priority, setPriority] = useState<
		"low" | "medium" | "high" | "urgent"
	>("medium");
	const [dueDate, setDueDate] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Form validation
	const isValid = title.trim().length > 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || isSubmitting) return;

		setIsSubmitting(true);

		try {
			const taskId = await createTask({
				eventId,
				roomId,
				title: title.trim(),
				description: description.trim() || undefined,
				category: category as any,
				priority,
				deadline: dueDate ? new Date(dueDate).getTime() : undefined,
				assignedTo: defaultAssignee,
			});

			// Success
			showToast("Task created successfully", "success");

			// Reset form
			setTitle("");
			setDescription("");
			setCategory(defaultCategory || "");
			setPriority("medium");
			setDueDate("");

			// Collapse panel
			if (isExpanded) {
				togglePanel(id);
			}

			// Callback
			onTaskCreated?.(taskId);
		} catch (error) {
			console.error("Failed to create task:", error);
			addError("Failed to create task. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		setTitle("");
		setDescription("");
		setCategory(defaultCategory || "");
		setPriority("medium");
		setDueDate("");
		if (isExpanded) {
			togglePanel(id);
		}
	};

	// Collapsed view - just a button
	if (!isExpanded) {
		return (
			<Card className="fluid-component-card">
				<CardContent className="p-6">
					<Button
						variant="outline"
						className="w-full"
						onClick={() => togglePanel(id)}
					>
						{SYMBOLS.PLUS} Add New Task
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Expanded form view
	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.PLUS} Create Task
				</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Title - Required */}
					<div className="space-y-2">
						<Label htmlFor={`${id}-title`} className="text-sm font-normal">
							Title <span className="text-red-500">*</span>
						</Label>
						<Input
							id={`${id}-title`}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Enter task title..."
							className="fluid-input"
							autoFocus
							required
						/>
					</div>

					{/* Description - Optional */}
					<div className="space-y-2">
						<Label
							htmlFor={`${id}-description`}
							className="text-sm font-normal"
						>
							Description
						</Label>
						<Textarea
							id={`${id}-description`}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Add details about this task..."
							className="fluid-input min-h-[80px]"
							rows={3}
						/>
					</div>

					{/* Category and Priority - Side by side */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor={`${id}-category`} className="text-sm font-normal">
								Category
							</Label>
							<Select value={category} onValueChange={setCategory}>
								<SelectTrigger id={`${id}-category`} className="fluid-input">
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

						<div className="space-y-2">
							<Label htmlFor={`${id}-priority`} className="text-sm font-normal">
								Priority
							</Label>
							<Select
								value={priority}
								onValueChange={(v: any) => setPriority(v)}
							>
								<SelectTrigger id={`${id}-priority`} className="fluid-input">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">
										{SYMBOLS.TRIANGLE_DOWN} Low
									</SelectItem>
									<SelectItem value="medium">
										{SYMBOLS.BLACK_CIRCLE} Medium
									</SelectItem>
									<SelectItem value="high">
										{SYMBOLS.TRIANGLE_UP} High
									</SelectItem>
									<SelectItem value="urgent">
										{SYMBOLS.THUNDERBOLT} Urgent
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Due Date */}
					<div className="space-y-2">
						<Label htmlFor={`${id}-dueDate`} className="text-sm font-normal">
							Due Date
						</Label>
						<Input
							id={`${id}-dueDate`}
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="fluid-input"
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-2 pt-2">
						<Button
							type="submit"
							disabled={!isValid || isSubmitting}
							className="fluid-button fluid-button--primary flex-1"
						>
							{isSubmitting ? "Creating..." : "Create Task"}
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
			</CardContent>
		</Card>
	);
}

export const TaskCreatorMetadata = {
	name: "TaskCreator",
	description: "Quick task creation form with collapsible interface",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "300px",
	},
	zustand: {
		role: "input",
		reads: ["expandedPanels"],
		writes: [],
		behavior:
			"Collapsible form for creating tasks. Uses Zustand expandedPanels to manage collapsed/expanded state. Shows toast notifications on success/error.",
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
		defaultCategory: {
			type: "string",
			required: false,
			description: "Pre-fill category field",
		},
		defaultAssignee: {
			type: "string",
			required: false,
			description: "Pre-fill assignee field",
		},
	},
};
