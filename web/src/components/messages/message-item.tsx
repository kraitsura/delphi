import type { Doc, Id } from "@convex/_generated/dataModel";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./ChatBubble";

interface MessageItemProps {
	message: Doc<"messages"> & {
		author?: Doc<"users"> | null;
	};
	currentUserId: Id<"users">;
	onEdit: (messageId: Id<"messages">, newText: string) => void;
	onDelete: (messageId: Id<"messages">) => void;
	canEdit: boolean;
	canDelete: boolean;
	isFirstInGroup?: boolean;
}

export function MessageItem({
	message,
	currentUserId,
	onEdit,
	onDelete,
	canEdit,
	canDelete,
	isFirstInGroup = true,
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
		<div
			className={cn(
				"group flex gap-3 px-4",
				isOwnMessage ? "flex-row" : "flex-row",
				isFirstInGroup ? "pt-3 pb-1" : "py-1",
			)}
		>
			{/* Actions Menu - on left side for own messages, right for others */}
			{canModify && !isEditing && (
				<div className="self-center">
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
						<DropdownMenuContent align="start">
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
				</div>
			)}

			{/* Avatar - only show for others' messages and first in group */}
			{!isOwnMessage && isFirstInGroup && (
				<Avatar className="h-8 w-8 flex-shrink-0">
					<AvatarImage src={message.author?.avatarUrl} />
					<AvatarFallback className="bg-blue-500 text-white text-xs">
						{message.author?.name ? getInitials(message.author.name) : "?"}
					</AvatarFallback>
				</Avatar>
			)}

			{/* Spacer for non-first messages to align with avatar */}
			{!isOwnMessage && !isFirstInGroup && (
				<div className="h-8 w-8 flex-shrink-0" />
			)}

			{/* Message Content */}
			<div
				className={cn(
					"flex flex-col flex-1 min-w-0",
					isOwnMessage ? "items-end" : "items-start",
				)}
			>
				{/* Chat Bubble or Edit Mode */}
				{isEditing ? (
					<div className="space-y-2 w-full max-w-[70%]">
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
						</div>
					</div>
				) : (
					<ChatBubble
						text={message.text}
						isOwnMessage={isOwnMessage}
						timestamp={message.createdAt}
						isEdited={message.isEdited}
						senderName={message.author?.name || "Unknown User"}
						isFirstInGroup={isFirstInGroup}
					/>
				)}

				{/* Attachments (future) */}
				{message.attachments && message.attachments.length > 0 && (
					<div className="mt-1 space-y-1">
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
		</div>
	);
}
