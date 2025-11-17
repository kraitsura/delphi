import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";

interface RoomListProps {
	eventId: Id<"events">;
}

type RoomType = "main" | "vendor" | "topic" | "guest_announcements" | "private";

export function RoomList({ eventId }: RoomListProps) {
	const rooms = useQuery(api.rooms.listByEvent, { eventId });

	const getRoomTypeLabel = (type: RoomType) => {
		switch (type) {
			case "main":
				return "Main Planning";
			case "private":
				return "Private";
			case "guest_announcements":
				return "Guest Announcements";
			case "vendor":
				return "Vendor";
			case "topic":
				return "Topic";
			default:
				return "Other";
		}
	};

	if (rooms === undefined) {
		return (
			<div className="space-y-2">
				{[1, 2, 3].map((i) => (
					<div key={i} className="animate-pulse bg-gray-50 h-12" />
				))}
			</div>
		);
	}

	if (rooms.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-400 text-sm">No rooms yet</p>
			</div>
		);
	}

	// Group rooms by type
	const groupedRooms = rooms.reduce(
		(acc, room) => {
			if (!acc[room.type]) {
				acc[room.type] = [];
			}
			acc[room.type].push(room);
			return acc;
		},
		{} as Record<RoomType, typeof rooms>,
	);

	// Define order for room types
	const typeOrder: RoomType[] = [
		"main",
		"topic",
		"vendor",
		"guest_announcements",
		"private",
	];

	return (
		<div className="space-y-6">
			{typeOrder.map((type) => {
				const typeRooms = groupedRooms[type];
				if (!typeRooms || typeRooms.length === 0) return null;

				return (
					<div key={type}>
						<h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
							{getRoomTypeLabel(type)}
						</h3>
						<div className="space-y-1">
							{typeRooms.map((room) => (
								<Link
									key={room._id}
									to="/events/$eventId/rooms/$roomId"
									params={{ eventId, roomId: room._id }}
									className="block group"
								>
									<div className="py-2 px-3 rounded hover:bg-gray-50 transition-colors cursor-pointer">
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<h4 className="font-medium text-gray-900 truncate">
													{room.name}
												</h4>
												{room.description && (
													<p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
														{room.description}
													</p>
												)}
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
