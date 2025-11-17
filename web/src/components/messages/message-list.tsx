import type { Doc, Id } from "@convex/_generated/dataModel";
import { MessageSquare } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { MessageItem } from "./message-item";
import { NewMessageIndicator } from "./NewMessageIndicator";

export interface MessageListHandle {
	getScrollPosition: () => number;
	setScrollPosition: (position: number) => void;
	scrollToBottom: () => void;
}

interface MessageListProps {
	messages: Array<
		Doc<"messages"> & {
			author?: Doc<"users"> | null;
		}
	>;
	currentUserId: Id<"users">;
	onEdit: (messageId: Id<"messages">, newText: string) => void;
	onDelete: (messageId: Id<"messages">) => void;
	onOpenThread: (threadRootId: Id<"messages">) => void;
	canEdit: boolean;
	canDelete: boolean;
	isLoading?: boolean;
	threadMode?: boolean;
	disableAutoScroll?: boolean;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
	function MessageList(
		{
			messages,
			currentUserId,
			onEdit,
			onDelete,
			onOpenThread,
			canEdit,
			canDelete,
			isLoading = false,
			threadMode = false,
			disableAutoScroll = false,
		},
		ref,
	) {
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const prevMessagesLengthRef = useRef(messages.length);

		// Track scroll position and unread messages
		const [isNearBottom, setIsNearBottom] = useState(true);
		const [unreadCount, setUnreadCount] = useState(0);
		const lastSeenMessageIdRef = useRef<Id<"messages"> | null>(null);

		// Expose scroll methods to parent via ref
		useImperativeHandle(ref, () => ({
			getScrollPosition: () => containerRef.current?.scrollTop ?? 0,
			setScrollPosition: (position: number) => {
				if (containerRef.current) {
					containerRef.current.scrollTop = position;
				}
			},
			scrollToBottom: () => {
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			},
		}));

		// Check if user is near bottom of scroll container
		const checkIfNearBottom = useCallback(() => {
			const container = containerRef.current;
			if (!container) return false;

			const threshold = 100; // pixels from bottom
			const isNear =
				container.scrollHeight - container.scrollTop - container.clientHeight <
				threshold;
			return isNear;
		}, []);

		// Handle scroll events to track position
		const handleScroll = useCallback(() => {
			const nearBottom = checkIfNearBottom();
			setIsNearBottom(nearBottom);

			// Reset unread count when user scrolls to bottom
			if (nearBottom && unreadCount > 0) {
				setUnreadCount(0);
				// Update last seen message to the newest one
				if (messages.length > 0) {
					lastSeenMessageIdRef.current = messages[0]._id; // messages are in DESC order
				}
			}
		}, [checkIfNearBottom, unreadCount, messages]);

		// Attach scroll listener
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			container.addEventListener("scroll", handleScroll, { passive: true });
			return () => container.removeEventListener("scroll", handleScroll);
		}, [handleScroll]);

		// Handler for clicking the new messages indicator
		const handleNewMessagesClick = useCallback(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
			setUnreadCount(0);
			// Update last seen message to the newest one
			if (messages.length > 0) {
				lastSeenMessageIdRef.current = messages[0]._id;
			}
		}, [messages]);

		// Auto-scroll to bottom when new messages arrive
		useEffect(() => {
			// Only auto-scroll if messages increased (new message) and auto-scroll is enabled
			if (
				!disableAutoScroll &&
				messages.length > prevMessagesLengthRef.current
			) {
				// Timing: Measure UI update latency
				const uiUpdateTime = performance.now();
				console.log(
					`[Message List] New message detected in UI at ${uiUpdateTime.toFixed(2)}ms`,
				);
				console.log(
					`[Message List] Messages count: ${prevMessagesLengthRef.current} → ${messages.length}`,
				);

				// Get the newest message (messages are in DESC order, so first item)
				const newestMessage = messages[0];
				const isOwnMessage =
					newestMessage && newestMessage.authorId === currentUserId;

				// Only auto-scroll if:
				// 1. Message is from current user, OR
				// 2. User is already near bottom
				const shouldScroll = isOwnMessage || isNearBottom;

				if (shouldScroll) {
					messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
					// Update last seen message
					if (newestMessage) {
						lastSeenMessageIdRef.current = newestMessage._id;
					}
				} else {
					// User is scrolled up and message is from someone else - increment unread count
					setUnreadCount((prev) => prev + 1);
				}
			}
			prevMessagesLengthRef.current = messages.length;
		}, [
			messages.length,
			messages,
			disableAutoScroll,
			currentUserId,
			isNearBottom,
		]);

		// Initial scroll to bottom on mount
		useEffect(() => {
			if (!disableAutoScroll) {
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			}
		}, [disableAutoScroll]);

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

		// Normal room messages are returned in desc order (newest first) - reverse for display
		// Thread messages are already in asc order (oldest first) - don't reverse
		const displayMessages = threadMode ? messages : [...messages].reverse();

		// Group consecutive messages from the same author
		const isFirstInGroup = (index: number) => {
			if (index === 0) return true;
			const currentMsg = displayMessages[index];
			const prevMsg = displayMessages[index - 1];
			return currentMsg.authorId !== prevMsg.authorId;
		};

		// Check if this is the first reply in a consecutive group of replies to the same thread
		// (Apple Messages style - only show thread root preview once for grouped replies)
		const isFirstReplyInGroup = (index: number) => {
			const currentMsg = displayMessages[index];

			// Not a reply at all
			if (!currentMsg.parentMessageId && !currentMsg.threadId) return true;

			// First message is always first in group
			if (index === 0) return true;

			const prevMsg = displayMessages[index - 1];
			const currentThreadId = currentMsg.threadId || currentMsg.parentMessageId;
			const prevThreadId = prevMsg.threadId || prevMsg.parentMessageId;

			// If previous message is the thread root, don't show preview (it's right above)
			if (prevMsg._id === currentThreadId) return false;

			// Previous message is not a reply, or different thread
			// (Author changes within thread are allowed - creates continuous thread group)
			return !prevThreadId || currentThreadId !== prevThreadId;
		};

		// Check if we should show L-shaped connector for author change within same thread
		const shouldShowLConnector = (index: number) => {
			if (index === 0) return false;

			const currentMsg = displayMessages[index];
			const prevMsg = displayMessages[index - 1];

			// Current message must be a reply
			const currentThreadId = currentMsg.threadId || currentMsg.parentMessageId;
			if (!currentThreadId) return false;

			// Check if previous message is the thread root
			const isPrevMessageRoot = prevMsg._id === currentThreadId;

			// Both must be in the same thread (either both replies, or prev is root)
			const prevThreadId = prevMsg.threadId || prevMsg.parentMessageId;
			const isInSameThread =
				isPrevMessageRoot || (prevThreadId && currentThreadId === prevThreadId);

			if (!isInSameThread) return false;

			// Author must have changed
			return currentMsg.authorId !== prevMsg.authorId;
		};

		return (
			<div className="relative h-full">
				<div
					ref={containerRef}
					className="h-full overflow-y-auto bg-background scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/50"
				>
					<div
						className={cn(
							"py-2",
							threadMode && "max-w-3xl mx-auto", // Center thread messages
						)}
					>
						{displayMessages.map((message, index) => (
							<MessageItem
								key={message._id}
								message={message}
								currentUserId={currentUserId}
								onEdit={onEdit}
								onDelete={onDelete}
								onOpenThread={onOpenThread}
								canEdit={canEdit}
								canDelete={canDelete}
								isFirstInGroup={isFirstInGroup(index)}
								isFirstReplyInGroup={isFirstReplyInGroup(index)}
								shouldShowLConnector={shouldShowLConnector(index)}
								threadMode={threadMode}
							/>
						))}
						{/* Invisible div for auto-scroll target */}
						<div ref={messagesEndRef} />
					</div>
				</div>

				{/* New messages indicator - shown when scrolled up and new messages arrive */}
				{!threadMode && unreadCount > 0 && !isNearBottom && (
					<NewMessageIndicator
						count={unreadCount}
						onClick={handleNewMessagesClick}
					/>
				)}
			</div>
		);
	},
);
