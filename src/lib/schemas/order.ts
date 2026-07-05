import { z } from "zod";

/**
 * Single source of truth for order placement — backs both the client cart
 * and the `orders.place` tRPC input.
 */
export const placeOrderInput = z.object({
  /** Client-generated, one per cart. Retrying a flaky submit reuses it. */
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        productUnitId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "Walang laman ang order.")
    .max(60),
});

export type PlaceOrderInput = z.infer<typeof placeOrderInput>;
