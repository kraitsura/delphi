import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BudgetProgress } from "../BudgetProgress";

interface BudgetCardProps {
	budget: {
		total: number;
		spent: number;
		committed: number;
	};
}

export function BudgetCard({ budget }: BudgetCardProps) {
	const remaining = budget.total - budget.spent;
	const isOverBudget = remaining < 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Budget</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-3">
					<DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
					<div className="flex-1">
						<div className="text-sm text-muted-foreground mb-2">
							Budget Overview
						</div>
						<BudgetProgress spent={budget.spent} total={budget.total} />
					</div>
				</div>

				<div className="space-y-2 pt-2">
					<div className="flex justify-between">
						<span className="text-sm text-muted-foreground">Total Budget</span>
						<span className="font-semibold">
							${budget.total.toLocaleString()}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-sm text-muted-foreground">Committed</span>
						<span className="text-sm">
							${budget.committed.toLocaleString()}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-sm text-muted-foreground">Remaining</span>
						<span
							className={cn(
								"text-sm font-medium",
								isOverBudget
									? "text-red-600 dark:text-red-400"
									: "text-green-600 dark:text-green-400",
							)}
						>
							${Math.abs(remaining).toLocaleString()}
							{isOverBudget && " over budget"}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
