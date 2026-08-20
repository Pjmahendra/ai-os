import { prisma } from "../database/prisma.js";
import { N8NExecuteTool } from "@ai-os/ai-tools";
import { createNotification } from "./notification.service.js";

const n8nTool = new N8NExecuteTool();

// Best-effort: a failure to write the alert itself should never mask
// the automation's actual result/error, so this only logs on failure
// rather than propagating.
async function notifySafely(
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: unknown
) {
  try {
    await createNotification(
      userId,
      type,
      title,
      body,
      data
    );
  } catch (error) {
    console.error(
      "Failed to create notification:",
      error
    );
  }
}

export async function executeStoredAutomation(
  userId: string,
  automationId: string,
  input: Record<string, unknown> = {}
) {
  const automation =
    await prisma.automation.findFirst({
      where: {
        id: automationId,
        userId
      }
    });

  if (!automation) {
    throw new Error("Automation not found");
  }

  if (!automation.enabled) {
    throw new Error("Automation is disabled");
  }

  const execution =
    await prisma.automationExecution.create({
      data: {
        automationId: automation.id,
        status: "running"
      }
    });

  try {
    const result =
      await n8nTool.execute(
        {
          workflow: automation.workflow,
          ...(automation.config as Record<string, unknown>),
          ...input
        },
        {
          userId
        }
      );

    await prisma.automationExecution.update({
      where: {
        id: execution.id
      },
      data: {
        status: "success",
        result: result as object,
        completedAt: new Date()
      }
    });

    await notifySafely(
      userId,
      "automation.success",
      `"${automation.name}" ran successfully`,
      undefined,
      { automationId: automation.id, executionId: execution.id }
    );

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Automation execution failed";

    await prisma.automationExecution.update({
      where: {
        id: execution.id
      },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date()
      }
    });

    await notifySafely(
      userId,
      "automation.failure",
      `"${automation.name}" failed`,
      message,
      { automationId: automation.id, executionId: execution.id }
    );

    throw error;
  }
}

export async function runAutomationByName(
  userId: string,
  name: string,
  input: Record<string, unknown> = {}
) {
  const automation =
    await prisma.automation.findFirst({
      where: {
        userId,
        name
      }
    });

  if (!automation) {
    throw new Error(
      `Automation "${name}" was not found`
    );
  }

  return executeStoredAutomation(
    userId,
    automation.id,
    input
  );
}