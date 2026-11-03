import "server-only";

import { and, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";

import { formatManila, now } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n/locale";
import type { CreatePosSaleInput } from "~/lib/schemas/crew";
import { db as defaultDb } from "~/server/db";
import {
  dailyPrices,
  posSaleItems,
  posSales,
  productUnits,
  products,
  routes,
  stores,
  sukiLedger,
  truckStockMovements,
} from "~/server/db/schema";

type Db = typeof defaultDb;

export type PosSaleLine = {
  productUnitId: string;
  nameTl: string;
  unitLabelTl: string;
  quantity: number;
  lockedUnitPriceCentavos: bigint;
  lockedTotalCentavos: bigint;
};

export type CreatePosSaleResult =
  | {
      ok: true;
      alreadySold: boolean;
      sale: {
        saleId: string;
        totalCentavos: bigint;
        payment: "cash" | "suki";
        items: PosSaleLine[];
      };
    }
  | {
      ok: false;
      reason:
        | "route_not_found"
        | "unknown_item"
        | "no_price_today"
        | "store_not_found"
        | "suki_needs_store"
        | "over_suki_limit";
      message: string;
      /** For over_suki_limit: how much tab room is left, so the UI can say it. */
      availableCentavos?: bigint;
    };

/**
 * Ring up a walk-up sale off the truck.
 *
 * Mirrors `placeOrder`: unit prices are locked from the daily_prices row live
 * at sale time; a suki-tab sale checks `limit − balance` under FOR UPDATE and
 * posts a `charge` row to the append-only ledger; every line also writes a
 * `sale` movement on the truck's stock ledger for today. All in one
 * transaction, idempotent on the client key.
 */
export async function createPosSale(
  db: Db,
  staffUserId: string,
  input: CreatePosSaleInput,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CreatePosSaleResult> {
  const dict = getDictionary(locale).crew;
  const at = now();
  const dayStr = formatManila(at, "yyyy-MM-dd");

  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(eq(routes.id, input.routeId))
    .limit(1);
  if (!route) {
    return { ok: false, reason: "route_not_found", message: dict.errors.routeNotFound };
  }
  if (input.payment === "suki" && !input.storeId) {
    return { ok: false, reason: "suki_needs_store", message: dict.errors.sukiNeedsStore };
  }

  // Same unit tapped twice collapses into one line.
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.productUnitId, (quantities.get(item.productUnitId) ?? 0) + item.quantity);
  }
  const unitIds = [...quantities.keys()];

  const unitRows = await db
    .select({
      unitId: productUnits.id,
      productId: products.id,
      nameTl: products.nameTl,
      unitLabelTl: productUnits.labelTl,
    })
    .from(productUnits)
    .innerJoin(products, eq(products.id, productUnits.productId))
    .where(
      and(
        inArray(productUnits.id, unitIds),
        eq(productUnits.isActive, true),
        eq(products.isActive, true),
      ),
    );
  if (unitRows.length !== unitIds.length) {
    return { ok: false, reason: "unknown_item", message: dict.errors.unknownItem };
  }

  // Live price per unit right now. This row is what gets locked.
  const priceRows = await db
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
    .orderBy(dailyPrices.productUnitId, desc(dailyPrices.capturedAt));
  const priceByUnit = new Map(priceRows.map((r) => [r.productUnitId, r.priceCentavos]));

  const unpriced = unitRows.filter((u) => !priceByUnit.has(u.unitId));
  if (unpriced.length > 0) {
    const names = unpriced.map((u) => `${u.nameTl} (${u.unitLabelTl})`).join(", ");
    return {
      ok: false,
      reason: "no_price_today",
      message: interpolate(dict.errors.noPriceToday, { names }),
    };
  }

  const lines: Array<PosSaleLine & { productId: string }> = unitRows.map((u) => {
    const quantity = quantities.get(u.unitId)!;
    const unitPrice = priceByUnit.get(u.unitId)!;
    return {
      productUnitId: u.unitId,
      productId: u.productId,
      nameTl: u.nameTl,
      unitLabelTl: u.unitLabelTl,
      quantity,
      lockedUnitPriceCentavos: unitPrice,
      lockedTotalCentavos: unitPrice * BigInt(quantity),
    };
  });
  const totalCentavos = lines.reduce((sum, l) => sum + l.lockedTotalCentavos, 0n);

  return db.transaction(async (tx) => {
    // Two in-flight submits with the same key: the second waits here, then
    // finds the first one's sale instead of tripping the unique constraint.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.idempotencyKey}))`);

    const [existing] = await tx
      .select({ id: posSales.id, totalCentavos: posSales.totalCentavos, payment: posSales.payment })
      .from(posSales)
      .where(eq(posSales.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      return {
        ok: true as const,
        alreadySold: true,
        sale: {
          saleId: existing.id,
          totalCentavos: existing.totalCentavos,
          payment: existing.payment,
          items: [],
        },
      };
    }

    if (input.storeId) {
      // Lock the store row so a concurrent order can't also pass the suki check.
      const [locked] = await tx.execute<{
        suki_balance_centavos: string;
        suki_limit_centavos: string;
      }>(
        sql`SELECT suki_balance_centavos, suki_limit_centavos FROM stores WHERE id = ${input.storeId} FOR UPDATE`,
      );
      if (!locked) {
        return {
          ok: false as const,
          reason: "store_not_found" as const,
          message: dict.errors.storeNotFound,
        };
      }
      if (input.payment === "suki") {
        const available = BigInt(locked.suki_limit_centavos) - BigInt(locked.suki_balance_centavos);
        if (totalCentavos > available) {
          const availableCentavos = available > 0n ? available : 0n;
          return {
            ok: false as const,
            reason: "over_suki_limit" as const,
            message: interpolate(dict.errors.overSukiLimit, {
              available: formatPeso(availableCentavos),
            }),
            availableCentavos,
          };
        }
      }
    }

    const [sale] = await tx
      .insert(posSales)
      .values({
        routeId: input.routeId,
        storeId: input.storeId,
        customerName: input.storeId ? null : input.customerName?.length ? input.customerName : null,
        payment: input.payment,
        totalCentavos,
        soldOn: dayStr,
        idempotencyKey: input.idempotencyKey,
        soldBy: staffUserId,
      })
      .returning({ id: posSales.id });
    const saleId = sale!.id;

    await tx.insert(posSaleItems).values(
      lines.map((l) => ({
        saleId,
        productId: l.productId,
        productUnitId: l.productUnitId,
        quantity: l.quantity,
        lockedUnitPriceCentavos: l.lockedUnitPriceCentavos,
        lockedTotalCentavos: l.lockedTotalCentavos,
      })),
    );

    // The goods left the truck.
    await tx.insert(truckStockMovements).values(
      lines.map((l) => ({
        routeId: input.routeId,
        stockOn: dayStr,
        productUnitId: l.productUnitId,
        kind: "sale" as const,
        quantity: l.quantity,
        posSaleId: saleId,
        createdBy: staffUserId,
      })),
    );

    if (input.payment === "suki" && input.storeId) {
      // The tab charge. The trigger on suki_ledger refreshes the store balance.
      await tx.insert(sukiLedger).values({
        storeId: input.storeId,
        kind: "charge",
        amountCentavos: totalCentavos,
        posSaleId: saleId,
        reason: getDictionary(DEFAULT_LOCALE).crew.sell.ledgerReason,
      });
    }

    return {
      ok: true as const,
      alreadySold: false,
      sale: {
        saleId,
        totalCentavos,
        payment: input.payment,
        items: lines.map(({ productId: _productId, ...line }) => line),
      },
    };
  });
}
