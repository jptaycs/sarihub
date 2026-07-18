import "server-only";

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
});
