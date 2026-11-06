import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TEST_DATABASE_URL, integrationDb } from "~/test/integrationDb";

import { findAuthUserId } from "./authUsers";

describe.skipIf(!TEST_DATABASE_URL)("findAuthUserId (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  const phoneUser = crypto.randomUUID();
  const emailUser = crypto.randomUUID();
  const digits = `6391${String(Date.now()).slice(-8)}`;
  const email = `nena.${phoneUser.slice(0, 8)}@gmail.com`;

  beforeAll(async () => {
    // The local auth.users stub predates social sign-in; real Supabase has `email`.
    await db.execute(sql`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email text`);
    await db.execute(sql`INSERT INTO auth.users (id, phone) VALUES (${phoneUser}, ${digits})`);
    await db.execute(sql`INSERT INTO auth.users (id, email) VALUES (${emailUser}, ${email})`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM auth.users WHERE id IN (${phoneUser}, ${emailUser})`);
    await close();
  });

  it("finds a phone sign-in by its E.164 number", async () => {
    expect(await findAuthUserId(db, { phoneE164: `+${digits}` })).toBe(phoneUser);
  });

  it("finds a Google/Facebook sign-in by email, ignoring case, in preference to the phone", async () => {
    expect(await findAuthUserId(db, { phoneE164: `+${digits}`, email: email.toUpperCase() })).toBe(
      emailUser,
    );
  });

  it("is null when nobody has signed in with that email yet", async () => {
    expect(await findAuthUserId(db, { phoneE164: `+${digits}`, email: "nobody@example.com" })).toBeNull();
  });
});
