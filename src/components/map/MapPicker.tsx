"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { cn } from "~/lib/cn";
import { LUCENA_CENTER } from "~/lib/geo";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

export type LatLng = { lat: number; lng: number };

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Click-or-drag pin picker for an admin store form. Falls back to plain
 * lat/lng number inputs when no Mapbox token is configured, so the flow
 * never breaks — it just loses the visual picker until Mapbox is set up.
 */
export function MapPicker(props: { value: LatLng | null; onChange: (v: LatLng | null) => void }) {
  const { value, onChange } = props;

  if (!MAPBOX_TOKEN) {
    return <ManualLatLngFallback value={value} onChange={onChange} />;
  }

  return <MapboxPicker value={value} onChange={onChange} token={MAPBOX_TOKEN} />;
}

function MapboxPicker(props: { value: LatLng | null; onChange: (v: LatLng | null) => void; token: string }) {
  const { value, onChange, token } = props;
  const dict = useDictionary();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = token;
    const start = value ?? LUCENA_CENTER;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [start.lng, start.lat],
      zoom: value ? 15 : 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const placeMarker = (lng: number, lat: number) => {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ draggable: true, color: "#D85A30" })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLngLat();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    };

    if (value) placeMarker(value.lng, value.lat);

    map.on("click", (e) => {
      placeMarker(e.lngLat.lng, e.lngLat.lat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is initialized once; live `value` updates from outside the picker
    // (e.g. an edit form resetting) aren't re-synced back into the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-md border border-hair-strong"
      />
      <div className="mt-1.5 flex items-center justify-between text-[13px] text-ink-2">
        <span>{dict.map.pickerHint}</span>
        {value && (
          <button
            type="button"
            className="font-medium text-action"
            onClick={() => {
              markerRef.current?.remove();
              markerRef.current = null;
              onChange(null);
            }}
          >
            {dict.map.clear}
          </button>
        )}
      </div>
    </div>
  );
}

function ManualLatLngFallback(props: { value: LatLng | null; onChange: (v: LatLng | null) => void }) {
  const { value, onChange } = props;
  const dict = useDictionary();
  const [latDraft, setLatDraft] = useState(value?.lat.toString() ?? "");
  const [lngDraft, setLngDraft] = useState(value?.lng.toString() ?? "");

  const commit = (lat: string, lng: string) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (lat.trim() === "" || lng.trim() === "") {
      onChange(null);
      return;
    }
    if (Number.isFinite(latNum) && Number.isFinite(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180) {
      onChange({ lat: latNum, lng: lngNum });
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-[13px] text-ink-2">{dict.map.noToken}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          inputMode="decimal"
          value={latDraft}
          placeholder={dict.map.latLabel}
          aria-label={dict.map.latLabel}
          onChange={(e) => {
            setLatDraft(e.target.value);
            commit(e.target.value, lngDraft);
          }}
          className={cn(
            "h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px] outline-none",
            "focus:border-action",
          )}
        />
        <input
          inputMode="decimal"
          value={lngDraft}
          placeholder={dict.map.lngLabel}
          aria-label={dict.map.lngLabel}
          onChange={(e) => {
            setLngDraft(e.target.value);
            commit(latDraft, e.target.value);
          }}
          className={cn(
            "h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px] outline-none",
            "focus:border-action",
          )}
        />
      </div>
    </div>
  );
}
