import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { convexQuery } from "@/lib/convex-query";
import { cn } from "@/lib/utils";

interface ThreadRootPreviewProps {
	rootMessage: Doc<"messages"> & {
		author?: Doc<"users"> | null;
	};
	currentUserId: Id<"users">;
	isReplyOnSameSide: boolean;
	onClick: () => void;
	className?: string;
}

export function ThreadRootPreview({
	rootMessage,
	currentUserId,
	isReplyOnSameSide,
	onClick,
	className,
}: ThreadRootPreviewProps) {
	const queryClient = useQueryClient();
	const isAIGenerated = rootMessage.isAIGenerated ?? false;
	const isOwnMessage = !isAIGenerated && rootMessage.authorId === currentUserId;

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const senderName = isAIGenerated
		? "Delphi"
		: rootMessage.author?.name || "Unknown User";

	// Truncate message text to 2 lines max (~80 chars)
	const truncatedText =
		rootMessage.text.length > 80
			? `${rootMessage.text.slice(0, 80)}...`
			: rootMessage.text;

	const handleMouseEnter = () => {
		// Pre-fetch thread data on hover for instant loading
		queryClient.prefetchQuery(
			convexQuery(api.messages.getThread, {
				messageId: rootMessage._id,
			}),
		);
	};

	return (
		<div className={cn("relative px-4 py-1", className)}>
			{/* Thread connection indicator */}
			<svg
				className={cn(
					"absolute pointer-events-none",
					isReplyOnSameSide
						? isOwnMessage
							? "left-4" // Same side: U bracket on opposite side (messages on right → bracket on left)
							: "right-4" // Same side: U bracket on opposite side (messages on left → bracket on right)
						: isOwnMessage
							? "left-[68px]" // Different sides: corner on opposite side (root right → corner left)
							: "right-[68px]", // Different sides: corner on opposite side (root left → corner right)
				)}
				style={{
					top: isReplyOnSameSide ? "calc(100% - 12px)" : "26px",
					width: isReplyOnSameSide ? "20px" : "20px",
					height: isReplyOnSameSide ? "40px" : "20px",
				}}
			>
				{isReplyOnSameSide ? (
					// U bracket [ or ] on opposite side
					<path
						d={
							isOwnMessage
								? "M 20,0 L 0,0 L 0,40 L 20,40" // Left bracket [ (messages on right)
								: "M 0,0 L 20,0 L 20,40 L 0,40" // Right bracket ] (messages on left)
						}
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
						className="text-border opacity-70"
					/>
				) : (
					// Simple L-shaped corner: ┌ for right, ┐ for left (swapped)
					<path
						d={
							isOwnMessage
								? "M 20,0 L 0,0 L 0,20" // ┌ shape (root right, reply left)
								: "M 0,0 L 20,0 L 20,20" // ┐ shape (root left, reply right)
						}
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
						className="text-border opacity-70"
					/>
				)}
			</svg>

			{/* Compact root message preview - Apple Messages style */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onClick();
				}}
				onMouseEnter={handleMouseEnter}
				className={cn(
					"relative flex items-start gap-2 w-full text-left group",
					isOwnMessage && "flex-row-reverse",
				)}
			>
				{/* Avatar */}
				<Avatar className="h-6 w-6 flex-shrink-0 mt-0.5 relative z-10 bg-background ring-2 ring-background">
					{isAIGenerated ? (
						<AvatarFallback className="bg-purple-600 text-white">
							<Sparkles className="h-3 w-3" />
						</AvatarFallback>
					) : (
						<>
							<AvatarImage src={rootMessage.author?.avatar} />
							<AvatarFallback className="bg-blue-500 text-white text-[10px]">
								{getInitials(senderName)}
							</AvatarFallback>
						</>
					)}
				</Avatar>

				{/* Message bubble preview - border only, theme-aware */}
				<div
					className={cn(
						"flex-1 min-w-0 max-w-[60%] rounded-lg px-3 py-2",
						"border transition-colors cursor-pointer",
						// Theme-aware border and hover colors
						"border-border hover:bg-accent/50",
					)}
				>
					{/* Sender name - only show for non-own messages */}
					{!isOwnMessage && (
						<div
							className={cn(
								"text-[10px] font-semibold mb-0.5",
								isAIGenerated
									? "text-purple-600 dark:text-purple-400"
									: "text-foreground",
							)}
						>
							{senderName}
						</div>
					)}
					{/* Truncated message text - theme-aware */}
					<p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground">
						{truncatedText}
					</p>
				</div>
			</button>
		</div>
	);
}
