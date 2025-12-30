/**
 * RoomSessionDO - WebSocket Session Manager with Hibernation Support
 *
 * Phase 3: WebSocket Streaming Architecture
 *
 * Purpose: Manages WebSocket connections for real-time agent response streaming
 * with Cloudflare's hibernation pattern for cost efficiency.
 *
 * Architecture: One DO instance per room session
 * - WebSocket hibernation (10x cheaper than always-on)
 * - Progressive response streaming
 * - Typing indicators and presence
 * - Automatic reconnection handling
 *
 * Endpoints:
 * - /websocket: WebSocket upgrade endpoint
 * - /status: Connection status and health
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * WebSocket message types (Client → Server)
 */
type ClientMessage =
  | { type: 'agent_invoke'; message: string; parentMessageId?: string }
  | { type: 'typing_start' }
  | { type: 'typing_stop' }
  | { type: 'ping' };

/**
 * WebSocket message types (Server → Client)
 */
type ServerMessage =
  | { type: 'agent_thinking'; status: string }
  | { type: 'agent_tool_start'; tool: string; params: any }
  | { type: 'agent_tool_complete'; tool: string; result: any; success: boolean }
  | { type: 'agent_chunk'; text: string; index: number }
  | { type: 'agent_complete'; response: AgentResponse }
  | { type: 'agent_error'; error: string; recoverable: boolean }
  | { type: 'typing_update'; userId: string; isTyping: boolean }
  | { type: 'presence_update'; users: PresenceInfo[] }
  | { type: 'pong' };

/**
 * Agent response structure (matches protocols.ts)
 */
interface AgentResponse {
  text: string;
  intent: string;
  confidence: number;
  toolsUsed: string[];
  structuredData?: any;
  metadata?: any;
}

/**
 * Connection attachment that survives hibernation
 */
interface ConnectionAttachment {
  userId: string;
  roomId: string;
  eventId: string;
  connectedAt: number;
  lastActivity: number;
}

/**
 * User presence information
 */
interface PresenceInfo {
  userId: string;
  userName?: string;
  isTyping: boolean;
  lastSeen: number;
}

/**
 * Environment interface
 */
interface Env {
  ROOM_ORCHESTRATOR: DurableObjectNamespace;
  EVENT_ORCHESTRATOR: DurableObjectNamespace;
  CONVEX_DEPLOY_URL?: string;
  CLAUDE_API_KEY?: string;
}

// ============================================================================
// ROOM SESSION DO
// ============================================================================

export class RoomSessionDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // Track connected users for presence
  private connectedUsers: Map<string, PresenceInfo> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  // ============================================================================
  // MAIN REQUEST HANDLER
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/websocket':
        return this.handleWebSocketUpgrade(request);
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  // ============================================================================
  // WEBSOCKET HANDLING
  // ============================================================================

  /**
   * Handle WebSocket upgrade request
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Extract user and room info from headers
    const userId = request.headers.get('X-User-Id');
    const roomId = request.headers.get('X-Room-Id');
    const eventId = request.headers.get('X-Event-Id');

    if (!userId || !roomId) {
      return new Response('Missing required headers: X-User-Id, X-Room-Id', { status: 400 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket with tags for filtering
    // Tags allow efficient broadcasting to subsets of connections
    this.state.acceptWebSocket(server, [userId, roomId]);

    // Attach metadata that survives hibernation
    const attachment: ConnectionAttachment = {
      userId,
      roomId,
      eventId: eventId || '',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };
    server.serializeAttachment(attachment);

    // Track user presence
    this.connectedUsers.set(userId, {
      userId,
      isTyping: false,
      lastSeen: Date.now(),
    });

    // Broadcast presence update to room
    this.broadcastPresence(roomId);

    console.log(`[RoomSessionDO] WebSocket connected: user=${userId}, room=${roomId}`);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ============================================================================
  // HIBERNATION HANDLERS (Called when waking from hibernation)
  // ============================================================================

  /**
   * Called when WebSocket receives a message (wakes from hibernation)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const attachment = ws.deserializeAttachment() as ConnectionAttachment;
      attachment.lastActivity = Date.now();
      ws.serializeAttachment(attachment);

      const data = JSON.parse(message as string) as ClientMessage;

      switch (data.type) {
        case 'agent_invoke':
          await this.handleAgentInvoke(ws, data, attachment);
          break;

        case 'typing_start':
          await this.handleTyping(attachment, true);
          break;

        case 'typing_stop':
          await this.handleTyping(attachment, false);
          break;

        case 'ping':
          this.sendToSocket(ws, { type: 'pong' });
          break;

        default:
          console.warn(`[RoomSessionDO] Unknown message type: ${(data as any).type}`);
      }
    } catch (error) {
      console.error('[RoomSessionDO] Error handling WebSocket message:', error);
      this.sendToSocket(ws, {
        type: 'agent_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  /**
   * Called when WebSocket is closed
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    try {
      const attachment = ws.deserializeAttachment() as ConnectionAttachment;

      // Remove from presence tracking
      this.connectedUsers.delete(attachment.userId);

      // Broadcast presence update
      this.broadcastPresence(attachment.roomId);

      console.log(`[RoomSessionDO] WebSocket closed: user=${attachment.userId}, code=${code}, reason=${reason}`);
    } catch (error) {
      console.error('[RoomSessionDO] Error handling WebSocket close:', error);
    }
  }

  /**
   * Called when WebSocket encounters an error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[RoomSessionDO] WebSocket error:', error);

    try {
      const attachment = ws.deserializeAttachment() as ConnectionAttachment;
      this.connectedUsers.delete(attachment.userId);
      this.broadcastPresence(attachment.roomId);
    } catch (e) {
      // Ignore errors during cleanup
    }

    ws.close(1011, 'Internal error');
  }

  // ============================================================================
  // AGENT INVOCATION WITH STREAMING (Phase 3: delphi-j3q)
  // ============================================================================

  /**
   * Handle agent invocation with progressive streaming
   * Implements streaming protocol for progressive response rendering
   *
   * Streaming flow:
   * 1. agent_thinking - Indicate processing has started
   * 2. agent_tool_start - Tool is about to execute
   * 3. agent_tool_complete - Tool has finished
   * 4. agent_chunk - Partial text response (every 50-100 tokens)
   * 5. agent_complete - Final response with structured data
   *
   * OR on error:
   * - agent_error - Error occurred (with recoverable flag)
   */
  private async handleAgentInvoke(
    ws: WebSocket,
    data: { type: 'agent_invoke'; message: string; parentMessageId?: string },
    attachment: ConnectionAttachment
  ): Promise<void> {
    const { roomId, eventId, userId } = attachment;
    let chunkIndex = 0;

    try {
      // 1. Send thinking indicator with initial status
      this.sendToSocket(ws, { type: 'agent_thinking', status: 'Processing your request...' });

      // 2. Get RoomOrchestratorDO to handle the actual agent invocation
      const roomDO = this.getRoomOrchestrator(roomId);

      // Update thinking status to show we're routing
      this.sendToSocket(ws, { type: 'agent_thinking', status: 'Analyzing intent...' });

      // Forward the invoke request to RoomOrchestratorDO
      const response = await roomDO.fetch(
        new Request('http://internal/invoke', {
          method: 'POST',
          body: JSON.stringify({
            roomId,
            eventId,
            userId,
            message: data.message,
            parentMessageId: data.parentMessageId,
            convexUrl: this.env.CONVEX_DEPLOY_URL,
            // Enable streaming mode hint for RoomOrchestratorDO
            streamingMode: true,
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        this.sendToSocket(ws, {
          type: 'agent_error',
          error: errorData.error || 'Agent invocation failed',
          recoverable: true,
        });
        return;
      }

      const result = await response.json() as any;

      // 3. Extract agent metadata for progressive streaming
      const agentResponse = result.agentResponse || result.response || '';
      const intent = result.intent || 'unknown';
      const toolsUsed = result.toolsUsed || [];
      const structuredData = result.structuredData;
      const metadata = result.aiMetadata || result.metadata;

      // 4. Send tool usage events (if we have iteration data)
      if (metadata?.iterations) {
        for (const iteration of metadata.iterations) {
          if (iteration.action) {
            // Send tool start
            this.sendToSocket(ws, {
              type: 'agent_tool_start',
              tool: iteration.action.tool,
              params: this.sanitizeParams(iteration.action.params),
            });

            // Send tool complete
            this.sendToSocket(ws, {
              type: 'agent_tool_complete',
              tool: iteration.action.tool,
              result: iteration.observation?.success
                ? this.summarizeResult(iteration.observation.data)
                : null,
              success: iteration.observation?.success || false,
            });
          }
        }
      } else if (toolsUsed.length > 0) {
        // Fallback: send tool events from toolsUsed array
        for (const tool of toolsUsed) {
          this.sendToSocket(ws, {
            type: 'agent_tool_start',
            tool,
            params: {},
          });
          this.sendToSocket(ws, {
            type: 'agent_tool_complete',
            tool,
            result: 'completed',
            success: true,
          });
        }
      }

      // 5. Stream text response in chunks (simulated for now)
      // In a true streaming implementation, we'd receive chunks from the AI
      // For now, we chunk the complete response
      const chunks = this.chunkText(agentResponse, 100); // ~100 chars per chunk

      for (const chunk of chunks) {
        this.sendToSocket(ws, {
          type: 'agent_chunk',
          text: chunk,
          index: chunkIndex++,
        });
        // Small delay between chunks for visual effect
        await this.sleep(20);
      }

      // 6. Send the complete response with all data
      this.sendToSocket(ws, {
        type: 'agent_complete',
        response: {
          text: agentResponse,
          intent,
          confidence: result.confidence || 0.8,
          toolsUsed,
          structuredData,
          metadata: {
            ...metadata,
            totalChunks: chunkIndex,
          },
        },
      });

    } catch (error) {
      console.error('[RoomSessionDO] Agent invocation error:', error);
      this.sendToSocket(ws, {
        type: 'agent_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        recoverable: this.isRecoverableError(error),
      });
    }
  }

  /**
   * Chunk text into smaller pieces for streaming
   * Attempts to break at word boundaries
   */
  private chunkText(text: string, targetSize: number): string[] {
    if (!text || text.length <= targetSize) {
      return text ? [text] : [];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= targetSize) {
        chunks.push(remaining);
        break;
      }

      // Find a good break point (space, newline, punctuation)
      let breakPoint = targetSize;
      for (let i = targetSize; i > targetSize * 0.6; i--) {
        const char = remaining[i];
        if (char === ' ' || char === '\n' || char === '.' || char === ',' || char === '!') {
          breakPoint = i + 1;
          break;
        }
      }

      chunks.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint);
    }

    return chunks;
  }

  /**
   * Sanitize tool parameters for client (remove sensitive data)
   */
  private sanitizeParams(params: any): any {
    if (!params) return {};

    // Remove potentially sensitive fields
    const sanitized = { ...params };
    delete sanitized.authToken;
    delete sanitized.apiKey;
    delete sanitized.password;

    // Summarize large data fields
    if (sanitized.data && typeof sanitized.data === 'object') {
      if (Object.keys(sanitized.data).length > 10) {
        sanitized.data = `{...${Object.keys(sanitized.data).length} fields}`;
      }
    }

    return sanitized;
  }

  /**
   * Summarize tool result for streaming (truncate large results)
   */
  private summarizeResult(data: any): any {
    if (!data) return null;

    if (Array.isArray(data)) {
      if (data.length > 5) {
        return `[${data.length} items]`;
      }
      return data.slice(0, 5);
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 10) {
        return `{${keys.slice(0, 5).join(', ')}, ...${keys.length - 5} more}`;
      }
    }

    return data;
  }

  /**
   * Check if error is recoverable (client can retry)
   */
  private isRecoverableError(error: unknown): boolean {
    if (!error) return true;

    const message = error instanceof Error ? error.message.toLowerCase() : '';

    // Non-recoverable errors
    const nonRecoverable = [
      'unauthorized',
      'forbidden',
      'invalid token',
      'authentication failed',
      'permission denied',
    ];

    return !nonRecoverable.some(term => message.includes(term));
  }

  /**
   * Helper to introduce delay for streaming effect
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // TYPING AND PRESENCE
  // ============================================================================

  /**
   * Handle typing indicator updates
   */
  private async handleTyping(attachment: ConnectionAttachment, isTyping: boolean): Promise<void> {
    const { userId, roomId } = attachment;

    // Update presence
    const presence = this.connectedUsers.get(userId);
    if (presence) {
      presence.isTyping = isTyping;
      presence.lastSeen = Date.now();
    }

    // Broadcast to room
    this.broadcastToRoom(roomId, {
      type: 'typing_update',
      userId,
      isTyping,
    });
  }

  /**
   * Broadcast presence update to all users in a room
   */
  private broadcastPresence(roomId: string): void {
    const users = Array.from(this.connectedUsers.values());

    this.broadcastToRoom(roomId, {
      type: 'presence_update',
      users,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get RoomOrchestratorDO stub
   */
  private getRoomOrchestrator(roomId: string): DurableObjectStub {
    const id = this.env.ROOM_ORCHESTRATOR.idFromName(`room-${roomId}`);
    return this.env.ROOM_ORCHESTRATOR.get(id);
  }

  /**
   * Send a message to a specific WebSocket
   */
  private sendToSocket(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[RoomSessionDO] Error sending to WebSocket:', error);
    }
  }

  /**
   * Broadcast a message to all WebSockets in a room
   */
  private broadcastToRoom(roomId: string, message: ServerMessage): void {
    // Get all WebSockets tagged with this roomId
    const sockets = this.state.getWebSockets(roomId);

    const messageStr = JSON.stringify(message);
    for (const ws of sockets) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('[RoomSessionDO] Error broadcasting to WebSocket:', error);
      }
    }
  }

  /**
   * Broadcast a message to all WebSockets except one
   */
  private broadcastToRoomExcept(roomId: string, excludeUserId: string, message: ServerMessage): void {
    const sockets = this.state.getWebSockets(roomId);
    const messageStr = JSON.stringify(message);

    for (const ws of sockets) {
      try {
        const attachment = ws.deserializeAttachment() as ConnectionAttachment;
        if (attachment.userId !== excludeUserId) {
          ws.send(messageStr);
        }
      } catch (error) {
        console.error('[RoomSessionDO] Error broadcasting to WebSocket:', error);
      }
    }
  }

  /**
   * Handle status request
   */
  private handleStatus(): Response {
    const sockets = this.state.getWebSockets();

    return new Response(
      JSON.stringify({
        status: 'active',
        connectedUsers: this.connectedUsers.size,
        totalConnections: sockets.length,
        users: Array.from(this.connectedUsers.values()).map(u => ({
          userId: u.userId,
          isTyping: u.isTyping,
          lastSeen: u.lastSeen,
        })),
        version: 'Phase 3 - RoomSessionDO',
        timestamp: Date.now(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
