import { AIEmailDrafter } from "@ai-os/ai-email";
import { prisma } from "../database/prisma.js";
import { buildRawMessage } from "../utils/mime.js";
import { getAccountForUser } from "./email-account.service.js";
import {
  getThread,
  sendRawMessage,
  type EmailMessage
} from "./email.service.js";

const drafter = new AIEmailDrafter();

// Pulls the bare address out of a "Display Name <addr@x.com>" header
// value. Falls back to the raw header if it isn't in that shape.
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match?.[1] ?? from.trim();
}

// A crude but dependency-free HTML-to-text fallback, used only to
// give the AI drafter something readable when a message has no
// plain-text part at all. This never reaches a user - it's model
// input, not rendered output (the Inbox UI still uses the sandboxed
// iframe for actual HTML display).
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function messageForContext(m: EmailMessage) {
  return {
    from: m.from,
    date: m.date,
    body: m.bodyText ?? stripHtml(m.bodyHtml ?? "")
  };
}

async function requireAccount(userId: string) {
  const account = await getAccountForUser(userId);

  if (!account) {
    throw new Error("No Gmail account connected for this user.");
  }

  return account;
}

export async function generateAIReply(
  userId: string,
  threadId: string,
  instruction: string
) {
  const account = await requireAccount(userId);
  const thread = await getThread(userId, threadId);
  const lastMessage = thread.messages[thread.messages.length - 1];

  if (!lastMessage) {
    throw new Error("Thread has no messages to reply to.");
  }

  const draft = await drafter.draftReply(
    thread.messages.map(messageForContext),
    instruction,
    lastMessage.subject
  );

  return prisma.emailDraft.create({
    data: {
      userId,
      emailAccountId: account.id,
      threadId,
      inReplyToMessageId: lastMessage.messageId || null,
      to: extractEmailAddress(lastMessage.from),
      subject: draft.subject,
      body: draft.body,
      aiGenerated: true
    }
  });
}

export async function generateAINew(
  userId: string,
  to: string,
  instruction: string,
  memories: readonly string[] = []
) {
  const account = await requireAccount(userId);

  const draft = await drafter.draftNew(instruction, memories);

  return prisma.emailDraft.create({
    data: {
      userId,
      emailAccountId: account.id,
      to,
      subject: draft.subject,
      body: draft.body,
      aiGenerated: true
    }
  });
}

export async function createDraft(
  userId: string,
  data: { to: string; subject: string; body: string }
) {
  const account = await requireAccount(userId);

  return prisma.emailDraft.create({
    data: {
      userId,
      emailAccountId: account.id,
      to: data.to,
      subject: data.subject,
      body: data.body,
      aiGenerated: false
    }
  });
}

export async function listDrafts(userId: string) {
  return prisma.emailDraft.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getDraft(userId: string, id: string) {
  return prisma.emailDraft.findFirst({
    where: { id, userId }
  });
}

export async function updateDraft(
  userId: string,
  id: string,
  data: { to?: string; subject?: string; body?: string }
) {
  return prisma.emailDraft.updateMany({
    where: { id, userId, status: "draft" },
    data
  });
}

export async function deleteDraft(userId: string, id: string) {
  return prisma.emailDraft.deleteMany({
    where: { id, userId }
  });
}

// The single, genuinely irreversible action in this whole feature.
// No automation, scheduler, or AI tool has any path to this function
// or to sendRawMessage underneath it - it only ever runs from an
// explicit, user-confirmed POST /drafts/:id/send request.
export async function sendDraft(userId: string, draftId: string) {
  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, userId }
  });

  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (draft.status === "sent") {
    throw new Error("This draft has already been sent.");
  }

  const raw = buildRawMessage({
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
    ...(draft.inReplyToMessageId
      ? { inReplyTo: draft.inReplyToMessageId }
      : {})
  });

  // The send attempt happens here, and only here. Everything after
  // this point is just recording what happened - a failure updating
  // the DB record must never be able to look like "the send never
  // happened, try again", since Gmail may have already accepted the
  // message. So: capture whether the send itself failed, then do
  // exactly one status update reflecting that - never retry the send
  // and never let a later DB error relabel a real success as failed.
  let sendError: string | null = null;

  try {
    await sendRawMessage(
      userId,
      raw,
      draft.threadId ?? undefined
    );
  } catch (error) {
    sendError =
      error instanceof Error
        ? error.message
        : "Failed to send email";
  }

  const updated = await prisma.emailDraft.update({
    where: { id: draft.id },
    data: sendError
      ? { status: "failed", error: sendError }
      : { status: "sent", sentAt: new Date(), error: null }
  });

  if (sendError) {
    throw new Error(sendError);
  }

  return updated;
}
