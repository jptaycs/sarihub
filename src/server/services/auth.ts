import "server-only";

import { and, eq } from "drizzle-orm";

import { createSupabaseServer } from "~/lib/supabase/server";
import { parsePhPhone } from "~/lib/format";
import { db } from "~/server/db";
import { staff, type Staff } from "~/server/db/schema";

/**
 * The active staff row for the signed-in user, or null for owners and guests.
 * Server Components use this to keep buyer/admin/driver screens off owner
 * accounts; tRPC has its own staffProcedure doing the same check.
 */
export async function activeStaffForRequest(): Promise<Staff | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [row] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.userId, user.id), eq(staff.isActive, true)))
    .limit(1);
  return row ?? null;
}

export type StartOtpResult =
  | { ok: true; phoneE164: string }
  | { ok: false; reason: "invalid_phone" | "rate_limited" | "send_failed"; message: string };

export async function startPhoneOtp(rawPhone: string): Promise<StartOtpResult> {
  const phoneE164 = parsePhPhone(rawPhone);
  if (!phoneE164) {
    return {
      ok: false,
      reason: "invalid_phone",
      message: "Hindi tama ang numero. Ipasok po ang 10-digit na mobile.",
    };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { channel: "sms" },
  });

  if (error) {
    if (error.status === 429) {
      return {
        ok: false,
        reason: "rate_limited",
        message: "Maraming subok po. Subukan ulit pagkalipas ng ilang minuto.",
      };
    }
    return {
      ok: false,
      reason: "send_failed",
      message: "Hindi namin nasend ang code. Subukan po ulit.",
    };
  }

  return { ok: true, phoneE164 };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "expired" | "verify_failed"; message: string };

export async function verifyPhoneOtp(phoneE164: string, token: string): Promise<VerifyOtpResult> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: "sms",
  });

  if (error) {
    if (/expired/i.test(error.message)) {
      return {
        ok: false,
        reason: "expired",
        message: "Expired na po ang code. Magpadala ulit.",
      };
    }
    if (error.status === 400 || /invalid|incorrect/i.test(error.message)) {
      return {
        ok: false,
        reason: "invalid_code",
        message: "Mali po ang code. Subukan ulit.",
      };
    }
    return {
      ok: false,
      reason: "verify_failed",
      message: "May problema sa pag-verify. Subukan po ulit.",
    };
  }

  return { ok: true };
}
