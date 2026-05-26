import { format, formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const MANILA_TZ = "Asia/Manila";

/**
 * Current instant. The single permitted "now()" in the app.
 * Anywhere else that calls `new Date()` is a bug.
 */
export function now(): Date {
  return new Date();
}

/** Convert a UTC Date to a Date that represents the same wall-clock in Manila. */
export function toManila(utc: Date): Date {
  return toZonedTime(utc, MANILA_TZ);
}

/** Convert a Manila wall-clock Date to its UTC instant. */
export function fromManila(manila: Date): Date {
  return fromZonedTime(manila, MANILA_TZ);
}

/** Format a UTC instant for display in Manila time. */
export function formatManila(utc: Date, pattern: string): string {
  return formatInTimeZone(utc, MANILA_TZ, pattern);
}

/** Short Manila date, e.g. "23 May 2026". */
export function formatManilaDate(utc: Date): string {
  return formatManila(utc, "d MMM yyyy");
}

/** Short Manila time, e.g. "5:30 AM". */
export function formatManilaTime(utc: Date): string {
  return formatManila(utc, "h:mm a");
}

/** Re-export for callers that genuinely need raw `format` on a zoned Date. */
export { format };
