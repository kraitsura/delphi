export interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    source?: string;
    cached?: boolean;
  };
}

export interface ToolContext {
  convexUrl: string;
  authToken: string;
  roomId: string;
  eventId?: string;
  userId: string;
}
