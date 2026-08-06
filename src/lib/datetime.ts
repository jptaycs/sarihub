import { format, formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { fil } from "~/lib/i18n/tagalogDateLocale";
import type { Locale } from "~/lib/i18n/locale";

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

/**
 * Format a UTC instant for display in Manila time. `locale` selects Tagalog
 * day/month names ("tl") or the existing English default (omitted or "en") —
 * day-key patterns like "yyyy-MM-dd" are numeric-only and unaffected either way.
 */
export function formatManila(utc: Date, pattern: string, locale?: Locale): string {
  return formatInTimeZone(utc, MANILA_TZ, pattern, locale === "tl" ? { locale: fil } : undefined);
}

/** Short Manila date, e.g. "23 May 2026" (both locales — "May" is Tagalog's abbreviated form too; full "Mayo" needs "MMMM"). */
export function formatManilaDate(utc: Date, locale?: Locale): string {
  return formatManila(utc, "d MMM yyyy", locale);
}

/** Short Manila time, e.g. "5:30 AM" — AM/PM is not translated, same in both locales. */
export function formatManilaTime(utc: Date, locale?: Locale): string {
  return formatManila(utc, "h:mm a", locale);
}

/** Re-export for callers that genuinely need raw `format` on a zoned Date. */
export { format };
