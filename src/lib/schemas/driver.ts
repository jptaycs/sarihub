import { z } from "zod";

/**
 * Delivery confirmation. POD paths are Supabase Storage object paths in the
 * `pod` bucket, uploaded by the client before this mutation fires. Both are
 * optional — patchy 4G in a moving Tamaraw must never block the handoff.
 */
export const markDeliveredInput = z.object({
  orderId: z.string().uuid(),
  podPhotoPath: z.string().trim().min(1).max(300).optional(),
  podSignaturePath: z.string().trim().min(1).max(300).optional(),
});

export type MarkDeliveredInput = z.infer<typeof markDeliveredInput>;
