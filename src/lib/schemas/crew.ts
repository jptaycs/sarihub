import { z } from "zod";

import { validationMessage } from "~/lib/i18n/validation";

/**
 * Crew-app (truck helper) inputs — shared by the /crew forms and the `crew`
 * tRPC router, single source of truth per AGENTS.md.
 */

export const routeIdInput = z.object({ routeId: z.string().uuid() });
export type RouteIdInput = z.infer<typeof routeIdInput>;

export const packOrderInput = z.object({ orderId: z.string().uuid() });
export type PackOrderInput = z.infer<typeof packOrderInput>;

/**
 * A manual stock movement. `load` and `sale` rows are written by the
 * server (load-from-orders, POS sale), so the helper can only `add` or
 * `reduce` by hand — and a reduce must say why.
 */
export const recordStockMovementInput = z
  .object({
    routeId: z.string().uuid(),
    productUnitId: z.string().uuid(),
    kind: z.enum(["add", "reduce"]),
    quantity: z.number().int().min(1).max(999),
    reason: z.string().trim().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "reduce" && !val.reason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: validationMessage("reasonRequired") });
    }
  });
export type RecordStockMovementInput = z.infer<typeof recordStockMovementInput>;

export const posPaymentInput = z.enum(["cash", "suki"]);

/** One walk-up sale off the truck. A suki-tab sale needs a store to charge. */
export const createPosSaleInput = z
  .object({
    routeId: z.string().uuid(),
    /** Client-generated, one per cart. Retrying a flaky submit reuses it. */
    idempotencyKey: z.string().uuid(),
    storeId: z.string().uuid().nullable(),
    customerName: z.string().trim().max(80).optional(),
    payment: posPaymentInput,
    items: z
      .array(
        z.object({
          productUnitId: z.string().uuid(),
          quantity: z.number().int().min(1).max(999),
        }),
      )
      .min(1)
      .max(60),
  })
  .superRefine((val, ctx) => {
    if (val.payment === "suki" && !val.storeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storeId"], message: validationMessage("storeRequired") });
    }
  });
export type CreatePosSaleInput = z.infer<typeof createPosSaleInput>;

export const posSaleIdInput = z.object({ saleId: z.string().uuid() });

export const storeSearchInput = z.object({
  routeId: z.string().uuid(),
  q: z.string().trim().max(60),
});
export type StoreSearchInput = z.infer<typeof storeSearchInput>;
