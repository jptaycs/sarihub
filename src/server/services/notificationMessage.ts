// Deliberately no "import server-only" here — pure, DB-free, network-free
// string rendering kept directly unit-testable. See the plan's Global
// Constraints note on why "server-only" can't resolve under Vitest.

import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import type { NotificationKind } from "~/server/db/schema";

const TEMPLATE_KEY: Record<NotificationKind, keyof Dictionary["sms"]> = {
  confirmed: "confirmed",
  out_for_delivery: "outForDelivery",
  delivered: "delivered",
};

/** Renders the SMS body for one notification kind. Tagalog-only for v1 —
 *  see the spec's Scope for why (no server-persisted per-store locale
 *  exists yet); callers always pass the `tl` dictionary today. */
export function notificationMessage(dict: Dictionary, kind: NotificationKind, storeName: string): string {
  return interpolate(dict.sms[TEMPLATE_KEY[kind]], { storeName });
}
