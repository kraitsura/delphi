import { ArrowLeft, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * RoomChatSkeleton Component
 * Loading skeleton for the room chat view
 * Matches the layout of the actual room chat for a smooth transition
 */
export function RoomChatSkeleton() {
	return (
		<div className="flex flex-col h-full">
			{/* Header Skeleton */}
			<header className="flex-shrink-0 border-b bg-card px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					{/* Back button and room info */}
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<Button variant="ghost" size="icon" disabled>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<Hash className="h-6 w-6 text-muted-foreground/50 animate-pulse" />
						<div className="min-w-0 flex-1 space-y-2">
							<div className="flex items-center gap-2">
								<div className="h-5 bg-muted rounded w-32 animate-pulse" />
								<div className="h-4 bg-muted rounded w-24 animate-pulse" />
							</div>
							<div className="h-3 bg-muted rounded w-48 animate-pulse" />
						</div>
					</div>
				</div>
			</header>

			{/* Messages Area Skeleton */}
			<div className="flex-1 overflow-hidden min-h-0 bg-background">
				<div className="h-full overflow-y-auto">
					<div className="space-y-4 p-4">
						{[1, 2, 3, 4].map((i) => (
							<MessageSkeleton key={i} delay={i * 100} />
						))}
					</div>
				</div>
			</div>

			{/* Input Area Skeleton */}
			<div className="flex-shrink-0 border-t bg-background p-4">
				<div className="flex gap-2">
					<div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
					<div className="h-10 w-10 bg-muted rounded-md animate-pulse" />
				</div>
			</div>
		</div>
	);
}

/**
 * MessageSkeleton Component
 * Individual message loading skeleton
 */
function MessageSkeleton({ delay = 0 }: { delay?: number }) {
	return (
		<div
			className="flex gap-3 animate-in fade-in"
			style={{ animationDelay: `${delay}ms` }}
		>
			{/* Avatar */}
			<div className="h-10 w-10 rounded-full bg-muted animate-pulse" />

			{/* Message content */}
			<div className="flex-1 space-y-2">
				{/* Author name and timestamp */}
				<div className="flex items-center gap-2">
					<div className="h-4 bg-muted rounded w-24 animate-pulse" />
					<div className="h-3 bg-muted rounded w-16 animate-pulse" />
				</div>

				{/* Message text - varied widths for realism */}
				<div className="space-y-2">
					<div
						className={cn(
							"h-4 bg-muted rounded animate-pulse",
							delay % 3 === 0 ? "w-full" : delay % 3 === 1 ? "w-3/4" : "w-2/3",
						)}
					/>
					{delay % 2 === 0 && (
						<div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
					)}
				</div>
			</div>
		</div>
	);
}
