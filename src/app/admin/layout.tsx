import { redirect } from "next/navigation";

import { activeStaffForRequest } from "~/server/services/auth";
import { AdminNav } from "./AdminNav";

/**
 * Admin area: tablet/laptop, well-lit office. Admin staff only.
 * A persistent left sidebar — the Apple/NavigationSplitView pattern for a
 * tablet/desktop console — replaces the previous top pill-nav bar.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || staffRow.role !== "admin") {
    redirect("/home");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px]">
      <aside className="hair-r flex w-60 shrink-0 flex-col gap-6 px-4 pb-6 pt-6">
        <div className="px-3">
          <h1 className="text-[19px] font-semibold leading-[1.15] tracking-tight">
            SariHub Admin
          </h1>
          <p className="mt-0.5 truncate text-[13px] text-ink-2">{staffRow.name}</p>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1 px-6 pb-12 pt-6 sm:px-8">{children}</main>
    </div>
  );
}
