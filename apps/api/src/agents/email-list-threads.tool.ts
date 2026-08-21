import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { listInboxThreads } from "../services/email.service.js";

export class EmailListThreadsTool implements Tool {
  readonly name = "email.listThreads";

  readonly description =
    "Lists recent threads from the user's connected Gmail inbox " +
    "(subject, sender, snippet, unread state). Use this to find a " +
    "thread by sender or subject before reading or replying to it.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.listThreads requires a userId");
    }

    const data =
      typeof input === "object" && input !== null
        ? (input as Record<string, unknown>)
        : {};

    const maxResults =
      typeof data.maxResults === "number" ? data.maxResults : undefined;

    const { threads } = await listInboxThreads(context.userId, {
      maxResults
    });

    return threads;
  }
}
