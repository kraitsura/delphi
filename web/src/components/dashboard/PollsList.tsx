import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface PollsListProps {
	eventId: Id<"events">;
	status?: "active" | "closed" | "all";
	sortBy?: "deadline" | "createdAt";
	limit?: number;
	onPollSelect?: (pollId: Id<"polls">) => void;
}

export function PollsList(props: PollsListProps) {
	const { status = "active", sortBy = "deadline", limit, onPollSelect } = props;

	const polls = useQuery(api.polls.listByEvent, { eventId: props.eventId });

	if (polls === undefined) {
		return <PollsListSkeleton />;
	}

	if (!polls || polls.length === 0) {
		return <PollsListEmpty />;
	}

	const filteredPolls = polls.filter((poll) => {
		if (status === "all") return true;
		if (status === "active") return !poll.isClosed;
		if (status === "closed") return poll.isClosed;
		return true;
	});

	const limitedPolls = limit ? filteredPolls.slice(0, limit) : filteredPolls;

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Polls
				</CardTitle>
				<span className="text-sm text-muted-foreground">
					{limitedPolls.length} poll{limitedPolls.length !== 1 ? "s" : ""}
				</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-3">
					{limitedPolls.map((poll) => (
						<div
							key={poll._id}
							className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors cursor-pointer"
							onClick={() => onPollSelect?.(poll._id)}
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1">
									<h4 className="font-normal text-base">{poll.question}</h4>
									<div className="flex items-center gap-2 mt-1">
										<span className="text-xs text-muted-foreground">
											{poll.options.length} options
										</span>
										<Badge
											className={`status-badge status-badge--${poll.isClosed ? "closed" : "active"} text-xs`}
										>
											{poll.isClosed ? "Closed" : "Active"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				{limitedPolls.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<p>No {status !== "all" ? status : ""} polls</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function PollsListSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-20 w-full" />
				))}
			</CardContent>
		</Card>
	);
}

function PollsListEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Polls
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No polls yet</p>
			</CardContent>
		</Card>
	);
}

export const PollsListMetadata = {
	name: "PollsList",
	description: "Active polls requiring votes",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "300px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["pollSelected"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		status: {
			type: "enum",
			required: false,
			values: ["active", "closed", "all"],
			description: "Filter by poll status",
		},
	},
};
