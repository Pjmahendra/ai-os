import { Tool, ToolContext } from "./tool.js";

export class EchoTool implements Tool {
  name = "echo";

  description = "Returns the input unchanged.";

  async execute(
    input: string,
    _context: ToolContext
  ): Promise<string> {
    return input;
  }
}
