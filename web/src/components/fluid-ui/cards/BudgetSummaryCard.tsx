/**
 * BudgetSummaryCard - Quick overview of event budget status
 *
 * Features:
 * - Spent vs remaining display
 * - Visual progress bar
 * - Percentage utilization
 * - Category breakdown (top 3)
 * - Alert for over-budget warnings
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertTriangle, DollarSign, PieChart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BudgetSummaryCardProps {
	eventId: Id<"events">;
	title?: string;
	showCategories?: boolean;
}

export function BudgetSummaryCard({
	eventId,
	title = "Budget Overview",
	showCategories = true,
}: BudgetSummaryCardProps) {
	// Query event and expenses
	const event = useQuery(api.events.getById, { eventId });
	const expenses = useQuery(api.expenses.listByEvent, { eventId });

	// Calculate totals from event budget
	const totalBudget = event?.budget?.total || 0;
	const totalSpent = event?.budget?.spent || 0;
	const remaining = totalBudget - totalSpent;
	const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

	// Get category breakdown (top 3 by spending)
	// Combine allocated budget with actual spending
	const categorySpending: Record<string, { spent: number; budget: number }> =
		{};

	// First, add allocated budget from event
	const allocated = event?.budget?.allocated;
	if (allocated) {
		Object.entries(allocated).forEach(([category, amount]) => {
			if (amount) {
				categorySpending[category] = { spent: 0, budget: amount };
			}
		});
	}

	// Then, add actual spending from expenses
	expenses?.forEach((expense) => {
		const category = expense.category || "other";
		if (!categorySpending[category]) {
			categorySpending[category] = { spent: 0, budget: 0 };
		}
		categorySpending[category].spent += expense.amount;
	});

	const topCategories = Object.entries(categorySpending)
		.map(([category, data]) => ({ category, ...data }))
		.sort((a, b) => b.spent - a.spent)
		.slice(0, 3);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const getProgressColor = () => {
		if (percentageUsed >= 100) return "bg-red-500";
		if (percentageUsed >= 80) return "bg-yellow-500";
		return "bg-green-500";
	};

	const getStatusMessage = () => {
		if (percentageUsed >= 100)
			return {
				text: "Over Budget!",
				icon: AlertTriangle,
				color: "text-red-600",
			};
		if (percentageUsed >= 80)
			return {
				text: "Approaching Limit",
				icon: TrendingUp,
				color: "text-yellow-600",
			};
		return { text: "On Track", icon: TrendingUp, color: "text-green-600" };
	};

	const status = getStatusMessage();
	const StatusIcon = status.icon;

	// Loading state
	if (event === undefined || expenses === undefined) {
		return (
			<Card className="border-purple-200 bg-purple-50">
				<CardContent className="py-8">
					<div className="text-center text-sm text-gray-500">
						Loading budget...
					</div>
				</CardContent>
			</Card>
		);
	}

	// No event found
	if (!event) {
		return (
			<Card className="border-purple-200 bg-purple-50">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold text-purple-900 flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6 text-sm text-gray-500">
						Event not found
					</div>
				</CardContent>
			</Card>
		);
	}

	// No budget set yet
	if (!event.budget || event.budget.total === 0) {
		return (
			<Card className="border-purple-200 bg-purple-50">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold text-purple-900 flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-6 text-sm text-gray-500">
						No budget set yet
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"border-purple-200",
				percentageUsed >= 100
					? "bg-red-50"
					: percentageUsed >= 80
						? "bg-yellow-50"
						: "bg-purple-50",
			)}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold text-purple-900 flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						{title}
					</CardTitle>
					<div
						className={cn(
							"flex items-center gap-1 text-xs font-medium",
							status.color,
						)}
					>
						<StatusIcon className="h-3.5 w-3.5" />
						{status.text}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Main budget display */}
				<div className="grid grid-cols-3 gap-2">
					<div className="text-center p-2 bg-white border border-purple-200 rounded-md">
						<div className="text-xs text-gray-500">Total Budget</div>
						<div className="text-sm font-bold text-gray-900 mt-0.5">
							{formatCurrency(totalBudget)}
						</div>
					</div>
					<div className="text-center p-2 bg-white border border-purple-200 rounded-md">
						<div className="text-xs text-gray-500">Spent</div>
						<div
							className={cn(
								"text-sm font-bold mt-0.5",
								percentageUsed >= 100 ? "text-red-600" : "text-gray-900",
							)}
						>
							{formatCurrency(totalSpent)}
						</div>
					</div>
					<div className="text-center p-2 bg-white border border-purple-200 rounded-md">
						<div className="text-xs text-gray-500">Remaining</div>
						<div
							className={cn(
								"text-sm font-bold mt-0.5",
								remaining < 0 ? "text-red-600" : "text-green-600",
							)}
						>
							{formatCurrency(remaining)}
						</div>
					</div>
				</div>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="flex items-center justify-between text-xs">
						<span className="text-gray-600">Budget Utilization</span>
						<span
							className={cn(
								"font-semibold",
								percentageUsed >= 100
									? "text-red-600"
									: percentageUsed >= 80
										? "text-yellow-600"
										: "text-gray-700",
							)}
						>
							{percentageUsed.toFixed(1)}%
						</span>
					</div>
					<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full transition-all duration-500",
								getProgressColor(),
							)}
							style={{ width: `${Math.min(percentageUsed, 100)}%` }}
						/>
					</div>
				</div>

				{/* Category breakdown */}
				{showCategories && topCategories.length > 0 && (
					<div className="space-y-1.5 pt-1">
						<div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
							<PieChart className="h-3 w-3" />
							Top Spending Categories
						</div>
						{topCategories.map(({ category, spent, budget }) => {
							const categoryPercent = budget > 0 ? (spent / budget) * 100 : 0;
							return (
								<div
									key={category}
									className="flex items-center justify-between text-xs py-1.5 px-2 bg-white border border-purple-100 rounded"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-gray-800 truncate">
											{category}
										</div>
										<div className="text-[10px] text-gray-500">
											{formatCurrency(spent)} / {formatCurrency(budget)}
										</div>
									</div>
									<div
										className={cn(
											"text-xs font-semibold ml-2",
											categoryPercent >= 100
												? "text-red-600"
												: categoryPercent >= 80
													? "text-yellow-600"
													: "text-gray-600",
										)}
									>
										{categoryPercent.toFixed(0)}%
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
