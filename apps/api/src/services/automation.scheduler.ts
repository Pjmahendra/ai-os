import { prisma } from "../database/prisma.js";
import { executeStoredAutomation } from "./automation-runner.service.js";
import { CronExpressionParser } from "cron-parser";

let schedulerRunning = false;

export async function runScheduledAutomations() {
  if (schedulerRunning) {
    console.log(
      "[Scheduler] Previous scheduler run is still active. Skipping."
    );
    return;
  }

  schedulerRunning = true;

  try {
    const automations = await prisma.automation.findMany({
      where: {
        enabled: true,
        scheduleType: "cron",
        schedule: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            timezone: true
          }
        }
      }
    });

    const now = new Date();

    for (const automation of automations) {
      try {
        if (!automation.schedule) {
          continue;
        }

        // Interpret the cron expression in the owning user's local
        // time, not the server's — "every day at 9am" should mean
        // 9am for them, wherever the API happens to be deployed.
        const expression = CronExpressionParser.parse(
          automation.schedule,
          {
            currentDate: now,
            tz: automation.user.timezone
          }
        );

        const previousRun =
          expression.prev().toDate();

        const previousRunTime =
          previousRun.getTime();

        const lastRunTime =
  automation.lastRunAt?.getTime() ?? 0;

/*
 * The scheduled occurrence has already
 * been successfully processed.
 */
if (previousRunTime <= lastRunTime) {
  continue;
}

/*
 * Do not execute a future cron occurrence.
 */
if (previousRunTime > now.getTime()) {
  continue;
}

/*
 * Check whether this exact cron occurrence
 * has already been attempted.
 *
 * This prevents a failed automation from
 * being retried every scheduler tick.
 */
  const existingExecution =
    await prisma.automationExecution.findFirst({
      where: {
        automationId: automation.id,
        startedAt: {
          gte: previousRun,
          lt: new Date(previousRunTime + 60_000)
        }
      },
      orderBy: {
        startedAt: "desc"
      }
    });

  if (existingExecution) {
    console.log(
      `[Scheduler] Occurrence already attempted for ${automation.name}. Skipping.`
    );

    continue;
  }

        console.log(
          `[Scheduler] Executing: ${automation.name}`
        );

        /*
         * executeStoredAutomation creates and manages
         * the AutomationExecution record.
         */
        await executeStoredAutomation(
          automation.userId,
          automation.id
        );

        /*
         * Only mark the scheduled occurrence as processed
         * after successful execution.
         */
        await prisma.automation.update({
          where: {
            id: automation.id
          },
          data: {
            lastRunAt: previousRun
          }
        });

        console.log(
          `[Scheduler] Completed: ${automation.name}`
        );
      } catch (error) {
        console.error(
          `[Scheduler] Failed for ${automation.name}:`,
          error
        );
      }
    }
  } finally {
    schedulerRunning = false;
  }
}