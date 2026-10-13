"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Upload } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
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

import {
  AdminSheet,
  CheckRow,
  checkboxClass,
  ErrorState,
  Field,
  FormActions,
  LoadingState,
  PageHeader,
  selectClass,
  selectStyle,
} from "../_components/ui";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CatalogList = RouterOutputs["admin"]["catalog"]["list"];
type CatalogProduct = CatalogList[number];
type CatalogUnit = CatalogProduct["units"][number];

/** Desktop table columns: product · category · source · units · actions. */
const ROW_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,2.4fr)_auto] lg:items-center lg:gap-5";

export function CatalogClient() {
  const dict = useDictionary();
  const catalogQuery = trpc.admin.catalog.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (catalogQuery.isLoading) return <LoadingState />;
  if (catalogQuery.error || !catalogQuery.data) return <ErrorState />;

  return (
    <div>
      <PageHeader
        title={dict.admin.catalog.title}
        actions={
          <>
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setUploading(true)}>
              <Upload size={18} strokeWidth={2.25} />
              <span className="truncate">{dict.admin.catalog.csvImport.uploadButton}</span>
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => setCreating(true)}>
              <Plus size={18} strokeWidth={2.5} />
              {dict.admin.catalog.newProduct}
            </Button>
          </>
        }
      />

      {uploading && (
        <AdminSheet
          title={dict.admin.catalog.csvImport.panelHeading}
          onClose={() => setUploading(false)}
        >
          <CsvImportPanel onDone={() => setUploading(false)} />
        </AdminSheet>
      )}

      {creating && (
        <AdminSheet title={dict.admin.catalog.newProductHeading} onClose={() => setCreating(false)}>
          <ProductForm onDone={() => setCreating(false)} />
        </AdminSheet>
      )}

      <Card className="mt-6">
        <div
          className={cn(
            "hair-b hidden px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3",
            ROW_GRID,
          )}
        >
          <span>{dict.admin.catalog.productColumn}</span>
          <span>{dict.admin.catalog.category}</span>
          <span>{dict.admin.catalog.source}</span>
          <span>{dict.admin.catalog.unitsColumn}</span>
          <span />
        </div>
        {catalogQuery.data.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </Card>
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
    <div>
      <p className="rounded-md bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
        {dict.admin.catalog.csvImport.formatHint}
      </p>

      <label className="mt-4 block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2">
          {dict.admin.catalog.csvImport.fileLabel}
        </span>
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
          className="block w-full min-w-0 rounded-md bg-surface-2 p-1.5 text-[14px] text-ink-2 file:mr-3 file:h-11 file:cursor-pointer file:rounded-pill file:border-0 file:bg-action file:px-5 file:text-[14px] file:font-semibold file:text-white"
        />
      </label>

      {importCsv.isPending && (
        <p className="mt-3 text-[14px] text-ink-2">{dict.admin.catalog.csvImport.uploading}</p>
      )}

      {importCsv.error && (
        <p className="mt-3 rounded-md bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">
          {importCsv.error.message}
        </p>
      )}

      {importCsv.data && (
        <div className="mt-3 rounded-md bg-success-soft px-4 py-3 text-[14px] text-success">
          <p className="font-semibold">
            {interpolate(dict.admin.catalog.csvImport.resultSummary, {
              created: importCsv.data.created,
              updated: importCsv.data.updated,
              priceRowsInserted: importCsv.data.priceRowsInserted,
            })}
          </p>
          {importCsv.data.skipped.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-warning">
                {interpolate(dict.admin.catalog.csvImport.skippedHeading, {
                  count: importCsv.data.skipped.length,
                })}
              </p>
              <ul className="mt-1 list-disc break-words pl-4 text-ink-2">
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

      <Button variant="secondary" block className="mt-4" onClick={props.onDone}>
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
  const editingUnit = product.units.find((u) => u.id === editingUnitId);

  return (
    <div className={cn("hair-b px-4 py-4 last:border-b-0 sm:px-5", ROW_GRID)}>
      <div className={cn("min-w-0", !product.isActive && "opacity-60")}>
        <p className="lbl-tag truncate">{product.nameTl}</p>
        <p className="lbl-en truncate">{product.nameEn}</p>
      </div>

      <div className={cn("mt-2 flex flex-wrap items-center gap-1.5 lg:contents", !product.isActive && "opacity-60")}>
        <span className="w-fit rounded-pill bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 lg:justify-self-start">
          {dict.productCategories[product.category]}
        </span>
        <span className="text-[13px] text-ink-2">
          {product.source === "palengke"
            ? dict.admin.catalog.sourcePalengkeShort
            : dict.admin.catalog.sourceWarehouseShort}
          {product.isPerishable && ` · ${dict.admin.catalog.perishableShort}`}
          {!product.isActive && (
            <span className="ml-1.5 inline-block rounded-pill bg-danger-soft px-2 py-0.5 text-[12px] font-medium text-danger lg:ml-0 lg:mt-1 lg:block lg:w-fit">
              {dict.admin.catalog.inactiveBadge}
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 lg:mt-0">
        {product.units.map((unit) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => setEditingUnitId(unit.id)}
            className={cn(
              "inline-flex h-11 max-w-full items-center gap-2 rounded-pill bg-surface-2 px-4 text-[14px] transition-colors hover:bg-hair lg:h-9 lg:px-3 lg:text-[13px]",
              !unit.isActive && "text-ink-3 line-through",
            )}
          >
            <span className="truncate font-semibold">{unit.labelTl}</span>
            <span className="shrink-0 text-ink-3">
              {unit.weightGrams !== null ? `${unit.weightGrams} g` : dict.admin.catalog.noWeight}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2 lg:mt-0 lg:justify-end">
        <Button
          variant="secondary"
          className="h-11 flex-1 px-4 text-[14px] lg:h-9 lg:flex-none lg:px-3 lg:text-[13px]"
          onClick={() => setEditing(true)}
        >
          <Pencil size={15} strokeWidth={2.25} />
          {dict.admin.catalog.edit}
        </Button>
        <Button
          variant="secondary"
          className="h-11 flex-1 px-4 text-[14px] lg:h-9 lg:flex-none lg:px-3 lg:text-[13px]"
          onClick={() => setAddingUnit(true)}
        >
          <Plus size={15} strokeWidth={2.5} />
          {dict.admin.catalog.addUnit}
        </Button>
      </div>

      {editing && (
        <AdminSheet title={dict.admin.catalog.editProductHeading} onClose={() => setEditing(false)}>
          <ProductForm product={product} onDone={() => setEditing(false)} />
        </AdminSheet>
      )}

      {addingUnit && (
        <AdminSheet
          title={interpolate(dict.admin.catalog.newUnitHeading, { name: product.nameTl })}
          onClose={() => setAddingUnit(false)}
        >
          <UnitForm productId={product.id} onDone={() => setAddingUnit(false)} />
        </AdminSheet>
      )}

      {editingUnit && (
        <AdminSheet
          title={interpolate(dict.admin.catalog.editUnitHeading, { name: product.nameTl })}
          onClose={() => setEditingUnitId(null)}
        >
          <UnitForm
            productId={product.id}
            unit={editingUnit}
            onDone={() => setEditingUnitId(null)}
          />
        </AdminSheet>
      )}
    </div>
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
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => upsert.mutate(values))}
    >
      <Field label={dict.admin.catalog.productNameTl} error={form.formState.errors.nameTl?.message}>
        <Input {...form.register("nameTl")} placeholder="Sibuyas" />
      </Field>
      <Field label={dict.admin.catalog.productNameEn} error={form.formState.errors.nameEn?.message}>
        <Input {...form.register("nameEn")} placeholder="Red onion" />
      </Field>
      <Field label={dict.admin.catalog.category} error={form.formState.errors.category?.message}>
        <select {...form.register("category")} className={selectClass} style={selectStyle}>
          <option value="gulay">{dict.productCategories.gulay}</option>
          <option value="itlog">{dict.productCategories.itlog}</option>
          <option value="isda">{dict.productCategories.isda}</option>
          <option value="kusina">{dict.productCategories.kusina}</option>
        </select>
      </Field>
      <Field label={dict.admin.catalog.source}>
        <select {...form.register("source")} className={selectClass} style={selectStyle}>
          <option value="palengke">{dict.admin.catalog.sourcePalengke}</option>
          <option value="warehouse">{dict.admin.catalog.sourceWarehouse}</option>
        </select>
      </Field>
      <CheckRow label={dict.admin.catalog.perishable}>
        <input type="checkbox" {...form.register("isPerishable")} className={checkboxClass} />
      </CheckRow>
      <CheckRow label={dict.admin.catalog.active}>
        <input type="checkbox" {...form.register("isActive")} className={checkboxClass} />
      </CheckRow>
      {upsert.error && (
        <p className="rounded-md bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger sm:col-span-2">
          {upsert.error.message}
        </p>
      )}
      <FormActions>
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          {dict.admin.catalog.cancel}
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? dict.admin.catalog.saving : dict.admin.catalog.save}
        </Button>
      </FormActions>
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
      className="grid gap-4 sm:grid-cols-2"
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
      <CheckRow label={dict.admin.catalog.unitActive}>
        <input type="checkbox" {...form.register("isActive")} className={checkboxClass} />
      </CheckRow>
      {upsert.error && (
        <p className="rounded-md bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger sm:col-span-2">
          {upsert.error.message}
        </p>
      )}
      <FormActions>
        <Button variant="secondary" onClick={props.onDone} disabled={upsert.isPending}>
          {dict.admin.catalog.cancel}
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? dict.admin.catalog.saving : dict.admin.catalog.save}
        </Button>
      </FormActions>
    </form>
  );
}
