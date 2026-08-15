import type { Tool, ToolContext } from "./types.js";

import {
  automationWorkflows,
  getAutomationDescriptions
} from "./workflows.js";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A response status worth retrying — transient/server-side failures,
 * not something a retry can't fix (bad request, unknown workflow,
 * auth failure, etc).
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class N8NExecuteTool implements Tool {
  readonly name = "n8n.execute";

  readonly description =
  "Executes a registered AI-OS automation workflow through n8n.\n" +
  "The input must contain a workflow key and the data for that workflow.\n" +
  "Available workflows:\n" +
  getAutomationDescriptions();


  async execute(
    input: unknown,
    _context: ToolContext
  ): Promise<unknown> {
    if (
      typeof input !== "object" ||
      input === null
    ) {
      throw new Error(
        "n8n.execute requires an input object"
      );
    }

    const data = input as Record<string, unknown>;

    const workflow =
      typeof data.workflow === "string"
        ? data.workflow
        : "ai-os-test";

    const automation =
  automationWorkflows.find(
    (item) => item.key === workflow
  );

if (!automation) {
  throw new Error(
    `Unknown n8n workflow: ${workflow}`
  );
}

if (!automation.webhookUrl) {
  throw new Error(
    `Webhook URL is not configured for workflow: ${workflow}`
  );
}

    const payload = {
      ...data
    };

    delete payload.workflow;

    return this.postWithRetry(
      automation.webhookUrl,
      payload,
      workflow
    );
  }

  private async postWithRetry(
    webhookUrl: string,
    payload: unknown,
    workflow: string
  ): Promise<unknown> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.post(webhookUrl, payload);
      } catch (error) {
        lastError = error;

        const retryable =
          error instanceof RetryableN8NError;

        if (
          !retryable ||
          attempt === MAX_ATTEMPTS
        ) {
          throw error instanceof RetryableN8NError
            ? error.originalError
            : error;
        }

        const cause =
          error instanceof RetryableN8NError
            ? error.originalError
            : error;

        console.warn(
          `[n8n.execute] "${workflow}" attempt ${attempt} failed, retrying:`,
          cause instanceof Error ? cause.message : cause
        );

        await delay(RETRY_BASE_DELAY_MS * attempt);
      }
    }

    // Unreachable — the loop always returns or throws — but keeps
    // TypeScript happy about the function's return type.
    throw lastError;
  }

  private async post(
    webhookUrl: string,
    payload: unknown
  ): Promise<unknown> {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (error) {
      // Network failure or our own timeout abort — both worth
      // retrying, since they're transient rather than a bad request.
      const isTimeout =
        error instanceof Error && error.name === "AbortError";

      throw new RetryableN8NError(
        isTimeout
          ? new Error(
              `n8n request timed out after ${REQUEST_TIMEOUT_MS}ms`
            )
          : error
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(
        `n8n request failed (${response.status}): ${body}`
      );

      if (isRetryableStatus(response.status)) {
        throw new RetryableN8NError(error);
      }

      throw error;
    }

    const contentType =
      response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  }
}

/**
 * Wraps an error to mark it as worth retrying, without changing what
 * ultimately gets thrown to the caller (postWithRetry unwraps this
 * back to `.originalError` once retries are exhausted).
 */
class RetryableN8NError extends Error {
  constructor(readonly originalError: unknown) {
    super("Retryable n8n error");
  }
}
