/**
 * useAgentWebSocket - WebSocket hook for streaming agent responses
 *
 * Phase 3: WebSocket Streaming Architecture - Issue delphi-2yc
 *
 * Features:
 * - WebSocket connection with hibernation support
 * - Automatic reconnection with exponential backoff
 * - Progressive text streaming
 * - Tool execution visibility
 * - Typing indicators and presence
 *
 * Usage:
 * ```tsx
 * const { invokeAgent, isConnected, isInvoking, streamingText, activeTools } =
 *   useAgentWebSocket({
 *     roomId: "room_123",
 *     eventId: "event_456",
 *     onAgentComplete: (response) => console.log(response),
 *   });
 *
 * // Invoke agent
 * invokeAgent("Create a task for venue booking");
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth";
import type { Id } from "@convex/_generated/dataModel";
import type { AIMetadata, StructuredData } from "./useAgentInvoke";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Agent response structure (matches backend protocol)
 */
export interface AgentResponse {
	text: string;
	intent: string;
	confidence: number;
	toolsUsed: string[];
	structuredData?: StructuredData;
	metadata?: {
		totalIterations?: number;
		wasSuccessful?: boolean;
		totalChunks?: number;
		intents?: string[];
		agentsInvoked?: string[];
	};
}

/**
 * Tool execution event
 */
export interface ToolEvent {
	tool: string;
	params?: Record<string, unknown>;
	result?: unknown;
	success?: boolean;
	startTime: number;
	endTime?: number;
}

/**
 * Hook options
 */
export interface UseAgentWebSocketOptions {
	roomId: Id<"rooms">;
	eventId?: Id<"events">;
	/** Called when agent starts processing */
	onAgentThinking?: (status: string) => void;
	/** Called for each text chunk during streaming */
	onAgentChunk?: (text: string, index: number) => void;
	/** Called when agent completes response */
	onAgentComplete?: (response: AgentResponse) => void;
	/** Called on agent error */
	onAgentError?: (error: string, recoverable: boolean) => void;
	/** Called when tool execution starts */
	onToolStart?: (tool: string, params: unknown) => void;
	/** Called when tool execution completes */
	onToolComplete?: (tool: string, result: unknown, success: boolean) => void;
	/** Called for typing indicator updates */
	onTypingUpdate?: (userId: string, isTyping: boolean) => void;
	/** Called for presence updates */
	onPresenceUpdate?: (users: Array<{ userId: string; isTyping: boolean }>) => void;
	/** Auto-connect on mount (default: true) */
	autoConnect?: boolean;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Hook return type
 */
export interface UseAgentWebSocketReturn {
	/** Send message to agent */
	invokeAgent: (message: string, parentMessageId?: Id<"messages">) => void;
	/** Send typing indicator */
	sendTyping: (isTyping: boolean) => void;
	/** WebSocket connection state */
	isConnected: boolean;
	/** Agent is processing a request */
	isInvoking: boolean;
	/** Current thinking status */
	thinkingStatus: string | null;
	/** Accumulated streaming text */
	streamingText: string;
	/** Currently executing tools */
	activeTools: ToolEvent[];
	/** Manually reconnect */
	reconnect: () => void;
	/** Manually disconnect */
	disconnect: () => void;
	/** Connection error (if any) */
	connectionError: string | null;
	/** Number of reconnect attempts */
	reconnectAttempts: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (baseUrl: string): string => {
	const url = new URL(baseUrl);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	return url.origin;
};

const WS_URL = getWebSocketUrl(WORKER_URL);

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAgentWebSocket(
	options: UseAgentWebSocketOptions
): UseAgentWebSocketReturn {
	const {
		roomId,
		eventId,
		onAgentThinking,
		onAgentChunk,
		onAgentComplete,
		onAgentError,
		onToolStart,
		onToolComplete,
		onTypingUpdate,
		onPresenceUpdate,
		autoConnect = true,
		debug = false,
	} = options;

	// State
	const [isConnected, setIsConnected] = useState(false);
	const [isInvoking, setIsInvoking] = useState(false);
	const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);
	const [streamingText, setStreamingText] = useState("");
	const [activeTools, setActiveTools] = useState<ToolEvent[]>([]);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);

	// Refs
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const shouldReconnectRef = useRef(true);
	const pingIntervalRef = useRef<number | null>(null);

	// Debug logging
	const log = useCallback(
		(...args: unknown[]) => {
			if (debug) {
				console.log("[useAgentWebSocket]", ...args);
			}
		},
		[debug]
	);

	// Get auth token
	const getToken = useCallback(async (): Promise<string | null> => {
		try {
			const { data } = await authClient.convex.token();
			return data?.token || null;
		} catch (error) {
			log("Failed to get auth token:", error);
			return null;
		}
	}, [log]);

	// Handle incoming WebSocket messages
	const handleMessage = useCallback(
		(event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);
				log("Received message:", data.type);

				switch (data.type) {
					case "agent_thinking":
						setThinkingStatus(data.status);
						onAgentThinking?.(data.status);
						break;

					case "agent_chunk":
						setStreamingText((prev) => prev + data.text);
						onAgentChunk?.(data.text, data.index);
						break;

					case "agent_tool_start":
						setActiveTools((prev) => [
							...prev,
							{
								tool: data.tool,
								params: data.params,
								startTime: Date.now(),
							},
						]);
						onToolStart?.(data.tool, data.params);
						break;

					case "agent_tool_complete":
						setActiveTools((prev) =>
							prev.map((t) =>
								t.tool === data.tool
									? { ...t, result: data.result, success: data.success, endTime: Date.now() }
									: t
							)
						);
						onToolComplete?.(data.tool, data.result, data.success);
						break;

					case "agent_complete":
						setIsInvoking(false);
						setThinkingStatus(null);
						setStreamingText("");
						setActiveTools([]);
						onAgentComplete?.(data.response);
						break;

					case "agent_error":
						setIsInvoking(false);
						setThinkingStatus(null);
						setActiveTools([]);
						onAgentError?.(data.error, data.recoverable);
						break;

					case "typing_update":
						onTypingUpdate?.(data.userId, data.isTyping);
						break;

					case "presence_update":
						onPresenceUpdate?.(data.users);
						break;

					case "pong":
						log("Received pong");
						break;

					default:
						log("Unknown message type:", data.type);
				}
			} catch (error) {
				log("Failed to parse message:", error);
			}
		},
		[
			onAgentThinking,
			onAgentChunk,
			onAgentComplete,
			onAgentError,
			onToolStart,
			onToolComplete,
			onTypingUpdate,
			onPresenceUpdate,
			log,
		]
	);

	// Connect to WebSocket
	const connect = useCallback(async () => {
		// Don't connect if already connected or connecting
		if (
			wsRef.current &&
			(wsRef.current.readyState === WebSocket.OPEN ||
				wsRef.current.readyState === WebSocket.CONNECTING)
		) {
			log("Already connected or connecting");
			return;
		}

		const token = await getToken();
		if (!token) {
			setConnectionError("Not authenticated");
			return;
		}

		log("Connecting to WebSocket...");
		setConnectionError(null);

		try {
			const wsUrl = new URL(`${WS_URL}/api/room/${roomId}/ws`);
			wsUrl.searchParams.set("token", token);
			if (eventId) {
				wsUrl.searchParams.set("eventId", eventId);
			}

			const ws = new WebSocket(wsUrl.toString());
			wsRef.current = ws;

			ws.onopen = () => {
				log("WebSocket connected");
				setIsConnected(true);
				setConnectionError(null);
				setReconnectAttempts(0);

				// Start ping interval to keep connection alive
				pingIntervalRef.current = window.setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: "ping" }));
					}
				}, 30000); // Ping every 30 seconds
			};

			ws.onmessage = handleMessage;

			ws.onclose = (event) => {
				log("WebSocket closed:", event.code, event.reason);
				setIsConnected(false);

				// Clear ping interval
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}

				// Reconnect if not intentionally closed
				if (shouldReconnectRef.current && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
					const delay = Math.min(
						INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
						MAX_RECONNECT_DELAY
					);
					log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);

					reconnectTimeoutRef.current = window.setTimeout(() => {
						setReconnectAttempts((prev) => prev + 1);
						connect();
					}, delay);
				} else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
					setConnectionError("Max reconnection attempts reached");
				}
			};

			ws.onerror = (error) => {
				log("WebSocket error:", error);
				setConnectionError("WebSocket connection failed");
			};
		} catch (error) {
			log("Failed to create WebSocket:", error);
			setConnectionError(error instanceof Error ? error.message : "Connection failed");
		}
	}, [roomId, eventId, getToken, handleMessage, reconnectAttempts, log]);

	// Disconnect from WebSocket
	const disconnect = useCallback(() => {
		log("Disconnecting...");
		shouldReconnectRef.current = false;

		// Clear reconnect timeout
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Clear ping interval
		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = null;
		}

		// Close WebSocket
		if (wsRef.current) {
			wsRef.current.close(1000, "User disconnected");
			wsRef.current = null;
		}

		setIsConnected(false);
		setIsInvoking(false);
		setThinkingStatus(null);
		setStreamingText("");
		setActiveTools([]);
	}, [log]);

	// Reconnect manually
	const reconnect = useCallback(() => {
		disconnect();
		shouldReconnectRef.current = true;
		setReconnectAttempts(0);
		connect();
	}, [disconnect, connect]);

	// Invoke agent
	const invokeAgent = useCallback(
		(message: string, parentMessageId?: Id<"messages">) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				log("WebSocket not connected");
				onAgentError?.("Not connected to agent", true);
				return;
			}

			log("Invoking agent:", message);
			setIsInvoking(true);
			setThinkingStatus("Processing...");
			setStreamingText("");
			setActiveTools([]);

			wsRef.current.send(
				JSON.stringify({
					type: "agent_invoke",
					message,
					parentMessageId,
				})
			);
		},
		[log, onAgentError]
	);

	// Send typing indicator
	const sendTyping = useCallback(
		(isTyping: boolean) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				return;
			}

			wsRef.current.send(
				JSON.stringify({
					type: isTyping ? "typing_start" : "typing_stop",
				})
			);
		},
		[]
	);

	// Auto-connect on mount
	useEffect(() => {
		if (autoConnect) {
			shouldReconnectRef.current = true;
			connect();
		}

		return () => {
			disconnect();
		};
	}, [autoConnect, connect, disconnect]);

	// Reconnect when roomId or eventId changes
	useEffect(() => {
		if (isConnected) {
			reconnect();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomId, eventId]);

	return {
		invokeAgent,
		sendTyping,
		isConnected,
		isInvoking,
		thinkingStatus,
		streamingText,
		activeTools,
		reconnect,
		disconnect,
		connectionError,
		reconnectAttempts,
	};
}

export default useAgentWebSocket;
