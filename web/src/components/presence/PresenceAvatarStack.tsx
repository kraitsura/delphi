/**
 * Presence Avatar Stack
 *
 * Displays a stack of overlapping user avatars with online indicators.
 * Shows up to 5 avatars with a "+X more" badge for additional users.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PresenceIndicator } from "./PresenceIndicator";

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

  return (
    <div
      className="flex items-center cursor-pointer"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex -space-x-2">
        <TooltipProvider>
          {visibleUsers.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={user.userAvatar} alt={user.userName} />
                    <AvatarFallback className="text-xs">
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                <p className="font-medium">{user.userName || "Unknown User"}</p>
                {user.data?.status === "typing" && (
                  <p className="text-xs text-muted-foreground">typing...</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
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
    </div>
  );
}
