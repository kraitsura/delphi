import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect } from "react";

/**
 * Track user activity by updating lastActiveAt timestamp
 * Updates immediately on mount, then every 5 minutes
 */
export function useActivityTracker() {
	const updateLastActive = useMutation(api.users.updateLastActive);

	useEffect(() => {
		// Update immediately when hook mounts
		updateLastActive({}).catch((error) => {
			// Silently fail if user is not authenticated
			if (!error.message?.includes("Unauthorized")) {
				console.error("Failed to update activity:", error);
			}
		});

		// Update every 5 minutes
		const interval = setInterval(
			() => {
				updateLastActive({}).catch((error) => {
					// Silently fail if user is not authenticated
					if (!error.message?.includes("Unauthorized")) {
						console.error("Failed to update activity:", error);
					}
				});
			},
			5 * 60 * 1000,
		); // 5 minutes

		return () => clearInterval(interval);
	}, [updateLastActive]);
}
