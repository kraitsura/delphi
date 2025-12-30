/**
 * useAgentConnection - Unified Agent Connection Hook
 *
 * Phase 3: WebSocket Streaming Architecture - Issue delphi-9ni
 *
 * Abstracts HTTP polling and WebSocket streaming behind a unified interface.
 * Uses feature flags to control which connection mode is active.
 *
 * Features:
 * - Seamless fallback from WebSocket to HTTP
 * - Feature flag controlled enablement
 * - Consistent API regardless of connection mode
 * - Streaming text support in WebSocket mode
 */

import { useCallback, useEffect, useState } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { useFeatureFlags } from "@/lib/feature-flags";
import {
	useAgentInvoke,
	type AIMetadata,
	type StructuredData,
} from "./useAgentInvoke";
import { useAgentWebSocket, type AgentResponse, type ToolEvent } from "./useAgentWebSocket";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AgentConnectionOptions {
	roomId: Id<"rooms">;
	eventId?: Id<"events">;
	/** Called when agent response is complete */
	onResponse?: (response: AgentConnectionResponse) => void;
	/** Called for each streaming chunk (WebSocket mode only) */
	onStreaming?: (chunk: string) => void;
	/** Called when agent starts processing */
	onThinking?: (status: string) => void;
	/** Called for tool status updates */
	onToolUpdate?: (tool: string, status: "start" | "complete", result?: unknown) => void;
	/** Called on error */
	onError?: (error: string, recoverable: boolean) => void;
}

export interface AgentConnectionResponse {
	success: boolean;
	response: string;
	roomId: string;
	timestamp: number;
	structuredData?: StructuredData;
	aiMetadata?: AIMetadata;
	intent?: string;
	confidence?: number;
	toolsUsed?: string[];
}

export interface AgentConnectionReturn {
	/** Send message to agent */
	invoke: (message: string, parentMessageId?: Id<"messages">) => Promise<void>;
	/** WebSocket or HTTP connected */
	isConnected: boolean;
	/** Agent is processing a request */
	isInvoking: boolean;
	/** Current thinking status (WebSocket mode only) */
	thinkingStatus: string | null;
	/** Accumulated streaming text (WebSocket mode only) */
	streamingText: string;
	/** Currently executing tools (WebSocket mode only) */
	activeTools: ToolEvent[];
	/** Current connection mode */
	connectionMode: "http" | "websocket";
	/** Connection error (if any) */
	error: string | null;
	/** Quota status for rate limiting */
	quotaStatus: { allowed: boolean; used: number; limit: number } | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAgentConnection(
	options: AgentConnectionOptions
): AgentConnectionReturn {
	const {
		roomId,
		eventId,
		onResponse,
		onStreaming,
		onThinking,
		onToolUpdate,
		onError,
	} = options;

	const { enableWebSocket } = useFeatureFlags();

	// HTTP connection (always available)
	const httpConnection = useAgentInvoke();

	// WebSocket connection (conditional)
	const wsConnection = useAgentWebSocket({
		roomId,
		eventId,
		autoConnect: enableWebSocket,
		onAgentThinking: (status) => {
			onThinking?.(status);
		},
		onAgentChunk: (text) => {
			onStreaming?.(text);
		},
		onAgentComplete: (response) => {
			onResponse?.({
				success: true,
				response: response.text,
				roomId: roomId,
				timestamp: Date.now(),
				structuredData: response.structuredData,
				aiMetadata: {
					intent: response.intent,
					confidence: response.confidence,
					agentType: "SwarmCoordinator",
					toolsUsed: response.toolsUsed,
					structuredData: response.structuredData,
				},
				intent: response.intent,
				confidence: response.confidence,
				toolsUsed: response.toolsUsed,
			});
		},
		onAgentError: (error, recoverable) => {
			onError?.(error, recoverable);
		},
		onToolStart: (tool) => {
			onToolUpdate?.(tool, "start");
		},
		onToolComplete: (tool, result) => {
			onToolUpdate?.(tool, "complete", result);
		},
	});

	// Determine connection mode
	const useWebSocket = enableWebSocket && wsConnection.isConnected;

	// Unified invoke function
	const invoke = useCallback(
		async (message: string, parentMessageId?: Id<"messages">) => {
			if (useWebSocket) {
				// Use WebSocket
				wsConnection.invokeAgent(message, parentMessageId);
			} else {
				// Use HTTP
				const response = await httpConnection.invoke({
					roomId,
					eventId,
					message,
					parentMessageId,
				});

				if (response) {
					onResponse?.({
						success: response.success,
						response: response.response,
						roomId: response.roomId,
						timestamp: response.timestamp,
						structuredData: response.structuredData,
						aiMetadata: response.aiMetadata,
					});
				} else {
					onError?.(httpConnection.error?.message || "Unknown error", true);
				}
			}
		},
		[
			useWebSocket,
			wsConnection,
			httpConnection,
			roomId,
			eventId,
			onResponse,
			onError,
		]
	);

	return {
		invoke,
		isConnected: useWebSocket ? wsConnection.isConnected : true,
		isInvoking: useWebSocket ? wsConnection.isInvoking : httpConnection.isInvoking,
		thinkingStatus: useWebSocket ? wsConnection.thinkingStatus : null,
		streamingText: useWebSocket ? wsConnection.streamingText : "",
		activeTools: useWebSocket ? wsConnection.activeTools : [],
		connectionMode: useWebSocket ? "websocket" : "http",
		error: useWebSocket
			? wsConnection.connectionError
			: httpConnection.error?.message || null,
		quotaStatus: httpConnection.quotaStatus
			? {
					allowed: httpConnection.quotaStatus.allowed,
					used: httpConnection.quotaStatus.used,
					limit: httpConnection.quotaStatus.limit,
				}
			: null,
	};
}

export default useAgentConnection;
