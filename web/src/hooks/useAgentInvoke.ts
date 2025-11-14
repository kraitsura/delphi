/**
 * Hook for invoking the Delphi AI agent
 * Handles @Delphi mentions and calls the Cloudflare Worker
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { authClient } from "@/lib/auth";

interface AgentInvokeOptions {
	roomId: Id<"rooms">;
	eventId?: Id<"events">;
	message: string;
}

interface AgentInvokeResponse {
	success: boolean;
	response: string;
	roomId: string;
	timestamp: number;
	messagesFetched?: number;
	conversationTurns?: number;
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

export function useAgentInvoke() {
	const [isInvoking, setIsInvoking] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const invoke = useCallback(
		async ({
			roomId,
			eventId,
			message,
		}: AgentInvokeOptions): Promise<AgentInvokeResponse | null> => {
			setIsInvoking(true);
			setError(null);

			try {
				// Get Convex authentication token via Better Auth
				const { data } = await authClient.convex.token();
				const token = data?.token;

				if (!token) {
					throw new Error("Not authenticated. Please log in to use Delphi.");
				}

				// Clean the message (remove @Delphi mention)
				const cleanMessage = message.replace(/@delphi\s*/gi, "").trim();

				if (!cleanMessage) {
					throw new Error("Please provide a message for Delphi.");
				}

				console.log("[Agent] Invoking Delphi for room:", roomId);

				// Call the Cloudflare Worker
				const response = await fetch(`${WORKER_URL}/api/agent/invoke`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						roomId,
						eventId,
						message: cleanMessage,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(
						errorData.error ||
							`Agent returned ${response.status}: ${response.statusText}`,
					);
				}

				const result: AgentInvokeResponse = await response.json();

				console.log("[Agent] Response received:", {
					success: result.success,
					messagesFetched: result.messagesFetched,
					conversationTurns: result.conversationTurns,
				});

				if (!result.success) {
					throw new Error(result.response || "Agent invocation failed");
				}

				return result;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Unknown error occurred");
				console.error("[Agent] Invocation failed:", error);
				setError(error);
				toast.error(`Delphi encountered an error: ${error.message}`);
				return null;
			} finally {
				setIsInvoking(false);
			}
		},
		[], // No dependencies - authClient is imported directly
	);

	return {
		invoke,
		isInvoking,
		error,
	};
}
