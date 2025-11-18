import { Link } from "@tanstack/react-router";
import { MessageCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { RoomListItem } from "@/components/sidebar-room-list-item";
import { Input } from "@/components/ui/input";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvent } from "@/contexts/EventContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useEventRooms } from "@/hooks/useEventRooms";

/**
 * RoomList Component
 *
 * Displays a scrollable list of rooms for the current event.
 * Shows:
 * - Search bar to filter rooms by name and type
 * - Loading skeletons while fetching
 * - Empty state when no rooms exist
 * - List of RoomListItem components
 */
export function RoomList() {
	const { eventId } = useEvent();
	const rooms = useEventRooms();
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearchTerm = useDebounce(searchTerm, 300);

	// Filter rooms based on search term (name and type)
	const filteredRooms = useMemo(() => {
		if (!rooms || !debouncedSearchTerm.trim()) {
			return rooms;
		}

		const search = debouncedSearchTerm.toLowerCase();
		return rooms.filter(
			(room) =>
				room.name.toLowerCase().includes(search) ||
				room.type.toLowerCase().includes(search),
		);
	}, [rooms, debouncedSearchTerm]);

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
		<SidebarGroup className="group-data-[collapsible=icon]:p-0 -mt-2 group-data-[collapsible=icon]:mt-0">
			<SidebarGroupLabel className="transition-[margin,opacity,transform] duration-300 ease-in-out">
				<Link
					to="/events/$eventId/rooms"
					params={{ eventId }}
					className="hover:text-foreground transition-colors"
				>
					Rooms
				</Link>
			</SidebarGroupLabel>

			{/* Search Bar - Compact Pill Style */}
			<div className="px-2 pb-2 transition-[max-height,opacity,margin] duration-300 ease-in-out overflow-hidden group-data-[collapsible=icon]:max-h-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:mb-0 max-h-20">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Search rooms..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="rounded-full pl-9 pr-3 h-8 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>
			</div>

			<SidebarGroupContent>
				<SidebarMenu>
					{filteredRooms && filteredRooms.length > 0 ? (
						filteredRooms.map((room) => (
							<RoomListItem key={room._id} room={room} eventId={eventId} />
						))
					) : (
						<div className="flex flex-col items-center justify-center py-6 px-4 text-center">
							<Search className="h-10 w-10 text-muted-foreground/50 mb-2" />
							<p className="text-sm font-medium text-muted-foreground">
								No rooms found
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Try a different search term
							</p>
						</div>
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
