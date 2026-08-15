import type { Tool, ToolContext } from "./types.js";

import {
  automationWorkflows,
  getAutomationDescriptions
} from "./workflows.js";
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

    const response = await fetch(
  automation.webhookUrl,
  {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `n8n request failed (${response.status}): ${body}`
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  }
}