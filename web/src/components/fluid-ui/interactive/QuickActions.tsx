/**
 * QuickActions - AI-suggested contextual action buttons
 *
 * Features:
 * - Display 2-4 action buttons in a grid
 * - Support for primary, secondary, and danger variants
 * - Icon support for visual clarity
 * - Keyboard navigation (Tab, Enter)
 * - Minimal, compact styling
 */

import { type LucideIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuickAction {
	id: string;
	label: string;
	action: string; // e.g., "create_task", "add_expense", "search_vendors"
	variant?: "primary" | "secondary" | "danger";
	icon?: LucideIcon;
	description?: string;
}

interface QuickActionsProps {
	actions: QuickAction[];
	onAction: (actionId: string, action: string) => void;
	title?: string;
}

export function QuickActions({
	actions,
	onAction,
	title = "Quick Actions",
}: QuickActionsProps) {
	// Limit to max 4 actions as per architecture
	const displayActions = actions.slice(0, 4);

	const getButtonVariant = (variant?: string) => {
		switch (variant) {
			case "primary":
				return "default";
			case "danger":
				return "destructive";
			case "secondary":
			default:
				return "outline";
		}
	};

	const getButtonClassName = (variant?: string) => {
		const baseClasses = "h-auto py-3 px-4 flex-col gap-2 text-center";

		switch (variant) {
			case "primary":
				return `${baseClasses} bg-purple-600 hover:bg-purple-700 text-white`;
			case "danger":
				return `${baseClasses} bg-red-600 hover:bg-red-700 text-white border-red-600`;
			case "secondary":
			default:
				return `${baseClasses} hover:bg-purple-50 hover:border-purple-300`;
		}
	};

	return (
		<Card className="border-purple-200 bg-purple-50/50">
			<CardContent className="pt-4 pb-4">
				<div className="space-y-3">
					{/* Title */}
					<div className="flex items-center gap-2 text-sm font-semibold text-purple-900">
						<Zap className="h-4 w-4" />
						{title}
					</div>

					{/* Action buttons grid */}
					<div
						className={`grid gap-2 ${
							displayActions.length === 2
								? "grid-cols-2"
								: displayActions.length === 3
									? "grid-cols-3"
									: "grid-cols-2"
						}`}
					>
						{displayActions.map((action) => {
							const Icon = action.icon || Zap;
							const variant = getButtonVariant(action.variant);

							return (
								<Button
									key={action.id}
									variant={variant}
									onClick={() => onAction(action.id, action.action)}
									className={getButtonClassName(action.variant)}
									title={action.description}
								>
									<Icon className="h-4 w-4" />
									<span className="text-xs font-medium leading-tight">
										{action.label}
									</span>
								</Button>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
