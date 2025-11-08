import { useNavigate } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { Calendar, Home, Moon, Plus, Sun } from "lucide-react";
import { useState } from "react";
import { RoomCreateDialog } from "@/components/rooms/room-create-dialog";
import { useThemeSet } from "@/components/theme-set-provider";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileSettingsDialog } from "@/components/user/profile-settings-dialog";
import { useEvent } from "@/contexts/EventContext";

/**
 * EventSidebarToolbar Component
 *
 * Horizontal toolbar with icon buttons for navigation when in event context.
 * Displays: Dashboard, Events, Profile, Dark/Light Mode Toggle, Create Room
 *
 * Clicking Dashboard or Events exits the event context and navigates away.
 */
export function EventSidebarToolbar() {
	const navigate = useNavigate();
	const { exitEventContext, eventId } = useEvent();
	const { mode, setMode } = useThemeSet();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	const handleNavigateToDashboard = () => {
		exitEventContext();
		navigate({ to: "/dashboard" });
	};

	const handleNavigateToEvents = () => {
		exitEventContext();
		navigate({ to: "/events" });
	};

	const handleToggleMode = () => {
		setMode(mode === "light" ? "dark" : "light");
	};

	// Don't render if no eventId (shouldn't happen in event context routes)
	if (!eventId) {
		return null;
	}

	return (
		<div className="flex items-center justify-between gap-1 px-2 pt-0.5 pb-2">
			<TooltipProvider delayDuration={0}>
				<div className="flex items-center gap-1">
					{/* Dashboard, Events, Profile - hidden when collapsed */}
					<div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
						{/* Dashboard */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={handleNavigateToDashboard}
								>
									<Home className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>Dashboard</p>
							</TooltipContent>
						</Tooltip>

						{/* Events */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={handleNavigateToEvents}
								>
									<Calendar className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>Events</p>
							</TooltipContent>
						</Tooltip>

						{/* Profile & Settings */}
						<ProfileSettingsDialog />
					</div>

					{/* Dark/Light Mode Toggle - always visible */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleToggleMode}
							>
								{mode === "light" ? (
									<Moon className="h-4 w-4" />
								) : (
									<Sun className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{mode === "light" ? "Dark Mode" : "Light Mode"}</p>
						</TooltipContent>
					</Tooltip>
				</div>

				{/* Create Room - hidden when collapsed */}
				<div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
					{/* Create Room */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => setCreateDialogOpen(true)}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>Create Room</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>

			{/* Room Create Dialog */}
			<RoomCreateDialog
				eventId={eventId as Id<"events">}
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={(roomId) => {
					navigate({
						to: "/events/$eventId/rooms/$roomId",
						params: { eventId, roomId },
					});
				}}
			/>
		</div>
	);
}
