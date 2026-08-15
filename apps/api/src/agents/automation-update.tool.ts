import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  updateAutomation
} from "../services/automation.service.js";
import { normalizeCronSchedule } from "../utils/cron-schedule.js";

export class AutomationUpdateTool implements Tool {
  readonly name = "automation.update";

  readonly description =
    "Updates an existing saved automation belonging to the current user. " +
    "Input must contain the exact automation name and one or more fields to update. " +
    "All schedules are stored as 5-field cron expressions. " +
    "For automation configuration, use config.message.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "automation.update requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "automation.update requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (typeof data.name !== "string") {
      throw new Error(
        "Automation name is required"
      );
    }

    let config: unknown;

    if (data.config !== undefined) {
      if (
        typeof data.config !== "object" ||
        data.config === null ||
        Array.isArray(data.config)
      ) {
        throw new Error(
          "config must be an object"
        );
      }

      const configData =
        data.config as Record<string, unknown>;

      const allowedKeys = [
        "message"
      ];

      const invalidKeys =
        Object.keys(configData).filter(
          (key) =>
            !allowedKeys.includes(key)
        );

      if (invalidKeys.length > 0) {
        throw new Error(
          `Unsupported config field(s): ${invalidKeys.join(", ")}. ` +
          `Use config.message.`
        );
      }

      if (
        configData.message !== undefined &&
        typeof configData.message !== "string"
      ) {
        throw new Error(
          "config.message must be a string"
        );
      }

      config = configData;
    }

    const normalized =
      normalizeCronSchedule(
        data.scheduleType,
        data.schedule
      );

    return updateAutomation(
      context.userId,
      undefined,
      {
        name: data.name,

        ...(typeof data.newName === "string"
          ? { newName: data.newName }
          : {}),

        ...(typeof data.workflow === "string"
          ? { workflow: data.workflow }
          : {}),

        ...(config !== undefined
          ? { config }
          : {}),

        ...(normalized.scheduleType !== undefined
          ? {
              scheduleType:
                normalized.scheduleType
            }
          : {}),

        ...(normalized.schedule !== undefined
          ? {
              schedule:
                normalized.schedule
            }
          : {}),

        ...(typeof data.enabled === "boolean"
          ? { enabled: data.enabled }
          : {})
      }
    );
  }
}