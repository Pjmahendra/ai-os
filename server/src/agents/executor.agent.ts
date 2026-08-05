import { Plan } from "./planner.agent.js";

export interface ExecutionResult {
  success: boolean;
  results: string[];
}

export async function executePlan(
  plan: Plan
): Promise<ExecutionResult> {
  const results: string[] = [];

  for (const step of plan.steps) {
    results.push(`✓ ${step}`);
  }

  return {
    success: true,
    results
  };
}
