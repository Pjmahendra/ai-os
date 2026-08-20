export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface Automation {
  id: string;
  userId: string;
  name: string;
  workflow: string;
  config: unknown;
  enabled: boolean;
  scheduleType: string | null;
  schedule: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  status: "running" | "success" | "failed" | string;
  result: unknown;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  plan: unknown;
  execution: unknown;
  createdAt: string;
}

export interface AgentResponse {
  success: boolean;
  conversationId: string;
  message: string;
  plan: unknown;
  execution: unknown;
}

export interface Tool {
  name: string;
  description: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  connectedAt: string;
}

export interface EmailThreadSummary {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string | null;
  bodyHtml: string | null;
}

export interface EmailThread {
  id: string;
  messages: EmailMessage[];
}

export interface EmailDraft {
  id: string;
  userId: string;
  emailAccountId: string;
  threadId: string | null;
  inReplyToMessageId: string | null;
  to: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed" | string;
  aiGenerated: boolean;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}
