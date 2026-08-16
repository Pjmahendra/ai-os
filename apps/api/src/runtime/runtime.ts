import { AgentContext, AgentResponse } from "./types.js";

export class Runtime {
  async run(context: AgentContext): Promise<AgentResponse> {
    return {
      success: true,
      reply: "Runtime initialized.",
      toolCalls: []
    };
  }
}

export const runtime = new Runtime();
