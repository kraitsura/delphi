import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

/**
 * Hook to manage event invitations
 *
 * Provides mutation functions for:
 * - Sending invitations
 * - Accepting invitations
 * - Declining invitations
 * - Cancelling invitations
 * - Resending invitations
 *
 * And query functions for:
 * - Listing pending invitations for an event
 * - Listing all invitations for an event
 * - Getting user's pending invitations
 *
 * @returns Object with mutation and query functions
 */
export function useInvitations(eventId?: Id<"events">) {
	// Mutations
	const sendInvitation = useMutation(api.eventInvitations.sendInvitation);
	const acceptInvitation = useMutation(api.eventInvitations.acceptInvitation);
	const declineInvitation = useMutation(api.eventInvitations.declineInvitation);
	const cancelInvitation = useMutation(api.eventInvitations.cancelInvitation);
	const resendInvitation = useMutation(api.eventInvitations.resendInvitation);

	// Queries
	const pendingInvitations = useQuery(
		eventId ? api.eventInvitations.listPendingByEvent : undefined,
		eventId ? { eventId } : "skip",
	);

	const allInvitations = useQuery(
		eventId ? api.eventInvitations.listAllByEvent : undefined,
		eventId ? { eventId } : "skip",
	);

	const userInvitations = useQuery(api.eventInvitations.listByEmail);

	// Wrapped mutation functions with error handling and toasts
	const handleSendInvitation = async (params: {
		eventId: Id<"events">;
		invitedEmail: string;
		role: "coordinator" | "collaborator" | "guest";
		message?: string;
	}) => {
		try {
			const result = await sendInvitation(params);
			toast.success("Invitation sent!", {
				description: `An invitation has been sent to ${params.invitedEmail}`,
			});
			return result;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send invitation",
			);
			throw error;
		}
	};

	const handleAcceptInvitation = async (token: string) => {
		try {
			const result = await acceptInvitation({ token });
			toast.success("Invitation accepted!", {
				description: "Welcome to the event team!",
			});
			return result;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to accept invitation",
			);
			throw error;
		}
	};

	const handleDeclineInvitation = async (token: string) => {
		try {
			await declineInvitation({ token });
			toast.success("Invitation declined");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to decline invitation",
			);
			throw error;
		}
	};

	const handleCancelInvitation = async (
		invitationId: Id<"eventInvitations">,
	) => {
		try {
			await cancelInvitation({ invitationId });
			toast.success("Invitation cancelled");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to cancel invitation",
			);
			throw error;
		}
	};

	const handleResendInvitation = async (
		invitationId: Id<"eventInvitations">,
	) => {
		try {
			const result = await resendInvitation({ invitationId });
			toast.success("Invitation resent!", {
				description: "New invitation link generated",
			});
			return result;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to resend invitation",
			);
			throw error;
		}
	};

	return {
		// Mutations
		sendInvitation: handleSendInvitation,
		acceptInvitation: handleAcceptInvitation,
		declineInvitation: handleDeclineInvitation,
		cancelInvitation: handleCancelInvitation,
		resendInvitation: handleResendInvitation,

		// Queries
		pendingInvitations,
		allInvitations,
		userInvitations,

		// Loading states
		isLoadingPending: pendingInvitations === undefined,
		isLoadingAll: allInvitations === undefined,
		isLoadingUser: userInvitations === undefined,
	};
}

/**
 * Simplified hook for just sending invitations
 * Useful in components that only need to send invitations
 */
export function useSendInvitation() {
	const sendInvitation = useMutation(api.eventInvitations.sendInvitation);

	return async (params: {
		eventId: Id<"events">;
		invitedEmail: string;
		role: "coordinator" | "collaborator" | "guest";
		message?: string;
	}) => {
		try {
			const result = await sendInvitation(params);
			toast.success("Invitation sent!", {
				description: `An invitation has been sent to ${params.invitedEmail}`,
			});

			// Copy invitation link to clipboard
			const invitationUrl = `${window.location.origin}${result.invitationUrl}`;
			await navigator.clipboard.writeText(invitationUrl);
			toast.info("Invitation link copied to clipboard");

			return result;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send invitation",
			);
			throw error;
		}
	};
}

/**
 * Hook to get invitation details by token
 * Useful for the invitation acceptance page
 */
export function useInvitationByToken(token: string) {
	const invitationData = useQuery(api.eventInvitations.getByToken, { token });

	return {
		invitation: invitationData?.invitation,
		event: invitationData?.event,
		inviter: invitationData?.inviter,
		isLoading: invitationData === undefined,
		isNotFound: invitationData === null,
	};
}
