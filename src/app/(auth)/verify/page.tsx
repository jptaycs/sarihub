import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { formatPhone } from "~/lib/format";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

import { OtpCodeForm } from "./OtpCodeForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  if (!phone || !/^\+63\d{10}$/.test(phone)) {
    redirect("/login");
  }
  const e164 = phone;
  const display = formatPhone(e164);
  const dict = getDictionary(await getServerLocale());

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-6 pb-10 pt-6">
      <div className="mb-7">
        <Link
          href="/login"
          aria-label={dict.common.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hair bg-white"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </Link>
      </div>

      <h1
        className="text-[28px] font-medium leading-[1.15] text-ink"
        style={{ letterSpacing: "-0.015em" }}
      >
        {dict.verify.title}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-ink-2">
        {dict.verify.subtitlePrefix} <span className="font-medium text-ink">+63 {display.slice(1)}</span>{" "}
        {dict.verify.subtitleSuffix}
      </p>

      <OtpCodeForm phoneE164={e164} />

      <p className="mx-auto mt-8 text-center text-[13px] leading-[1.5] text-ink-2">
        {dict.verify.helpLine} <span className="font-medium text-ink">0917-555-0188</span>
      </p>
    </main>
  );
}
