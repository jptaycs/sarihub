"use client";

import { useEffect } from "react";

/** Registers the offline-shell service worker. Renders nothing. */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}
