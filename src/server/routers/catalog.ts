import "server-only";

import { and, asc, desc, eq, gt, inArray, lte } from "drizzle-orm";

import { formatManila, now } from "~/lib/datetime";
import { nextDeliveryDate } from "~/lib/deliverySchedule";
import { dailyPrices, productUnits, products, routes, stores } from "~/server/db/schema";
import { stockoutsForDay } from "~/server/services/stockouts";
import { protectedProcedure, router } from "~/server/trpc/init";

export const catalogRouter = router({
  /**
   * Everything orderable right now: active products, their units, and the
   * live price per unit. Units with no valid price today come back with
   * `priceCentavos: null` — shown but not orderable.
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    const at = now();

    // Stockouts apply per delivery day, so resolve the day this caller's next
    // order would ride. No store/route yet → fall back to today's Manila date.
    const [store] = await ctx.db
      .select({
        cutoffLocal: routes.cutoffLocal,
        activeWeekdays: routes.activeWeekdays,
      })
      .from(stores)
      .innerJoin(routes, eq(routes.id, stores.routeId))
      .where(eq(stores.ownerUserId, ctx.user.id))
      .limit(1);
    const deliveryDayStr = formatManila(store ? nextDeliveryDate(store, at) : at, "yyyy-MM-dd");
    const stockouts = await stockoutsForDay(ctx.db, deliveryDayStr);

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
      /** Buyer couldn't source it for this caller's delivery day. Not orderable. */
      outOfStock: boolean;
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
        outOfStock: stockouts.has(r.unitId),
      });
    }

    return { pricedAt: at, products: productsOut };
  }),
});
