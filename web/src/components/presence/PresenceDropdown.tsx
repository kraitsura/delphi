/**
 * Presence Dropdown
 *
 * Detailed dropdown showing all online users with their status.
 * Opens when clicking the avatar stack.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PresenceAvatarStack } from "./PresenceAvatarStack";
import { getUserInitials } from "./utils";

interface PresenceUser {
	userId: string;
	userName?: string;
	userAvatar?: string;
	data?: {
		status?: "active" | "idle" | "typing";
	};
}

interface PresenceDropdownProps {
	users: PresenceUser[];
	contextLabel?: string;
}

export function PresenceDropdown({
	users,
	contextLabel,
}: PresenceDropdownProps) {
	if (users.length === 0) {
		return null;
	}

	const getStatusLabel = (status?: "active" | "idle" | "typing") => {
		switch (status) {
			case "typing":
				return "Typing...";
			case "idle":
				return "Idle";
			default:
				return "Active";
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div>
					<PresenceAvatarStack users={users} />
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end" side="bottom">
				<div className="p-4 pb-3">
					<div className="flex items-center justify-between mb-1">
						<h4 className="text-sm font-semibold">Online Now</h4>
						<Badge variant="secondary" className="text-xs">
							{users.length}
						</Badge>
					</div>
					{contextLabel && (
						<p className="text-xs text-muted-foreground">{contextLabel}</p>
					)}
				</div>
				<Separator />
				<div className="max-h-80 overflow-y-auto">
					{users.map((user, index) => {
						const status = user.data?.status || "active";
						const statusColors = {
							active: "bg-green-500",
							idle: "bg-yellow-500",
							typing: "bg-blue-500",
						};
						const showPulse = status === "typing";

						return (
							<div key={user.userId}>
								<div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
									<div className="relative">
										<Avatar className="h-10 w-10">
											<AvatarImage src={user.userAvatar} alt={user.userName} />
											<AvatarFallback>
												{getUserInitials(user.userName)}
											</AvatarFallback>
										</Avatar>
										{/* Status Badge */}
										<span
											className={cn(
												"absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
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
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{user.userName || "Unknown User"}
										</p>
										<p className="text-xs text-muted-foreground">
											{getStatusLabel(user.data?.status)}
										</p>
									</div>
								</div>
								{index < users.length - 1 && <Separator />}
							</div>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
