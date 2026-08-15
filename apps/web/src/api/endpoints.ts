import { api } from "./client.js";
import type {
  AgentResponse,
  Automation,
  AutomationExecution,
  AuthResult,
  Conversation,
  Memory,
  Message,
  Tool,
  User
} from "./types.js";

export const auth = {
  login: (email: string, password: string) =>
    api.post<AuthResult>("/api/auth/login", { email, password }),

  register: (email: string, password: string, name?: string) =>
    api.post<AuthResult>("/api/auth/register", { email, password, name })
};

export const users = {
  me: () => api.get<User>("/api/users/me"),

  updateSettings: (data: { name?: string; timezone?: string }) =>
    api.patch<{ success: boolean; user: User }>("/api/users/me", data)
};

export const agent = {
  send: (message: string, conversationId?: string) =>
    api.post<AgentResponse>("/api/agent", { message, conversationId })
};

export const conversations = {
  list: () =>
    api.get<{ success: boolean; conversations: Conversation[] }>(
      "/api/conversations"
    ),

  messages: (id: string) =>
    api.get<{ success: boolean; messages: Message[] }>(
      `/api/conversations/${id}/messages`
    )
};

export const automations = {
  list: () =>
    api.get<{ success: boolean; automations: Automation[] }>(
      "/api/automations"
    ),

  get: (id: string) =>
    api.get<{ success: boolean; automation: Automation }>(
      `/api/automations/${id}`
    ),

  create: (data: {
    name: string;
    workflow: string;
    config?: unknown;
    scheduleType?: string;
    schedule?: string;
  }) =>
    api.post<{ success: boolean; automation: Automation }>(
      "/api/automations",
      data
    ),

  toggle: (id: string, enabled: boolean) =>
    api.patch<{ success: boolean; enabled: boolean }>(
      `/api/automations/${id}/toggle`,
      { enabled }
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/api/automations/${id}`
    ),

  execute: (id: string) =>
    api.post<{ success: boolean; result: unknown }>(
      `/api/automations/${id}/execute`
    ),

  executions: (id: string) =>
    api.get<{ success: boolean; executions: AutomationExecution[] }>(
      `/api/automations/${id}/executions`
    )
};

export const memories = {
  list: (query?: string) =>
    api.get<{ success: boolean; memories: Memory[] }>(
      query
        ? `/api/memory?query=${encodeURIComponent(query)}`
        : "/api/memory"
    ),

  create: (content: string, summary?: string) =>
    api.post<{ success: boolean; memory: Memory }>("/api/memory", {
      content,
      summary
    }),

  update: (id: string, data: { content?: string; summary?: string }) =>
    api.patch<{ success: boolean; memory: Memory }>(
      `/api/memory/${id}`,
      data
    ),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/memory/${id}`)
};

export const tools = {
  list: () => api.get<Tool[]>("/api/tools")
};
