import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { generateAIReply } from "../services/email-draft.service.js";
import { resolveThreadId } from "./email-read-thread.tool.js";

// Generates and SAVES a draft reply - it never sends anything. There
// is no email.send tool in this registry and never will be: sending
// only ever happens from the explicit, user-confirmed Send button in
// the Inbox UI (apps/api/src/controllers/email-draft.controller.ts's
// sendDraftController). Keeping that the one path to
// gmail.users.messages.send is a deliberate safety boundary, not an
// oversight - an AI agent must never be able to decide on its own
// that a message is ready to actually leave the outbox.
export class EmailDraftReplyTool implements Tool {
  readonly name = "email.draftReply";

  readonly description =
    "Generates and saves a draft reply to an email thread, for the " +
    "user to review, edit, and send themselves from the Inbox page. " +
    "Identify the thread either with the exact threadId from a prior " +
    "email.listThreads call, or directly with subject and/or from " +
    "(sender) as the user described it - prefer this over a separate " +
    "listThreads call when possible. Also requires an instruction " +
    "describing what the reply should say. This tool NEVER sends the " +
    "email - it only creates an editable draft.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.draftReply requires a userId");
    }

    if (typeof input !== "object" || input === null) {
      throw new Error("email.draftReply requires an input object");
    }

    const data = input as Record<string, unknown>;

    if (typeof data.instruction !== "string") {
      throw new Error("instruction is required");
    }

    const threadId = await resolveThreadId(context.userId, data);

    return generateAIReply(
      context.userId,
      threadId,
      data.instruction
    );
  }
}
