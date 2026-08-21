import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { listDrafts } from "../services/email-draft.service.js";

export class EmailListDraftsTool implements Tool {
  readonly name = "email.listDrafts";

  readonly description =
    "Lists the current user's saved email drafts (both AI-generated " +
    "and manually created), including their status (draft/sent/failed). " +
    "Use this to find a draft by recipient or subject before editing it.";

  async execute(
    _input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.listDrafts requires a userId");
    }

    return listDrafts(context.userId);
  }
}
