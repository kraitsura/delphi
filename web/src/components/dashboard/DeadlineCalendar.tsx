import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface DeadlineCalendarProps {
	eventId: Id<"events">;
	view?: "month" | "week";
	highlightOverdue?: boolean;
}

export function DeadlineCalendar(props: DeadlineCalendarProps) {
	const { view = "month", highlightOverdue = true } = props;

	// Zustand state - could track selected date range if needed
	const select = useDashboardStore((state) => state.select);
	const selectedDate = useDashboardStore((state) => state.selections.dateRange);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const calendarData = useMemo(() => {
		if (!tasks) return { days: [], weeks: [] };

		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		// Get first day of month and number of days
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

		// Build days array with task counts
		const days = [];
		const tasksByDate = new Map<string, any[]>();

		// Group tasks by date
		tasks.forEach((task: any) => {
			if (task.dueDate) {
				const date = new Date(task.dueDate);
				const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
				const existing = tasksByDate.get(dateKey) || [];
				tasksByDate.set(dateKey, [...existing, task]);
			}
		});

		// Build calendar grid
		for (let i = 0; i < startDayOfWeek; i++) {
			days.push({ day: 0, tasks: [], isCurrentMonth: false });
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(currentYear, currentMonth, day);
			const dateKey = `${currentYear}-${currentMonth}-${day}`;
			const dayTasks = tasksByDate.get(dateKey) || [];

			const isToday =
				day === now.getDate() &&
				currentMonth === now.getMonth() &&
				currentYear === now.getFullYear();

			days.push({
				day,
				date: date.getTime(),
				tasks: dayTasks,
				isCurrentMonth: true,
				isToday,
			});
		}

		// Fill remaining days
		const remainingDays = 42 - days.length; // 6 weeks
		for (let i = 0; i < remainingDays; i++) {
			days.push({ day: 0, tasks: [], isCurrentMonth: false });
		}

		// Group into weeks
		const weeks = [];
		for (let i = 0; i < days.length; i += 7) {
			weeks.push(days.slice(i, i + 7));
		}

		return { days, weeks, monthName: firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
	}, [tasks]);

	const handleDayClick = (date: number, dayTasks: any[]) => {
		if (dayTasks.length === 0) return;

		setSelectedDate(date);
		emit({
			type: "dateSelected",
			payload: { date },
		});
	};

	const handleTaskClick = (taskId: string, taskData: any) => {
		emit({
			type: "taskSelected",
			payload: { taskId, taskData },
		});
	};

	if (tasks === undefined) {
		return <DeadlineCalendarSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <DeadlineCalendarEmpty />;
	}

	const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const now = Date.now();

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Deadline Calendar
				</CardTitle>
				<span className="text-sm text-muted-foreground">{calendarData.monthName}</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Calendar grid */}
				<div>
					{/* Week day headers */}
					<div className="grid grid-cols-7 gap-1 mb-2">
						{weekDays.map((day) => (
							<div
								key={day}
								className="text-center text-xs font-medium text-muted-foreground py-2"
							>
								{day}
							</div>
						))}
					</div>

					{/* Calendar days */}
					<div className="space-y-1">
						{calendarData.weeks.map((week, weekIndex) => (
							<div key={weekIndex} className="grid grid-cols-7 gap-1">
								{week.map((dayData: any, dayIndex) => {
									if (!dayData.isCurrentMonth) {
										return <div key={dayIndex} className="h-20 bg-muted/20 rounded" />;
									}

									const hasOverdue =
										highlightOverdue &&
										dayData.tasks.some(
											(t: any) =>
												t.dueDate < now && t.status !== "completed",
										);

									return (
										<div
											key={dayIndex}
											className={`h-20 rounded border transition-colors ${
												dayData.isToday
													? "border-primary bg-primary/5"
													: "border-border"
											} ${
												dayData.tasks.length > 0
													? "cursor-pointer hover:bg-accent/30"
													: ""
											} ${selectedDate === dayData.date ? "bg-accent/50 border-primary" : ""}`}
											onClick={() =>
												dayData.date && handleDayClick(dayData.date, dayData.tasks)
											}
										>
											<div className="p-1 h-full flex flex-col">
												<div className="flex items-center justify-between mb-1">
													<span
														className={`text-xs ${dayData.isToday ? "font-bold text-primary" : ""}`}
													>
														{dayData.day}
													</span>
													{dayData.tasks.length > 0 && (
														<Badge
															variant={hasOverdue ? "destructive" : "outline"}
															className="text-xs h-4 px-1"
														>
															{dayData.tasks.length}
														</Badge>
													)}
												</div>

												{/* Task dots */}
												<div className="flex flex-wrap gap-0.5">
													{dayData.tasks.slice(0, 3).map((task: any, idx: number) => (
														<div
															key={idx}
															className={`w-1.5 h-1.5 rounded-full ${
																task.status === "completed"
																	? "bg-green-600"
																	: task.status === "blocked"
																		? "bg-red-600"
																		: task.status === "in_progress"
																			? "bg-blue-600"
																			: "bg-gray-400"
															}`}
															title={task.title}
														/>
													))}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Selected day tasks */}
				{selectedDate && (
					<div className="mt-4 pt-4 border-t">
						<h4 className="text-sm font-medium mb-2">
							Tasks on{" "}
							{new Date(selectedDate).toLocaleDateString("en-US", {
								month: "long",
								day: "numeric",
							})}
						</h4>
						<div className="space-y-2">
							{calendarData.days
								.find((d: any) => d.date === selectedDate)
								?.tasks.map((task: any) => (
									<div
										key={task._id}
										className="p-2 rounded-md border border-border hover:bg-accent/50 transition-colors cursor-pointer"
										onClick={() => handleTaskClick(task._id, task)}
									>
										<div className="flex items-center justify-between">
											<span className="text-sm">{task.title}</span>
											<Badge
												variant="outline"
												className={`text-xs ${
													task.status === "completed"
														? "bg-green-100 dark:bg-green-900"
														: task.status === "blocked"
															? "bg-red-100 dark:bg-red-900"
															: task.status === "in_progress"
																? "bg-blue-100 dark:bg-blue-900"
																: ""
												}`}
											>
												{task.status.replace("_", " ")}
											</Badge>
										</div>
									</div>
								))}
						</div>
					</div>
				)}

				{/* Legend */}
				<div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-gray-400 rounded-full" />
						<span>Not Started</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-blue-600 rounded-full" />
						<span>In Progress</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-green-600 rounded-full" />
						<span>Completed</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function DeadlineCalendarSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-7 gap-1">
					{Array.from({ length: 35 }).map((_, i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function DeadlineCalendarEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Deadline Calendar
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks with deadlines yet</p>
			</CardContent>
		</Card>
	);
}

export const DeadlineCalendarMetadata = {
	name: "DeadlineCalendar",
	description: "Calendar view showing task deadlines",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "450px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["dateSelected", "taskSelected"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		view: {
			type: "enum",
			required: false,
			values: ["month", "week"],
			description: "Calendar view mode",
		},
		highlightOverdue: {
			type: "boolean",
			required: false,
			description: "Highlight overdue tasks in red",
		},
	},
};
