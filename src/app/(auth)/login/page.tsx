import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";

import { LanguageSwitcher } from "~/components/ui/LanguageSwitcher";
import { getEnabledOAuthProviders } from "~/lib/auth/oauthSettings";
import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { safeNext } from "~/lib/safeNext";
import { SUPPORT_PHONE } from "~/lib/support";

import { DevLoginButtons } from "./DevLoginButtons";
import { PhoneEntryForm } from "./PhoneEntryForm";
import { SocialSignIn } from "./SocialSignIn";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const dict = getDictionary(await getServerLocale());
  const params = await searchParams;
  const next = safeNext(params.next);
  const providers = await getEnabledOAuthProviders();
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

      <SocialSignIn providers={providers} next={next} failed={params.error === "oauth"} />

      <div className="mt-6 flex flex-col items-center gap-3 text-[15px] text-ink-2">
        <Link
          href={`/login/password?next=${encodeURIComponent(next)}` as Route}
          className="font-semibold text-ink underline underline-offset-2"
        >
          {dict.login.usePassword}
        </Link>
        <p>
          {dict.login.noAccount}{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}` as Route}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {dict.login.createAccount}
          </Link>
        </p>
      </div>

      {process.env.NODE_ENV !== "production" && <DevLoginButtons next={next} />}

      <p className="mx-auto mt-auto pt-10 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.login.helpLine}{" "}
        <a href={`tel:${SUPPORT_PHONE.tel}`} className="font-semibold text-ink">
          {SUPPORT_PHONE.display}
        </a>
      </p>
    </main>
  );
}
