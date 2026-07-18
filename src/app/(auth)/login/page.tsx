import Link from "next/link";

import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

import { DevLoginButtons } from "./DevLoginButtons";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PhoneEntryForm } from "./PhoneEntryForm";

export default async function LoginPage() {
  const dict = getDictionary(await getServerLocale());

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-6 pb-10 pt-6">
      <div className="mb-7 flex items-center justify-between">
        <Link
          href="/"
          aria-label={dict.common.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hair bg-white"
        >
          <ChevronLeft />
        </Link>
        <LanguageSwitcher />
      </div>

      <Logo />

      <h1
        className="mt-7 text-[28px] font-medium leading-[1.15] text-ink"
        style={{ letterSpacing: "-0.015em" }}
      >
        {dict.login.title}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-ink-2">{dict.login.subtitle}</p>

      <PhoneEntryForm />

      {process.env.NODE_ENV !== "production" && <DevLoginButtons />}

      <p className="mx-auto mt-8 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.login.helpLine} <span className="font-medium text-ink">0917-555-0188</span>
      </p>
    </main>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
