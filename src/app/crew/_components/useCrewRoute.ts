"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sarihub.crew.route";

/**
 * Which truck the helper is on. One route is the normal morning and needs no
 * picking; with several, the choice is remembered across the four tabs (and
 * a reload) in localStorage. A remembered id that no longer exists is ignored.
 */
export function useCrewRoute(routes: Array<{ id: string }>) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setPicked(saved);
    } catch {
      // Storage blocked — the picker still works for this page load.
    }
  }, []);

  const routeId = useMemo(() => {
    if (routes.length === 1) return routes[0]!.id;
    if (picked && routes.some((r) => r.id === picked)) return picked;
    return null;
  }, [routes, picked]);

  const setRouteId = useCallback((id: string) => {
    setPicked(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  return { routeId, setRouteId };
}
