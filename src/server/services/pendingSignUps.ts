import "server-only";

import { sql } from "drizzle-orm";

import { db as defaultDb } from "~/server/db";

type Db = typeof defaultDb;

export type PendingSignUp = {
  userId: string;
  phoneE164: string;
  fullName: string;
  storeName: string;
  addressLine: string | null;
  signedUpAt: Date;
};

/**
 * People who made their own account on /signup and still have no store
 * (or staff row). An admin checks them — usually a call to the number —
 * and turns each into a store on /admin/stores; only then do they get a
 * suki limit and can order.
 */
export async function listPendingSignUps(db: Db): Promise<PendingSignUp[]> {
  const rows = await db.execute<{
    id: string;
    phone: string | null;
    full_name: string | null;
    store_name: string | null;
    address_line: string | null;
    created_at: string;
  }>(sql`
    SELECT u.id, u.phone, u.created_at,
           u.raw_user_meta_data->>'full_name' AS full_name,
           u.raw_user_meta_data->>'store_name' AS store_name,
           u.raw_user_meta_data->>'address_line' AS address_line
      FROM auth.users u
     WHERE u.raw_user_meta_data->>'signup' = 'self'
       AND NOT EXISTS (SELECT 1 FROM stores s WHERE s.owner_user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM staff st WHERE st.user_id = u.id)
     ORDER BY u.created_at DESC
     LIMIT 100`);
  return rows.map((r) => ({
    userId: r.id,
    // Supabase stores auth.users.phone without the leading "+".
    phoneE164: r.phone ? `+${r.phone}` : "",
    fullName: r.full_name ?? "",
    storeName: r.store_name ?? "",
    addressLine: r.address_line,
    signedUpAt: new Date(r.created_at),
  }));
}
