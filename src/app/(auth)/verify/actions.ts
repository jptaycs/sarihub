"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { startPhoneOtp, verifyPhoneOtp } from "~/server/services/auth";

const verifySchema = z.object({
  phone: z.string().regex(/^\+63\d{10}$/),
  code: z.string().regex(/^\d{6}$/),
});

export type VerifyState = { error?: string } | null;

export async function verifyOtpAction(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const locale = await getServerLocale();
  const parsed = verifySchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: getDictionary(locale).verify.invalidCode };
  }
  const result = await verifyPhoneOtp(parsed.data.phone, parsed.data.code, locale);
  if (!result.ok) {
    return { error: result.message };
  }
  redirect("/home");
}

const resendSchema = z.object({ phone: z.string().regex(/^\+63\d{10}$/) });

export type ResendState = { error?: string; ok?: boolean } | null;

export async function resendOtpAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const locale = await getServerLocale();
  const parsed = resendSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: getDictionary(locale).verify.invalidPhone };
  }
  const result = await startPhoneOtp(parsed.data.phone, locale);
  if (!result.ok) return { error: result.message };
  return { ok: true };
}
