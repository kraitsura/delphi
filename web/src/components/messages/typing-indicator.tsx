/**
 * TypingIndicator Component
 *
 * Displays a subtle "X is typing..." indicator when other users
 * are actively typing in the current context (room).
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { usePresence } from "@/hooks/usePresence";

export function TypingIndicator() {
	const { presentUsers } = usePresence();

	// Get current user to exclude them from typing indicator
	const currentUser = useQuery(api.users.getMyProfile);

	// Filter for users who are typing (excluding current user)
	const typingUsers = presentUsers.filter(
		(user: { userId: string; data?: { status?: string } }) =>
			user.data?.status === "typing" &&
			currentUser &&
			user.userId !== currentUser._id,
	);

	// Don't show anything if no one is typing
	if (typingUsers.length === 0) {
		return null;
	}

	// Generate typing message based on number of users
	const getTypingMessage = () => {
		if (typingUsers.length === 1) {
			return `${typingUsers[0].userName} is typing...`;
		} else if (typingUsers.length === 2) {
			return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
		} else if (typingUsers.length === 3) {
			return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${typingUsers[2].userName} are typing...`;
		} else {
			return `${typingUsers.length} people are typing...`;
		}
	};

	return (
		<div className="px-4 py-2 text-sm text-muted-foreground italic animate-pulse">
			{getTypingMessage()}
		</div>
	);
}
