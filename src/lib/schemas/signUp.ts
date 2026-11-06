import { z } from "zod";

import { parsePhPhone } from "~/lib/format";
import { validationMessage } from "~/lib/i18n/validation";

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Self sign-up with mobile number + password — no SMS code (the Supabase
 * project auto-confirms phones, and there is no SMS provider). The person
 * gets an account straight away; a store, with its suki limit, only exists
 * once an admin reviews the sign-up on /admin/stores.
 */
export const signUpInput = z
  .object({
    fullName: z.string().trim().min(1, validationMessage("required")).max(120),
    storeName: z.string().trim().min(1, validationMessage("required")).max(120),
    phone: z
      .string()
      .trim()
      .refine((v) => parsePhPhone(v) !== null, validationMessage("phone")),
    addressLine: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : undefined)),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, validationMessage("passwordTooShort"))
      .max(72),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: validationMessage("passwordMismatch"),
      });
    }
  })
  .transform(({ confirmPassword: _confirm, phone, ...rest }) => ({
    ...rest,
    // Refined above, so never null here.
    phoneE164: parsePhPhone(phone) as string,
  }));
export type SignUpInput = z.infer<typeof signUpInput>;

/** Signed-in people (SMS-code or Google accounts) adding or changing a password on /profile. */
export const setPasswordInput = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, validationMessage("passwordTooShort")).max(72),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: validationMessage("passwordMismatch"),
      });
    }
  });

export const passwordSignInInput = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => parsePhPhone(v) !== null, validationMessage("phone")),
  password: z.string().min(1, validationMessage("required")),
});

export type PasswordAuthFailure =
  | "already_registered"
  | "wrong_password"
  | "weak_password"
  | "same_password"
  | "rate_limited"
  | "failed";

/** Sorts a Supabase signUp / signInWithPassword error into what to tell the person. */
export function classifyPasswordAuthError(error: {
  status?: number;
  code?: string;
  message: string;
}): PasswordAuthFailure {
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate_limited";
  if (
    error.code === "phone_exists" ||
    error.code === "user_already_exists" ||
    /already registered/i.test(error.message)
  ) {
    return "already_registered";
  }
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
    return "wrong_password";
  }
  if (error.code === "weak_password") return "weak_password";
  if (error.code === "same_password") return "same_password";
  return "failed";
}
