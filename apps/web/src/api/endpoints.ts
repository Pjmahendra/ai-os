import { api, getToken } from "./client.js";
import type {
  AgentResponse,
  Automation,
  AutomationExecution,
  AuthResult,
  Conversation,
  EmailAccount,
  EmailDraft,
  EmailThread,
  EmailThreadSummary,
  Memory,
  Message,
  Notification,
  Tool,
  User
} from "./types.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

export const email = {
  // A full-page redirect, not a fetch() call, so it can't carry an
  // Authorization header - the JWT goes as a query param instead.
  connectUrl: () =>
    `${API_URL}/api/email/oauth/connect?token=${encodeURIComponent(
      getToken() ?? ""
    )}`,

  accounts: () =>
    api.get<{ success: boolean; account: EmailAccount | null }>(
      "/api/email/accounts"
    ),

  disconnect: (id: string) =>
    api.delete<{ success: boolean }>(`/api/email/accounts/${id}`),

  threads: (pageToken?: string) =>
    api.get<{
      success: boolean;
      threads: EmailThreadSummary[];
      nextPageToken: string | null;
    }>(
      pageToken
        ? `/api/email/threads?pageToken=${encodeURIComponent(pageToken)}`
        : "/api/email/threads"
    ),

  thread: (id: string) =>
    api.get<{ success: boolean; thread: EmailThread }>(
      `/api/email/threads/${id}`
    )
};

export const drafts = {
  aiReply: (threadId: string, instruction: string) =>
    api.post<{ success: boolean; draft: EmailDraft }>(
      "/api/email/drafts/ai-reply",
      { threadId, instruction }
    ),

  aiNew: (to: string, instruction: string) =>
    api.post<{ success: boolean; draft: EmailDraft }>(
      "/api/email/drafts/ai-new",
      { to, instruction }
    ),

  list: () =>
    api.get<{ success: boolean; drafts: EmailDraft[] }>(
      "/api/email/drafts"
    ),

  update: (
    id: string,
    data: { to?: string; subject?: string; body?: string }
  ) =>
    api.patch<{ success: boolean }>(`/api/email/drafts/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/email/drafts/${id}`),

  send: (id: string) =>
    api.post<{ success: boolean; draft: EmailDraft }>(
      `/api/email/drafts/${id}/send`
    )
};

export const notifications = {
  list: (unreadOnly?: boolean) =>
    api.get<{ success: boolean; notifications: Notification[] }>(
      unreadOnly ? "/api/notifications?unread=true" : "/api/notifications"
    ),

  unreadCount: () =>
    api.get<{ success: boolean; count: number }>(
      "/api/notifications/unread-count"
    ),

  markRead: (id: string) =>
    api.patch<{ success: boolean }>(`/api/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<{ success: boolean }>("/api/notifications/read-all")
};
