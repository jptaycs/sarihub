"use client";

import { useLocale } from "~/lib/i18n/LanguageProvider";
import { cn } from "~/lib/cn";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language / Wika"
      className="inline-flex gap-0.5 rounded-pill border border-hair-strong bg-white p-0.5"
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
        "h-8 rounded-pill px-3 text-[13px] font-medium transition-colors",
        props.active ? "bg-action text-white" : "text-ink-2 active:bg-surface-2",
      )}
    >
      {props.children}
    </button>
  );
}
