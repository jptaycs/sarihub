import "server-only";

import { eq } from "drizzle-orm";

import { db as defaultDb } from "~/server/db";
import { routes, stores } from "~/server/db/schema";

type Db = typeof defaultDb;

/**
 * The signed-in owner's store, with suki tab standing and route schedule.
 * `null` when the auth user has no store row yet (registered but not
 * onboarded). Shared by `store.me` (tRPC, client-side) and the profile page
 * (Server Component, calls this directly — no client round trip needed).
 */
export async function getStoreForOwner(db: Db, userId: string) {
  const [row] = await db
    .select({
      id: stores.id,
      name: stores.name,
      ownerName: stores.ownerName,
      phoneE164: stores.phoneE164,
      addressLine: stores.addressLine,
      sukiLimitCentavos: stores.sukiLimitCentavos,
      sukiBalanceCentavos: stores.sukiBalanceCentavos,
      routeName: routes.name,
      routeCutoffLocal: routes.cutoffLocal,
      routeActiveWeekdays: routes.activeWeekdays,
    })
    .from(stores)
    .leftJoin(routes, eq(routes.id, stores.routeId))
    .where(eq(stores.ownerUserId, userId))
    .limit(1);

  return row ?? null;
}
