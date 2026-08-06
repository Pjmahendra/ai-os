import { EchoTool } from "./echo.tool.js";
import { Tool } from "./tool.js";

class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description
    }));
  }
}

export const registry = new ToolRegistry();

registry.register(new EchoTool());