"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleUser } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card, CardRow } from "~/components/ui/Card";
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
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (boardQuery.error || !boardQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const board = boardQuery.data;
  const allUnits = board.products.flatMap((p) => p.units);
  const unpriced = allUnits.filter((u) => u.todayCentavos === null && !u.outOfStockToday);
  const carryable = unpriced.filter((u) => u.previousCentavos !== null);
  const pricedCount = allUnits.filter((u) => u.todayCentavos !== null).length;

  return (
    <div>
      <header className="flex items-start justify-between py-3">
        <div>
          <h1 className="title-large">{dict.buyerPrices.title}</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {formatManila(now(), "EEEE, d MMM yyyy", locale)}
          </p>
        </div>
        <Link
          href="/profile"
          aria-label={dict.nav.profileAria}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-pill border border-hair-strong bg-white text-ink-2 active:bg-surface-2"
        >
          <CircleUser size={22} strokeWidth={1.75} />
        </Link>
      </header>

      {unpriced.length > 0 ? (
        <div className="mb-3 rounded-md bg-warning-soft px-3.5 py-3">
          <p className="text-[13px] font-medium text-warning">
            {interpolate(dict.buyerPrices.unpricedWarning, { count: unpriced.length })}
          </p>
          {carryable.length > 0 && (
            <Button
              block
              className="mt-2.5"
              disabled={carryOver.isPending}
              onClick={() => carryOver.mutate()}
            >
              {carryOver.isPending
                ? dict.buyerPrices.carryingOver
                : interpolate(dict.buyerPrices.carryOverButton, { count: carryable.length })}
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-md bg-success-soft px-3.5 py-3 text-[13px] font-medium text-success">
          {dict.buyerPrices.allPriced}
        </div>
      )}

      {carryOver.error && (
        <p className="mb-3 text-[13px] font-medium text-danger">{carryOver.error.message}</p>
      )}

      {!adjusting && (
        <Button variant="secondary" block className="mb-3" onClick={() => setAdjusting(true)}>
          {dict.buyerPrices.bulkAdjustButton}
        </Button>
      )}
      {adjusting && (
        <BulkAdjustPanel pricedCount={pricedCount} onDone={() => setAdjusting(false)} />
      )}

      {board.products.map((product) => (
        <ProductPriceGroup key={product.id} product={product} />
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
      <div className="mb-3 rounded-md bg-success-soft px-3.5 py-3 text-[13px] font-medium text-success">
        {interpolate(dict.buyerPrices.bulkAdjust.resultSummary, { adjusted: bulkAdjust.data.adjusted })}
        <Button variant="secondary" block className="mt-2.5" onClick={props.onDone}>
          {dict.buyerPrices.bulkAdjust.cancel}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-md border border-hair bg-white px-4 py-3.5">
      <h3 className="text-[14px] font-medium">{dict.buyerPrices.bulkAdjust.heading}</h3>

      <div className="mt-2.5 flex gap-2">
        <Button
          variant={mode === "percent" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setMode("percent")}
        >
          {dict.buyerPrices.bulkAdjust.modePercent}
        </Button>
        <Button
          variant={mode === "fixed" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setMode("fixed")}
        >
          {dict.buyerPrices.bulkAdjust.modeFixed}
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant={direction === "up" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setDirection("up")}
        >
          {dict.buyerPrices.bulkAdjust.directionUp}
        </Button>
        <Button
          variant={direction === "down" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setDirection("down")}
        >
          {dict.buyerPrices.bulkAdjust.directionDown}
        </Button>
      </div>

      <label className="mt-2.5 block text-[13px] text-ink-2">
        {dict.buyerPrices.bulkAdjust.valueLabel}
        <input
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          placeholder={
            mode === "percent"
              ? dict.buyerPrices.bulkAdjust.valuePlaceholderPercent
              : dict.buyerPrices.bulkAdjust.valuePlaceholderFixed
          }
          className="mt-1 h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        />
      </label>

      {canSubmit && (
        <p className="mt-2 text-[13px] text-ink-2">
          {interpolate(dict.buyerPrices.bulkAdjust.affectedCount, { count: props.pricedCount })}
        </p>
      )}

      {!confirming ? (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" block onClick={props.onDone}>
            {dict.buyerPrices.bulkAdjust.cancel}
          </Button>
          <Button block disabled={!canSubmit} onClick={() => setConfirming(true)}>
            {dict.buyerPrices.bulkAdjust.submit}
          </Button>
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-warning-soft px-3 py-2.5">
          <p className="text-[13px] font-medium text-warning">
            {interpolate(dict.buyerPrices.bulkAdjust.confirmPrompt, { count: props.pricedCount })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              block
              disabled={bulkAdjust.isPending}
              onClick={() => setConfirming(false)}
            >
              {dict.buyerPrices.bulkAdjust.confirmNo}
            </Button>
            <Button
              block
              disabled={bulkAdjust.isPending || !canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                bulkAdjust.mutate({ mode, direction, value: value as number });
              }}
            >
              {bulkAdjust.isPending ? dict.buyerPrices.bulkAdjust.adjusting : dict.buyerPrices.bulkAdjust.confirmYes}
            </Button>
          </div>
        </div>
      )}

      {bulkAdjust.error && (
        <p className="mt-2 text-[13px] font-medium text-danger">{bulkAdjust.error.message}</p>
      )}
    </div>
  );
}

function ProductPriceGroup(props: { product: BoardProduct }) {
  const { product } = props;
  return (
    <section className="py-2.5">
      <div className="flex items-baseline gap-2 px-1">
        <span className="lbl-tag">{product.nameTl}</span>
        <span className="lbl-en">{product.nameEn}</span>
      </div>
      <Card className="mt-1.5">
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

  const setPrice = trpc.buyer.setPrice.useMutation({
    onSuccess() {
      setEditing(false);
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

  if (unit.outOfStockToday) {
    return (
      <CardRow className="flex min-h-14 items-center justify-between gap-3">
        <span className="text-[15px] text-ink-3 line-through">{unit.labelTl}</span>
        <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-danger">
          {dict.buyerPrices.outOfStockBadge}
        </span>
      </CardRow>
    );
  }

  if (editing) {
    return (
      <CardRow>
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-[15px]">{unit.labelTl}</span>
          <div className="flex h-14 flex-1 items-center gap-1 rounded-md border border-action bg-white px-3">
            <span className="text-lg text-ink-2">₱</span>
            <input
              autoFocus
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                unit.previousCentavos !== null
                  ? formatPeso(unit.previousCentavos).slice(1)
                  : "0.00"
              }
              className="price w-full bg-transparent text-xl font-medium outline-none"
              aria-label={interpolate(dict.buyerPrices.priceInputAria, {
                name: nameTl,
                unit: unit.labelTl,
              })}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" block disabled={setPrice.isPending} onClick={() => setEditing(false)}>
            {dict.buyerPrices.cancelEdit}
          </Button>
          <Button
            block
            disabled={setPrice.isPending || draftCentavos === null || draftCentavos === 0}
            onClick={() => {
              if (draftCentavos === null) return;
              setPrice.mutate({ productUnitId: unit.id, priceCentavos: draftCentavos });
            }}
          >
            {setPrice.isPending ? dict.buyerPrices.saving : dict.buyerPrices.save}
          </Button>
        </div>
        {setPrice.error && (
          <p className="mt-2 text-[13px] font-medium text-danger">{setPrice.error.message}</p>
        )}
      </CardRow>
    );
  }

  if (confirmingOos) {
    return (
      <CardRow>
        <p className="text-[14px] font-medium">
          {interpolate(dict.buyerPrices.confirmOos, { name: nameTl, unit: unit.labelTl })}
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            block
            disabled={markOos.isPending}
            onClick={() => setConfirmingOos(false)}
          >
            {dict.buyerPrices.notYet}
          </Button>
          <Button
            variant="danger"
            block
            disabled={markOos.isPending}
            onClick={() => markOos.mutate({ productUnitId: unit.id })}
          >
            {markOos.isPending ? dict.buyerPrices.marking : dict.buyerPrices.yesOos}
          </Button>
        </div>
        {markOos.error && (
          <p className="mt-2 text-[13px] font-medium text-danger">{markOos.error.message}</p>
        )}
      </CardRow>
    );
  }

  return (
    <CardRow className="flex min-h-14 items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[15px]">{unit.labelTl}</div>
        {unit.previousCentavos !== null && (
          <div className="price text-xs text-ink-3">
            {interpolate(dict.buyerPrices.yesterdayPrice, {
              price: formatPeso(unit.previousCentavos),
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
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
            "price inline-flex h-tap min-w-28 items-center justify-center rounded-md border px-3 text-[17px] font-medium active:bg-surface-2",
            unit.todayCentavos !== null
              ? "border-hair-strong bg-white"
              : "border-warning bg-warning-soft text-warning",
          )}
        >
          {unit.todayCentavos !== null ? formatPeso(unit.todayCentavos) : dict.buyerPrices.enterPrice}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingOos(true)}
          className="inline-flex h-tap items-center rounded-md border border-hair px-3 text-[13px] font-medium text-ink-2 active:bg-surface-2"
          aria-label={interpolate(dict.buyerPrices.markOosAria, { name: nameTl, unit: unit.labelTl })}
        >
          {dict.buyerPrices.markOosButton}
        </button>
      </div>
    </CardRow>
  );
}
