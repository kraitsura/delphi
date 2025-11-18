import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

export interface ExpenseDetailsModalProps {
	expenseId: Id<"expenses">;
	modalId: string;
}

export function ExpenseDetailsModal(props: ExpenseDetailsModalProps) {
	const { expenseId, modalId } = props;
	const expense = useQuery(api.expenses.getById, { expenseId });
	const updateExpense = useMutation(api.expenses.update);
	const removeExpense = useMutation(api.expenses.remove);

	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);
	const [isEditing, setIsEditing] = useState(false);

	// Form state
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<
		| "venue"
		| "catering"
		| "photography"
		| "music"
		| "decor"
		| "supplies"
		| "transportation"
		| "accommodation"
		| "other"
	>("other");
	const [status, setStatus] = useState<"pending" | "paid" | "overdue">(
		"pending",
	);
	const [paymentMethod, setPaymentMethod] = useState<
		"cash" | "card" | "transfer" | "check" | "other"
	>("other");
	const [receiptUrl, setReceiptUrl] = useState("");

	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Validation arrays
	const validStatuses = ["pending", "paid", "overdue"];
	const validCategories = [
		"venue",
		"catering",
		"photography",
		"music",
		"decor",
		"supplies",
		"transportation",
		"accommodation",
		"other",
	];
	const validPaymentMethods = ["cash", "card", "transfer", "check", "other"];

	// Initialize form when expense loads
	useEffect(() => {
		if (expense && !isEditing) {
			setDescription(expense.description);
			setAmount(expense.amount.toString());
			setCategory(expense.category || "other");
			setStatus(expense.status || "pending");
			setPaymentMethod(expense.paymentMethod || "other");
			setReceiptUrl(expense.receiptUrl || "");
		}
	}, [expense, isEditing]);

	if (!expense) {
		return null;
	}

	const handleSave = async () => {
		try {
			setIsSaving(true);
			await updateExpense({
				expenseId,
				description,
				amount: Number.parseFloat(amount),
				category: category || expense.category,
				paymentMethod: paymentMethod || expense.paymentMethod,
				receiptUrl: receiptUrl || undefined,
			});
			showToast("The expense has been updated successfully.", "success");
			setIsEditing(false);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to update expense",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this expense?")) {
			return;
		}

		try {
			setIsDeleting(true);
			await removeExpense({ expenseId });
			showToast("The expense has been deleted successfully.", "success");
			closeModal(modalId);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to delete expense",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const formatCurrency = (amount: number, currency = "USD") => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(amount);
	};

	const formatDate = (timestamp?: number) => {
		if (!timestamp) return "Not set";
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<Dialog open={true} onOpenChange={() => closeModal(modalId)}>
			<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Expense Details</DialogTitle>
					<DialogDescription>
						{isEditing ? "Edit expense information" : "View expense details"}
					</DialogDescription>
				</DialogHeader>

				<div className="overflow-y-auto flex-1 space-y-4 px-1">
					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						{isEditing ? (
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter expense description"
								rows={3}
							/>
						) : (
							<p className="text-sm">{expense.description}</p>
						)}
					</div>

					{/* Amount */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="amount">Amount</Label>
							{isEditing ? (
								<Input
									id="amount"
									type="number"
									step="0.01"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									placeholder="0.00"
								/>
							) : (
								<p className="text-lg font-semibold">
									{formatCurrency(expense.amount, expense.currency)}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label>Status</Label>
							{isEditing ? (
								<Select
									value={status}
									onValueChange={(value) => {
									if (value && validStatuses.includes(value)) {
										setStatus(value as typeof status);
									}
								}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="paid">Paid</SelectItem>
										<SelectItem value="overdue">Overdue</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<Badge
									variant={
										expense.status === "paid"
											? "default"
											: expense.status === "overdue"
												? "destructive"
												: "outline"
									}
								>
									{expense.status || "pending"}
								</Badge>
							)}
						</div>
					</div>

					{/* Category and Payment Method */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="category">Category</Label>
							{isEditing ? (
								<Select
									value={category}
									onValueChange={(value) => {
									if (value && validCategories.includes(value)) {
										setCategory(value as typeof category);
									}
								}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="venue">Venue</SelectItem>
										<SelectItem value="catering">Catering</SelectItem>
										<SelectItem value="photography">Photography</SelectItem>
										<SelectItem value="music">Music</SelectItem>
										<SelectItem value="decor">Decor</SelectItem>
										<SelectItem value="supplies">Supplies</SelectItem>
										<SelectItem value="transportation">
											Transportation
										</SelectItem>
										<SelectItem value="accommodation">Accommodation</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<Badge variant="outline">{expense.category || "other"}</Badge>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="paymentMethod">Payment Method</Label>
							{isEditing ? (
								<Select
									value={paymentMethod}
									onValueChange={(value) => {
										if (value && validPaymentMethods.includes(value)) {
											setPaymentMethod(value as typeof paymentMethod);
										}
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="cash">Cash</SelectItem>
										<SelectItem value="card">Card</SelectItem>
										<SelectItem value="transfer">Transfer</SelectItem>
										<SelectItem value="check">Check</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							) : (
								<p className="text-sm">{expense.paymentMethod || "other"}</p>
							)}
						</div>
					</div>

					{/* Paid Date */}
					<div className="space-y-2">
						<Label>Paid Date</Label>
						<p className="text-sm text-muted-foreground">
							{formatDate(expense.paidAt)}
						</p>
					</div>

					{/* Receipt URL */}
					<div className="space-y-2">
						<Label htmlFor="receiptUrl">Receipt URL</Label>
						{isEditing ? (
							<Input
								id="receiptUrl"
								type="url"
								value={receiptUrl}
								onChange={(e) => setReceiptUrl(e.target.value)}
								placeholder="https://..."
							/>
						) : expense.receiptUrl ? (
							<a
								href={expense.receiptUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-600 hover:underline"
							>
								View Receipt
							</a>
						) : (
							<p className="text-sm text-muted-foreground">No receipt</p>
						)}
					</div>
				</div>

				<DialogFooter className="mt-4 flex-shrink-0 gap-2">
					{isEditing ? (
						<>
							<Button
								variant="outline"
								onClick={() => setIsEditing(false)}
								disabled={isSaving}
							>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isSaving}>
								{isSaving ? "Saving..." : "Save Changes"}
							</Button>
						</>
					) : (
						<>
							<Button
								variant="destructive"
								onClick={handleDelete}
								disabled={isDeleting}
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</Button>
							<Button variant="outline" onClick={() => closeModal(modalId)}>
								Close
							</Button>
							<Button onClick={() => setIsEditing(true)}>Edit</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
