import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  createAutomation
} from "../services/automation.service.js";

function normalizeSchedule(
  scheduleType: unknown,
  schedule: unknown
): {
  scheduleType?: string;
  schedule?: string;
} {
  if (
    typeof scheduleType !== "string" ||
    typeof schedule !== "string"
  ) {
    return {};
  }

  // Already a valid cron-style schedule.
  if (scheduleType === "cron") {
    return {
      scheduleType: "cron",
      schedule
    };
  }

  // Convert daily "HH:MM" into 5-field cron.
  if (scheduleType === "daily") {
    const match =
      schedule.match(
        /^([01]\d|2[0-3]):([0-5]\d)$/
      );

    if (!match) {
      throw new Error(
        `Invalid daily schedule "${schedule}". Expected HH:MM.`
      );
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    return {
      scheduleType: "cron",
      schedule: `${minute} ${hour} * * *`
    };
  }

  throw new Error(
    `Unsupported scheduleType "${scheduleType}". Use cron.`
  );
}

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
      normalizeSchedule(
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