import { describe, expect, it } from "vitest";
import type { Plan } from "@ai-os/ai-planner";
import { formatAgentResponse } from "./response-formatter.js";
import type { ExecutionResult } from "./executor.agent.js";

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    goal: "do the thing",
    intent: "tool",
    steps: [],
    ...overrides
  };
}

describe("formatAgentResponse", () => {
  it("returns the goal verbatim for a clarification (answer, no steps)", () => {
    const p = plan({
      goal: "Clarification is required to identify the automation",
      intent: "answer",
      steps: []
    });

    const execution: ExecutionResult = {
      success: true,
      results: []
    };

    expect(formatAgentResponse(p, execution)).toBe(
      "Clarification is required to identify the automation"
    );
  });

  it("summarizes automation.create with a schedule", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "automation.create",
          input: {
            name: "Standup Reminder",
            schedule: "0 9 * * *"
          },
          status: "success",
          result: { id: "abc" }
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain('created "Standup Reminder"');
    expect(message).toContain('"0 9 * * *"');
  });

  it("summarizes automation.toggle", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "automation.toggle",
          input: { name: "Standup Reminder", enabled: false },
          status: "success",
          result: { success: true }
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      '"Standup Reminder" is now disabled.'
    );
  });

  it("summarizes automation.delete", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "automation.delete",
          input: { name: "Standup Reminder" },
          status: "success",
          result: {}
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      'Deleted "Standup Reminder".'
    );
  });

  it("reports a failed step with the tool name and error", () => {
    const execution: ExecutionResult = {
      success: false,
      results: [
        {
          stepId: "step-1",
          tool: "automation.execute",
          input: { name: "Standup Reminder" },
          status: "error",
          error: "Automation is disabled"
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("automation.execute");
    expect(message).toContain("Automation is disabled");
  });

  it("skips steps with no tool and falls back to the goal when nothing else was said", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          action: "just thinking",
          status: "skipped",
          reason: "No tool specified"
        }
      ]
    };

    expect(
      formatAgentResponse(
        plan({ goal: "Just a thought" }),
        execution
      )
    ).toBe("Just a thought");
  });

  it("lists automations for automation.list", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "automation.list",
          input: {},
          status: "success",
          result: [
            { name: "Standup Reminder" },
            { name: "EOD Summary" }
          ]
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("2 automations");
    expect(message).toContain("Standup Reminder");
    expect(message).toContain("EOD Summary");
  });

  it("reports an empty automation.list distinctly", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "automation.list",
          input: {},
          status: "success",
          result: []
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      "You don't have any saved automations yet."
    );
  });
});
