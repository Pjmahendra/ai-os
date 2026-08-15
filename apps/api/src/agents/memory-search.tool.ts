import type {
  Tool,
  ToolContext
} from "@ai-os/ai-tools";

import {
  searchMemories
} from "../services/memory.service.js";

export class MemorySearchTool implements Tool {
  readonly name = "memory.search";

  readonly description =
    "Searches the current user's saved long-term memories by keyword. " +
    "Input may contain a query string; omit it to list recent memories. " +
    "Use this before memory.update or memory.delete to find the exact " +
    "memory id — never invent an id.";

  async execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown> {
    if (!context.userId) {
      throw new Error(
        "memory.search requires a userId"
      );
    }

    const data =
      typeof input === "object" && input !== null
        ? (input as Record<string, unknown>)
        : {};

    const query =
      typeof data.query === "string"
        ? data.query
        : undefined;

    return searchMemories(
      context.userId,
      query
    );
  }
}
