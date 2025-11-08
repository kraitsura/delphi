import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = {
	blue: "border-l-blue-500",
	green: "border-l-green-500",
	purple: "border-l-purple-500",
	amber: "border-l-amber-500",
	red: "border-l-red-500",
};

interface StatCardProps {
	value: string | number;
	label: string;
	sublabel?: string;
	icon?: LucideIcon;
	variant?: "default" | "highlighted" | "clickable";
	onClick?: () => void;
	accentColor?: keyof typeof ACCENT_COLORS;
	className?: string;
}

export function StatCard({
	value,
	label,
	sublabel,
	icon: Icon,
	variant = "default",
	onClick,
	accentColor,
	className,
}: StatCardProps) {
	const isClickable = variant === "clickable" || !!onClick;
	const isHighlighted = variant === "highlighted";

	const cardClassName = cn(
		isClickable && "hover:shadow-lg transition-shadow cursor-pointer group",
		isHighlighted && accentColor && `border-l-4 ${ACCENT_COLORS[accentColor]}`,
		className,
	);

	const content = (
		<CardContent className="pt-6">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div
						className={cn(
							"text-3xl font-bold mb-1",
							isClickable && "group-hover:text-primary transition-colors",
						)}
					>
						{value}
					</div>
					<div className="text-sm text-muted-foreground">{label}</div>
					{sublabel && (
						<div className="mt-2 text-xs text-muted-foreground">{sublabel}</div>
					)}
				</div>
				{Icon && (
					<Icon
						className={cn(
							"h-6 w-6 text-muted-foreground",
							isClickable && "group-hover:scale-110 transition-transform",
						)}
					/>
				)}
			</div>
		</CardContent>
	);

	if (isClickable && onClick) {
		return (
			<button type="button" onClick={onClick} className="text-left w-full">
				<Card className={cardClassName}>{content}</Card>
			</button>
		);
	}

	return <Card className={cardClassName}>{content}</Card>;
}
