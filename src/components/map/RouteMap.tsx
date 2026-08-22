"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type RouteStop = { id: string; lat: number | null; lng: number | null; done: boolean };

/**
 * Read-only overview map for the driver's stop list: numbered pins in
 * delivery order for whichever stops have a pin set. Renders nothing when
 * there's no Mapbox token or no stop has coordinates yet — the stop list
 * below works fine without it.
 */
export function RouteMap(props: { stops: RouteStop[] }) {
  const pinned = props.stops
    .map((s, i) => ({ ...s, index: i + 1 }))
    .filter((s): s is RouteStop & { index: number; lat: number; lng: number } => s.lat != null && s.lng != null);

  if (!MAPBOX_TOKEN || pinned.length === 0) return null;

  return <RouteMapInner pinned={pinned} token={MAPBOX_TOKEN} />;
}

function RouteMapInner(props: {
  pinned: Array<{ id: string; lat: number; lng: number; index: number; done: boolean }>;
  token: string;
}) {
  const { pinned, token } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [pinned[0]!.lng, pinned[0]!.lat],
      zoom: 13,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Map only needs to be created once; pin updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = pinned.map((stop) => {
        const el = document.createElement("div");
        el.textContent = String(stop.index);
        el.className = [
          "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow",
          stop.done ? "bg-success" : "bg-action",
        ].join(" ");
        return new mapboxgl.Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map);
      });

      if (pinned.length > 1) {
        const bounds = pinned.reduce(
          (b, s) => b.extend([s.lng, s.lat]),
          new mapboxgl.LngLatBounds([pinned[0]!.lng, pinned[0]!.lat], [pinned[0]!.lng, pinned[0]!.lat]),
        );
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }
    };

    if (map.loaded()) draw();
    else map.once("load", draw);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [pinned]);

  return (
    <div
      ref={containerRef}
      className="mb-3 h-40 w-full overflow-hidden rounded-md border border-hair-strong"
    />
  );
}
