import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

const DAYS_WIDE = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const DAYS_ABBREVIATED = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
const MONTHS_WIDE = [
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
];
const MONTHS_ABBREVIATED = [
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
];

/**
 * Filipino/Tagalog date-fns Locale. Only day and month names are translated
 * (cardinal, in place — "23 Hun 2026", not "ika-23 ng Hunyo"; AM/PM is left
 * as-is). Nothing in this app uses ordinal, formatLong (P/PP/PPP), or
 * formatDistance/formatRelative tokens, so those fall through to enUS
 * unchanged rather than shipping unverified translations with zero callers.
 */
export const fil: Locale = {
  ...enUS,
  code: "fil",
  localize: {
    ...enUS.localize,
    day: (value, options) => {
      const width = options?.width;
      if (width !== "abbreviated" && width !== "wide" && width !== undefined) {
        return enUS.localize.day(value, options);
      }
      return (width === "abbreviated" ? DAYS_ABBREVIATED : DAYS_WIDE)[value]!;
    },
    month: (value, options) => {
      const width = options?.width;
      if (width !== "abbreviated" && width !== "wide" && width !== undefined) {
        return enUS.localize.month(value, options);
      }
      return (width === "abbreviated" ? MONTHS_ABBREVIATED : MONTHS_WIDE)[value]!;
    },
  },
};
