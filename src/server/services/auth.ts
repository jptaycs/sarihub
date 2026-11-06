import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { createSupabaseServer } from "~/lib/supabase/server";
import { parsePhPhone } from "~/lib/format";
import { classifyOtpSendError } from "~/lib/otpSendError";
import { classifyPasswordAuthError, type SignUpInput } from "~/lib/schemas/signUp";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n/locale";
import { db } from "~/server/db";
import { staff, type Staff } from "~/server/db/schema";

/**
 * The signed-in Supabase user for this request, or null. `supabase.auth.getUser()`
 * is a network round trip to Supabase Auth; a layout, its page and the first
 * tRPC batch each used to pay it. `cache` dedupes it to once per request.
 */
export const getRequestUser = cache(async () => {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The active staff row for the signed-in user, or null for owners and guests.
 * Server Components use this to keep buyer/admin/driver screens off owner
 * accounts; tRPC has its own staffProcedure doing the same check. Cached per
 * request, so a layout and its page share one lookup.
 */
export const activeStaffForRequest = cache(async (): Promise<Staff | null> => {
  const user = await getRequestUser();
  if (!user) return null;

  const [row] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.userId, user.id), eq(staff.isActive, true)))
    .limit(1);
  return row ?? null;
});

export type StartOtpResult =
  | { ok: true; phoneE164: string }
  | { ok: false; reason: "invalid_phone" | "rate_limited" | "unregistered_number" | "send_failed"; message: string };

export async function startPhoneOtp(
  rawPhone: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<StartOtpResult> {
  const dict = getDictionary(locale).login.errors;
  const phoneE164 = parsePhPhone(rawPhone);
  if (!phoneE164) {
    return { ok: false, reason: "invalid_phone", message: dict.invalidPhone };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { channel: "sms" },
  });

  if (error) {
    const reason = classifyOtpSendError(error);
    const message = {
      rate_limited: dict.rateLimited,
      unregistered_number: dict.unregisteredNumber,
      send_failed: dict.sendFailed,
    }[reason];
    return { ok: false, reason, message };
  }

  return { ok: true, phoneE164 };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "expired" | "verify_failed"; message: string };

export async function verifyPhoneOtp(
  phoneE164: string,
  token: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<VerifyOtpResult> {
  const dict = getDictionary(locale).verify.errors;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: "sms",
  });

  if (error) {
    if (/expired/i.test(error.message)) {
      return { ok: false, reason: "expired", message: dict.expired };
    }
    if (error.status === 400 || /invalid|incorrect/i.test(error.message)) {
      return { ok: false, reason: "invalid_code", message: dict.invalidCode };
    }
    return { ok: false, reason: "verify_failed", message: dict.verifyFailed };
  }

  return { ok: true };
}

export type PasswordAuthResult = { ok: true } | { ok: false; message: string };

/**
 * Self sign-up: mobile number + password, no SMS code. The Supabase project
 * auto-confirms phones, so signUp returns a live session (cookies set by the
 * server client). Sign-up details ride in user_metadata, where the admin
 * Stores page finds people still waiting for a store.
 */
export async function signUpWithPassword(
  input: SignUpInput,
  locale: Locale = DEFAULT_LOCALE,
): Promise<PasswordAuthResult> {
  const dict = getDictionary(locale).signUp.errors;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    phone: input.phoneE164,
    password: input.password,
    options: {
      data: {
        signup: "self",
        full_name: input.fullName,
        store_name: input.storeName,
        address_line: input.addressLine ?? null,
      },
    },
  });

  if (error) {
    const reason = classifyPasswordAuthError(error);
    const message = {
      already_registered: dict.alreadyRegistered,
      weak_password: dict.weakPassword,
      rate_limited: dict.rateLimited,
      wrong_password: dict.failed,
      failed: dict.failed,
    }[reason];
    return { ok: false, message };
  }
  // No session means the project started requiring phone confirmation —
  // which needs an SMS provider this deployment doesn't have.
  if (!data.session) return { ok: false, message: dict.failed };
  return { ok: true };
}

export async function signInWithPhonePassword(
  phoneE164: string,
  password: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<PasswordAuthResult> {
  const dict = getDictionary(locale).login.passwordErrors;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ phone: phoneE164, password });
  if (!error) return { ok: true };
  const reason = classifyPasswordAuthError(error);
  if (reason === "wrong_password") return { ok: false, message: dict.wrongPassword };
  if (reason === "rate_limited") return { ok: false, message: dict.rateLimited };
  return { ok: false, message: dict.failed };
}
