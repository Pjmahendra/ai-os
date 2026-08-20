import { AIRuntime } from "@ai-os/ai-runtime";
import type { DraftResult, ThreadContextMessage } from "./types.js";

// No tool-calling or send capability is exposed to this model at all -
// it only ever returns {subject, body} text fields for a human to
// review. There is nothing send-capable it could invoke even if it
// tried; sending only ever happens from the API's explicit,
// user-confirmed send endpoint (Phase 5), never from here.
export class AIEmailDrafter {
  constructor(
    private readonly runtime = new AIRuntime()
  ) {}

  async draftReply(
    thread: readonly ThreadContextMessage[],
    instruction: string,
    threadSubject = ""
  ): Promise<DraftResult> {
    const draft = await this.draftWithRetry(
      this.buildReplySystemPrompt(thread, threadSubject),
      instruction,
      2
    );

    // The reply subject is deterministic ("Re: " + the thread's
    // existing subject) - there's no reason to trust the model's
    // guess for it, and without the real subject in hand it has
    // previously hallucinated one by paraphrasing its own
    // instructions. Compute it in code; only the body is genuinely
    // generated content.
    return {
      subject: this.computeReplySubject(threadSubject),
      body: draft.body
    };
  }

  private computeReplySubject(threadSubject: string): string {
    const trimmed = threadSubject.trim();

    if (!trimmed) {
      return "Re:";
    }

    return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
  }

  async draftNew(
    instruction: string,
    memories: readonly string[] = []
  ): Promise<DraftResult> {
    return this.draftWithRetry(
      this.buildNewSystemPrompt(memories),
      instruction,
      2
    );
  }

  private buildReplySystemPrompt(
    thread: readonly ThreadContextMessage[],
    threadSubject: string
  ): string {
    const threadContext =
      thread.length === 0
        ? "No prior messages in this thread."
        : thread
            .map(
              (m) =>
                `From: ${m.from}\nDate: ${m.date}\n${m.body}`
            )
            .join("\n\n---\n\n");

    return `
You are drafting a reply to an email thread on behalf of the user.
You never send email - you only produce a draft for the user to
review, edit, and send themselves.

THREAD SUBJECT: ${threadSubject || "(none)"}

EMAIL THREAD (oldest first):
${threadContext}

Write a reply that follows the user's instruction below, in a tone
appropriate to the thread. Keep it concise unless the instruction
asks for more detail.

Return ONLY valid JSON, no markdown, no explanations, matching this
exact structure:

{
  "subject": "string",
  "body": "string"
}

The caller computes the final subject line itself, so the "subject"
field is ignored - always return the THREAD SUBJECT above verbatim
for it. The body should be plain text (no HTML), using \\n for line
breaks, and must NOT repeat the subject as a "Subject:" line - it
should start directly with the reply's content (e.g. a greeting or
the first sentence).
`;
  }

  private buildNewSystemPrompt(
    memories: readonly string[]
  ): string {
    const memoryContext =
      memories.length === 0
        ? "No relevant memories are available."
        : memories.map((m) => `- ${m}`).join("\n");

    return `
You are drafting a new email on behalf of the user. You never send
email - you only produce a draft for the user to review, edit, and
send themselves.

RELEVANT MEMORIES (long-term facts saved about the user; use them
when relevant):
${memoryContext}

Return ONLY valid JSON, no markdown, no explanations, matching this
exact structure:

{
  "subject": "string",
  "body": "string"
}

The body should be plain text (no HTML), using \\n for line breaks,
and must NOT repeat the subject as a "Subject:" line - the subject is
already a separate field, so the body should start directly with the
email's content (e.g. a greeting or the first sentence).
`;
  }

  private async draftWithRetry(
    systemPrompt: string,
    instruction: string,
    attemptsRemaining: number
  ): Promise<DraftResult> {
    const response = await this.runtime.run({
      message: instruction,
      systemPrompt
    });

    if (
      !response ||
      typeof response.content !== "string"
    ) {
      console.error(
        "AIEmailDrafter received invalid runtime response:",
        response
      );

      throw new Error(
        "AI email drafter did not return valid text content"
      );
    }

    try {
      return this.parseDraft(response.content);
    } catch (error) {
      if (attemptsRemaining <= 0) {
        throw error;
      }

      console.warn(
        "Email draft output could not be parsed/validated. Retrying:",
        error instanceof Error ? error.message : error
      );

      return this.draftWithRetry(
        systemPrompt,
        instruction,
        attemptsRemaining - 1
      );
    }
  }

  private parseDraft(content: string): DraftResult {
    const cleaned = this.extractJson(content);

    if (!cleaned) {
      throw new Error("Email drafter returned empty content");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Email drafter returned invalid JSON:", cleaned);
      throw new Error("Email drafter returned invalid JSON");
    }

    return this.validateDraft(parsed);
  }

  /**
   * Strips markdown code fences and, if the model wrapped the JSON in
   * any surrounding prose, extracts the outermost {...} object.
   */
  private extractJson(content: string): string {
    const withoutFences = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (
      withoutFences.startsWith("{") &&
      withoutFences.endsWith("}")
    ) {
      return withoutFences;
    }

    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");

    if (start === -1 || end === -1 || end < start) {
      return withoutFences;
    }

    return withoutFences.slice(start, end + 1).trim();
  }

  private validateDraft(value: unknown): DraftResult {
    if (typeof value !== "object" || value === null) {
      throw new Error("Email drafter returned an invalid draft");
    }

    const candidate = value as Record<string, unknown>;

    if (typeof candidate.subject !== "string") {
      throw new Error("Email draft is missing subject");
    }

    if (typeof candidate.body !== "string") {
      throw new Error("Email draft is missing body");
    }

    return {
      subject: candidate.subject,
      body: candidate.body
    };
  }
}
