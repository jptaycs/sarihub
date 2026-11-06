import "server-only";

import { sql } from "drizzle-orm";

import { db as defaultDb } from "~/server/db";

type Db = typeof defaultDb;

/**
 * The Supabase auth user an admin is linking to a store or staff row.
 * With an email (someone who signs in with Google/Facebook) that account
 * wins; otherwise the phone-OTP account for the number. Null when that
 * person hasn't signed in yet.
 */
export async function findAuthUserId(
  db: Db,
  who: { phoneE164: string; email?: string },
): Promise<string | null> {
  const rows = who.email
    ? await db.execute<{ id: string }>(
        sql`SELECT id FROM auth.users WHERE lower(email) = ${who.email.toLowerCase()} LIMIT 1`,
      )
    : // Supabase stores auth.users.phone without the leading "+".
      await db.execute<{ id: string }>(
        sql`SELECT id FROM auth.users WHERE phone = ${who.phoneE164.slice(1)} LIMIT 1`,
      );
  return rows[0]?.id ?? null;
}
