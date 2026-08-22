"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card, CardRow } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatManila } from "~/lib/datetime";
import { formatPeso, formatPhone, pesosToCentavos } from "~/lib/format";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Exposure = RouterOutputs["admin"]["suki"]["exposure"];
type ExposureStore = Exposure["stores"][number];

export function SukiClient() {
  const dict = useDictionary();
  const exposureQuery = trpc.admin.suki.exposure.useQuery();
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);

  if (exposureQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (exposureQuery.error || !exposureQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const { totalOutstanding, stores } = exposureQuery.data;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="title-large">{dict.admin.suki.title}</h2>
        <p className="text-[14px] text-ink-2">
          {dict.admin.suki.totalOutstanding}{" "}
          <span className="price font-semibold text-ink">{formatPeso(totalOutstanding)}</span>
        </p>
      </div>

      {stores.length > 0 ? (
        <Card className="mt-3">
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
        <p className="pt-8 text-center text-[13px] text-ink-2">{dict.admin.suki.empty}</p>
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
    <CardRow>
      <button type="button" onClick={props.onToggle} className="block w-full text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-medium">{store.name}</span>
            <span className="text-[13px] text-ink-2">
              {store.ownerName} · {formatPhone(store.phoneE164)}
              {store.routeName ? ` · ${store.routeName}` : ` · ${dict.admin.stores.noRoute.toLowerCase()}`}
            </span>
          </div>
          <span className={cn("price text-[14px]", nearLimit ? "font-semibold text-danger" : "font-medium")}>
            {formatPeso(balance)} <span className="font-normal text-ink-3">/ {formatPeso(limit)}</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-2">
          <div
            className={cn(
              "h-full rounded-pill",
              pct >= 100 ? "bg-danger" : nearLimit ? "bg-warning" : "bg-action",
            )}
            style={{ width: `${Math.max(pct, balance > 0n ? 2 : 0)}%` }}
          />
        </div>
      </button>

      {open && <StoreLedgerPanel storeId={store.id} />}
    </CardRow>
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
    <div className="mt-3 grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-hair bg-white px-4 py-3">
        <h4 className="text-[13px] font-medium">{dict.admin.suki.recordPayment}</h4>
        <div className="mt-2 flex gap-2">
          <div className="flex h-tap flex-1 items-center gap-1 rounded-md border border-hair-strong bg-white px-3">
            <span className="text-ink-2">₱</span>
            <input
              inputMode="decimal"
              value={paymentDraft}
              onChange={(e) => setPaymentDraft(e.target.value)}
              placeholder="0.00"
              className="price w-full bg-transparent text-[15px] outline-none"
              aria-label={dict.admin.suki.paymentAmountAria}
            />
          </div>
          <Button
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
          <p className="mt-2 text-xs font-medium text-danger">{payment.error.message}</p>
        )}

        <h4 className="mt-4 text-[13px] font-medium">{dict.admin.suki.adjustmentHeading}</h4>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setAdjustNegative(!adjustNegative)}
            className="h-tap w-12 rounded-md border border-hair-strong text-lg font-medium hover:bg-surface-2"
            aria-label={adjustNegative ? dict.admin.suki.decreaseAria : dict.admin.suki.increaseAria}
          >
            {adjustNegative ? "−" : "+"}
          </button>
          <div className="flex h-tap flex-1 items-center gap-1 rounded-md border border-hair-strong bg-white px-3">
            <span className="text-ink-2">₱</span>
            <input
              inputMode="decimal"
              value={adjustDraft}
              onChange={(e) => setAdjustDraft(e.target.value)}
              placeholder="0.00"
              className="price w-full bg-transparent text-[15px] outline-none"
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
          className="mt-2"
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
          <p className="mt-2 text-xs font-medium text-danger">{adjustment.error.message}</p>
        )}
      </div>

      <div className="rounded-md border border-hair bg-white px-4 py-3">
        <h4 className="text-[13px] font-medium">{dict.admin.suki.recentActivity}</h4>
        {ledgerQuery.isLoading && (
          <p className="mt-2 text-[13px] text-ink-2">{dict.common.loading}</p>
        )}
        {ledgerQuery.data && ledgerQuery.data.length === 0 && (
          <p className="mt-2 text-[13px] text-ink-2">{dict.admin.suki.noActivity}</p>
        )}
        <div className="mt-1 max-h-72 overflow-y-auto">
          {ledgerQuery.data?.map((entry) => (
            <div key={entry.id} className="hair-b flex items-baseline justify-between py-2 text-[13px]">
              <div className="min-w-0">
                <span className="font-medium">
                  {entry.kind === "charge"
                    ? dict.admin.suki.kindCharge
                    : entry.kind === "payment"
                      ? dict.admin.suki.kindPayment
                      : dict.admin.suki.kindAdjustment}
                </span>
                {entry.reason && entry.kind !== "charge" && (
                  <span className="text-ink-2"> · {entry.reason}</span>
                )}
                <div className="text-xs text-ink-3">
                  {formatManila(entry.createdAt, "d MMM yyyy, h:mm a", locale)}
                </div>
              </div>
              <span
                className={cn(
                  "price shrink-0 font-medium",
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
