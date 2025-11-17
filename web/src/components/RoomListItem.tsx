import { api } from "@convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoomWithPreview } from "@/hooks/useEventRooms";
import { cn } from "@/lib/utils";

interface RoomListItemProps {
	room: RoomWithPreview;
	eventId: string;
}

/**
 * Get initials from room name for avatar
 */
function getRoomInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length >= 2) {
		return `${words[0][0]}${words[1][0]}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

/**
 * Format timestamp for display (e.g., "2m ago", "5h ago", "2d ago")
 */
function formatTimestamp(timestamp: number): string {
	return formatDistanceToNow(timestamp, { addSuffix: false })
		.replace("less than a minute", "<1m")
		.replace(" minutes", "m")
		.replace(" minute", "m")
		.replace(" hours", "h")
		.replace(" hour", "h")
		.replace(" days", "d")
		.replace(" day", "d")
		.replace(" weeks", "w")
		.replace(" week", "w")
		.replace("about ", "");
}

/**
 * RoomListItem Component
 *
 * WhatsApp-style room list item for sidebar.
 * Shows:
 * - Circle avatar with room initials
 * - Room name and timestamp
 * - Latest message preview
 * - Unread count badge
 * - Active state highlighting
 */
export function RoomListItem({ room, eventId }: RoomListItemProps) {
	const params = useParams({ strict: false });
	const currentRoomId = "roomId" in params ? params.roomId : null;
	const isActive = currentRoomId === room._id;
	const isMainRoom = room.type === "main";

	// Get current user to check if message is from them
	const currentUser = useQuery(api.users.getMyProfile);

	const hasUnread = room.unreadCount > 0;
	const timestamp = room.lastMessageAt || room.createdAt;

	// Check if latest message is from current user
	const isOwnMessage =
		room.latestMessageAuthorId && currentUser
			? room.latestMessageAuthorId === currentUser._id
			: false;

	// Hover auto-scroll state
	const [isHovering, setIsHovering] = useState(false);
	const [shouldScroll, setShouldScroll] = useState(false);
	const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Handle hover delay for auto-scroll (2 seconds)
	useEffect(() => {
		if (isHovering) {
			hoverTimerRef.current = setTimeout(() => {
				setShouldScroll(true);
			}, 2000);
		} else {
			// Clear timer and reset scroll state when hover ends
			if (hoverTimerRef.current) {
				clearTimeout(hoverTimerRef.current);
				hoverTimerRef.current = null;
			}
			setShouldScroll(false);
		}

		return () => {
			if (hoverTimerRef.current) {
				clearTimeout(hoverTimerRef.current);
			}
		};
	}, [isHovering]);

	// Format message with sender's name prefix
	const messagePreview = room.latestMessageText
		? isOwnMessage
			? `You: ${room.latestMessageText}`
			: room.latestMessageIsAI
				? `Delphi: ${room.latestMessageText}`
				: room.latestMessageAuthorFirstName
					? `${room.latestMessageAuthorFirstName}: ${room.latestMessageText}`
					: room.latestMessageText
		: null;

	return (
		<SidebarMenuItem>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarMenuButton
							asChild
							isActive={isActive}
							className={cn(
								"h-auto py-2 px-2 group-data-[collapsible=icon]:!size-12 group-data-[collapsible=icon]:!p-1 group-data-[collapsible=icon]:justify-center",
								// Main room styling
								isMainRoom && "border-l-2 border-l-primary",
								isMainRoom && !isActive && "bg-primary/5",
							)}
						>
							<Link
								to="/events/$eventId/rooms/$roomId"
								params={{ eventId, roomId: room._id }}
								className="block"
							>
								<div className="flex items-start gap-3 w-full min-w-0 group-data-[collapsible=icon]:gap-0">
									{/* Avatar */}
									<Avatar className="h-10 w-10 shrink-0">
										<AvatarFallback className="bg-primary/10 text-primary">
											{getRoomInitials(room.name)}
										</AvatarFallback>
									</Avatar>

									{/* Content */}
									<div className="flex-1 min-w-0 space-y-0.5 group-data-[collapsible=icon]:hidden">
										{/* Room name and timestamp */}
										<div className="flex items-center justify-between gap-2">
											<span
												className={cn(
													"text-sm font-medium truncate",
													hasUnread && "font-semibold",
												)}
											>
												{room.name}
											</span>
											<span className="text-xs text-muted-foreground shrink-0">
												{formatTimestamp(timestamp)}
											</span>
										</div>

										{/* Latest message preview */}
										{/* biome-ignore lint/a11y/noStaticElementInteractions: Hover effects for UI feedback only */}
										<div
											className="flex items-center justify-between gap-2"
											onMouseEnter={() => setIsHovering(true)}
											onMouseLeave={() => setIsHovering(false)}
										>
											<div
												className={cn(
													"text-xs text-muted-foreground min-w-0 flex-1",
													hasUnread && "font-medium text-foreground/80",
													shouldScroll && "overflow-hidden",
												)}
											>
												{messagePreview ? (
													shouldScroll ? (
														<span className="inline-flex whitespace-nowrap animate-marquee">
															<span className="pr-8">{messagePreview}</span>
															<span className="pr-8">{messagePreview}</span>
														</span>
													) : (
														<p className="truncate">{messagePreview}</p>
													)
												) : (
													<p className="truncate">No messages yet</p>
												)}
											</div>

											{/* Unread badge */}
											{hasUnread && (
												<Badge
													variant="default"
													className="h-5 min-w-5 px-1.5 text-xs shrink-0"
												>
													{room.unreadCount > 99 ? "99+" : room.unreadCount}
												</Badge>
											)}
										</div>
									</div>
								</div>
							</Link>
						</SidebarMenuButton>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>{room.name}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</SidebarMenuItem>
	);
}
