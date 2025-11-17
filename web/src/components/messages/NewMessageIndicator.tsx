import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewMessageIndicatorProps {
	count: number;
	onClick: () => void;
	className?: string;
}

export function NewMessageIndicator({
	count,
	onClick,
	className,
}: NewMessageIndicatorProps) {
	if (count === 0) return null;

	const messageText = count === 1 ? "new message" : "new messages";

	return (
		<button
			onClick={onClick}
			className={cn(
				"fixed bottom-20 left-1/2 -translate-x-1/2 z-10",
				"flex items-center gap-2 px-4 py-2 rounded-full",
				"bg-blue-500 hover:bg-blue-600 text-white",
				"shadow-lg hover:shadow-xl",
				"transition-all duration-200 ease-in-out",
				"text-sm font-medium",
				"animate-in fade-in slide-in-from-bottom-2",
				className,
			)}
		>
			<ChevronDown className="h-4 w-4" />
			<span>
				+{count} {messageText}
			</span>
		</button>
	);
}
