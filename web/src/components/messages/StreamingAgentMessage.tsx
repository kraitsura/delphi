/**
 * StreamingAgentMessage - Progressive Response Rendering Component
 *
 * Phase 3: WebSocket Streaming Architecture - Issue delphi-iup
 *
 * Displays agent response as it streams in with:
 * - Thinking status indicator
 * - Active tool badges
 * - Progressive text rendering with typing cursor
 * - Smooth animations
 */

import { Loader2, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/hooks/useAgentWebSocket";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StreamingAgentMessageProps {
	/** Accumulated streaming text */
	streamingText: string;
	/** Currently executing tools */
	activeTools: ToolEvent[];
	/** Current thinking status */
	thinkingStatus: string | null;
	/** Show the typing cursor */
	showCursor?: boolean;
	/** Additional class name */
	className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format tool name for display
 * convex_crud -> Convex CRUD
 * web_search -> Web Search
 */
function formatToolName(tool: string): string {
	return tool
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Get tool icon and color based on tool type
 */
function getToolStyle(tool: string): { icon: React.ReactNode; bgColor: string } {
	const lowerTool = tool.toLowerCase();

	if (lowerTool.includes("convex") || lowerTool.includes("crud")) {
		return {
			icon: <Loader2 className="w-3 h-3 animate-spin" />,
			bgColor: "bg-blue-100 text-blue-700 border-blue-200",
		};
	}

	if (lowerTool.includes("search") || lowerTool.includes("web")) {
		return {
			icon: <Loader2 className="w-3 h-3 animate-spin" />,
			bgColor: "bg-green-100 text-green-700 border-green-200",
		};
	}

	if (lowerTool.includes("firecrawl") || lowerTool.includes("scrape")) {
		return {
			icon: <Loader2 className="w-3 h-3 animate-spin" />,
			bgColor: "bg-orange-100 text-orange-700 border-orange-200",
		};
	}

	return {
		icon: <Wrench className="w-3 h-3" />,
		bgColor: "bg-gray-100 text-gray-700 border-gray-200",
	};
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StreamingAgentMessage({
	streamingText,
	activeTools,
	thinkingStatus,
	showCursor = true,
	className,
}: StreamingAgentMessageProps) {
	// Don't render if nothing to show
	if (!streamingText && !thinkingStatus && activeTools.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"group flex gap-3 px-4 py-3",
				"animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
				className
			)}
		>
			{/* Avatar */}
			<Avatar className="h-8 w-8 flex-shrink-0">
				<AvatarFallback className="bg-purple-600 text-white">
					<Sparkles className="h-4 w-4" />
				</AvatarFallback>
			</Avatar>

			{/* Content */}
			<div className="flex flex-col flex-1 min-w-0 gap-2">
				{/* Header - Thinking Status */}
				{thinkingStatus && (
					<div className="flex items-center gap-2 text-sm text-purple-600">
						<Sparkles className="w-4 h-4 animate-pulse" />
						<span className="animate-pulse">{thinkingStatus}</span>
					</div>
				)}

				{/* Active Tools */}
				{activeTools.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{activeTools.map((toolEvent, index) => {
							const { icon, bgColor } = getToolStyle(toolEvent.tool);
							const isComplete = toolEvent.endTime !== undefined;

							return (
								<Badge
									key={`${toolEvent.tool}-${index}`}
									variant="outline"
									className={cn(
										"px-2 py-0.5 text-xs font-medium transition-all",
										bgColor,
										isComplete && "opacity-60"
									)}
								>
									{!isComplete && icon}
									<span className="ml-1">{formatToolName(toolEvent.tool)}</span>
									{isComplete && (
										<span className="ml-1 text-green-600">
											{toolEvent.success ? "" : ""}
										</span>
									)}
								</Badge>
							);
						})}
					</div>
				)}

				{/* Streaming Text */}
				{streamingText && (
					<div
						className={cn(
							"relative max-w-[85%] rounded-2xl px-4 py-2.5",
							"bg-purple-50 dark:bg-purple-950/30",
							"border border-purple-100 dark:border-purple-900/50"
						)}
					>
						{/* Sender name */}
						<div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
							Delphi
						</div>

						{/* Markdown content */}
						<div className="prose prose-sm dark:prose-invert max-w-none break-words">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{streamingText}
							</ReactMarkdown>

							{/* Typing cursor */}
							{showCursor && (
								<span
									className={cn(
										"inline-block w-0.5 h-4 bg-purple-500 ml-0.5 align-text-bottom",
										"animate-blink"
									)}
								/>
							)}
						</div>
					</div>
				)}

				{/* Placeholder when only thinking */}
				{!streamingText && thinkingStatus && activeTools.length === 0 && (
					<div
						className={cn(
							"flex items-center gap-2 max-w-[60%] rounded-2xl px-4 py-3",
							"bg-purple-50 dark:bg-purple-950/30",
							"border border-purple-100 dark:border-purple-900/50"
						)}
					>
						<div className="flex gap-1">
							<span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
							<span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
							<span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default StreamingAgentMessage;
