export interface AgentContext {
  userId: string;
  sessionId: string;
  message: string;
  memory: string[];
  metadata: Record<string, unknown>;
}

export interface AgentResponse {
  success: boolean;
  reply: string;
  toolCalls?: unknown[];
}
