import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ParticipantPermissionsDialogProps {
	roomId: Id<"rooms">;
	userId: Id<"users">;
	userName: string;
	currentPermissions: {
		canPost: boolean;
		canEdit: boolean;
		canDelete: boolean;
		canManage: boolean;
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function ParticipantPermissionsDialog({
	roomId,
	userId,
	userName,
	currentPermissions,
	open,
	onOpenChange,
	onSuccess,
}: ParticipantPermissionsDialogProps) {
	const [permissions, setPermissions] = useState(currentPermissions);
	const [isSaving, setIsSaving] = useState(false);

	const updatePermissions = useMutation(api.roomParticipants.updatePermissions);

	// Reset permissions when dialog opens with new user
	useEffect(() => {
		setPermissions(currentPermissions);
	}, [currentPermissions, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsSaving(true);
		try {
			await updatePermissions({
				roomId,
				userId,
				permissions,
			});

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			console.error("Failed to update permissions:", error);
			alert(
				error instanceof Error ? error.message : "Failed to update permissions",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const hasChanges =
		permissions.canPost !== currentPermissions.canPost ||
		permissions.canEdit !== currentPermissions.canEdit ||
		permissions.canDelete !== currentPermissions.canDelete ||
		permissions.canManage !== currentPermissions.canManage;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Permissions</DialogTitle>
					<DialogDescription>
						Update permissions for <strong>{userName}</strong>
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Permissions */}
					<div className="space-y-4">
						<Label>Permissions</Label>
						<div className="space-y-3 border rounded-lg p-4">
							{/* Can Post */}
							<div className="flex items-start space-x-3">
								<Checkbox
									id="edit-can-post"
									checked={permissions.canPost}
									onCheckedChange={(checked) =>
										setPermissions((prev) => ({
											...prev,
											canPost: checked === true,
										}))
									}
								/>
								<div className="flex-1 space-y-1">
									<Label
										htmlFor="edit-can-post"
										className="cursor-pointer font-medium"
									>
										Can Post Messages
									</Label>
									<p className="text-sm text-gray-500">
										Allow user to send messages in this room
									</p>
								</div>
							</div>

							{/* Can Edit */}
							<div className="flex items-start space-x-3">
								<Checkbox
									id="edit-can-edit"
									checked={permissions.canEdit}
									onCheckedChange={(checked) =>
										setPermissions((prev) => ({
											...prev,
											canEdit: checked === true,
										}))
									}
								/>
								<div className="flex-1 space-y-1">
									<Label
										htmlFor="edit-can-edit"
										className="cursor-pointer font-medium"
									>
										Can Edit Messages
									</Label>
									<p className="text-sm text-gray-500">
										Allow user to edit their own messages
									</p>
								</div>
							</div>

							{/* Can Delete */}
							<div className="flex items-start space-x-3">
								<Checkbox
									id="edit-can-delete"
									checked={permissions.canDelete}
									onCheckedChange={(checked) =>
										setPermissions((prev) => ({
											...prev,
											canDelete: checked === true,
										}))
									}
								/>
								<div className="flex-1 space-y-1">
									<Label
										htmlFor="edit-can-delete"
										className="cursor-pointer font-medium"
									>
										Can Delete Messages
									</Label>
									<p className="text-sm text-gray-500">
										Allow user to delete their own messages
									</p>
								</div>
							</div>

							{/* Can Manage */}
							<div className="flex items-start space-x-3 pt-3 border-t">
								<Checkbox
									id="edit-can-manage"
									checked={permissions.canManage}
									onCheckedChange={(checked) =>
										setPermissions((prev) => ({
											...prev,
											canManage: checked === true,
										}))
									}
								/>
								<div className="flex-1 space-y-1">
									<Label
										htmlFor="edit-can-manage"
										className="cursor-pointer font-medium text-purple-600"
									>
										Can Manage Room
									</Label>
									<p className="text-sm text-gray-500">
										Allow user to manage room settings and participants
									</p>
								</div>
							</div>
						</div>

						{currentPermissions.canManage && !permissions.canManage && (
							<div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
								⚠️ Warning: Removing manager permissions will prevent this user
								from managing the room. Ensure there's at least one other
								manager.
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!hasChanges || isSaving}>
							<Save className="h-4 w-4 mr-2" />
							{isSaving ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
