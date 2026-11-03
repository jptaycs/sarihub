"use client";

import { Card, CardRow } from "~/components/ui/Card";
import { cn } from "~/lib/cn";
import { formatManila } from "~/lib/datetime";
import { formatPeso } from "~/lib/format";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";

/**
 * The owner's own tab trail, so a charge rung up at the door by the truck
 * helper (a POS suki sale) shows up as "Binili sa truck" instead of a
 * mystery jump in the balance.
 */
export function SukiActivity() {
  const dict = useDictionary();
  const { locale } = useLocale();
  const ledgerQuery = trpc.store.ledger.useQuery();

  const label = (row: NonNullable<typeof ledgerQuery.data>[number]) => {
    if (row.kind === "payment") return dict.profile.ledgerPayment;
    if (row.kind === "adjustment") return dict.profile.ledgerAdjustment;
    return row.posSaleId ? dict.profile.ledgerPos : dict.profile.ledgerCharge;
  };

  return (
    <>
      <p className="section-label mb-2 mt-6 px-1">{dict.profile.ledgerHeading}</p>
      <Card>
        {ledgerQuery.isLoading && (
          <CardRow className="text-[14px] text-ink-2">{dict.common.loading}</CardRow>
        )}
        {ledgerQuery.data && ledgerQuery.data.length === 0 && (
          <CardRow className="text-[14px] text-ink-2">{dict.profile.ledgerEmpty}</CardRow>
        )}
        {ledgerQuery.data?.map((row) => (
          <CardRow key={row.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium">{label(row)}</div>
              <div className="tnum text-[13px] text-ink-2">
                {formatManila(row.createdAt, "d MMM, h:mm a", locale)}
                {row.reason && row.kind === "adjustment" ? ` · ${row.reason}` : ""}
              </div>
            </div>
            <span
              className={cn(
                "price shrink-0 text-[15px] font-semibold",
                row.amountCentavos < 0n ? "text-success" : "text-ink",
              )}
            >
              {row.amountCentavos < 0n ? "−" : "+"}
              {formatPeso(row.amountCentavos < 0n ? -row.amountCentavos : row.amountCentavos)}
            </span>
          </CardRow>
        ))}
      </Card>
    </>
  );
}
