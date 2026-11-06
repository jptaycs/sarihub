"use server";

import { redirect } from "next/navigation";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { fieldError } from "~/lib/i18n/validation";
import { parsePhPhone } from "~/lib/format";
import { safeNext } from "~/lib/safeNext";
import { passwordSignInInput } from "~/lib/schemas/signUp";
import { signInWithPhonePassword } from "~/server/services/auth";

export type PasswordSignInState = { error?: string; phone?: string } | null;

export async function passwordSignInAction(
  _prev: PasswordSignInState,
  formData: FormData,
): Promise<PasswordSignInState> {
  const locale = await getServerLocale();
  const phone = String(formData.get("phone") ?? "");
  const parsed = passwordSignInInput.safeParse({ phone, password: formData.get("password") ?? "" });
  if (!parsed.success) {
    return { error: fieldError(getDictionary(locale), parsed.error.issues[0]?.message), phone };
  }
  const result = await signInWithPhonePassword(
    parsePhPhone(parsed.data.phone) as string,
    parsed.data.password,
    locale,
  );
  if (!result.ok) return { error: result.message, phone };
  redirect(safeNext(formData.get("next")));
}
