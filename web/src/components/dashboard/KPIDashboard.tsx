import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface KPIDashboardProps {
	eventId: Id<"events">;
	showDetails?: boolean;
}

type MetricStatus = "good" | "warning" | "danger";

interface Metric {
	label: string;
	value: string;
	subtitle: string;
	percentage: number;
	status: MetricStatus;
	icon: string;
}

export function KPIDashboard(props: KPIDashboardProps) {
	const { showDetails = false } = props;

	// Fetch data from Convex
	const event = useQuery(api.events.getById, { eventId: props.eventId });
	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const expenses = useQuery(api.expenses.listByEvent, {
		eventId: props.eventId,
	});
	const guests = useQuery(api.guests.listByEvent, { eventId: props.eventId });

	const metrics = useMemo(() => {
		if (!event) return null;

		const results: Metric[] = [];

		// Budget Metric
		const totalBudget = event.budget?.total || 0;
		const spent = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) ?? 0;
		const budgetPct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

		results.push({
			label: "Budget",
			value: `$${(spent / 1000).toFixed(1)}K / $${(totalBudget / 1000).toFixed(1)}K`,
			subtitle: `${budgetPct.toFixed(0)}% used`,
			percentage: budgetPct,
			status: budgetPct < 80 ? "good" : budgetPct < 95 ? "warning" : "danger",
			icon: SYMBOLS.BLACK_SQUARE,
		});

		// Tasks Metric
		const totalTasks = tasks?.length ?? 0;
		const completedTasks =
			tasks?.filter((t) => t.status === "completed").length ?? 0;
		const tasksPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

		results.push({
			label: "Tasks",
			value: `${completedTasks} / ${totalTasks}`,
			subtitle: `${tasksPct.toFixed(0)}% complete`,
			percentage: tasksPct,
			status: tasksPct >= 70 ? "good" : tasksPct >= 40 ? "warning" : "danger",
			icon: SYMBOLS.CHECK_MARK,
		});

		// Days Until Event Metric
		const eventDate = event.eventDate ?? Date.now();
		const daysRemaining = Math.max(
			0,
			Math.floor((eventDate - Date.now()) / (1000 * 60 * 60 * 24)),
		);

		results.push({
			label: "Days",
			value: daysRemaining.toString(),
			subtitle: daysRemaining === 1 ? "day left" : "days left",
			percentage: 0, // No percentage for days
			status:
				daysRemaining > 90 ? "good" : daysRemaining > 30 ? "warning" : "danger",
			icon: SYMBOLS.THUNDERBOLT,
		});

		// RSVP Metric
		const expectedGuests = event.guestCount?.expected ?? 0;
		const confirmedGuests =
			guests?.filter((g) => g.rsvpStatus === "attending").length ?? 0;
		const rsvpPct =
			expectedGuests > 0 ? (confirmedGuests / expectedGuests) * 100 : 0;

		results.push({
			label: "RSVP",
			value: `${confirmedGuests} / ${expectedGuests}`,
			subtitle: `${rsvpPct.toFixed(0)}% confirmed`,
			percentage: rsvpPct,
			status: rsvpPct >= 60 ? "good" : rsvpPct >= 30 ? "warning" : "danger",
			icon: SYMBOLS.BLACK_CIRCLE,
		});

		return results;
	}, [event, tasks, expenses, guests]);

	if (
		event === undefined ||
		tasks === undefined ||
		expenses === undefined ||
		guests === undefined
	) {
		return <KPIDashboardSkeleton />;
	}

	if (!event || !metrics) {
		return <KPIDashboardEmpty />;
	}

	const getStatusColor = (status: MetricStatus) => {
		switch (status) {
			case "good":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "danger":
				return "text-red-600";
		}
	};

	const getStatusBgColor = (status: MetricStatus) => {
		switch (status) {
			case "good":
				return "bg-green-600";
			case "warning":
				return "bg-yellow-600";
			case "danger":
				return "bg-red-600";
		}
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Key Metrics
				</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
					{metrics.map((metric) => (
						<div
							key={metric.label}
							className="space-y-3 p-4 rounded-lg border border-border hover:bg-accent/30 transition-colors"
						>
							{/* Header */}
							<div className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground uppercase tracking-wide">
									{metric.label}
								</span>
								<span className={`text-lg ${getStatusColor(metric.status)}`}>
									{metric.icon}
								</span>
							</div>

							{/* Value */}
							<div className="space-y-1">
								<div
									className={`text-2xl font-light ${getStatusColor(metric.status)}`}
								>
									{metric.value}
								</div>
								<div className="text-xs text-muted-foreground">
									{metric.subtitle}
								</div>
							</div>

							{/* Progress bar (if percentage exists) */}
							{metric.percentage > 0 && (
								<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-500 ${getStatusBgColor(metric.status)}`}
										style={{ width: `${Math.min(metric.percentage, 100)}%` }}
									/>
								</div>
							)}

							{/* Status badge (if showDetails) */}
							{showDetails && (
								<Badge
									variant="outline"
									className={`text-xs ${getStatusColor(metric.status)}`}
								>
									{metric.status === "good"
										? "On Track"
										: metric.status === "warning"
											? "At Risk"
											: "Critical"}
								</Badge>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function KPIDashboardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-3 p-4 border rounded-lg">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-8 w-24" />
							<Skeleton className="h-2 w-full rounded-full" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function KPIDashboardEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Key Metrics
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No event data available</p>
			</CardContent>
		</Card>
	);
}

export const KPIDashboardMetadata = {
	name: "KPIDashboard",
	description:
		"High-level event metrics overview (Budget, Tasks, Timeline, RSVP)",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "200px",
	},
	zustand: {
		role: "listener",
		writes: [],
		reads: [],
		behavior:
			"Read-only display component. Does not interact with Zustand store.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showDetails: {
			type: "boolean",
			required: false,
			description: "Show detailed status badges for each metric",
		},
	},
};
