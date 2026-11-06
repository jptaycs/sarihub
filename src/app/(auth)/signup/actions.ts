"use server";

import { redirect } from "next/navigation";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { fieldError } from "~/lib/i18n/validation";
import { safeNext } from "~/lib/safeNext";
import { signUpInput } from "~/lib/schemas/signUp";
import { signUpWithPassword } from "~/server/services/auth";

export type SignUpField = "fullName" | "storeName" | "phone" | "addressLine" | "password" | "confirmPassword";

export type SignUpState = {
  error?: string;
  fieldErrors?: Partial<Record<SignUpField, string>>;
  /** Echoed back so a failed submit doesn't wipe the form (never the passwords). */
  values?: Partial<Record<"fullName" | "storeName" | "phone" | "addressLine", string>>;
} | null;

export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    storeName: String(formData.get("storeName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const values = {
    fullName: raw.fullName,
    storeName: raw.storeName,
    phone: raw.phone,
    addressLine: raw.addressLine,
  };

  const parsed = signUpInput.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SignUpField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as SignUpField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = fieldError(dict, issue.message);
    }
    return { fieldErrors, values };
  }

  const result = await signUpWithPassword(parsed.data, locale);
  if (!result.ok) return { error: result.message, values };
  redirect(safeNext(formData.get("next")));
}
