import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { RoomListItem } from "@/components/RoomListItem";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEvent } from "@/contexts/EventContext";
import { useEventRooms } from "@/hooks/useEventRooms";

/**
 * RoomList Component
 *
 * Displays a scrollable list of rooms for the current event.
 * Shows:
 * - Loading skeletons while fetching
 * - Empty state when no rooms exist
 * - List of RoomListItem components
 */
export function RoomList() {
	const { eventId } = useEvent();
	const rooms = useEventRooms();

	// Don't render if no eventId (shouldn't happen in event context routes)
	if (!eventId) {
		return null;
	}

	// Loading state
	if (rooms === undefined) {
		return (
			<SidebarGroup className="group-data-[collapsible=icon]:p-0">
				<SidebarGroupLabel>
					<Link
						to="/events/$eventId/rooms"
						params={{ eventId }}
						className="hover:text-foreground transition-colors"
					>
						Rooms
					</Link>
				</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						<div className="space-y-2 px-2">
							{[...Array(3)].map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
								<div key={i} className="flex items-start gap-3">
									<Skeleton className="h-10 w-10 rounded-full shrink-0" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-full" />
									</div>
								</div>
							))}
						</div>
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		);
	}

	// Empty state
	if (rooms.length === 0) {
		return (
			<SidebarGroup className="group-data-[collapsible=icon]:p-0">
				<SidebarGroupLabel>
					<Link
						to="/events/$eventId/rooms"
						params={{ eventId }}
						className="hover:text-foreground transition-colors"
					>
						Rooms
					</Link>
				</SidebarGroupLabel>
				<SidebarGroupContent>
					<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
						<MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
						<p className="text-sm font-medium text-muted-foreground">
							No rooms yet
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Create a room to start chatting
						</p>
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		);
	}

	// Render room list
	return (
		<TooltipProvider delayDuration={0}>
			<SidebarGroup className="group-data-[collapsible=icon]:p-0">
				<SidebarGroupLabel>
					<Link
						to="/events/$eventId/rooms"
						params={{ eventId }}
						className="hover:text-foreground transition-colors"
					>
						Rooms
					</Link>
				</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{rooms.map((room) => (
							<RoomListItem key={room._id} room={room} eventId={eventId} />
						))}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</TooltipProvider>
	);
}
