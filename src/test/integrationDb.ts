import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "~/server/db/schema";

/**
 * A Drizzle handle for the integration tests, pointed at a throwaway local
 * Postgres that has had every migration, `_rls.sql` file and `seed.sql`
 * applied (see AGENTS.md "Local integration tests"). Tests that need it
 * `describe.skipIf(!TEST_DATABASE_URL)` so a plain `pnpm test` stays green
 * on a machine without one.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export function integrationDb() {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  const client = postgres(TEST_DATABASE_URL, { prepare: false, max: 2 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

/**
 * A brand-new store on the seeded route with a wide-open tab, so each test
 * file charges its own balance and files can run in parallel (and re-run)
 * without stepping on each other.
 */
export async function freshStore(db: ReturnType<typeof integrationDb>["db"]) {
  const ownerUserId = crypto.randomUUID();
  const [store] = await db
    .insert(schema.stores)
    .values({
      ownerUserId,
      name: `Tindahan ${ownerUserId.slice(0, 8)}`,
      ownerName: "Aling Test",
      phoneE164: `+639${Math.floor(Math.random() * 1e9)
        .toString()
        .padStart(9, "0")}`,
      routeId: SEED.routeId,
      sukiLimitCentavos: 1_000_000n,
    })
    .returning();
  return store!;
}

/** Fixed ids from drizzle/seed.sql. */
export const SEED = {
  routeId: "aaaaaaaa-0000-0000-0000-000000000001",
  sibuyasId: "bbbbbbbb-0001-0000-0000-000000000000",
  sibuyasKiloUnitId: "cccccccc-0001-0000-0000-000000000003",
  sibuyasPirasoUnitId: "cccccccc-0001-0000-0000-000000000001",
  itlogDosenaUnitId: "cccccccc-0005-0000-0000-000000000002",
} as const;
