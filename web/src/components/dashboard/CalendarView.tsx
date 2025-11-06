import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface CalendarViewProps {
	eventId: Id<"events">;
	view?: "month" | "week";
	currentDate?: number;
	showTasks?: boolean;
	showMilestones?: boolean;
	onDateSelect?: (date: number) => void;
}

type CalendarEvent = {
	date: number;
	type: "event" | "task" | "milestone";
	title: string;
	color: string;
};

export function CalendarView(props: CalendarViewProps) {
	const {
		view = "month",
		showTasks = true,
		showMilestones = true,
		onDateSelect,
	} = props;

	const [currentDate, setCurrentDate] = useState(
		props.currentDate || Date.now(),
	);

	const event = useQuery(api.events.getById, { eventId: props.eventId });
	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const calendarEvents = useMemo(() => {
		if (!event || !tasks) return [];

		const events: CalendarEvent[] = [];

		// Add event date
		events.push({
			date: event.date,
			type: "event",
			title: event.name,
			color: "bg-yellow-500",
		});

		// Add task due dates
		if (showTasks) {
			tasks.forEach((task) => {
				if (task.dueDate) {
					events.push({
						date: task.dueDate,
						type: "task",
						title: task.title,
						color:
							task.status === "completed"
								? "bg-green-500"
								: task.status === "blocked"
									? "bg-red-500"
									: "bg-blue-500",
					});
				}
			});
		}

		return events;
	}, [event, tasks, showTasks]);

	const { daysInMonth, firstDayOfMonth, monthName, year } = useMemo(() => {
		const date = new Date(currentDate);
		const year = date.getFullYear();
		const month = date.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		return {
			daysInMonth: lastDay.getDate(),
			firstDayOfMonth: firstDay.getDay(),
			monthName: firstDay.toLocaleDateString("en-US", { month: "long" }),
			year,
		};
	}, [currentDate]);

	if (event === undefined || tasks === undefined) {
		return <CalendarViewSkeleton />;
	}

	const goToPreviousMonth = () => {
		const date = new Date(currentDate);
		date.setMonth(date.getMonth() - 1);
		setCurrentDate(date.getTime());
	};

	const goToNextMonth = () => {
		const date = new Date(currentDate);
		date.setMonth(date.getMonth() + 1);
		setCurrentDate(date.getTime());
	};

	const getDayEvents = (day: number) => {
		const date = new Date(
			new Date(currentDate).getFullYear(),
			new Date(currentDate).getMonth(),
			day,
		);
		const dayStart = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		).getTime();
		const dayEnd = dayStart + 24 * 60 * 60 * 1000;

		return calendarEvents.filter((e) => e.date >= dayStart && e.date < dayEnd);
	};

	const isToday = (day: number) => {
		const today = new Date();
		const date = new Date(currentDate);
		return (
			today.getDate() === day &&
			today.getMonth() === date.getMonth() &&
			today.getFullYear() === date.getFullYear()
		);
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Calendar
				</CardTitle>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
						{SYMBOLS.ARROW_LEFT}
					</Button>
					<span className="text-sm font-normal min-w-[150px] text-center">
						{monthName} {year}
					</span>
					<Button variant="ghost" size="sm" onClick={goToNextMonth}>
						{SYMBOLS.ARROW_RIGHT}
					</Button>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Day headers */}
				<div className="grid grid-cols-7 gap-1 mb-2">
					{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
						<div
							key={day}
							className="text-center text-xs text-muted-foreground uppercase tracking-wide py-2"
						>
							{day}
						</div>
					))}
				</div>

				{/* Calendar grid */}
				<div className="grid grid-cols-7 gap-1">
					{/* Empty cells for days before month starts */}
					{Array.from({ length: firstDayOfMonth }).map((_, i) => (
						<div key={`empty-${i}`} className="aspect-square" />
					))}

					{/* Days of the month */}
					{Array.from({ length: daysInMonth }).map((_, i) => {
						const day = i + 1;
						const dayEvents = getDayEvents(day);
						const today = isToday(day);

						return (
							<div
								key={day}
								className={`aspect-square border border-border rounded-md p-1 hover:bg-accent/50 transition-colors cursor-pointer ${
									today ? "ring-2 ring-primary" : ""
								}`}
								onClick={() => {
									const date = new Date(currentDate);
									date.setDate(day);
									onDateSelect?.(date.getTime());
								}}
							>
								<div className={`text-sm ${today ? "font-semibold" : ""}`}>
									{day}
								</div>
								{dayEvents.length > 0 && (
									<div className="flex flex-wrap gap-0.5 mt-1">
										{dayEvents.slice(0, 3).map((evt, idx) => (
											<div
												key={idx}
												className={`w-1.5 h-1.5 rounded-full ${evt.color}`}
												title={evt.title}
											/>
										))}
										{dayEvents.length > 3 && (
											<span className="text-xs text-muted-foreground">
												+{dayEvents.length - 3}
											</span>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function CalendarViewSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-7 gap-1">
					{Array.from({ length: 35 }).map((_, i) => (
						<Skeleton key={i} className="aspect-square" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export const CalendarViewMetadata = {
	name: "CalendarView",
	description: "Month/week calendar showing event dates and deadlines",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["dateSelected"],
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
		showTasks: {
			type: "boolean",
			required: false,
			description: "Show tasks on calendar",
		},
	},
};
