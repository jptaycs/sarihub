"use server";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { fieldError } from "~/lib/i18n/validation";
import { setPasswordInput } from "~/lib/schemas/signUp";
import { setOwnPassword } from "~/server/services/auth";

export type SetPasswordState = { ok?: boolean; error?: string } | null;

export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const locale = await getServerLocale();
  const parsed = setPasswordInput.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return { error: fieldError(getDictionary(locale), parsed.error.issues[0]?.message) };
  }
  const result = await setOwnPassword(parsed.data.password, locale);
  return result.ok ? { ok: true } : { error: result.message };
}
