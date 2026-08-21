import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { findThreadId, getThread } from "../services/email.service.js";

export class EmailReadThreadTool implements Tool {
  readonly name = "email.readThread";

  readonly description =
    "Reads the full messages of one email thread. Identify it either " +
    "with the exact threadId from a prior email.listThreads call, or " +
    "directly with subject and/or from (sender) - e.g. the subject " +
    "text or part of the sender's name/address as the user described " +
    "it. Prefer subject/from when the thread isn't already known from " +
    "this conversation, so you don't need a separate listThreads call " +
    "first. Throws if subject/from matches zero or more than one " +
    "thread - never invent a threadId.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.readThread requires a userId");
    }

    if (typeof input !== "object" || input === null) {
      throw new Error("email.readThread requires an input object");
    }

    const data = input as Record<string, unknown>;

    const threadId = await resolveThreadId(context.userId, data);

    return getThread(context.userId, threadId);
  }
}

export async function resolveThreadId(
  userId: string,
  data: Record<string, unknown>
): Promise<string> {
  if (typeof data.threadId === "string") {
    return data.threadId;
  }

  const subject =
    typeof data.subject === "string" ? data.subject : undefined;
  const from = typeof data.from === "string" ? data.from : undefined;

  if (!subject && !from) {
    throw new Error(
      "threadId, or subject/from to identify the thread, is required"
    );
  }

  return findThreadId(userId, { subject, from });
}
