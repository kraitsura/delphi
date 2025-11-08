import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface ExpensesListProps {
	eventId: Id<"events">;
	category?: string;
	vendor?: Id<"users">;
	paymentStatus?: "pending" | "paid" | "overdue" | "all";
	dateRange?: { start: number; end: number };
	limit?: number;
	sortBy?: "date" | "amount" | "category" | "vendor";
	showFilters?: boolean;
}

export function ExpensesList(props: ExpensesListProps) {
	const {
		paymentStatus = "all",
		limit,
		sortBy = "date",
		showFilters: _showFilters = false,
	} = props;

	const expenses = useQuery(api.expenses.listByEvent, {
		eventId: props.eventId,
	});

	const filteredAndSorted = useMemo(() => {
		if (!expenses) return [];

		let filtered = expenses;

		// Filter by status
		if (paymentStatus !== "all") {
			filtered = filtered.filter((e) => e.status === paymentStatus);
		}

		// Filter by category
		if (props.category) {
			filtered = filtered.filter((e) => e.category === props.category);
		}

		// Filter by vendor
		if (props.vendor) {
			filtered = filtered.filter((e) => e.paidBy === props.vendor);
		}

		// Filter by date range
		if (props.dateRange?.start && props.dateRange?.end) {
			const start = props.dateRange.start;
			const end = props.dateRange.end;
			filtered = filtered.filter(
				(e) => e._creationTime >= start && e._creationTime <= end,
			);
		}

		// Sort
		const sorted = [...filtered].sort(
			(a: Doc<"expenses">, b: Doc<"expenses">) => {
				switch (sortBy) {
					case "date":
						return b._creationTime - a._creationTime;
					case "amount":
						return b.amount - a.amount;
					case "category":
						return (a.category || "").localeCompare(b.category || "");
					default:
						return 0;
				}
			},
		);

		// Limit
		return limit ? sorted.slice(0, limit) : sorted;
	}, [
		expenses,
		paymentStatus,
		props.category,
		props.vendor,
		props.dateRange,
		sortBy,
		limit,
	]);

	const totalAmount = useMemo(() => {
		return filteredAndSorted.reduce(
			(sum: number, e: Doc<"expenses">) => sum + e.amount,
			0,
		);
	}, [filteredAndSorted]);

	if (expenses === undefined) {
		return <ExpensesListSkeleton />;
	}

	if (!expenses || expenses.length === 0) {
		return <ExpensesListEmpty />;
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Expenses
				</CardTitle>
				<span className="text-sm text-muted-foreground">
					{filteredAndSorted.length} expense
					{filteredAndSorted.length !== 1 ? "s" : ""}
				</span>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Table */}
				<div className="space-y-1">
					{/* Header */}
					<div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs text-muted-foreground uppercase tracking-wide">
						<div className="col-span-2">Date</div>
						<div className="col-span-4">Description</div>
						<div className="col-span-2">Category</div>
						<div className="col-span-2 text-right">Amount</div>
						<div className="col-span-2 text-right">Status</div>
					</div>

					{/* Rows */}
					{filteredAndSorted.map((expense) => (
						<div
							key={expense._id}
							className="grid grid-cols-12 gap-2 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer text-sm"
						>
							<div className="col-span-2 text-muted-foreground">
								{formatDate(expense._creationTime)}
							</div>
							<div className="col-span-4">
								<div className="truncate">{expense.description}</div>
							</div>
							<div className="col-span-2">
								{expense.category && (
									<Badge variant="outline" className="text-xs">
										{expense.category}
									</Badge>
								)}
							</div>
							<div className="col-span-2 text-right font-normal">
								${expense.amount.toLocaleString()}
							</div>
							<div className="col-span-2 text-right">
								<Badge
									className={`status-badge status-badge--${expense.status} text-xs`}
								>
									{expense.status}
								</Badge>
							</div>
						</div>
					))}
				</div>

				{filteredAndSorted.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<p>No expenses match your filters</p>
					</div>
				)}
			</CardContent>

			<div className="fluid-component-footer px-6 pb-6">
				<div className="flex items-center justify-between">
					<div className="text-sm">
						<span className="text-muted-foreground">Total: </span>
						<span className="font-normal text-lg">
							${totalAmount.toLocaleString()}
						</span>
					</div>
					<Button variant="outline" size="sm">
						Add Expense
					</Button>
				</div>
			</div>
		</Card>
	);
}

function ExpensesListSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-2">
				<Skeleton className="h-8 w-full" />
				{[1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</CardContent>
		</Card>
	);
}

function ExpensesListEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Expenses
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No expenses yet</p>
			</CardContent>
		</Card>
	);
}

export const ExpensesListMetadata = {
	name: "ExpensesList",
	description: "Detailed expense table with filtering and sorting",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "2fr",
		minWidth: "400px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: true,
		emits: [],
		listensTo: ["vendorSelected", "categorySelected"],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		category: {
			type: "string",
			required: false,
			description: "Filter by category",
		},
		paymentStatus: {
			type: "enum",
			required: false,
			values: ["pending", "paid", "overdue", "all"],
			description: "Filter by payment status",
		},
		sortBy: {
			type: "enum",
			required: false,
			values: ["date", "amount", "category", "vendor"],
			description: "Sort expenses by field",
		},
	},
};
