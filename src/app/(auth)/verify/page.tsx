import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { formatPhone } from "~/lib/format";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { safeNext } from "~/lib/safeNext";

import { OtpCodeForm } from "./OtpCodeForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; next?: string }>;
}) {
  const { phone, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  if (!phone || !/^\+63\d{10}$/.test(phone)) {
    redirect("/login");
  }
  const e164 = phone;
  const display = formatPhone(e164);
  const dict = getDictionary(await getServerLocale());

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col bg-surface px-6 pb-10 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="mb-8">
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          aria-label={dict.common.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 transition-transform active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </Link>
      </div>

      <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
        {dict.verify.title}
      </h1>
      <p className="mt-3 text-[16px] leading-[1.5] text-ink-2">
        {dict.verify.subtitlePrefix} <span className="font-semibold text-ink">+63 {display.slice(1)}</span>{" "}
        {dict.verify.subtitleSuffix}
      </p>

      <OtpCodeForm phoneE164={e164} next={next} />

      <p className="mx-auto mt-auto pt-10 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.verify.helpLine} <span className="font-semibold text-ink">0917-555-0188</span>
      </p>
    </main>
  );
}
