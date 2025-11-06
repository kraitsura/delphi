import { cn } from "@/lib/utils";

const STATUS_CONFIGS = {
	planning: {
		label: "Planning",
		className:
			"bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
	},
	in_progress: {
		label: "In Progress",
		className:
			"bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400",
	},
	completed: {
		label: "Completed",
		className:
			"bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
	},
	cancelled: {
		label: "Cancelled",
		className:
			"bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
	},
	archived: {
		label: "Archived",
		className:
			"bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
	},
} as const;

const SIZE_CLASSES = {
	sm: "text-xs px-2 py-0.5",
	md: "text-sm px-3 py-1",
	lg: "text-base px-4 py-1.5",
} as const;

interface StatusBadgeProps {
	status: keyof typeof STATUS_CONFIGS;
	size?: keyof typeof SIZE_CLASSES;
	className?: string;
}

export function StatusBadge({
	status,
	size = "md",
	className,
}: StatusBadgeProps) {
	const config = STATUS_CONFIGS[status];
	const sizeClass = SIZE_CLASSES[size];

	return (
		<span
			className={cn(
				"rounded-full font-medium whitespace-nowrap inline-block",
				config.className,
				sizeClass,
				className,
			)}
		>
			{config.label}
		</span>
	);
}
