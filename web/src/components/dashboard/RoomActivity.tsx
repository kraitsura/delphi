import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface RoomActivityProps {
	eventId: Id<"events">;
	roomId?: Id<"rooms">;
	limit?: number;
	showRoomName?: boolean;
}

export function RoomActivity(props: RoomActivityProps) {
	const { limit = 10, showRoomName = true } = props;

	const rooms = useQuery(api.rooms.listByEvent, { eventId: props.eventId });
	const messages = useQuery(api.messages.getRecentByEvent, {
		eventId: props.eventId,
		limit: limit,
	});

	if (rooms === undefined || messages === undefined) {
		return <RoomActivitySkeleton />;
	}

	if (!messages || messages.length === 0) {
		return <RoomActivityEmpty />;
	}

	const formatTimestamp = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));

		if (diffMins < 1) return "just now";
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	const getRoomName = (roomId: Id<"rooms">) => {
		const room = rooms?.find((r) => r._id === roomId);
		return room?.name || "Unknown Room";
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Recent Activity
				</CardTitle>
				<span className="text-sm text-muted-foreground">
					{messages.length} message{messages.length !== 1 ? "s" : ""}
				</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-3">
					{messages.map((message) => (
						<div
							key={message._id}
							className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
						>
							<div className="flex gap-3">
								<Avatar className="h-8 w-8 shrink-0">
									<AvatarFallback className="text-xs">
										{message.userId.substring(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>

								<div className="flex-1 min-w-0">
									<div className="flex items-baseline justify-between gap-2">
										<span className="font-normal text-sm">
											{message.userId}
										</span>
										<span className="text-xs text-muted-foreground shrink-0">
											{formatTimestamp(message._creationTime)}
										</span>
									</div>

									{showRoomName && (
										<div className="text-xs text-muted-foreground mt-0.5">
											in {getRoomName(message.roomId)}
										</div>
									)}

									<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
										{message.content}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function RoomActivitySkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex gap-3">
						<Skeleton className="h-8 w-8 rounded-full shrink-0" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-4 w-full" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function RoomActivityEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No recent activity</p>
			</CardContent>
		</Card>
	);
}

export const RoomActivityMetadata = {
	name: "RoomActivity",
	description: "Recent messages across all event rooms",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "350px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: false,
		emits: [],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		limit: {
			type: "number",
			required: false,
			description: "Maximum number of messages to display",
		},
		showRoomName: {
			type: "boolean",
			required: false,
			description: "Show room name for each message",
		},
	},
};
