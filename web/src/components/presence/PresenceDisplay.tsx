/**
 * Presence Display
 *
 * Main presence component that automatically tracks and displays
 * online users based on current context (room/event/global).
 *
 * This component combines the avatar stack with a detailed dropdown
 * and automatically manages presence tracking via the usePresence hook.
 */

import { usePresence } from "@/hooks/usePresence";
import { PresenceDropdown } from "./PresenceDropdown";
import { Users } from "lucide-react";

export function PresenceDisplay() {
  const { presentUsers, context } = usePresence();

  // Don't render anything if no users are present
  if (presentUsers.length === 0) {
    return null;
  }

  // Generate context label for the dropdown
  const getContextLabel = () => {
    if (context.type === "room") {
      return "In this room";
    } else if (context.type === "event") {
      return "In this event";
    } else {
      return "Online";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="hidden md:inline">
          {presentUsers.length}
        </span>
      </div>
      <PresenceDropdown users={presentUsers} contextLabel={getContextLabel()} />
    </div>
  );
}
