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

export interface AddExpenseModalProps {
	eventId: Id<"events">;
	modalId: string;
}

export function AddExpenseModal(props: AddExpenseModalProps) {
	const { eventId, modalId } = props;
	const userProfile = useQuery(api.users.getMyProfile);
	const createExpense = useMutation(api.expenses.create);

	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!description.trim()) {
			addError("Description is required");
			return;
		}

		const amountNum = Number.parseFloat(amount);
		if (Number.isNaN(amountNum) || amountNum <= 0) {
			addError("Amount must be a positive number");
			return;
		}

		if (!userProfile) {
			addError("You must be logged in to create an expense");
			return;
		}

		try {
			setIsSaving(true);
			await createExpense({
				eventId,
				description,
				amount: amountNum,
				category,
				status,
				paymentMethod,
				paidBy: userProfile._id,
				receiptUrl: receiptUrl || undefined,
			});
			showToast("The expense has been added successfully.", "success");
			closeModal(modalId);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to create expense",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={() => closeModal(modalId)}>
			<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add New Expense</DialogTitle>
					<DialogDescription>
						Create a new expense for this event
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
					<div className="overflow-y-auto flex-1 space-y-4 px-1">
						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor="description">
								Description <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter expense description"
								rows={3}
								required
							/>
						</div>

						{/* Amount */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="amount">
									Amount <span className="text-red-500">*</span>
								</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									placeholder="0.00"
									required
								/>
							</div>

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
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="paid">Paid</SelectItem>
										<SelectItem value="overdue">Overdue</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Category and Payment Method */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="category">Category</Label>
								<Select
									value={category}
									onValueChange={(value) => setCategory(value as typeof category)}
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
										<SelectItem value="transportation">Transportation</SelectItem>
										<SelectItem value="accommodation">Accommodation</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="paymentMethod">Payment Method</Label>
								<Select
									value={paymentMethod}
									onValueChange={(value) =>
										setPaymentMethod(value as typeof paymentMethod)
									}
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
							</div>
						</div>

						{/* Receipt URL */}
						<div className="space-y-2">
							<Label htmlFor="receiptUrl">Receipt URL (optional)</Label>
							<Input
								id="receiptUrl"
								type="url"
								value={receiptUrl}
								onChange={(e) => setReceiptUrl(e.target.value)}
								placeholder="https://..."
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
							{isSaving ? "Creating..." : "Create Expense"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
