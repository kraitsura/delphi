import { Skeleton } from "@/components/ui/skeleton";

/**
 * AppSidebarProfileSkeleton Component
 *
 * Skeleton loader for the user profile section in the normal sidebar.
 * Shows placeholder avatar and text while session data is loading.
 */
export function AppSidebarProfileSkeleton() {
	return (
		<div className="flex items-center gap-3 px-2 py-2 h-12 overflow-hidden group-data-[collapsible=icon]:gap-0">
			{/* Avatar skeleton */}
			<Skeleton className="h-8 w-8 rounded-full shrink-0" />

			{/* Name and email skeleton */}
			<div className="flex flex-col flex-1 min-w-0 gap-1 group-data-[collapsible=icon]:hidden">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-32" />
			</div>
		</div>
	);
}
