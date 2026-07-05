import Link from "next/link";

import { OrdersClient } from "./OrdersClient";

export default function OrdersPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      <header className="flex items-center justify-between py-3">
        <h1 className="text-[22px] font-medium leading-[1.15] tracking-tight">Mga order</h1>
        <Link href="/home" className="text-[13px] font-medium text-action">
          ← Balik sa tindahan
        </Link>
      </header>
      <OrdersClient />
    </main>
  );
}
