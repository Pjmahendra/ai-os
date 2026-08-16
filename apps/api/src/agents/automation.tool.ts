import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  runAutomationByName
} from "../services/automation-runner.service.js";

export class AutomationExecuteTool
  implements Tool {
  readonly name = "automation.execute";

  readonly description =
    "Executes one of the user's stored and enabled AI-OS automations. " +
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
        "automation.execute requires an input object"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (typeof data.name !== "string") {
      throw new Error(
        "automation.execute requires an automation name"
      );
    }

    if (!context.userId) {
      throw new Error(
        "automation.execute requires a userId"
      );
    }

    const extraInput =
      typeof data.input === "object" &&
      data.input !== null
        ? data.input as Record<string, unknown>
        : {};

    return runAutomationByName(
      context.userId,
      data.name,
      extraInput
    );
  }
}