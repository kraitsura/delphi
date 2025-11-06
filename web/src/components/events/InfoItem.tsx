import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoItemProps {
	icon: LucideIcon;
	label: string;
	value: React.ReactNode;
	variant?: "default" | "compact";
	className?: string;
}

export function InfoItem({
	icon: Icon,
	label,
	value,
	variant = "default",
	className,
}: InfoItemProps) {
	const isCompact = variant === "compact";

	return (
		<div className={cn("flex items-start gap-3", className)}>
			<Icon
				className={cn(
					"text-muted-foreground flex-shrink-0",
					isCompact ? "h-4 w-4 mt-0.5" : "h-5 w-5 mt-1",
				)}
			/>
			<div className="flex-1">
				<div
					className={cn(
						"text-muted-foreground",
						isCompact ? "text-xs" : "text-sm",
					)}
				>
					{label}
				</div>
				<div
					className={cn(
						"font-medium text-foreground",
						isCompact ? "text-sm" : "text-base",
					)}
				>
					{value}
				</div>
			</div>
		</div>
	);
}
