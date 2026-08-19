"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleUser } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso, formatPhone } from "~/lib/format";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { uploadPod } from "~/lib/supabase/storage";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { SignaturePad, signatureBlob } from "./SignaturePad";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RoutesToday = RouterOutputs["driver"]["routesToday"];
type Stop = RouterOutputs["driver"]["stops"][number];

export function DriverClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const routesQuery = trpc.driver.routesToday.useQuery();
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);

  if (routesQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (routesQuery.error || !routesQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const { day, routes } = routesQuery.data;
  // One truck, one route is the normal morning — skip the picker then.
  const routeId = pickedRouteId ?? (routes.length === 1 ? routes[0]!.id : null);

  return (
    <div>
      <header className="flex items-start justify-between py-3">
        <div>
          <h1 className="title-large">{dict.driver.title}</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">{formatManilaDate(day, locale)}</p>
        </div>
        <Link
          href="/profile"
          aria-label={dict.nav.profileAria}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-pill border border-hair-strong bg-white text-ink-2 active:bg-surface-2"
        >
          <CircleUser size={22} strokeWidth={1.75} />
        </Link>
      </header>

      {routes.length > 1 && (
        <div className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPickedRouteId(r.id)}
              className={cn(
                "h-10 shrink-0 rounded-pill border px-3.5 text-[13px] font-medium",
                routeId === r.id
                  ? "border-action bg-action text-white"
                  : "border-hair-strong bg-white text-ink-2 active:bg-surface-2",
              )}
            >
              {r.name} · {r.deliveredCount}/{r.stopCount}
            </button>
          ))}
        </div>
      )}

      {routeId ? (
        <StopList routeId={routeId} routes={routes} />
      ) : (
        <p className="pt-8 text-center text-[13px] text-ink-2">{dict.driver.pickRoute}</p>
      )}
    </div>
  );
}

function StopList(props: { routeId: string; routes: RoutesToday["routes"] }) {
  const dict = useDictionary();
  const stopsQuery = trpc.driver.stops.useQuery(
    { routeId: props.routeId },
    { refetchInterval: 120_000 },
  );
  const route = props.routes.find((r) => r.id === props.routeId);

  if (stopsQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (stopsQuery.error || !stopsQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const stops = stopsQuery.data;
  const delivered = stops.filter((s) => s.status === "delivered" || s.status === "settled");

  if (stops.length === 0) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.driver.emptyStops}</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-md bg-surface-2 px-3.5 py-2.5 text-[13px]">
        <span className="text-ink-2">
          {route?.name}
          {route?.vehiclePlate ? ` · ${route.vehiclePlate}` : ""}
        </span>
        <span className="price font-medium">
          {interpolate(dict.driver.delivered, { delivered: delivered.length, total: stops.length })}
        </span>
      </div>
      {stops.map((stop, i) => (
        <StopCard key={stop.id} stop={stop} index={i + 1} />
      ))}
    </div>
  );
}

function StopCard(props: { stop: Stop; index: number }) {
  const { stop, index } = props;
  const dict = useDictionary();
  const [confirming, setConfirming] = useState(false);
  const done = stop.status === "delivered" || stop.status === "settled";
  const activeItems = stop.items.filter((i) => !i.cancelledItem);

  return (
    <Card className={cn("mb-3 px-4 py-3.5", done && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-xs font-medium",
                done ? "bg-success-soft text-success" : "bg-surface-2 text-ink-2",
              )}
            >
              {done ? "✓" : index}
            </span>
            <span className="truncate text-[15px] font-medium">{stop.storeName}</span>
          </div>
          <div className="mt-1 text-[13px] text-ink-2">
            {stop.ownerName} ·{" "}
            <a href={`tel:${stop.phoneE164}`} className="font-medium text-action">
              {formatPhone(stop.phoneE164)}
            </a>
          </div>
          {stop.addressLine && <div className="text-[13px] text-ink-2">{stop.addressLine}</div>}
        </div>
        <span className="price shrink-0 text-[15px] font-medium">
          {formatPeso(stop.totalCentavos)}
        </span>
      </div>

      <div className="mt-1.5 text-[13px] text-ink-2">
        {activeItems.map((i) => `${i.nameTl} ${i.unitLabelTl} ×${i.quantity}`).join(" · ")}
      </div>

      {!done && (
        <Button
          variant="success"
          size="lg"
          block
          className="mt-3"
          onClick={() => setConfirming(true)}
        >
          {dict.driver.deliveredButton}
        </Button>
      )}

      {confirming && <PodSheet stop={stop} onClose={() => setConfirming(false)} />}
    </Card>
  );
}

function PodSheet(props: { stop: Stop; onClose: () => void }) {
  const { stop } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const markDelivered = trpc.driver.markDelivered.useMutation({
    onSuccess() {
      void utils.driver.stops.invalidate();
      void utils.driver.routesToday.invalidate();
      props.onClose();
    },
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const signatureBox = useRef<HTMLDivElement | null>(null);

  const busy = uploading || markDelivered.isPending;

  const submit = async () => {
    setUploading(true);
    // Best-effort uploads: a dead zone must not strand the handoff.
    let podPhotoPath: string | undefined;
    let podSignaturePath: string | undefined;
    if (photo) {
      const uploaded = await uploadPod(`${stop.id}/photo-${Date.now()}.jpg`, photo);
      if (uploaded) podPhotoPath = uploaded;
    }
    if (hasSignature && signatureBox.current) {
      const blob = await signatureBlob(signatureBox.current);
      if (blob) {
        const uploaded = await uploadPod(`${stop.id}/signature-${Date.now()}.png`, blob);
        if (uploaded) podSignaturePath = uploaded;
      }
    }
    setUploading(false);
    markDelivered.mutate({ orderId: stop.id, podPhotoPath, podSignaturePath });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={props.onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-t-lg bg-surface px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hair-strong" />
        <h2 className="text-lg font-medium">
          {interpolate(dict.driver.podHeadingFor, { name: stop.ownerName })}
        </h2>
        <p className="mt-1 text-[13px] text-ink-2">
          {interpolate(dict.driver.podSubtitle, { price: formatPeso(stop.totalCentavos) })}
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-[13px] text-ink-2">{dict.driver.podPhotoLabel}</span>
          <span
            className={cn(
              "flex h-tap w-full cursor-pointer items-center justify-center rounded-md border text-[14px] font-medium",
              photo
                ? "border-success bg-success-soft text-success"
                : "border-hair-strong bg-white active:bg-surface-2",
            )}
          >
            {photo ? dict.driver.hasPhoto : dict.driver.takePhoto}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-3" ref={signatureBox}>
          <span className="mb-1 block text-[13px] text-ink-2">
            {interpolate(dict.driver.signatureLabel, { name: stop.ownerName })}
          </span>
          <SignaturePad onChange={setHasSignature} />
        </div>

        {markDelivered.error && (
          <p className="mt-2 text-[13px] font-medium text-danger">
            {markDelivered.error.message}
          </p>
        )}

        <Button variant="success" size="lg" block className="mt-4" disabled={busy} onClick={submit}>
          {busy ? dict.driver.submitting : dict.driver.doneButton}
        </Button>
        <Button variant="ghost" block className="mt-2" disabled={busy} onClick={props.onClose}>
          {dict.driver.back}
        </Button>
      </div>
    </div>
  );
}
