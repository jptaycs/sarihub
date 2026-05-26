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
});
