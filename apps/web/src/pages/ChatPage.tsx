import { FormEvent, useEffect, useRef, useState } from "react";
import { agent, conversations } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type { Conversation, Message } from "../api/types.js";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  plan?: unknown;
  execution?: unknown;
  pending?: boolean;
}

export function ChatPage() {
  const [conversationList, setConversationList] = useState<
    Conversation[]
  >([]);
  const [activeId, setActiveId] = useState<string | undefined>(
    undefined
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    try {
      const { conversations: list } = await conversations.list();
      setConversationList(list);
    } catch {
      // Non-fatal — chat still works without history.
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    setActiveId(id);
    setError(null);

    try {
      const { messages: history } = await conversations.messages(id);

      setMessages(
        history.map((m: Message) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          plan: m.plan,
          execution: m.execution
        }))
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load conversation"
      );
    }
  }

  function startNewConversation() {
    setActiveId(undefined);
    setMessages([]);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);

    const userMessage: ChatMessage = {
      id: `pending-user-${Date.now()}`,
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      const response = await agent.send(text, activeId);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${response.conversationId}-${prev.length}`,
          role: "assistant",
          content: response.message,
          plan: response.plan,
          execution: response.execution
        }
      ]);

      if (!activeId) {
        setActiveId(response.conversationId);
        loadConversations();
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The agent request failed"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <button className="btn btn-primary btn-block" onClick={startNewConversation}>
          + New conversation
        </button>

        <div className="conversation-list">
          {conversationList.length === 0 && (
            <p className="muted">No conversations yet.</p>
          )}

          {conversationList.map((c) => (
            <button
              key={c.id}
              className={
                c.id === activeId
                  ? "conversation-item active"
                  : "conversation-item"
              }
              onClick={() => openConversation(c.id)}
            >
              {c.title ?? c.id.slice(0, 8)}
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>Ask AI-OS to create, run, update, or explain an automation.</p>
              <p className="muted">
                e.g. "Create a daily reminder at 8am to review my tasks"
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <div className="chat-bubble-role">
                {m.role === "user" ? "You" : "AI-OS"}
              </div>
              <div className="chat-bubble-content">{m.content}</div>
            </div>
          ))}

          {sending && (
            <div className="chat-bubble assistant pending">
              <div className="chat-bubble-role">AI-OS</div>
              <div className="chat-bubble-content">Thinking…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message AI-OS…"
            disabled={sending}
          />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
