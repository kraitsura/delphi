import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@/lib/convex-query";
import {
	ArrowLeft,
	Briefcase,
	Hash,
	Lock,
	Megaphone,
	Settings,
	Users,
} from "lucide-react";
import { RoomSettingsDrawer } from "@/components/rooms/room-settings-drawer";
import { MessageList } from "@/components/messages/message-list";
import { MessageInput } from "@/components/messages/message-input";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useEffect } from "react";

export const Route = createFileRoute("/_authed/events/$eventId/rooms/$roomId")({
	ssr: false, // Disable SSR - auth token not available during server rendering
	loader: async ({ params, context }) => {
		const eventId = params.eventId as Id<"events">;
		const roomId = params.roomId as Id<"rooms">;

		// Prefetch event data (for EventContext)
		await context.queryClient.ensureQueryData(
			convexQuery(api.events.getById, { eventId })
		);

		// Prefetch room data
		await context.queryClient.ensureQueryData(
			convexQuery(api.rooms.getById, { roomId })
		);

		// Prefetch room stats
		await context.queryClient.ensureQueryData(
			convexQuery(api.rooms.getStats, { roomId })
		);

		// Prefetch user profile for messaging
		await context.queryClient.ensureQueryData(
			convexQuery(api.users.getMyProfile, {})
		);

		// Prefetch messages for the room
		await context.queryClient.ensureQueryData(
			convexQuery(api.messages.listByRoom, { roomId, limit: 50 })
		);
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
		})
	);

	const { data: stats } = useSuspenseQuery(
		convexQuery(api.rooms.getStats, {
			roomId: roomId as Id<"rooms">,
		})
	);

	// Get current user profile for messaging (SSR-compatible)
	const { data: userProfile } = useSuspenseQuery(
		convexQuery(api.users.getMyProfile, {})
	);

	// Get messages with real-time updates (SSR-compatible)
	const { data: messages } = useSuspenseQuery(
		convexQuery(api.messages.listByRoom, {
			roomId: roomId as Id<"rooms">,
			limit: 50,
		})
	);

	// Message mutation handlers
	const { send, edit, remove, markAsRead } = useSendMessage();

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

	const getRoomTypeLabel = (type: RoomType) => {
		switch (type) {
			case "main":
				return "Main Planning";
			case "private":
				return "Private";
			case "guest_announcements":
				return "Guest Announcements";
			case "vendor":
				return "Vendor";
			case "topic":
				return "Topic";
			default:
				return "Other";
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

	const canManage = room.membership?.canManage ?? false;

	return (
		<div className="-m-4 flex flex-col pb-4">
			{/* Header */}
			<header className="flex-shrink-0 border-b bg-card px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					{/* Left: Back button + Room info */}
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<Link to="/events/$eventId/" params={{ eventId }}>
							<Button variant="ghost" size="icon" className="flex-shrink-0">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>

						<div className="flex items-center gap-3 min-w-0 flex-1">
							{getRoomIcon(room.type as RoomType)}
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<h1 className="text-lg font-semibold truncate">
										{room.name}
									</h1>
									<span className="text-sm text-muted-foreground flex-shrink-0">
										· {stats.participantCount}{" "}
										{stats.participantCount === 1 ? "participant" : "participants"}
									</span>
								</div>
								{room.description && (
									<p className="text-sm text-muted-foreground truncate">
										{room.description}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Right: Settings button */}
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
			<div className="flex-1 overflow-hidden min-h-0">
				<MessageList
					messages={messages}
					currentUserId={userProfile._id}
					onEdit={(messageId, newText) => edit(messageId, newText)}
					onDelete={(messageId) => remove(messageId)}
					canEdit={room.membership?.canEdit ?? false}
					canDelete={room.membership?.canDelete ?? false}
				/>
			</div>

			{/* Input - Fixed at bottom */}
			<div className="flex-shrink-0">
				<MessageInput
					onSend={(text) => send(roomId as Id<"rooms">, text)}
					disabled={!room.membership?.canPost}
					placeholder={
						room.membership?.canPost
							? "Type a message..."
							: "You don't have permission to post in this room"
					}
				/>
			</div>
		</div>
	);
}
