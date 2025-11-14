import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth HTTP routes
authComponent.registerRoutes(http, createAuth);

// ==========================================
// AGENT SYSTEM HTTP ENDPOINTS
// ==========================================

/**
 * POST /saveAgentResponse
 * Called by Cloudflare Worker to save agent responses to Convex
 * Phase 1: Basic response saving without authentication
 */
http.route({
  path: "/saveAgentResponse",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      // Save agent response to database
      await ctx.runMutation(api.agent.saveResponse, {
        roomId: body.roomId,
        eventId: body.eventId,
        text: body.text,
        metadata: body.metadata,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error saving agent response:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to save agent response",
          message: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
