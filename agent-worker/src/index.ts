/**
 * Delphi Agent Worker - Direct Access Architecture
 *
 * Phase 1: Foundation with Convex client integration
 * Frontend → Worker (with Convex token) → DO → AI → Convex
 *
 * Key features:
 * - Direct browser-to-worker communication (no Convex action hop)
 * - Convex client handles authentication and authorization
 * - Type-safe data fetching from Convex
 * - Automatic user context validation
 */

import { ConvexHttpClient } from 'convex/browser';
// Track 7 v3.1: Unified DO for all room types (ChatOrchestratorDO and EventCoordinatorDO removed)
import { RoomOrchestratorDO } from './durable-objects/RoomOrchestratorDO';
import { FirecrawlQueueDO } from './durable-objects/FirecrawlQueueDO';
import { api } from '../../web/convex/_generated/api';

// Export DO classes
export { RoomOrchestratorDO, FirecrawlQueueDO };

// Define environment interface
interface Env {
  ROOM_ORCHESTRATOR: DurableObjectNamespace;
  FIRECRAWL_QUEUE: DurableObjectNamespace;
  CONVEX_DEPLOY_URL?: string;
  CLAUDE_API_KEY?: string;
  KIMI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  ENVIRONMENT?: string;
}

// Define DO response interface
interface DOInvokeResponse {
  response: string;
  messagesFetched?: number;
  conversationTurns?: number;
  intent?: string;
  confidence?: number;
  toolsUsed?: string[];
  metadata?: any;
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Export default handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'delphi-agent-worker',
        phase: 'v3.1 - Single RoomOrchestrator Architecture',
        architecture: 'Browser → Worker → RoomOrchestratorDO → AI → Convex',
        environment: env.ENVIRONMENT || 'unknown',
        timestamp: Date.now(),
        version: '3.1.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PRIMARY: RoomOrchestratorDO invoke endpoint (Track 3 v3.1)
    // Single DO type for all room types with room-type-aware context
    if (path.match(/^\/api\/room\/[^/]+\/invoke$/) && request.method === 'POST') {
      try {
        // Extract roomId from path
        const pathParts = path.split('/');
        const roomId = pathParts[3];

        // Extract and validate auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(
            JSON.stringify({
              error: 'Unauthorized: Missing or invalid Authorization header',
              hint: 'Include Convex auth token as: Authorization: Bearer <token>'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.substring(7);
        const convexUrl = env.CONVEX_DEPLOY_URL || 'http://localhost:8000';

        // Create Convex client with user's auth token
        const convex = new ConvexHttpClient(convexUrl);
        convex.setAuth(token);

        const body = await request.json() as any;

        // Validate required fields
        if (!body.message) {
          return new Response(
            JSON.stringify({
              error: 'Missing required field: message',
              received: Object.keys(body)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch authenticated user profile
        let user: any;
        try {
          user = await convex.query(api.users.getMyProfile, {});
          if (!user) {
            return new Response(
              JSON.stringify({
                error: 'Authentication failed',
                details: 'Could not fetch user profile. Token may be invalid or expired.',
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (convexError) {
          console.error('Convex authentication error:', convexError);
          return new Response(
            JSON.stringify({
              error: 'Authentication failed',
              details: convexError instanceof Error ? convexError.message : 'Unknown error',
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get or create DO instance for this room
        const doId = env.ROOM_ORCHESTRATOR.idFromName(`room-${roomId}`);
        const stub = env.ROOM_ORCHESTRATOR.get(doId);

        // Forward to RoomOrchestratorDO
        const doResponse = await stub.fetch(
          new Request('http://internal/invoke', {
            method: 'POST',
            body: JSON.stringify({
              roomId: roomId,
              eventId: body.eventId,
              userId: user._id,
              userName: user.name,
              message: body.message,
              parentMessageId: body.parentMessageId,
              roomType: body.roomType || 'main',
              convexUrl,
              authToken: token,
            }),
            headers: { 'Content-Type': 'application/json' }
          })
        );

        if (!doResponse.ok) {
          const errorBody = await doResponse.json();
          return new Response(
            JSON.stringify(errorBody),
            {
              status: doResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const result = await doResponse.json() as Record<string, any>;

        return new Response(JSON.stringify({
          ...result,
          architecture: 'room-orchestrator-v3',
          userId: user._id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('RoomOrchestrator error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PRIMARY: RoomOrchestratorDO status endpoint (Track 3 v3.1)
    if (path.match(/^\/api\/room\/[^/]+\/status$/) && request.method === 'GET') {
      try {
        const pathParts = path.split('/');
        const roomId = pathParts[3];

        const doId = env.ROOM_ORCHESTRATOR.idFromName(`room-${roomId}`);
        const stub = env.ROOM_ORCHESTRATOR.get(doId);

        const doResponse = await stub.fetch(
          new Request('http://internal/status')
        );

        const result = await doResponse.json();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('RoomOrchestrator status error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get room status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 404 handler
    return new Response(
      JSON.stringify({
        error: 'Not found',
        availableEndpoints: [
          'GET /health',
          'POST /api/room/:roomId/invoke',
          'GET /api/room/:roomId/status'
        ]
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
