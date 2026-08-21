import type { Plan } from "@ai-os/ai-planner";
import type { ExecutionResult } from "./executor.agent.js";

interface StepRecord {
  readonly stepId?: string;
  readonly tool?: string;
  readonly action?: string;
  readonly input?: unknown;
  readonly status: string;
  readonly result?: unknown;
  readonly reason?: string;
  readonly error?: string;
}

/**
 * Turns a Plan + ExecutionResult into a short, human-readable reply
 * ("Done. I created 'Standup Reminder', scheduled 0 9 * * *.") instead
 * of making the caller read raw plan/execution JSON. Deliberately
 * deterministic/template-based rather than another LLM call — the
 * data needed is already known exactly, and a second model call would
 * add latency and a new place for hallucination/invalid output to
 * creep in for something the backend can state as fact.
 */
export function formatAgentResponse(
  plan: Plan,
  execution: ExecutionResult
): string {
  if (
    plan.intent === "answer" &&
    plan.steps.length === 0
  ) {
    return plan.goal;
  }

  const records = execution.results as readonly StepRecord[];

  const summaries = records
    .map(summarizeStep)
    .filter(
      (summary): summary is string =>
        typeof summary === "string" &&
        summary.length > 0
    );

  if (summaries.length === 0) {
    return plan.goal;
  }

  return summaries.join(" ");
}

function summarizeStep(
  step: StepRecord
): string | null {
  if (step.status === "skipped") {
    return null;
  }

  if (step.status === "error") {
    return `Sorry, "${step.tool ?? step.action ?? "that step"}" failed: ${
      step.error ?? "unknown error"
    }`;
  }

  const input =
    typeof step.input === "object" && step.input !== null
      ? (step.input as Record<string, unknown>)
      : {};

  const result =
    typeof step.result === "object" && step.result !== null
      ? (step.result as Record<string, unknown>)
      : {};

  const name =
    typeof input.name === "string"
      ? input.name
      : typeof result.name === "string"
        ? result.name
        : undefined;

  switch (step.tool) {
    case "automation.create": {
      const schedule =
        typeof input.schedule === "string"
          ? ` It will run on schedule "${input.schedule}".`
          : "";

      return `Done. I created "${name ?? "the automation"}".${schedule}`;
    }

    case "automation.update": {
      const newName =
        typeof input.newName === "string"
          ? input.newName
          : undefined;

      return newName
        ? `Renamed "${name}" to "${newName}".`
        : `Updated "${name ?? "the automation"}".`;
    }

    case "automation.toggle": {
      const enabled = input.enabled === true;

      return `"${name ?? "The automation"}" is now ${
        enabled ? "enabled" : "disabled"
      }.`;
    }

    case "automation.delete":
      return `Deleted "${name ?? "the automation"}".`;

    case "automation.execute":
      return `Ran "${name ?? "the automation"}" successfully.`;

    case "automation.list": {
      const automations = Array.isArray(step.result)
        ? (step.result as Array<Record<string, unknown>>)
        : [];

      if (automations.length === 0) {
        return "You don't have any saved automations yet.";
      }

      const names = automations
        .map((automation) => automation.name)
        .filter(
          (value): value is string =>
            typeof value === "string"
        );

      return `You have ${automations.length} automation${
        automations.length === 1 ? "" : "s"
      }: ${names.join(", ")}.`;
    }

    case "memory.create": {
      const content =
        typeof input.content === "string"
          ? input.content
          : "that";

      return `Got it — I'll remember: "${content}".`;
    }

    case "memory.search": {
      const memories = Array.isArray(step.result)
        ? (step.result as Array<Record<string, unknown>>)
        : [];

      if (memories.length === 0) {
        return "I don't have anything saved matching that.";
      }

      const contents = memories
        .slice(0, 5)
        .map((memory) => memory.content)
        .filter(
          (value): value is string =>
            typeof value === "string"
        );

      return `Here's what I remember: ${contents.join("; ")}.`;
    }

    case "memory.update":
      return "Updated that memory.";

    case "memory.delete":
      return "Forgot that.";

    case "n8n.execute":
      return "Ran the workflow successfully.";

    case "email.listThreads": {
      const threads = Array.isArray(step.result)
        ? (step.result as Array<Record<string, unknown>>)
        : [];

      if (threads.length === 0) {
        return "Your inbox has no messages right now.";
      }

      const lines = threads
        .slice(0, 5)
        .map(
          (t) =>
            `"${t.subject ?? "(no subject)"}" from ${
              t.from ?? "an unknown sender"
            }`
        );

      return `You have ${threads.length} recent thread${
        threads.length === 1 ? "" : "s"
      }: ${lines.join("; ")}.`;
    }

    case "email.readThread": {
      const messages = Array.isArray(
        (step.result as { messages?: unknown } | undefined)?.messages
      )
        ? ((step.result as { messages: Array<Record<string, unknown>> })
            .messages)
        : [];

      const last = messages[messages.length - 1];

      if (!last) {
        return "That thread doesn't have any messages.";
      }

      const body =
        typeof last.bodyText === "string"
          ? last.bodyText
          : "(no plain-text body available)";
      const trimmed =
        body.length > 500 ? `${body.slice(0, 500)}…` : body;

      return `From: ${last.from ?? "unknown"}\nSubject: ${
        last.subject ?? "(no subject)"
      }\n\n${trimmed}`;
    }

    case "email.draftReply":
    case "email.draftNew": {
      const draft = result as {
        to?: string;
        subject?: string;
        body?: string;
      };

      return (
        `Draft saved${draft.to ? ` to ${draft.to}` : ""} — ` +
        `Subject: "${draft.subject ?? ""}"\n\n${draft.body ?? ""}\n\n` +
        "Review and send it from the Inbox page when you're ready — " +
        "I can't send it for you."
      );
    }

    case "email.listDrafts": {
      const drafts = Array.isArray(step.result)
        ? (step.result as Array<Record<string, unknown>>)
        : [];

      if (drafts.length === 0) {
        return "You don't have any saved email drafts.";
      }

      const lines = drafts
        .slice(0, 5)
        .map(
          (d) =>
            `"${d.subject ?? "(no subject)"}" to ${d.to ?? "unknown"} (${
              d.status ?? "draft"
            })`
        );

      return `You have ${drafts.length} draft${
        drafts.length === 1 ? "" : "s"
      }: ${lines.join("; ")}.`;
    }

    case "email.updateDraft":
      return (
        "Updated that draft. Review and send it from the Inbox " +
        "page when you're ready."
      );

    case "email.deleteDraft":
      return "Deleted that draft.";

    default:
      return step.tool
        ? `Ran "${step.tool}" successfully.`
        : null;
  }
}
