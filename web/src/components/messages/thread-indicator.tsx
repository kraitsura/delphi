import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { convexQuery } from "@/lib/convex-query";
import { cn } from "@/lib/utils";

interface ThreadIndicatorProps {
	replyCount: number;
	threadRootId: Id<"messages">;
	onClick: () => void;
	className?: string;
}

export function ThreadIndicator({
	replyCount,
	threadRootId,
	onClick,
	className,
}: ThreadIndicatorProps) {
	const queryClient = useQueryClient();

	if (replyCount === 0) return null;

	const handleMouseEnter = () => {
		// Pre-fetch thread data on hover for instant loading
		queryClient.prefetchQuery(
			convexQuery(api.messages.getThread, {
				messageId: threadRootId,
			}),
		);
	};

	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onMouseEnter={handleMouseEnter}
			className={cn(
				"inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
				"text-xs font-medium",
				"bg-blue-50 hover:bg-blue-100 text-blue-600",
				"transition-colors cursor-pointer",
				"border border-blue-200",
				className,
			)}
		>
			<MessageSquare className="h-3 w-3" />
			<span>
				{replyCount} {replyCount === 1 ? "reply" : "replies"}
			</span>
		</button>
	);
}
