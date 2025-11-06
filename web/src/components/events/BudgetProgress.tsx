import { cn } from "@/lib/utils";

interface BudgetProgressProps {
	spent: number;
	total: number;
	size?: "sm" | "md" | "lg";
	showLabel?: boolean;
	className?: string;
}

const SIZE_CLASSES = {
	sm: "h-1",
	md: "h-2",
	lg: "h-3",
};

export function BudgetProgress({
	spent,
	total,
	size = "md",
	showLabel = true,
	className,
}: BudgetProgressProps) {
	const percentage = Math.min((spent / total) * 100, 100);
	const isOverBudget = spent > total;

	return (
		<div className={cn("space-y-2", className)}>
			{showLabel && (
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Spent</span>
					<span className="font-medium text-foreground">
						${spent.toLocaleString()}
					</span>
				</div>
			)}
			<div className={cn("w-full bg-muted rounded-full", SIZE_CLASSES[size])}>
				<div
					className={cn(
						"rounded-full transition-all",
						SIZE_CLASSES[size],
						isOverBudget
							? "bg-red-600 dark:bg-red-500"
							: "bg-blue-600 dark:bg-blue-500",
					)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}
