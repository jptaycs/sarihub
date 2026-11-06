import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { LanguageSwitcher } from "~/components/ui/LanguageSwitcher";
import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { safeNext } from "~/lib/safeNext";
import { SUPPORT_PHONE } from "~/lib/support";

import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dict = getDictionary(await getServerLocale());
  const next = safeNext((await searchParams).next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col bg-surface px-6 pb-10 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={`/login?next=${encodeURIComponent(next)}` as Route}
          aria-label={dict.common.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 transition-transform active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.25} />
        </Link>
        <LanguageSwitcher />
      </div>

      <Logo size={64} />

      <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
        {dict.signUp.title}
      </h1>
      <p className="mt-3 text-[16px] leading-[1.5] text-ink-2">{dict.signUp.subtitle}</p>

      <SignUpForm next={next} />

      <p className="mt-6 text-center text-[15px] text-ink-2">
        {dict.signUp.haveAccount}{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}` as Route} className="font-semibold text-ink underline underline-offset-2">
          {dict.signUp.signIn}
        </Link>
      </p>

      <p className="mx-auto mt-auto pt-10 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.login.helpLine}{" "}
        <a href={`tel:${SUPPORT_PHONE.tel}`} className="font-semibold text-ink">
          {SUPPORT_PHONE.display}
        </a>
      </p>
    </main>
  );
}
