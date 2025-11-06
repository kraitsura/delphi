import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AddRoomMembersDialogProps {
	roomId: Id<"rooms">;
	eventId: Id<"events">;
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export function AddRoomMembersDialog({
	roomId,
	eventId,
	trigger,
	onSuccess,
}: AddRoomMembersDialogProps) {
	const [open, setOpen] = useState(false);
	const [selectedUserIds, setSelectedUserIds] = useState<Set<Id<"users">>>(
		new Set(),
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fetch event members (collaborators and guests only - coordinators have implicit access)
	const collaborators = useQuery(api.eventMembers.listByEvent, {
		eventId,
		role: "collaborator",
	});

	const guests = useQuery(api.eventMembers.listByEvent, {
		eventId,
		role: "guest",
	});

	// Fetch current room participants
	const currentParticipants = useQuery(api.roomParticipants.listByRoom, {
		roomId,
	});

	const addMembersToRoom = useMutation(
		api.roomParticipants.addMultipleMembersToRoom,
	);

	// Combine collaborators and guests
	const allMembers = [...(collaborators || []), ...(guests || [])];

	// Get set of existing participant user IDs
	const existingParticipantIds = new Set(
		currentParticipants?.map((p) => p.userId) || [],
	);

	// Filter members based on search query
	const filteredMembers = allMembers.filter((member) => {
		if (!member.user) return false;
		const searchLower = searchQuery.toLowerCase();
		return (
			member.user.name.toLowerCase().includes(searchLower) ||
			member.user.email.toLowerCase().includes(searchLower)
		);
	});

	// Separate into already in room and not in room
	const membersInRoom = filteredMembers.filter((m) =>
		existingParticipantIds.has(m.userId),
	);
	const membersNotInRoom = filteredMembers.filter(
		(m) => !existingParticipantIds.has(m.userId),
	);

	const toggleMember = (userId: Id<"users">) => {
		const newSet = new Set(selectedUserIds);
		if (newSet.has(userId)) {
			newSet.delete(userId);
		} else {
			newSet.add(userId);
		}
		setSelectedUserIds(newSet);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (selectedUserIds.size === 0) {
			alert("Please select at least one member to add");
			return;
		}

		try {
			setIsSubmitting(true);
			const result = await addMembersToRoom({
				roomId,
				userIds: Array.from(selectedUserIds),
			});

			// Reset form
			setSelectedUserIds(new Set());
			setSearchQuery("");
			setOpen(false);

			// Show success message with results
			const message = `Added ${result.added} member(s) successfully. ${result.skipped > 0 ? `Skipped ${result.skipped} (already in room or coordinators)` : ""}`;
			alert(message);

			onSuccess?.();
		} catch (error) {
			console.error("Failed to add members:", error);
			alert(error instanceof Error ? error.message : "Failed to add members");
		} finally {
			setIsSubmitting(false);
		}
	};

	const isLoading = !collaborators || !guests || !currentParticipants;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button>
						<UserPlus className="h-4 w-4 mr-2" />
						Add Members
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add Members to Room</DialogTitle>
					<DialogDescription>
						Select event members (collaborators and guests) to add to this room.
						Coordinators have automatic access to all rooms.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
					{/* Search */}
					<div className="mb-4">
						<Input
							type="text"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full"
						/>
					</div>

					{/* Selected count */}
					{selectedUserIds.size > 0 && (
						<div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
							<p className="text-sm text-blue-700 font-medium">
								{selectedUserIds.size} member(s) selected
							</p>
						</div>
					)}

					{/* Member list */}
					<div className="flex-1 min-h-0 border rounded-md overflow-y-auto max-h-96">
						<div className="p-4 space-y-4">
							{isLoading ? (
								<div className="text-center py-8 text-gray-500">
									Loading members...
								</div>
							) : allMembers.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
									<p className="font-medium">No members found</p>
									<p className="text-sm">
										Add collaborators or guests to this event first
									</p>
								</div>
							) : filteredMembers.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<X className="h-12 w-12 mx-auto mb-3 text-gray-400" />
									<p>No members match your search</p>
								</div>
							) : (
								<>
									{/* Members not in room */}
									{membersNotInRoom.length > 0 && (
										<div className="space-y-3">
											<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
												Available to Add
											</h3>
											{membersNotInRoom.map((member) => {
												if (!member.user) return null;
												const isSelected = selectedUserIds.has(member.userId);

												return (
													<div
														key={member._id}
														className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
															isSelected
																? "bg-blue-50 border-blue-300"
																: "bg-white border-gray-200 hover:bg-gray-50"
														}`}
													>
														<Checkbox
															checked={isSelected}
															onCheckedChange={() =>
																toggleMember(member.userId)
															}
														/>
														<div className="relative h-10 w-10 overflow-hidden rounded-full border flex-shrink-0">
															<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-semibold">
																{member.user.name?.charAt(0).toUpperCase() ||
																	"?"}
															</div>
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-medium truncate">
																{member.user.name}
															</p>
															<p className="text-sm text-gray-500 truncate">
																{member.user.email}
															</p>
														</div>
														<Badge
															variant={
																member.role === "collaborator"
																	? "default"
																	: "secondary"
															}
														>
															{member.role}
														</Badge>
													</div>
												);
											})}
										</div>
									)}

									{/* Members already in room */}
									{membersInRoom.length > 0 && (
										<div className="space-y-3">
											<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
												Already in Room
											</h3>
											{membersInRoom.map((member) => {
												if (!member.user) return null;

												return (
													<div
														key={member._id}
														className="flex items-center space-x-3 p-3 rounded-md border bg-gray-50 border-gray-200 opacity-60"
													>
														<Check className="h-5 w-5 text-green-600" />
														<div className="relative h-10 w-10 overflow-hidden rounded-full border flex-shrink-0">
															<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-semibold">
																{member.user.name?.charAt(0).toUpperCase() ||
																	"?"}
															</div>
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-medium truncate">
																{member.user.name}
															</p>
															<p className="text-sm text-gray-500 truncate">
																{member.user.email}
															</p>
														</div>
														<Badge
															variant={
																member.role === "collaborator"
																	? "default"
																	: "secondary"
															}
														>
															{member.role}
														</Badge>
													</div>
												);
											})}
										</div>
									)}
								</>
							)}
						</div>
					</div>

					<DialogFooter className="mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={selectedUserIds.size === 0 || isSubmitting}
						>
							{isSubmitting
								? "Adding..."
								: `Add ${selectedUserIds.size > 0 ? selectedUserIds.size : ""} Member${selectedUserIds.size !== 1 ? "s" : ""}`}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
