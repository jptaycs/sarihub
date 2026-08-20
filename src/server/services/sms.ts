import "server-only";

import { env } from "~/lib/env";

const SEMAPHORE_URL = "https://api.semaphore.co/api/v4/messages";

export type SendSmsResult = { ok: true } | { ok: false; error: string };

/**
 * Sends one SMS via Semaphore. Fails closed with no network call when
 * SEMAPHORE_API_KEY isn't configured — this is what lets the notification
 * queue ship and sit dormant: every queued row retries on schedule and
 * starts actually sending the instant a real key lands in .env, with zero
 * code changes at that point.
 */
export async function sendSms(phoneE164: string, message: string): Promise<SendSmsResult> {
  const apiKey = env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "SEMAPHORE_API_KEY not configured" };
  }

  try {
    const res = await fetch(SEMAPHORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ apikey: apiKey, number: phoneE164, message }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Semaphore ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
