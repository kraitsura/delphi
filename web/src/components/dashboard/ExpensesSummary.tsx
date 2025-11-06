import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface ExpensesSummaryProps {
	eventId: Id<"events">;
	showChart?: boolean;
	showCategories?: boolean;
}

export function ExpensesSummary(props: ExpensesSummaryProps) {
	const { showChart = true, showCategories = true } = props;

	const event = useQuery(api.events.getById, { eventId: props.eventId });
	const expenses = useQuery(api.expenses.listByEvent, {
		eventId: props.eventId,
	});

	const summary = useMemo(() => {
		if (!event || !expenses) return null;

		const total = event.budget?.total || 0;
		const spent = event.budget?.spent || 0;
		const committed = event.budget?.committed || 0;
		const remaining = total - spent - committed;

		// Category breakdown
		const categoryTotals = new Map<string, number>();
		expenses.forEach((expense) => {
			const category = expense.category || "Other";
			categoryTotals.set(
				category,
				(categoryTotals.get(category) || 0) + expense.amount,
			);
		});

		const categoryBreakdown = Array.from(categoryTotals.entries())
			.map(([category, amount]) => ({
				category,
				amount,
				percentage: total > 0 ? (amount / total) * 100 : 0,
			}))
			.sort((a, b) => b.amount - a.amount);

		return {
			total,
			spent,
			committed,
			remaining,
			percentageUsed: total > 0 ? ((spent + committed) / total) * 100 : 0,
			categoryBreakdown,
		};
	}, [event, expenses]);

	if (event === undefined || expenses === undefined) {
		return <ExpensesSummarySkeleton />;
	}

	if (!event || !summary) {
		return <ExpensesSummaryEmpty />;
	}

	const getHealthStatus = () => {
		if (summary.percentageUsed > 100) {
			return {
				label: "Over Budget",
				color: "text-red-600",
				icon: SYMBOLS.THUNDERBOLT,
			};
		} else if (summary.percentageUsed > 90) {
			return {
				label: "At Risk",
				color: "text-yellow-600",
				icon: SYMBOLS.THUNDERBOLT,
			};
		} else {
			return {
				label: "On Track",
				color: "text-green-600",
				icon: SYMBOLS.CHECK_MARK,
			};
		}
	};

	const health = getHealthStatus();

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Budget Overview
				</CardTitle>
				<div className={`flex items-center gap-1 text-sm ${health.color}`}>
					<span>{health.icon}</span>
					<span>{health.label}</span>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Progress bar */}
				{showChart && (
					<div className="space-y-2 mb-6">
						<div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
							<div className="flex h-full">
								{/* Spent */}
								<div
									className="bg-green-600"
									style={{
										width: `${(summary.spent / summary.total) * 100}%`,
									}}
								/>
								{/* Committed */}
								<div
									className="bg-yellow-600"
									style={{
										width: `${(summary.committed / summary.total) * 100}%`,
									}}
								/>
								{/* Over budget indicator */}
								{summary.percentageUsed > 100 && (
									<div
										className="bg-red-600"
										style={{
											width: `${summary.percentageUsed - 100}%`,
										}}
									/>
								)}
							</div>
						</div>
						<div className="text-xs text-muted-foreground text-right">
							{summary.percentageUsed.toFixed(1)}% of budget
						</div>
					</div>
				)}

				{/* Stats cards */}
				<div className="grid grid-cols-3 gap-4 mb-6">
					<div className="space-y-1">
						<div className="text-xs text-muted-foreground uppercase tracking-wide">
							Total Budget
						</div>
						<div className="text-2xl font-light">
							${summary.total.toLocaleString()}
						</div>
					</div>

					<div className="space-y-1">
						<div className="text-xs text-muted-foreground uppercase tracking-wide">
							Spent
						</div>
						<div className="text-2xl font-light text-green-600">
							${summary.spent.toLocaleString()}
						</div>
					</div>

					<div className="space-y-1">
						<div className="text-xs text-muted-foreground uppercase tracking-wide">
							Remaining
						</div>
						<div
							className={`text-2xl font-light ${
								summary.remaining < 0 ? "text-red-600" : "text-foreground"
							}`}
						>
							${summary.remaining.toLocaleString()}
						</div>
					</div>
				</div>

				{/* Category breakdown */}
				{showCategories && summary.categoryBreakdown.length > 0 && (
					<div className="space-y-3">
						<h4 className="text-sm text-muted-foreground uppercase tracking-wide">
							By Category
						</h4>
						<div className="space-y-2">
							{summary.categoryBreakdown.map((cat) => (
								<div key={cat.category} className="space-y-1">
									<div className="flex justify-between text-sm">
										<span>{cat.category}</span>
										<span className="text-muted-foreground">
											${cat.amount.toLocaleString()} (
											{cat.percentage.toFixed(1)}%)
										</span>
									</div>
									<div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
										<div
											className="h-full bg-primary"
											style={{
												width: `${cat.percentage}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ExpensesSummarySkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-3 w-full rounded-full" />
				<div className="grid grid-cols-3 gap-4">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function ExpensesSummaryEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Budget Overview
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No budget information available</p>
			</CardContent>
		</Card>
	);
}

export const ExpensesSummaryMetadata = {
	name: "ExpensesSummary",
	description: "Financial overview with budget tracking and categories",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "2fr",
		minWidth: "400px",
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
		showChart: {
			type: "boolean",
			required: false,
			description: "Show budget progress chart",
		},
		showCategories: {
			type: "boolean",
			required: false,
			description: "Show category breakdown",
		},
	},
};
