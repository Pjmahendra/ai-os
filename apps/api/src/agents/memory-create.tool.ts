import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  createMemory
} from "../services/memory.service.js";

export class MemoryCreateTool implements Tool {
  readonly name = "memory.create";

  readonly description =
    "Saves a new long-term memory for the current user " +
    "(a fact, preference, or note to recall later). " +
    "Input must contain content, and optionally a short summary.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "memory.create requires an input object"
      );
    }

    if (!context.userId) {
      throw new Error(
        "memory.create requires a userId"
      );
    }

    const data =
      input as Record<string, unknown>;

    if (
      typeof data.content !== "string" ||
      data.content.trim().length === 0
    ) {
      throw new Error(
        "memory.create requires non-empty content"
      );
    }

    const summary =
      typeof data.summary === "string"
        ? data.summary
        : undefined;

    return createMemory(
      context.userId,
      data.content,
      summary
    );
  }
}
