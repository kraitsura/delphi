import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface RoomEditDialogProps {
	roomId: Id<"rooms">;
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export function RoomEditDialog({
	roomId,
	trigger,
	onSuccess,
}: RoomEditDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Fetch current room data
	const room = useQuery(api.rooms.getById, { roomId });
	const updateRoom = useMutation(api.rooms.update);

	// Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [allowGuestMessages, setAllowGuestMessages] = useState(false);

	// Initialize form with room data
	useEffect(() => {
		if (room) {
			setName(room.name);
			setDescription(room.description || "");
			setAllowGuestMessages(room.allowGuestMessages);
		}
	}, [room]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Please enter a room name");
			return;
		}

		setIsLoading(true);

		try {
			await updateRoom({
				roomId,
				name: name.trim(),
				description: description.trim() || undefined,
				allowGuestMessages,
			});

			toast.success("Room updated successfully!");
			setOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error("Failed to update room:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to update room",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<Pencil className="h-4 w-4 mr-2" />
						Edit Room
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Room</DialogTitle>
					<DialogDescription>
						Update your room details. Changes will be saved immediately.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Room Name */}
					<div className="space-y-2">
						<Label htmlFor="name">
							Room Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Catering Discussion"
							required
							disabled={isLoading}
						/>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Discuss catering options and menu planning..."
							rows={3}
							disabled={isLoading}
						/>
					</div>

					{/* Allow Guest Messages */}
					<div className="flex items-center justify-between space-x-2">
						<div className="space-y-0.5">
							<Label htmlFor="allow-guests">Allow Guest Messages</Label>
							<p className="text-sm text-muted-foreground">
								Let guests post messages in this room
							</p>
						</div>
						<Switch
							id="allow-guests"
							checked={allowGuestMessages}
							onCheckedChange={setAllowGuestMessages}
							disabled={isLoading}
						/>
					</div>

					{/* Info Box */}
					{room?.type === "main" && (
						<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								ℹ️ This is the main event room. Room type and participants cannot
								be changed.
							</p>
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
