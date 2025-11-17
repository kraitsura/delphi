import type { Doc, Id } from "@convex/_generated/dataModel";
import { Edit2, MoreVertical, Sparkles, Trash2 } from "lucide-react";
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
import type { StructuredData } from "@/hooks/useAgentInvoke";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./ChatBubble";
import { FluidUIMessageRenderer } from "./FluidUIMessageRenderer";
import { ThreadIndicator } from "./thread-indicator";
import { ThreadRootPreview } from "./thread-root-preview";

interface MessageItemProps {
	message: Doc<"messages"> & {
		author?: Doc<"users"> | null;
		rootMessage?: (Doc<"messages"> & { author?: Doc<"users"> | null }) | null;
		_isPending?: boolean;
	};
	currentUserId: Id<"users">;
	onEdit: (messageId: Id<"messages">, newText: string) => void;
	onDelete: (messageId: Id<"messages">) => void;
	onOpenThread: (threadRootId: Id<"messages">) => void;
	canEdit: boolean;
	canDelete: boolean;
	isFirstInGroup?: boolean;
	isFirstReplyInGroup?: boolean;
	shouldShowLConnector?: boolean;
	threadMode?: boolean;
}

export function MessageItem({
	message,
	currentUserId,
	onEdit,
	onDelete,
	onOpenThread,
	canEdit,
	canDelete,
	isFirstInGroup = true,
	isFirstReplyInGroup = true,
	shouldShowLConnector = false,
	threadMode = false,
}: MessageItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(message.text);

	const isAIGenerated = message.isAIGenerated ?? false;
	// AI messages should never be treated as "own message" - they always appear on the left
	const isOwnMessage = !isAIGenerated && message.authorId === currentUserId;
	const canModify = isOwnMessage && (canEdit || canDelete); // Can't edit/delete AI messages (isOwnMessage is already false for AI)

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

	// Determine thread root ID for this message
	// If this message is in a thread (has threadId), use that
	// Otherwise, this message itself is a potential thread root
	const threadRootId = (message.threadId || message._id) as Id<"messages">;

	const handleOpenThread = () => {
		onOpenThread(threadRootId);
	};

	// Use pre-loaded root message (already fetched in batch)
	const isReply = !!(message.parentMessageId || message.threadId);
	const rootMessage = message.rootMessage;

	// Determine if root and reply are on the same side (for tree connection)
	const rootIsOwnMessage =
		rootMessage &&
		!rootMessage.isAIGenerated &&
		rootMessage.authorId === currentUserId;
	const isReplyOnSameSide = rootIsOwnMessage === isOwnMessage;

	const replyCount = message.replyCount ?? 0;

	return (
		<>
			{/* Show thread root preview only for first reply in consecutive group (Apple Messages style) */}
			{!threadMode && isReply && rootMessage && isFirstReplyInGroup && (
				<ThreadRootPreview
					rootMessage={rootMessage}
					currentUserId={currentUserId}
					isReplyOnSameSide={isReplyOnSameSide}
					onClick={handleOpenThread}
				/>
			)}

			{/* L-connector for author change within same thread */}
			{!threadMode && isReply && shouldShowLConnector && (
				<div className="relative px-4 h-0">
					<svg
						className={cn(
							"absolute pointer-events-none",
							isOwnMessage ? "left-[68px]" : "right-[68px]",
						)}
						style={{
							top: "0px",
							width: "20px",
							height: "24px",
						}}
					>
						<path
							d={
								isOwnMessage
									? "M 0,0 L 0,24 L 20,24" // └ shape (current message on right, coming from left)
									: "M 20,0 L 20,24 L 0,24" // ┘ shape (current message on left, coming from right)
							}
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="none"
							className="text-border opacity-70"
						/>
					</svg>
				</div>
			)}

			<div
				className={cn(
					"group flex gap-3 px-4",
					isOwnMessage ? "flex-row" : "flex-row",
					isFirstInGroup ? "pt-3 pb-1" : "py-1",
				)}
				onClick={(e) => e.stopPropagation()}
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

				{/* Avatar - only show for others' messages and first in group (or always for AI) */}
				{!isOwnMessage && (isFirstInGroup || isAIGenerated) && (
					<Avatar className="h-8 w-8 flex-shrink-0">
						{isAIGenerated ? (
							<>
								<AvatarFallback className="bg-purple-600 text-white">
									<Sparkles className="h-4 w-4" />
								</AvatarFallback>
							</>
						) : (
							<>
								<AvatarImage src={message.author?.avatar} />
								<AvatarFallback className="bg-blue-500 text-white text-xs">
									{message.author?.name
										? getInitials(message.author.name)
										: "?"}
								</AvatarFallback>
							</>
						)}
					</Avatar>
				)}

				{/* Spacer for non-first messages to align with avatar (but not for AI which always shows avatar) */}
				{!isOwnMessage && !isFirstInGroup && !isAIGenerated && (
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
						<>
							{/* Exclusive rendering: Either structured data OR markdown text */}
							{isAIGenerated &&
							(message.aiMetadata?.structuredData ||
								(message.aiMetadata?.renderType &&
									message.aiMetadata.renderType !== "text")) ? (
								<FluidUIMessageRenderer
									message={message}
									structuredData={
										message.aiMetadata.structuredData as StructuredData
									}
									eventId={undefined} // TODO: Get eventId from parent component
								/>
							) : (
								<ChatBubble
									text={message.text}
									isOwnMessage={isOwnMessage}
									isAIGenerated={isAIGenerated}
									timestamp={message.createdAt}
									isEdited={message.isEdited}
									senderName={
										isAIGenerated
											? "Delphi"
											: message.author?.name || "Unknown User"
									}
									isFirstInGroup={isFirstInGroup}
									onReply={handleOpenThread}
									isPending={message._isPending}
								/>
							)}
							{/* Thread indicator - show if message has replies */}
							{replyCount > 0 && (
								<ThreadIndicator
									replyCount={replyCount}
									threadRootId={threadRootId}
									onClick={handleOpenThread}
									className="mt-1"
								/>
							)}
						</>
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
		</>
	);
}
