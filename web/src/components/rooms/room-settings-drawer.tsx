import type { Doc } from "@convex/_generated/dataModel";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { RoomSettings } from "./room-settings";

interface RoomSettingsDrawerProps {
	room: Doc<"rooms"> & {
		membership?: {
			canManage: boolean;
			canPost: boolean;
			canEdit: boolean;
			canDelete: boolean;
		};
	};
	trigger: React.ReactNode;
	onUpdate?: () => void;
}

export function RoomSettingsDrawer({
	room,
	trigger,
	onUpdate,
}: RoomSettingsDrawerProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Room Settings</SheetTitle>
					<SheetDescription>
						Manage room configuration, permissions, and settings
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<RoomSettings room={room} onUpdate={onUpdate} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
