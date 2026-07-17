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
