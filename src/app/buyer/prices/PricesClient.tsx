"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, PackageX, SlidersHorizontal } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card, CardRow } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatManila, now } from "~/lib/datetime";
import { formatPeso, pesosToCentavos } from "~/lib/format";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PriceBoard = RouterOutputs["buyer"]["priceBoard"];
type BoardProduct = PriceBoard["products"][number];
type BoardUnit = BoardProduct["units"][number];

export function PricesClient() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const boardQuery = trpc.buyer.priceBoard.useQuery();
  const carryOver = trpc.buyer.carryOverYesterday.useMutation({
    onSuccess() {
      void utils.buyer.priceBoard.invalidate();
    },
  });
  const [adjusting, setAdjusting] = useState(false);

  if (boardQuery.isLoading) {
    return <StatusText>{dict.common.loading}</StatusText>;
  }
  if (boardQuery.error || !boardQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  const board = boardQuery.data;
  const allUnits = board.products.flatMap((p) => p.units);
  const unpriced = allUnits.filter((u) => u.todayCentavos === null && !u.outOfStockToday);
  const carryable = unpriced.filter((u) => u.previousCentavos !== null);
  const pricedCount = allUnits.filter((u) => u.todayCentavos !== null).length;
  // "Done" = priced or marked out of stock — nothing left for the buyer to do.
  const doneCount = allUnits.length - unpriced.length;
  const progressPct = allUnits.length > 0 ? Math.round((doneCount / allUnits.length) * 100) : 100;
  const complete = unpriced.length === 0;

  return (
    <div className="animate-fade-in pt-4">
      <h1 className="title-large">{dict.buyerPrices.title}</h1>
      <p className="mt-1 text-[15px] text-ink-2">
        {formatManila(now(), "EEEE, d MMM yyyy", locale)}
      </p>

      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="tnum text-[17px] font-semibold tracking-tight">
            {interpolate(dict.buyerPrices.progress, { priced: doneCount, total: allUnits.length })}
          </span>
          {complete && <CheckCircle2 size={26} className="shrink-0 text-success" />}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-2">
          <div
            className={cn(
              "h-full rounded-pill transition-[width] duration-500",
              complete ? "bg-success" : "bg-action",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {complete ? (
          <p className="mt-4 text-[15px] font-medium text-success">{dict.buyerPrices.allPriced}</p>
        ) : (
          <>
            <p className="mt-4 text-[15px] font-medium text-warning">
              {interpolate(dict.buyerPrices.unpricedWarning, { count: unpriced.length })}
            </p>
            {carryable.length > 0 && (
              <Button
                size="lg"
                block
                className="mt-4"
                disabled={carryOver.isPending}
                onClick={() => carryOver.mutate()}
              >
                <Copy size={20} strokeWidth={2} />
                {carryOver.isPending
                  ? dict.buyerPrices.carryingOver
                  : interpolate(dict.buyerPrices.carryOverButton, { count: carryable.length })}
              </Button>
            )}
          </>
        )}

        {carryOver.error && (
          <p className="mt-3 text-[14px] font-medium text-danger">{carryOver.error.message}</p>
        )}
      </Card>

      {adjusting ? (
        <BulkAdjustPanel pricedCount={pricedCount} onDone={() => setAdjusting(false)} />
      ) : (
        <Button variant="secondary" block className="mt-3 bg-surface shadow-[var(--shadow-card)]" onClick={() => setAdjusting(true)}>
          <SlidersHorizontal size={18} strokeWidth={2} />
          {dict.buyerPrices.bulkAdjustButton}
        </Button>
      )}

      <div className="mt-2">
        {board.products.map((product) => (
          <ProductPriceGroup key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function StatusText(props: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p
      className={cn(
        "pt-16 text-center text-[15px]",
        props.danger ? "font-medium text-danger" : "text-ink-2",
      )}
    >
      {props.children}
    </p>
  );
}

/** iOS-style two-option segmented control. */
function Segmented<T extends string>(props: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-md bg-surface-2 p-1">
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={props.value === o.value}
          onClick={() => props.onChange(o.value)}
          className={cn(
            "h-11 flex-1 rounded-sm px-2 text-[15px] font-semibold transition-[background-color,box-shadow]",
            props.value === o.value
              ? "bg-surface text-ink shadow-[var(--shadow-card)]"
              : "text-ink-2 active:bg-hair",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BulkAdjustPanel(props: { pricedCount: number; onDone: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [rawValue, setRawValue] = useState("");
  const [confirming, setConfirming] = useState(false);

  const bulkAdjust = trpc.buyer.bulkAdjustPrices.useMutation({
    onSuccess() {
      setConfirming(false);
      void utils.buyer.priceBoard.invalidate();
    },
  });

  const value = mode === "percent" ? Number(rawValue) : pesosToCentavos(rawValue);
  const canSubmit =
    mode === "percent"
      ? Number.isFinite(value) && (value as number) > 0 && (value as number) <= 100
      : typeof value === "number" && value > 0;

  if (bulkAdjust.data) {
    return (
      <Card className="animate-fade-in mt-3 p-5">
        <div className="flex items-center gap-2.5 text-[15px] font-medium text-success">
          <CheckCircle2 size={22} className="shrink-0" />
          {interpolate(dict.buyerPrices.bulkAdjust.resultSummary, {
            adjusted: bulkAdjust.data.adjusted,
          })}
        </div>
        <Button variant="secondary" block className="mt-4" onClick={props.onDone}>
          {dict.buyerPrices.bulkAdjust.cancel}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in mt-3 p-5">
      <h3 className="text-[19px] font-semibold tracking-tight">
        {dict.buyerPrices.bulkAdjust.heading}
      </h3>

      <div className="mt-4 space-y-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "percent", label: dict.buyerPrices.bulkAdjust.modePercent },
            { value: "fixed", label: dict.buyerPrices.bulkAdjust.modeFixed },
          ]}
        />
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: "up", label: dict.buyerPrices.bulkAdjust.directionUp },
            { value: "down", label: dict.buyerPrices.bulkAdjust.directionDown },
          ]}
        />
      </div>

      <label className="mt-4 block">
        <span className="section-label mb-2 block">{dict.buyerPrices.bulkAdjust.valueLabel}</span>
        <Input
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          placeholder={
            mode === "percent"
              ? dict.buyerPrices.bulkAdjust.valuePlaceholderPercent
              : dict.buyerPrices.bulkAdjust.valuePlaceholderFixed
          }
          className="tnum h-14 text-[20px] font-semibold"
        />
      </label>

      {canSubmit && (
        <p className="mt-2.5 text-[14px] text-ink-2">
          {interpolate(dict.buyerPrices.bulkAdjust.affectedCount, { count: props.pricedCount })}
        </p>
      )}

      {!confirming ? (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="lg" block onClick={props.onDone}>
            {dict.buyerPrices.bulkAdjust.cancel}
          </Button>
          <Button size="lg" block disabled={!canSubmit} onClick={() => setConfirming(true)}>
            {dict.buyerPrices.bulkAdjust.submit}
          </Button>
        </div>
      ) : (
        <div className="animate-fade-in mt-4 rounded-md bg-warning-soft p-4">
          <p className="text-[15px] font-medium text-warning">
            {interpolate(dict.buyerPrices.bulkAdjust.confirmPrompt, { count: props.pricedCount })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              block
              className="bg-surface"
              disabled={bulkAdjust.isPending}
              onClick={() => setConfirming(false)}
            >
              {dict.buyerPrices.bulkAdjust.confirmNo}
            </Button>
            <Button
              size="lg"
              block
              disabled={bulkAdjust.isPending || !canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                bulkAdjust.mutate({ mode, direction, value: value as number });
              }}
            >
              {bulkAdjust.isPending
                ? dict.buyerPrices.bulkAdjust.adjusting
                : dict.buyerPrices.bulkAdjust.confirmYes}
            </Button>
          </div>
        </div>
      )}

      {bulkAdjust.error && (
        <p className="mt-3 text-[14px] font-medium text-danger">{bulkAdjust.error.message}</p>
      )}
    </Card>
  );
}

function ProductPriceGroup(props: { product: BoardProduct }) {
  const { product } = props;
  return (
    <section className="pt-6">
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-[19px] font-semibold tracking-tight">{product.nameTl}</span>
        <span className="text-[14px] text-ink-2">{product.nameEn}</span>
      </div>
      <Card className="mt-2">
        {product.units.map((unit) => (
          <UnitPriceRow key={unit.id} nameTl={product.nameTl} unit={unit} />
        ))}
      </Card>
    </section>
  );
}

function UnitPriceRow(props: { nameTl: string; unit: BoardUnit }) {
  const { nameTl, unit } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmingOos, setConfirmingOos] = useState(false);
  // Brief "Saved" flash so a buyer with wet hands sees the tap landed.
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const setPrice = trpc.buyer.setPrice.useMutation({
    onSuccess() {
      setEditing(false);
      setJustSaved(true);
      void utils.buyer.priceBoard.invalidate();
    },
  });
  const markOos = trpc.buyer.markOutOfStock.useMutation({
    onSuccess() {
      setConfirmingOos(false);
      void utils.buyer.priceBoard.invalidate();
    },
  });

  const draftCentavos = pesosToCentavos(draft);
  const canSave = !setPrice.isPending && draftCentavos !== null && draftCentavos !== 0;

  if (unit.outOfStockToday) {
    return (
      <CardRow className="flex min-h-16 items-center justify-between gap-3">
        <span className="text-[17px] text-ink-3 line-through">{unit.labelTl}</span>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger-soft px-3 py-1.5 text-[13px] font-semibold text-danger">
          <PackageX size={15} strokeWidth={2} />
          {dict.buyerPrices.outOfStockBadge}
        </span>
      </CardRow>
    );
  }

  if (editing) {
    return (
      <CardRow className="animate-fade-in py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSave || draftCentavos === null) return;
            setPrice.mutate({ productUnitId: unit.id, priceCentavos: draftCentavos });
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[17px] font-semibold">{unit.labelTl}</span>
            {unit.previousCentavos !== null && (
              <span className="price text-[14px] text-ink-2">
                {interpolate(dict.buyerPrices.yesterdayPrice, {
                  price: formatPeso(unit.previousCentavos),
                })}
              </span>
            )}
          </div>
          <div className="mt-3 flex h-16 items-center gap-2 rounded-md border-2 border-action bg-surface px-4">
            <span className="text-[24px] font-semibold text-ink-2">₱</span>
            <input
              autoFocus
              inputMode="decimal"
              enterKeyHint="done"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                unit.previousCentavos !== null
                  ? formatPeso(unit.previousCentavos).slice(1)
                  : "0.00"
              }
              className="price w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none placeholder:font-normal placeholder:text-ink-3"
              aria-label={interpolate(dict.buyerPrices.priceInputAria, {
                name: nameTl,
                unit: unit.labelTl,
              })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              block
              disabled={setPrice.isPending}
              onClick={() => setEditing(false)}
            >
              {dict.buyerPrices.cancelEdit}
            </Button>
            <Button type="submit" size="lg" block disabled={!canSave}>
              {setPrice.isPending ? dict.buyerPrices.saving : dict.buyerPrices.save}
            </Button>
          </div>
          {setPrice.error && (
            <p className="mt-3 text-[14px] font-medium text-danger">{setPrice.error.message}</p>
          )}
        </form>
      </CardRow>
    );
  }

  if (confirmingOos) {
    return (
      <CardRow className="animate-fade-in bg-danger-soft py-4">
        <p className="text-[16px] font-medium leading-snug">
          {interpolate(dict.buyerPrices.confirmOos, { name: nameTl, unit: unit.labelTl })}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            block
            className="bg-surface"
            disabled={markOos.isPending}
            onClick={() => setConfirmingOos(false)}
          >
            {dict.buyerPrices.notYet}
          </Button>
          <Button
            variant="danger"
            size="lg"
            block
            className="bg-danger text-white hover:bg-danger active:bg-danger"
            disabled={markOos.isPending}
            onClick={() => markOos.mutate({ productUnitId: unit.id })}
          >
            {markOos.isPending ? dict.buyerPrices.marking : dict.buyerPrices.yesOos}
          </Button>
        </div>
        {markOos.error && (
          <p className="mt-3 text-[14px] font-medium text-danger">{markOos.error.message}</p>
        )}
      </CardRow>
    );
  }

  const priced = unit.todayCentavos !== null;

  return (
    <CardRow className="flex min-h-[76px] items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[17px] font-medium">{unit.labelTl}</div>
        {justSaved ? (
          <div
            role="status"
            className="animate-fade-in mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-success"
          >
            <Check size={14} strokeWidth={3} />
            {dict.buyerPrices.saved}
          </div>
        ) : (
          unit.previousCentavos !== null && (
            <div className="price mt-0.5 text-[13px] text-ink-2">
              {interpolate(dict.buyerPrices.yesterdayPrice, {
                price: formatPeso(unit.previousCentavos),
              })}
            </div>
          )
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setDraft(
              unit.todayCentavos !== null
                ? (Number(unit.todayCentavos) / 100).toString()
                : "",
            );
            setEditing(true);
          }}
          className={cn(
            "price inline-flex h-14 min-w-[112px] items-center justify-center gap-1.5 rounded-md px-3.5 text-[18px] font-semibold tracking-tight transition-transform active:scale-[0.97]",
            priced
              ? "bg-surface-2 text-ink active:bg-hair"
              : "border-2 border-dashed border-warning bg-warning-soft text-warning",
          )}
        >
          {priced && <Check size={16} strokeWidth={3} className="text-success" />}
          {unit.todayCentavos !== null ? formatPeso(unit.todayCentavos) : dict.buyerPrices.enterPrice}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingOos(true)}
          className="inline-flex h-14 items-center rounded-md px-3 text-[14px] font-semibold text-ink-2 transition-transform active:scale-[0.97] active:bg-surface-2"
          aria-label={interpolate(dict.buyerPrices.markOosAria, { name: nameTl, unit: unit.labelTl })}
        >
          {dict.buyerPrices.markOosButton}
        </button>
      </div>
    </CardRow>
  );
}
