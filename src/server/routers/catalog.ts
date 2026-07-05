import "server-only";

import { and, asc, desc, eq, gt, inArray, lte } from "drizzle-orm";

import { now } from "~/lib/datetime";
import { dailyPrices, productUnits, products } from "~/server/db/schema";
import { protectedProcedure, router } from "~/server/trpc/init";

export const catalogRouter = router({
  /**
   * Everything orderable right now: active products, their units, and the
   * live price per unit. Units with no valid price today come back with
   * `priceCentavos: null` — shown but not orderable.
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    const at = now();

    const rows = await ctx.db
      .select({
        productId: products.id,
        nameTl: products.nameTl,
        nameEn: products.nameEn,
        category: products.category,
        isPerishable: products.isPerishable,
        unitId: productUnits.id,
        unitLabelTl: productUnits.labelTl,
        unitLabelEn: productUnits.labelEn,
        unitSortOrder: productUnits.sortOrder,
      })
      .from(products)
      .innerJoin(productUnits, eq(productUnits.productId, products.id))
      .where(and(eq(products.isActive, true), eq(productUnits.isActive, true)))
      .orderBy(asc(products.category), asc(products.nameTl), asc(productUnits.sortOrder));

    const unitIds = rows.map((r) => r.unitId);
    const priceRows = unitIds.length
      ? await ctx.db
          .selectDistinctOn([dailyPrices.productUnitId], {
            productUnitId: dailyPrices.productUnitId,
            priceCentavos: dailyPrices.priceCentavos,
          })
          .from(dailyPrices)
          .where(
            and(
              inArray(dailyPrices.productUnitId, unitIds),
              lte(dailyPrices.capturedAt, at),
              gt(dailyPrices.validUntil, at),
            ),
          )
          .orderBy(dailyPrices.productUnitId, desc(dailyPrices.capturedAt))
      : [];
    const priceByUnit = new Map(priceRows.map((r) => [r.productUnitId, r.priceCentavos]));

    type UnitOut = {
      id: string;
      labelTl: string;
      labelEn: string;
      priceCentavos: bigint | null;
    };
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: string;
      isPerishable: boolean;
      units: UnitOut[];
    };

    const productsOut: ProductOut[] = [];
    const byProduct = new Map<string, ProductOut>();
    for (const r of rows) {
      let p = byProduct.get(r.productId);
      if (!p) {
        p = {
          id: r.productId,
          nameTl: r.nameTl,
          nameEn: r.nameEn,
          category: r.category,
          isPerishable: r.isPerishable,
          units: [],
        };
        byProduct.set(r.productId, p);
        productsOut.push(p);
      }
      p.units.push({
        id: r.unitId,
        labelTl: r.unitLabelTl,
        labelEn: r.unitLabelEn,
        priceCentavos: priceByUnit.get(r.unitId) ?? null,
      });
    }

    return { pricedAt: at, products: productsOut };
  }),
});
