import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  deleteMemory
} from "../services/memory.service.js";

export class MemoryDeleteTool implements Tool {
  readonly name = "memory.delete";

  readonly description =
    "Deletes an existing long-term memory belonging to the current user. " +
    "Input must contain the exact memory id (from RELEVANT MEMORIES or " +
    "memory.search — never invented).";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "memory.delete requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "memory.delete requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (
      typeof data.id !== "string" ||
      data.id.trim().length === 0
    ) {
      throw new Error(
        "memory.delete requires the exact memory id"
      );
    }

    await deleteMemory(
      context.userId,
      data.id
    );

    return {
      success: true,
      id: data.id
    };
  }
}
