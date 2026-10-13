/**
 * Where to send someone after sign-in. Only same-origin absolute paths are
 * honoured — anything else (protocol-relative `//evil.com`, `/\evil.com`,
 * full URLs, junk) falls back to `/home`, so `?next=` can't become an open
 * redirect.
 */
export function safeNext(raw: unknown, fallback = "/home"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  if (raw.startsWith("/login") || raw.startsWith("/verify")) return fallback;
  return raw;
}
