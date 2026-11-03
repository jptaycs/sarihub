import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleUser } from "lucide-react";

import { Wordmark } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { activeStaffForRequest } from "~/server/services/auth";

import { CrewTabBar } from "./CrewNav";

/**
 * Truck crew area (/crew): pack at the depot, keep the truck's stock, sell
 * off the truck, hand over at stops. Phone-first — the helper has wet hands
 * at 5 AM and a bumpy passenger seat after. Helper staff only; admins can
 * cover a shift.
 */
export default async function CrewLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || (staffRow.role !== "helper" && staffRow.role !== "admin")) {
    redirect("/home");
  }
  const dict = getDictionary(await getServerLocale());

  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <header className="glass sticky top-0 z-30 -mx-4 box-content flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
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
      <CrewTabBar />
    </>
  );
}
