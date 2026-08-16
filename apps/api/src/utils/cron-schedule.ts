/**
 * Normalizes planner/API input for an automation's schedule into the
 * canonical { scheduleType: "cron", schedule: "<5-field expression>" }
 * shape stored on the Automation model.
 *
 * Shared by automation.create and automation.update so both enforce
 * the same validation — a caller-supplied "cron" schedule that isn't
 * actually 5 fields is rejected up front, rather than being written to
 * the database and only failing (silently, once a minute, forever)
 * when the scheduler tries to parse it later.
 */
export function normalizeCronSchedule(
  scheduleType: unknown,
  schedule: unknown
): {
  scheduleType?: string;
  schedule?: string;
} {
  // Nothing related to schedule is being set/changed.
  if (
    scheduleType === undefined &&
    schedule === undefined
  ) {
    return {};
  }

  // A schedule was supplied without an explicit type. If it is
  // already a valid 5-field cron expression, safely assume cron
  // rather than silently dropping it.
  if (
    scheduleType === undefined &&
    typeof schedule === "string"
  ) {
    const cronParts = schedule.trim().split(/\s+/);

    if (cronParts.length === 5) {
      return {
        scheduleType: "cron",
        schedule: schedule.trim()
      };
    }

    throw new Error(
      "A schedule without scheduleType must be a valid 5-field cron expression"
    );
  }

  if (typeof scheduleType !== "string") {
    throw new Error(
      "scheduleType must be a string"
    );
  }

  if (typeof schedule !== "string") {
    throw new Error(
      "schedule must be a string"
    );
  }

  if (scheduleType === "cron") {
    const cronParts = schedule.trim().split(/\s+/);

    if (cronParts.length !== 5) {
      throw new Error(
        `Invalid cron schedule "${schedule}". Expected 5 fields.`
      );
    }

    return {
      scheduleType: "cron",
      schedule: schedule.trim()
    };
  }

  // Convert daily "HH:MM" into a 5-field cron expression.
  if (scheduleType === "daily") {
    const match = schedule.match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

    if (!match) {
      throw new Error(
        `Invalid daily schedule "${schedule}". Expected HH:MM.`
      );
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    return {
      scheduleType: "cron",
      schedule: `${minute} ${hour} * * *`
    };
  }

  throw new Error(
    `Unsupported scheduleType "${scheduleType}". Use cron.`
  );
}
