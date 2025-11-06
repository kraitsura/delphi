import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * EventSidebarToolbarSkeleton Component
 *
 * Skeleton loader that matches the EventSidebarToolbar layout.
 * Shows placeholder buttons while event data is loading.
 */
export function EventSidebarToolbarSkeleton() {
	return (
		<div className="flex items-center justify-between gap-1 px-2 py-2">
			<TooltipProvider delayDuration={0}>
				<div className="flex items-center gap-1">
					{/* Profile, Dashboard, Events buttons */}
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-8 w-8 rounded-md" />
					))}
				</div>

				<div className="flex items-center gap-1">
					{/* Theme and Sign Out buttons */}
					{[...Array(2)].map((_, i) => (
						<Skeleton key={i} className="h-8 w-8 rounded-md" />
					))}
				</div>
			</TooltipProvider>
		</div>
	);
}
