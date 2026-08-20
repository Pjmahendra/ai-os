import { useEffect, useState } from "react";
import { email as emailApi } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type { EmailMessage, EmailThread, EmailThreadSummary } from "../api/types.js";

export function InboxPage() {
  const [threads, setThreads] = useState<EmailThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { threads: list, nextPageToken: next } = await emailApi.threads();
      setThreads(list);
      setNextPageToken(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMore() {
    if (!nextPageToken) {
      return;
    }

    setLoadingMore(true);

    try {
      const { threads: list, nextPageToken: next } =
        await emailApi.threads(nextPageToken);
      setThreads((prev) => [...prev, ...list]);
      setNextPageToken(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setThread(null);
      return;
    }

    setExpandedId(id);
    setThread(null);
    setThreadLoading(true);

    try {
      const { thread: full } = await emailApi.thread(id);
      setThread(full);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load thread");
    } finally {
      setThreadLoading(false);
    }
  }

  if (loading) {
    return <div className="page-loading">Loading inbox…</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inbox</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      {threads.length === 0 ? (
        <p className="muted">
          No messages found. Make sure a Gmail account is connected in
          Settings.
        </p>
      ) : (
        <div className="thread-list">
          {threads.map((t) => (
            <div key={t.id} className="thread-card">
              <button
                className={
                  t.unread ? "thread-summary unread" : "thread-summary"
                }
                onClick={() => toggleExpand(t.id)}
              >
                <div className="thread-summary-top">
                  <span className="thread-from">{t.from}</span>
                  <span className="muted thread-date">{t.date}</span>
                </div>
                <div className="thread-subject">{t.subject}</div>
                <div className="muted thread-snippet">{t.snippet}</div>
              </button>

              {expandedId === t.id && (
                <div className="thread-detail">
                  {threadLoading ? (
                    <p className="muted">Loading…</p>
                  ) : (
                    thread?.messages.map((m) => (
                      <ThreadMessage key={m.id} message={m} />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {nextPageToken && (
        <button className="btn" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

function ThreadMessage({ message }: { message: EmailMessage }) {
  return (
    <div className="thread-message">
      <div className="thread-message-header muted">
        <div>
          <strong>From:</strong> {message.from}
        </div>
        <div>
          <strong>To:</strong> {message.to}
        </div>
        <div>{message.date}</div>
      </div>
      <MessageBody message={message} />
    </div>
  );
}

function MessageBody({
  message
}: {
  message: Pick<EmailMessage, "bodyText" | "bodyHtml">;
}) {
  if (message.bodyText) {
    return <div className="thread-message-body">{message.bodyText}</div>;
  }

  if (message.bodyHtml) {
    // An empty sandbox strips script execution, form submission, and
    // same-origin access - untrusted email HTML can't run JS or touch
    // the rest of the app even if it tries to.
    return (
      <iframe
        className="thread-message-body-frame"
        sandbox=""
        srcDoc={message.bodyHtml}
        title="Email content"
      />
    );
  }

  return <p className="muted">(no content)</p>;
}
