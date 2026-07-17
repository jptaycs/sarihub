import { redirect } from "next/navigation";

import { activeStaffForRequest } from "~/server/services/auth";

/** Driver area: one hand on the wheel, phone in the other. Driver staff only. */
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || (staffRow.role !== "driver" && staffRow.role !== "admin")) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      {children}
    </main>
  );
}
