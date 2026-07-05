import { describe, expect, it } from "vitest";

import { formatManila } from "./datetime";
import { nextDeliveryDate } from "./deliverySchedule";

const EVERY_DAY = 127;
const WEEKDAYS_ONLY = 2 + 4 + 8 + 16 + 32; // Mon–Fri

/** Manila wall-clock → UTC instant. Manila is UTC+8, no DST. */
function manila(iso: string): Date {
  return new Date(`${iso}+08:00`);
}

function deliveredOn(date: Date): string {
  return formatManila(date, "yyyy-MM-dd");
}

describe("nextDeliveryDate", () => {
  it("evening order lands on tomorrow's truck", () => {
    const at = manila("2026-07-06T21:00:00"); // Mon 9 PM
    const out = nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: EVERY_DAY }, at);
    expect(deliveredOn(out)).toBe("2026-07-07");
  });

  it("order before the cutoff rides today's truck", () => {
    const at = manila("2026-07-06T04:00:00"); // Mon 4 AM, cutoff 4:30
    const out = nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: EVERY_DAY }, at);
    expect(deliveredOn(out)).toBe("2026-07-06");
  });

  it("order exactly at the cutoff waits for tomorrow", () => {
    const at = manila("2026-07-06T04:30:00");
    const out = nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: EVERY_DAY }, at);
    expect(deliveredOn(out)).toBe("2026-07-07");
  });

  it("skips inactive weekdays", () => {
    const at = manila("2026-07-10T21:00:00"); // Fri 9 PM → Sat/Sun off → Mon
    const out = nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: WEEKDAYS_ONLY }, at);
    expect(deliveredOn(out)).toBe("2026-07-13");
  });

  it("returns Manila midnight as the day boundary", () => {
    const at = manila("2026-07-06T21:00:00");
    const out = nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: EVERY_DAY }, at);
    expect(formatManila(out, "HH:mm")).toBe("00:00");
  });

  it("throws when a route has no active weekdays", () => {
    const at = manila("2026-07-06T21:00:00");
    expect(() => nextDeliveryDate({ cutoffLocal: "04:30:00", activeWeekdays: 0 }, at)).toThrow();
  });
});
