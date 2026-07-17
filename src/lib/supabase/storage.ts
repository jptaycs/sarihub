"use client";

import { createSupabaseBrowser } from "./browser";

/**
 * Upload a proof-of-delivery blob to the private `pod` bucket.
 * Returns the object path to store on the order, or null when the upload
 * failed — POD is best-effort, the delivery handoff must never block on 4G.
 */
export async function uploadPod(path: string, blob: Blob): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.storage.from("pod").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "application/octet-stream",
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}
