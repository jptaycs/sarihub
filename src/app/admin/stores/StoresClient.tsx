"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatPeso, formatPhone, pesosToCentavos } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import {
  createStoreInput,
  updateStoreInput,
  type CreateStoreInput,
  type UpdateStoreInput,
} from "~/lib/schemas/admin";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type StoreList = RouterOutputs["admin"]["stores"]["list"];
type StoreRowData = StoreList[number];

export function StoresClient() {
  const dict = useDictionary();
  const storesQuery = trpc.admin.stores.list.useQuery();
  const routesQuery = trpc.admin.stores.routes.useQuery();
  const [creating, setCreating] = useState(false);

  if (storesQuery.isLoading || routesQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (storesQuery.error || routesQuery.error || !storesQuery.data || !routesQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const routes = routesQuery.data;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium">{dict.admin.stores.title}</h2>
        {!creating && (
          <Button onClick={() => setCreating(true)}>{dict.admin.stores.newStore}</Button>
        )}
      </div>

      {creating && (
        <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
          <h3 className="text-[14px] font-medium">{dict.admin.stores.newStore}</h3>
          <p className="mt-1 text-[13px] text-ink-2">{dict.admin.stores.newStoreHint}</p>
          <CreateStoreForm routes={routes} onDone={() => setCreating(false)} />
        </div>
      )}

      <div className="mt-3">
        {storesQuery.data.map((store) => (
          <StoreRow key={store.id} store={store} routes={routes} />
        ))}
        {storesQuery.data.length === 0 && (
          <p className="pt-8 text-center text-[13px] text-ink-2">{dict.admin.stores.empty}</p>
        )}
      </div>
    </div>
  );
}

function StoreRow(props: { store: StoreRowData; routes: Array<{ id: string; name: string }> }) {
  const { store } = props;
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);

  return (
    <div className="hair-b py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[14px] font-medium">{store.name}</span>
          <span className="ml-2 text-[13px] text-ink-2">
            {store.ownerName} · {formatPhone(store.phoneE164)}
          </span>
          <div className="mt-0.5 text-[13px] text-ink-3">
            {store.routeName ?? dict.admin.stores.noRoute}
            {store.addressLine ? ` · ${store.addressLine}` : ""}
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="price text-[13px] text-ink-2">
            {interpolate(dict.admin.stores.tabLabel, {
              balance: formatPeso(store.sukiBalanceCentavos),
              limit: formatPeso(store.sukiLimitCentavos),
            })}
          </span>
          <Button
            variant="ghost"
            className="h-9 px-3 text-[13px]"
            onClick={() => setEditing(!editing)}
          >
            {editing ? dict.admin.stores.close : dict.admin.stores.edit}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-2 rounded-md border border-hair bg-white px-4 py-3">
          <UpdateStoreForm store={store} routes={props.routes} onDone={() => setEditing(false)} />
        </div>
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
    <select
      {...rest}
      className={cn("h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]", className)}
    >
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
    <div>
      <label className="mb-1 block text-[13px] text-ink-2">{props.dict.admin.stores.sukiLimit}</label>
      <div className="flex h-tap items-center gap-1 rounded-md border border-hair-strong bg-white px-3">
        <span className="text-ink-2">₱</span>
        <input
          inputMode="decimal"
          value={props.draft}
          onChange={(e) => props.onDraft(e.target.value)}
          placeholder="2,000.00"
          className="price w-full bg-transparent text-[15px] outline-none"
          aria-label={props.dict.admin.stores.sukiLimitAria}
        />
      </div>
      {props.error && <p className="mt-1 text-xs font-medium text-danger">{props.error}</p>}
    </div>
  );
}

function CreateStoreForm(props: {
  routes: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const create = trpc.admin.stores.create.useMutation({
    onSuccess() {
      void utils.admin.stores.list.invalidate();
      void utils.admin.suki.exposure.invalidate();
      props.onDone();
    },
  });

  const [limitDraft, setLimitDraft] = useState("2000");
  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreInput),
    defaultValues: { routeId: null, stopOrder: null, sukiLimitCentavos: 200000 },
  });

  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => create.mutate(values))}
    >
      <Field label={dict.admin.stores.storeName} error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} placeholder="Tindahan ni Marisa" />
      </Field>
      <Field label={dict.admin.stores.ownerName} error={form.formState.errors.ownerName?.message}>
        <Input {...form.register("ownerName")} placeholder="Aling Marisa" />
      </Field>
      <Field label={dict.admin.stores.ownerMobile} error={form.formState.errors.phone?.message}>
        <Input {...form.register("phone")} inputMode="tel" placeholder="0917 123 4567" />
      </Field>
      <Field label={dict.admin.stores.address} error={form.formState.errors.addressLine?.message}>
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
      <Field label={dict.admin.stores.stopOrder} error={form.formState.errors.stopOrder?.message}>
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
        error={form.formState.errors.sukiLimitCentavos ? dict.admin.stores.invalidAmount : undefined}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={create.isPending}>
          {dict.admin.stores.cancel}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? dict.admin.stores.saving : dict.admin.stores.register}
        </Button>
      </div>
      {create.error && (
        <p className="text-[13px] font-medium text-danger sm:col-span-2">{create.error.message}</p>
      )}
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
      routeId: store.routeId,
      stopOrder: store.stopOrder,
      sukiLimitCentavos: Number(store.sukiLimitCentavos),
    },
  });

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => update.mutate(values))}
    >
      <Field label={dict.admin.stores.storeName} error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label={dict.admin.stores.ownerName} error={form.formState.errors.ownerName?.message}>
        <Input {...form.register("ownerName")} />
      </Field>
      <Field label={dict.admin.stores.address} error={form.formState.errors.addressLine?.message}>
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
      <Field label={dict.admin.stores.stopOrder} error={form.formState.errors.stopOrder?.message}>
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
        error={form.formState.errors.sukiLimitCentavos ? dict.admin.stores.invalidAmount : undefined}
      />
      <div className="flex items-end text-[13px] text-ink-3">
        {interpolate(dict.admin.stores.mobileNote, { phone: formatPhone(store.phoneE164) })}
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={update.isPending}>
          {dict.admin.stores.cancel}
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? dict.admin.stores.saving : dict.admin.stores.save}
        </Button>
      </div>
      {update.error && (
        <p className="text-[13px] font-medium text-danger sm:col-span-2">{update.error.message}</p>
      )}
    </form>
  );
}

function Field(props: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-ink-2">{props.label}</label>
      {props.children}
      {props.error && <p className="mt-1 text-xs font-medium text-danger">{props.error}</p>}
    </div>
  );
}
