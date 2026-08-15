import { Client } from "pg";
import { env } from "@ai-os/config";

/**
 * Arbitrary fixed key identifying "the automation scheduler" for
 * Postgres advisory locks. Any 64-bit-safe integer works as long as
 * it's stable and not reused by anything else in this database.
 */
const SCHEDULER_LOCK_KEY = 72_75_01;

/**
 * Runs `fn` only if this process can acquire an exclusive,
 * cluster-wide advisory lock — i.e. only one API instance (and only
 * one concurrent tick within that instance) ever runs the scheduler
 * body at a time, even when multiple API instances share one database.
 *
 * pg_advisory_lock/unlock are session-scoped: the lock is only truly
 * released by unlocking on the exact same backend connection that
 * acquired it. Prisma's pooled client can hand different queries to
 * different pooled connections, which would silently strand the lock
 * held forever. To avoid that, this opens one dedicated `pg.Client`
 * connection for the lifetime of the call and always closes it
 * (which also releases any session-level advisory lock it holds if
 * the process crashes mid-run, since Postgres releases a session's
 * advisory locks when its connection closes).
 */
export async function withSchedulerLock(
  fn: () => Promise<void>
): Promise<void> {
  const client = new Client({
    connectionString: env.DATABASE_URL
  });

  await client.connect();

  try {
    const result = await client.query<{
      locked: boolean;
    }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [SCHEDULER_LOCK_KEY]
    );

    const locked = result.rows[0]?.locked === true;

    if (!locked) {
      console.log(
        "[Scheduler] Another instance holds the scheduler lock. Skipping."
      );

      return;
    }

    try {
      await fn();
    } finally {
      await client.query(
        "SELECT pg_advisory_unlock($1)",
        [SCHEDULER_LOCK_KEY]
      );
    }
  } finally {
    await client.end();
  }
}
