"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { ErrorState, LoadingState, PageHeader } from "../_components/ui";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Board = RouterOutputs["admin"]["orders"]["board"];
type BoardOrder = Board["orders"][number];
type ColumnStatus = "submitted" | "packed" | "in_transit" | "delivered";

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

/**
 * Dispatch board. Desktop (≥ lg): four kanban columns side by side.
 * Phone: a scrollable status tab strip shows one column at a time, so the
 * page never scrolls sideways.
 */
export function OrdersBoardClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const boardQuery = trpc.admin.orders.board.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [routeFilter, setRouteFilter] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ColumnStatus>("submitted");

  if (boardQuery.isLoading) return <LoadingState />;
  if (boardQuery.error || !boardQuery.data) return <ErrorState />;

  const board = boardQuery.data;
  const visibleOrders = board.orders.filter(
    (o) => routeFilter === null || o.routeId === routeFilter,
  );
  const cancelled = visibleOrders.filter((o) => o.status === "cancelled");
  const cols = columns(dict);
  const visibleRoutes = board.routes.filter((r) => routeFilter === null || r.id === routeFilter);

  return (
    <div>
      <PageHeader
        title={interpolate(dict.admin.orders.heading, {
          date: formatManilaDate(board.day, locale),
        })}
      />

      {board.routes.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
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
      )}

      {visibleRoutes.length > 0 && (
        <section className="mt-6">
          <h2 className="section-label mb-2 px-1">{dict.admin.orders.routeLoadHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleRoutes.map((route) => {
              const over = route.capacityKg !== null && route.loadKg > route.capacityKg;
              const pct =
                route.capacityKg && route.capacityKg > 0
                  ? Math.min((route.loadKg / route.capacityKg) * 100, 100)
                  : 0;
              return (
                <Card key={route.id} className="px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[16px] font-semibold">{route.name}</span>
                    <span
                      className={cn(
                        "price shrink-0 text-[14px]",
                        over ? "font-semibold text-danger" : "text-ink-2",
                      )}
                    >
                      {route.loadKg.toFixed(1)} kg
                      {route.capacityKg !== null && ` / ${route.capacityKg} kg`}
                    </span>
                  </div>
                  {route.capacityKg !== null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-2">
                      <div
                        className={cn("h-full rounded-pill", over ? "bg-danger" : "bg-action")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {over && (
                    <p className="mt-2 rounded-sm bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
                      {dict.admin.orders.overCapacity}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Phone: one column at a time via a status tab strip. */}
      <div
        role="tablist"
        aria-label={dict.admin.orders.statusTabsAria}
        className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {cols.map((col) => {
          const count = visibleOrders.filter((o) => o.status === col.status).length;
          const active = activeStatus === col.status;
          return (
            <button
              key={col.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveStatus(col.status)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-pill pl-4 pr-2 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-action text-white"
                  : "bg-surface text-ink shadow-[var(--shadow-card)]",
              )}
            >
              {col.label}
              <span
                className={cn(
                  "tnum flex h-7 min-w-7 items-center justify-center rounded-pill px-2 text-[13px]",
                  active ? "bg-white/20 text-white" : "bg-surface-2 text-ink-2",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar mt-3 grid gap-4 lg:mt-8 lg:grid-cols-[repeat(4,minmax(220px,1fr))] lg:overflow-x-auto lg:pb-2">
        {cols.map((col) => {
          const colOrders = visibleOrders.filter((o) => o.status === col.status);
          return (
            <section
              key={col.status}
              className={cn(
                "min-w-0 lg:block lg:rounded-xl lg:bg-surface-2/70 lg:p-3",
                activeStatus === col.status ? "block" : "hidden",
              )}
            >
              <h3 className="mb-3 hidden items-center justify-between px-1 lg:flex">
                <span className="text-[15px] font-semibold">{col.label}</span>
                <span className="tnum flex h-6 min-w-6 items-center justify-center rounded-pill bg-surface px-2 text-[12px] font-semibold text-ink-2">
                  {colOrders.length}
                </span>
              </h3>
              <div className="flex flex-col gap-3 lg:gap-2.5">
                {colOrders.length === 0 && (
                  <p className="rounded-lg border border-dashed border-hair-strong px-3 py-8 text-center text-[14px] text-ink-3 lg:py-6">
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
        <p className="mt-6 rounded-lg bg-surface px-4 py-3 text-[14px] text-ink-2 shadow-[var(--shadow-card)]">
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
      aria-pressed={props.active}
      className={cn(
        "h-11 shrink-0 rounded-pill px-4 text-[14px] font-semibold transition-colors lg:h-10",
        props.active
          ? "bg-action text-white"
          : "bg-surface text-ink shadow-[var(--shadow-card)] hover:bg-surface-2",
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
  const [confirming, setConfirming] = useState(false);
  const setStatus = trpc.admin.orders.setStatus.useMutation({
    onSuccess() {
      setConfirming(false);
    },
    onSettled() {
      void utils.admin.orders.board.invalidate();
    },
  });
  const next = nextStep(dict)[order.status];

  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[16px] font-semibold lg:text-[15px]">
          {order.storeName}
        </span>
        <span className="price shrink-0 text-[16px] font-semibold lg:text-[15px]">
          {formatPeso(order.totalCentavos)}
        </span>
      </div>
      <div className="price mt-1 text-[13px] text-ink-2">
        {interpolate(
          order.itemCount === 1 ? dict.admin.orders.cardMetaOne : dict.admin.orders.cardMetaOther,
          { count: order.itemCount, kg: order.loadKg.toFixed(1) },
        )}
        {order.hasUnweighedItems && <span title={dict.admin.orders.unweighedTitle}> ±</span>}
      </div>
      {next && !confirming && (
        <Button
          variant="secondary"
          block
          className="mt-3 h-11 text-[14px]"
          onClick={() => setConfirming(true)}
        >
          {next.label}
        </Button>
      )}
      {next && confirming && (
        <div className="animate-fade-in mt-3 rounded-md bg-warning-soft px-3 py-3">
          <p className="text-[13px] font-medium text-warning">
            {interpolate(dict.admin.orders.confirmPrompt, { label: next.label.replace(/^→\s*/, "") })}
          </p>
          <div className="mt-2.5 flex flex-col-reverse gap-2 sm:flex-row lg:flex-col-reverse 2xl:flex-row">
            <Button
              variant="secondary"
              block
              className="h-11 min-w-0 bg-surface px-3 text-[14px]"
              disabled={setStatus.isPending}
              onClick={() => setConfirming(false)}
            >
              {dict.admin.orders.confirmNo}
            </Button>
            <Button
              block
              className="h-11 min-w-0 px-3 text-[14px]"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ orderId: order.id, status: next.status })}
            >
              {setStatus.isPending ? dict.admin.orders.updating : dict.admin.orders.confirmYes}
            </Button>
          </div>
        </div>
      )}
      {setStatus.error && (
        <p className="mt-2 text-[13px] font-medium text-danger">{setStatus.error.message}</p>
      )}
    </Card>
  );
}
