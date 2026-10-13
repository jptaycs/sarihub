"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Lock } from "lucide-react";

import { Button } from "~/components/ui/Button";
import { Card, CardRow } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManila, formatManilaDate, formatManilaTime } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";

function timelineSteps(dict: Dictionary) {
  return [
    { key: "submittedAt", label: dict.orders.statusSubmitted },
    { key: "packedAt", label: dict.orders.statusPacked },
    { key: "inTransitAt", label: dict.orders.statusInTransit },
    { key: "deliveredAt", label: dict.orders.statusDelivered },
  ] as const;
}

export function OrderDetailClient(props: { orderId: string }) {
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const orderQuery = trpc.orders.get.useQuery(
    { orderId: props.orderId },
    { retry: false },
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancel = trpc.orders.cancel.useMutation({
    onSettled() {
      // Success or a lost race — either way the order and tab moved.
      void utils.orders.get.invalidate({ orderId: props.orderId });
      void utils.orders.list.invalidate();
      void utils.store.me.invalidate();
    },
  });

  if (orderQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface" />;
  }
  if (orderQuery.error || !orderQuery.data) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[15px] text-ink-2">{dict.orderDetail.notFound}</p>
        <Link href="/orders" className="mt-3 inline-block text-[15px] font-semibold text-ink">
          {dict.orderDetail.backLink}
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const isCancelled = order.status === "cancelled";
  const activeItems = order.items.filter((i) => !i.cancelledItem);
  const cancelledItems = order.items.filter((i) => i.cancelledItem);
  const steps = timelineSteps(dict);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-semibold">
          {interpolate(dict.common.deliverOnLabel, { date: formatManilaDate(order.deliverOn, locale) })}
        </span>
        {isCancelled && (
          <span className="rounded-pill bg-danger-soft px-3 py-1 text-[12px] font-semibold text-danger">
            {dict.orders.statusCancelled}
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3.5 text-[14px]">
          <div className="font-medium text-danger">{dict.orderDetail.cancelledBanner}</div>
          {order.cancelledAt && (
            <div className="mt-0.5 text-ink-2">
              {formatManila(order.cancelledAt, "d MMM, h:mm a", locale)}
              {order.cancelledReason ? ` · ${order.cancelledReason}` : ""}
            </div>
          )}
          <div className="mt-1 text-ink-2">{dict.orderDetail.refunded}</div>
        </div>
      ) : (
        <Card className="mt-4 px-4 pb-1 pt-4">
          <ol>
            {steps.map((step, i) => {
              const at = order[step.key];
              const done = at != null;
              return (
                <li key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full",
                        done ? "bg-action text-white" : "border-2 border-hair-strong bg-surface",
                      )}
                    >
                      {done && <Check size={15} strokeWidth={3} />}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={cn("w-0.5 flex-1", done ? "bg-action" : "bg-hair")} />
                    )}
                  </div>
                  <div className="pb-5 pt-0.5">
                    <div className={cn("text-[16px] font-semibold", !done && "text-ink-3")}>
                      {step.label}
                    </div>
                    {done && (
                      <div className="text-[13px] text-ink-2">
                        {formatManila(at, "d MMM", locale)} · {formatManilaTime(at, locale)}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <p className="section-label mb-2 mt-6">{dict.orderDetail.itemsHeading}</p>
      <Card>
        {activeItems.map((item) => (
          <CardRow key={item.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">
                {item.nameTl} <span className="font-normal text-ink-2">· {item.unitLabelTl}</span>
              </div>
              <div className="price text-[13px] text-ink-2">
                {item.quantity} × {formatPeso(item.lockedUnitPriceCentavos)}
              </div>
            </div>
            <span className="price text-[15px] font-semibold">
              {formatPeso(item.lockedTotalCentavos)}
            </span>
          </CardRow>
        ))}
        {cancelledItems.map((item) => (
          <CardRow key={item.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[14px] text-ink-3 line-through">
                {item.nameTl} · {item.unitLabelTl} ×{item.quantity}
              </div>
              <div className="text-xs text-warning">{dict.orderDetail.cancelledItemNote}</div>
            </div>
            <span className="price text-[14px] text-ink-3 line-through">
              {formatPeso(item.lockedTotalCentavos)}
            </span>
          </CardRow>
        ))}
      </Card>

      <div className="flex items-center justify-between px-1 py-4">
        <span className="text-[15px] text-ink-2">{dict.common.sukiTotalLabel}</span>
        <span className="price text-[24px] font-bold tracking-tight">
          {formatPeso(order.totalCentavos)}
        </span>
      </div>

      <div className="flex gap-3 rounded-md bg-surface px-4 py-3 text-[13px] leading-snug text-ink-2 shadow-[var(--shadow-card)]">
        <Lock size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-ink" />
        {dict.orderDetail.priceLockNote}
      </div>

      {order.cancellable && (
        <div className="mt-6">
          {!confirmingCancel ? (
            <>
              <Button variant="danger" size="lg" block onClick={() => setConfirmingCancel(true)}>
                {dict.orderDetail.cancelButton}
              </Button>
              <p className="mt-2 text-center text-[13px] text-ink-3">
                {interpolate(dict.orderDetail.cancelUntil, {
                  time: formatManilaTime(order.cancelUntil, locale),
                  date: formatManila(order.cancelUntil, "d MMM", locale),
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-[16px] font-semibold">
                {dict.orderDetail.confirmCancel}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  block
                  disabled={cancel.isPending}
                  onClick={() => setConfirmingCancel(false)}
                >
                  {dict.orderDetail.keepOrder}
                </Button>
                <Button
                  variant="danger"
                  block
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ orderId: props.orderId })}
                >
                  {cancel.isPending ? dict.orderDetail.cancelling : dict.orderDetail.yesCancel}
                </Button>
              </div>
            </>
          )}
          {cancel.error && (
            <p className="mt-3 text-center text-[13px] font-medium text-danger">
              {cancel.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
