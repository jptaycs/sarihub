"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { LatLng } from "~/components/map/MapPicker";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatManila } from "~/lib/datetime";
import { formatPeso, formatPhone, pesosToCentavos } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { fieldError } from "~/lib/i18n/validation";
import {
  createStoreInput,
  updateStoreInput,
  type CreateStoreInput,
  type UpdateStoreInput,
} from "~/lib/schemas/admin";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import {
  AdminSheet,
  EmptyState,
  ErrorState,
  Field,
  FormActions,
  LoadingState,
  PageHeader,
  pesoBoxClass,
  selectClass,
  selectStyle,
} from "../_components/ui";

const MapPicker = dynamic(() => import("~/components/map/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
});

type RouterOutputs = inferRouterOutputs<AppRouter>;
type StoreList = RouterOutputs["admin"]["stores"]["list"];
type StoreRowData = StoreList[number];

/** Desktop table columns: store · route/address · suki tab · action. */
const ROW_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6";

export function StoresClient() {
  const dict = useDictionary();
  const storesQuery = trpc.admin.stores.list.useQuery();
  const routesQuery = trpc.admin.stores.routes.useQuery();
  const pendingQuery = trpc.admin.stores.pendingSignUps.useQuery();
  // `true` = blank form; an object = prefilled from a self sign-up.
  const [creating, setCreating] = useState<false | true | Partial<CreateStoreInput>>(false);

  if (storesQuery.isLoading || routesQuery.isLoading) return <LoadingState />;
  if (storesQuery.error || routesQuery.error || !storesQuery.data || !routesQuery.data) {
    return <ErrorState />;
  }

  const routes = routesQuery.data;

  return (
    <div>
      <PageHeader
        title={dict.admin.stores.title}
        actions={
          <Button className="flex-1 sm:flex-none" onClick={() => setCreating(true)}>
            <Plus size={18} strokeWidth={2.5} />
            {dict.admin.stores.newStore}
          </Button>
        }
      />

      {creating && (
        <AdminSheet
          title={dict.admin.stores.newStore}
          subtitle={dict.admin.stores.newStoreHint}
          wide
          onClose={() => setCreating(false)}
        >
          <CreateStoreForm
            routes={routes}
            initial={creating === true ? undefined : creating}
            onDone={() => setCreating(false)}
          />
        </AdminSheet>
      )}

      {pendingQuery.data && pendingQuery.data.length > 0 && (
        <PendingSignUps
          rows={pendingQuery.data}
          onMakeStore={(p) =>
            setCreating({
              name: p.storeName,
              ownerName: p.fullName,
              phone: formatPhone(p.phoneE164),
              addressLine: p.addressLine ?? undefined,
            })
          }
        />
      )}

      {storesQuery.data.length > 0 ? (
        <Card className="mt-6">
          <div
            className={cn(
              "hair-b hidden px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3",
              ROW_GRID,
            )}
          >
            <span>{dict.admin.stores.storeName}</span>
            <span>{dict.admin.stores.route}</span>
            <span>{dict.admin.stores.tabColumn}</span>
            <span />
          </div>
          {storesQuery.data.map((store) => (
            <StoreRow key={store.id} store={store} routes={routes} />
          ))}
        </Card>
      ) : (
        <div className="mt-6">
          <EmptyState>{dict.admin.stores.empty}</EmptyState>
        </div>
      )}
    </div>
  );
}

function StoreRow(props: { store: StoreRowData; routes: Array<{ id: string; name: string }> }) {
  const { store } = props;
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);

  return (
    <div className={cn("hair-b px-4 py-4 last:border-b-0 sm:px-5", ROW_GRID)}>
      <div className="min-w-0">
        <p className="truncate text-[16px] font-semibold lg:text-[15px]">{store.name}</p>
        <p className="mt-0.5 truncate text-[14px] text-ink-2 lg:text-[13px]">
          {store.ownerName} · {formatPhone(store.phoneE164)}
        </p>
      </div>

      <div className="mt-1 min-w-0 lg:mt-0">
        <p className="truncate text-[14px] text-ink-2 lg:text-ink">
          {store.routeName ?? dict.admin.stores.noRoute}
          <span className="lg:hidden">{store.addressLine ? ` · ${store.addressLine}` : ""}</span>
        </p>
        {store.addressLine && (
          <p className="hidden truncate text-[13px] text-ink-3 lg:block">{store.addressLine}</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 lg:contents">
        <span className="price w-fit rounded-pill bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-2 lg:bg-transparent lg:px-0 lg:py-0 lg:text-[14px]">
          {interpolate(dict.admin.stores.tabLabel, {
            balance: formatPeso(store.sukiBalanceCentavos),
            limit: formatPeso(store.sukiLimitCentavos),
          })}
        </span>
        <Button
          variant="secondary"
          className="h-11 shrink-0 px-4 text-[14px] lg:h-9 lg:px-3 lg:text-[13px]"
          onClick={() => setEditing(true)}
        >
          <Pencil size={15} strokeWidth={2.25} />
          {dict.admin.stores.edit}
        </Button>
      </div>

      {editing && (
        <AdminSheet
          title={dict.admin.stores.editStoreHeading}
          subtitle={store.name}
          wide
          onClose={() => setEditing(false)}
        >
          <UpdateStoreForm store={store} routes={props.routes} onDone={() => setEditing(false)} />
        </AdminSheet>
      )}
    </div>
  );
}

function RouteSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    routes: Array<{ id: string; name: string }>;
    noRouteLabel: string;
  },
) {
  const { routes, noRouteLabel, className, ...rest } = props;
  return (
    <select {...rest} className={cn(selectClass, className)} style={selectStyle}>
      <option value="">{noRouteLabel}</option>
      {routes.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

function PesoLimitField(props: {
  dict: Dictionary;
  draft: string;
  onDraft: (v: string) => void;
  error?: string;
}) {
  return (
    <Field label={props.dict.admin.stores.sukiLimit} error={props.error}>
      <div className={pesoBoxClass}>
        <span className="font-medium text-ink-2">₱</span>
        <input
          inputMode="decimal"
          value={props.draft}
          onChange={(e) => props.onDraft(e.target.value)}
          placeholder="2,000.00"
          className="price w-full min-w-0 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
          aria-label={props.dict.admin.stores.sukiLimitAria}
        />
      </div>
    </Field>
  );
}

type PendingSignUpRow = inferRouterOutputs<AppRouter>["admin"]["stores"]["pendingSignUps"][number];

function PendingSignUps(props: { rows: PendingSignUpRow[]; onMakeStore: (row: PendingSignUpRow) => void }) {
  const dict = useDictionary();
  const { locale } = useLocale();
  return (
    <Card className="mt-6">
      <div className="hair-b px-5 py-4">
        <h2 className="text-[17px] font-semibold">{dict.admin.stores.pendingTitle}</h2>
        <p className="mt-1 text-[14px] text-ink-2">{dict.admin.stores.pendingHint}</p>
      </div>
      {props.rows.map((row) => (
        <div key={row.userId} className="hair-b flex flex-wrap items-center gap-3 px-5 py-4 last:border-b-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{row.storeName}</p>
            <p className="truncate text-[13px] text-ink-2">
              {row.fullName} · {formatPhone(row.phoneE164)}
              {row.addressLine ? ` · ${row.addressLine}` : ""}
            </p>
            <p className="text-[12px] text-ink-3">
              {interpolate(dict.admin.stores.signedUpOn, { date: formatManila(row.signedUpAt, "d MMM, h:mm a", locale) })}
            </p>
          </div>
          <Button variant="secondary" onClick={() => props.onMakeStore(row)}>
            {dict.admin.stores.makeStore}
          </Button>
        </div>
      ))}
    </Card>
  );
}

function CreateStoreForm(props: {
  routes: Array<{ id: string; name: string }>;
  initial?: Partial<CreateStoreInput>;
  onDone: () => void;
}) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const create = trpc.admin.stores.create.useMutation({
    onSuccess() {
      void utils.admin.stores.list.invalidate();
      void utils.admin.stores.pendingSignUps.invalidate();
      void utils.admin.suki.exposure.invalidate();
      props.onDone();
    },
  });

  const [limitDraft, setLimitDraft] = useState("2000");
  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreInput),
    defaultValues: {
      routeId: null,
      stopOrder: null,
      lat: null,
      lng: null,
      sukiLimitCentavos: 200000,
      ...props.initial,
    },
  });
  const lat = form.watch("lat");
  const lng = form.watch("lng");

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => create.mutate(values))}
    >
      <Field label={dict.admin.stores.storeName} error={fieldError(dict, form.formState.errors.name?.message)}>
        <Input {...form.register("name")} placeholder="Tindahan ni Marisa" />
      </Field>
      <Field label={dict.admin.stores.ownerName} error={fieldError(dict, form.formState.errors.ownerName?.message)}>
        <Input {...form.register("ownerName")} placeholder="Aling Marisa" />
      </Field>
      <Field label={dict.admin.stores.ownerMobile} error={fieldError(dict, form.formState.errors.phone?.message)}>
        <Input {...form.register("phone")} inputMode="tel" placeholder="0917 123 4567" />
      </Field>
      <Field label={dict.admin.stores.loginEmail} error={fieldError(dict, form.formState.errors.loginEmail?.message)}>
        <Input {...form.register("loginEmail")} type="email" inputMode="email" autoComplete="off" placeholder="marisa@gmail.com" />
      </Field>
      <Field label={dict.admin.stores.address} error={fieldError(dict, form.formState.errors.addressLine?.message)}>
        <Input {...form.register("addressLine")} placeholder="Brgy. Ibabang Dupay, Lucena" />
      </Field>
      <Field label={dict.admin.stores.route}>
        <RouteSelect
          routes={props.routes}
          noRouteLabel={dict.admin.stores.noRoute}
          {...form.register("routeId", {
            setValueAs: (v: string) => (v === "" ? null : v),
          })}
        />
      </Field>
      <Field label={dict.admin.stores.stopOrder} error={fieldError(dict, form.formState.errors.stopOrder?.message)}>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="hal. 3"
          {...form.register("stopOrder", {
            setValueAs: (v: string) => (v === "" || v === null ? null : Number(v)),
          })}
        />
      </Field>
      <PesoLimitField
        dict={dict}
        draft={limitDraft}
        onDraft={(v) => {
          setLimitDraft(v);
          const centavos = pesosToCentavos(v);
          form.setValue("sukiLimitCentavos", centavos ?? -1, { shouldValidate: true });
        }}
        error={fieldError(dict, form.formState.errors.sukiLimitCentavos?.message)}
      />
      <div className="sm:col-span-2">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2">
          {dict.admin.stores.location}
        </span>
        <MapPicker
          value={lat != null && lng != null ? { lat, lng } : null}
          onChange={(v: LatLng | null) => {
            form.setValue("lat", v?.lat ?? null);
            form.setValue("lng", v?.lng ?? null);
          }}
        />
      </div>
      {create.error && (
        <p className="rounded-md bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger sm:col-span-2">
          {create.error.message}
        </p>
      )}
      <FormActions>
        <Button variant="secondary" onClick={props.onDone} disabled={create.isPending}>
          {dict.admin.stores.cancel}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? dict.admin.stores.saving : dict.admin.stores.register}
        </Button>
      </FormActions>
    </form>
  );
}

function UpdateStoreForm(props: {
  store: StoreRowData;
  routes: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const { store } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const update = trpc.admin.stores.update.useMutation({
    onSuccess() {
      void utils.admin.stores.list.invalidate();
      void utils.admin.suki.exposure.invalidate();
      props.onDone();
    },
  });

  const [limitDraft, setLimitDraft] = useState(
    (Number(store.sukiLimitCentavos) / 100).toString(),
  );
  const form = useForm<UpdateStoreInput>({
    resolver: zodResolver(updateStoreInput),
    defaultValues: {
      id: store.id,
      name: store.name,
      ownerName: store.ownerName,
      addressLine: store.addressLine ?? undefined,
      lat: store.lat,
      lng: store.lng,
      routeId: store.routeId,
      stopOrder: store.stopOrder,
      sukiLimitCentavos: Number(store.sukiLimitCentavos),
    },
  });
  const lat = form.watch("lat");
  const lng = form.watch("lng");

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => update.mutate(values))}
    >
      <Field label={dict.admin.stores.storeName} error={fieldError(dict, form.formState.errors.name?.message)}>
        <Input {...form.register("name")} />
      </Field>
      <Field label={dict.admin.stores.ownerName} error={fieldError(dict, form.formState.errors.ownerName?.message)}>
        <Input {...form.register("ownerName")} />
      </Field>
      <Field label={dict.admin.stores.address} error={fieldError(dict, form.formState.errors.addressLine?.message)}>
        <Input {...form.register("addressLine")} />
      </Field>
      <Field label={dict.admin.stores.route}>
        <RouteSelect
          routes={props.routes}
          noRouteLabel={dict.admin.stores.noRoute}
          defaultValue={store.routeId ?? ""}
          {...form.register("routeId", {
            setValueAs: (v: string) => (v === "" ? null : v),
          })}
        />
      </Field>
      <Field label={dict.admin.stores.stopOrder} error={fieldError(dict, form.formState.errors.stopOrder?.message)}>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="hal. 3"
          {...form.register("stopOrder", {
            setValueAs: (v: string) => (v === "" || v === null ? null : Number(v)),
          })}
        />
      </Field>
      <PesoLimitField
        dict={dict}
        draft={limitDraft}
        onDraft={(v) => {
          setLimitDraft(v);
          const centavos = pesosToCentavos(v);
          form.setValue("sukiLimitCentavos", centavos ?? -1, { shouldValidate: true });
        }}
        error={fieldError(dict, form.formState.errors.sukiLimitCentavos?.message)}
      />
      <div className="sm:col-span-2">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2">
          {dict.admin.stores.location}
        </span>
        <MapPicker
          value={lat != null && lng != null ? { lat, lng } : null}
          onChange={(v: LatLng | null) => {
            form.setValue("lat", v?.lat ?? null);
            form.setValue("lng", v?.lng ?? null);
          }}
        />
      </div>
      <p className="px-1 text-[13px] text-ink-3 sm:col-span-2">
        {interpolate(dict.admin.stores.mobileNote, { phone: formatPhone(store.phoneE164) })}
      </p>
      {update.error && (
        <p className="rounded-md bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger sm:col-span-2">
          {update.error.message}
        </p>
      )}
      <FormActions>
        <Button variant="secondary" onClick={props.onDone} disabled={update.isPending}>
          {dict.admin.stores.cancel}
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? dict.admin.stores.saving : dict.admin.stores.save}
        </Button>
      </FormActions>
    </form>
  );
}
