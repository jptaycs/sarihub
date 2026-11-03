"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Package, Truck } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatPeso } from "~/lib/format";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { CrewPage, StatusText, type CrewRoute } from "../_components/CrewPage";
import { CrewSheet } from "../_components/CrewSheet";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PackQueue = RouterOutputs["crew"]["packQueue"];
type QueueOrder = PackQueue["orders"][number];

export function PackClient() {
  const dict = useDictionary();
  return (
    <CrewPage title={dict.crew.pack.title} progress={(r) => `${r.packedCount}/${r.orderCount}`}>
      {({ routeId, route }) => <PackBoard routeId={routeId} route={route} />}
    </CrewPage>
  );
}

function PackBoard(props: { routeId: string; route: CrewRoute }) {
  const dict = useDictionary();
  const queueQuery = trpc.crew.packQueue.useQuery(
    { routeId: props.routeId },
    { refetchInterval: 60_000 },
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  /** `${orderId}:${index}` for every line the helper has physically picked. */
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [departing, setDeparting] = useState(false);

  const orders = queueQuery.data?.orders ?? [];
  const pending = orders.filter((o) => o.status === "submitted");
  const packedOrders = orders.filter((o) => o.status === "packed");

  // Keep the active card on a still-pending order; fall to the next one
  // after a pack lands (or when the queue first arrives).
  useEffect(() => {
    if (activeId && pending.some((o) => o.id === activeId)) return;
    setActiveId(pending[0]?.id ?? null);
  }, [pending, activeId]);

  if (queueQuery.isLoading) return <StatusText>{dict.common.loading}</StatusText>;
  if (queueQuery.error || !queueQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const { capacityKg, packedKg } = queueQuery.data;
  const active = pending.find((o) => o.id === activeId) ?? null;
  const packedCount = orders.length - pending.length;

  return (
    <div className="mt-5">
      <LoadCard
        route={props.route}
        packedCount={packedCount}
        total={orders.length}
        packedKg={packedKg}
        capacityKg={capacityKg}
      />

      {orders.length === 0 && <StatusText>{dict.crew.pack.empty}</StatusText>}

      {orders.length > 0 && pending.length === 0 && (
        <Card className="mt-3 p-5">
          <p className="flex items-center gap-2 text-[16px] font-semibold text-success">
            <CheckCircle2 size={22} className="shrink-0" />
            {dict.crew.pack.allPacked}
          </p>
          {packedOrders.length > 0 && (
            <Button
              size="lg"
              block
              className="mt-4 h-16 text-[19px]"
              onClick={() => setDeparting(true)}
            >
              <Truck size={22} strokeWidth={2.25} />
              {dict.crew.pack.departButton}
            </Button>
          )}
        </Card>
      )}

      {pending.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {pending.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === activeId}
              onClick={() => setActiveId(o.id)}
              className={cn(
                "flex h-14 shrink-0 flex-col items-start justify-center rounded-md px-4 text-left transition-transform active:scale-[0.97]",
                o.id === activeId
                  ? "bg-action text-white"
                  : "bg-surface text-ink shadow-[var(--shadow-card)]",
              )}
            >
              <span className="tnum text-[11px] font-semibold opacity-70">
                {o.stopOrder !== null
                  ? interpolate(dict.crew.pack.queueStop, { n: o.stopOrder })
                  : dict.crew.pack.noStop}
              </span>
              <span className="max-w-[160px] truncate text-[14px] font-semibold">{o.storeName}</span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <ActiveOrder
          order={active}
          checked={checked}
          onToggle={(key) =>
            setChecked((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
          onLoad={() => setConfirming(true)}
        />
      )}

      {packedOrders.length > 0 && pending.length > 0 && (
        <ul className="mt-4 space-y-2">
          {packedOrders.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-md bg-surface px-4 py-3 text-[15px] opacity-60 shadow-[var(--shadow-card)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <Check size={16} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{o.storeName}</span>
              <span className="text-[13px] font-semibold text-success">{dict.crew.pack.packedBadge}</span>
            </li>
          ))}
        </ul>
      )}

      {confirming && active && (
        <ConfirmPackSheet
          order={active}
          packedKg={packedKg}
          capacityKg={capacityKg}
          onClose={() => setConfirming(false)}
        />
      )}

      {departing && (
        <DepartSheet
          routeId={props.routeId}
          count={packedOrders.length}
          onClose={() => setDeparting(false)}
        />
      )}
    </div>
  );
}

function LoadCard(props: {
  route: CrewRoute;
  packedCount: number;
  total: number;
  packedKg: number;
  capacityKg: number | null;
}) {
  const dict = useDictionary();
  const { capacityKg, packedKg } = props;
  const over = capacityKg !== null && packedKg > capacityKg;
  const pct = capacityKg && capacityKg > 0 ? Math.min((packedKg / capacityKg) * 100, 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-[14px] text-ink-2">
        <Package size={18} strokeWidth={1.75} className="shrink-0" />
        <span className="truncate">
          {props.route.name}
          {props.route.vehiclePlate ? ` · ${props.route.vehiclePlate}` : ""}
        </span>
      </div>
      <div className="tnum mt-2 text-[28px] font-bold leading-tight tracking-tight">
        {interpolate(dict.crew.pack.progress, { packed: props.packedCount, total: props.total })}
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-ink-2">{dict.crew.pack.loadKg}</span>
        <span className={cn("tnum font-semibold", over ? "text-danger" : "text-ink")}>
          {packedKg.toFixed(1)} kg{capacityKg !== null && ` / ${capacityKg} kg`}
        </span>
      </div>
      {capacityKg !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-2">
          <div
            className={cn("h-full rounded-pill transition-[width] duration-500", over ? "bg-danger" : "bg-action")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {over && <p className="mt-2 text-[13px] font-medium text-danger">{dict.crew.pack.overCapacity}</p>}
    </Card>
  );
}

function ActiveOrder(props: {
  order: QueueOrder;
  checked: Set<string>;
  onToggle: (key: string) => void;
  onLoad: () => void;
}) {
  const { order, checked } = props;
  const dict = useDictionary();
  const items = order.items.filter((i) => !i.cancelledItem);
  const checkedCount = items.filter((_, i) => checked.has(`${order.id}:${i}`)).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  return (
    <Card className="mt-3 p-5 ring-2 ring-action">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="section-label">
            {order.stopOrder !== null
              ? interpolate(dict.crew.pack.queueStop, { n: order.stopOrder })
              : dict.crew.pack.noStop}
          </div>
          <div className="mt-1 text-[19px] font-semibold leading-tight tracking-tight">{order.storeName}</div>
          <div className="mt-0.5 text-[14px] text-ink-2">{order.ownerName}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="price text-[17px] font-semibold">{formatPeso(order.totalCentavos)}</div>
          <div className="tnum mt-0.5 text-[12px] text-ink-2">
            {interpolate(dict.crew.pack.itemsChecked, { checked: checkedCount, total: items.length })}
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item, i) => {
          const key = `${order.id}:${i}`;
          const done = checked.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={done}
                aria-label={interpolate(dict.crew.pack.checkAria, { name: item.nameTl, unit: item.unitLabelTl })}
                onClick={() => props.onToggle(key)}
                className={cn(
                  "flex min-h-[60px] w-full items-center gap-3 rounded-md px-3 text-left transition-colors",
                  done ? "bg-success-soft" : "bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
                    done ? "border-success bg-success text-white" : "border-hair-strong bg-surface",
                  )}
                >
                  {done && <Check size={18} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[16px] font-medium", done && "line-through opacity-70")}>
                    {item.nameTl} <span className="text-ink-2">{item.unitLabelTl}</span>
                  </span>
                </span>
                <span className="tnum shrink-0 text-[17px] font-bold">×{item.quantity}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        size="lg"
        block
        className="mt-4 h-16 text-[19px]"
        disabled={!allChecked}
        onClick={props.onLoad}
      >
        <Package size={22} strokeWidth={2.25} />
        {allChecked
          ? dict.crew.pack.loadButton
          : interpolate(dict.crew.pack.shortButton, { count: items.length - checkedCount })}
      </Button>
    </Card>
  );
}

function ConfirmPackSheet(props: {
  order: QueueOrder;
  packedKg: number;
  capacityKg: number | null;
  onClose: () => void;
}) {
  const { order } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const pack = trpc.crew.packOrder.useMutation({
    onSuccess() {
      void utils.crew.packQueue.invalidate();
      void utils.crew.routesToday.invalidate();
      void utils.crew.stock.invalidate();
      props.onClose();
    },
  });
  const after = props.packedKg + order.loadKg;
  const over = props.capacityKg !== null && after > props.capacityKg;

  return (
    <CrewSheet
      title={dict.crew.pack.confirmHeading}
      subtitle={interpolate(dict.crew.pack.confirmBody, { name: order.ownerName })}
      onClose={props.onClose}
    >
      <div className="mt-5 rounded-md bg-surface-2 px-4 py-3 text-[15px]">
        <div className="flex justify-between">
          <span className="text-ink-2">{dict.crew.pack.orderWeight}</span>
          <span className="tnum font-semibold">{order.loadKg.toFixed(1)} kg</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-ink-2">{dict.crew.pack.loadAfter}</span>
          <span className={cn("tnum font-semibold", over && "text-danger")}>
            {after.toFixed(1)} kg{props.capacityKg !== null && ` / ${props.capacityKg} kg`}
          </span>
        </div>
        {over && <p className="mt-3 text-[13px] font-medium text-danger">{dict.crew.pack.overCapacity}</p>}
      </div>

      {pack.error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-danger">
          {pack.error.message}
        </p>
      )}

      <Button
        size="lg"
        block
        className="mt-5 h-16 text-[19px]"
        disabled={pack.isPending}
        onClick={() => pack.mutate({ orderId: order.id })}
      >
        {pack.isPending ? dict.crew.pack.packing : dict.crew.pack.confirmYes}
      </Button>
      <Button variant="ghost" size="lg" block className="mt-2" disabled={pack.isPending} onClick={props.onClose}>
        {dict.crew.pack.confirmNo}
      </Button>
    </CrewSheet>
  );
}

function DepartSheet(props: { routeId: string; count: number; onClose: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const depart = trpc.crew.depart.useMutation({
    onSuccess() {
      void utils.crew.packQueue.invalidate();
      void utils.crew.routesToday.invalidate();
      void utils.driver.invalidate();
    },
  });

  if (depart.data) {
    return (
      <CrewSheet title={dict.crew.pack.departed} onClose={props.onClose}>
        <Button size="lg" block className="mt-5" onClick={props.onClose}>
          {dict.crew.sell.ok}
        </Button>
      </CrewSheet>
    );
  }

  return (
    <CrewSheet
      title={dict.crew.pack.departButton}
      subtitle={interpolate(dict.crew.pack.departConfirm, { count: props.count })}
      onClose={props.onClose}
    >
      {depart.error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-danger">
          {depart.error.message}
        </p>
      )}
      <Button
        size="lg"
        block
        className="mt-5 h-16 text-[19px]"
        disabled={depart.isPending}
        onClick={() => depart.mutate({ routeId: props.routeId })}
      >
        {depart.isPending ? dict.crew.pack.departing : dict.crew.pack.departYes}
      </Button>
      <Button variant="ghost" size="lg" block className="mt-2" disabled={depart.isPending} onClick={props.onClose}>
        {dict.crew.pack.departNo}
      </Button>
    </CrewSheet>
  );
}
