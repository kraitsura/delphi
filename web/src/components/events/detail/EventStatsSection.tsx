import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { ArrowRight, DollarSign, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "../StatCard";

interface EventStatsSectionProps {
	stats: {
		tasks: {
			total: number;
			completed: number;
			inProgress: number;
			notStarted: number;
			isPartial?: boolean;
		};
		rooms: number;
		participants: number;
		participantCountIsPartial?: boolean;
		expenses: {
			count: number;
			total: number;
			isPartial?: boolean;
		};
	};
	eventId: Id<"events">;
}

export function EventStatsSection({ stats, eventId }: EventStatsSectionProps) {
	return (
		<div>
			<h2 className="text-xl font-semibold mb-4">Event Statistics</h2>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					value={stats.tasks.total}
					label="Total Tasks"
					sublabel={
						stats.tasks.total > 0
							? `${stats.tasks.completed} completed • ${stats.tasks.inProgress} in progress`
							: undefined
					}
				/>

				<StatCard
					value={stats.tasks.completed}
					label="Completed Tasks"
					sublabel={
						stats.tasks.total > 0
							? `${Math.round((stats.tasks.completed / stats.tasks.total) * 100)}% complete`
							: undefined
					}
					accentColor="green"
				/>

				<Link to="/events/$eventId/rooms" params={{ eventId }}>
					<StatCard
						value={stats.rooms}
						label="Chat Rooms"
						sublabel="Communication channels"
						icon={MessageSquare}
						variant="clickable"
						accentColor="blue"
					/>
				</Link>

				<StatCard
					value={stats.participants}
					label="Team Members"
					sublabel="Active collaborators"
				/>
			</div>

			{stats.expenses.count > 0 && (
				<Card className="mt-4">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-2xl font-bold">
									${stats.expenses.total.toLocaleString()}
								</div>
								<div className="text-sm text-muted-foreground">
									Total Expenses ({stats.expenses.count} items)
								</div>
							</div>
							<DollarSign className="h-8 w-8 text-muted-foreground" />
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
