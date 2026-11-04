// src/server/services/catalogImport.ts
import "server-only";

import { addHours } from "date-fns";
import Papa from "papaparse";
import { inArray, sql } from "drizzle-orm";

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
  { labelTl: "piraso", labelEn: "per piece", priceField: "individualCentavos" as const },
  { labelTl: "pakete", labelEn: "pack", priceField: "packCentavos" as const },
];

/**
 * Import a distributor pricelist CSV: header row `name, category, pack_price,
 * individual_price` (any order, case-insensitive). Rows are validated first —
 * a bad row is skipped and reported, the rest of the upload still lands.
 *
 * The valid rows then go through one transaction in six set-based statements
 * (products lookup, insert, category update; units lookup, insert; prices
 * insert) regardless of row count, instead of ~8 statements per row. Every
 * row was validated up front, so a database error here is a real fault and
 * rolls the whole upload back rather than leaving half of it in.
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
  const skipped: Array<{ row: number; reason: string }> = [];

  if (parsed.data.length > MAX_ROWS) {
    skipped.push({
      row: 0,
      reason: interpolate(errors.rowsTruncated, { count: parsed.data.length - MAX_ROWS }),
    });
  }

  // Validate everything first. A later duplicate of the same name in one file
  // wins (last write), matching what two separate uploads would do.
  const byName = new Map<string, ValidatedRow>();
  for (const [index, raw] of rows.entries()) {
    const rowNum = index + 2; // +1 for 0-index, +1 for the header row
    const validation = validateRow(raw, errors);
    if (!validation.ok) {
      skipped.push({ row: rowNum, reason: validation.reason });
      continue;
    }
    byName.set(validation.row.name.toLowerCase(), validation.row);
  }
  const valid = [...byName.values()];
  if (valid.length === 0) return { created: 0, updated: 0, priceRowsInserted: 0, skipped };

  const { created, updated, priceRowsInserted } = await importRows(db, valid, capturedBy);
  return { created, updated, priceRowsInserted, skipped };
}

async function importRows(
  db: Db,
  rows: ValidatedRow[],
  capturedBy: string,
): Promise<{ created: number; updated: number; priceRowsInserted: number }> {
  return db.transaction(async (tx) => {
    const names = rows.map((r) => r.name.toLowerCase());

    // 1. Which names already exist (case-insensitive on the Tagalog name).
    const existing = await tx
      .select({ id: products.id, nameTl: products.nameTl })
      .from(products)
      .where(inArray(sql`lower(${products.nameTl})`, names));
    const idByName = new Map(existing.map((p) => [p.nameTl.toLowerCase(), p.id]));

    // 2. Create the missing products in one statement.
    const missing = rows.filter((r) => !idByName.has(r.name.toLowerCase()));
    if (missing.length > 0) {
      const inserted = await tx
        .insert(products)
        .values(
          missing.map((r) => ({
            nameTl: r.name,
            nameEn: r.name,
            category: r.category,
            isPerishable: true,
            source: "palengke" as const,
          })),
        )
        .returning({ id: products.id, nameTl: products.nameTl });
      for (const p of inserted) idByName.set(p.nameTl.toLowerCase(), p.id);
    }

    // 3. Re-file the existing ones under the category the sheet says.
    const toUpdate = rows.filter((r) => !missing.includes(r));
    if (toUpdate.length > 0) {
      const pairs = toUpdate.map(
        (r) => sql`(${idByName.get(r.name.toLowerCase())!}::uuid, ${r.category}::product_category)`,
      );
      await tx.execute(sql`
        UPDATE products AS p SET category = v.category
        FROM (VALUES ${sql.join(pairs, sql`, `)}) AS v(id, category)
        WHERE p.id = v.id AND p.category IS DISTINCT FROM v.category`);
    }

    // 4. Existing units for every product touched: ids for the price rows and
    //    the highest sort order, so new units file after a product's real ones
    //    (hardcoding "01"/"02" collides with seed labels like "1 kilo").
    const productIds = rows.map((r) => idByName.get(r.name.toLowerCase())!);
    const unitRows = await tx
      .select({
        id: productUnits.id,
        productId: productUnits.productId,
        labelTl: productUnits.labelTl,
        sortOrder: productUnits.sortOrder,
      })
      .from(productUnits)
      .where(inArray(productUnits.productId, productIds));
    const unitId = new Map(unitRows.map((u) => [`${u.productId}\0${u.labelTl}`, u.id]));
    const nextSortOrder = new Map<string, number>();
    for (const u of unitRows) {
      const n = Number.parseInt(u.sortOrder, 10) || 0;
      nextSortOrder.set(u.productId, Math.max(nextSortOrder.get(u.productId) ?? 0, n) + 1);
    }

    // 5. Create the missing units in one statement.
    const missingUnits: Array<{ productId: string; labelTl: string; labelEn: string; sortOrder: string }> = [];
    for (const productId of new Set(productIds)) {
      for (const spec of UNIT_SPECS) {
        if (unitId.has(`${productId}\0${spec.labelTl}`)) continue;
        const order = nextSortOrder.get(productId) ?? 1;
        nextSortOrder.set(productId, order + 1);
        missingUnits.push({
          productId,
          labelTl: spec.labelTl,
          labelEn: spec.labelEn,
          sortOrder: String(order).padStart(2, "0"),
        });
      }
    }
    if (missingUnits.length > 0) {
      const inserted = await tx
        .insert(productUnits)
        .values(missingUnits.map((u) => ({ ...u, weightGrams: null })))
        .returning({ id: productUnits.id, productId: productUnits.productId, labelTl: productUnits.labelTl });
      for (const u of inserted) unitId.set(`${u.productId}\0${u.labelTl}`, u.id);
    }

    // 6. Today's prices, one append-only insert.
    const at = now();
    const validUntil = addHours(at, PRICE_VALIDITY_HOURS);
    const priceValues = rows.flatMap((r) => {
      const productId = idByName.get(r.name.toLowerCase())!;
      return UNIT_SPECS.flatMap((spec) => {
        const centavos = r[spec.priceField];
        if (centavos === null) return [];
        return [
          {
            productUnitId: unitId.get(`${productId}\0${spec.labelTl}`)!,
            priceCentavos: BigInt(centavos),
            capturedAt: at,
            validUntil,
            capturedBy,
          },
        ];
      });
    });
    if (priceValues.length > 0) {
      await tx.insert(dailyPrices).values(priceValues).onConflictDoNothing();
    }

    return { created: missing.length, updated: toUpdate.length, priceRowsInserted: priceValues.length };
  });
}
