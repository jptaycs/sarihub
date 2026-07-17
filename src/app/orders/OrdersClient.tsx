"use client";

import Link from "next/link";

import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import { trpc } from "~/lib/trpc/client";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: "Draft", className: "bg-surface-2 text-ink-2" },
  submitted: { text: "Naipasa", className: "bg-warning-soft text-warning" },
  packed: { text: "Nakahanda", className: "bg-warning-soft text-warning" },
  in_transit: { text: "Papunta na", className: "bg-warning-soft text-warning" },
  delivered: { text: "Naihatid", className: "bg-success-soft text-success" },
  settled: { text: "Bayad na", className: "bg-success-soft text-success" },
  cancelled: { text: "Kanselado", className: "bg-surface-2 text-danger" },
};

export function OrdersClient() {
  const ordersQuery = trpc.orders.list.useQuery();

  if (ordersQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">Nilo-load po…</p>;
  }
  if (ordersQuery.error) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">
        May problema sa koneksyon. I-refresh po ang app.
      </p>
    );
  }

  const orders = ordersQuery.data ?? [];
  if (orders.length === 0) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[13px] text-ink-2">Wala pa po kayong order.</p>
        <Link href="/home" className="mt-2 inline-block text-[14px] font-medium text-action">
          Mag-order na →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {orders.map((order) => {
        const status = STATUS_LABEL[order.status] ?? STATUS_LABEL.draft!;
        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="hair-b block py-3.5 active:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium">
                Dating: {formatManilaDate(order.deliverOn)}
              </span>
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 text-xs font-medium",
                  status.className,
                )}
              >
                {status.text}
              </span>
            </div>
            <div className="mt-1.5 text-[13px] text-ink-2">
              {order.items
                .map((i) => `${i.nameTl} ${i.unitLabelTl} ×${i.quantity}`)
                .join(" · ")}
            </div>
            <div className="price mt-1.5 text-[14px] font-medium">
              {formatPeso(order.totalCentavos)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
