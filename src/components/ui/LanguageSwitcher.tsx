"use client";

import { useLocale } from "~/lib/i18n/LanguageProvider";
import { cn } from "~/lib/cn";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language / Wika"
      className="inline-flex gap-0.5 rounded-pill bg-surface-2 p-1"
    >
      <LangButton active={locale === "tl"} onClick={() => setLocale("tl")}>
        Tagalog
      </LangButton>
      <LangButton active={locale === "en"} onClick={() => setLocale("en")}>
        English
      </LangButton>
    </div>
  );
}

function LangButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        "h-9 rounded-pill px-4 text-[14px] font-semibold transition-all",
        props.active ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-ink-2",
      )}
    >
      {props.children}
    </button>
  );
}
