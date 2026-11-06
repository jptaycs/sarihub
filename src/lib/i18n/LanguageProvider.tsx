"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getDictionary } from "./dictionaries";
import { LOCALE_COOKIE, type Locale } from "./locale";

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

/**
 * Wraps the app with the language chosen on /login (or the Tagalog default).
 * The admin layout nests a second one with the admin cookie (English default).
 * `initialLocale` comes from the server-read cookie so the first client
 * render matches the server render — no hydration mismatch.
 */
export function LanguageProvider(props: {
  initialLocale: Locale;
  /** Which cookie the switcher writes: the app-wide one, or the admin console's own. */
  cookieName?: string;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(props.initialLocale);
  const router = useRouter();

  function setLocale(next: Locale) {
    // A UI preference, not a security boundary — plain cookie write, no round trip.
    document.cookie = `${props.cookieName ?? LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setLocaleState(next);
    // Re-render Server Components (page headers, layout chrome) in the new language.
    router.refresh();
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {props.children}
    </LanguageContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLocale must be used within LanguageProvider");
  return ctx;
}

export function useDictionary() {
  const { locale } = useLocale();
  return useMemo(() => getDictionary(locale), [locale]);
}
