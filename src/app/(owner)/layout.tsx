import { redirect } from "next/navigation";

import { OwnerTabBar } from "~/components/ui/OwnerTabBar";
import { activeStaffForRequest } from "~/server/services/auth";

/**
 * Owner app shell: /home, /orders, /orders/[id]. Staff sign in through the
 * same phone-OTP door but never shop — this guard used to be duplicated
 * per-page (only home/page.tsx had it; /orders had none at all). Centralized
 * here, plus the persistent bottom tab bar every page in this group shares.
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const staffRow = await activeStaffForRequest();
  if (staffRow?.role === "admin") {
    redirect("/admin/orders");
  }
  if (staffRow?.role === "buyer") {
    redirect("/buyer/prices");
  }
  if (staffRow?.role === "driver") {
    redirect("/driver");
  }

  return (
    <>
      {children}
      <OwnerTabBar />
    </>
  );
}
