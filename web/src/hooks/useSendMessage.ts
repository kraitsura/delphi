import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

/**
 * Hook to send messages in a room
 *
 * Provides mutation functions for:
 * - Sending new messages
 * - Editing messages
 * - Deleting messages
 * - Marking room as read
 *
 * @returns Object with mutation functions
 */
export function useSendMessage() {
	const sendMessage = useMutation(api.messages.send);
	const editMessage = useMutation(api.messages.update);
	const deleteMessage = useMutation(api.messages.remove);
	const markAsRead = useMutation(api.messages.markRoomAsRead);

	const handleSend = async (
		roomId: Parameters<typeof sendMessage>[0]["roomId"],
		text: string
	) => {
		try {
			await sendMessage({ roomId, text });
		} catch (error) {
			toast.error(
				`Failed to send message: ${error instanceof Error ? error.message : "An error occurred"}`
			);
			throw error;
		}
	};

	const handleEdit = async (
		messageId: Parameters<typeof editMessage>[0]["messageId"],
		text: string
	) => {
		try {
			await editMessage({ messageId, text });
			toast.success("Message updated successfully");
		} catch (error) {
			toast.error(
				`Failed to edit message: ${error instanceof Error ? error.message : "An error occurred"}`
			);
			throw error;
		}
	};

	const handleDelete = async (
		messageId: Parameters<typeof deleteMessage>[0]["messageId"]
	) => {
		try {
			await deleteMessage({ messageId });
			toast.success("Message deleted");
		} catch (error) {
			toast.error(
				`Failed to delete message: ${error instanceof Error ? error.message : "An error occurred"}`
			);
			throw error;
		}
	};

	const handleMarkAsRead = async (
		roomId: Parameters<typeof markAsRead>[0]["roomId"]
	) => {
		try {
			await markAsRead({ roomId });
		} catch (error) {
			// Silent fail for read receipts - not critical
			console.error("Failed to mark room as read:", error);
		}
	};

	return {
		send: handleSend,
		edit: handleEdit,
		remove: handleDelete,
		markAsRead: handleMarkAsRead,
	};
}
