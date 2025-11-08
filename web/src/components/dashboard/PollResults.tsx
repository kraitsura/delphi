import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface PollResultsProps {
	pollId: Id<"polls">;
	showVoters?: boolean;
	showPercentages?: boolean;
}

export function PollResults(props: PollResultsProps) {
	const { showVoters: _showVoters = false, showPercentages = true } = props;

	const poll = useQuery(api.polls.getById, { pollId: props.pollId });
	const votes = useQuery(api.pollVotes.listByPoll, { pollId: props.pollId });

	const results = useMemo(() => {
		if (!poll || !votes) return null;

		const totalVotes = votes.length;

		// Initialize counts using option IDs
		const optionCounts = new Map<string, number>();
		for (const option of poll.options) {
			optionCounts.set(option.id, 0);
		}

		// Count votes - votes.optionIds is an array
		votes.forEach((vote) => {
			vote.optionIds.forEach((optionId) => {
				const current = optionCounts.get(optionId) || 0;
				optionCounts.set(optionId, current + 1);
			});
		});

		const maxVotes = Math.max(...Array.from(optionCounts.values()));

		return {
			totalVotes,
			options: poll.options.map((option) => {
				const count = optionCounts.get(option.id) || 0;
				const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
				const isWinner = count === maxVotes && count > 0;

				return {
					option: option.text,
					count,
					percentage,
					isWinner,
				};
			}),
		};
	}, [poll, votes]);

	if (poll === undefined || votes === undefined) {
		return <PollResultsSkeleton />;
	}

	if (!poll || !results) {
		return <PollResultsEmpty />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">Poll Results</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<h3 className="text-lg font-normal mb-4">{poll.question}</h3>

				<div className="space-y-3">
					{results.options.map((result) => (
						<div key={result.option} className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2">
									{result.option}
									{result.isWinner && (
										<span className="text-green-600">{SYMBOLS.CHECK_MARK}</span>
									)}
								</span>
								<span className="text-muted-foreground">
									{showPercentages
										? `${result.percentage.toFixed(1)}%`
										: `${result.count} vote${result.count !== 1 ? "s" : ""}`}
								</span>
							</div>
							<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
								<div
									className={`h-full transition-all duration-300 ${
										result.isWinner ? "bg-green-600" : "bg-primary"
									}`}
									style={{ width: `${result.percentage}%` }}
								/>
							</div>
						</div>
					))}
				</div>

				<div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
					<div className="flex items-center justify-between">
						<span>Total votes: {results.totalVotes}</span>
						{poll.isClosed && <span className="text-xs">Poll closed</span>}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function PollResultsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-6 w-3/4" />
				{[1, 2, 3].map((i) => (
					<div key={i} className="space-y-1">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-2 w-full" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function PollResultsEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">Poll Results</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>Poll not found</p>
			</CardContent>
		</Card>
	);
}

export const PollResultsMetadata = {
	name: "PollResults",
	description: "Visualize poll results with percentages",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "350px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: true,
		emits: [],
		listensTo: ["pollSelected"],
	},
	props: {
		pollId: {
			type: "string",
			required: true,
			description: "Poll identifier",
		},
		showVoters: {
			type: "boolean",
			required: false,
			description: "Show who voted for each option",
		},
		showPercentages: {
			type: "boolean",
			required: false,
			description: "Show percentages instead of counts",
		},
	},
};
