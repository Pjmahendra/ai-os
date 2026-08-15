import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  getUserAutomations,
  deleteAutomation
} from "../services/automation.service.js";

export class AutomationDeleteTool implements Tool {
  readonly name = "automation.delete";

  readonly description =
    "Deletes an existing saved automation belonging to the current user. " +
    "Input must contain the exact automation name.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "automation.delete requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "automation.delete requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (typeof data.name !== "string") {
      throw new Error(
        "Automation name is required"
      );
    }

    const automations =
      await getUserAutomations(
        context.userId
      );

    const matches =
      automations.filter(
        (item) => item.name === data.name
      );

    if (matches.length === 0) {
      throw new Error(
        `Automation "${data.name}" not found`
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Multiple automations named "${data.name}" exist`
      );
    }

    const automation = matches[0];

    if (!automation) {
      throw new Error(
        `Automation "${data.name}" not found`
      );
    }

    const result =
      await deleteAutomation(
        context.userId,
        automation.id
      );

    return {
      success: result.count > 0,
      automationId: automation.id,
      name: automation.name
    };
  }
}
