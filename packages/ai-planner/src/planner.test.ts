import { describe, expect, it } from "vitest";
import { AIRuntime } from "@ai-os/ai-runtime";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "@ai-os/ai-llm";

import { AIPlanner } from "./planner.js";

/**
 * A scriptable fake LLMProvider: each call to chat() returns the next
 * queued response and records the request it was given, so tests can
 * assert both on planner behavior and on what the planner actually
 * sent as its prompt.
 */
class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  readonly requests: LLMRequest[] = [];

  constructor(
    private readonly responses: readonly string[]
  ) {}

  async chat(
    request: LLMRequest
  ): Promise<LLMResponse> {
    this.requests.push(request);

    const index = this.requests.length - 1;
    const content = this.responses[index];

    if (content === undefined) {
      throw new Error(
        "FakeLLMProvider ran out of queued responses"
      );
    }

    return {
      content,
      model: "fake-model"
    };
  }
}

function plannerWith(
  responses: readonly string[]
): { planner: AIPlanner; provider: FakeLLMProvider } {
  const provider = new FakeLLMProvider(responses);
  const runtime = new AIRuntime(provider);

  return {
    planner: new AIPlanner(runtime),
    provider
  };
}

const VALID_PLAN = JSON.stringify({
  goal: "Say hello",
  intent: "answer",
  steps: []
});

describe("AIPlanner JSON extraction", () => {
  it("parses a clean JSON response", async () => {
    const { planner } = plannerWith([VALID_PLAN]);

    const plan = await planner.createPlan("hi");

    expect(plan).toEqual({
      goal: "Say hello",
      intent: "answer",
      steps: []
    });
  });

  it("strips markdown code fences", async () => {
    const { planner } = plannerWith([
      "```json\n" + VALID_PLAN + "\n```"
    ]);

    const plan = await planner.createPlan("hi");

    expect(plan.goal).toBe("Say hello");
  });

  it("extracts the JSON object even when wrapped in prose", async () => {
    const { planner } = plannerWith([
      `Sure! Here is the plan:\n${VALID_PLAN}\nHope that helps!`
    ]);

    const plan = await planner.createPlan("hi");

    expect(plan.goal).toBe("Say hello");
  });
});

describe("AIPlanner retry behavior", () => {
  it("retries once and succeeds when the first response is invalid JSON", async () => {
    const { planner, provider } = plannerWith([
      "not json at all",
      VALID_PLAN
    ]);

    const plan = await planner.createPlan("hi");

    expect(plan.goal).toBe("Say hello");
    expect(provider.requests).toHaveLength(2);
  });

  it("throws after exhausting the retries when every attempt is invalid", async () => {
    const { planner, provider } = plannerWith([
      "not json",
      "still not json",
      "nope, still not json"
    ]);

    await expect(
      planner.createPlan("hi")
    ).rejects.toThrow("Planner returned invalid JSON");

    // One original attempt + two retries, no more.
    expect(provider.requests).toHaveLength(3);
  });

  it("retries when the JSON is well-formed but fails plan validation", async () => {
    const invalid = JSON.stringify({ goal: "missing intent/steps" });
    const { planner, provider } = plannerWith([
      invalid,
      VALID_PLAN
    ]);

    const plan = await planner.createPlan("hi");

    expect(plan.goal).toBe("Say hello");
    expect(provider.requests).toHaveLength(2);
  });
});

describe("AIPlanner plan validation", () => {
  it("rejects an invalid intent", async () => {
    const badIntent = JSON.stringify({
      goal: "x",
      intent: "not-a-real-intent",
      steps: []
    });

    const { planner } = plannerWith([
      badIntent,
      badIntent,
      badIntent
    ]);

    await expect(
      planner.createPlan("hi")
    ).rejects.toThrow("Planner returned an invalid intent");
  });

  it("fills in a default step id when missing", async () => {
    const plan = JSON.stringify({
      goal: "x",
      intent: "tool",
      steps: [{ action: "do something", tool: "echo" }]
    });

    const { planner } = plannerWith([plan]);

    const result = await planner.createPlan("hi");

    expect(result.steps[0]?.id).toBe("step-1");
    expect(result.steps[0]?.tool).toBe("echo");
  });
});

describe("AIPlanner prompt context", () => {
  it("includes tool descriptions, memories, and conversation history in the prompt", async () => {
    const { provider } = plannerWith([VALID_PLAN]);
    const runtime = new AIRuntime(provider);
    const planner = new AIPlanner(runtime);

    await planner.createPlan(
      "run my report automation",
      [
        {
          name: "automation.execute",
          description: "Executes a saved automation",
          execute: async () => undefined
        }
      ],
      ['[automation] name="Daily Report", enabled=true, workflow="ai-os-notification"'],
      [{ role: "user", content: "earlier message" }]
    );

    const prompt = provider.requests[0]?.messages.find(
      (m) => m.role === "system"
    )?.content;

    expect(prompt).toContain("automation.execute");
    expect(prompt).toContain("Daily Report");
    expect(prompt).toContain("earlier message");
  });
});

describe("AIPlanner.generateAnswer", () => {
  it("returns the model's plain-text content", async () => {
    const { planner } = plannerWith(["Hi! 2 + 2 is 4."]);

    const answer = await planner.generateAnswer("what is 2+2?");

    expect(answer).toBe("Hi! 2 + 2 is 4.");
  });

  it("tells the model it can never claim to have sent an email", async () => {
    const { planner, provider } = plannerWith(["ok"]);

    await planner.generateAnswer("send that email");

    const prompt = provider.requests[0]?.messages.find(
      (m) => m.role === "system"
    )?.content;

    expect(prompt).toContain("NEVER send");
    expect(prompt).toContain("Inbox page");
  });

  it("includes memories and conversation history in the prompt", async () => {
    const { planner, provider } = plannerWith(["ok"]);

    await planner.generateAnswer(
      "what did I ask before?",
      ["User's timezone is IST"],
      [{ role: "user", content: "earlier question" }]
    );

    const prompt = provider.requests[0]?.messages.find(
      (m) => m.role === "system"
    )?.content;

    expect(prompt).toContain("User's timezone is IST");
    expect(prompt).toContain("earlier question");
  });

  it("throws when the model returns invalid content", async () => {
    const provider = new FakeLLMProvider([""]);
    const runtime = new AIRuntime(provider);
    const planner = new AIPlanner(runtime);

    // Force an invalid response shape by having the provider return
    // something that isn't a usable string.
    provider.chat = async () => ({
      content: undefined as unknown as string,
      model: "fake-model"
    });

    await expect(
      planner.generateAnswer("hi")
    ).rejects.toThrow(
      "AI planner did not return valid text content"
    );
  });
});
