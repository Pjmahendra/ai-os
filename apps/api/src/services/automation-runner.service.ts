import { prisma } from "../database/prisma.js";
import { N8NExecuteTool } from "@ai-os/ai-tools";

const n8nTool = new N8NExecuteTool();

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