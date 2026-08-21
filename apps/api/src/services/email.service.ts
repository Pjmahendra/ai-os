import { google, gmail_v1 } from "googleapis";
import { getValidAccessToken } from "./email-account.service.js";

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

export interface ThreadSummary {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

// Fetch live from Gmail on every call - no local thread/message cache.
// Gmail's threads.list only returns id + snippet, so getting the
// subject/from/date/unread state each row actually shows means one
// follow-up metadata fetch per thread. That's an N+1, but it's bounded
// by maxResults per page and avoids syncing/caching a second copy of
// someone's inbox.
export async function listInboxThreads(
  userId: string,
  opts: { maxResults?: number; pageToken?: string } = {}
): Promise<{ threads: ThreadSummary[]; nextPageToken: string | null }> {
  const accessToken = await getValidAccessToken(userId);
  const gmail = getGmailClient(accessToken);

  const { data } = await gmail.users.threads.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults: opts.maxResults ?? 20,
    pageToken: opts.pageToken
  });

  const threads = data.threads ?? [];

  const summaries = await Promise.all(
    threads.map(async (t): Promise<ThreadSummary> => {
      const { data: full } = await gmail.users.threads.get({
        userId: "me",
        id: t.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"]
      });

      const messages = full.messages ?? [];
      const last = messages[messages.length - 1];
      const headers = last?.payload?.headers;
      const unread = messages.some((m) =>
        m.labelIds?.includes("UNREAD")
      );

      return {
        id: t.id!,
        snippet: t.snippet ?? "",
        subject: getHeader(headers, "Subject") || "(no subject)",
        from: getHeader(headers, "From"),
        date: getHeader(headers, "Date"),
        unread
      };
    })
  );

  return {
    threads: summaries,
    nextPageToken: data.nextPageToken ?? null
  };
}

export interface ThreadMatchCriteria {
  readonly subject?: string;
  readonly from?: string;
}

// Case-insensitive substring matching against subject/from, mirroring
// how automation.toggle resolves an automation by exact name rather
// than an opaque id: chat conversation history only ever retains the
// human-readable reply text, never a raw threadId, so a thread the
// model needs to act on in a *later* turn has to be findable by
// something a human would naturally describe it by.
export function matchThreadsByCriteria(
  threads: readonly ThreadSummary[],
  criteria: ThreadMatchCriteria
): ThreadSummary[] {
  if (!criteria.subject && !criteria.from) {
    return [];
  }

  return threads.filter((t) => {
    const subjectMatches = criteria.subject
      ? t.subject
          .toLowerCase()
          .includes(criteria.subject.toLowerCase())
      : true;

    const fromMatches = criteria.from
      ? t.from
          .toLowerCase()
          .includes(criteria.from.toLowerCase())
      : true;

    return subjectMatches && fromMatches;
  });
}

// Resolves a thread by subject/sender instead of requiring the
// caller to already know its id. Throws (rather than guessing) on
// zero or multiple matches, same as automation.toggle's handling of
// an ambiguous automation name.
export async function findThreadId(
  userId: string,
  criteria: ThreadMatchCriteria
): Promise<string> {
  if (!criteria.subject && !criteria.from) {
    throw new Error(
      "subject and/or from is required to find a thread"
    );
  }

  const { threads } = await listInboxThreads(userId, {
    maxResults: 50
  });

  const matches = matchThreadsByCriteria(threads, criteria);

  if (matches.length === 0) {
    throw new Error(
      "No matching email thread was found in the recent inbox"
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `${matches.length} matching threads were found - be more specific ` +
        `(e.g. include more of the exact subject or sender)`
    );
  }

  return matches[0]!.id;
}

export interface EmailMessage {
  id: string;
  // The RFC "Message-ID" header - distinct from Gmail's internal `id`
  // above. Sending a reply needs *this* value in In-Reply-To/References
  // for Gmail to thread it correctly, not Gmail's own id.
  messageId: string;
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

// Gmail messages are arbitrarily-nested multipart MIME (plain-text
// only, HTML-only, or both as alternatives, each possibly nested under
// mixed/related wrappers for attachments/inline images) with bodies
// base64url- not base64-encoded. This walks the whole part tree and
// keeps the first plain-text and first HTML part it finds.
function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined
): { text: string | null; html: string | null } {
  let text: string | null = null;
  let html: string | null = null;

  function walk(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) {
      return;
    }

    if (part.mimeType === "text/plain" && part.body?.data) {
      text = text ?? Buffer.from(part.body.data, "base64url").toString("utf-8");
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = html ?? Buffer.from(part.body.data, "base64url").toString("utf-8");
    }

    for (const sub of part.parts ?? []) {
      walk(sub);
    }
  }

  walk(payload);

  return { text, html };
}

export async function getThread(
  userId: string,
  threadId: string
): Promise<EmailThread> {
  const accessToken = await getValidAccessToken(userId);
  const gmail = getGmailClient(accessToken);

  const { data } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full"
  });

  const messages: EmailMessage[] = (data.messages ?? []).map((m) => {
    const headers = m.payload?.headers;
    const { text, html } = extractBody(m.payload);

    return {
      id: m.id!,
      messageId: getHeader(headers, "Message-ID"),
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      subject: getHeader(headers, "Subject"),
      date: getHeader(headers, "Date"),
      bodyText: text,
      bodyHtml: html
    };
  });

  return { id: data.id!, messages };
}

// The one function in this whole service that actually sends mail.
// Every other function here only ever reads. This is called from
// exactly one place: email-draft.service's sendDraft, itself only
// reachable from the explicit, user-confirmed POST /drafts/:id/send
// route - never from an automation, a scheduler tick, or the AI
// drafter, which has no access to this function at all.
export async function sendRawMessage(
  userId: string,
  raw: string,
  threadId?: string
): Promise<{ id: string }> {
  const accessToken = await getValidAccessToken(userId);
  const gmail = getGmailClient(accessToken);

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      ...(threadId ? { threadId } : {})
    }
  });

  if (!data.id) {
    throw new Error("Gmail did not return a message id for the sent email.");
  }

  return { id: data.id };
}
