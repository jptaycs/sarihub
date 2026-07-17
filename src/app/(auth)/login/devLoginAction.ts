"use server";

import { redirect } from "next/navigation";

import { startPhoneOtp, verifyPhoneOtp } from "~/server/services/auth";

/**
 * Local-dev-only shortcut: signs in as one of the Supabase project's
 * `sms_test_otp` numbers (Authentication → Sign In / Providers → Phone) so
 * nobody has to hand-type a phone + OTP while building. Update these two
 * pairs if the test-OTP config on the project ever changes.
 */
const DEV_ACCOUNTS = {
  owner: { phone: "9171234567", otp: "123456" },
  staff: { phone: "9179998888", otp: "654321" },
} as const;

export type DevAccount = keyof typeof DEV_ACCOUNTS;
export type DevLoginState = { error?: string } | null;

export async function devLoginAction(
  _prev: DevLoginState,
  formData: FormData,
): Promise<DevLoginState> {
  // Belt-and-suspenders: the button that calls this only renders outside
  // production, but the action itself must never work in production either.
  if (process.env.NODE_ENV === "production") {
    return { error: "Dev login is not available." };
  }

  const account = formData.get("account");
  if (account !== "owner" && account !== "staff") {
    return { error: "Unknown dev account." };
  }
  const { phone, otp } = DEV_ACCOUNTS[account];

  const started = await startPhoneOtp(phone);
  if (!started.ok) {
    return { error: started.message };
  }
  const verified = await verifyPhoneOtp(started.phoneE164, otp);
  if (!verified.ok) {
    return { error: verified.message };
  }
  redirect("/home");
}
