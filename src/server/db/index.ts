import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/**
 * Lazy database handle. The connection is opened on first use, not at module
 * import — so `next build` can collect pages without DATABASE_URL set.
 */
function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }
  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return Reflect.get(getDb() as object, prop);
  },
});

export { schema };
