"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Board = RouterOutputs["admin"]["orders"]["board"];
type BoardOrder = Board["orders"][number];

function columns(dict: Dictionary) {
  return [
    { status: "submitted", label: dict.orders.statusSubmitted },
    { status: "packed", label: dict.orders.statusPacked },
    { status: "in_transit", label: dict.orders.statusInTransit },
    { status: "delivered", label: dict.orders.statusDelivered },
  ] as const;
}

/** The single forward step out of each column, if any. */
function nextStep(
  dict: Dictionary,
): Record<string, { status: "packed" | "in_transit" | "delivered"; label: string }> {
  return {
    submitted: { status: "packed", label: dict.admin.orders.advanceToPacked },
    packed: { status: "in_transit", label: dict.admin.orders.advanceToInTransit },
    in_transit: { status: "delivered", label: dict.admin.orders.advanceToDelivered },
  };
}

export function OrdersBoardClient() {
  const dict = useDictionary();
  const boardQuery = trpc.admin.orders.board.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [routeFilter, setRouteFilter] = useState<string | null>(null);

  if (boardQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (boardQuery.error || !boardQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const board = boardQuery.data;
  const visibleOrders = board.orders.filter(
    (o) => routeFilter === null || o.routeId === routeFilter,
  );
  const cancelled = visibleOrders.filter((o) => o.status === "cancelled");
  const cols = columns(dict);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-medium">
          {interpolate(dict.admin.orders.heading, { date: formatManilaDate(board.day) })}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <RoutePill
            label={dict.admin.orders.allRoutes}
            active={routeFilter === null}
            onClick={() => setRouteFilter(null)}
          />
          {board.routes.map((r) => (
            <RoutePill
              key={r.id}
              label={r.name}
              active={routeFilter === r.id}
              onClick={() => setRouteFilter(routeFilter === r.id ? null : r.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {board.routes
          .filter((r) => routeFilter === null || r.id === routeFilter)
          .map((route) => {
            const over = route.capacityKg !== null && route.loadKg > route.capacityKg;
            const pct =
              route.capacityKg && route.capacityKg > 0
                ? Math.min((route.loadKg / route.capacityKg) * 100, 100)
                : 0;
            return (
              <div key={route.id} className="rounded-md border border-hair bg-white px-3.5 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] font-medium">{route.name}</span>
                  <span className={cn("price text-[13px]", over ? "font-semibold text-danger" : "text-ink-2")}>
                    {route.loadKg.toFixed(1)} kg
                    {route.capacityKg !== null && ` / ${route.capacityKg} kg`}
                  </span>
                </div>
                {route.capacityKg !== null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-2">
                    <div
                      className={cn("h-full rounded-pill", over ? "bg-danger" : "bg-action")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {over && (
                  <p className="mt-1.5 text-xs font-medium text-danger">
                    {dict.admin.orders.overCapacity}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cols.map((col) => {
          const colOrders = visibleOrders.filter((o) => o.status === col.status);
          return (
            <section key={col.status}>
              <h3 className="flex items-baseline justify-between text-[13px] font-medium text-ink-2">
                <span>{col.label}</span>
                <span className="price">{colOrders.length}</span>
              </h3>
              <div className="mt-2 flex flex-col gap-2">
                {colOrders.length === 0 && (
                  <p className="rounded-md border border-dashed border-hair px-3 py-4 text-center text-xs text-ink-3">
                    {dict.admin.orders.emptyColumn}
                  </p>
                )}
                {colOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <p className="mt-5 text-[13px] text-ink-3">
          {interpolate(dict.admin.orders.cancelledToday, {
            names: cancelled.map((o) => o.storeName).join(", "),
          })}
        </p>
      )}
    </div>
  );
}

function RoutePill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "h-9 rounded-pill border px-3 text-[13px] font-medium transition-colors",
        props.active
          ? "border-action bg-action text-white"
          : "border-hair-strong bg-white text-ink-2 hover:bg-surface-2",
      )}
    >
      {props.label}
    </button>
  );
}

function OrderCard(props: { order: BoardOrder }) {
  const { order } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const setStatus = trpc.admin.orders.setStatus.useMutation({
    onSettled() {
      void utils.admin.orders.board.invalidate();
    },
  });
  const next = nextStep(dict)[order.status];

  return (
    <div className="rounded-md border border-hair bg-white px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[14px] font-medium">{order.storeName}</span>
        <span className="price shrink-0 text-[14px] font-medium">
          {formatPeso(order.totalCentavos)}
        </span>
      </div>
      <div className="price mt-1 text-xs text-ink-2">
        {interpolate(
          order.itemCount === 1 ? dict.admin.orders.cardMetaOne : dict.admin.orders.cardMetaOther,
          { count: order.itemCount, kg: order.loadKg.toFixed(1) },
        )}
        {order.hasUnweighedItems && <span title={dict.admin.orders.unweighedTitle}> ±</span>}
      </div>
      {next && (
        <Button
          variant="secondary"
          block
          className="mt-2.5 h-10 text-[13px]"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ orderId: order.id, status: next.status })}
        >
          {setStatus.isPending ? dict.admin.orders.updating : next.label}
        </Button>
      )}
      {setStatus.error && (
        <p className="mt-1.5 text-xs font-medium text-danger">{setStatus.error.message}</p>
      )}
    </div>
  );
}
