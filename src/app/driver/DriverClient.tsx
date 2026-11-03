"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, CheckCircle2, Navigation, Phone, Truck } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManilaDate } from "~/lib/datetime";
import { formatPeso, formatPhone } from "~/lib/format";
import { googleMapsDirectionsUrl } from "~/lib/geo";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { uploadPod } from "~/lib/supabase/storage";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { SignaturePad, signatureBlob } from "./SignaturePad";

const RouteMap = dynamic(() => import("~/components/map/RouteMap").then((m) => m.RouteMap), {
  ssr: false,
});

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RoutesToday = RouterOutputs["driver"]["routesToday"];
type Stop = RouterOutputs["driver"]["stops"][number];

/** Secondary pill styling for anchors (tel:, maps) that must look like buttons. */
const linkPill =
  "inline-flex h-tap flex-1 items-center justify-center gap-2 rounded-pill bg-surface-2 px-4 text-[15px] font-semibold text-ink transition-transform active:scale-[0.97] active:bg-hair";

function isDone(stop: Stop): boolean {
  return stop.status === "delivered" || stop.status === "settled";
}

export function DriverClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const routesQuery = trpc.driver.routesToday.useQuery();
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);

  if (routesQuery.isLoading) {
    return <StatusText>{dict.common.loading}</StatusText>;
  }
  if (routesQuery.error || !routesQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const { day, routes } = routesQuery.data;
  // One truck, one route is the normal morning — skip the picker then.
  const routeId = pickedRouteId ?? (routes.length === 1 ? routes[0]!.id : null);

  return (
    <div className="animate-fade-in pt-4">
      <h1 className="title-large">{dict.driver.title}</h1>
      <p className="text-ink-2 mt-1 text-[15px]">{formatManilaDate(day, locale)}</p>

      {routes.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={routeId === r.id}
              onClick={() => setPickedRouteId(r.id)}
              className={cn(
                "tnum h-tap rounded-pill shrink-0 px-5 text-[15px] font-semibold transition-transform active:scale-[0.97]",
                routeId === r.id
                  ? "bg-action text-white"
                  : "bg-surface text-ink active:bg-surface-2 shadow-[var(--shadow-card)]",
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
        <StatusText>{dict.driver.pickRoute}</StatusText>
      )}
    </div>
  );
}

function StatusText(props: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p
      className={cn(
        "pt-16 text-center text-[15px]",
        props.danger ? "text-danger font-medium" : "text-ink-2",
      )}
    >
      {props.children}
    </p>
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
    return <StatusText>{dict.common.loading}</StatusText>;
  }
  if (stopsQuery.error || !stopsQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const stops = stopsQuery.data;
  const delivered = stops.filter(isDone);

  if (stops.length === 0) {
    return <StatusText>{dict.driver.emptyStops}</StatusText>;
  }

  const allDone = delivered.length === stops.length;
  const nextStopId = stops.find((s) => !isDone(s))?.id ?? null;
  const progressPct = Math.round((delivered.length / stops.length) * 100);

  return (
    <div className="mt-5">
      <Card className="p-5">
        <div className="text-ink-2 flex items-center gap-2 text-[14px]">
          <Truck size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">
            {route?.name}
            {route?.vehiclePlate ? ` · ${route.vehiclePlate}` : ""}
          </span>
        </div>
        <div className="tnum mt-2 text-[28px] leading-tight font-bold tracking-tight">
          {interpolate(dict.driver.delivered, { delivered: delivered.length, total: stops.length })}
        </div>
        <div className="rounded-pill bg-surface-2 mt-3 h-2 overflow-hidden">
          <div
            className={cn(
              "rounded-pill h-full transition-[width] duration-500",
              allDone ? "bg-success" : "bg-action",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allDone && (
          <p className="animate-fade-in text-success mt-4 flex items-center gap-2 text-[15px] font-semibold">
            <CheckCircle2 size={22} className="shrink-0" />
            {dict.driver.allDelivered}
          </p>
        )}
      </Card>

      <div className="mt-3">
        <RouteMap
          stops={stops.map((s) => ({
            id: s.id,
            lat: s.lat,
            lng: s.lng,
            done: isDone(s),
          }))}
        />
      </div>

      <div className="mt-1 space-y-3">
        {stops.map((stop, i) => (
          <StopCard key={stop.id} stop={stop} index={i + 1} isNext={stop.id === nextStopId} />
        ))}
      </div>
    </div>
  );
}

function StopCard(props: { stop: Stop; index: number; isNext: boolean }) {
  const { stop, index, isNext } = props;
  const dict = useDictionary();
  const [confirming, setConfirming] = useState(false);
  const done = isDone(stop);
  const activeItems = stop.items.filter((i) => !i.cancelledItem);

  return (
    <Card
      className={cn("p-5 transition-opacity", done && "opacity-55", isNext && "ring-action ring-2")}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "tnum rounded-pill flex h-10 w-10 shrink-0 items-center justify-center text-[17px] font-bold",
            done
              ? "bg-success-soft text-success"
              : isNext
                ? "bg-action text-white"
                : "bg-surface-2 text-ink",
          )}
        >
          {done ? <Check size={20} strokeWidth={3} /> : index}
        </span>
        <div className="min-w-0 flex-1">
          {isNext && <div className="section-label text-ink mb-1">{dict.driver.nextStop}</div>}
          <div className="flex items-start justify-between gap-2">
            <span className="text-[19px] leading-tight font-semibold tracking-tight">
              {stop.storeName}
            </span>
            <span className="price shrink-0 text-[17px] font-semibold">
              {formatPeso(stop.totalCentavos)}
            </span>
          </div>
          <div className="text-ink-2 mt-1 text-[15px]">
            {stop.ownerName} · <span className="tnum">{formatPhone(stop.phoneE164)}</span>
          </div>
          {stop.addressLine && (
            <div className="text-ink-2 mt-0.5 text-[14px]">{stop.addressLine}</div>
          )}
        </div>
      </div>

      {activeItems.length > 0 && (
        <ul className="bg-surface-2 mt-4 space-y-1 rounded-md px-4 py-3 text-[15px]">
          {activeItems.map((i, n) => (
            <li key={n} className="flex justify-between gap-3">
              <span className="min-w-0">
                {i.nameTl} <span className="text-ink-2">{i.unitLabelTl}</span>
              </span>
              <span className="tnum shrink-0 font-semibold">×{i.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {!done && (
        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${stop.phoneE164}`}
            className={linkPill}
            aria-label={`${dict.driver.call} ${formatPhone(stop.phoneE164)}`}
          >
            <Phone size={18} strokeWidth={2} />
            {dict.driver.call}
          </a>
          {stop.lat != null && stop.lng != null && (
            <a
              href={googleMapsDirectionsUrl(stop.lat, stop.lng)}
              target="_blank"
              rel="noreferrer"
              className={linkPill}
            >
              <Navigation size={18} strokeWidth={2} />
              {dict.driver.navigate}
            </a>
          )}
        </div>
      )}

      {!done && (
        <Button
          size="lg"
          block
          className="mt-3 h-16 text-[19px]"
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
  /** Paths that already made it up, so a retry after a failed mutation skips the uploads. */
  const [uploaded, setUploaded] = useState<{ photo?: string; signature?: string }>({});
  const signatureBox = useRef<HTMLDivElement | null>(null);

  // Thumbnail so the driver can see the photo actually took.
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const busy = uploading || markDelivered.isPending;

  const submit = async () => {
    setUploading(true);
    // Best-effort uploads, side by side (each has its own 15 s cap), under
    // stable per-order paths so a retry overwrites instead of piling up.
    // A dead zone must not strand the handoff.
    const [podPhotoPath, podSignaturePath] = await Promise.all([
      uploaded.photo
        ? Promise.resolve(uploaded.photo)
        : photo
          ? uploadPod(`${stop.id}/photo.jpg`, photo).then((p) => p ?? undefined)
          : Promise.resolve(undefined),
      uploaded.signature
        ? Promise.resolve(uploaded.signature)
        : hasSignature && signatureBox.current
          ? signatureBlob(signatureBox.current).then((blob) =>
              blob
                ? uploadPod(`${stop.id}/signature.png`, blob).then((p) => p ?? undefined)
                : undefined,
            )
          : Promise.resolve(undefined),
    ]);
    setUploaded({ photo: podPhotoPath, signature: podSignaturePath });
    setUploading(false);
    markDelivered.mutate({ orderId: stop.id, podPhotoPath, podSignaturePath });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={props.onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-sheet-up bg-surface relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-xl px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[var(--shadow-float)]"
      >
        <div className="rounded-pill bg-hair-strong mx-auto mb-4 h-1.5 w-10" />
        <h2 className="text-[24px] leading-tight font-bold tracking-tight">
          {interpolate(dict.driver.podHeadingFor, { name: stop.ownerName })}
        </h2>
        <p className="text-ink-2 mt-1.5 text-[15px]">
          {interpolate(dict.driver.podSubtitle, { price: formatPeso(stop.totalCentavos) })}
        </p>

        <label className="mt-5 block">
          <span className="section-label mb-2 block">{dict.driver.podPhotoLabel}</span>
          <span
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-md text-[16px] font-semibold transition-transform active:scale-[0.99]",
              photo
                ? "bg-success-soft text-success p-2 pr-4"
                : "border-hair-strong bg-surface-2 text-ink active:bg-hair h-16 justify-center border-2 border-dashed",
            )}
          >
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable asset
              <img src={photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-sm object-cover" />
            )}
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

        <div className="mt-5" ref={signatureBox}>
          <span className="section-label mb-2 block">
            {interpolate(dict.driver.signatureLabel, { name: stop.ownerName })}
          </span>
          <SignaturePad onChange={setHasSignature} />
        </div>

        {markDelivered.error && (
          <p className="text-danger mt-3 text-[14px] font-medium">{markDelivered.error.message}</p>
        )}

        <Button size="lg" block className="mt-5 h-16 text-[19px]" disabled={busy} onClick={submit}>
          {busy ? dict.driver.submitting : dict.driver.doneButton}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          block
          className="mt-2"
          disabled={busy}
          onClick={props.onClose}
        >
          {dict.driver.back}
        </Button>
      </div>
    </div>
  );
}
