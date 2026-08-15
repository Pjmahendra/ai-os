import { prisma } from "../database/prisma.js";

export async function createAutomation(
  userId: string,
  name: string,
  workflow: string,
  config: unknown,
  scheduleType?: string,
  schedule?: string
) {
  const existing = await prisma.automation.findFirst({
    where: {
      userId,
      name
    }
  });

  if (existing) {
    throw new Error(
      `Automation "${name}" already exists for this user`
    );
  }

  return prisma.automation.create({
    data: {
      userId,
      name,
      workflow,
      config: config as object,
      scheduleType,
      schedule
    }
  });
}

export async function getUserAutomations(
  userId: string
) {
  return prisma.automation.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getAutomation(
  userId: string,
  automationId: string
) {
  return prisma.automation.findFirst({
    where: {
      id: automationId,
      userId
    }
  });
}

export async function setAutomationEnabled(
  userId: string,
  automationId: string,
  enabled: boolean
) {
  return prisma.automation.updateMany({
    where: {
      id: automationId,
      userId
    },
    data: {
      enabled
    }
  });
}

export async function deleteAutomation(
  userId: string,
  automationId: string
) {
  return prisma.automation.deleteMany({
    where: {
      id: automationId,
      userId
    }
  });
}
export async function getAutomationExecutions(
  userId: string,
  automationId: string
) {
  const automation =
    await prisma.automation.findFirst({
      where: {
        id: automationId,
        userId
      }
    });

  if (!automation) {
    return null;
  }

  return prisma.automationExecution.findMany({
    where: {
      automationId
    },
    orderBy: {
      startedAt: "desc"
    }
  });
}
export async function updateAutomation(
  userId: string,
  automationId: string | undefined,
  data: {
    name?: string;
    newName?: string;
    workflow?: string;
    config?: unknown;
    scheduleType?: string | null;
    schedule?: string | null;
    enabled?: boolean;
  }
) {
  let existing;

  if (automationId) {
    existing = await prisma.automation.findFirst({
      where: {
        id: automationId,
        userId
      }
    });
  } else if (data.name) {
    existing = await prisma.automation.findFirst({
      where: {
        userId,
        name: data.name
      }
    });
  }

  if (!existing) {
    throw new Error("Automation not found");
  }

  /*
   * Prevent renaming this automation to the name
   * of another automation belonging to the same user.
   */
  if (data.newName !== undefined) {
    const duplicate = await prisma.automation.findFirst({
      where: {
        userId,
        name: data.newName,
        id: {
          not: existing.id
        }
      }
    });

    if (duplicate) {
      throw new Error(
        `Automation "${data.newName}" already exists for this user`
      );
    }
  }

  return prisma.automation.update({
    where: {
      id: existing.id
    },
    data: {
      ...(data.newName !== undefined
        ? { name: data.newName }
        : {}),

      ...(data.workflow !== undefined
        ? { workflow: data.workflow }
        : {}),

      ...(data.config !== undefined
        ? { config: data.config as object }
        : {}),

      ...(data.scheduleType !== undefined
        ? { scheduleType: data.scheduleType }
        : {}),

      ...(data.schedule !== undefined
        ? { schedule: data.schedule }
        : {}),

      ...(data.enabled !== undefined
        ? { enabled: data.enabled }
        : {})
    }
  });
}