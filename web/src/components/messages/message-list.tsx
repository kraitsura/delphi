import type { Doc, Id } from "@convex/_generated/dataModel";
import { MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageItem } from "./message-item";

interface MessageListProps {
	messages: Array<
		Doc<"messages"> & {
			author?: Doc<"users"> | null;
		}
	>;
	currentUserId: Id<"users">;
	onEdit: (messageId: Id<"messages">, newText: string) => void;
	onDelete: (messageId: Id<"messages">) => void;
	canEdit: boolean;
	canDelete: boolean;
	isLoading?: boolean;
}

export function MessageList({
	messages,
	currentUserId,
	onEdit,
	onDelete,
	canEdit,
	canDelete,
	isLoading = false,
}: MessageListProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const prevMessagesLengthRef = useRef(messages.length);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		// Only auto-scroll if messages increased (new message)
		if (messages.length > prevMessagesLengthRef.current) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
		prevMessagesLengthRef.current = messages.length;
	}, [messages.length]);

	// Initial scroll to bottom on mount
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
	}, []);

	if (isLoading) {
		return (
			<div className="h-full overflow-y-auto bg-background">
				<div className="space-y-4 p-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex gap-3">
							<div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
								<div className="h-16 bg-muted rounded animate-pulse" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (messages.length === 0) {
		return (
			<div className="h-full flex items-center justify-center bg-background">
				<div className="text-center">
					<MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-foreground mb-2">
						No messages yet
					</h3>
					<p className="text-sm text-muted-foreground">
						Be the first to send a message in this room!
					</p>
				</div>
			</div>
		);
	}

	// Messages are returned in desc order (newest first) from backend
	// Reverse them for display (oldest first)
	const displayMessages = [...messages].reverse();

	// Group consecutive messages from the same author
	const isFirstInGroup = (index: number) => {
		if (index === 0) return true;
		const currentMsg = displayMessages[index];
		const prevMsg = displayMessages[index - 1];
		return currentMsg.authorId !== prevMsg.authorId;
	};

	return (
		<div
			ref={containerRef}
			className="h-full overflow-y-auto bg-background scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/50"
		>
			<div className="py-2">
				{displayMessages.map((message, index) => (
					<MessageItem
						key={message._id}
						message={message}
						currentUserId={currentUserId}
						onEdit={onEdit}
						onDelete={onDelete}
						canEdit={canEdit}
						canDelete={canDelete}
						isFirstInGroup={isFirstInGroup(index)}
					/>
				))}
				{/* Invisible div for auto-scroll target */}
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
}
