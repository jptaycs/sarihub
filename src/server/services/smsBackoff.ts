// Deliberately no "import server-only" here — pure, DB-free, network-free
// retry-schedule math kept directly unit-testable. See the plan's Global
// Constraints note on why "server-only" can't resolve under Vitest.

const BACKOFF_MINUTES = [2, 4, 8, 16];

/**
 * `attemptNumber` is 1-indexed: the attempt that just failed. Returns
 * minutes until the next retry, or null once retries are exhausted — five
 * total attempts (the original send plus four retries) before a queued
 * notification is permanently failed.
 */
export function backoffMinutes(attemptNumber: number): number | null {
  return BACKOFF_MINUTES[attemptNumber - 1] ?? null;
}
