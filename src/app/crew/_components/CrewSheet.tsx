"use client";

import { useEffect } from "react";

import { useDictionary } from "~/lib/i18n/LanguageProvider";

/** Bottom sheet for the crew screens — same shell as the driver's POD sheet. */
export function CrewSheet(props: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dict = useDictionary();
  const { onClose } = props;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="animate-sheet-up relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-xl bg-surface px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 shadow-[var(--shadow-float)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-pill bg-hair-strong" />
        <h2 className="text-[24px] font-bold leading-tight tracking-tight">{props.title}</h2>
        {props.subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{props.subtitle}</p>}
        {props.children}
      </div>
    </div>
  );
}
