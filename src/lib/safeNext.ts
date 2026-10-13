import type { Route } from "next";

/**
 * Where to send someone after sign-in. Only same-origin absolute paths are
 * honoured — anything else (protocol-relative `//evil.com`, `/\evil.com`,
 * full URLs, junk) falls back to `/home`, so `?next=` can't become an open
 * redirect.
 */
export function safeNext(raw: unknown, fallback: Route = "/home"): Route {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  if (raw.startsWith("/login") || raw.startsWith("/verify")) return fallback;
  // Validated above as a same-origin path; typed routes can't know it statically.
  return raw as Route;
}

/** `/login?next=<path>` — the sign-in link that brings the user back to `next`. */
export function loginHref(next: string): Route {
  return `/login?next=${encodeURIComponent(next)}` as Route;
}
