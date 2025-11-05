import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Doc, Id } from "@convex/_generated/dataModel";

interface MessageItemProps {
	message: Doc<"messages"> & {
		author?: Doc<"users"> | null;
	};
	currentUserId: Id<"users">;
	onEdit: (messageId: Id<"messages">, newText: string) => void;
	onDelete: (messageId: Id<"messages">) => void;
	canEdit: boolean;
	canDelete: boolean;
}

export function MessageItem({
	message,
	currentUserId,
	onEdit,
	onDelete,
	canEdit,
	canDelete,
}: MessageItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(message.text);

	const isOwnMessage = message.authorId === currentUserId;
	const canModify = isOwnMessage && (canEdit || canDelete);

	const handleSaveEdit = () => {
		if (editText.trim() && editText !== message.text) {
			onEdit(message._id, editText.trim());
		}
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditText(message.text);
		setIsEditing(false);
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="group flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
			{/* Avatar */}
			<Avatar className="h-10 w-10 flex-shrink-0">
				<AvatarImage src={message.author?.avatarUrl} />
				<AvatarFallback className="bg-blue-500 text-white text-sm">
					{message.author?.name ? getInitials(message.author.name) : "?"}
				</AvatarFallback>
			</Avatar>

			{/* Message Content */}
			<div className="flex-1 min-w-0">
				{/* Header: Author & Timestamp */}
				<div className="flex items-baseline gap-2 mb-1">
					<span className="font-semibold text-sm text-foreground">
						{message.author?.name || "Unknown User"}
					</span>
					<span className="text-xs text-muted-foreground">
						{formatDistanceToNow(new Date(message.createdAt), {
							addSuffix: true,
						})}
					</span>
					{message.isEdited && (
						<span className="text-xs text-muted-foreground/80 italic">(edited)</span>
					)}
				</div>

				{/* Message Text */}
				{isEditing ? (
					<div className="space-y-2">
						<Textarea
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							className="min-h-[80px]"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSaveEdit();
								} else if (e.key === "Escape") {
									handleCancelEdit();
								}
							}}
						/>
						<div className="flex gap-2">
							<Button size="sm" onClick={handleSaveEdit}>
								Save
							</Button>
							<Button size="sm" variant="outline" onClick={handleCancelEdit}>
								Cancel
							</Button>
							<span className="text-xs text-muted-foreground self-center ml-2">
								Press Enter to save, Esc to cancel
							</span>
						</div>
					</div>
				) : (
					<div className="text-sm text-foreground whitespace-pre-wrap break-words">
						{message.text}
					</div>
				)}

				{/* Attachments (future) */}
				{message.attachments && message.attachments.length > 0 && (
					<div className="mt-2 space-y-1">
						{message.attachments.map((attachment, idx) => (
							<div
								key={idx}
								className="text-xs text-blue-600 hover:underline cursor-pointer"
							>
								📎 {attachment.name}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Actions Menu */}
			{canModify && !isEditing && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{canEdit && (
							<DropdownMenuItem onClick={() => setIsEditing(true)}>
								<Edit2 className="h-4 w-4 mr-2" />
								Edit
							</DropdownMenuItem>
						)}
						{canDelete && (
							<DropdownMenuItem
								onClick={() => onDelete(message._id)}
								className="text-red-600 focus:text-red-600"
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
