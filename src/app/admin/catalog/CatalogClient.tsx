"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import {
  upsertProductInput,
  upsertUnitInput,
  type UpsertProductInput,
  type UpsertUnitInput,
} from "~/lib/schemas/admin";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CatalogList = RouterOutputs["admin"]["catalog"]["list"];
type CatalogProduct = CatalogList[number];
type CatalogUnit = CatalogProduct["units"][number];

export function CatalogClient() {
  const catalogQuery = trpc.admin.catalog.list.useQuery();
  const [creating, setCreating] = useState(false);

  if (catalogQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">Nilo-load…</p>;
  }
  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">
        May problema sa koneksyon. I-refresh ang page.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium">Katalogo</h2>
        {!creating && <Button onClick={() => setCreating(true)}>Bagong produkto</Button>}
      </div>

      {creating && (
        <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
          <h3 className="text-[14px] font-medium">Bagong produkto</h3>
          <ProductForm onDone={() => setCreating(false)} />
        </div>
      )}

      <div className="mt-3">
        {catalogQuery.data.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductRow(props: { product: CatalogProduct }) {
  const { product } = props;
  const [editing, setEditing] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  return (
    <div className={cn("hair-b py-3.5", !product.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="lbl-tag">{product.nameTl}</span>
          <span className="lbl-en">{product.nameEn}</span>
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs capitalize text-ink-2">
            {product.category}
          </span>
          <span className="text-xs text-ink-3">
            {product.source === "palengke" ? "palengke" : "bodega"}
            {product.isPerishable && " · nabubulok"}
          </span>
          {!product.isActive && (
            <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-danger">
              Hindi aktibo
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            className="h-9 px-3 text-[13px]"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Isara" : "I-edit"}
          </Button>
          <Button
            variant="ghost"
            className="h-9 px-3 text-[13px]"
            onClick={() => setAddingUnit(!addingUnit)}
          >
            {addingUnit ? "Isara" : "Dagdag unit"}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-2 rounded-md border border-hair bg-white px-4 py-3">
          <ProductForm product={product} onDone={() => setEditing(false)} />
        </div>
      )}

      {addingUnit && (
        <div className="mt-2 rounded-md border border-hair bg-white px-4 py-3">
          <h4 className="text-[13px] font-medium">Bagong unit para sa {product.nameTl}</h4>
          <UnitForm productId={product.id} onDone={() => setAddingUnit(false)} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {product.units.map((unit) =>
          editingUnitId === unit.id ? (
            <div key={unit.id} className="w-full rounded-md border border-hair bg-white px-4 py-3">
              <UnitForm
                productId={product.id}
                unit={unit}
                onDone={() => setEditingUnitId(null)}
              />
            </div>
          ) : (
            <button
              key={unit.id}
              type="button"
              onClick={() => setEditingUnitId(unit.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md border border-hair-strong bg-white px-3 text-[13px] hover:bg-surface-2",
                !unit.isActive && "border-hair text-ink-3 line-through",
              )}
            >
              <span className="font-medium">{unit.labelTl}</span>
              <span className="text-ink-3">
                {unit.weightGrams !== null ? `${unit.weightGrams} g` : "walang timbang"}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ProductForm(props: { product?: CatalogProduct; onDone: () => void }) {
  const { product } = props;
  const utils = trpc.useUtils();
  const upsert = trpc.admin.catalog.upsertProduct.useMutation({
    onSuccess() {
      void utils.admin.catalog.list.invalidate();
      props.onDone();
    },
  });

  const form = useForm<UpsertProductInput>({
    resolver: zodResolver(upsertProductInput),
    defaultValues: product
      ? {
          id: product.id,
          nameTl: product.nameTl,
          nameEn: product.nameEn,
          category: product.category,
          isPerishable: product.isPerishable,
          source: product.source,
          isActive: product.isActive,
        }
      : { isPerishable: false, source: "palengke", isActive: true },
  });

  return (
    <form
      className="mt-2 grid gap-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => upsert.mutate(values))}
    >
      <Field label="Pangalan (Tagalog)" error={form.formState.errors.nameTl?.message}>
        <Input {...form.register("nameTl")} placeholder="Sibuyas" />
      </Field>
      <Field label="Pangalan (English)" error={form.formState.errors.nameEn?.message}>
        <Input {...form.register("nameEn")} placeholder="Red onion" />
      </Field>
      <Field label="Kategorya" error={form.formState.errors.category?.message}>
        <Input {...form.register("category")} placeholder="gulay" />
      </Field>
      <Field label="Pinagmulan">
        <select
          {...form.register("source")}
          className="h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        >
          <option value="palengke">Palengke (araw-araw ang presyo)</option>
          <option value="warehouse">Bodega</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" {...form.register("isPerishable")} className="h-5 w-5" />
        Nabubulok (perishable)
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" {...form.register("isActive")} className="h-5 w-5" />
        Aktibo (lalabas sa katalogo)
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          Huwag
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Sine-save…" : "I-save"}
        </Button>
      </div>
      {upsert.error && (
        <p className="text-[13px] font-medium text-danger sm:col-span-2">
          {upsert.error.message}
        </p>
      )}
    </form>
  );
}

function UnitForm(props: { productId: string; unit?: CatalogUnit; onDone: () => void }) {
  const { unit } = props;
  const utils = trpc.useUtils();
  const upsert = trpc.admin.catalog.upsertUnit.useMutation({
    onSuccess() {
      void utils.admin.catalog.list.invalidate();
      props.onDone();
    },
  });

  const form = useForm<UpsertUnitInput>({
    resolver: zodResolver(upsertUnitInput),
    defaultValues: unit
      ? {
          id: unit.id,
          productId: props.productId,
          labelTl: unit.labelTl,
          labelEn: unit.labelEn,
          sortOrder: unit.sortOrder,
          weightGrams: unit.weightGrams,
          isActive: unit.isActive,
        }
      : { productId: props.productId, sortOrder: "01", weightGrams: null, isActive: true },
  });

  return (
    <form
      className="mt-2 grid gap-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => upsert.mutate(values))}
    >
      <Field label="Label (Tagalog)" error={form.formState.errors.labelTl?.message}>
        <Input {...form.register("labelTl")} placeholder="1 kilo" />
      </Field>
      <Field label="Label (English)" error={form.formState.errors.labelEn?.message}>
        <Input {...form.register("labelEn")} placeholder="per kg" />
      </Field>
      <Field label="Ayos (sort)" error={form.formState.errors.sortOrder?.message}>
        <Input {...form.register("sortOrder")} placeholder="01" />
      </Field>
      <Field label="Timbang (gramo)" error={form.formState.errors.weightGrams?.message}>
        <Input
          type="number"
          inputMode="numeric"
          {...form.register("weightGrams", {
            setValueAs: (v: string) => (v === "" || v === null ? null : Number(v)),
          })}
          placeholder="1000"
        />
      </Field>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" {...form.register("isActive")} className="h-5 w-5" />
        Aktibo
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          Huwag
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Sine-save…" : "I-save"}
        </Button>
      </div>
      {upsert.error && (
        <p className="text-[13px] font-medium text-danger sm:col-span-2">
          {upsert.error.message}
        </p>
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
