import { z } from "zod";

/**
 * Buyer price entry — backs the price-board form and `buyer.setPrice`.
 * Centavos, not pesos: the UI converts with `pesosToCentavos` before submit.
 * Cap is ₱100,000 per unit; anything above that is a typo, not a price.
 */
export const setPriceInput = z.object({
  productUnitId: z.string().uuid(),
  priceCentavos: z
    .number()
    .int()
    .min(1, "Lagyan po ng presyo.")
    .max(10_000_000, "Masyadong malaki ang presyo — pakisuri po."),
});

export type SetPriceInput = z.infer<typeof setPriceInput>;

export const markOutOfStockInput = z.object({
  productUnitId: z.string().uuid(),
});

export type MarkOutOfStockInput = z.infer<typeof markOutOfStockInput>;

/**
 * Bulk price adjustment — moves every active unit's live price by a percent
 * or fixed amount, up or down. `value` means differently per mode: a percent
 * (5 = 5%) for "percent", already-converted integer centavos for "fixed" —
 * same client-side pesosToCentavos() conversion point as setPriceInput.
 */
export const bulkAdjustPricesInput = z
  .object({
    mode: z.enum(["percent", "fixed"]),
    direction: z.enum(["up", "down"]),
    value: z.number(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "percent") {
      if (!(val.value > 0 && val.value <= 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Sa pagitan ng 0 at 100 lang po ang porsyento.",
        });
      }
    } else if (!(Number.isInteger(val.value) && val.value > 0 && val.value <= 10_000_000)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Lagyan po ng tamang halaga.",
      });
    }
  });

export type BulkAdjustPricesInput = z.infer<typeof bulkAdjustPricesInput>;
