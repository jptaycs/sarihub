// Deliberately no "import server-only" here — pure, DB-free row validation
// kept directly unit-testable. See the plan's Global Constraints note.

import { interpolate } from "~/lib/i18n/interpolate";
import { pesosToCentavos } from "~/lib/format";
import type { ProductCategory } from "~/server/db/schema";

const VALID_CATEGORIES: readonly ProductCategory[] = ["gulay", "itlog", "isda", "kusina"];

export type CsvImportErrorDict = {
  emptyFile: string;
  blankName: string;
  unknownCategory: string;
  malformedPrice: string;
  priceOutOfRange: string;
};

/** Same bounds as `setPriceInput` in `~/lib/schemas/price.ts` — one centavo up to ₱100,000. */
const MIN_PRICE_CENTAVOS = 1;
const MAX_PRICE_CENTAVOS = 10_000_000;

export type ValidatedRow = {
  name: string;
  category: ProductCategory;
  /** null = "don't set a price for that unit this round", not an error. */
  packCentavos: number | null;
  individualCentavos: number | null;
};

export type RowValidationResult = { ok: true; row: ValidatedRow } | { ok: false; reason: string };

/** Validates and normalizes one parsed CSV row. Pure — no DB, unit-tested directly. */
export function validateRow(
  raw: Record<string, string | undefined>,
  errors: CsvImportErrorDict,
): RowValidationResult {
  const name = (raw.name ?? "").trim();
  if (!name) return { ok: false, reason: errors.blankName };

  const categoryRaw = (raw.category ?? "").trim().toLowerCase();
  const category = VALID_CATEGORIES.find((c) => c === categoryRaw);
  if (!category) {
    return { ok: false, reason: interpolate(errors.unknownCategory, { value: raw.category ?? "" }) };
  }

  const packRaw = (raw.pack_price ?? "").trim();
  const packCentavos = packRaw ? pesosToCentavos(packRaw) : null;
  if (packRaw && packCentavos === null) {
    return {
      ok: false,
      reason: interpolate(errors.malformedPrice, { field: "pack_price", value: packRaw }),
    };
  }
  if (
    packCentavos !== null &&
    (packCentavos < MIN_PRICE_CENTAVOS || packCentavos > MAX_PRICE_CENTAVOS)
  ) {
    return {
      ok: false,
      reason: interpolate(errors.priceOutOfRange, { field: "pack_price", value: packRaw }),
    };
  }

  const individualRaw = (raw.individual_price ?? "").trim();
  const individualCentavos = individualRaw ? pesosToCentavos(individualRaw) : null;
  if (individualRaw && individualCentavos === null) {
    return {
      ok: false,
      reason: interpolate(errors.malformedPrice, { field: "individual_price", value: individualRaw }),
    };
  }
  if (
    individualCentavos !== null &&
    (individualCentavos < MIN_PRICE_CENTAVOS || individualCentavos > MAX_PRICE_CENTAVOS)
  ) {
    return {
      ok: false,
      reason: interpolate(errors.priceOutOfRange, { field: "individual_price", value: individualRaw }),
    };
  }

  return { ok: true, row: { name, category, packCentavos, individualCentavos } };
}
