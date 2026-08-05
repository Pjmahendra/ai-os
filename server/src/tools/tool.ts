export interface ToolContext {
  userId?: string;
}

export interface Tool {
  name: string;
  description: string;

  execute(
    input: string,
    context: ToolContext
  ): Promise<string>;
}