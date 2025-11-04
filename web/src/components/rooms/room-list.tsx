import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Hash, Lock, Megaphone, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Id } from "../../../convex/_generated/dataModel";

interface RoomListProps {
  eventId: Id<"events">;
}

type RoomType = "main" | "vendor" | "topic" | "guest_announcements" | "private";

export function RoomList({ eventId }: RoomListProps) {
  const rooms = useQuery(api.rooms.listByEvent, { eventId });

  const getRoomIcon = (type: RoomType) => {
    switch (type) {
      case "main":
        return <Hash className="h-5 w-5 text-blue-500" />;
      case "private":
        return <Lock className="h-5 w-5 text-purple-500" />;
      case "guest_announcements":
        return <Megaphone className="h-5 w-5 text-green-500" />;
      case "vendor":
        return <Briefcase className="h-5 w-5 text-orange-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };

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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 rounded-lg h-20"
          />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 mb-2">No rooms yet</p>
        <p className="text-sm text-gray-400">
          Rooms will appear here once created
        </p>
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
    {} as Record<RoomType, typeof rooms>
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              {getRoomIcon(type)}
              {getRoomTypeLabel(type)}
            </h3>
            <div className="space-y-2">
              {typeRooms.map((room) => (
                <Link
                  key={room._id}
                  to="/events/$eventId/rooms/$roomId"
                  params={{ eventId, roomId: room._id }}
                  className="block group"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getRoomIcon(room.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {room.name}
                            </h4>
                            {room.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {room.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {room.membership && (
                          <div className="flex items-center gap-1 ml-3">
                            {room.membership.canManage && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                Manager
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
