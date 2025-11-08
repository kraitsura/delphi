/**
 * Presence Dropdown
 *
 * Detailed dropdown showing all online users with their status.
 * Opens when clicking the avatar stack.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PresenceIndicator } from "./PresenceIndicator";
import { PresenceAvatarStack } from "./PresenceAvatarStack";

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

export function PresenceDropdown({ users, contextLabel }: PresenceDropdownProps) {
  if (users.length === 0) {
    return null;
  }

  const getStatusLabel = (status?: "active" | "idle" | "typing") => {
    switch (status) {
      case "typing":
        return "Typing...";
      case "idle":
        return "Idle";
      case "active":
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
          {users.map((user, index) => (
            <div key={user.userId}>
              <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.userAvatar} alt={user.userName} />
                    <AvatarFallback>
                      {user.userName?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceIndicator
                      status={user.data?.status || "active"}
                      showPulse={user.data?.status === "typing"}
                    />
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
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
