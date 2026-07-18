"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { startPhoneOtp } from "~/server/services/auth";

const schema = z.object({ phone: z.string().min(1) });

export type LoginActionState = { error?: string } | null;

export async function startOtpAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const locale = await getServerLocale();
  const parsed = schema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: getDictionary(locale).login.invalidPhone };
  }
  const result = await startPhoneOtp(parsed.data.phone, locale);
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(`/verify?phone=${encodeURIComponent(result.phoneE164)}`);
}
