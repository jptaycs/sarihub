import Link from "next/link";

import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  const dict = getDictionary(await getServerLocale());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      <header className="flex items-center justify-between py-3">
        <h1 className="text-[22px] font-medium leading-[1.15] tracking-tight">
          {dict.orders.title}
        </h1>
        <Link href="/home" className="text-[13px] font-medium text-action">
          {dict.orders.back}
        </Link>
      </header>
      <OrdersClient />
    </main>
  );
}
