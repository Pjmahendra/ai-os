import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  createAutomation
} from "../services/automation.service.js";
import { normalizeCronSchedule } from "../utils/cron-schedule.js";

export class AutomationCreateTool implements Tool {
  readonly name = "automation.create";

  readonly description =
    "Creates a new automation for the current user. " +
    "Input must contain name, workflow, config, and optionally a schedule. " +
    "All schedules are stored as 5-field cron expressions.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "automation.create requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "automation.create requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (typeof data.name !== "string") {
      throw new Error(
        "Automation name is required"
      );
    }

    if (typeof data.workflow !== "string") {
      throw new Error(
        "Automation workflow is required"
      );
    }

    const config =
      typeof data.config === "object" &&
      data.config !== null &&
      !Array.isArray(data.config)
        ? data.config
        : {};

    const normalized =
      normalizeCronSchedule(
        data.scheduleType,
        data.schedule
      );

    return createAutomation(
      context.userId,
      data.name,
      data.workflow,
      config,
      normalized.scheduleType,
      normalized.schedule
    );
  }
}