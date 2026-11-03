"use client";

import type { inferRouterOutputs } from "@trpc/server";

import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { useCrewRoute } from "./useCrewRoute";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type CrewRoute = RouterOutputs["crew"]["routesToday"]["routes"][number];

/** Centered status line (loading / error / empty), same as the driver app's. */
export function StatusText(props: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p
      className={cn(
        "pt-16 text-center text-[15px]",
        props.danger ? "font-medium text-danger" : "text-ink-2",
      )}
    >
      {props.children}
    </p>
  );
}

/**
 * Shared frame for the four crew tabs: large title, today's date, the route
 * picker (only when there is more than one truck), then the tab's content
 * once a route is known. Loading and error states live here once.
 */
export function CrewPage(props: {
  title: string;
  /** Shown beside each route pill, e.g. packed/total. */
  progress?: (route: CrewRoute) => string;
  children: (ctx: { routeId: string; route: CrewRoute; day: Date }) => React.ReactNode;
}) {
  const dict = useDictionary();
  const { locale } = useLocale();
  const routesQuery = trpc.crew.routesToday.useQuery(undefined, { refetchInterval: 120_000 });
  const routes = routesQuery.data?.routes ?? [];
  const { routeId, setRouteId } = useCrewRoute(routes);

  if (routesQuery.isLoading) return <StatusText>{dict.common.loading}</StatusText>;
  if (routesQuery.error || !routesQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const route = routes.find((r) => r.id === routeId) ?? null;

  return (
    <div className="animate-fade-in pt-4">
      <h1 className="title-large">{props.title}</h1>
      <p className="mt-1 text-[15px] text-ink-2">{formatManilaDate(routesQuery.data.day, locale)}</p>

      {routes.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={routeId === r.id}
              onClick={() => setRouteId(r.id)}
              className={cn(
                "tnum h-tap shrink-0 rounded-pill px-5 text-[15px] font-semibold transition-transform active:scale-[0.97]",
                routeId === r.id
                  ? "bg-action text-white"
                  : "bg-surface text-ink shadow-[var(--shadow-card)] active:bg-surface-2",
              )}
            >
              {r.name}
              {props.progress ? ` · ${props.progress(r)}` : ""}
            </button>
          ))}
        </div>
      )}

      {route && routeId ? (
        props.children({ routeId, route, day: routesQuery.data.day })
      ) : (
        <StatusText>{dict.crew.pickRoute}</StatusText>
      )}
    </div>
  );
}
