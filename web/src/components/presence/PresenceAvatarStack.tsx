/**
 * Presence Avatar Stack
 *
 * Displays a stack of overlapping user avatars with online indicators.
 * Shows up to 5 avatars with a "+X more" badge for additional users.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getUserInitials } from "./utils";

interface PresenceUser {
	userId: string;
	userName?: string;
	userAvatar?: string;
	data?: {
		status?: "active" | "idle" | "typing";
	};
}

interface PresenceAvatarStackProps {
	users: PresenceUser[];
	maxVisible?: number;
	onClick?: () => void;
}

export function PresenceAvatarStack({
	users,
	maxVisible = 5,
	onClick,
}: PresenceAvatarStackProps) {
	if (users.length === 0) {
		return null;
	}

	const visibleUsers = users.slice(0, maxVisible);
	const remainingCount = users.length - maxVisible;

	const Wrapper = onClick ? "button" : "div";

	return (
		<Wrapper
			type={onClick ? "button" : undefined}
			className={cn(
				"flex items-center",
				onClick && "cursor-pointer border-0 bg-transparent p-0",
			)}
			onClick={onClick}
		>
			<div className="flex -space-x-2">
				<TooltipProvider>
					{visibleUsers.map((user) => {
						const status = user.data?.status || "active";
						const statusColors = {
							active: "bg-green-500",
							idle: "bg-yellow-500",
							typing: "bg-blue-500",
						};
						const showPulse = status === "typing";

						return (
							<Tooltip key={user.userId}>
								<TooltipTrigger asChild>
									<div className="relative">
										<Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border hover:ring-2 hover:ring-primary transition-all">
											<AvatarImage src={user.userAvatar} alt={user.userName} />
											<AvatarFallback className="text-xs">
												{getUserInitials(user.userName)}
											</AvatarFallback>
										</Avatar>
										{/* Status Badge */}
										<span
											className={cn(
												"absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
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
								</TooltipTrigger>
								<TooltipContent side="bottom" className="text-sm">
									<p className="font-medium">
										{user.userName || "Unknown User"}
									</p>
									{user.data?.status === "typing" && (
										<p className="text-xs text-muted-foreground">typing...</p>
									)}
								</TooltipContent>
							</Tooltip>
						);
					})}
					{remainingCount > 0 && (
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium ring-1 ring-border hover:ring-2 hover:ring-primary transition-all">
									+{remainingCount}
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p className="text-sm">{remainingCount} more online</p>
							</TooltipContent>
						</Tooltip>
					)}
				</TooltipProvider>
			</div>
		</Wrapper>
	);
}
