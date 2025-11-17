/**
 * Hook for invoking the Delphi AI agent
 * Handles @Delphi mentions and calls the Cloudflare Worker
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";
import type { DashboardConfig } from "@/lib/fluid-ui/types";

interface AgentInvokeOptions {
	roomId: Id<"rooms">;
	eventId?: Id<"events">;
	message: string;
	parentMessageId?: Id<"messages">;
}

// Structured data types for AI responses
export type ProposalMetadata = {
	proposalId: string;
	proposalType: "tasks" | "budget_entries" | "vendor_suggestions";
	items: Array<{
		type: string;
		data: any;
		reasoning?: string;
	}>;
	expiresAt: number;
	requiresConfirmation: boolean;
	createdAt: number;
	status?: "pending" | "accepted" | "rejected" | "expired";
};

export type StructuredData =
	| { type: "dashboard"; config: DashboardConfig }
	| { type: "proposal"; proposal: ProposalMetadata }
	| {
			type: "task_result";
			totalRequested: number;
			successfullyCreated: number;
	  };

// AI metadata for agent responses
export interface AIMetadata {
	intent: string;
	confidence: number;
	agentType: string;
	toolsUsed: string[];
	structuredData?: StructuredData;
}

interface AgentInvokeResponse {
	success: boolean;
	response: string;
	roomId: string;
	timestamp: number;
	messagesFetched?: number;
	conversationTurns?: number;
	// NEW: Structured data for Fluid UI rendering
	structuredData?: StructuredData;
	aiMetadata?: AIMetadata;
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

export function useAgentInvoke() {
	const [isInvoking, setIsInvoking] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Check user's quota status
	const quotaStatus = useQuery(api.usageTracking.checkQuota);
	const incrementUsage = useMutation(api.usageTracking.incrementUsage);

	const invoke = useCallback(
		async ({
			roomId,
			eventId,
			message,
			parentMessageId,
		}: AgentInvokeOptions): Promise<AgentInvokeResponse | null> => {
			setIsInvoking(true);
			setError(null);

			try {
				// Check quota before invoking
				if (quotaStatus && !quotaStatus.allowed) {
					throw new Error(
						`Weekly limit reached (${quotaStatus.used}/${quotaStatus.limit} on free plan). Contact admin for unlimited access.`,
					);
				}

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

				// Call the Cloudflare Worker (Track 3: RoomOrchestratorDO endpoint)
				const response = await fetch(
					`${WORKER_URL}/api/room/${roomId}/invoke`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							roomId,
							eventId,
							message: cleanMessage,
							parentMessageId,
						}),
					},
				);

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

				// Increment usage after successful invocation
				await incrementUsage({});

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
		[incrementUsage, quotaStatus],
	);

	return {
		invoke,
		isInvoking,
		error,
		quotaStatus, // Expose quota status for UI display
	};
}
