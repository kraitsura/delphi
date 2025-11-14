import { format } from "date-fns";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
	text: string;
	isOwnMessage: boolean;
	isAIGenerated?: boolean;
	timestamp: number;
	isEdited?: boolean;
	isEditing?: boolean;
	senderName?: string;
	isFirstInGroup?: boolean;
	children?: React.ReactNode;
}

export function ChatBubble({
	text,
	isOwnMessage,
	isAIGenerated = false,
	timestamp,
	isEdited = false,
	isEditing = false,
	senderName,
	isFirstInGroup = false,
	children,
}: ChatBubbleProps) {
	const messageDate = new Date(timestamp);
	const displayTime = format(messageDate, "h:mm a");

	return (
		<div
			className={cn(
				"group/bubble relative px-3 py-2 rounded-lg max-w-[60%] transition-all",
				"break-words",
				isAIGenerated
					? "bg-purple-50 hover:bg-purple-100 border border-purple-200" // Agent messages
					: isOwnMessage
						? "bg-[#DCF8C6] hover:bg-[#d1f0ba]" // WhatsApp green
						: "bg-white hover:bg-gray-50 border border-gray-200",
				!isEditing && "cursor-default",
			)}
		>
			{/* Message Content */}
			{isEditing ? (
				children
			) : (
				<>
					{/* Sender name at top for first message in group (other users only or AI) */}
					{!isOwnMessage && isFirstInGroup && senderName && (
						<div
							className={cn(
								"text-xs font-bold mb-1",
								isAIGenerated ? "text-purple-600" : "text-primary",
							)}
						>
							{senderName}
						</div>
					)}
					<div className="flex items-end gap-2">
						{/* Message text */}
						<span className="text-sm text-gray-900 whitespace-pre-wrap flex-1">
							{text}
						</span>
						{/* Timestamp - smaller, aligned to bottom of last line */}
						<span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
							{displayTime}
							{isEdited && <span className="italic ml-1">(edited)</span>}
						</span>
					</div>
					{/* Reply icon - visible on hover, positioned based on message owner */}
					<button
						type="button"
						className={cn(
							"absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded",
							isOwnMessage ? "-left-8" : "-right-8",
						)}
						aria-label="Reply to message"
					>
						<Reply className="h-3.5 w-3.5 text-gray-500" />
					</button>
				</>
			)}
		</div>
	);
}
