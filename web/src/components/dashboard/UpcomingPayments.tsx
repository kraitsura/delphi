import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface UpcomingPaymentsProps {
	eventId: Id<"events">;
	daysAhead?: number;
	showOnlyOverdue?: boolean;
	groupBy?: "date" | "vendor";
}

export function UpcomingPayments(props: UpcomingPaymentsProps) {
	const { daysAhead = 30, showOnlyOverdue = false, groupBy = "date" } = props;

	const expenses = useQuery(api.expenses.listByEvent, {
		eventId: props.eventId,
	});

	const upcoming = useMemo(() => {
		if (!expenses) return [];

		const now = Date.now();
		const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;

		return expenses
			.filter((e) => {
				// Must be pending
				if (e.status !== "pending") return false;

				// Must have due date
				if (!e.dueDate) return false;

				// Check if overdue or upcoming
				if (showOnlyOverdue) {
					return e.dueDate < now;
				} else {
					return e.dueDate <= cutoff;
				}
			})
			.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
	}, [expenses, daysAhead, showOnlyOverdue]);

	const grouped = useMemo(() => {
		const now = Date.now();

		const groups = {
			overdue: [] as typeof upcoming,
			thisWeek: [] as typeof upcoming,
			nextWeek: [] as typeof upcoming,
			later: [] as typeof upcoming,
		};

		upcoming.forEach((payment) => {
			if (!payment.dueDate) return;

			const diffMs = payment.dueDate - now;
			const diffDays = diffMs / (1000 * 60 * 60 * 24);

			if (diffDays < 0) {
				groups.overdue.push(payment);
			} else if (diffDays <= 7) {
				groups.thisWeek.push(payment);
			} else if (diffDays <= 14) {
				groups.nextWeek.push(payment);
			} else {
				groups.later.push(payment);
			}
		});

		return groups;
	}, [upcoming]);

	if (expenses === undefined) {
		return <UpcomingPaymentsSkeleton />;
	}

	if (!expenses || upcoming.length === 0) {
		return <UpcomingPaymentsEmpty />;
	}

	const formatDueDate = (timestamp: number) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			return {
				text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`,
				isOverdue: true,
			};
		} else if (diffDays === 0) {
			return { text: "Due today", isOverdue: false };
		} else if (diffDays === 1) {
			return { text: "Due tomorrow", isOverdue: false };
		} else if (diffDays < 7) {
			return { text: `in ${diffDays} days`, isOverdue: false };
		} else {
			return {
				text: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				isOverdue: false,
			};
		}
	};

	const renderPaymentGroup = (
		title: string,
		payments: typeof upcoming,
		icon: string,
	) => {
		if (payments.length === 0) return null;

		return (
			<div className="space-y-2">
				<h4 className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
					<span>{icon}</span>
					<span>{title}</span>
					<span className="text-xs">({payments.length})</span>
				</h4>
				<div className="space-y-2">
					{payments.map((payment) => {
						const dueInfo = formatDueDate(payment.dueDate!);

						return (
							<div
								key={payment._id}
								className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<h5 className="font-normal text-sm truncate">
											{payment.description}
										</h5>
										{payment.category && (
											<p className="text-xs text-muted-foreground mt-0.5">
												{payment.category}
											</p>
										)}
									</div>

									<div className="text-right shrink-0">
										<div className="font-normal text-base">
											${payment.amount.toLocaleString()}
										</div>
										<div
											className={`text-xs ${
												dueInfo.isOverdue
													? "text-red-600 font-semibold"
													: "text-muted-foreground"
											}`}
										>
											{dueInfo.text}
										</div>
									</div>
								</div>

								<div className="mt-2">
									<Button variant="outline" size="sm">
										Mark Paid
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	const totalUpcoming = upcoming.reduce((sum, p) => sum + p.amount, 0);

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.ARROW_RIGHT} Upcoming Payments
				</CardTitle>
				<div className="text-sm text-muted-foreground">
					Next {daysAhead} days
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="mb-6 p-4 rounded-md bg-accent/30">
					<div className="text-xs text-muted-foreground uppercase tracking-wide">
						Total Due
					</div>
					<div className="text-2xl font-light mt-1">
						${totalUpcoming.toLocaleString()}
					</div>
				</div>

				<div className="space-y-6">
					{renderPaymentGroup("Overdue", grouped.overdue, SYMBOLS.THUNDERBOLT)}
					{renderPaymentGroup(
						"This Week",
						grouped.thisWeek,
						SYMBOLS.BLACK_CIRCLE,
					)}
					{renderPaymentGroup(
						"Next Week",
						grouped.nextWeek,
						SYMBOLS.BLACK_CIRCLE,
					)}
					{renderPaymentGroup("Later", grouped.later, SYMBOLS.BLACK_CIRCLE)}
				</div>
			</CardContent>
		</Card>
	);
}

function UpcomingPaymentsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-16 w-full" />
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-20 w-full" />
				))}
			</CardContent>
		</Card>
	);
}

function UpcomingPaymentsEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.ARROW_RIGHT} Upcoming Payments
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No upcoming payments</p>
			</CardContent>
		</Card>
	);
}

export const UpcomingPaymentsMetadata = {
	name: "UpcomingPayments",
	description: "Timeline of payment due dates",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "300px",
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
		daysAhead: {
			type: "number",
			required: false,
			description: "Number of days to look ahead",
		},
		showOnlyOverdue: {
			type: "boolean",
			required: false,
			description: "Show only overdue payments",
		},
	},
};
