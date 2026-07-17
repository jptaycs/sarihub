import { redirect } from "next/navigation";

import { activeStaffForRequest } from "~/server/services/auth";

/**
 * Distributor-staff area. Owners never see these screens — anyone without an
 * active buyer/admin staff row is sent back to the owner home.
 */
export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (!staffRow || (staffRow.role !== "buyer" && staffRow.role !== "admin")) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-10 pt-2">
      {children}
    </main>
  );
}
