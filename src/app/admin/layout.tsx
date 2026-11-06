import { redirect } from "next/navigation";

import { LanguageProvider } from "~/lib/i18n/LanguageProvider";
import { ADMIN_LOCALE_COOKIE } from "~/lib/i18n/locale";
import { getAreaLocale } from "~/lib/i18n/server";
import { activeStaffForRequest } from "~/server/services/auth";
import { AdminSidebar, AdminTabBar, AdminTopBar } from "./AdminNav";

/**
 * Admin area: laptop-first console that also works one-handed on a phone.
 * Admin staff only.
 *
 * - ≥ lg: persistent left sidebar (NavigationSplitView pattern) + wide content.
 * - < lg: sticky frosted top bar + fixed bottom tab bar, like the owner app.
 *
 * Language: its own choice (admin cookie), English unless switched — see
 * `resolveLocale` in ~/lib/i18n/locale.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || staffRow.role !== "admin") {
    redirect("/home");
  }

  const locale = await getAreaLocale("admin");

  return (
    <LanguageProvider initialLocale={locale} cookieName={ADMIN_LOCALE_COOKIE}>
      <div lang={locale} className="min-h-dvh lg:flex">
        <AdminSidebar staffName={staffRow.name} />
        <div className="min-w-0 flex-1">
          <AdminTopBar />
          <main className="mx-auto w-full max-w-[1280px] px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-4 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
            {children}
          </main>
        </div>
        <AdminTabBar staffName={staffRow.name} />
      </div>
    </LanguageProvider>
  );
}
