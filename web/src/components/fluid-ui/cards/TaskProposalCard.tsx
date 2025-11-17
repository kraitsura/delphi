/**
 * TaskProposalCard - Displays AI-generated task proposals for user review
 *
 * Allows users to:
 * - Accept all proposed tasks
 * - Edit individual tasks before accepting
 * - Reject the entire proposal
 *
 * Features:
 * - Expiration timer (5 minutes)
 * - Inline editing for task details
 * - Compact layout for message rendering
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	Check,
	CheckCircle,
	Clock,
	Edit2,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TaskProposalCardProps {
	proposalId: Id<"proposals">;
	proposalType: "tasks" | "budget_entries" | "vendor_suggestions";
	items: Array<{
		type: string;
		data: any;
		reasoning?: string;
	}>;
	expiresAt: number;
	eventId?: string;
	roomId: Id<"rooms">;
	status: "pending" | "accepted" | "rejected" | "expired";
}

interface EditableTask {
	title: string;
	description?: string;
	category?: string;
	priority?: "low" | "medium" | "high";
	deadline?: number;
	estimatedCost?: {
		min?: number;
		max?: number;
		currency?: string;
		confidence?: "low" | "medium" | "high";
	};
	assignedTo?: Id<"users">;
	groupId?: Id<"taskGroups">;
	status?: "todo" | "in_progress" | "completed" | "cancelled";
	dependsOn?: Id<"tasks">[];
	blockedBy?: Id<"tasks">[];
}

export function TaskProposalCard({
	proposalId,
	proposalType,
	items,
	expiresAt,
	status,
}: TaskProposalCardProps) {
	// Query live proposal data to get current status
	const liveProposal = useQuery(api.proposals.getById, { proposalId });

	// Use live status if available, fallback to prop
	const currentStatus = liveProposal?.status || status;

	const [isEditing, setIsEditing] = useState(false);
	const [editedItems, setEditedItems] = useState<EditableTask[]>([]);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [isExpired, setIsExpired] = useState(currentStatus === "expired");
	const [isRejected, setIsRejected] = useState(currentStatus === "rejected");
	const [isAccepted, setIsAccepted] = useState(currentStatus === "accepted");
	const [createdTasks, setCreatedTasks] = useState<any[]>(
		currentStatus === "accepted" ? items.map((item) => item.data) : [],
	);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Mutation for confirming proposals (will be created in Track 1)
	// For now, we'll create a placeholder
	const confirmProposal = useMutation(api.proposals.confirm);

	// Update state when live status changes
	useEffect(() => {
		if (liveProposal) {
			setIsExpired(liveProposal.status === "expired");
			setIsRejected(liveProposal.status === "rejected");
			setIsAccepted(liveProposal.status === "accepted");
			if (liveProposal.status === "accepted") {
				setCreatedTasks(items.map((item) => item.data));
			}
		}
	}, [liveProposal, items]);

	// Initialize edited items from proposal items
	useEffect(() => {
		if (items && items.length > 0) {
			const taskItems = items.map((item) => ({
				title: item.data.title || item.data.name || "Untitled Task",
				description: item.data.description || "",
				category: item.data.category || "general",
				priority: item.data.priority || "medium",
				deadline: item.data.deadline || item.data.dueDate, // Support both field names
				estimatedCost: item.data.estimatedCost,
				assignedTo: item.data.assignedTo,
				groupId: item.data.groupId,
				status: item.data.status || "todo",
				dependsOn: item.data.dependsOn,
				blockedBy: item.data.blockedBy,
			}));
			setEditedItems(taskItems);
		}
	}, [items]);

	// Expiration timer - only update if proposal is still pending
	useEffect(() => {
		const updateTimer = () => {
			const remaining = Math.max(0, expiresAt - Date.now());
			setTimeRemaining(remaining);

			// Only mark as expired if status is pending and time has run out
			if (currentStatus === "pending" && remaining === 0) {
				setIsExpired(true);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [expiresAt, currentStatus]);

	const formatTimeRemaining = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const handleAcceptAll = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		if (isSubmitting) {
			return; // Prevent double-click
		}

		setIsSubmitting(true);
		try {
			await confirmProposal({
				proposalId,
				action: "accept_all",
			});
			setIsAccepted(true);
			setCreatedTasks(items.map((item) => item.data));
			toast.success(
				`${items.length} task${items.length > 1 ? "s" : ""} created successfully`,
			);
		} catch (error) {
			toast.error("Failed to create tasks");
			console.error("Proposal confirmation error:", error);
			// Reset optimistic state on error
			setIsAccepted(false);
			setCreatedTasks([]);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveEdits = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		if (isSubmitting) {
			return; // Prevent double-click
		}

		setIsSubmitting(true);
		try {
			await confirmProposal({
				proposalId,
				action: "edit",
				editedItems: editedItems.map((task) => ({
					type: "task",
					data: task,
				})),
			});
			setIsAccepted(true);
			setCreatedTasks(editedItems);
			toast.success(
				`${editedItems.length} task${editedItems.length > 1 ? "s" : ""} created with edits`,
			);
			setIsEditing(false);
		} catch (error) {
			toast.error("Failed to create tasks");
			console.error("Proposal confirmation error:", error);
			// Reset optimistic state on error
			setIsAccepted(false);
			setCreatedTasks([]);
			// Keep editing mode open so user can retry
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReject = async () => {
		if (isSubmitting) {
			return; // Prevent double-click
		}

		setIsSubmitting(true);
		try {
			await confirmProposal({
				proposalId,
				action: "reject",
			});
			setIsRejected(true);
			toast.info("Proposal rejected");
		} catch (error) {
			toast.error("Failed to reject proposal");
			console.error("Proposal rejection error:", error);
			// Reset optimistic state on error
			setIsRejected(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const updateTask = (index: number, field: keyof EditableTask, value: any) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	const removeTask = (index: number) => {
		setEditedItems((prev) => prev.filter((_, i) => i !== index));
	};

	const addTask = () => {
		setEditedItems((prev) => [
			...prev,
			{
				title: "",
				description: "",
				category: "general",
				priority: "medium",
			},
		]);
	};

	// Calculate timer progress for dynamic styling
	const timeProgress = Math.max(0, timeRemaining / (5 * 60 * 1000)); // 5 minutes total
	const timerColorClass =
		timeProgress > 0.5
			? "text-green-700"
			: timeProgress > 0.25
				? "text-yellow-700"
				: "text-red-700";

	if (isExpired) {
		return (
			<Card className="border-border/60 bg-muted/30 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0">
				{/* Expired overlay indicator */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-border via-muted-foreground/40 to-border" />

				<CardContent className="py-3 px-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span className="text-sm font-medium">Proposal Expired</span>
						</div>
						<div className="flex items-center gap-3 text-muted-foreground">
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium">{items.length}</span>
								<span>
									{proposalType === "tasks" &&
										`task${items.length > 1 ? "s" : ""}`}
									{proposalType === "budget_entries" &&
										`budget entr${items.length > 1 ? "ies" : "y"}`}
									{proposalType === "vendor_suggestions" &&
										`vendor${items.length > 1 ? "s" : ""}`}
								</span>
								<span>proposed</span>
							</div>
							<span className="text-xs italic opacity-70">
								Expired {formatTimeRemaining(Math.abs(Date.now() - expiresAt))}{" "}
								ago
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isRejected) {
		return (
			<Card className="border-destructive/20 bg-destructive/5 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0">
				{/* Rejected overlay indicator */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive/60 to-destructive/40" />

				<CardContent className="py-3 px-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-destructive/70">
							<X className="h-4 w-4" />
							<span className="text-sm font-medium">Proposal Rejected</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium">{items.length}</span>
							<span>
								{proposalType === "tasks" &&
									`task${items.length > 1 ? "s" : ""}`}
								{proposalType === "budget_entries" &&
									`budget entr${items.length > 1 ? "ies" : "y"}`}
								{proposalType === "vendor_suggestions" &&
									`vendor${items.length > 1 ? "s" : ""}`}
							</span>
							<span>declined</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isAccepted) {
		return (
			<>
				<Card
					className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/50 transition-all duration-200"
					onClick={() => setShowSuccessModal(true)}
				>
					{/* Success overlay indicator */}
					<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-400" />

					<CardContent className="py-3 px-4">
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2 text-green-700 dark:text-green-400">
								<CheckCircle className="h-4 w-4" />
								<span className="text-sm font-medium">
									Tasks Created Successfully
								</span>
							</div>
							<div className="flex items-center gap-3 text-green-600 dark:text-green-500">
								<div className="flex items-center gap-2 text-sm">
									<span className="font-medium">{createdTasks.length}</span>
									<span>
										{proposalType === "tasks" &&
											`task${createdTasks.length > 1 ? "s" : ""}`}
										{proposalType === "budget_entries" &&
											`budget entr${createdTasks.length > 1 ? "ies" : "y"}`}
										{proposalType === "vendor_suggestions" &&
											`vendor${createdTasks.length > 1 ? "s" : ""}`}
									</span>
									<span>created</span>
								</div>
								<span className="text-xs opacity-70">
									Click to view details →
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Success Modal */}
				<Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<CheckCircle className="h-5 w-5 text-green-600" />
								Successfully Created Tasks ({createdTasks.length})
							</DialogTitle>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto space-y-3 pr-2">
							{createdTasks.map((task, index) => (
								<div
									key={index}
									className="p-4 bg-muted/30 border border-border rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm text-foreground">
												{task.title || task.name || "Untitled Task"}
											</div>
											{task.description && (
												<div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
													{task.description}
												</div>
											)}
											<div className="flex items-center gap-2 mt-2.5">
												{task.category && (
													<span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">
														{task.category}
													</span>
												)}
												{task.priority && (
													<span
														className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
															task.priority === "high"
																? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
																: task.priority === "medium"
																	? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
																	: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
														}`}
													>
														{task.priority}
													</span>
												)}
											</div>
										</div>
										<CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
									</div>
								</div>
							))}
						</div>

						<DialogFooter>
							<Button onClick={() => setShowSuccessModal(false)}>Close</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	return (
		<Card className="border-border/60 bg-card shadow-sm animate-fadeInUp w-full flex-shrink-0 min-w-0">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-medium text-foreground">
						{proposalType === "tasks" && "Task Proposal"}
						{proposalType === "budget_entries" && "Budget Proposal"}
						{proposalType === "vendor_suggestions" && "Vendor Suggestions"}
					</CardTitle>
					<div
						className={`flex items-center gap-1.5 text-xs ${timerColorClass} transition-colors duration-500`}
					>
						<Clock className="h-3.5 w-3.5" />
						<span className="font-mono tabular-nums">
							{formatTimeRemaining(timeRemaining)}
						</span>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-2.5 min-h-[200px] transition-all duration-300">
				{!isEditing ? (
					// Preview mode
					<div className="space-y-3 transition-all duration-300 w-full">
						{items.map((item, index) => (
							<div
								key={index}
								className="px-4 py-3.5 bg-muted/20 border border-border/40 rounded-md hover:border-border hover:bg-muted/30 transition-all duration-200 animate-scaleIn w-full"
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div className="flex items-start gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-foreground">
											{item.data.title || item.data.name || "Untitled"}
										</div>
										{item.data.description && (
											<div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
												{item.data.description}
											</div>
										)}
										<div className="flex items-center gap-2 mt-2">
											{item.data.category && (
												<span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">
													{item.data.category}
												</span>
											)}
											{item.data.priority && (
												<span
													className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
														item.data.priority === "high"
															? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
															: item.data.priority === "medium"
																? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
																: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
													}`}
												>
													{item.data.priority}
												</span>
											)}
										</div>
									</div>
								</div>
								{item.reasoning && (
									<div className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed border-t border-border/40 pt-2.5">
										{item.reasoning}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					// Edit mode
					<div className="space-y-3 animate-scaleIn transition-all duration-300 w-full">
						{editedItems.map((task, index) => (
							<div
								key={index}
								className="p-3.5 bg-muted/20 border border-border rounded-md space-y-2.5 transition-all duration-200 hover:border-border/80 w-full"
							>
								<div className="flex items-start gap-2.5">
									<div className="flex-1 space-y-2.5">
										<Input
											placeholder="Task title"
											value={task.title}
											onChange={(e) =>
												updateTask(index, "title", e.target.value)
											}
											className="h-8 text-sm transition-colors"
										/>
										<Textarea
											placeholder="Description (optional)"
											value={task.description}
											onChange={(e) =>
												updateTask(index, "description", e.target.value)
											}
											className="min-h-[60px] text-sm resize-none transition-colors"
										/>
										<div className="flex gap-2">
											<Input
												placeholder="Category"
												value={task.category}
												onChange={(e) =>
													updateTask(index, "category", e.target.value)
												}
												className="h-7 text-xs flex-1 transition-colors"
											/>
											<select
												value={task.priority}
												onChange={(e) =>
													updateTask(index, "priority", e.target.value)
												}
												className="h-7 text-xs border border-input rounded-md px-2 bg-background text-foreground hover:border-border/80 focus:border-ring transition-colors"
											>
												<option value="low">Low</option>
												<option value="medium">Medium</option>
												<option value="high">High</option>
											</select>
										</div>
									</div>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => removeTask(index)}
										className="h-7 w-7 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-all duration-150"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
						<Button
							size="sm"
							variant="outline"
							onClick={addTask}
							className="w-full h-8 text-xs transition-all duration-150"
						>
							<Plus className="h-3.5 w-3.5 mr-1" />
							Add Task
						</Button>
					</div>
				)}
			</CardContent>

			<CardFooter className="pt-4 flex gap-2">
				{!isEditing ? (
					<>
						<Button
							size="sm"
							onClick={handleAcceptAll}
							disabled={isSubmitting}
							className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Check className="h-3.5 w-3.5 mr-1.5" />
							{isSubmitting ? "Creating..." : `Accept All (${items.length})`}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(true)}
							disabled={isSubmitting}
							className="h-9 transition-all duration-150"
						>
							<Edit2 className="h-3.5 w-3.5 mr-1.5" />
							Edit
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleReject}
							disabled={isSubmitting}
							className="h-9 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-150"
						>
							<X className="h-3.5 w-3.5 mr-1.5" />
							Reject
						</Button>
					</>
				) : (
					<>
						<Button
							size="sm"
							onClick={handleSaveEdits}
							disabled={isSubmitting}
							className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Check className="h-3.5 w-3.5 mr-1.5" />
							{isSubmitting
								? "Creating..."
								: `Save & Create (${editedItems.length})`}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(false)}
							disabled={isSubmitting}
							className="h-9 transition-all duration-150"
						>
							Cancel
						</Button>
					</>
				)}
			</CardFooter>
		</Card>
	);
}
