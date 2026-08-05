export interface WorkflowContext {
  userId: string;
  message: string;
}

export interface WorkflowStep {
  name: string;
  execute(context: WorkflowContext): Promise<void>;
}