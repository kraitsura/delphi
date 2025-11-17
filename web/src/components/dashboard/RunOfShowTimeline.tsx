import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface RunOfShowTimelineProps {
	eventId: Id<"events">;
	autoScroll?: boolean;
	showDurations?: boolean;
}

export function RunOfShowTimeline(props: RunOfShowTimelineProps) {
	const { autoScroll = true, showDurations = true } = props;

	const [currentTime, setCurrentTime] = useState(Date.now());
	const currentTaskRef = useRef<HTMLDivElement>(null);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const event = useQuery(api.events.getById, { eventId: props.eventId });

	// Update current time periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 10000); // Update every 10 seconds

		return () => clearInterval(interval);
	}, []);

	// Auto-scroll to current task
	useEffect(() => {
		if (autoScroll && currentTaskRef.current) {
			currentTaskRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [autoScroll]);

	const runOfShow = useMemo(() => {
		if (!tasks || !event) return [];

		const eventDate = new Date(event.eventDate || Date.now());

		// Get day-of tasks sorted by sequence
		const dayOfTasks = tasks
			.filter((t: any) => t.phase === "day_of" && t.dayOfSequence !== undefined)
			.sort(
				(a: any, b: any) => (a.dayOfSequence || 0) - (b.dayOfSequence || 0),
			);

		// Calculate start time for each task
		let cumulativeTime = eventDate.getTime();

		return dayOfTasks.map((task: any) => {
			const startTime = cumulativeTime;
			const duration = task.estimatedDuration || 30; // minutes
			const endTime = startTime + duration * 60 * 1000;

			cumulativeTime = endTime;

			const now = currentTime;
			const isCurrent = now >= startTime && now < endTime;
			const isPast = now >= endTime;
			const isUpcoming = now < startTime;

			return {
				...task,
				startTime,
				endTime,
				duration,
				isCurrent,
				isPast,
				isUpcoming,
			};
		});
	}, [tasks, event, currentTime]);

	const handleTaskClick = (_taskId: string, _taskData: any) => {
		// Task selection handling - could be implemented with event handlers or routing
		// Currently disabled as event emitter pattern is not implemented
	};

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const formatDuration = (minutes: number) => {
		if (minutes < 60) {
			return `${minutes}m`;
		}
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	};

	if (tasks === undefined || event === undefined) {
		return <RunOfShowTimelineSkeleton />;
	}

	if (!runOfShow || runOfShow.length === 0) {
		return <RunOfShowTimelineEmpty />;
	}

	const currentTask = runOfShow.find((t) => t.isCurrent);
	const completedCount = runOfShow.filter(
		(t) => t.status === "completed",
	).length;

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex items-center justify-between">
					<CardTitle className="fluid-component-title">
						{SYMBOLS.BLACK_SQUARE} Run of Show
					</CardTitle>
					<div className="flex items-center gap-2">
						{currentTask && (
							<Badge className="bg-green-600 animate-pulse">
								{SYMBOLS.CIRCLE} Live
							</Badge>
						)}
						<Badge variant="outline">
							{completedCount}/{runOfShow.length}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Current time indicator */}
				<div className="mb-4 p-3 rounded-lg bg-muted/50 text-center">
					<div className="text-sm text-muted-foreground">Current Time</div>
					<div className="text-xl font-mono font-bold">
						{formatTime(currentTime)}
					</div>
				</div>

				{/* Timeline */}
				<div className="relative">
					{/* Timeline line */}
					<div className="absolute left-[60px] top-0 bottom-0 w-0.5 bg-border z-0" />

					{/* Timeline items */}
					<div className="space-y-3 relative z-10">
						{runOfShow.map((task: any) => (
							<div
								key={task._id}
								ref={task.isCurrent ? currentTaskRef : null}
								className={`relative pl-[90px] ${
									task.isCurrent ? "animate-pulse-slow" : ""
								}`}
							>
								{/* Time marker */}
								<div className="absolute left-0 top-0 w-[50px] text-right">
									<div className="text-xs font-mono font-medium">
										{formatTime(task.startTime)}
									</div>
									{showDurations && task.duration && (
										<div className="text-xs text-muted-foreground">
											{formatDuration(task.duration)}
										</div>
									)}
								</div>

								{/* Timeline dot */}
								<div
									className={`absolute left-[54px] top-2 w-3 h-3 rounded-full border-2 ${
										task.isCurrent
											? "bg-green-600 border-green-600 ring-4 ring-green-600/30"
											: task.isPast && task.status === "completed"
												? "bg-green-600 border-green-600"
												: task.isPast
													? "bg-red-600 border-red-600"
													: "bg-background border-border"
									}`}
								/>

								{/* Task card */}
								<div
									className={`p-3 rounded-lg border cursor-pointer transition-all ${
										task.isCurrent
											? "border-green-600 bg-green-50 dark:bg-green-950 ring-2 ring-green-600/20"
											: task.isPast && task.status === "completed"
												? "border-green-200 bg-green-50/50 dark:bg-green-950/30 dark:border-green-900 opacity-75"
												: task.isPast
													? "border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-900 opacity-75"
													: "border-border bg-card hover:bg-accent/30"
									}`}
									onClick={() => handleTaskClick(task._id, task)}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant="outline" className="text-xs">
													#{task.dayOfSequence}
												</Badge>
												{task.isCurrent && (
													<Badge className="bg-green-600 text-xs">
														{SYMBOLS.STAR} Now
													</Badge>
												)}
												{task.status === "completed" && (
													<span className="text-green-600 text-sm">
														{SYMBOLS.CHECK_MARK}
													</span>
												)}
												{task.status === "blocked" && (
													<Badge variant="destructive" className="text-xs">
														Blocked
													</Badge>
												)}
											</div>

											<h4 className="font-medium text-sm mb-1">{task.title}</h4>

											{task.description && (
												<p className="text-xs text-muted-foreground mb-2">
													{task.description}
												</p>
											)}

											<div className="flex flex-wrap items-center gap-1.5">
												{task.assignee && (
													<Badge variant="outline" className="text-xs">
														{task.assignee}
													</Badge>
												)}
												{task.vendor && (
													<Badge variant="outline" className="text-xs">
														{SYMBOLS.HANDSHAKE} {task.vendor}
													</Badge>
												)}
												{task.category && (
													<Badge variant="outline" className="text-xs">
														{task.category}
													</Badge>
												)}
												{task.criticalPath && (
													<span className="text-xs text-red-600 font-semibold">
														{SYMBOLS.STAR} Critical
													</span>
												)}
											</div>
										</div>

										{/* End time */}
										<div className="text-xs text-muted-foreground text-right">
											<div>Ends</div>
											<div className="font-mono">
												{formatTime(task.endTime)}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Event end marker */}
					<div className="relative pl-[90px] mt-6 pt-4 border-t">
						<div className="absolute left-0 top-4 w-[50px] text-right">
							<div className="text-xs font-mono font-medium">
								{formatTime(
									runOfShow[runOfShow.length - 1]?.endTime || Date.now(),
								)}
							</div>
						</div>
						<div className="absolute left-[54px] top-6 w-3 h-3 rounded-full bg-primary border-2 border-primary" />
						<div className="p-3 rounded-lg border border-primary bg-primary/5">
							<div className="flex items-center gap-2">
								<span className="text-lg">{SYMBOLS.CHECK_MARK}</span>
								<span className="font-medium">Event Complete</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function RunOfShowTimelineSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-16 w-full mb-4" />
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function RunOfShowTimelineEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Run of Show
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No run of show scheduled yet</p>
				<p className="text-xs mt-2">
					Add tasks with sequence numbers to the &quot;Day Of&quot; phase
				</p>
			</CardContent>
		</Card>
	);
}

export const RunOfShowTimelineMetadata = {
	name: "RunOfShowTimeline",
	description: "Scrolling timeline showing event day sequence in real-time",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "600px",
		minWidth: "100%",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["taskSelected", "runOfShowUpdated"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		autoScroll: {
			type: "boolean",
			required: false,
			description: "Auto-scroll to current task",
		},
		showDurations: {
			type: "boolean",
			required: false,
			description: "Show estimated durations for each item",
		},
	},
};
