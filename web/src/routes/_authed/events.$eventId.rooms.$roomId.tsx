import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Briefcase,
	Hash,
	Lock,
	Megaphone,
	Settings,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DelphiStatusIndicator } from "@/components/messages/delphi-status-indicator";
import { MessageInput } from "@/components/messages/message-input";
import {
	MessageList,
	type MessageListHandle,
} from "@/components/messages/message-list";
import { QuotaWarning } from "@/components/messages/QuotaWarning";
import { TypingIndicator } from "@/components/messages/typing-indicator";
import { PresenceDisplay } from "@/components/presence";
import { RoomSettingsDrawer } from "@/components/rooms/room-settings-drawer";
import { Button } from "@/components/ui/button";
import { useAgentInvoke } from "@/hooks/useAgentInvoke";
import { useSendMessage } from "@/hooks/useSendMessage";
import { convexQuery } from "@/lib/convex-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/events/$eventId/rooms/$roomId")({
	ssr: false, // Disable SSR - auth token not available during server rendering
	loader: async ({ params, context }) => {
		const eventId = params.eventId as Id<"events">;
		const roomId = params.roomId as Id<"rooms">;

		// Prefetch all data in parallel
		await Promise.all([
			// Event data for EventContext
			context.queryClient.ensureQueryData(
				convexQuery(api.events.getById, { eventId }),
			),
			// Room list for sidebar
			context.queryClient.ensureQueryData(
				convexQuery(api.rooms.listAccessibleForEvent, { eventId }),
			),
			// Current room data
			context.queryClient.ensureQueryData(
				convexQuery(api.rooms.getById, { roomId }),
			),
			// Room stats
			context.queryClient.ensureQueryData(
				convexQuery(api.rooms.getStats, { roomId }),
			),
			// User profile for messaging
			context.queryClient.ensureQueryData(
				convexQuery(api.users.getMyProfile, {}),
			),
			// Messages for the room
			context.queryClient.ensureQueryData(
				convexQuery(api.messages.listByRoom, { roomId, limit: 50 }),
			),
		]);
	},
	component: RoomDetailPage,
});

type RoomType = "main" | "vendor" | "topic" | "guest_announcements" | "private";

function RoomDetailPage() {
	const { eventId, roomId } = Route.useParams();

	// Use useSuspenseQuery to read prefetched data
	const { data: room } = useSuspenseQuery(
		convexQuery(api.rooms.getById, {
			roomId: roomId as Id<"rooms">,
		}),
	);

	const { data: stats } = useSuspenseQuery(
		convexQuery(api.rooms.getStats, {
			roomId: roomId as Id<"rooms">,
		}),
	);

	// Get current user profile for messaging (SSR-compatible)
	const { data: userProfile } = useSuspenseQuery(
		convexQuery(api.users.getMyProfile, {}),
	);

	// Get messages with real-time updates (SSR-compatible)
	const { data: messages } = useSuspenseQuery(
		convexQuery(api.messages.listByRoom, {
			roomId: roomId as Id<"rooms">,
			limit: 50,
		}),
	);

	// Thread view state
	const [viewingThreadId, setViewingThreadId] = useState<Id<"messages"> | null>(
		null,
	);
	const [showEscHint, setShowEscHint] = useState(false);

	// Delphi mention state
	const [mentionsDelphi, setMentionsDelphi] = useState(false);

	// Scroll position restoration
	const messageListRef = useRef<MessageListHandle>(null);
	const savedScrollPositionRef = useRef<number>(0);
	const shouldRestoreScrollRef = useRef<boolean>(false);

	// Get query client for optimistic updates
	const queryClient = useQueryClient();

	// Fetch thread messages when viewing a thread - no loading state, instant display
	const { data: threadMessages } = useQuery({
		...convexQuery(api.messages.getThread, {
			messageId: viewingThreadId as Id<"messages">,
		}),
		enabled: viewingThreadId !== null,
		// Keep previous data while loading new thread for smooth transition
		placeholderData: (previousData) => previousData,
	});

	// Determine which messages to display (thread or normal)
	const displayMessages =
		viewingThreadId && threadMessages ? threadMessages : messages;
	const isThreadMode = viewingThreadId !== null;

	// Message mutation handlers
	const { send, edit, remove, markAsRead } = useSendMessage();

	// Optimistic message send handler using TanStack Query's optimistic updates
	const handleSendWithOptimistic = useCallback(
		async (
			roomId: Id<"rooms">,
			text: string,
			parentMessageId?: Id<"messages">,
		) => {
			// Guard: ensure user profile is loaded
			if (!userProfile) {
				console.error("[Room] Cannot send message: user profile not loaded");
				return;
			}

			// Determine which query to update based on thread mode
			const targetQueryKey = parentMessageId
				? convexQuery(api.messages.getThread, {
						messageId: parentMessageId,
					}).queryKey
				: convexQuery(api.messages.listByRoom, {
						roomId,
						limit: 50,
					}).queryKey;

			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({ queryKey: targetQueryKey });

			// Snapshot the previous value for rollback
			const previousMessages = queryClient.getQueryData(targetQueryKey);

			// Create optimistic message
			const optimisticMessage: Doc<"messages"> & {
				author?: Doc<"users"> | null;
				_isPending?: boolean;
			} = {
				_id: `optimistic-${Date.now()}-${Math.random()}` as Id<"messages">,
				_creationTime: Date.now(),
				roomId,
				authorId: userProfile._id,
				text,
				isEdited: false,
				isDeleted: false,
				isAIGenerated: false,
				createdAt: Date.now(),
				parentMessageId,
				replyCount: 0,
				author: userProfile,
				_isPending: true,
			};

			// Optimistically update the cache
			queryClient.setQueryData(targetQueryKey, (old: any) => {
				if (!old) return [optimisticMessage];
				// Thread queries return ASC order (oldest first) - append to end
				// Room queries return DESC order (newest first) - prepend to beginning
				return parentMessageId
					? [...old, optimisticMessage]
					: [optimisticMessage, ...old];
			});

			// Send the actual message with proper error handling
			send(roomId, text, parentMessageId).catch((error) => {
				// On error, rollback to the previous state
				queryClient.setQueryData(targetQueryKey, previousMessages);
				console.error("[Room] Failed to send message:", error);
				// Error toast is handled by useSendMessage
			});

			// The real message will arrive via Convex WebSocket subscription
			// and automatically replace our optimistic update in the cache
		},
		[send, userProfile, queryClient],
	);

	// Agent invocation handler
	const {
		invoke: invokeAgent,
		isInvoking: isAgentInvoking,
		quotaStatus,
	} = useAgentInvoke();

	// Thread handlers
	const handleOpenThread = useCallback((threadRootId: Id<"messages">) => {
		// Save current scroll position before entering thread view
		if (messageListRef.current) {
			savedScrollPositionRef.current =
				messageListRef.current.getScrollPosition();
		}
		setViewingThreadId(threadRootId);
	}, []);

	const handleCloseThread = useCallback(() => {
		// Mark that we should restore scroll position
		shouldRestoreScrollRef.current = true;
		setViewingThreadId(null);
	}, []);

	// Restore scroll position after exiting thread view
	useEffect(() => {
		if (
			!viewingThreadId &&
			shouldRestoreScrollRef.current &&
			messageListRef.current
		) {
			// Wait for DOM update, then restore scroll position
			requestAnimationFrame(() => {
				messageListRef.current?.setScrollPosition(
					savedScrollPositionRef.current,
				);
				shouldRestoreScrollRef.current = false;
			});
		}
	}, [viewingThreadId]);

	// Agent invoke wrapper - save user message and invoke agent in parallel (fire-and-forget)
	const handleAgentInvoke = async (text: string) => {
		// Determine parent message ID if in thread mode
		const parentMessageId = viewingThreadId || undefined;

		// Save the user's @Delphi message with optimistic update (non-blocking)
		handleSendWithOptimistic(
			roomId as Id<"rooms">,
			text,
			parentMessageId,
		).catch((error) => {
			console.error("[Room] Failed to send message:", error);
		});

		// Invoke agent immediately without waiting (fire-and-forget)
		// The agent response will arrive via Convex WebSocket subscription
		invokeAgent({
			roomId: roomId as Id<"rooms">,
			eventId: eventId as Id<"events">,
			message: text,
			parentMessageId,
		}).catch((error) => {
			console.error("[Room] Failed to invoke agent:", error);
		});
	};

	// Handle ESC key to exit thread view
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && viewingThreadId) {
				handleCloseThread();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [viewingThreadId, handleCloseThread]);

	// Show ESC hint when thread opens, keep visible
	useEffect(() => {
		if (viewingThreadId) {
			setShowEscHint(true);
		} else {
			setShowEscHint(false);
		}
	}, [viewingThreadId]);

	// Mark room as read when messages load
	useEffect(() => {
		if (messages.length > 0) {
			markAsRead(roomId as Id<"rooms">);
		}
	}, [messages.length, roomId, markAsRead]);

	const getRoomIcon = (type: RoomType) => {
		switch (type) {
			case "main":
				return <Hash className="h-6 w-6 text-blue-500" />;
			case "private":
				return <Lock className="h-6 w-6 text-purple-500" />;
			case "guest_announcements":
				return <Megaphone className="h-6 w-6 text-green-500" />;
			case "vendor":
				return <Briefcase className="h-6 w-6 text-orange-500" />;
			default:
				return <Users className="h-6 w-6 text-gray-500" />;
		}
	};

	// Room not found check
	if (!room) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">
					Room not found or you don't have access to it
				</p>
			</div>
		);
	}

	// User profile not found check
	if (!userProfile) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">Unable to load user profile</p>
			</div>
		);
	}

	const canManage = room.membership?.canManage ?? false;

	return (
		<div className="flex flex-col h-full">
			{/* Room Header */}
			<header className="flex-shrink-0 border-b bg-card px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					{/* Back button and room info */}
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<Link
							to="/events/$eventId"
							params={{ eventId }}
							className="flex-shrink-0"
						>
							<Button variant="ghost" size="icon">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>
						{getRoomIcon(room.type as RoomType)}
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h2 className="text-lg font-semibold truncate">{room.name}</h2>
								<span className="text-sm text-muted-foreground flex-shrink-0">
									· {stats.participantCount}{" "}
									{stats.participantCount === 1
										? "participant"
										: "participants"}
								</span>
							</div>
							{room.description && (
								<p className="text-sm text-muted-foreground truncate">
									{room.description}
								</p>
							)}
						</div>
					</div>

					{/* Presence indicators */}
					<PresenceDisplay />

					{/* Settings button */}
					{canManage && (
						<RoomSettingsDrawer
							room={room}
							trigger={
								<Button variant="ghost" size="icon" className="flex-shrink-0">
									<Settings className="h-5 w-5" />
								</Button>
							}
							onUpdate={() => {
								// Room will auto-refresh via reactive query
							}}
						/>
					)}
				</div>
			</header>

			{/* Messages - Scrollable area */}
			<div className="flex-1 overflow-hidden min-h-0 relative">
				{/* Backdrop overlay when viewing thread - smooth transitions */}
				{isThreadMode && (
					<div
						className="absolute inset-0 bg-black/50 z-10 cursor-pointer transition-all duration-300 ease-out hover:bg-black/55 animate-in fade-in"
						onClick={handleCloseThread}
						aria-label="Close thread view (click to exit)"
					/>
				)}

				{/* X button and ESC hint in centered container */}
				{isThreadMode && (
					<div className="absolute top-4 left-4 z-30 flex flex-col items-center gap-1 animate-in fade-in">
						{/* X button */}
						<button
							onClick={handleCloseThread}
							className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
							aria-label="Back to chat"
						>
							<X className="h-6 w-6" strokeWidth={1.5} />
						</button>

						{/* ESC hint */}
						<div
							className={cn(
								"text-[10px] font-medium text-gray-500 dark:text-gray-500 transition-all duration-500",
								showEscHint ? "opacity-100" : "opacity-0 pointer-events-none",
							)}
						>
							ESC
						</div>
					</div>
				)}

				{/* Messages */}
				<div
					className={
						isThreadMode
							? "relative z-20 h-full bg-white animate-in fade-in slide-in-from-bottom-4 duration-300"
							: "h-full"
					}
					onClick={
						isThreadMode
							? (e) => {
									// Don't close if clicking on a dropdown menu (rendered in portal)
									if ((e.target as HTMLElement).closest('[role="menu"]')) {
										return;
									}
									handleCloseThread();
								}
							: undefined
					}
				>
					<MessageList
						ref={messageListRef}
						messages={displayMessages}
						currentUserId={userProfile._id}
						onEdit={edit}
						onDelete={remove}
						onOpenThread={handleOpenThread}
						canEdit={room.membership?.canEdit ?? false}
						canDelete={room.membership?.canDelete ?? false}
						threadMode={isThreadMode}
						disableAutoScroll={shouldRestoreScrollRef.current}
					/>
				</div>
			</div>

			{/* Input - Fixed at bottom */}
			<div className="flex-shrink-0">
				{quotaStatus && (
					<QuotaWarning
						used={quotaStatus.used}
						limit={quotaStatus.limit}
						plan={quotaStatus.plan}
						className="mx-4 mb-2"
					/>
				)}
				<TypingIndicator />
				<div className="relative">
					<DelphiStatusIndicator
						mentionsDelphi={mentionsDelphi}
						isAgentInvoking={isAgentInvoking}
					/>
					<MessageInput
						onSend={(text) =>
							handleSendWithOptimistic(
								roomId as Id<"rooms">,
								text,
								viewingThreadId || undefined,
							)
						}
						onAgentInvoke={handleAgentInvoke}
						isAgentInvoking={isAgentInvoking}
						disabled={!room.membership?.canPost}
						onMentionsDelphiChange={setMentionsDelphi}
						placeholder={
							room.membership?.canPost
								? isThreadMode
									? "Reply to thread... (Use @Delphi to invoke AI)"
									: "Type a message... (Use @Delphi to invoke AI)"
								: "You don't have permission to post in this room"
						}
					/>
				</div>
			</div>
		</div>
	);
}
