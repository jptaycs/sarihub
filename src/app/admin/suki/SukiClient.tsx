"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatManila } from "~/lib/datetime";
import { formatPeso, formatPhone, pesosToCentavos } from "~/lib/format";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

import { EmptyState, ErrorState, LoadingState, PageHeader, pesoBoxClass } from "../_components/ui";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Exposure = RouterOutputs["admin"]["suki"]["exposure"];
type ExposureStore = Exposure["stores"][number];

/** Desktop table columns: store · route · tab bar · chevron. */
const ROW_GRID = "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.6fr)_24px] lg:items-center lg:gap-6";

export function SukiClient() {
  const dict = useDictionary();
  const exposureQuery = trpc.admin.suki.exposure.useQuery();
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);

  if (exposureQuery.isLoading) return <LoadingState />;
  if (exposureQuery.error || !exposureQuery.data) return <ErrorState />;

  const { totalOutstanding, stores } = exposureQuery.data;

  return (
    <div>
      <PageHeader title={dict.admin.suki.title} />

      <section className="mt-5 rounded-xl bg-action px-5 py-5 text-white lg:px-6 lg:py-6">
        <p className="text-[14px] font-medium text-white/60">{dict.admin.suki.totalOutstanding}</p>
        <p className="price mt-1 text-[34px] font-bold leading-none tracking-tight lg:text-[40px]">
          {formatPeso(totalOutstanding)}
        </p>
      </section>

      {stores.length > 0 ? (
        <Card className="mt-5">
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
          {stores.map((store) => (
            <StoreRow
              key={store.id}
              store={store}
              open={openStoreId === store.id}
              onToggle={() => setOpenStoreId(openStoreId === store.id ? null : store.id)}
            />
          ))}
        </Card>
      ) : (
        <div className="mt-5">
          <EmptyState>{dict.admin.suki.empty}</EmptyState>
        </div>
      )}
    </div>
  );
}

function StoreRow(props: { store: ExposureStore; open: boolean; onToggle: () => void }) {
  const { store, open } = props;
  const dict = useDictionary();
  const limit = store.sukiLimitCentavos;
  const balance = store.sukiBalanceCentavos;
  const pct = limit > 0n ? Math.min(Number((balance * 100n) / limit), 100) : 0;
  const nearLimit = limit > 0n && balance * 100n >= limit * 80n;

  return (
    <div className="hair-b last:border-b-0">
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={open}
        className={cn(
          "block w-full px-5 py-4 text-left transition-colors hover:bg-bg/60",
          ROW_GRID,
          open && "bg-bg/60",
        )}
      >
        <div className="flex items-start justify-between gap-3 lg:block">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold lg:text-[15px]">{store.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-ink-2">
              {store.ownerName} · {formatPhone(store.phoneE164)}
              <span className="lg:hidden">
                {" · "}
                {store.routeName ?? dict.admin.stores.noRoute.toLowerCase()}
              </span>
            </p>
          </div>
          <ChevronDown
            size={20}
            className={cn("mt-0.5 shrink-0 text-ink-3 transition-transform lg:hidden", open && "rotate-180")}
          />
        </div>

        <span className="hidden truncate text-[14px] text-ink-2 lg:block">
          {store.routeName ?? dict.admin.stores.noRoute}
        </span>

        <div className="mt-3 lg:mt-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "price text-[15px]",
                nearLimit ? "font-semibold text-danger" : "font-semibold",
              )}
            >
              {formatPeso(balance)}
            </span>
            <span className="price text-[13px] text-ink-3">/ {formatPeso(limit)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2">
            <div
              className={cn(
                "h-full rounded-pill",
                pct >= 100 ? "bg-danger" : nearLimit ? "bg-warning" : "bg-action",
              )}
              style={{ width: `${Math.max(pct, balance > 0n ? 2 : 0)}%` }}
            />
          </div>
        </div>

        <ChevronDown
          size={20}
          className={cn("hidden text-ink-3 transition-transform lg:block", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="animate-fade-in bg-bg/60 px-4 pb-4 sm:px-5 sm:pb-5">
          <StoreLedgerPanel storeId={store.id} />
        </div>
      )}
    </div>
  );
}

function StoreLedgerPanel(props: { storeId: string }) {
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const ledgerQuery = trpc.admin.suki.ledger.useQuery({ storeId: props.storeId });

  const invalidate = () => {
    void utils.admin.suki.exposure.invalidate();
    void utils.admin.suki.ledger.invalidate({ storeId: props.storeId });
  };
  const payment = trpc.admin.suki.recordPayment.useMutation({ onSuccess: invalidate });
  const adjustment = trpc.admin.suki.recordAdjustment.useMutation({ onSuccess: invalidate });

  const [paymentDraft, setPaymentDraft] = useState("");
  const [adjustDraft, setAdjustDraft] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNegative, setAdjustNegative] = useState(true);
  // One key per logical entry: stable across a retry-after-error (so retrying
  // a failed/lost-response submit can't double-post), replaced once the
  // submission actually succeeds and the draft clears for the next entry.
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID());
  const [adjustKey, setAdjustKey] = useState(() => crypto.randomUUID());

  const paymentCentavos = pesosToCentavos(paymentDraft);
  const adjustCentavos = pesosToCentavos(adjustDraft);

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
          <h4 className="text-[15px] font-semibold">{dict.admin.suki.recordPayment}</h4>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className={cn(pesoBoxClass, "flex-1")}>
              <span className="font-medium text-ink-2">₱</span>
              <input
                inputMode="decimal"
                value={paymentDraft}
                onChange={(e) => setPaymentDraft(e.target.value)}
                placeholder="0.00"
                className="price w-full min-w-0 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
                aria-label={dict.admin.suki.paymentAmountAria}
              />
            </div>
            <Button
              className="h-[52px]"
              disabled={payment.isPending || paymentCentavos === null || paymentCentavos === 0}
              onClick={() => {
                if (paymentCentavos === null) return;
                payment.mutate(
                  { storeId: props.storeId, amountCentavos: paymentCentavos, idempotencyKey: paymentKey },
                  {
                    onSuccess: () => {
                      setPaymentDraft("");
                      setPaymentKey(crypto.randomUUID());
                    },
                  },
                );
              }}
            >
              {payment.isPending ? dict.admin.orders.updating : dict.admin.suki.recordButton}
            </Button>
          </div>
          {payment.error && (
            <p className="mt-2 text-[13px] font-medium text-danger">{payment.error.message}</p>
          )}
        </div>

        <div className="rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
          <h4 className="text-[15px] font-semibold">{dict.admin.suki.adjustmentHeading}</h4>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAdjustNegative(!adjustNegative)}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink transition-colors hover:bg-hair"
              aria-label={adjustNegative ? dict.admin.suki.decreaseAria : dict.admin.suki.increaseAria}
            >
              {adjustNegative ? <Minus size={20} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={2.5} />}
            </button>
            <div className={cn(pesoBoxClass, "min-w-0 flex-1")}>
              <span className="font-medium text-ink-2">₱</span>
              <input
                inputMode="decimal"
                value={adjustDraft}
                onChange={(e) => setAdjustDraft(e.target.value)}
                placeholder="0.00"
                className="price w-full min-w-0 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
                aria-label={dict.admin.suki.adjustmentAmountAria}
              />
            </div>
          </div>
          <Input
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder={dict.admin.suki.adjustmentReasonPlaceholder}
            className="mt-2"
          />
          <Button
            variant="secondary"
            block
            className="mt-3"
            disabled={
              adjustment.isPending ||
              adjustCentavos === null ||
              adjustCentavos === 0 ||
              adjustReason.trim().length < 3
            }
            onClick={() => {
              if (adjustCentavos === null) return;
              adjustment.mutate(
                {
                  storeId: props.storeId,
                  amountCentavos: adjustNegative ? -adjustCentavos : adjustCentavos,
                  reason: adjustReason.trim(),
                  idempotencyKey: adjustKey,
                },
                {
                  onSuccess: () => {
                    setAdjustDraft("");
                    setAdjustReason("");
                    setAdjustKey(crypto.randomUUID());
                  },
                },
              );
            }}
          >
            {adjustment.isPending ? dict.admin.orders.updating : dict.admin.suki.recordAdjustment}
          </Button>
          {adjustment.error && (
            <p className="mt-2 text-[13px] font-medium text-danger">{adjustment.error.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
        <h4 className="text-[15px] font-semibold">{dict.admin.suki.recentActivity}</h4>
        {ledgerQuery.isLoading && (
          <p className="mt-3 text-[14px] text-ink-2">{dict.common.loading}</p>
        )}
        {ledgerQuery.data && ledgerQuery.data.length === 0 && (
          <p className="mt-3 text-[14px] text-ink-2">{dict.admin.suki.noActivity}</p>
        )}
        <div className="mt-2 max-h-80 overflow-y-auto">
          {ledgerQuery.data?.map((entry) => (
            <div
              key={entry.id}
              className="hair-b flex items-start justify-between gap-3 py-3 text-[14px] last:border-b-0"
            >
              <div className="min-w-0">
                <span className="font-semibold">
                  {entry.kind === "charge"
                    ? dict.admin.suki.kindCharge
                    : entry.kind === "payment"
                      ? dict.admin.suki.kindPayment
                      : dict.admin.suki.kindAdjustment}
                </span>
                {entry.reason && entry.kind !== "charge" && (
                  <span className="break-words text-ink-2"> · {entry.reason}</span>
                )}
                <div className="mt-0.5 text-[12px] text-ink-3">
                  {formatManila(entry.createdAt, "d MMM yyyy, h:mm a", locale)}
                </div>
              </div>
              <span
                className={cn(
                  "price shrink-0 font-semibold",
                  entry.amountCentavos < 0n ? "text-success" : "",
                )}
              >
                {entry.amountCentavos < 0n ? "−" : "+"}
                {formatPeso(entry.amountCentavos < 0n ? -entry.amountCentavos : entry.amountCentavos)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
