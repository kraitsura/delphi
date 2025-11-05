import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useEvent } from "@/contexts/EventContext";
import { useEventRooms } from "@/hooks/useEventRooms";
import { RoomListItem } from "@/components/RoomListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";

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
  const { eventId, event } = useEvent();
  const rooms = useEventRooms();

  // Loading state
  if (rooms === undefined) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Rooms</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="space-y-2 px-2">
              {[...Array(3)].map((_, i) => (
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
      <SidebarGroup>
        <SidebarGroupLabel>Rooms</SidebarGroupLabel>
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
    <SidebarGroup>
      <SidebarGroupLabel>Rooms</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {rooms.map((room) => (
            <RoomListItem
              key={room._id}
              room={room}
              eventId={eventId!}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
