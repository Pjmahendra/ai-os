import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  getUserAutomations
} from "../services/automation.service.js";

export class AutomationListTool implements Tool {
  readonly name = "automation.list";

  readonly description =
    "Lists the current user's saved automations. " +
    "Use this to find an automation by name or inspect available automations.";

  async execute(
    _input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error(
        "automation.list requires a userId"
      );
    }

    return getUserAutomations(
      context.userId
    );
  }
}
