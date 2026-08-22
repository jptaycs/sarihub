import { z } from "zod";

/**
 * Admin-side inputs. Shared by the /admin forms (react-hook-form) and the
 * admin tRPC routers — single source of truth, per AGENTS.md.
 */

/** Forward-only lifecycle steps an admin can push an order through. */
export const setOrderStatusInput = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["packed", "in_transit", "delivered"]),
});
export type SetOrderStatusInput = z.infer<typeof setOrderStatusInput>;

export const upsertProductInput = z.object({
  id: z.string().uuid().optional(),
  nameTl: z.string().trim().min(1, "Kailangan ang pangalan.").max(120),
  nameEn: z.string().trim().min(1, "Kailangan ang English name.").max(120),
  category: z.enum(["gulay", "itlog", "isda", "kusina"]),
  isPerishable: z.boolean(),
  source: z.enum(["palengke", "warehouse"]),
  isActive: z.boolean(),
});
export type UpsertProductInput = z.infer<typeof upsertProductInput>;

export const upsertUnitInput = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  labelTl: z.string().trim().min(1, "Kailangan ang label.").max(48),
  labelEn: z.string().trim().min(1, "Kailangan ang English label.").max(48),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,8}$/, "Numero lamang po."),
  /** Grams per unit; null = unknown, excluded from the load total. */
  weightGrams: z.number().int().min(1).max(100_000).nullable(),
  isActive: z.boolean(),
});
export type UpsertUnitInput = z.infer<typeof upsertUnitInput>;

export const recordPaymentInput = z.object({
  storeId: z.string().uuid(),
  /** Positive centavos; the ledger row is written negative (pays the tab down). */
  amountCentavos: z.number().int().min(1).max(100_000_000),
  note: z.string().trim().max(200).optional(),
  /** Client-generated, one per form submission. Retrying a flaky/double-tapped submit reuses it. */
  idempotencyKey: z.string().uuid(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentInput>;

export const recordAdjustmentInput = z.object({
  storeId: z.string().uuid(),
  /** Signed centavos: positive = store owes more, negative = owes less. */
  amountCentavos: z
    .number()
    .int()
    .min(-100_000_000)
    .max(100_000_000)
    .refine((v) => v !== 0, "Hindi pwedeng zero."),
  reason: z.string().trim().min(3, "Kailangan ang dahilan.").max(200),
  /** Client-generated, one per form submission. Retrying a flaky/double-tapped submit reuses it. */
  idempotencyKey: z.string().uuid(),
});
export type RecordAdjustmentInput = z.infer<typeof recordAdjustmentInput>;

export const createStoreInput = z.object({
  name: z.string().trim().min(1, "Kailangan ang pangalan ng tindahan.").max(120),
  ownerName: z.string().trim().min(1, "Kailangan ang pangalan ng may-ari.").max(120),
  /** Any PH-mobile spelling; parsed to E.164 server-side. */
  phone: z.string().trim().min(1, "Kailangan ang numero."),
  addressLine: z.string().trim().max(300).optional(),
  /** Delivery pin set via the map picker; null = not pinned yet. */
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  routeId: z.string().uuid().nullable(),
  /** Position along the route's morning run; null = not sequenced yet. */
  stopOrder: z.number().int().min(1).max(999).nullable(),
  sukiLimitCentavos: z.number().int().min(0).max(100_000_000),
});
export type CreateStoreInput = z.infer<typeof createStoreInput>;

export const updateStoreInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().min(1).max(120),
  addressLine: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  routeId: z.string().uuid().nullable(),
  stopOrder: z.number().int().min(1).max(999).nullable(),
  sukiLimitCentavos: z.number().int().min(0).max(100_000_000),
});
export type UpdateStoreInput = z.infer<typeof updateStoreInput>;

export const importCsvInput = z.object({
  /** Raw CSV text, already read client-side via file.text() — one parser, server-side only. */
  csv: z.string().trim().min(1, "Walang laman ang file."),
});
export type ImportCsvInput = z.infer<typeof importCsvInput>;
