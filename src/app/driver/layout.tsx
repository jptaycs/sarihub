import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleUser } from "lucide-react";

import { Wordmark } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { activeStaffForRequest } from "~/server/services/auth";

/** Driver area: one hand on the wheel, phone in the other. Driver staff only. */
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || (staffRow.role !== "driver" && staffRow.role !== "admin")) {
    redirect("/home");
  }
  const dict = getDictionary(await getServerLocale());

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-4 pb-[max(env(safe-area-inset-bottom),40px)]">
      <header className="glass sticky top-0 z-30 -mx-4 flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)] box-content">
        <Wordmark />
        <Link
          href="/profile"
          aria-label={dict.nav.profileAria}
          className="flex h-tap w-tap items-center justify-center rounded-pill text-ink transition-transform active:scale-95 active:bg-surface-2"
        >
          <CircleUser size={28} strokeWidth={1.6} />
        </Link>
      </header>
      {children}
    </main>
  );
}
