import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  setAutomationEnabled,
  getUserAutomations
} from "../services/automation.service.js";

export class AutomationToggleTool implements Tool {
  readonly name = "automation.toggle";

  readonly description =
    "Enables or disables an existing saved automation. " +
    "Input must contain the exact automation name and enabled boolean.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "automation.toggle requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "automation.toggle requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (typeof data.name !== "string") {
      throw new Error(
        "Automation name is required"
      );
    }

    if (typeof data.enabled !== "boolean") {
      throw new Error(
        "enabled must be a boolean"
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
      await setAutomationEnabled(
        context.userId,
        automation.id,
        data.enabled
      );

    return {
      success: result.count > 0,
      enabled: data.enabled,
      automationId: automation.id
    };
  }
}