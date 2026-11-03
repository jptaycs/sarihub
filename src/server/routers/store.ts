import "server-only";

import { desc, eq } from "drizzle-orm";

import { stores, sukiLedger } from "~/server/db/schema";
import { getStoreForOwner } from "~/server/services/store";
import { protectedProcedure, router } from "~/server/trpc/init";

export const storeRouter = router({
  /**
   * The signed-in owner's store, with suki tab standing and route schedule.
   * `null` when the auth user has no store row yet (registered but not onboarded).
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return getStoreForOwner(ctx.db, ctx.user.id);
  }),

  /**
   * The owner's own tab activity, newest first — so a charge rung up at the
   * door by the truck helper (a POS suki sale) is never a mystery jump in
   * the balance. Empty for an account with no store.
   */
  ledger: protectedProcedure.query(async ({ ctx }) => {
    const [store] = await ctx.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerUserId, ctx.user.id))
      .limit(1);
    if (!store) return [];
    return ctx.db
      .select({
        id: sukiLedger.id,
        kind: sukiLedger.kind,
        amountCentavos: sukiLedger.amountCentavos,
        reason: sukiLedger.reason,
        orderId: sukiLedger.orderId,
        posSaleId: sukiLedger.posSaleId,
        createdAt: sukiLedger.createdAt,
      })
      .from(sukiLedger)
      .where(eq(sukiLedger.storeId, store.id))
      .orderBy(desc(sukiLedger.createdAt))
      .limit(30);
  }),
});
