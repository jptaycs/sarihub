"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
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
  const dict = useDictionary();
  const catalogQuery = trpc.admin.catalog.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (catalogQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="title-large">{dict.admin.catalog.title}</h2>
        <div className="flex gap-1.5">
          {!uploading && (
            <Button variant="secondary" onClick={() => setUploading(true)}>
              {dict.admin.catalog.csvImport.uploadButton}
            </Button>
          )}
          {!creating && (
            <Button onClick={() => setCreating(true)}>{dict.admin.catalog.newProduct}</Button>
          )}
        </div>
      </div>

      {uploading && <CsvImportPanel onDone={() => setUploading(false)} />}

      {creating && (
        <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
          <h3 className="text-[14px] font-medium">{dict.admin.catalog.newProductHeading}</h3>
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

function CsvImportPanel(props: { onDone: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const importCsv = trpc.admin.catalog.importCsv.useMutation({
    onSuccess() {
      void utils.admin.catalog.list.invalidate();
    },
  });

  return (
    <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
      <h3 className="text-[14px] font-medium">{dict.admin.catalog.csvImport.panelHeading}</h3>
      <p className="mt-1 text-[13px] text-ink-2">{dict.admin.catalog.csvImport.formatHint}</p>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[13px] text-ink-2">{dict.admin.catalog.csvImport.fileLabel}</span>
        <input
          type="file"
          accept=".csv"
          disabled={importCsv.isPending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const csv = await file.text();
            importCsv.mutate({ csv });
            e.target.value = "";
          }}
          className="block w-full text-[13px]"
        />
      </label>

      {importCsv.isPending && (
        <p className="mt-2 text-[13px] text-ink-2">{dict.admin.catalog.csvImport.uploading}</p>
      )}

      {importCsv.error && (
        <p className="mt-2 text-[13px] font-medium text-danger">{importCsv.error.message}</p>
      )}

      {importCsv.data && (
        <div className="mt-2.5 rounded-md bg-success-soft px-3 py-2.5 text-[13px] text-success">
          <p className="font-medium">
            {interpolate(dict.admin.catalog.csvImport.resultSummary, {
              created: importCsv.data.created,
              updated: importCsv.data.updated,
              priceRowsInserted: importCsv.data.priceRowsInserted,
            })}
          </p>
          {importCsv.data.skipped.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-warning">
                {interpolate(dict.admin.catalog.csvImport.skippedHeading, {
                  count: importCsv.data.skipped.length,
                })}
              </p>
              <ul className="mt-1 list-disc pl-4 text-ink-2">
                {importCsv.data.skipped.map((s) => (
                  <li key={s.row}>
                    {interpolate(dict.admin.catalog.csvImport.skippedRow, { row: s.row, reason: s.reason })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Button variant="secondary" block className="mt-3" onClick={props.onDone}>
        {dict.admin.catalog.csvImport.cancel}
      </Button>
    </div>
  );
}

function ProductRow(props: { product: CatalogProduct }) {
  const { product } = props;
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  return (
    <Card className={cn("mb-3 px-4 py-3.5", !product.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="lbl-tag">{product.nameTl}</span>
          <span className="lbl-en">{product.nameEn}</span>
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
            {dict.productCategories[product.category]}
          </span>
          <span className="text-xs text-ink-3">
            {product.source === "palengke"
              ? dict.admin.catalog.sourcePalengkeShort
              : dict.admin.catalog.sourceWarehouseShort}
            {product.isPerishable && ` · ${dict.admin.catalog.perishableShort}`}
          </span>
          {!product.isActive && (
            <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-danger">
              {dict.admin.catalog.inactiveBadge}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            className="h-9 px-3 text-[13px]"
            onClick={() => setEditing(!editing)}
          >
            {editing ? dict.admin.catalog.close : dict.admin.catalog.edit}
          </Button>
          <Button
            variant="ghost"
            className="h-9 px-3 text-[13px]"
            onClick={() => setAddingUnit(!addingUnit)}
          >
            {addingUnit ? dict.admin.catalog.close : dict.admin.catalog.addUnit}
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
          <h4 className="text-[13px] font-medium">
            {interpolate(dict.admin.catalog.newUnitHeading, { name: product.nameTl })}
          </h4>
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
                {unit.weightGrams !== null ? `${unit.weightGrams} g` : dict.admin.catalog.noWeight}
              </span>
            </button>
          ),
        )}
      </div>
    </Card>
  );
}

function ProductForm(props: { product?: CatalogProduct; onDone: () => void }) {
  const { product } = props;
  const dict = useDictionary();
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
      : { isPerishable: false, source: "palengke", category: "gulay", isActive: true },
  });

  return (
    <form
      className="mt-2 grid gap-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => upsert.mutate(values))}
    >
      <Field label={dict.admin.catalog.productNameTl} error={form.formState.errors.nameTl?.message}>
        <Input {...form.register("nameTl")} placeholder="Sibuyas" />
      </Field>
      <Field label={dict.admin.catalog.productNameEn} error={form.formState.errors.nameEn?.message}>
        <Input {...form.register("nameEn")} placeholder="Red onion" />
      </Field>
      <Field label={dict.admin.catalog.category} error={form.formState.errors.category?.message}>
        <select
          {...form.register("category")}
          className="h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        >
          <option value="gulay">{dict.productCategories.gulay}</option>
          <option value="itlog">{dict.productCategories.itlog}</option>
          <option value="isda">{dict.productCategories.isda}</option>
          <option value="kusina">{dict.productCategories.kusina}</option>
        </select>
      </Field>
      <Field label={dict.admin.catalog.source}>
        <select
          {...form.register("source")}
          className="h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        >
          <option value="palengke">{dict.admin.catalog.sourcePalengke}</option>
          <option value="warehouse">{dict.admin.catalog.sourceWarehouse}</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" {...form.register("isPerishable")} className="h-5 w-5" />
        {dict.admin.catalog.perishable}
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" {...form.register("isActive")} className="h-5 w-5" />
        {dict.admin.catalog.active}
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          {dict.admin.catalog.cancel}
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? dict.admin.catalog.saving : dict.admin.catalog.save}
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
  const dict = useDictionary();
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
      <Field label={dict.admin.catalog.unitLabelTl} error={form.formState.errors.labelTl?.message}>
        <Input {...form.register("labelTl")} placeholder="1 kilo" />
      </Field>
      <Field label={dict.admin.catalog.unitLabelEn} error={form.formState.errors.labelEn?.message}>
        <Input {...form.register("labelEn")} placeholder="per kg" />
      </Field>
      <Field label={dict.admin.catalog.sortOrder} error={form.formState.errors.sortOrder?.message}>
        <Input {...form.register("sortOrder")} placeholder="01" />
      </Field>
      <Field
        label={dict.admin.catalog.weightGrams}
        error={form.formState.errors.weightGrams?.message}
      >
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
        {dict.admin.catalog.unitActive}
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          {dict.admin.catalog.cancel}
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? dict.admin.catalog.saving : dict.admin.catalog.save}
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
