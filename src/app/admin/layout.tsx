import { redirect } from "next/navigation";

import { activeStaffForRequest } from "~/server/services/auth";
import { AdminNav } from "./AdminNav";

/** Admin area: tablet/laptop, well-lit office. Admin staff only. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || staffRow.role !== "admin") {
    redirect("/home");
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1100px] px-6 pb-12 pt-4">
      <header className="flex items-center justify-between py-3">
        <div>
          <h1 className="text-[22px] font-medium leading-[1.15] tracking-tight">SariHub Admin</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">{staffRow.name}</p>
        </div>
        <AdminNav />
      </header>
      {children}
    </main>
  );
}
