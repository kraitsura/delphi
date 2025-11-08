/**
 * Presence Indicator
 *
 * A simple visual indicator showing online/typing status.
 * Displays as a colored dot with optional pulse animation.
 */

import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  status?: "active" | "idle" | "typing";
  className?: string;
  showPulse?: boolean;
}

export function PresenceIndicator({
  status = "active",
  className,
  showPulse = false,
}: PresenceIndicatorProps) {
  const statusColors = {
    active: "bg-green-500",
    idle: "bg-yellow-500",
    typing: "bg-blue-500",
  };

  return (
    <span className={cn("relative inline-flex h-2 w-2 rounded-full", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          statusColors[status],
          showPulse && "animate-ping"
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          statusColors[status]
        )}
      />
    </span>
  );
}
