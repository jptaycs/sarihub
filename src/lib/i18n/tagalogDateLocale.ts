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

type Width = NonNullable<Parameters<typeof enUS.localize.day>[1]>["width"];

/**
 * Builds a `localize.day`/`localize.month` replacement: only "abbreviated"
 * and "wide" (the app's only two used widths) resolve from `wide`/
 * `abbreviated`; every other width (e.g. "narrow") forwards to `fallback`
 * unchanged, matching this file's fall-through contract.
 */
function namedLocalize<V extends number>(
  wide: readonly string[],
  abbreviated: readonly string[],
  fallback: (value: V, options?: { width?: Width }) => string,
): (value: V, options?: { width?: Width }) => string {
  return (value, options) => {
    const width = options?.width;
    if (width !== "abbreviated" && width !== "wide" && width !== undefined) {
      return fallback(value, options);
    }
    return (width === "abbreviated" ? abbreviated : wide)[value]!;
  };
}

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
    day: namedLocalize(DAYS_WIDE, DAYS_ABBREVIATED, enUS.localize.day),
    month: namedLocalize(MONTHS_WIDE, MONTHS_ABBREVIATED, enUS.localize.month),
  },
};
