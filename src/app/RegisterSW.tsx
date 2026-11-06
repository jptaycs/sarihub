"use client";

import { useEffect } from "react";

/**
 * Registers the offline-shell service worker. Renders nothing.
 * Production only: sw.js serves /_next/static cache-first, which is safe for
 * production's content-hashed file names but pins stale chunks under
 * `next dev`, whose chunk URLs never change.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}
