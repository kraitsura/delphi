import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface LiveEventStatusProps {
	eventId: Id<"events">;
	showTeam?: boolean;
	updateInterval?: number;
}

export function LiveEventStatus(props: LiveEventStatusProps) {
	const { showTeam = true, updateInterval = 30000 } = props;

	const [currentTime, setCurrentTime] = useState(Date.now());

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const event = useQuery(api.events.getById, { eventId: props.eventId });

	// Update current time periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, updateInterval);

		return () => clearInterval(interval);
	}, [updateInterval]);

	const eventStatus = useMemo(() => {
		if (!tasks || !event) return null;

		const dayOfTasks = tasks.filter((t: any) => t.phase === "day_of");
		const allTasks = tasks;

		const totalTasks = allTasks.length;
		const completedTasks = allTasks.filter((t: any) => t.status === "completed").length;
		const inProgressTasks = allTasks.filter((t: any) => t.status === "in_progress").length;
		const blockedTasks = allTasks.filter((t: any) => t.status === "blocked").length;

		// Find current task
		const sortedDayOfTasks = dayOfTasks
			.filter((t: any) => t.dayOfSequence !== undefined)
			.sort((a: any, b: any) => (a.dayOfSequence || 0) - (b.dayOfSequence || 0));

		let currentTask = null;
		let nextTask = null;

		for (let i = 0; i < sortedDayOfTasks.length; i++) {
			const task = sortedDayOfTasks[i];
			if (task.status !== "completed") {
				currentTask = task;
				nextTask = sortedDayOfTasks[i + 1] || null;
				break;
			}
		}

		// Get team members and their tasks
		const teamMembers = new Map<string, any>();
		allTasks.forEach((task: any) => {
			if (task.assignee) {
				if (!teamMembers.has(task.assignee)) {
					teamMembers.set(task.assignee, {
						name: task.assignee,
						tasks: [],
						current: null,
					});
				}

				const member = teamMembers.get(task.assignee);
				member.tasks.push(task);

				if (task.status === "in_progress" && !member.current) {
					member.current = task;
				}
			}
		});

		const eventDate = new Date(event.date);
		const isToday =
			eventDate.toDateString() === new Date().toDateString();

		const status = isToday
			? "live"
			: eventDate > new Date()
				? "upcoming"
				: "completed";

		return {
			totalTasks,
			completedTasks,
			inProgressTasks,
			blockedTasks,
			currentTask,
			nextTask,
			teamMembers: Array.from(teamMembers.values()),
			status,
			progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
		};
	}, [tasks, event, currentTime]);

	const handleTaskClick = (taskId: string, taskData: any) => {
		emit({
			type: "taskSelected",
			payload: { taskId, taskData },
		});
	};

	const handleMemberClick = (member: any) => {
		if (member.name) {
			emit({
				type: "teamMemberSelected",
				payload: { userId: member.name, userName: member.name },
			});
		}
	};

	if (tasks === undefined || event === undefined) {
		return <LiveEventStatusSkeleton />;
	}

	if (!eventStatus) {
		return <LiveEventStatusEmpty />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Live Event Status
				</CardTitle>
				<div className="flex items-center gap-2">
					<Badge
						variant={
							eventStatus.status === "live"
								? "default"
								: eventStatus.status === "upcoming"
									? "outline"
									: "secondary"
						}
						className={
							eventStatus.status === "live"
								? "bg-green-600 animate-pulse"
								: ""
						}
					>
						{eventStatus.status === "live" && `${SYMBOLS.CIRCLE} `}
						{eventStatus.status.toUpperCase()}
					</Badge>
					{eventStatus.blockedTasks > 0 && (
						<Badge variant="destructive">
							{eventStatus.blockedTasks} blocked
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Overall progress */}
				<div className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium">Overall Progress</span>
						<span className="text-sm text-muted-foreground">
							{eventStatus.completedTasks}/{eventStatus.totalTasks} tasks
						</span>
					</div>
					<div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-500"
							style={{ width: `${eventStatus.progress}%` }}
						/>
					</div>
				</div>

				{/* Current task */}
				{eventStatus.currentTask && (
					<div className="mb-6 p-4 rounded-lg bg-primary/10 border-2 border-primary">
						<div className="flex items-start justify-between mb-2">
							<div className="flex items-center gap-2">
								<span className="text-lg">{SYMBOLS.STAR}</span>
								<h3 className="font-semibold">Happening Now</h3>
							</div>
							<Badge variant="outline">
								#{eventStatus.currentTask.dayOfSequence}
							</Badge>
						</div>

						<div
							className="cursor-pointer"
							onClick={() =>
								handleTaskClick(
									eventStatus.currentTask._id,
									eventStatus.currentTask,
								)
							}
						>
							<h4 className="font-medium mb-2">{eventStatus.currentTask.title}</h4>
							{eventStatus.currentTask.description && (
								<p className="text-sm text-muted-foreground mb-2">
									{eventStatus.currentTask.description}
								</p>
							)}
							<div className="flex flex-wrap items-center gap-2">
								{eventStatus.currentTask.assignee && (
									<Badge variant="outline">
										{eventStatus.currentTask.assignee}
									</Badge>
								)}
								{eventStatus.currentTask.vendor && (
									<Badge variant="outline">
										{SYMBOLS.HANDSHAKE} {eventStatus.currentTask.vendor}
									</Badge>
								)}
								{eventStatus.currentTask.estimatedDuration && (
									<Badge variant="outline">
										{eventStatus.currentTask.estimatedDuration}min
									</Badge>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Next task */}
				{eventStatus.nextTask && (
					<div className="mb-6 p-3 rounded-lg border border-border bg-accent/20">
						<div className="flex items-start justify-between">
							<div>
								<span className="text-xs text-muted-foreground">Up Next</span>
								<h4 className="font-normal text-sm mt-1">{eventStatus.nextTask.title}</h4>
							</div>
							<Badge variant="outline">#{eventStatus.nextTask.dayOfSequence}</Badge>
						</div>
					</div>
				)}

				{/* Team status */}
				{showTeam && eventStatus.teamMembers.length > 0 && (
					<div>
						<h3 className="text-sm font-medium mb-3">Team Activity</h3>
						<div className="space-y-2">
							{eventStatus.teamMembers.map((member: any) => (
								<div
									key={member.name}
									className="p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
									onClick={() => handleMemberClick(member)}
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											<AvatarFallback className="text-xs">
												{member.name
													.split(" ")
													.map((n: string) => n[0])
													.join("")
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-sm">{member.name}</span>
												<Badge variant="outline" className="text-xs">
													{member.tasks.length} tasks
												</Badge>
											</div>
											{member.current ? (
												<p className="text-xs text-muted-foreground truncate mt-1">
													Working on: {member.current.title}
												</p>
											) : (
												<p className="text-xs text-muted-foreground mt-1">
													No active tasks
												</p>
											)}
										</div>

										{member.current && (
											<Badge className="bg-blue-600 text-xs">Active</Badge>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Status indicators */}
				<div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
					<div>
						<div className="text-2xl font-bold text-green-600">
							{eventStatus.completedTasks}
						</div>
						<div className="text-xs text-muted-foreground">Completed</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-blue-600">
							{eventStatus.inProgressTasks}
						</div>
						<div className="text-xs text-muted-foreground">In Progress</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-red-600">
							{eventStatus.blockedTasks}
						</div>
						<div className="text-xs text-muted-foreground">Blocked</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function LiveEventStatusSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function LiveEventStatusEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Live Event Status
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No event data available</p>
			</CardContent>
		</Card>
	);
}

export const LiveEventStatusMetadata = {
	name: "LiveEventStatus",
	description: "Real-time status dashboard for live event coordination",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "500px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["taskSelected", "teamMemberSelected"],
		listensTo: ["taskStatusChanged"],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showTeam: {
			type: "boolean",
			required: false,
			description: "Show team member activity",
		},
		updateInterval: {
			type: "number",
			required: false,
			description: "Update interval in milliseconds (default: 30000)",
		},
	},
};
