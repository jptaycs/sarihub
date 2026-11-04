import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { productUnits, products } from "~/server/db/schema";
import { TEST_DATABASE_URL, integrationDb } from "~/test/integrationDb";

import { importCatalogCsv } from "./catalogImport";

describe.skipIf(!TEST_DATABASE_URL)("importCatalogCsv (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  const errors = getDictionary("tl").admin.catalog.csvImport.errors;
  const capturedBy = crypto.randomUUID();
  // A name no other test run has used, so "created" is deterministic.
  const newName = `Kamatis ${capturedBy.slice(0, 8)}`;
  const csv = `name,category,pack_price,individual_price\nSibuyas,gulay,120.00,8.50\n${newName},gulay,,15\nbad row,hindi-kategorya,1,1\n`;

  afterAll(close);

  it("creates missing products and units, updates existing ones, and reports skipped rows", async () => {
    const result = await importCatalogCsv(db, csv, capturedBy, errors);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    // Sibuyas: piraso + pakete; the new product: only individual (pack blank).
    expect(result.priceRowsInserted).toBe(3);
    expect(result.skipped).toEqual([{ row: 4, reason: expect.any(String) }]);

    const [created] = await db.select({ id: products.id }).from(products).where(eq(products.nameTl, newName));
    const units = await db
      .select({ labelTl: productUnits.labelTl, sortOrder: productUnits.sortOrder })
      .from(productUnits)
      .where(eq(productUnits.productId, created!.id));
    expect(units.map((u) => u.labelTl).sort()).toEqual(["pakete", "piraso"]);
    expect(new Set(units.map((u) => u.sortOrder)).size).toBe(2);
  });

  it("is idempotent on units: a second import updates, never duplicates", async () => {
    const result = await importCatalogCsv(db, csv, capturedBy, errors);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(2);

    const [row] = await db.execute<{ n: string }>(
      sql`SELECT count(*)::text AS n FROM product_units pu JOIN products p ON p.id = pu.product_id WHERE p.name_tl = ${newName}`,
    );
    expect(Number(row!.n)).toBe(2);
  });
});
