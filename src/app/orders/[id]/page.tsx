import Link from "next/link";

import { OrderDetailClient } from "./OrderDetailClient";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      <header className="flex items-center justify-between py-3">
        <h1 className="text-[22px] font-medium leading-[1.15] tracking-tight">Order</h1>
        <Link href="/orders" className="text-[13px] font-medium text-action">
          ← Mga order
        </Link>
      </header>
      <OrderDetailClient orderId={id} />
    </main>
  );
}
