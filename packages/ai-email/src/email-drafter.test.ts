import { describe, expect, it } from "vitest";
import { AIRuntime } from "@ai-os/ai-runtime";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse
} from "@ai-os/ai-llm";

import { AIEmailDrafter } from "./email-drafter.js";

class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  readonly requests: LLMRequest[] = [];

  constructor(
    private readonly responses: readonly string[]
  ) {}

  async chat(request: LLMRequest): Promise<LLMResponse> {
    this.requests.push(request);

    const index = this.requests.length - 1;
    const content = this.responses[index];

    if (content === undefined) {
      throw new Error(
        "FakeLLMProvider ran out of queued responses"
      );
    }

    return { content, model: "fake-model" };
  }
}

function drafterWith(
  responses: readonly string[]
): { drafter: AIEmailDrafter; provider: FakeLLMProvider } {
  const provider = new FakeLLMProvider(responses);
  const runtime = new AIRuntime(provider);

  return { drafter: new AIEmailDrafter(runtime), provider };
}

const VALID_DRAFT = JSON.stringify({
  subject: "Re: Project update",
  body: "Thanks for the update, sounds good."
});

describe("AIEmailDrafter JSON extraction", () => {
  it("parses a clean JSON response", async () => {
    const { drafter } = drafterWith([VALID_DRAFT]);

    const draft = await drafter.draftReply(
      [{ from: "a@x.com", date: "today", body: "Here's the update." }],
      "Say thanks and confirm.",
      "Project update"
    );

    expect(draft).toEqual({
      subject: "Re: Project update",
      body: "Thanks for the update, sounds good."
    });
  });

  it("strips markdown code fences", async () => {
    const { drafter } = drafterWith([
      "```json\n" + VALID_DRAFT + "\n```"
    ]);

    const draft = await drafter.draftNew("Write a quick hello.");

    expect(draft.subject).toBe("Re: Project update");
  });

  it("extracts the JSON object even when wrapped in prose", async () => {
    const { drafter } = drafterWith([
      `Here's a draft:\n${VALID_DRAFT}\nLet me know if you'd like changes!`
    ]);

    const draft = await drafter.draftNew("Write a quick hello.");

    expect(draft.body).toBe("Thanks for the update, sounds good.");
  });
});

describe("AIEmailDrafter retry behavior", () => {
  it("retries and succeeds when the first response is invalid JSON", async () => {
    const { drafter, provider } = drafterWith([
      "not json at all",
      VALID_DRAFT
    ]);

    const draft = await drafter.draftNew("Write a quick hello.");

    expect(draft.subject).toBe("Re: Project update");
    expect(provider.requests).toHaveLength(2);
  });

  it("throws after exhausting retries when every attempt is invalid", async () => {
    const { drafter, provider } = drafterWith([
      "not json",
      "still not json",
      "nope, still not json"
    ]);

    await expect(
      drafter.draftNew("Write a quick hello.")
    ).rejects.toThrow("Email drafter returned invalid JSON");

    expect(provider.requests).toHaveLength(3);
  });

  it("retries when the JSON is well-formed but fails validation", async () => {
    const invalid = JSON.stringify({ subject: "missing body" });
    const { drafter, provider } = drafterWith([invalid, VALID_DRAFT]);

    const draft = await drafter.draftNew("Write a quick hello.");

    expect(draft.subject).toBe("Re: Project update");
    expect(provider.requests).toHaveLength(2);
  });
});

describe("AIEmailDrafter prompt context", () => {
  it("includes thread context and instruction for a reply draft", async () => {
    const { drafter, provider } = drafterWith([VALID_DRAFT]);

    await drafter.draftReply(
      [
        {
          from: "boss@company.com",
          date: "Mon",
          body: "Can you send the report by Friday?"
        }
      ],
      "Confirm I'll have it ready by Friday."
    );

    const systemPrompt = provider.requests[0]?.messages.find(
      (m) => m.role === "system"
    )?.content;
    const userMessage = provider.requests[0]?.messages.find(
      (m) => m.role === "user"
    )?.content;

    expect(systemPrompt).toContain("boss@company.com");
    expect(systemPrompt).toContain("send the report by Friday");
    expect(userMessage).toBe("Confirm I'll have it ready by Friday.");
  });

  it("includes memories for a new-email draft", async () => {
    const { drafter, provider } = drafterWith([VALID_DRAFT]);

    await drafter.draftNew("Ask for a meeting next week.", [
      "User's manager is Priya Shah"
    ]);

    const systemPrompt = provider.requests[0]?.messages.find(
      (m) => m.role === "system"
    )?.content;

    expect(systemPrompt).toContain("Priya Shah");
  });
});

describe("AIEmailDrafter reply subject", () => {
  // The model has previously hallucinated a subject by paraphrasing
  // its own instructions when it wasn't given the real one, so the
  // final subject is always computed in code from the real thread
  // subject and never trusted from the model's output.
  it("prefixes the real thread subject with 'Re: ', ignoring whatever the model returned", async () => {
    const modelSaidSomethingElse = JSON.stringify({
      subject: "a completely made up subject",
      body: "Sounds good, thanks!"
    });
    const { drafter } = drafterWith([modelSaidSomethingElse]);

    const draft = await drafter.draftReply(
      [{ from: "a@x.com", date: "today", body: "..." }],
      "Say thanks.",
      "Project update"
    );

    expect(draft.subject).toBe("Re: Project update");
    expect(draft.body).toBe("Sounds good, thanks!");
  });

  it("doesn't double-prefix a subject that's already a reply", async () => {
    const { drafter } = drafterWith([VALID_DRAFT]);

    const draft = await drafter.draftReply(
      [{ from: "a@x.com", date: "today", body: "..." }],
      "Say thanks.",
      "Re: Project update"
    );

    expect(draft.subject).toBe("Re: Project update");
  });

  it("falls back to a bare 'Re:' when no thread subject is given", async () => {
    const { drafter } = drafterWith([VALID_DRAFT]);

    const draft = await drafter.draftReply(
      [{ from: "a@x.com", date: "today", body: "..." }],
      "Say thanks."
    );

    expect(draft.subject).toBe("Re:");
  });
});
