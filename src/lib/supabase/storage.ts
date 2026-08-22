"use client";

import { createSupabaseBrowser } from "./browser";

/**
 * Patchy (not dead) 4G can stall a request far longer than it takes to fail
 * outright — the failure mode this upload actually needs to survive.
 */
const UPLOAD_TIMEOUT_MS = 15_000;

/**
 * Upload a proof-of-delivery blob to the private `pod` bucket.
 * Returns the object path to store on the order, or null when the upload
 * failed or stalled — POD is best-effort, the delivery handoff must never
 * block on 4G. supabase-js's storage `upload()` takes no abort signal, so a
 * stalled request is left to resolve on its own in the background; the
 * caller has already moved on by the time (if ever) it does.
 */
export async function uploadPod(path: string, blob: Blob): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowser();
    const upload = supabase.storage.from("pod").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "application/octet-stream",
    });
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), UPLOAD_TIMEOUT_MS),
    );
    const result = await Promise.race([upload, timeout]);
    if (result === "timeout" || result.error) return null;
    return path;
  } catch {
    return null;
  }
}
