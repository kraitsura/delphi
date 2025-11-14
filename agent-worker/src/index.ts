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
import { ChatOrchestratorDO } from './durable-objects/ChatOrchestratorDO';
import { api } from '../../web/convex/_generated/api';

// Export DO class
export { ChatOrchestratorDO };

// Define environment interface
interface Env {
  CHAT_ORCHESTRATOR: DurableObjectNamespace;
  CONVEX_DEPLOY_URL?: string;
  CLAUDE_API_KEY?: string;
  KIMI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ENVIRONMENT?: string;
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
        phase: 'Phase 1 - Direct Access Architecture',
        architecture: 'Browser → Worker → DO → AI → Convex',
        environment: env.ENVIRONMENT || 'unknown',
        timestamp: Date.now(),
        version: '0.2.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Agent invocation endpoint - Direct access with Convex auth
    if (path === '/api/agent/invoke' && request.method === 'POST') {
      try {
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

        const token = authHeader.substring(7); // Remove "Bearer "
        const convexUrl = env.CONVEX_DEPLOY_URL || 'http://localhost:8000';

        // Create Convex client with user's auth token
        const convex = new ConvexHttpClient(convexUrl);
        convex.setAuth(token);

        const body = await request.json() as any;

        // Validate required fields
        if (!body.roomId || !body.message) {
          return new Response(
            JSON.stringify({
              error: 'Missing required fields',
              required: ['roomId', 'message'],
              received: Object.keys(body)
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch user and context data from Convex using authenticated client
        // This will automatically fail if:
        // - Token is invalid
        // - User doesn't have access to the room
        // - User is not authenticated
        let user: any;

        try {
          // Get authenticated user profile
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
              error: 'Authentication or authorization failed',
              details: convexError instanceof Error ? convexError.message : 'Unknown error',
              hint: 'Ensure you have a valid Convex auth token and access to this room'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get or create DO instance for this room
        const doId = env.CHAT_ORCHESTRATOR.idFromName(`room-${body.roomId}`);
        const stub = env.CHAT_ORCHESTRATOR.get(doId);

        // Forward full context to DO
        const doResponse = await stub.fetch(
          new Request('http://internal/invoke', {
            method: 'POST',
            body: JSON.stringify({
              roomId: body.roomId,
              eventId: body.eventId,
              userId: user._id,
              userName: user.name,
              message: body.message,
              convexUrl,
              authToken: token,
              // Pass API keys for AI integration (priority: Claude > Kimi > OpenAI)
              claudeApiKey: env.CLAUDE_API_KEY,
              kimiApiKey: env.KIMI_API_KEY,
              anthropicApiKey: env.ANTHROPIC_API_KEY,
              openaiApiKey: env.OPENAI_API_KEY,
            }),
            headers: { 'Content-Type': 'application/json' }
          })
        );

        const result = await doResponse.json();

        // Save response to Convex using authenticated client
        // This ensures the response is saved with proper user context
        try {
          if (!body.eventId) {
            console.warn('[Worker] No eventId provided, skipping save to Convex');
          } else {
            await convex.mutation(api.agent.saveResponse, {
              roomId: body.roomId,
              eventId: body.eventId,
              text: result.response,
              metadata: {
                invokedBy: user._id,
                userMessage: body.message,
                timestamp: Date.now(),
                messagesFetched: result.messagesFetched,
                conversationTurns: result.conversationTurns,
              },
            });

            console.log('[Worker] Response saved to Convex successfully');
          }
        } catch (saveError) {
          console.error('[Worker] Failed to save response to Convex:', saveError);
          // Don't fail the request if save fails - user still gets response
        }

        return new Response(JSON.stringify({
          ...result,
          architecture: 'direct-access',
          userId: user._id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Worker error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Status check endpoint
    if (path.startsWith('/api/agent/status/') && request.method === 'GET') {
      try {
        const roomId = path.split('/').pop();

        const doId = env.CHAT_ORCHESTRATOR.idFromName(`room-${roomId}`);
        const stub = env.CHAT_ORCHESTRATOR.get(doId);

        const doResponse = await stub.fetch(
          new Request('http://internal/status')
        );

        const result = await doResponse.json();

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Status check error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get status' }),
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
          'POST /api/agent/invoke',
          'GET /api/agent/status/:roomId'
        ]
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
