"use client";

import { useMemo, useState } from "react";
import { Banknote, Minus, Plus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Stepper } from "~/components/ui/Stepper";
import { cn } from "~/lib/cn";
import { formatPeso } from "~/lib/format";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { CrewPage, StatusText } from "../_components/CrewPage";
import { CrewSheet } from "../_components/CrewSheet";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type StockRow = RouterOutputs["crew"]["stock"]["rows"][number];

export function StockClient() {
  const dict = useDictionary();
  return (
    <CrewPage title={dict.crew.stock.title}>
      {({ routeId }) => <StockBoard routeId={routeId} />}
    </CrewPage>
  );
}

function StockBoard(props: { routeId: string }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const stockQuery = trpc.crew.stock.useQuery({ routeId: props.routeId }, { refetchInterval: 60_000 });
  const [notice, setNotice] = useState<string | null>(null);
  const [movement, setMovement] = useState<{ row: StockRow; kind: "add" | "reduce" } | null>(null);
  const loadAll = trpc.crew.loadFromOrders.useMutation({
    onSuccess(result) {
      setNotice(
        result.loadedUnits > 0
          ? interpolate(dict.crew.stock.loadAllDone, { count: result.loadedUnits })
          : dict.crew.stock.loadAllNothing,
      );
      void utils.crew.stock.invalidate();
    },
  });

  /** Rows grouped by product, catalog order preserved. */
  const groups = useMemo(() => {
    const out: Array<{ productId: string; nameTl: string; nameEn: string; rows: StockRow[] }> = [];
    const byId = new Map<string, (typeof out)[number]>();
    for (const row of stockQuery.data?.rows ?? []) {
      let g = byId.get(row.productId);
      if (!g) {
        g = { productId: row.productId, nameTl: row.nameTl, nameEn: row.nameEn, rows: [] };
        byId.set(row.productId, g);
        out.push(g);
      }
      g.rows.push(row);
    }
    return out;
  }, [stockQuery.data]);

  if (stockQuery.isLoading) return <StatusText>{dict.common.loading}</StatusText>;
  if (stockQuery.error || !stockQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const { cashTodayCentavos, salesToday } = stockQuery.data;
  const anyNegative = stockQuery.data.rows.some((r) => r.onHand < 0);

  return (
    <div className="mt-5">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-[14px] text-ink-2">
          <Banknote size={18} strokeWidth={1.75} className="shrink-0" />
          {dict.crew.stock.cashToday}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="price text-[28px] font-bold leading-tight tracking-tight">
            {formatPeso(cashTodayCentavos)}
          </span>
          <span className="tnum text-[14px] text-ink-2">
            {interpolate(dict.crew.stock.salesToday, { count: salesToday })}
          </span>
        </div>
        <Button
          size="lg"
          block
          className="mt-4"
          disabled={loadAll.isPending}
          onClick={() => loadAll.mutate({ routeId: props.routeId })}
        >
          {loadAll.isPending ? dict.crew.stock.loading : dict.crew.stock.loadAllButton}
        </Button>
        {loadAll.error && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
            {loadAll.error.message}
          </p>
        )}
        {notice && <p className="mt-2 text-[14px] font-medium text-success">{notice}</p>}
      </Card>

      {anyNegative && (
        <div className="mt-3 rounded-md bg-warning-soft px-4 py-3 text-[14px] leading-snug text-warning">
          {dict.crew.stock.negativeNote}
        </div>
      )}

      {groups.length === 0 && <StatusText>{dict.crew.stock.empty}</StatusText>}

      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <Card key={g.productId} className="p-4">
            <h3 className="lbl-tag truncate">{g.nameTl}</h3>
            <p className="lbl-en truncate">{g.nameEn}</p>
            <ColumnHeader />
            <ul>
              {g.rows.map((row) => (
                <UnitRow
                  key={row.productUnitId}
                  row={row}
                  onAdd={() => setMovement({ row, kind: "add" })}
                  onReduce={() => setMovement({ row, kind: "reduce" })}
                />
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {movement && (
        <MovementSheet
          routeId={props.routeId}
          row={movement.row}
          kind={movement.kind}
          onClose={() => setMovement(null)}
        />
      )}
    </div>
  );
}

const NUM_GRID = "grid grid-cols-5 gap-1 text-center";

function ColumnHeader() {
  const dict = useDictionary();
  const cols = [
    dict.crew.stock.colNeeded,
    dict.crew.stock.colLoaded,
    dict.crew.stock.colSold,
    dict.crew.stock.colDelivered,
    dict.crew.stock.colOnHand,
  ];
  return (
    <div className={cn(NUM_GRID, "mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3")}>
      {cols.map((c) => (
        <span key={c} className="truncate">
          {c}
        </span>
      ))}
    </div>
  );
}

function UnitRow(props: { row: StockRow; onAdd: () => void; onReduce: () => void }) {
  const { row } = props;
  const dict = useDictionary();
  const { locale } = useLocale();
  const label = locale === "en" ? row.unitLabelEn : row.unitLabelTl;
  const onBoard = row.loaded + row.added - row.reduced;
  return (
    <li className="hair-t py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{label}</span>
        <span className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label={interpolate(dict.crew.stock.reduceAria, { name: row.nameTl, unit: label })}
            onClick={props.onReduce}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink transition-transform active:scale-90"
          >
            <Minus size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label={interpolate(dict.crew.stock.addAria, { name: row.nameTl, unit: label })}
            onClick={props.onAdd}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-action text-white transition-transform active:scale-90"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </span>
      </div>
      <div className={cn(NUM_GRID, "tnum mt-2 text-[15px]")}>
        <span className="text-ink-2">{row.needed}</span>
        <span className="text-ink-2">{onBoard}</span>
        <span className="text-ink-2">{row.sold}</span>
        <span className="text-ink-2">{row.delivered}</span>
        <span className={cn("font-bold", row.onHand < 0 ? "text-danger" : "text-ink")}>{row.onHand}</span>
      </div>
    </li>
  );
}

type ReasonKey = "reasonSpoiled" | "reasonDamaged" | "reasonMiscount" | "reasonOther";
const REASONS: ReasonKey[] = ["reasonSpoiled", "reasonDamaged", "reasonMiscount", "reasonOther"];

function MovementSheet(props: {
  routeId: string;
  row: StockRow;
  kind: "add" | "reduce";
  onClose: () => void;
}) {
  const { row, kind } = props;
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const [qty, setQty] = useState(1);
  const [reasonKey, setReasonKey] = useState<ReasonKey | null>(null);
  const [otherText, setOtherText] = useState("");
  const record = trpc.crew.recordMovement.useMutation({
    onSuccess() {
      void utils.crew.stock.invalidate();
      props.onClose();
    },
  });

  const label = locale === "en" ? row.unitLabelEn : row.unitLabelTl;
  const reason =
    kind === "reduce"
      ? reasonKey === "reasonOther"
        ? otherText.trim()
        : reasonKey
          ? dict.crew.stock[reasonKey]
          : ""
      : undefined;
  const canSubmit = qty >= 1 && (kind === "add" || (reason !== undefined && reason.length > 0));

  return (
    <CrewSheet
      title={kind === "add" ? dict.crew.stock.addHeading : dict.crew.stock.reduceHeading}
      subtitle={`${row.nameTl} · ${label}`}
      onClose={props.onClose}
    >
      <div className="mt-5 flex items-center justify-between">
        <span className="text-[15px] text-ink-2">{dict.crew.stock.quantityLabel}</span>
        <Stepper
          qty={qty}
          min={1}
          onChange={setQty}
          decreaseLabel={interpolate(dict.crew.stock.reduceAria, { name: row.nameTl, unit: label })}
          increaseLabel={interpolate(dict.crew.stock.addAria, { name: row.nameTl, unit: label })}
        />
      </div>

      {kind === "reduce" && (
        <div className="mt-5">
          <span className="section-label mb-2 block">{dict.crew.stock.reduceReasonLabel}</span>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={reasonKey === key}
                onClick={() => setReasonKey(key)}
                className={cn(
                  "h-11 rounded-pill px-4 text-[15px] font-semibold transition-transform active:scale-95",
                  reasonKey === key ? "bg-action text-white" : "bg-surface-2 text-ink",
                )}
              >
                {dict.crew.stock[key]}
              </button>
            ))}
          </div>
          {reasonKey === "reasonOther" && (
            <Input
              className="mt-3"
              placeholder={dict.crew.stock.reasonOtherPlaceholder}
              value={otherText}
              maxLength={200}
              onChange={(e) => setOtherText(e.target.value)}
            />
          )}
        </div>
      )}

      {record.error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-danger">
          {record.error.message}
        </p>
      )}

      <Button
        size="lg"
        block
        className="mt-5 h-16 text-[19px]"
        disabled={!canSubmit || record.isPending}
        onClick={() =>
          record.mutate({
            routeId: props.routeId,
            productUnitId: row.productUnitId,
            kind,
            quantity: qty,
            reason: kind === "reduce" ? reason : undefined,
          })
        }
      >
        {record.isPending
          ? dict.crew.stock.saving
          : kind === "add"
            ? dict.crew.stock.confirmAdd
            : dict.crew.stock.confirmReduce}
      </Button>
      <Button variant="ghost" size="lg" block className="mt-2" disabled={record.isPending} onClick={props.onClose}>
        {dict.crew.stock.cancel}
      </Button>
    </CrewSheet>
  );
}
