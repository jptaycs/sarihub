import type { QueryKey } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import superjson from "superjson";

/**
 * Offline price list: the owner's catalog (`catalog.today`) is the one query
 * worth keeping on the phone. With no signal at 9 PM the store still opens on
 * last night's prices (flagged as stale on screen) instead of a blank error.
 *
 * Everything else — balances, orders, staff boards — must never be shown
 * from a stale copy, so only that one query is dehydrated.
 */
export const PERSISTED_QUERY_KEY = ["catalog", "today"] as const;

/** Prices are good for 24 hours (`PRICE_VALIDITY_HOURS`), so the cache is too. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** tRPC query keys look like `[["catalog","today"], { type: "query" }]`. */
export function isPersistedQuery(queryKey: QueryKey): boolean {
  const path = queryKey[0];
  return (
    Array.isArray(path) &&
    path.length === PERSISTED_QUERY_KEY.length &&
    path.every((segment, i) => segment === PERSISTED_QUERY_KEY[i])
  );
}

/** Centavos are bigints and `pricedAt` is a Date — plain JSON drops both. */
export const persistSerializer = {
  serialize: (value: unknown) => superjson.stringify(value),
  deserialize: (text: string) => superjson.parse(text),
};

export function createCatalogPersister() {
  // Private window / blocked storage: `localStorage` can throw on access.
  let storage: Storage | undefined;
  try {
    storage = typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    storage = undefined;
  }
  return createSyncStoragePersister({
    storage,
    key: "sarihub-catalog",
    serialize: persistSerializer.serialize,
    deserialize: persistSerializer.deserialize as (text: string) => never,
  });
}
