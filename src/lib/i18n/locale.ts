export type Locale = "tl" | "en";

export const DEFAULT_LOCALE: Locale = "tl";

export const LOCALE_COOKIE = "sarihub_lang";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "tl" || value === "en";
}

/**
 * The admin console keeps its own language choice, English by default, so
 * the office can work in English while owners and crew stay on Tagalog.
 */
export type LocaleArea = "app" | "admin";

export const ADMIN_LOCALE_COOKIE = "sarihub_admin_lang";

/** Sent by the tRPC client from /admin pages so server messages match the console's language. */
export const LOCALE_AREA_HEADER = "x-sarihub-area";

const AREA_DEFAULTS: Record<LocaleArea, Locale> = { app: DEFAULT_LOCALE, admin: "en" };

export function localeCookieFor(area: LocaleArea): string {
  return area === "admin" ? ADMIN_LOCALE_COOKIE : LOCALE_COOKIE;
}

export function resolveLocale(
  area: LocaleArea,
  cookies: { app?: string | null; admin?: string | null },
): Locale {
  const saved = area === "admin" ? cookies.admin : cookies.app;
  return isLocale(saved) ? saved : AREA_DEFAULTS[area];
}
