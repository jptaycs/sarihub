"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { formatManila, formatManilaDate, formatManilaTime } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import { trpc } from "~/lib/trpc/client";

const TIMELINE_STEPS = [
  { key: "submittedAt", label: "Naipasa" },
  { key: "packedAt", label: "Nakahanda" },
  { key: "inTransitAt", label: "Papunta na" },
  { key: "deliveredAt", label: "Naihatid" },
] as const;

export function OrderDetailClient(props: { orderId: string }) {
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
    return <p className="pt-8 text-center text-[13px] text-ink-2">Nilo-load po…</p>;
  }
  if (orderQuery.error || !orderQuery.data) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[13px] text-ink-2">Hindi po mahanap ang order na ito.</p>
        <Link href="/orders" className="mt-2 inline-block text-[14px] font-medium text-action">
          Balik sa mga order →
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const isCancelled = order.status === "cancelled";
  const activeItems = order.items.filter((i) => !i.cancelledItem);
  const cancelledItems = order.items.filter((i) => i.cancelledItem);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium">Dating: {formatManilaDate(order.deliverOn)}</span>
        {isCancelled && (
          <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-danger">
            Kanselado
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="mt-3 rounded-md bg-surface-2 px-3.5 py-3 text-[13px]">
          <div className="font-medium text-danger">Kanselado na po ang order na ito.</div>
          {order.cancelledAt && (
            <div className="mt-0.5 text-ink-2">
              {formatManila(order.cancelledAt, "d MMM, h:mm a")}
              {order.cancelledReason ? ` · ${order.cancelledReason}` : ""}
            </div>
          )}
          <div className="mt-1 text-ink-2">Ibinalik na sa suki tab ninyo ang halaga.</div>
        </div>
      ) : (
        <ol className="mt-3">
          {TIMELINE_STEPS.map((step, i) => {
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
                  {i < TIMELINE_STEPS.length - 1 && (
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

      <h2 className="hair-t mt-2 pt-4 text-[15px] font-medium">Mga item</h2>
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
              <div className="text-xs text-warning">Naubos sa palengke — hindi po sinisingil.</div>
            </div>
            <span className="price text-[14px] text-ink-3 line-through">
              {formatPeso(item.lockedTotalCentavos)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-3">
        <span className="text-[14px] text-ink-2">Kabuuan (sa suki tab)</span>
        <span className="price text-lg font-semibold">{formatPeso(order.totalCentavos)}</span>
      </div>

      <p className="text-xs text-ink-3">
        Presyo noong pag-order ang nakalista — hindi na nagbago kahit gumalaw ang presyo sa
        palengke.
      </p>

      {order.cancellable && (
        <div className="hair-t mt-4 pt-4">
          {!confirmingCancel ? (
            <>
              <Button variant="danger" block onClick={() => setConfirmingCancel(true)}>
                Kanselahin ang order
              </Button>
              <p className="mt-2 text-center text-xs text-ink-3">
                Pwede pa pong kanselahin hanggang {formatManilaTime(order.cancelUntil)} sa{" "}
                {formatManila(order.cancelUntil, "d MMM")}.
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-[14px] font-medium">
                Sigurado po ba kayong ikakansela ang order na ito?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  block
                  disabled={cancel.isPending}
                  onClick={() => setConfirmingCancel(false)}
                >
                  Huwag na lang
                </Button>
                <Button
                  variant="danger"
                  block
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ orderId: props.orderId })}
                >
                  {cancel.isPending ? "Kinakansela…" : "Oo, ikansela"}
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
