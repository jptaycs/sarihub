import { redirect } from "next/navigation";

import { OwnerTabBar } from "~/components/ui/OwnerTabBar";
import { activeStaffForRequest, getRequestUser } from "~/server/services/auth";

/**
 * Owner app shell: /home, /orders, /orders/[id]. Staff sign in through the
 * same phone-OTP door but never shop — they're sent to their own area.
 * /home is also the public guest storefront, so the tab bar adapts to
 * signed-out visitors.
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
  if (staffRow?.role === "helper") {
    redirect("/crew");
  }

  const user = await getRequestUser();

  return (
    <>
      {children}
      <OwnerTabBar signedIn={user !== null} />
    </>
  );
}
