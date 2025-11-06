import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface EventDeleteDialogProps {
	eventId: Id<"events">;
	trigger?: React.ReactNode;
	onSuccess?: () => void;
	redirectAfterDelete?: boolean;
}

export function EventDeleteDialog({
	eventId,
	trigger,
	onSuccess,
	redirectAfterDelete = true,
}: EventDeleteDialogProps) {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const navigate = useNavigate();
	const event = useQuery(api.events.getById, { eventId });
	const deleteEvent = useMutation(api.events.softDelete);

	const handleDelete = async () => {
		if (confirmText.toLowerCase() !== "delete") {
			toast.error('Please type "delete" to confirm');
			return;
		}

		setIsLoading(true);

		try {
			await deleteEvent({ eventId });

			toast.success("Event deleted successfully", {
				description: "All related data has been deleted",
			});

			setOpen(false);

			if (redirectAfterDelete) {
				navigate({ to: "/events" });
			} else {
				onSuccess?.();
			}
		} catch (error) {
			console.error("Failed to delete event:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to delete event",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="destructive" size="sm">
						<Trash2 className="h-4 w-4 mr-2" />
						Delete Event
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
							<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
						</div>
						<DialogTitle className="text-xl">Delete Event</DialogTitle>
					</div>
					<DialogDescription className="text-base">
						This action cannot be undone. This will permanently delete the event{" "}
						<span className="font-semibold text-foreground">
							"{event?.name}"
						</span>
						.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Warning Box */}
					<div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
						<p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
							The following will be permanently deleted:
						</p>
						<ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
							<li>All rooms and room participants</li>
							<li>All messages in all rooms</li>
							<li>All event members and invitations</li>
							<li>All tasks and expenses</li>
							<li>All polls and votes</li>
							<li>All dashboards and configurations</li>
						</ul>
					</div>

					{/* Confirmation Input */}
					<div className="space-y-2">
						<label
							htmlFor="confirm-delete"
							className="text-sm font-medium text-foreground"
						>
							Type{" "}
							<span className="font-mono font-bold bg-gray-100 dark:bg-gray-800 px-1 rounded">
								delete
							</span>{" "}
							to confirm:
						</label>
						<input
							id="confirm-delete"
							type="text"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="Type 'delete' here"
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isLoading}
							autoComplete="off"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setOpen(false);
							setConfirmText("");
						}}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={isLoading || confirmText.toLowerCase() !== "delete"}
					>
						{isLoading ? "Deleting..." : "Delete Event"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
