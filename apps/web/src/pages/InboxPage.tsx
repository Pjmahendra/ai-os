import { useEffect, useState } from "react";
import { email as emailApi, drafts as draftsApi } from "../api/endpoints.js";
import { ApiError } from "../api/client.js";
import type {
  EmailDraft,
  EmailMessage,
  EmailThread,
  EmailThreadSummary
} from "../api/types.js";

export function InboxPage() {
  const [threads, setThreads] = useState<EmailThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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
    setInstruction("");
    setDraft(null);
    setDraftError(null);
    setSaved(false);
    setSendError(null);

    try {
      const { thread: full } = await emailApi.thread(id);
      setThread(full);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load thread");
    } finally {
      setThreadLoading(false);
    }
  }

  async function generateDraft(threadId: string) {
    if (!instruction.trim()) {
      return;
    }

    setDraftGenerating(true);
    setDraftError(null);

    try {
      const { draft: result } = await draftsApi.aiReply(
        threadId,
        instruction
      );
      setDraft(result);
      setSaved(false);
      setSendError(null);
    } catch (err) {
      setDraftError(
        err instanceof ApiError ? err.message : "Failed to generate draft"
      );
    } finally {
      setDraftGenerating(false);
    }
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    setSaving(true);
    setSendError(null);

    try {
      await draftsApi.update(draft.id, {
        to: draft.to,
        subject: draft.subject,
        body: draft.body
      });
      setSaved(true);
    } catch (err) {
      setSendError(
        err instanceof ApiError ? err.message : "Failed to save draft"
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendDraftNow() {
    if (!draft) {
      return;
    }

    if (
      !confirm(
        `Send this email to ${draft.to}? This cannot be undone.`
      )
    ) {
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      // Save any unsaved edits first, so what's sent matches what's
      // on screen - the backend also always sends its own stored
      // to/subject/body, never something passed fresh from the
      // client, but this keeps the two in sync.
      await draftsApi.update(draft.id, {
        to: draft.to,
        subject: draft.subject,
        body: draft.body
      });

      const { draft: sent } = await draftsApi.send(draft.id);
      setDraft(sent);
    } catch (err) {
      setSendError(
        err instanceof ApiError ? err.message : "Failed to send email"
      );
    } finally {
      setSending(false);
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
                    <>
                      {thread?.messages.map((m) => (
                        <ThreadMessage key={m.id} message={m} />
                      ))}

                      <div className="ai-reply-box">
                        <label>
                          Draft AI reply
                          <textarea
                            className="ai-reply-instruction"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="e.g. Thank them and say I'll follow up tomorrow"
                            rows={2}
                          />
                        </label>

                        <button
                          className="btn btn-primary"
                          disabled={draftGenerating || !instruction.trim()}
                          onClick={() => generateDraft(t.id)}
                        >
                          {draftGenerating
                            ? "Generating…"
                            : "Generate AI reply"}
                        </button>

                        {draftError && (
                          <div className="form-error">{draftError}</div>
                        )}

                        {draft && (
                          <div className="draft-editor">
                            {draft.status === "sent" ? (
                              <div className="form-success">
                                Sent{" "}
                                {draft.sentAt &&
                                  new Date(
                                    draft.sentAt
                                  ).toLocaleString()}
                                .
                              </div>
                            ) : (
                              <>
                                <label>
                                  To
                                  <input
                                    value={draft.to}
                                    onChange={(e) => {
                                      setDraft({
                                        ...draft,
                                        to: e.target.value
                                      });
                                      setSaved(false);
                                    }}
                                  />
                                </label>
                                <label>
                                  Subject
                                  <input
                                    value={draft.subject}
                                    onChange={(e) => {
                                      setDraft({
                                        ...draft,
                                        subject: e.target.value
                                      });
                                      setSaved(false);
                                    }}
                                  />
                                </label>
                                <label>
                                  Body
                                  <textarea
                                    className="draft-editor-body"
                                    value={draft.body}
                                    onChange={(e) => {
                                      setDraft({
                                        ...draft,
                                        body: e.target.value
                                      });
                                      setSaved(false);
                                    }}
                                    rows={8}
                                  />
                                </label>

                                {sendError && (
                                  <div className="form-error">
                                    {sendError}
                                  </div>
                                )}
                                {saved && (
                                  <div className="form-success">
                                    Draft saved.
                                  </div>
                                )}

                                <div className="draft-editor-actions">
                                  <button
                                    className="btn"
                                    onClick={saveDraft}
                                    disabled={saving || sending}
                                  >
                                    {saving ? "Saving…" : "Save draft"}
                                  </button>
                                  <button
                                    className="btn btn-primary"
                                    onClick={sendDraftNow}
                                    disabled={saving || sending}
                                  >
                                    {sending ? "Sending…" : "Send"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
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
