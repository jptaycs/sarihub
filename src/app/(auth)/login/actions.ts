"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { startPhoneOtp } from "~/server/services/auth";

const schema = z.object({ phone: z.string().min(1) });

export type LoginActionState = { error?: string } | null;

export async function startOtpAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = schema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: "Ipasok po ang inyong mobile number." };
  }
  const result = await startPhoneOtp(parsed.data.phone);
  if (!result.ok) {
    return { error: result.message };
  }
  redirect(`/verify?phone=${encodeURIComponent(result.phoneE164)}`);
}
