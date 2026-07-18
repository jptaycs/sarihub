export type Locale = "tl" | "en";

export const DEFAULT_LOCALE: Locale = "tl";

export const LOCALE_COOKIE = "sarihub_lang";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "tl" || value === "en";
}
