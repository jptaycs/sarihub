import "server-only";

import { eq } from "drizzle-orm";

import { routes, stores } from "~/server/db/schema";
import { protectedProcedure, router } from "~/server/trpc/init";

export const storeRouter = router({
  /**
   * The signed-in owner's store, with suki tab standing and route schedule.
   * `null` when the auth user has no store row yet (registered but not onboarded).
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        id: stores.id,
        name: stores.name,
        ownerName: stores.ownerName,
        phoneE164: stores.phoneE164,
        sukiLimitCentavos: stores.sukiLimitCentavos,
        sukiBalanceCentavos: stores.sukiBalanceCentavos,
        routeName: routes.name,
        routeCutoffLocal: routes.cutoffLocal,
        routeActiveWeekdays: routes.activeWeekdays,
      })
      .from(stores)
      .leftJoin(routes, eq(routes.id, stores.routeId))
      .where(eq(stores.ownerUserId, ctx.user.id))
      .limit(1);

    return row ?? null;
  }),
});
