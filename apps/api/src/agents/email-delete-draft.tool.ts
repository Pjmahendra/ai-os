import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { deleteDraft } from "../services/email-draft.service.js";

export class EmailDeleteDraftTool implements Tool {
  readonly name = "email.deleteDraft";

  readonly description =
    "Deletes an existing email draft by its exact draftId (from a " +
    "prior email.listDrafts call). This deletes the saved draft " +
    "itself, not a real sent email.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.deleteDraft requires a userId");
    }

    if (typeof input !== "object" || input === null) {
      throw new Error("email.deleteDraft requires an input object");
    }

    const data = input as Record<string, unknown>;

    if (typeof data.draftId !== "string") {
      throw new Error("draftId is required");
    }

    const result = await deleteDraft(context.userId, data.draftId);

    if (result.count === 0) {
      throw new Error("Draft not found");
    }

    return { success: true, draftId: data.draftId };
  }
}
