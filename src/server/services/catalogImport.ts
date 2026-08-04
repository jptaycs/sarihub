// src/server/services/catalogImport.ts
import "server-only";

import { addHours } from "date-fns";
import Papa from "papaparse";
import { and, eq, sql } from "drizzle-orm";

import { now } from "~/lib/datetime";
import { interpolate } from "~/lib/i18n/interpolate";
import { db as defaultDb } from "~/server/db";
import { dailyPrices, productUnits, products } from "~/server/db/schema";

import { validateRow, type CsvImportErrorDict, type ValidatedRow } from "./catalogImportValidation";

type Db = typeof defaultDb;

/** New price rows are good for 24 hours, same convention as buyer.setPrice. */
const PRICE_VALIDITY_HOURS = 24;
/** Rows beyond this are dropped, but reported as a single entry in `skipped` — not silently. */
const MAX_ROWS = 1000;

export type ImportCsvResult = {
  created: number;
  updated: number;
  priceRowsInserted: number;
  skipped: Array<{ row: number; reason: string }>;
};

const UNIT_SPECS = [
  { labelTl: "piraso", labelEn: "per piece", sortOrder: "01", priceField: "individualCentavos" as const },
  { labelTl: "pakete", labelEn: "pack", sortOrder: "02", priceField: "packCentavos" as const },
];

/**
 * Import a distributor pricelist CSV: header row `name, category, pack_price,
 * individual_price` (any order, case-insensitive). Best-effort per row — one
 * bad row is skipped and reported, the rest of the upload still lands, each
 * row in its own transaction so one failure can't roll back another row's
 * success.
 */
export async function importCatalogCsv(
  db: Db,
  csvText: string,
  capturedBy: string,
  errors: CsvImportErrorDict,
): Promise<ImportCsvResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.data.length === 0) {
    return { created: 0, updated: 0, priceRowsInserted: 0, skipped: [{ row: 0, reason: errors.emptyFile }] };
  }

  const rows = parsed.data.slice(0, MAX_ROWS);
  let created = 0;
  let updated = 0;
  let priceRowsInserted = 0;
  const skipped: Array<{ row: number; reason: string }> = [];

  if (parsed.data.length > MAX_ROWS) {
    skipped.push({
      row: 0,
      reason: interpolate(errors.rowsTruncated, { count: parsed.data.length - MAX_ROWS }),
    });
  }

  for (const [index, raw] of rows.entries()) {
    const rowNum = index + 2; // +1 for 0-index, +1 for the header row
    const validation = validateRow(raw, errors);
    if (!validation.ok) {
      skipped.push({ row: rowNum, reason: validation.reason });
      continue;
    }
    try {
      const result = await importOneRow(db, validation.row, capturedBy);
      if (result.createdProduct) created++;
      else updated++;
      priceRowsInserted += result.priceRowsInserted;
    } catch (error) {
      skipped.push({ row: rowNum, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return { created, updated, priceRowsInserted, skipped };
}

async function importOneRow(
  db: Db,
  row: ValidatedRow,
  capturedBy: string,
): Promise<{ createdProduct: boolean; priceRowsInserted: number }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(sql`lower(${products.nameTl}) = lower(${row.name})`)
      .limit(1);

    let productId: string;
    let createdProduct = false;
    if (existing) {
      productId = existing.id;
      await tx.update(products).set({ category: row.category }).where(eq(products.id, productId));
    } else {
      const [inserted] = await tx
        .insert(products)
        .values({
          nameTl: row.name,
          nameEn: row.name,
          category: row.category,
          isPerishable: true,
          source: "palengke",
        })
        .returning({ id: products.id });
      productId = inserted!.id;
      createdProduct = true;
    }

    const at = now();
    const validUntil = addHours(at, PRICE_VALIDITY_HOURS);
    let priceRowsInserted = 0;

    for (const spec of UNIT_SPECS) {
      const [existingUnit] = await tx
        .select({ id: productUnits.id })
        .from(productUnits)
        .where(and(eq(productUnits.productId, productId), eq(productUnits.labelTl, spec.labelTl)))
        .limit(1);

      let unitId: string;
      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        const [insertedUnit] = await tx
          .insert(productUnits)
          .values({
            productId,
            labelTl: spec.labelTl,
            labelEn: spec.labelEn,
            sortOrder: spec.sortOrder,
            weightGrams: null,
          })
          .returning({ id: productUnits.id });
        unitId = insertedUnit!.id;
      }

      const centavos = row[spec.priceField];
      if (centavos !== null) {
        await tx
          .insert(dailyPrices)
          .values({
            productUnitId: unitId,
            priceCentavos: BigInt(centavos),
            capturedAt: at,
            validUntil,
            capturedBy,
          })
          .onConflictDoNothing();
        priceRowsInserted++;
      }
    }

    return { createdProduct, priceRowsInserted };
  });
}
