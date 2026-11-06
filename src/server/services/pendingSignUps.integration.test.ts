import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TEST_DATABASE_URL, integrationDb } from "~/test/integrationDb";

import { listPendingSignUps } from "./pendingSignUps";

describe.skipIf(!TEST_DATABASE_URL)("listPendingSignUps (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  const waiting = crypto.randomUUID();
  const otpUser = crypto.randomUUID();
  const tag = waiting.slice(0, 8);
  const meta = JSON.stringify({
    signup: "self",
    full_name: `Nena ${tag}`,
    store_name: `Tindahan ${tag}`,
    address_line: "Brgy. Dupay",
  });

  beforeAll(async () => {
    // The local auth.users stub predates self sign-up; real Supabase has these.
    await db.execute(sql`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb`);
    await db.execute(sql`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
    await db.execute(
      sql`INSERT INTO auth.users (id, phone, raw_user_meta_data) VALUES (${waiting}, ${`6390${tag.replace(/\D/g, "0").slice(0, 8)}`}, ${meta}::jsonb)`,
    );
    await db.execute(sql`INSERT INTO auth.users (id, phone) VALUES (${otpUser}, '639990000000')`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM auth.users WHERE id IN (${waiting}, ${otpUser})`);
    await close();
  });

  it("lists self sign-ups with no store or staff row, with what they filled in", async () => {
    const rows = await listPendingSignUps(db);
    const mine = rows.find((r) => r.userId === waiting);
    expect(mine).toMatchObject({
      fullName: `Nena ${tag}`,
      storeName: `Tindahan ${tag}`,
      addressLine: "Brgy. Dupay",
    });
    expect(mine?.phoneE164).toMatch(/^\+639/);
    expect(rows.some((r) => r.userId === otpUser)).toBe(false);
  });

  it("drops a sign-up once a store is linked to it", async () => {
    const [route] = await db.execute<{ id: string }>(sql`SELECT id FROM routes LIMIT 1`);
    await db.execute(
      sql`INSERT INTO stores (owner_user_id, name, owner_name, phone_e164, route_id)
          VALUES (${waiting}, ${`Tindahan ${tag}`}, ${`Nena ${tag}`}, ${`+6390${tag.replace(/\D/g, "0").slice(0, 8)}`}, ${route?.id ?? null})`,
    );
    try {
      const rows = await listPendingSignUps(db);
      expect(rows.some((r) => r.userId === waiting)).toBe(false);
    } finally {
      await db.execute(sql`DELETE FROM stores WHERE owner_user_id = ${waiting}`);
    }
  });
});
