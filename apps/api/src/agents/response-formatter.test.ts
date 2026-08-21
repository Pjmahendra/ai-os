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

  it("summarizes email.listThreads", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.listThreads",
          input: {},
          status: "success",
          result: [
            { id: "t1", subject: "Meeting notes", from: "boss@x.com" }
          ]
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("1 recent thread");
    expect(message).toContain("Meeting notes");
    expect(message).toContain("boss@x.com");
  });

  it("reports an empty email.listThreads distinctly", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.listThreads",
          input: {},
          status: "success",
          result: []
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      "Your inbox has no messages right now."
    );
  });

  it("summarizes email.readThread with the last message", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.readThread",
          input: { threadId: "t1" },
          status: "success",
          result: {
            id: "t1",
            messages: [
              {
                from: "boss@x.com",
                subject: "Meeting notes",
                bodyText: "Let's meet at 3pm."
              }
            ]
          }
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("boss@x.com");
    expect(message).toContain("Meeting notes");
    expect(message).toContain("Let's meet at 3pm.");
  });

  it("surfaces the generated subject and body for email.draftReply", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.draftReply",
          input: { threadId: "t1", instruction: "say thanks" },
          status: "success",
          result: {
            id: "d1",
            to: "boss@x.com",
            subject: "Re: Meeting notes",
            body: "Thanks, see you at 3pm."
          }
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("boss@x.com");
    expect(message).toContain("Re: Meeting notes");
    expect(message).toContain("Thanks, see you at 3pm.");
    expect(message.toLowerCase()).toContain("inbox");
    expect(message.toLowerCase()).toContain("can't send it");
  });

  it("surfaces the generated subject and body for email.draftNew", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.draftNew",
          input: { to: "a@x.com", instruction: "ask for a meeting" },
          status: "success",
          result: {
            id: "d2",
            to: "a@x.com",
            subject: "Meeting request",
            body: "Can we meet next week?"
          }
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("Meeting request");
    expect(message).toContain("Can we meet next week?");
  });

  it("summarizes email.listDrafts", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.listDrafts",
          input: {},
          status: "success",
          result: [
            {
              id: "d1",
              to: "a@x.com",
              subject: "Meeting request",
              status: "draft"
            }
          ]
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain("1 draft");
    expect(message).toContain("Meeting request");
    expect(message).toContain("a@x.com");
  });

  it("reports an empty email.listDrafts distinctly", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.listDrafts",
          input: {},
          status: "success",
          result: []
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      "You don't have any saved email drafts."
    );
  });

  it("confirms email.updateDraft without leaking internals", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.updateDraft",
          input: { draftId: "d1", body: "new body" },
          status: "success",
          result: { success: true, draftId: "d1" }
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toContain(
      "Updated that draft"
    );
  });

  it("confirms email.deleteDraft", () => {
    const execution: ExecutionResult = {
      success: true,
      results: [
        {
          stepId: "step-1",
          tool: "email.deleteDraft",
          input: { draftId: "d1" },
          status: "success",
          result: { success: true, draftId: "d1" }
        }
      ]
    };

    expect(formatAgentResponse(plan(), execution)).toBe(
      "Deleted that draft."
    );
  });

  it("surfaces a tool error rather than a generic success message", () => {
    const execution: ExecutionResult = {
      success: false,
      results: [
        {
          stepId: "step-1",
          tool: "email.draftReply",
          input: { threadId: "bad-id", instruction: "say thanks" },
          status: "error",
          error: "No Gmail account connected for this user."
        }
      ]
    };

    const message = formatAgentResponse(plan(), execution);

    expect(message).toContain(
      "No Gmail account connected for this user."
    );
  });
});
