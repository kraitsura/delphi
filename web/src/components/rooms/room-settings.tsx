import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Archive, Save, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AddRoomMembersDialog } from "./add-room-members-dialog";
import { RoomDeleteDialog } from "./room-delete-dialog";
import { RoomParticipantsList } from "./room-participants-list";

interface RoomSettingsProps {
	room: Doc<"rooms"> & {
		membership?: {
			canManage: boolean;
			canPost: boolean;
			canEdit: boolean;
			canDelete: boolean;
		};
	};
	onUpdate?: () => void;
}

export function RoomSettings({ room, onUpdate }: RoomSettingsProps) {
	const [name, setName] = useState(room.name);
	const [description, setDescription] = useState(room.description || "");
	const [allowGuestMessages, setAllowGuestMessages] = useState(
		room.allowGuestMessages,
	);
	const [isSaving, setIsSaving] = useState(false);

	const updateRoom = useMutation(api.rooms.update);
	const archiveRoom = useMutation(api.rooms.archive);

	const canManage = room.membership?.canManage ?? false;

	const handleSave = async () => {
		if (!canManage) {
			toast.error("You don't have permission to update this room");
			return;
		}

		if (!name.trim()) {
			toast.error("Room name is required");
			return;
		}

		setIsSaving(true);
		try {
			await updateRoom({
				roomId: room._id,
				name: name.trim(),
				description: description.trim() || undefined,
				allowGuestMessages,
			});

			onUpdate?.();
			toast.success("Room settings updated successfully");
		} catch (error) {
			console.error("Failed to update room:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to update room",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleArchive = async () => {
		if (!canManage) {
			toast.error("You don't have permission to archive this room");
			return;
		}

		if (
			!confirm(
				"Are you sure you want to archive this room? It will no longer be accessible.",
			)
		) {
			return;
		}

		try {
			await archiveRoom({ roomId: room._id });
			onUpdate?.();
			toast.success("Room archived successfully");
		} catch (error) {
			console.error("Failed to archive room:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to archive room",
			);
		}
	};

	if (!canManage) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Room Settings</CardTitle>
					<CardDescription>
						You don't have permission to manage this room
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const hasChanges =
		name !== room.name ||
		description !== (room.description || "") ||
		allowGuestMessages !== room.allowGuestMessages;

	return (
		<div className="space-y-6">
			{/* Basic Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Basic Settings</CardTitle>
					<CardDescription>
						Update room name, description, and permissions
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Room Name */}
					<div className="space-y-2">
						<Label htmlFor="room-name">Room Name</Label>
						<Input
							id="room-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Catering Discussion"
						/>
					</div>

					{/* Room Description */}
					<div className="space-y-2">
						<Label htmlFor="room-description">Description</Label>
						<Textarea
							id="room-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief description of the room's purpose..."
							rows={3}
						/>
					</div>

					{/* Room Type (read-only) */}
					<div className="space-y-2">
						<Label>Room Type</Label>
						<div className="text-sm text-muted-foreground bg-muted p-3 rounded-md capitalize">
							{room.type.replace(/_/g, " ")}
						</div>
						<p className="text-xs text-muted-foreground">
							Room type cannot be changed after creation
						</p>
					</div>

					{/* Allow Guest Messages */}
					<div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
						<div className="flex-1 space-y-1">
							<Label htmlFor="guest-messages" className="cursor-pointer">
								Allow Guest Messages
							</Label>
							<p className="text-sm text-muted-foreground">
								Let guests post messages in this room
							</p>
						</div>
						<Switch
							id="guest-messages"
							checked={allowGuestMessages}
							onCheckedChange={setAllowGuestMessages}
						/>
					</div>

					{/* Save Button */}
					<div className="flex justify-end pt-4">
						<Button onClick={handleSave} disabled={!hasChanges || isSaving}>
							<Save className="h-4 w-4 mr-2" />
							{isSaving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Members Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Room Members</CardTitle>
							<CardDescription>
								Manage who has access to this room
							</CardDescription>
						</div>
						<AddRoomMembersDialog
							roomId={room._id}
							eventId={room.eventId}
							onSuccess={onUpdate}
							trigger={
								<Button>
									<Users className="h-4 w-4 mr-2" />
									Add Members
								</Button>
							}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<RoomParticipantsList roomId={room._id} />
				</CardContent>
			</Card>

			{/* Danger Zone */}
			{room.type !== "main" && (
				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="text-red-600">Danger Zone</CardTitle>
						<CardDescription>
							Irreversible and destructive actions
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Archive Room */}
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium">Archive Room</h4>
								<p className="text-sm text-muted-foreground">
									Hide this room from the room list (can be restored later)
								</p>
							</div>
							<Button variant="outline" onClick={handleArchive}>
								<Archive className="h-4 w-4 mr-2" />
								Archive
							</Button>
						</div>

						{/* Delete Room */}
						<div className="flex items-center justify-between pt-4 border-t">
							<div>
								<h4 className="font-medium text-red-600">Delete Room</h4>
								<p className="text-sm text-muted-foreground">
									Permanently delete this room and all its messages
								</p>
							</div>
							<RoomDeleteDialog
								roomId={room._id}
								eventId={room.eventId}
								redirectAfterDelete={true}
								onSuccess={onUpdate}
							/>
						</div>
					</CardContent>
				</Card>
			)}

			{room.type === "main" && (
				<Card className="border-blue-200 bg-blue-50">
					<CardContent className="pt-6">
						<p className="text-sm text-blue-700">
							The main room cannot be archived or deleted as it's essential for
							event coordination.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
