import type {
  Tool,
  ToolContext
} from "./types.js";

export class ToolRegistry {
  private readonly tools = new Map<
    string,
    Tool
  >();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool "${tool.name}" is already registered`
      );
    }

    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);

    if (tool === undefined) {
      throw new Error(
        `Tool "${name}" is not registered`
      );
    }

    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): readonly Tool[] {
    return [...this.tools.values()];
  }

  async execute(
    name: string,
    input: unknown,
    context: ToolContext = {}
  ): Promise<unknown> {
    const tool = this.get(name);

    return tool.execute(input, context);
  }
}
