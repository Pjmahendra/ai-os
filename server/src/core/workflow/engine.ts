import { WorkflowContext, WorkflowStep } from "./types.js";

export class WorkflowEngine {
  private readonly steps: WorkflowStep[] = [];

  register(step: WorkflowStep) {
    this.steps.push(step);
  }

  async run(context: WorkflowContext) {
    for (const step of this.steps) {
      await step.execute(context);
    }
  }
}
