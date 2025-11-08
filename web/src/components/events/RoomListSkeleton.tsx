import { Plus } from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * RoomListSkeleton Component
 *
 * Skeleton loader that matches the RoomList layout.
 * Shows placeholder room items while room data is loading.
 */
export function RoomListSkeleton() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>
				<Skeleton className="h-4 w-16" />
			</SidebarGroupLabel>

			<SidebarGroupAction title="Create Room">
				<Plus className="h-4 w-4 opacity-50" />
			</SidebarGroupAction>

			<SidebarGroupContent>
				<SidebarMenu>
					<div className="space-y-2 px-2">
						{[...Array(3)].map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loader placeholders
							<div key={`room-skeleton-${i}`} className="flex items-start gap-3">
								<Skeleton className="h-10 w-10 rounded-full shrink-0" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-full" />
								</div>
							</div>
						))}
					</div>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
