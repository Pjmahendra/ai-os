import type { Tool } from "./types.js";

export class EchoTool implements Tool {
  readonly name = "echo";

  readonly description =
    "Returns the input message unchanged.";

  async execute(
    input: unknown
  ): Promise<unknown> {
    return {
      echoed: input
    };
  }
}
