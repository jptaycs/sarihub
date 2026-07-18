"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { formatManila, formatManilaDate, formatManilaTime } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
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
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (orderQuery.error || !orderQuery.data) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[13px] text-ink-2">{dict.orderDetail.notFound}</p>
        <Link href="/orders" className="mt-2 inline-block text-[14px] font-medium text-action">
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
        <span className="text-[14px] font-medium">
          {interpolate(dict.common.deliverOnLabel, { date: formatManilaDate(order.deliverOn) })}
        </span>
        {isCancelled && (
          <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-danger">
            {dict.orders.statusCancelled}
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="mt-3 rounded-md bg-surface-2 px-3.5 py-3 text-[13px]">
          <div className="font-medium text-danger">{dict.orderDetail.cancelledBanner}</div>
          {order.cancelledAt && (
            <div className="mt-0.5 text-ink-2">
              {formatManila(order.cancelledAt, "d MMM, h:mm a")}
              {order.cancelledReason ? ` · ${order.cancelledReason}` : ""}
            </div>
          )}
          <div className="mt-1 text-ink-2">{dict.orderDetail.refunded}</div>
        </div>
      ) : (
        <ol className="mt-3">
          {steps.map((step, i) => {
            const at = order[step.key];
            const done = at != null;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 items-center justify-center rounded-pill text-[11px]",
                      done ? "bg-success-soft text-success" : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {done ? "✓" : "·"}
                  </span>
                  {i < steps.length - 1 && (
                    <span className={cn("w-px flex-1", done ? "bg-success" : "bg-hair-strong")} />
                  )}
                </div>
                <div className="pb-4">
                  <div className={cn("text-[14px] font-medium", !done && "text-ink-3")}>
                    {step.label}
                  </div>
                  {done && (
                    <div className="text-xs text-ink-2">
                      {formatManila(at, "d MMM")} · {formatManilaTime(at)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <h2 className="hair-t mt-2 pt-4 text-[15px] font-medium">{dict.orderDetail.itemsHeading}</h2>
      <div className="mt-1">
        {activeItems.map((item) => (
          <div key={item.id} className="hair-b flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <div className="text-[14px] font-medium">
                {item.nameTl} <span className="font-normal text-ink-2">· {item.unitLabelTl}</span>
              </div>
              <div className="price text-xs text-ink-2">
                {item.quantity} × {formatPeso(item.lockedUnitPriceCentavos)}
              </div>
            </div>
            <span className="price text-[14px] font-medium">
              {formatPeso(item.lockedTotalCentavos)}
            </span>
          </div>
        ))}
        {cancelledItems.map((item) => (
          <div key={item.id} className="hair-b flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <div className="text-[14px] text-ink-3 line-through">
                {item.nameTl} · {item.unitLabelTl} ×{item.quantity}
              </div>
              <div className="text-xs text-warning">{dict.orderDetail.cancelledItemNote}</div>
            </div>
            <span className="price text-[14px] text-ink-3 line-through">
              {formatPeso(item.lockedTotalCentavos)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-3">
        <span className="text-[14px] text-ink-2">{dict.common.sukiTotalLabel}</span>
        <span className="price text-lg font-semibold">{formatPeso(order.totalCentavos)}</span>
      </div>

      <p className="text-xs text-ink-3">{dict.orderDetail.priceLockNote}</p>

      {order.cancellable && (
        <div className="hair-t mt-4 pt-4">
          {!confirmingCancel ? (
            <>
              <Button variant="danger" block onClick={() => setConfirmingCancel(true)}>
                {dict.orderDetail.cancelButton}
              </Button>
              <p className="mt-2 text-center text-xs text-ink-3">
                {interpolate(dict.orderDetail.cancelUntil, {
                  time: formatManilaTime(order.cancelUntil),
                  date: formatManila(order.cancelUntil, "d MMM"),
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-[14px] font-medium">
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
