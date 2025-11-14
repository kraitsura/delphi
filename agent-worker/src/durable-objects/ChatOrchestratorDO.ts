/**
 * ChatOrchestratorDO - Durable Object for managing room-level agent state
 *
 * Phase 1: Full AI integration with Kimi K2 API
 *
 * Architecture: One DO instance per room
 * - Fetches conversation context from Convex using authenticated client
 * - Maintains conversation history for AI context
 * - Handles AI API calls (Kimi K2, Claude, GPT-4)
 * - Persists state between invocations
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../web/convex/_generated/api';

interface Message {
  _id: string;
  text: string;
  author?: {
    _id: string;
    name?: string;
  };
  authorId: string;
  createdAt: number;
  isAIGenerated: boolean;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatOrchestratorDO {
  private state: DurableObjectState;
  private env: any;
  private roomId: string | null = null;
  private conversationHistory: ConversationTurn[] = [];

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Parse body once if it's a POST request
      let body: any = null;
      if (request.method === 'POST') {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }

      // Initialize roomId if needed
      if (!this.roomId && body?.roomId) {
        await this.initialize(body);
      }

      // Route based on path
      switch (path) {
        case "/status":
          return await this.handleStatus();
        case "/invoke":
          return await this.handleAgentInvoke(body);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("[DO Error]", error);
      return new Response(
        JSON.stringify({
          error: "Internal error",
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  private async initialize(body: any) {
    // Load state from storage
    const stored = await this.state.storage.get<string>("roomId");

    if (stored) {
      this.roomId = stored;
      // Load conversation history
      const history = await this.state.storage.get<ConversationTurn[]>("conversationHistory");
      if (history) {
        this.conversationHistory = history;
      }
    } else if (body && body.roomId) {
      // First request - extract from request body
      this.roomId = body.roomId;
      // Persist
      await this.state.storage.put("roomId", this.roomId);
    } else {
      this.roomId = "unknown";
    }
  }

  private async handleStatus(): Promise<Response> {
    return new Response(JSON.stringify({
      roomId: this.roomId,
      conversationTurns: this.conversationHistory.length,
      status: "active",
      phase: "Phase 1 - AI Integration Complete",
      architecture: "Browser → Worker → DO → AI → Convex",
      timestamp: Date.now()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async handleAgentInvoke(body: any): Promise<Response> {
    const {
      roomId,
      message,
      convexUrl,
      authToken,
      claudeApiKey,
      kimiApiKey,
      anthropicApiKey,
      openaiApiKey,
    } = body;

    console.log(`[DO] Processing @Delphi request for room: ${roomId}`);

    try {
      // Create authenticated Convex client
      if (!convexUrl || !authToken) {
        throw new Error('Missing convexUrl or authToken');
      }

      const convex = new ConvexHttpClient(convexUrl);
      convex.setAuth(authToken);

      console.log(`[DO] Fetching recent messages from Convex...`);

      // Fetch last 10 messages from Convex
      const recentMessages = await convex.query(api.messages.listByRoom, {
        roomId: roomId as any,
        limit: 10,
      }) as Message[];

      console.log(`[DO] Fetched ${recentMessages.length} recent messages`);

      // Build conversation context from messages
      const conversationContext = recentMessages
        .reverse() // Show chronologically (oldest first)
        .map((msg) => {
          const authorName = msg.author?.name || 'Unknown';
          return `${authorName}: ${msg.text}`;
        })
        .join('\n');

      console.log(`[DO] Built conversation context (${conversationContext.length} chars)`);

      // Call AI API with context
      const aiResponse = await this.callAI(
        conversationContext,
        message,
        claudeApiKey,
        kimiApiKey,
        anthropicApiKey,
        openaiApiKey
      );

      console.log(`[DO] AI response generated (${aiResponse.length} chars)`);

      // Update conversation history in memory (keep last 20 exchanges)
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      );

      // Keep only last 40 turns (20 exchanges)
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-40);
      }

      // Persist conversation history
      await this.state.storage.put("conversationHistory", this.conversationHistory);

      return new Response(JSON.stringify({
        success: true,
        response: aiResponse,
        roomId: this.roomId,
        timestamp: Date.now(),
        messagesFetched: recentMessages.length,
        conversationTurns: this.conversationHistory.length,
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('[DO] Error during agent invocation:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I encountered an error while processing your request. Please try again.",
        roomId: this.roomId,
        timestamp: Date.now(),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  /**
   * Call AI API with conversation context
   * Priority: Claude > Kimi K2 > Anthropic > OpenAI
   */
  private async callAI(
    conversationContext: string,
    userMessage: string,
    claudeApiKey?: string,
    kimiApiKey?: string,
    anthropicApiKey?: string,
    openaiApiKey?: string
  ): Promise<string> {
    const systemPrompt = `You are Delphi, an AI assistant helping users plan events.
You've been invoked with @Delphi to provide helpful, contextual advice.
Keep responses concise (2-3 sentences) and actionable.

Recent conversation context:
${conversationContext}

User's question: ${userMessage}`;

    try {
      // Try Claude first (primary for Phase 1)
      if (claudeApiKey) {
        console.log('[DO] Calling Claude Haiku 4.5 API...');
        return await this.callClaude(systemPrompt, claudeApiKey);
      }

      // Fallback to Kimi K2
      if (kimiApiKey) {
        console.log('[DO] Calling Kimi K2 API...');
        return await this.callKimiK2(systemPrompt, kimiApiKey);
      }

      // Fallback to legacy Anthropic key
      if (anthropicApiKey) {
        console.log('[DO] Calling Anthropic Claude API (legacy)...');
        return await this.callClaude(systemPrompt, anthropicApiKey);
      }

      // Fallback to OpenAI GPT-4
      if (openaiApiKey) {
        console.log('[DO] Calling OpenAI GPT-4 API...');
        return await this.callOpenAI(systemPrompt, openaiApiKey);
      }

      return "⚠️ AI service not configured. Please set CLAUDE_API_KEY, KIMI_API_KEY, or OPENAI_API_KEY in Cloudflare Worker secrets.";

    } catch (error) {
      console.error("[AI API Error]", error);
      return `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }

  /**
   * Call Kimi K2 API by Moonshot AI
   * https://platform.moonshot.ai/
   */
  private async callKimiK2(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2-0905-preview", // Latest model with 256K context
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.6, // Recommended for Kimi K2
        max_tokens: 500,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kimi K2 API error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Kimi K2 API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Call Anthropic Claude API (Haiku 4.5)
   * Using claude-haiku-4-5 - latest Haiku model (2025)
   */
  private async callClaude(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5", // Haiku 4.5 (2025) - fastest and most cost-effective
        max_tokens: 500,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.content[0].text;
  }

  /**
   * Call OpenAI GPT-4 API
   */
  private async callOpenAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        max_tokens: 500,
        messages: [
          { role: "system", content: "You are Delphi, an AI event planning assistant." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }
}
