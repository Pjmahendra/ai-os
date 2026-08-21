import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { generateAINew } from "../services/email-draft.service.js";
import { listMemories } from "../services/memory.service.js";

// Generates and SAVES a new (non-reply) draft - never sends. See
// email-draft-reply.tool.ts for why there is deliberately no
// email.send tool in this registry.
export class EmailDraftNewTool implements Tool {
  readonly name = "email.draftNew";

  readonly description =
    "Generates and saves a new email draft (not a reply to an " +
    "existing thread), for the user to review, edit, and send " +
    "themselves from the Inbox page. Requires the recipient's email " +
    "address and an instruction describing what the email should " +
    "say. This tool NEVER sends the email - it only creates an " +
    "editable draft.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.draftNew requires a userId");
    }

    if (typeof input !== "object" || input === null) {
      throw new Error("email.draftNew requires an input object");
    }

    const data = input as Record<string, unknown>;

    if (typeof data.to !== "string") {
      throw new Error("to (recipient email address) is required");
    }

    if (typeof data.instruction !== "string") {
      throw new Error("instruction is required");
    }

    const memories = await listMemories(context.userId);

    return generateAINew(
      context.userId,
      data.to,
      data.instruction,
      memories.map((m) => m.summary ?? m.content)
    );
  }
}
