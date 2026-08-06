import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import { fil } from "./tagalogDateLocale";

describe("fil (Tagalog date-fns Locale)", () => {
  // 2026-05-25 is a Monday.
  const date = new Date(2026, 4, 25);

  it("renders full day and month names", () => {
    expect(format(date, "EEEE, d MMMM yyyy", { locale: fil })).toBe("Lunes, 25 Mayo 2026");
  });

  it("renders abbreviated day and month names", () => {
    expect(format(date, "EEE, d MMM", { locale: fil })).toBe("Lun, 25 May");
  });

  it("renders every month name correctly", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2026, i, 1), "MMMM", { locale: fil }),
    );
    expect(months).toEqual([
      "Enero",
      "Pebrero",
      "Marso",
      "Abril",
      "Mayo",
      "Hunyo",
      "Hulyo",
      "Agosto",
      "Setyembre",
      "Oktubre",
      "Nobyembre",
      "Disyembre",
    ]);
  });

  it("renders every abbreviated month name correctly", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2026, i, 1), "MMM", { locale: fil }),
    );
    expect(months).toEqual([
      "Ene",
      "Peb",
      "Mar",
      "Abr",
      "May",
      "Hun",
      "Hul",
      "Ago",
      "Set",
      "Okt",
      "Nob",
      "Dis",
    ]);
  });

  it("renders every day name correctly", () => {
    // 2026-05-24 is a Sunday (Linggo); walk a full week from there.
    const days = Array.from({ length: 7 }, (_, i) =>
      format(new Date(2026, 4, 24 + i), "EEEE", { locale: fil }),
    );
    expect(days).toEqual([
      "Linggo",
      "Lunes",
      "Martes",
      "Miyerkules",
      "Huwebes",
      "Biyernes",
      "Sabado",
    ]);
  });

  it("renders every abbreviated day name correctly", () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(new Date(2026, 4, 24 + i), "EEE", { locale: fil }),
    );
    expect(days).toEqual(["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"]);
  });

  it("falls through to enUS for tokens this app never uses (AM/PM dayPeriod)", () => {
    const morning = new Date(2026, 4, 25, 8, 0);
    expect(format(morning, "h:mm a", { locale: fil })).toBe("8:00 AM");
  });
});
