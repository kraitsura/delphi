import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useSession } from "@/lib/auth";

/**
 * Track user activity by updating lastActiveAt timestamp
 * Updates immediately on mount (once authenticated), then every 5 minutes
 */
export function useActivityTracker() {
	const { data: session } = useSession();
	const updateLastActive = useMutation(api.users.updateLastActive);

	useEffect(() => {
		// Only track activity once session is ready
		if (!session?.user) return;

		// Update immediately when hook mounts
		updateLastActive({}).catch((error) => {
			// Silently fail if user is not authenticated
			if (
				!error.message?.includes("Unauthorized") &&
				!error.message?.includes("Unauthenticated")
			) {
				console.error("Failed to update activity:", error);
			}
		});

		// Update every 5 minutes
		const interval = setInterval(
			() => {
				updateLastActive({}).catch((error) => {
					// Silently fail if user is not authenticated
					if (
						!error.message?.includes("Unauthorized") &&
						!error.message?.includes("Unauthenticated")
					) {
						console.error("Failed to update activity:", error);
					}
				});
			},
			5 * 60 * 1000,
		); // 5 minutes

		return () => clearInterval(interval);
	}, [updateLastActive, session?.user]);
}
