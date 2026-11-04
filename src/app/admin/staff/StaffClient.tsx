"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatPhone } from "~/lib/format";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { fieldError } from "~/lib/i18n/validation";
import {
  createStaffInput,
  updateStaffInput,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "~/lib/schemas/admin";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import {
  AdminSheet,
  CheckRow,
  EmptyState,
  ErrorState,
  Field,
  FormActions,
  LoadingState,
  PageHeader,
  checkboxClass,
  selectClass,
  selectStyle,
} from "../_components/ui";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type StaffRow = RouterOutputs["admin"]["staff"]["list"][number];
type StaffRole = StaffRow["role"];

const ROLES: StaffRole[] = ["helper", "driver", "buyer", "admin"];

function roleLabel(dict: Dictionary, role: StaffRole): string {
  switch (role) {
    case "admin":
      return dict.admin.staff.roleAdmin;
    case "buyer":
      return dict.admin.staff.roleBuyer;
    case "driver":
      return dict.admin.staff.roleDriver;
    case "helper":
      return dict.admin.staff.roleHelper;
  }
}

/** Desktop table columns: person · role · status · action. */
const ROW_GRID = "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6";

export function StaffClient() {
  const dict = useDictionary();
  const staffQuery = trpc.admin.staff.list.useQuery();
  const [creating, setCreating] = useState(false);

  if (staffQuery.isLoading) return <LoadingState />;
  if (staffQuery.error || !staffQuery.data) return <ErrorState />;

  return (
    <div>
      <PageHeader
        title={dict.admin.staff.title}
        actions={
          <Button className="flex-1 sm:flex-none" onClick={() => setCreating(true)}>
            <Plus size={18} strokeWidth={2.5} />
            {dict.admin.staff.newStaff}
          </Button>
        }
      />

      {creating && (
        <AdminSheet
          title={dict.admin.staff.newStaff}
          subtitle={dict.admin.staff.newStaffHint}
          onClose={() => setCreating(false)}
        >
          <CreateStaffForm onDone={() => setCreating(false)} />
        </AdminSheet>
      )}

      {staffQuery.data.length > 0 ? (
        <Card className="mt-6">
          <div
            className={cn(
              "hair-b hidden px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3",
              ROW_GRID,
            )}
          >
            <span>{dict.admin.staff.name}</span>
            <span>{dict.admin.staff.role}</span>
            <span>{dict.admin.staff.active}</span>
            <span />
          </div>
          {staffQuery.data.map((row) => (
            <StaffRowView key={row.id} row={row} />
          ))}
        </Card>
      ) : (
        <div className="mt-6">
          <EmptyState>{dict.admin.staff.empty}</EmptyState>
        </div>
      )}
    </div>
  );
}

function StaffRowView(props: { row: StaffRow }) {
  const { row } = props;
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);

  return (
    <div className={cn("hair-b px-4 py-4 last:border-b-0 sm:px-5", ROW_GRID, !row.isActive && "opacity-60")}>
      <div className="min-w-0">
        <p className="truncate text-[16px] font-semibold lg:text-[15px]">{row.name}</p>
        <p className="tnum mt-0.5 truncate text-[14px] text-ink-2 lg:text-[13px]">{formatPhone(row.phoneE164)}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 lg:mt-0 lg:contents">
        <span className="w-fit rounded-pill bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink lg:bg-transparent lg:px-0 lg:py-0 lg:text-[14px]">
          {roleLabel(dict, row.role)}
        </span>
        <span
          className={cn(
            "w-fit rounded-pill px-3 py-1.5 text-[13px] font-semibold lg:px-0 lg:py-0 lg:text-[14px]",
            row.isActive ? "bg-success-soft text-success lg:bg-transparent" : "bg-danger-soft text-danger lg:bg-transparent",
          )}
        >
          {row.isActive ? dict.admin.staff.active : dict.admin.staff.inactive}
        </span>
        <span className="ml-auto lg:ml-0">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={15} strokeWidth={2.25} />
            {dict.admin.staff.edit}
          </Button>
        </span>
      </div>

      {editing && (
        <AdminSheet
          title={dict.admin.staff.editHeading}
          subtitle={interpolate(dict.admin.staff.mobileNote, { phone: formatPhone(row.phoneE164) })}
          onClose={() => setEditing(false)}
        >
          <EditStaffForm row={row} onDone={() => setEditing(false)} />
        </AdminSheet>
      )}
    </div>
  );
}

function RoleSelect(props: { value: StaffRole; onChange: (role: StaffRole) => void; id?: string }) {
  const dict = useDictionary();
  return (
    <select
      id={props.id}
      className={selectClass}
      style={selectStyle}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as StaffRole)}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {roleLabel(dict, r)}
        </option>
      ))}
    </select>
  );
}

function CreateStaffForm(props: { onDone: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const create = trpc.admin.staff.create.useMutation({
    onSuccess() {
      void utils.admin.staff.list.invalidate();
      props.onDone();
    },
  });
  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffInput),
    defaultValues: { name: "", phone: "", role: "helper" },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => create.mutate(values))} className="grid gap-4 sm:grid-cols-2">
      <Field label={dict.admin.staff.name} className="sm:col-span-2" error={fieldError(dict, form.formState.errors.name?.message)}>
        <Input {...form.register("name")} autoComplete="off" />
      </Field>
      <Field label={dict.admin.staff.mobile} error={form.formState.errors.phone && dict.admin.errors.invalidPhone}>
        <Input {...form.register("phone")} inputMode="tel" placeholder="0917 123 4567" autoComplete="off" />
      </Field>
      <Field label={dict.admin.staff.role}>
        <RoleSelect value={form.watch("role")} onChange={(r) => form.setValue("role", r)} />
      </Field>

      {create.error && (
        <p role="alert" className="text-[14px] font-medium text-danger sm:col-span-2">
          {create.error.message}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={props.onDone} disabled={create.isPending}>
          {dict.admin.staff.cancel}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? dict.admin.staff.saving : dict.admin.staff.register}
        </Button>
      </FormActions>
    </form>
  );
}

function EditStaffForm(props: { row: StaffRow; onDone: () => void }) {
  const { row } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const update = trpc.admin.staff.update.useMutation({
    onSuccess() {
      void utils.admin.staff.list.invalidate();
      props.onDone();
    },
  });
  const form = useForm<UpdateStaffInput>({
    resolver: zodResolver(updateStaffInput),
    defaultValues: { id: row.id, name: row.name, role: row.role, isActive: row.isActive },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => update.mutate(values))} className="grid gap-4 sm:grid-cols-2">
      <Field label={dict.admin.staff.name} className="sm:col-span-2" error={fieldError(dict, form.formState.errors.name?.message)}>
        <Input {...form.register("name")} autoComplete="off" />
      </Field>
      <Field label={dict.admin.staff.role}>
        <RoleSelect value={form.watch("role")} onChange={(r) => form.setValue("role", r)} />
      </Field>
      <CheckRow label={dict.admin.staff.activeToggle}>
        <input type="checkbox" className={checkboxClass} {...form.register("isActive")} />
      </CheckRow>

      {update.error && (
        <p role="alert" className="text-[14px] font-medium text-danger sm:col-span-2">
          {update.error.message}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={props.onDone} disabled={update.isPending}>
          {dict.admin.staff.cancel}
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? dict.admin.staff.saving : dict.admin.staff.save}
        </Button>
      </FormActions>
    </form>
  );
}
