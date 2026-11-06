export type OtpSendFailure = "rate_limited" | "unregistered_number" | "send_failed";

/**
 * Sorts a Supabase `signInWithOtp` error into what the person should be told.
 * With no SMS provider configured (see AGENTS.md: no paid APIs), Supabase can
 * only "send" to its test-OTP numbers and answers every other number with
 * "Unable to get SMS provider" — retrying never helps, so say the number isn't
 * registered instead of "try again".
 */
export function classifyOtpSendError(error: {
  status?: number;
  message: string;
}): OtpSendFailure {
  if (error.status === 429) return "rate_limited";
  if (/sms provider/i.test(error.message)) return "unregistered_number";
  return "send_failed";
}
