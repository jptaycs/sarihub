"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { formatManila, now } from "~/lib/datetime";
import { formatPeso, pesosToCentavos } from "~/lib/format";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PriceBoard = RouterOutputs["buyer"]["priceBoard"];
type BoardProduct = PriceBoard["products"][number];
type BoardUnit = BoardProduct["units"][number];

export function PricesClient() {
  const utils = trpc.useUtils();
  const boardQuery = trpc.buyer.priceBoard.useQuery();
  const carryOver = trpc.buyer.carryOverYesterday.useMutation({
    onSuccess() {
      void utils.buyer.priceBoard.invalidate();
    },
  });

  if (boardQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">Nilo-load po…</p>;
  }
  if (boardQuery.error || !boardQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">
        May problema sa koneksyon. I-refresh po ang app.
      </p>
    );
  }

  const board = boardQuery.data;
  const allUnits = board.products.flatMap((p) => p.units);
  const unpriced = allUnits.filter((u) => u.todayCentavos === null && !u.outOfStockToday);
  const carryable = unpriced.filter((u) => u.previousCentavos !== null);

  return (
    <div>
      <header className="py-3">
        <h1 className="text-[22px] font-medium leading-[1.15] tracking-tight">Presyo ngayon</h1>
        <p className="mt-0.5 text-[13px] text-ink-2">{formatManila(now(), "EEEE, d MMM yyyy")}</p>
      </header>

      {unpriced.length > 0 ? (
        <div className="mb-3 rounded-md bg-warning-soft px-3.5 py-3">
          <p className="text-[13px] font-medium text-warning">
            {unpriced.length} unit pa ang walang presyo ngayon.
          </p>
          {carryable.length > 0 && (
            <Button
              block
              className="mt-2.5"
              disabled={carryOver.isPending}
              onClick={() => carryOver.mutate()}
            >
              {carryOver.isPending
                ? "Kinokopya…"
                : `Kopyahin ang presyo kahapon (${carryable.length})`}
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-md bg-success-soft px-3.5 py-3 text-[13px] font-medium text-success">
          Kumpleto na po ang presyo ngayon. ✓
        </div>
      )}

      {carryOver.error && (
        <p className="mb-3 text-[13px] font-medium text-danger">{carryOver.error.message}</p>
      )}

      {board.products.map((product) => (
        <ProductPriceGroup key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductPriceGroup(props: { product: BoardProduct }) {
  const { product } = props;
  return (
    <section className="hair-b py-3">
      <div className="flex items-baseline gap-2">
        <span className="lbl-tag">{product.nameTl}</span>
        <span className="lbl-en">{product.nameEn}</span>
      </div>
      <div className="mt-1">
        {product.units.map((unit) => (
          <UnitPriceRow key={unit.id} nameTl={product.nameTl} unit={unit} />
        ))}
      </div>
    </section>
  );
}

function UnitPriceRow(props: { nameTl: string; unit: BoardUnit }) {
  const { nameTl, unit } = props;
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
      <div className="flex min-h-14 items-center justify-between gap-3 py-1.5">
        <span className="text-[15px] text-ink-3 line-through">{unit.labelTl}</span>
        <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-danger">
          Ubos ngayon
        </span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="py-1.5">
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
              aria-label={`Presyo ng ${nameTl} ${unit.labelTl}`}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" block disabled={setPrice.isPending} onClick={() => setEditing(false)}>
            Huwag
          </Button>
          <Button
            block
            disabled={setPrice.isPending || draftCentavos === null || draftCentavos === 0}
            onClick={() => {
              if (draftCentavos === null) return;
              setPrice.mutate({ productUnitId: unit.id, priceCentavos: draftCentavos });
            }}
          >
            {setPrice.isPending ? "Sine-save…" : "I-save"}
          </Button>
        </div>
        {setPrice.error && (
          <p className="mt-2 text-[13px] font-medium text-danger">{setPrice.error.message}</p>
        )}
      </div>
    );
  }

  if (confirmingOos) {
    return (
      <div className="py-1.5">
        <p className="text-[14px] font-medium">
          Ubos na po ba talaga ang {nameTl} ({unit.labelTl})? Makakansela ito sa mga order ngayon.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            block
            disabled={markOos.isPending}
            onClick={() => setConfirmingOos(false)}
          >
            Hindi pa
          </Button>
          <Button
            variant="danger"
            block
            disabled={markOos.isPending}
            onClick={() => markOos.mutate({ productUnitId: unit.id })}
          >
            {markOos.isPending ? "Minamarkahan…" : "Oo, ubos na"}
          </Button>
        </div>
        {markOos.error && (
          <p className="mt-2 text-[13px] font-medium text-danger">{markOos.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[15px]">{unit.labelTl}</div>
        {unit.previousCentavos !== null && (
          <div className="price text-xs text-ink-3">kahapon {formatPeso(unit.previousCentavos)}</div>
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
          {unit.todayCentavos !== null ? formatPeso(unit.todayCentavos) : "Ilagay"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingOos(true)}
          className="inline-flex h-tap items-center rounded-md border border-hair px-3 text-[13px] font-medium text-ink-2 active:bg-surface-2"
          aria-label={`Markahang ubos ang ${nameTl} ${unit.labelTl}`}
        >
          Ubos
        </button>
      </div>
    </div>
  );
}
