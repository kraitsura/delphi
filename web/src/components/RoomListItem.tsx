import { Link, useParams } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { RoomWithPreview } from "@/hooks/useEventRooms";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
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

  const hasUnread = room.unreadCount > 0;
  const timestamp = room.lastMessageAt || room.createdAt;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-auto py-2 px-2"
      >
        <Link to={`/events/${eventId}/rooms/${room._id}`} className="block">
          <div className="flex items-start gap-3 w-full min-w-0">
            {/* Avatar */}
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getRoomInitials(room.name)}
              </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
              {/* Room name and timestamp */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    hasUnread && "font-semibold"
                  )}
                >
                  {room.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(timestamp)}
                </span>
              </div>

              {/* Latest message preview */}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs text-muted-foreground truncate",
                    hasUnread && "font-medium text-foreground/80"
                  )}
                >
                  {room.latestMessage ? (
                    room.latestMessage.text
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      No messages yet
                    </span>
                  )}
                </p>

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
    </SidebarMenuItem>
  );
}
