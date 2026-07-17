import "server-only";

import { TRPCError } from "@trpc/server";
import { addHours } from "date-fns";
import { and, asc, eq, sql } from "drizzle-orm";

import { formatManila, now } from "~/lib/datetime";
import { markOutOfStockInput, setPriceInput } from "~/lib/schemas/price";
import { dailyPrices, productUnits, products } from "~/server/db/schema";
import { markUnitOutOfStock, stockoutsForDay } from "~/server/services/stockouts";
import { buyerProcedure, router, staffProcedure } from "~/server/trpc/init";

/** New price rows are good for 24 hours, same convention as the seed. */
const PRICE_VALIDITY_HOURS = 24;

export const buyerRouter = router({
  /** Who am I on the distributor side — drives the role guard client-side. */
  me: staffProcedure.query(({ ctx }) => ({
    name: ctx.staff.name,
    role: ctx.staff.role,
  })),

  /**
   * The 5 AM price board: every active unit with today's live price, the last
   * known price before it (what "carry over" would write), and whether the
   * unit is already marked out of stock for today.
   */
  priceBoard: buyerProcedure.query(async ({ ctx }) => {
    const at = now();
    const todayStr = formatManila(at, "yyyy-MM-dd");

    const rows = await ctx.db
      .select({
        productId: products.id,
        nameTl: products.nameTl,
        nameEn: products.nameEn,
        category: products.category,
        unitId: productUnits.id,
        unitLabelTl: productUnits.labelTl,
      })
      .from(products)
      .innerJoin(productUnits, eq(productUnits.productId, products.id))
      .where(and(eq(products.isActive, true), eq(productUnits.isActive, true)))
      .orderBy(asc(products.category), asc(products.nameTl), asc(productUnits.sortOrder));

    // Two most recent price rows per unit: the live one (if still valid) and
    // the one before it — enough to show today's price and yesterday's.
    // valid_until comes back as raw text, not a Date: drizzle disables postgres-js's
    // timestamptz parser on the shared client for its own column-mapping logic, which
    // doesn't apply to this raw query. Parse it explicitly.
    const history = await ctx.db.execute<{
      product_unit_id: string;
      price_centavos: string;
      valid_until: string;
    }>(
      sql`SELECT product_unit_id, price_centavos, valid_until
          FROM (
            SELECT product_unit_id, price_centavos, valid_until,
                   row_number() OVER (PARTITION BY product_unit_id ORDER BY captured_at DESC) AS rn
            FROM daily_prices
            WHERE captured_at <= ${at.toISOString()}
          ) ranked
          WHERE rn <= 2
          ORDER BY product_unit_id, rn`,
    );

    const todayByUnit = new Map<string, bigint>();
    const previousByUnit = new Map<string, bigint>();
    for (const row of history) {
      const price = BigInt(row.price_centavos);
      const live = new Date(row.valid_until) > at;
      if (live && !todayByUnit.has(row.product_unit_id)) {
        todayByUnit.set(row.product_unit_id, price);
      } else if (!previousByUnit.has(row.product_unit_id)) {
        previousByUnit.set(row.product_unit_id, price);
      }
    }

    const stockouts = await stockoutsForDay(ctx.db, todayStr);

    type UnitOut = {
      id: string;
      labelTl: string;
      todayCentavos: bigint | null;
      previousCentavos: bigint | null;
      outOfStockToday: boolean;
    };
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: string;
      units: UnitOut[];
    };

    const productsOut: ProductOut[] = [];
    const byProduct = new Map<string, ProductOut>();
    for (const r of rows) {
      let p = byProduct.get(r.productId);
      if (!p) {
        p = { id: r.productId, nameTl: r.nameTl, nameEn: r.nameEn, category: r.category, units: [] };
        byProduct.set(r.productId, p);
        productsOut.push(p);
      }
      p.units.push({
        id: r.unitId,
        labelTl: r.unitLabelTl,
        todayCentavos: todayByUnit.get(r.unitId) ?? null,
        previousCentavos: previousByUnit.get(r.unitId) ?? null,
        outOfStockToday: stockouts.has(r.unitId),
      });
    }

    return { asOf: at, day: todayStr, products: productsOut };
  }),

  /** Write today's price for one unit. Always INSERT — the ledger of prices is append-only. */
  setPrice: buyerProcedure.input(setPriceInput).mutation(async ({ ctx, input }) => {
    const at = now();

    const [unit] = await ctx.db
      .select({ id: productUnits.id })
      .from(productUnits)
      .innerJoin(products, eq(products.id, productUnits.productId))
      .where(
        and(
          eq(productUnits.id, input.productUnitId),
          eq(productUnits.isActive, true),
          eq(products.isActive, true),
        ),
      )
      .limit(1);
    if (!unit) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Hindi po mahanap ang item na iyan." });
    }

    await ctx.db
      .insert(dailyPrices)
      .values({
        productUnitId: input.productUnitId,
        priceCentavos: BigInt(input.priceCentavos),
        capturedAt: at,
        validUntil: addHours(at, PRICE_VALIDITY_HOURS),
        capturedBy: ctx.staff.userId,
      })
      .onConflictDoNothing();

    return { productUnitId: input.productUnitId, priceCentavos: BigInt(input.priceCentavos) };
  }),

  /**
   * Bulk action for the 5 AM rush: every active unit with no live price gets a
   * fresh row copied from its most recent expired price. Units that never had
   * a price stay unpriced — there is nothing to carry.
   */
  carryOverYesterday: buyerProcedure.mutation(async ({ ctx }) => {
    const at = now();
    const validUntil = addHours(at, PRICE_VALIDITY_HOURS);
    const atIso = at.toISOString();
    const validUntilIso = validUntil.toISOString();

    const inserted = await ctx.db.execute<{ id: string }>(
      sql`INSERT INTO daily_prices (product_unit_id, price_centavos, captured_at, valid_until, source_market, captured_by)
          SELECT DISTINCT ON (dp.product_unit_id)
                 dp.product_unit_id, dp.price_centavos, ${atIso}, ${validUntilIso}, dp.source_market, ${ctx.staff.userId}
          FROM daily_prices dp
          JOIN product_units pu ON pu.id = dp.product_unit_id AND pu.is_active
          JOIN products p ON p.id = pu.product_id AND p.is_active
          WHERE dp.captured_at <= ${atIso}
            AND NOT EXISTS (
              SELECT 1 FROM daily_prices live
              WHERE live.product_unit_id = dp.product_unit_id
                AND live.captured_at <= ${atIso}
                AND live.valid_until > ${atIso}
            )
          ORDER BY dp.product_unit_id, dp.captured_at DESC
          RETURNING id`,
    );

    return { carried: inserted.length };
  }),

  /** Unit is unsourceable today: flag it and cancel the line on today's submitted orders. */
  markOutOfStock: buyerProcedure.input(markOutOfStockInput).mutation(async ({ ctx, input }) => {
    const result = await markUnitOutOfStock(ctx.db, ctx.staff.userId, input.productUnitId);
    if (!result.ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
    }
    return result;
  }),
});
