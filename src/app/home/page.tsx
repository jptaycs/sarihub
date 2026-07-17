import { redirect } from "next/navigation";

import { activeStaffForRequest } from "~/server/services/auth";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  // Staff sign in through the same phone-OTP door but never shop.
  const staffRow = await activeStaffForRequest();
  if (staffRow?.role === "admin") {
    redirect("/admin/orders");
  }
  if (staffRow?.role === "buyer") {
    redirect("/buyer/prices");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      <HomeClient />
    </main>
  );
}
