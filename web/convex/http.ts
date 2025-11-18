import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authComponent } from "./authComponent";
import { createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth HTTP routes
authComponent.registerRoutes(http, createAuth);

// ==========================================
// AGENT SYSTEM HTTP ENDPOINTS
// ==========================================

/**
 * POST /saveAgentResponse
 * Called by Cloudflare Worker to save agent responses to Convex
 * Requires authentication via AGENT_WORKER_SECRET
 */
http.route({
  path: "/saveAgentResponse",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Verify worker authentication
      const authHeader = request.headers.get("Authorization");
      const expectedSecret = process.env.AGENT_WORKER_SECRET;

      if (!expectedSecret) {
        console.error("AGENT_WORKER_SECRET not configured");
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid Authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
      if (token !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication token" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = await request.json() as {
        roomId: string;
        eventId: string;
        text: string;
        metadata?: {
          invokedBy: string;
          userMessage: string;
          timestamp?: number;
          messagesFetched?: number;
          conversationTurns?: number;
        };
      };

      // Ensure metadata has required fields
      if (!body.metadata || !body.metadata.invokedBy || !body.metadata.userMessage) {
        return new Response(
          JSON.stringify({ error: "Missing required metadata fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Save agent response to database
      await ctx.runMutation(api.agent.saveResponse, {
        roomId: body.roomId as Id<"rooms">,
        eventId: body.eventId as Id<"events">,
        text: body.text,
        metadata: {
          invokedBy: body.metadata.invokedBy as Id<"users">,
          userMessage: body.metadata.userMessage,
          timestamp: body.metadata.timestamp,
          messagesFetched: body.metadata.messagesFetched,
          conversationTurns: body.metadata.conversationTurns,
        },
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
