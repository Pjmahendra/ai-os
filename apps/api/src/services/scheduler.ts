import { runScheduledAutomations } from "./automation.scheduler.js";

const INTERVAL_MS = 60 * 1000;

export function startScheduler() {
  console.log(
    "[Scheduler] Started"
  );

  setInterval(
    async () => {
      try {
        await runScheduledAutomations();
      } catch (error) {
        console.error(
          "[Scheduler] Error:",
          error
        );
      }
    },
    INTERVAL_MS
  );
}