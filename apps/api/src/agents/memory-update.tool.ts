import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  updateMemory
} from "../services/memory.service.js";

export class MemoryUpdateTool implements Tool {
  readonly name = "memory.update";

  readonly description =
    "Updates an existing long-term memory belonging to the current user. " +
    "Input must contain the exact memory id (from RELEVANT MEMORIES or " +
    "memory.search — never invented) and the fields to change (content " +
    "and/or summary).";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "memory.update requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "memory.update requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (
      typeof data.id !== "string" ||
      data.id.trim().length === 0
    ) {
      throw new Error(
        "memory.update requires the exact memory id"
      );
    }

    if (
      data.content === undefined &&
      data.summary === undefined
    ) {
      throw new Error(
        "memory.update requires content and/or summary to change"
      );
    }

    return updateMemory(
      context.userId,
      data.id,
      {
        ...(typeof data.content === "string"
          ? { content: data.content }
          : {}),

        ...(typeof data.summary === "string"
          ? { summary: data.summary }
          : {})
      }
    );
  }
}
