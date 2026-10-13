import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";

import { LanguageSwitcher } from "~/components/ui/LanguageSwitcher";
import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { safeNext } from "~/lib/safeNext";

import { DevLoginButtons } from "./DevLoginButtons";
import { PhoneEntryForm } from "./PhoneEntryForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dict = getDictionary(await getServerLocale());
  const next = safeNext((await searchParams).next);
  const fromCheckout = next.includes("checkout=1");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col bg-surface px-6 pb-10 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/home"
          aria-label={dict.common.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 transition-transform active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.25} />
        </Link>
        <LanguageSwitcher />
      </div>

      <Logo size={64} />

      {fromCheckout && (
        <div className="mt-6 flex items-center gap-3 rounded-md bg-surface-2 px-4 py-3">
          <ShoppingBag size={20} strokeWidth={2} className="shrink-0" />
          <p className="text-[14px] font-medium leading-snug">{dict.guest.loginCheckoutBanner}</p>
        </div>
      )}

      <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
        {dict.login.title}
      </h1>
      <p className="mt-3 text-[16px] leading-[1.5] text-ink-2">{dict.login.subtitle}</p>

      <PhoneEntryForm next={next} />

      {process.env.NODE_ENV !== "production" && <DevLoginButtons next={next} />}

      <p className="mx-auto mt-auto pt-10 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.login.helpLine} <span className="font-semibold text-ink">0917-555-0188</span>
      </p>
    </main>
  );
}
