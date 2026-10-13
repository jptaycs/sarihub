"use client";

import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";

import { Button } from "~/components/ui/Button";
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
    submitted: { text: dict.orders.statusSubmitted, className: "bg-action text-white" },
    packed: { text: dict.orders.statusPacked, className: "bg-warning-soft text-warning" },
    in_transit: {
      text: dict.orders.statusInTransit,
      className: "bg-warning-soft text-warning",
    },
    delivered: { text: dict.orders.statusDelivered, className: "bg-success-soft text-success" },
    settled: { text: dict.orders.statusSettled, className: "bg-success-soft text-success" },
    cancelled: { text: dict.orders.statusCancelled, className: "bg-danger-soft text-danger" },
  };
}

export function OrdersClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const ordersQuery = trpc.orders.list.useInfiniteQuery(
    {},
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  if (ordersQuery.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }
  if (ordersQuery.error) {
    return (
      <p className="pt-8 text-center text-[14px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const orders = ordersQuery.data?.pages.flatMap((p) => p.orders) ?? [];
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center pt-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
          <Receipt size={34} strokeWidth={1.75} />
        </span>
        <p className="mt-5 text-[17px] font-semibold">{dict.orders.empty}</p>
        <Link
          href="/home"
          className="mt-5 inline-flex h-12 items-center rounded-pill bg-action px-6 text-[16px] font-semibold text-white active:scale-95"
        >
          {dict.orders.startOrdering}
        </Link>
      </div>
    );
  }

  const statuses = statusLabel(dict);

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const status = statuses[order.status] ?? statuses.draft!;
          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-lg bg-surface p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[16px] font-semibold">
                  {interpolate(dict.common.deliverOnLabel, {
                    date: formatManilaDate(order.deliverOn, locale),
                  })}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-pill px-3 py-1 text-[12px] font-semibold",
                    status.className,
                  )}
                >
                  {status.text}
                </span>
              </div>
              <div className="mt-2 line-clamp-2 text-[14px] leading-snug text-ink-2">
                {order.items
                  .map((i) => `${i.nameTl} ${i.unitLabelTl} ×${i.quantity}`)
                  .join(" · ")}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="price text-[18px] font-bold tracking-tight">
                  {formatPeso(order.totalCentavos)}
                </span>
                <ChevronRight size={20} className="text-ink-3" />
              </div>
            </Link>
          );
        })}
      </div>
      {ordersQuery.hasNextPage && (
        <Button
          variant="secondary"
          block
          className="mt-3"
          disabled={ordersQuery.isFetchingNextPage}
          onClick={() => void ordersQuery.fetchNextPage()}
        >
          {ordersQuery.isFetchingNextPage ? dict.orders.loadingMore : dict.orders.loadMore}
        </Button>
      )}
    </>
  );
}
