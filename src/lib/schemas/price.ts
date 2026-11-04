import { z } from "zod";

import { validationMessage } from "~/lib/i18n/validation";

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
    .min(1, validationMessage("priceRequired"))
    .max(10_000_000, validationMessage("priceTooLarge")),
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
          message: validationMessage("percentRange"),
        });
      }
    } else if (!(Number.isInteger(val.value) && val.value > 0 && val.value <= 10_000_000)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: validationMessage("amountInvalid"),
      });
    }
  });

export type BulkAdjustPricesInput = z.infer<typeof bulkAdjustPricesInput>;
