import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface PollDetailsModalProps {
	pollId: Id<"polls">;
	modalId: string;
}

export function PollDetailsModal(props: PollDetailsModalProps) {
	const { pollId, modalId } = props;
	const pollData = useQuery(api.polls.getFullPollWithVotes, { pollId });
	const castVote = useMutation(api.pollVotes.cast);
	const closePoll = useMutation(api.polls.close);
	const reopenPoll = useMutation(api.polls.reopen);
	const removePoll = useMutation(api.polls.remove);

	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Voting state
	const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
	const [isCasting, setIsCasting] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	if (!pollData) {
		return null;
	}

	const { poll, votes, userVote } = pollData;

	// Calculate vote counts for each option
	const voteCounts = new Map<string, number>();
	const totalVotes = votes.length;

	for (const vote of votes) {
		for (const optionId of vote.optionIds) {
			voteCounts.set(optionId, (voteCounts.get(optionId) || 0) + 1);
		}
	}

	// Initialize selected options from user's existing vote
	if (userVote && selectedOptions.length === 0) {
		setSelectedOptions(userVote.optionIds);
	}

	const handleVote = async () => {
		if (selectedOptions.length === 0) {
			addError("Please select at least one option");
			return;
		}

		try {
			setIsCasting(true);
			await castVote({
				pollId,
				optionIds: selectedOptions,
			});
			showToast("Your vote has been recorded successfully.", "success");
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to submit vote",
			);
		} finally {
			setIsCasting(false);
		}
	};

	const handleClose = async () => {
		try {
			setIsClosing(true);
			await closePoll({ pollId });
			showToast("The poll has been closed successfully.", "success");
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to close poll",
			);
		} finally {
			setIsClosing(false);
		}
	};

	const handleReopen = async () => {
		try {
			setIsClosing(true);
			await reopenPoll({ pollId });
			showToast("The poll has been reopened successfully.", "success");
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to reopen poll",
			);
		} finally {
			setIsClosing(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this poll?")) {
			return;
		}

		try {
			setIsDeleting(true);
			await removePoll({ pollId });
			showToast("The poll has been deleted successfully.", "success");
			closeModal(modalId);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to delete poll",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const formatDate = (timestamp?: number) => {
		if (!timestamp) return "No deadline";
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const isPollActive =
		!poll.isClosed && (!poll.deadline || poll.deadline > Date.now());

	return (
		<Dialog open={true} onOpenChange={() => closeModal(modalId)}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{poll.question}</DialogTitle>
					<DialogDescription>
						<div className="flex items-center gap-2 mt-2">
							<Badge variant={isPollActive ? "default" : "secondary"}>
								{poll.isClosed ? "Closed" : isPollActive ? "Active" : "Expired"}
							</Badge>
							{poll.allowMultipleChoices && (
								<Badge variant="outline">Multiple choices allowed</Badge>
							)}
							<span className="text-sm text-muted-foreground">
								{totalVotes} {totalVotes === 1 ? "vote" : "votes"}
							</span>
						</div>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Deadline */}
					{poll.deadline && (
						<div>
							<Label>Deadline</Label>
							<p className="text-sm text-muted-foreground">
								{formatDate(poll.deadline)}
							</p>
						</div>
					)}

					{/* Poll Options */}
					<div className="space-y-4">
						<Label>Options</Label>

						{poll.allowMultipleChoices ? (
							// Multiple choice - checkboxes
							<div className="space-y-3">
								{poll.options.map((option) => {
									const count = voteCounts.get(option.id) || 0;
									const percentage =
										totalVotes > 0 ? (count / totalVotes) * 100 : 0;

									return (
										<div key={option.id} className="space-y-2">
											<div className="flex items-start gap-3">
												<Checkbox
													id={option.id}
													checked={selectedOptions.includes(option.id)}
													onCheckedChange={(checked) => {
														if (checked) {
															setSelectedOptions([
																...selectedOptions,
																option.id,
															]);
														} else {
															setSelectedOptions(
																selectedOptions.filter(
																	(id) => id !== option.id,
																),
															);
														}
													}}
													disabled={!isPollActive}
												/>
												<div className="flex-1">
													<label
														htmlFor={option.id}
														className="text-sm font-medium cursor-pointer"
													>
														{option.text}
													</label>
													{option.description && (
														<p className="text-xs text-muted-foreground">
															{option.description}
														</p>
													)}
												</div>
												<span className="text-sm text-muted-foreground">
													{count} ({percentage.toFixed(0)}%)
												</span>
											</div>
											<Progress value={percentage} className="h-2" />
										</div>
									);
								})}
							</div>
						) : (
							// Single choice - radio buttons
							<RadioGroup
								value={selectedOptions[0] || ""}
								onValueChange={(value) => setSelectedOptions([value])}
								disabled={!isPollActive}
							>
								<div className="space-y-3">
									{poll.options.map((option) => {
										const count = voteCounts.get(option.id) || 0;
										const percentage =
											totalVotes > 0 ? (count / totalVotes) * 100 : 0;

										return (
											<div key={option.id} className="space-y-2">
												<div className="flex items-start gap-3">
													<RadioGroupItem
														value={option.id}
														id={option.id}
														disabled={!isPollActive}
													/>
													<div className="flex-1">
														<label
															htmlFor={option.id}
															className="text-sm font-medium cursor-pointer"
														>
															{option.text}
														</label>
														{option.description && (
															<p className="text-xs text-muted-foreground">
																{option.description}
															</p>
														)}
													</div>
													<span className="text-sm text-muted-foreground">
														{count} ({percentage.toFixed(0)}%)
													</span>
												</div>
												<Progress value={percentage} className="h-2" />
											</div>
										);
									})}
								</div>
							</RadioGroup>
						)}
					</div>

					{/* User's current vote */}
					{userVote && (
						<div className="p-3 bg-muted rounded-md">
							<p className="text-sm text-muted-foreground">
								You voted for:{" "}
								<span className="font-medium">
									{poll.options
										.filter((opt) => userVote.optionIds.includes(opt.id))
										.map((opt) => opt.text)
										.join(", ")}
								</span>
							</p>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 flex-wrap">
					<div className="flex gap-2 flex-1">
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
							size="sm"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</div>
					<div className="flex gap-2">
						{isPollActive ? (
							<>
								<Button
									variant="outline"
									onClick={handleClose}
									disabled={isClosing}
								>
									{isClosing ? "Closing..." : "Close Poll"}
								</Button>
								<Button
									onClick={handleVote}
									disabled={isCasting || selectedOptions.length === 0}
								>
									{isCasting
										? "Submitting..."
										: userVote
											? "Update Vote"
											: "Submit Vote"}
								</Button>
							</>
						) : poll.isClosed ? (
							<Button
								variant="outline"
								onClick={handleReopen}
								disabled={isClosing}
							>
								{isClosing ? "Reopening..." : "Reopen Poll"}
							</Button>
						) : (
							<Button variant="outline" onClick={() => closeModal(modalId)}>
								Close
							</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
