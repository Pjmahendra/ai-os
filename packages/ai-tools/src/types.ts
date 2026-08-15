export interface ToolContext {
  readonly userId?: string;
}

export interface Tool {
  readonly name: string;
  readonly description: string;

  execute(
    input: unknown,
    context: ToolContext
  ): Promise<unknown>;
}
