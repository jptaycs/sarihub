import { describe, expect, it } from "vitest";

import { formatManila, formatManilaDate, formatManilaTime } from "./datetime";

describe("Manila formatters", () => {
  // 2026-05-25T00:00:00Z is 2026-05-25 08:00 in Manila (UTC+8).
  const utc = new Date("2026-05-25T00:00:00Z");

  it("formatManilaDate renders d MMM yyyy in Manila", () => {
    expect(formatManilaDate(utc)).toBe("25 May 2026");
  });

  it("formatManilaTime renders h:mm a in Manila", () => {
    expect(formatManilaTime(utc)).toBe("8:00 AM");
  });

  it("handles UTC instants near the Manila day boundary", () => {
    // 2026-05-25T15:30:00Z = 2026-05-25 23:30 Manila — still the same Manila day.
    const lateUtc = new Date("2026-05-25T15:30:00Z");
    expect(formatManila(lateUtc, "yyyy-MM-dd HH:mm")).toBe("2026-05-25 23:30");

    // 2026-05-25T16:30:00Z = 2026-05-26 00:30 Manila — next Manila day.
    const nextDayUtc = new Date("2026-05-25T16:30:00Z");
    expect(formatManila(nextDayUtc, "yyyy-MM-dd HH:mm")).toBe("2026-05-26 00:30");
  });

  // NOTE: "MMM" is the abbreviated-month token; per the fil locale (Task 1,
  // src/lib/i18n/tagalogDateLocale.ts, MONTHS_ABBREVIATED), May's abbreviated
  // form is "May" (same 3-letter form as English), not "Mayo" — "Mayo" is
  // only produced by the wide "MMMM" token. The task-2 brief's expected value
  // of "25 Mayo 2026" here contradicts Task 1's own already-passing tests
  // (tagalogDateLocale.test.ts: `format(date, "EEE, d MMM", { locale: fil })`
  // => "Lun, 25 May"). Corrected to "May" to match verified behavior; see
  // task-2-report.md for details.
  it("formatManilaDate renders Tagalog month name when locale is 'tl'", () => {
    expect(formatManilaDate(utc, "tl")).toBe("25 May 2026");
  });

  it("formatManila renders Tagalog weekday and month names when locale is 'tl'", () => {
    expect(formatManila(utc, "EEEE, d MMM yyyy", "tl")).toBe("Lunes, 25 May 2026");
  });

  it("formatManilaTime keeps AM/PM as-is regardless of locale", () => {
    expect(formatManilaTime(utc, "tl")).toBe("8:00 AM");
  });

  it("defaults to English when locale is omitted or 'en'", () => {
    expect(formatManilaDate(utc)).toBe("25 May 2026");
    expect(formatManilaDate(utc, "en")).toBe("25 May 2026");
    expect(formatManila(utc, "EEEE, d MMM yyyy", "en")).toBe("Monday, 25 May 2026");
  });

  it("day-key patterns are unaffected by locale", () => {
    expect(formatManila(utc, "yyyy-MM-dd", "tl")).toBe("2026-05-25");
  });
});
