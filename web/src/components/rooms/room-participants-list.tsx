import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	Crown,
	Edit,
	MessageSquare,
	Shield,
	Star,
	Trash2,
	UserMinus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ParticipantPermissionsDialog } from "./participant-permissions-dialog";

interface RoomParticipantsListProps {
	roomId: Id<"rooms">;
}

export function RoomParticipantsList({ roomId }: RoomParticipantsListProps) {
	const participants = useQuery(api.roomParticipants.listByRoom, { roomId });
	const removeParticipant = useMutation(api.roomParticipants.removeParticipant);

	// Check if current user can manage - must be called before any early returns
	const userAccess = useQuery(api.roomParticipants.getUserRoomAccess, {
		roomId,
	});
	const canManage = userAccess?.canManage ?? false;

	const [editingParticipant, setEditingParticipant] = useState<{
		userId: Id<"users">;
		userName: string;
		permissions: {
			canPost: boolean;
			canEdit: boolean;
			canDelete: boolean;
			canManage: boolean;
		};
	} | null>(null);

	const handleRemove = async (userId: Id<"users">, userName: string) => {
		if (
			!confirm(`Are you sure you want to remove ${userName} from this room?`)
		) {
			return;
		}

		try {
			await removeParticipant({ roomId, userId });
		} catch (error) {
			console.error("Failed to remove participant:", error);
			alert(
				error instanceof Error ? error.message : "Failed to remove participant",
			);
		}
	};

	if (participants === undefined) {
		return (
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
				))}
			</div>
		);
	}

	if (participants.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No participants in this room
			</div>
		);
	}

	// Separate coordinators from regular participants
	const coordinators = participants.filter((p) => p.isCoordinator);
	const regularParticipants = participants.filter((p) => !p.isCoordinator);

	const renderParticipant = (
		participant: (typeof participants)[0],
		isCoordinator: boolean,
	) => {
		if (!participant.user) return null;

		const isManager = participant.canManage;

		return (
			<Card
				key={participant._id}
				className={
					isCoordinator
						? "border-l-4 border-l-purple-500 bg-purple-50/50"
						: isManager
							? "border-l-4 border-l-blue-500"
							: ""
				}
			>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						{/* Avatar */}
						<div className="relative h-12 w-12 overflow-hidden rounded-full border-2 flex-shrink-0">
							{participant.user.avatar ? (
								<img
									src={participant.user.avatar}
									alt={participant.user.name}
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-semibold text-lg">
									{participant.user.name?.charAt(0).toUpperCase() || "?"}
								</div>
							)}
						</div>

						{/* User Info */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<h4 className="font-medium truncate">
									{participant.user.name}
								</h4>
								{isCoordinator && (
									<Badge variant="secondary" className="text-xs">
										<Star className="h-3 w-3 mr-1" />
										Coordinator
									</Badge>
								)}
								{!isCoordinator && isManager && (
									<Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
								)}
							</div>
							<p className="text-sm text-gray-500 truncate">
								{participant.user.email}
							</p>

							{/* Permission Badges */}
							{isCoordinator ? (
								<div className="flex flex-wrap gap-1 mt-2">
									<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
										Full Access (All Rooms)
									</span>
								</div>
							) : (
								<div className="flex flex-wrap gap-1 mt-2">
									{participant.canPost && (
										<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
											<MessageSquare className="h-3 w-3" />
											Post
										</span>
									)}
									{participant.canEdit && (
										<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
											<Edit className="h-3 w-3" />
											Edit
										</span>
									)}
									{participant.canDelete && (
										<span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
											<Trash2 className="h-3 w-3" />
											Delete
										</span>
									)}
									{participant.canManage && (
										<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
											<Shield className="h-3 w-3" />
											Manage
										</span>
									)}
								</div>
							)}
						</div>

						{/* Actions - only for regular participants, not coordinators */}
						{canManage && !isCoordinator && (
							<div className="flex items-center gap-2 flex-shrink-0">
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setEditingParticipant({
											userId: participant.userId,
											userName: participant.user!.name,
											permissions: {
												canPost: participant.canPost,
												canEdit: participant.canEdit,
												canDelete: participant.canDelete,
												canManage: participant.canManage,
											},
										})
									}
								>
									<Edit className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										handleRemove(participant.userId, participant.user!.name)
									}
								>
									<UserMinus className="h-4 w-4" />
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<div className="space-y-6">
			{/* Coordinators Section */}
			{coordinators.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
							Event Coordinators
						</h3>
						<Badge variant="outline" className="text-xs">
							Automatic Access
						</Badge>
					</div>
					<p className="text-xs text-gray-500 mb-3">
						Coordinators have automatic full access to all rooms and cannot be
						removed.
					</p>
					{coordinators.map((participant) =>
						renderParticipant(participant, true),
					)}
				</div>
			)}

			{/* Regular Participants Section */}
			{regularParticipants.length > 0 && (
				<div className="space-y-3">
					{coordinators.length > 0 && (
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
							Room Participants
						</h3>
					)}
					{regularParticipants.map((participant) =>
						renderParticipant(participant, false),
					)}
				</div>
			)}

			{regularParticipants.length === 0 && coordinators.length > 0 && (
				<div className="text-center py-6 text-gray-500 border-t">
					<p className="text-sm">No additional participants in this room</p>
					<p className="text-xs mt-1">
						Add collaborators or guests using the button above
					</p>
				</div>
			)}

			{/* Edit Permissions Dialog */}
			{editingParticipant && (
				<ParticipantPermissionsDialog
					roomId={roomId}
					userId={editingParticipant.userId}
					userName={editingParticipant.userName}
					currentPermissions={editingParticipant.permissions}
					open={!!editingParticipant}
					onOpenChange={(open) => !open && setEditingParticipant(null)}
				/>
			)}
		</div>
	);
}
