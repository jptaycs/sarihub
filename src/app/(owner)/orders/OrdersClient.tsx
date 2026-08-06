"use client";

import Link from "next/link";

import { Card } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";

function statusLabel(dict: Dictionary): Record<string, { text: string; className: string }> {
  return {
    draft: { text: dict.orders.statusDraft, className: "bg-surface-2 text-ink-2" },
    submitted: { text: dict.orders.statusSubmitted, className: "bg-warning-soft text-warning" },
    packed: { text: dict.orders.statusPacked, className: "bg-warning-soft text-warning" },
    in_transit: {
      text: dict.orders.statusInTransit,
      className: "bg-warning-soft text-warning",
    },
    delivered: { text: dict.orders.statusDelivered, className: "bg-success-soft text-success" },
    settled: { text: dict.orders.statusSettled, className: "bg-success-soft text-success" },
    cancelled: { text: dict.orders.statusCancelled, className: "bg-surface-2 text-danger" },
  };
}

export function OrdersClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const ordersQuery = trpc.orders.list.useQuery();

  if (ordersQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (ordersQuery.error) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const orders = ordersQuery.data ?? [];
  if (orders.length === 0) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[13px] text-ink-2">{dict.orders.empty}</p>
        <Link href="/home" className="mt-2 inline-block text-[14px] font-medium text-action">
          {dict.orders.startOrdering}
        </Link>
      </div>
    );
  }

  const statuses = statusLabel(dict);

  return (
    <Card>
      {orders.map((order) => {
        const status = statuses[order.status] ?? statuses.draft!;
        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="hair-b block px-4 py-3.5 last:border-b-0 active:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium">
                {interpolate(dict.common.deliverOnLabel, { date: formatManilaDate(order.deliverOn, locale) })}
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
    </Card>
  );
}
