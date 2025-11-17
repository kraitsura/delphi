/**
 * InlinePoll - AI-generated interactive poll for collecting user input
 *
 * Rebuilt with radical simplification to prevent infinite re-renders:
 * - Single query for all data
 * - Minimal state (only pending UI selection)
 * - No useEffect for data (only for timer)
 * - Simple calculations without useMemo
 * - Clean data flow
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { Check, Clock, Users } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface InlinePollProps {
	pollId: Id<"polls">;
}

function InlinePollComponent({ pollId }: InlinePollProps) {
	// Single query for all data - using TanStack Query to prevent conflicting subscriptions
	const { data: pollData } = useQuery(
		convexQuery(api.polls.getFullPollWithVotes, { pollId }),
	);
	// Keep mutation using direct Convex (like rest of the app)
	const castVote = useMutation(api.pollVotes.cast);

	// Local state ONLY for UI interaction before submission
	const [pendingSelection, setPendingSelection] = useState<string[]>([]);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);

	// Deadline countdown timer - must be before early return to comply with Rules of Hooks
	useEffect(() => {
		if (!pollData?.poll?.deadline) return;

		const updateTimer = () => {
			const remaining = Math.max(0, pollData.poll.deadline! - Date.now());
			setTimeRemaining(remaining);
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [pollData?.poll?.deadline]);

	// Loading state
	if (!pollData) {
		return (
			<Card className="border-gray-300 bg-gray-50 animate-pulse">
				<CardHeader className="pb-3">
					<div className="h-5 bg-gray-200 rounded w-3/4"></div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="h-12 bg-gray-200 rounded"></div>
						<div className="h-12 bg-gray-200 rounded"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const { poll, votes, userVote } = pollData;

	// Derived values (simple calculations - no useMemo needed)
	const hasVoted = !!userVote && !userVote.isDeleted;
	const currentSelection = hasVoted ? userVote.optionIds : pendingSelection;
	const isExpired = poll.deadline ? poll.deadline < Date.now() : false;
	const isClosed = poll.isClosed;
	const isDisabled = hasVoted || isExpired || isClosed;

	// Calculate vote counts (simple calculation, no memoization needed)
	const voteCounts: Record<string, number> = {};
	poll.options.forEach((opt) => {
		voteCounts[opt.id] = 0;
	});
	votes.forEach((vote) => {
		vote.optionIds.forEach((optId) => {
			if (voteCounts[optId] !== undefined) {
				voteCounts[optId]++;
			}
		});
	});

	const totalVotes = Object.values(voteCounts).reduce(
		(sum, count) => sum + count,
		0,
	);

	// Format time remaining
	const formatTimeRemaining = (ms: number): string => {
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	// Handle option selection
	const handleOptionChange = (optionId: string, checked: boolean) => {
		if (poll.allowMultipleChoices) {
			setPendingSelection((prev) =>
				checked ? [...prev, optionId] : prev.filter((id) => id !== optionId),
			);
		} else {
			setPendingSelection(checked ? [optionId] : []);
		}
	};

	// Handle vote submission
	const handleVote = async () => {
		const selection = hasVoted ? userVote.optionIds : pendingSelection;

		if (selection.length === 0) {
			toast.error("Please select at least one option");
			return;
		}

		if (isExpired) {
			toast.error("This poll has expired");
			return;
		}

		if (isClosed) {
			toast.error("This poll is closed");
			return;
		}

		try {
			await castVote({
				pollId,
				optionIds: selection,
			});
			toast.success(hasVoted ? "Vote updated" : "Vote submitted");
			setPendingSelection([]); // Clear pending after submission
		} catch (error) {
			toast.error("Failed to submit vote");
			console.error("Vote submission error:", error);
		}
	};

	// Determine card styling based on state
	const cardClassName =
		isExpired || isClosed
			? "border-gray-300 bg-gray-50"
			: hasVoted
				? "border-blue-300 bg-blue-50"
				: "border-purple-300 bg-purple-50";

	const headerColor =
		isExpired || isClosed
			? "text-gray-700"
			: hasVoted
				? "text-blue-900"
				: "text-purple-900";

	const accentColor =
		isExpired || isClosed
			? "text-gray-600"
			: hasVoted
				? "text-blue-700"
				: "text-purple-700";

	return (
		<Card className={cardClassName}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className={`text-base font-semibold ${headerColor}`}>
						{poll.question}
					</CardTitle>
					<div className="flex items-center gap-2">
						{poll.deadline && (
							<div
								className={`flex items-center gap-1.5 text-xs ${accentColor}`}
							>
								<Clock className="h-3.5 w-3.5" />
								<span className="font-mono">
									{isExpired ? "Expired" : formatTimeRemaining(timeRemaining)}
								</span>
							</div>
						)}
					</div>
				</div>
				{isClosed && (
					<div className="text-xs text-gray-600 mt-1">
						This poll is now closed
					</div>
				)}
				{hasVoted && !isExpired && !isClosed && (
					<div className="text-xs text-blue-600 mt-1">
						You voted • Click to change your vote
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Options */}
				<div className="space-y-2">
					{poll.options.map((option) => {
						const voteCount = voteCounts[option.id] || 0;
						const percentage =
							totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
						const isSelected = currentSelection.includes(option.id);

						return (
							<div
								key={option.id}
								className={`px-3 py-2.5 bg-white border rounded-md transition-colors ${
									isSelected && !isDisabled
										? "border-purple-400 bg-purple-50"
										: "border-gray-200"
								}`}
							>
								<div className="flex items-start gap-2.5">
									{poll.allowMultipleChoices ? (
										<Checkbox
											id={`option-${option.id}`}
											checked={isSelected}
											onCheckedChange={(checked) =>
												handleOptionChange(option.id, checked === true)
											}
											disabled={isDisabled}
											className="mt-0.5"
										/>
									) : (
										<input
											type="radio"
											id={`option-${option.id}`}
											name={`poll-${pollId}`}
											checked={isSelected}
											onChange={(e) =>
												handleOptionChange(option.id, e.target.checked)
											}
											disabled={isDisabled}
											className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
										/>
									)}
									<div className="flex-1 min-w-0">
										<Label
											htmlFor={`option-${option.id}`}
											className={`text-sm font-medium cursor-pointer ${
												isDisabled ? "cursor-not-allowed opacity-50" : ""
											}`}
										>
											{option.text}
										</Label>
										{option.description && (
											<div className="text-xs text-gray-600 mt-0.5">
												{option.description}
											</div>
										)}
										{/* Vote count and progress bar (shown after voting or if poll closed) */}
										{(hasVoted || isExpired || isClosed) && (
											<div className="mt-2 space-y-1">
												<div className="flex items-center justify-between text-xs">
													<span className="text-gray-600 flex items-center gap-1">
														<Users className="h-3 w-3" />
														{voteCount} {voteCount === 1 ? "vote" : "votes"}
													</span>
													<span className="text-gray-600 font-medium">
														{percentage.toFixed(0)}%
													</span>
												</div>
												<Progress value={percentage} className="h-1.5" />
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Total votes display */}
				{(hasVoted || isExpired || isClosed) && (
					<div className="text-xs text-gray-600 flex items-center gap-1 pt-1">
						<Users className="h-3.5 w-3.5" />
						<span>
							{totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
						</span>
					</div>
				)}
			</CardContent>

			{/* Footer with vote button */}
			{!isExpired && !isClosed && (
				<CardFooter className="pt-3">
					<Button
						size="sm"
						onClick={handleVote}
						disabled={
							(hasVoted ? userVote.optionIds : pendingSelection).length === 0
						}
						className="w-full h-8 bg-purple-600 hover:bg-purple-700"
					>
						<Check className="h-3.5 w-3.5 mr-1" />
						{hasVoted ? "Update Vote" : "Submit Vote"}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}

// Simple memo - only re-render if pollId changes
export const InlinePoll = memo(InlinePollComponent);
