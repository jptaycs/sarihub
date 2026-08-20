import { NextResponse } from "next/server";

import { env } from "~/lib/env";
import { db } from "~/server/db";
import { processNotificationQueue } from "~/server/services/notifications";

// 50-row batch cap in processNotificationQueue × up to ~10s per send (see
// sms.ts's fetch timeout) could approach Vercel's default limit on a large
// backlog — set an explicit budget rather than relying on the platform default.
export const maxDuration = 60;

/**
 * Vercel Cron target (see vercel.json), hit every 5 minutes. Vercel attaches
 * "Authorization: Bearer $CRON_SECRET" to its own scheduled requests once
 * that env var is set — anything else is rejected. Without CRON_SECRET
 * configured, this route refuses every request (fails closed, same posture
 * as sendSms without SEMAPHORE_API_KEY).
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processNotificationQueue(db);
  return NextResponse.json(result);
}
