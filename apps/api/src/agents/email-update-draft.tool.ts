import type { Tool, ToolContext } from "@ai-os/ai-tools";
import { updateDraft } from "../services/email-draft.service.js";

export class EmailUpdateDraftTool implements Tool {
  readonly name = "email.updateDraft";

  readonly description =
    "Edits an existing, not-yet-sent email draft's recipient, " +
    "subject, and/or body. Requires the exact draftId from a prior " +
    "email.listDrafts or email.draftReply/draftNew call. Include only " +
    "the fields the user wants changed. Cannot edit a draft that has " +
    "already been sent.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error("email.updateDraft requires a userId");
    }

    if (typeof input !== "object" || input === null) {
      throw new Error("email.updateDraft requires an input object");
    }

    const data = input as Record<string, unknown>;

    if (typeof data.draftId !== "string") {
      throw new Error("draftId is required");
    }

    const result = await updateDraft(context.userId, data.draftId, {
      ...(typeof data.to === "string" ? { to: data.to } : {}),
      ...(typeof data.subject === "string"
        ? { subject: data.subject }
        : {}),
      ...(typeof data.body === "string" ? { body: data.body } : {})
    });

    if (result.count === 0) {
      throw new Error(
        "Draft not found, or it has already been sent"
      );
    }

    return { success: true, draftId: data.draftId };
  }
}
