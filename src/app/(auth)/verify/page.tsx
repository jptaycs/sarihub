import Link from "next/link";
import { redirect } from "next/navigation";

import { formatPhone } from "~/lib/format";

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-6 pb-10 pt-6">
      <div className="mb-7">
        <Link
          href="/login"
          aria-label="Bumalik"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hair bg-white"
        >
          <ChevronLeft />
        </Link>
      </div>

      <h1
        className="text-[28px] font-medium leading-[1.15] text-ink"
        style={{ letterSpacing: "-0.015em" }}
      >
        Ipasok po ang code
      </h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-ink-2">
        Pinadalhan namin ang <span className="font-medium text-ink">+63 {display.slice(1)}</span>{" "}
        ng 6-digit code.
      </p>

      <OtpCodeForm phoneE164={e164} />

      <p className="mx-auto mt-8 text-center text-[13px] leading-[1.5] text-ink-2">
        May problema po? Tawagan: <span className="font-medium text-ink">0917-555-0188</span>
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
