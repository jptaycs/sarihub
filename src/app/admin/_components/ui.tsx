"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

/** Shared admin primitives. `_components` is a private folder — not a route. */

/** Large-title page header with an optional trailing action cluster. */
export function PageHeader(props: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="title-large text-[28px] lg:text-[32px]">{props.title}</h1>
        {props.subtitle && <div className="mt-1 text-[15px] text-ink-2">{props.subtitle}</div>}
      </div>
      {props.actions && <div className="flex flex-wrap gap-2">{props.actions}</div>}
    </header>
  );
}

export function LoadingState() {
  const dict = useDictionary();
  return (
    <div className="flex flex-col gap-3 pt-2" aria-busy>
      <div className="h-9 w-48 animate-pulse rounded-md bg-surface-2" />
      <div className="h-24 animate-pulse rounded-lg bg-surface" />
      <div className="h-24 animate-pulse rounded-lg bg-surface" />
      <span className="sr-only">{dict.common.loading}</span>
    </div>
  );
}

export function ErrorState() {
  const dict = useDictionary();
  return (
    <p className="rounded-lg bg-danger-soft px-4 py-4 text-center text-[14px] font-medium text-danger">
      {dict.common.connectionError}
    </p>
  );
}

export function EmptyState(props: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-surface px-4 py-10 text-center text-[15px] text-ink-2 shadow-[var(--shadow-card)]">
      {props.children}
    </p>
  );
}

/** Labelled form field. */
export function Field(props: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={props.className}>
      <label className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2">{props.label}</label>
      {props.children}
      {props.error && <p className="mt-1 px-1 text-xs font-medium text-danger">{props.error}</p>}
    </div>
  );
}

/** Matches `~/components/ui/Input` so native selects sit in the same visual family. */
export const selectClass =
  "h-[52px] w-full appearance-none rounded-md border border-transparent bg-surface-2 bg-[length:16px] bg-[right_16px_center] bg-no-repeat px-4 pr-10 text-base font-medium text-ink outline-none transition-[border-color,background-color] focus:border-action focus:bg-surface";

/** Inline chevron so the appearance-none select still reads as a picker. */
export const selectStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

/** ₱-prefixed amount box wrapper, same family as Input. */
export const pesoBoxClass =
  "flex h-[52px] items-center gap-1.5 rounded-md border border-transparent bg-surface-2 px-4 transition-[border-color,background-color] focus-within:border-action focus-within:bg-surface";

/** Checkbox row with a 44px+ tap area. */
export function CheckRow(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-md bg-surface-2 px-4 text-[15px] font-medium">
      {props.children}
      {props.label}
    </label>
  );
}
export const checkboxClass = "h-5 w-5 shrink-0 accent-black";

/**
 * Modal surface: a bottom sheet on phones, a centred dialog on desktop.
 * Closes on backdrop tap or Escape.
 */
export function AdminSheet(props: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
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
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center lg:p-6"
      role="dialog"
      aria-modal
      aria-label={props.title}
    >
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div
        className={cn(
          "animate-sheet-up lg:animate-pop-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-surface shadow-[var(--shadow-float)] lg:max-h-[88dvh] lg:rounded-xl",
          props.wide ? "lg:max-w-[720px]" : "lg:max-w-[560px]",
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-pill bg-hair-strong lg:hidden" />
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 lg:px-6 lg:pt-5">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold tracking-tight">{props.title}</h2>
            {props.subtitle && <p className="mt-1 text-[14px] text-ink-2">{props.subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.common.closeAria}
            className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition-colors hover:bg-hair"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] lg:px-6 lg:pb-6">
          {props.children}
        </div>
      </div>
    </div>
  );
}

/** Sticky form footer actions: full-width on phones, right-aligned on desktop. */
export function FormActions(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
