/**
 * Presence Indicator
 *
 * Displays a user avatar with a status badge in the corner.
 * The badge shows online/typing status with optional pulse animation.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUserInitials } from "./utils";

interface PresenceIndicatorProps {
	userName?: string;
	userAvatar?: string;
	status?: "active" | "idle" | "typing";
	className?: string;
	showPulse?: boolean;
	size?: "sm" | "md" | "lg";
}

export function PresenceIndicator({
	userName,
	userAvatar,
	status = "active",
	className,
	showPulse = false,
	size = "md",
}: PresenceIndicatorProps) {
	const statusColors = {
		active: "bg-green-500",
		idle: "bg-yellow-500",
		typing: "bg-blue-500",
	};

	const sizeClasses = {
		sm: "h-6 w-6",
		md: "h-8 w-8",
		lg: "h-10 w-10",
	};

	const badgeSizeClasses = {
		sm: "h-2 w-2",
		md: "h-2.5 w-2.5",
		lg: "h-3 w-3",
	};

	return (
		<div className={cn("relative inline-flex", className)}>
			<Avatar className={cn(sizeClasses[size])}>
				<AvatarImage src={userAvatar} alt={userName} />
				<AvatarFallback className="text-xs">
					{getUserInitials(userName)}
				</AvatarFallback>
			</Avatar>

			{/* Status Badge */}
			<span
				className={cn(
					"absolute bottom-0 right-0 rounded-full border-2 border-background",
					badgeSizeClasses[size],
					statusColors[status],
				)}
			>
				{showPulse && (
					<span
						className={cn(
							"absolute inset-0 rounded-full opacity-75 animate-ping",
							statusColors[status],
						)}
					/>
				)}
			</span>
		</div>
	);
}
