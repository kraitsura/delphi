/**
 * BudgetProposalCard - Displays AI-generated expense proposals for user review
 *
 * Allows users to:
 * - Accept all proposed expenses
 * - Edit individual expenses before accepting
 * - Reject the entire proposal
 *
 * Features:
 * - Expiration timer (5 minutes)
 * - Inline editing for expense details
 * - Running total display
 * - Budget impact warnings
 * - Compact layout for message rendering
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	Check,
	CheckCircle,
	Clock,
	DollarSign,
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

interface BudgetProposalCardProps {
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

interface EditableExpense {
	description: string;
	amount: number;
	category?: string;
	paymentMethod?: string;
	dueDate?: number;
}

export function BudgetProposalCard({
	proposalId,
	items,
	expiresAt,
	status,
}: BudgetProposalCardProps) {
	// Query live proposal data to get current status
	const liveProposal = useQuery(api.proposals.getById, { proposalId });

	// Use live status if available, fallback to prop
	const currentStatus = liveProposal?.status || status;

	const [isEditing, setIsEditing] = useState(false);
	const [editedItems, setEditedItems] = useState<EditableExpense[]>([]);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [isExpired, setIsExpired] = useState(currentStatus === "expired");
	const [isRejected, setIsRejected] = useState(currentStatus === "rejected");
	const [isAccepted, setIsAccepted] = useState(currentStatus === "accepted");
	const [createdExpenses, setCreatedExpenses] = useState<any[]>(
		currentStatus === "accepted" ? items.map((item) => item.data) : [],
	);
	const [showSuccessModal, setShowSuccessModal] = useState(false);

	const confirmProposal = useMutation(api.proposals.confirm);

	// Update state when live status changes
	useEffect(() => {
		if (liveProposal) {
			setIsExpired(liveProposal.status === "expired");
			setIsRejected(liveProposal.status === "rejected");
			setIsAccepted(liveProposal.status === "accepted");
			if (liveProposal.status === "accepted") {
				setCreatedExpenses(items.map((item) => item.data));
			}
		}
	}, [liveProposal, items]);

	// Initialize edited items from proposal items
	useEffect(() => {
		if (items && items.length > 0) {
			const expenseItems = items.map((item) => ({
				description:
					item.data.description || item.data.name || "Untitled Expense",
				amount: item.data.amount || 0,
				category: item.data.category || "general",
				paymentMethod: item.data.paymentMethod || undefined,
				dueDate: item.data.dueDate,
			}));
			setEditedItems(expenseItems);
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const calculateTotal = (expenses: EditableExpense[]) => {
		return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
	};

	const handleAcceptAll = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		try {
			await confirmProposal({
				proposalId,
				action: "accept_all",
			});
			toast.success(
				`${items.length} expense${items.length > 1 ? "s" : ""} created successfully (Total: ${formatCurrency(calculateTotal(editedItems))})`,
			);
		} catch (error) {
			toast.error("Failed to create expenses");
			console.error("Proposal confirmation error:", error);
		}
	};

	const handleSaveEdits = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		// Validate all expenses have description and amount
		const invalid = editedItems.some(
			(exp) => !exp.description || exp.amount <= 0,
		);
		if (invalid) {
			toast.error(
				"All expenses must have a description and amount greater than 0",
			);
			return;
		}

		try {
			await confirmProposal({
				proposalId,
				action: "edit",
				editedItems: editedItems.map((expense) => ({
					type: "expense",
					data: expense,
				})),
			});
			toast.success(
				`${editedItems.length} expense${editedItems.length > 1 ? "s" : ""} created with edits (Total: ${formatCurrency(calculateTotal(editedItems))})`,
			);
			setIsEditing(false);
		} catch (error) {
			toast.error("Failed to create expenses");
			console.error("Proposal confirmation error:", error);
		}
	};

	const handleReject = async () => {
		try {
			await confirmProposal({
				proposalId,
				action: "reject",
			});
			toast.info("Proposal rejected");
		} catch (error) {
			toast.error("Failed to reject proposal");
			console.error("Proposal rejection error:", error);
		}
	};

	const updateExpense = (
		index: number,
		field: keyof EditableExpense,
		value: any,
	) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	const removeExpense = (index: number) => {
		setEditedItems((prev) => prev.filter((_, i) => i !== index));
	};

	const addExpense = () => {
		setEditedItems((prev) => [
			...prev,
			{
				description: "",
				amount: 0,
				category: "general",
			},
		]);
	};

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
									budget entr{items.length > 1 ? "ies" : "y"} proposed
								</span>
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
							<span>budget entr{items.length > 1 ? "ies" : "y"} declined</span>
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
									Expenses Created Successfully
								</span>
							</div>
							<div className="flex items-center gap-3 text-green-600 dark:text-green-500">
								<div className="flex items-center gap-2 text-sm">
									<span className="font-medium">{createdExpenses.length}</span>
									<span>
										expense{createdExpenses.length > 1 ? "s" : ""} created
									</span>
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
								Successfully Created Expenses ({createdExpenses.length})
							</DialogTitle>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto space-y-3 pr-2">
							{createdExpenses.map((expense, index) => (
								<div
									key={index}
									className="p-4 bg-muted/30 border border-border rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm text-foreground">
												{expense.description || "Untitled Expense"}
											</div>
											<div className="flex items-center gap-2 mt-2.5">
												{expense.category && (
													<span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">
														{expense.category}
													</span>
												)}
												{expense.paymentMethod && (
													<span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded-full font-medium">
														{expense.paymentMethod}
													</span>
												)}
											</div>
										</div>
										<div className="text-right flex items-center gap-2">
											<div className="font-bold text-sm text-foreground">
												{formatCurrency(expense.amount || 0)}
											</div>
											<CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
										</div>
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

	const total = calculateTotal(
		isEditing ? editedItems : items.map((i) => i.data as EditableExpense),
	);
	const isHighValue = total > 10000;

	return (
		<Card className="border-emerald-300 bg-emerald-50">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold text-emerald-900 flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						Budget Proposal
					</CardTitle>
					<div className="flex items-center gap-1.5 text-xs text-emerald-700">
						<Clock className="h-3.5 w-3.5" />
						<span className="font-mono">
							{formatTimeRemaining(timeRemaining)}
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200">
					<span className="text-sm text-emerald-800 font-medium">Total:</span>
					<div className="flex items-center gap-2">
						<span className="text-lg font-bold text-emerald-900">
							{formatCurrency(total)}
						</span>
						{isHighValue && (
							<div title="High-value expense">
								<AlertTriangle className="h-4 w-4 text-amber-600" />
							</div>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-2">
				{!isEditing ? (
					// Preview mode
					<div className="space-y-2">
						{items.map((item, index) => (
							<div
								key={index}
								className="px-3 py-2 bg-white border border-emerald-200 rounded-md"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-gray-900">
											{item.data.description || "Untitled Expense"}
										</div>
										<div className="flex items-center gap-2 mt-1">
											{item.data.category && (
												<span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
													{item.data.category}
												</span>
											)}
											{item.data.paymentMethod && (
												<span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
													{item.data.paymentMethod}
												</span>
											)}
										</div>
									</div>
									<div className="text-right">
										<div className="font-bold text-sm text-emerald-900">
											{formatCurrency(item.data.amount || 0)}
										</div>
									</div>
								</div>
								{item.reasoning && (
									<div className="text-[10px] text-emerald-600 mt-2 italic border-t border-emerald-100 pt-2">
										💡 {item.reasoning}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					// Edit mode
					<div className="space-y-3">
						{editedItems.map((expense, index) => (
							<div
								key={index}
								className="p-3 bg-white border border-emerald-200 rounded-md space-y-2"
							>
								<div className="flex items-start gap-2">
									<div className="flex-1 space-y-2">
										<Input
											placeholder="Expense description"
											value={expense.description}
											onChange={(e) =>
												updateExpense(index, "description", e.target.value)
											}
											className="h-8 text-sm"
										/>
										<div className="flex gap-2">
											<div className="flex-1 relative">
												<span className="absolute left-3 top-1.5 text-xs text-gray-500">
													$
												</span>
												<Input
													type="number"
													placeholder="0.00"
													value={expense.amount || ""}
													onChange={(e) =>
														updateExpense(
															index,
															"amount",
															parseFloat(e.target.value) || 0,
														)
													}
													className="h-7 text-xs pl-6"
													step="0.01"
													min="0"
												/>
											</div>
											<Input
												placeholder="Category"
												value={expense.category}
												onChange={(e) =>
													updateExpense(index, "category", e.target.value)
												}
												className="h-7 text-xs flex-1"
											/>
										</div>
										<Input
											placeholder="Payment method (optional)"
											value={expense.paymentMethod || ""}
											onChange={(e) =>
												updateExpense(index, "paymentMethod", e.target.value)
											}
											className="h-7 text-xs"
										/>
									</div>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => removeExpense(index)}
										className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
						<Button
							size="sm"
							variant="outline"
							onClick={addExpense}
							className="w-full h-8 text-xs"
						>
							<Plus className="h-3.5 w-3.5 mr-1" />
							Add Expense
						</Button>
					</div>
				)}
			</CardContent>

			<CardFooter className="pt-3 flex gap-2">
				{!isEditing ? (
					<>
						<Button
							size="sm"
							onClick={handleAcceptAll}
							className="flex-1 h-8 bg-green-600 hover:bg-green-700"
						>
							<Check className="h-3.5 w-3.5 mr-1" />
							Accept All ({items.length})
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(true)}
							className="h-8"
						>
							<Edit2 className="h-3.5 w-3.5 mr-1" />
							Edit
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleReject}
							className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
						>
							<X className="h-3.5 w-3.5 mr-1" />
							Reject
						</Button>
					</>
				) : (
					<>
						<Button
							size="sm"
							onClick={handleSaveEdits}
							className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700"
						>
							<Check className="h-3.5 w-3.5 mr-1" />
							Save & Create ({editedItems.length})
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(false)}
							className="h-8"
						>
							Cancel
						</Button>
					</>
				)}
			</CardFooter>
		</Card>
	);
}
