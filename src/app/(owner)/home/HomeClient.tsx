"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { cn } from "~/lib/cn";
import { formatManila, now, toManila } from "~/lib/datetime";
import { nextDeliveryDate } from "~/lib/deliverySchedule";
import { formatPeso } from "~/lib/format";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import type { Locale } from "~/lib/i18n/locale";
import { trpc } from "~/lib/trpc/client";
import { useCart } from "~/lib/useCart";
import type { ProductCategory } from "~/server/db/schema";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Catalog = RouterOutputs["catalog"]["today"];
type CatalogProduct = Catalog["products"][number];
type StoreMe = RouterOutputs["store"]["me"];

function greeting(dict: Dictionary): string {
  const hour = toManila(now()).getHours();
  if (hour < 12) return dict.home.greetingMorning;
  if (hour < 18) return dict.home.greetingAfternoon;
  return dict.home.greetingEvening;
}

/** "later this morning" / "tomorrow morning" / "Mon, 13 Jul" for the delivery day. */
function deliveryLabel(dict: Dictionary, locale: Locale, deliverOn: Date): string {
  const dayOf = (d: Date) => formatManila(d, "yyyy-MM-dd");
  const today = now();
  if (dayOf(deliverOn) === dayOf(today)) return dict.home.deliveryToday;
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (dayOf(deliverOn) === dayOf(tomorrow)) return dict.home.deliveryTomorrow;
  return formatManila(deliverOn, "EEE, d MMM", locale);
}

export function HomeClient() {
  const dict = useDictionary();
  const storeQuery = trpc.store.me.useQuery();
  const catalogQuery = trpc.catalog.today.useQuery();
  const { cart, setQuantity, clear } = useCart();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const products = useMemo(() => catalogQuery.data?.products ?? [], [catalogQuery.data]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!needle) return true;
      return (
        p.nameTl.toLowerCase().includes(needle) || p.nameEn.toLowerCase().includes(needle)
      );
    });
  }, [products, search, category]);

  /** Priced units indexed for cart math. */
  const unitIndex = useMemo(() => {
    const map = new Map<
      string,
      { product: CatalogProduct; labelTl: string; priceCentavos: bigint }
    >();
    for (const p of products) {
      for (const u of p.units) {
        if (u.priceCentavos !== null && !u.outOfStock) {
          map.set(u.id, { product: p, labelTl: u.labelTl, priceCentavos: u.priceCentavos });
        }
      }
    }
    return map;
  }, [products]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart.quantities)
        .map(([unitId, quantity]) => {
          const unit = unitIndex.get(unitId);
          if (!unit) return null;
          return {
            productUnitId: unitId,
            nameTl: unit.product.nameTl,
            labelTl: unit.labelTl,
            quantity,
            priceCentavos: unit.priceCentavos,
            totalCentavos: unit.priceCentavos * BigInt(quantity),
          };
        })
        .filter((l) => l !== null),
    [cart.quantities, unitIndex],
  );
  const cartTotal = cartLines.reduce((sum, l) => sum + l.totalCentavos, 0n);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  /** All catalog units regardless of price/stock, just for naming a removed line. */
  const allUnitIndex = useMemo(() => {
    const map = new Map<string, { product: CatalogProduct; labelTl: string }>();
    for (const p of products) {
      for (const u of p.units) {
        map.set(u.id, { product: p, labelTl: u.labelTl });
      }
    }
    return map;
  }, [products]);

  const [removedNotice, setRemovedNotice] = useState<string[] | null>(null);

  // A cart line can go stale while the owner is browsing — the buyer marks it
  // out of stock, or its price expires — with no error, since nothing was
  // submitted yet. Silently dropping it from cartLines (via unitIndex not
  // having it) left the owner with a shrinking total and no explanation.
  // Prune it from the cart and say why, instead.
  useEffect(() => {
    // Guard against the catalog's first load: `products` (and so `unitIndex`)
    // is `[]` until catalogQuery.data actually arrives, which would otherwise
    // look identical to "every cart line just went stale" and wipe a
    // just-hydrated cart on every page load.
    if (!catalogQuery.data) return;
    const staleIds = Object.keys(cart.quantities).filter((id) => !unitIndex.has(id));
    if (staleIds.length === 0) return;
    const names = staleIds
      .map((id) => allUnitIndex.get(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map((u) => `${u.product.nameTl} (${u.labelTl})`);
    staleIds.forEach((id) => setQuantity(id, 0));
    if (names.length > 0) setRemovedNotice(names);
    // setQuantity is a stable useCallback; omitting it here would be fine too,
    // but including it documents that pruning is the effect's real dependency.
  }, [cart.quantities, unitIndex, allUnitIndex, setQuantity, catalogQuery.data]);

  if (storeQuery.isLoading || catalogQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (storeQuery.error || catalogQuery.error) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const store = storeQuery.data ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-start justify-between py-3">
        <div>
          <div className="text-xs text-ink-2">{greeting(dict)}</div>
          <div className="mt-0.5 text-[22px] font-medium leading-[1.15] tracking-tight">
            {store?.ownerName ?? "Suki"}
          </div>
        </div>
        <Link href="/orders" className="pt-1 text-[13px] font-medium text-action">
          {dict.home.ordersLink}
        </Link>
      </header>

      {store && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-surface-2 px-3.5 py-2.5 text-[13px]">
          <span className="text-ink-2">{dict.home.sukiTab}</span>
          <span className="price font-medium">
            {formatPeso(store.sukiBalanceCentavos)}{" "}
            <span className="text-ink-3">/ {formatPeso(store.sukiLimitCentavos)}</span>
          </span>
        </div>
      )}

      {!store && (
        <div className="mb-3 rounded-md bg-warning-soft px-3.5 py-3 text-[13px] text-warning">
          {dict.home.noStore}
        </div>
      )}

      <Input
        type="search"
        inputMode="search"
        placeholder={dict.home.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-[44px] text-[15px]"
      />

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <CategoryPill
          label={dict.home.allCategory}
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={dict.productCategories[c]}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          />
        ))}
      </div>

      {removedNotice && (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-md bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning">
          <span>
            {interpolate(dict.home.cartItemsRemovedNotice, { names: removedNotice.join(", ") })}
          </span>
          <button
            type="button"
            onClick={() => setRemovedNotice(null)}
            className="shrink-0 font-medium underline"
          >
            {dict.home.cartItemsRemovedDismiss}
          </button>
        </div>
      )}

      <div className="mt-2 flex-1">
        {visibleProducts.length === 0 && (
          <p className="pt-8 text-center text-[13px] text-ink-2">{dict.home.noResults}</p>
        )}
        {visibleProducts.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            quantities={cart.quantities}
            setQuantity={setQuantity}
          />
        ))}
      </div>

      {cartCount > 0 && (
        <div className="sticky bottom-0 -mx-5 mt-4 bg-bg px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
          <Button size="lg" block onClick={() => setSheetOpen(true)}>
            <span>
              {interpolate(
                cartCount === 1 ? dict.home.viewOrderButtonOne : dict.home.viewOrderButtonOther,
                { count: cartCount },
              )}
            </span>
            <span className="price">{formatPeso(cartTotal)}</span>
          </Button>
        </div>
      )}

      {sheetOpen && (
        <CartSheet
          store={store}
          lines={cartLines}
          totalCentavos={cartTotal}
          idempotencyKey={cart.idempotencyKey}
          setQuantity={setQuantity}
          onDone={clear}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryPill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "h-9 shrink-0 rounded-pill border px-3.5 text-[13px] font-medium transition-colors",
        props.active
          ? "border-action bg-action text-white"
          : "border-hair-strong bg-white text-ink-2 active:bg-surface-2",
      )}
    >
      {props.label}
    </button>
  );
}

function ProductRow(props: {
  product: CatalogProduct;
  quantities: Record<string, number>;
  setQuantity: (unitId: string, qty: number) => void;
}) {
  const { product, quantities, setQuantity } = props;
  const dict = useDictionary();
  return (
    <div className="hair-b py-3">
      <div className="flex items-baseline gap-2">
        <span className="lbl-tag">{product.nameTl}</span>
        <span className="lbl-en">{product.nameEn}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {product.units.map((u) => {
          const qty = quantities[u.id] ?? 0;
          if (u.outOfStock) {
            return (
              <span
                key={u.id}
                className="inline-flex h-tap items-center rounded-md border border-hair bg-surface-2 px-3 text-[13px] text-ink-3"
              >
                {u.labelTl} · {dict.home.outOfStock}
              </span>
            );
          }
          if (u.priceCentavos === null) {
            return (
              <span
                key={u.id}
                className="inline-flex h-tap items-center rounded-md border border-hair bg-surface-2 px-3 text-[13px] text-ink-3"
              >
                {u.labelTl} · {dict.home.noPriceBadge}
              </span>
            );
          }
          if (qty === 0) {
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setQuantity(u.id, 1)}
                className="inline-flex h-tap items-center gap-1.5 rounded-md border border-hair-strong bg-white px-3 text-[14px] font-medium active:bg-surface-2"
              >
                <span>{u.labelTl}</span>
                <span className="price text-ink-2">{formatPeso(u.priceCentavos)}</span>
              </button>
            );
          }
          return (
            <span
              key={u.id}
              className="inline-flex h-tap items-center overflow-hidden rounded-md border border-action bg-white text-[15px] font-medium"
            >
              <button
                type="button"
                aria-label={interpolate(dict.home.decreaseAria, {
                  name: product.nameTl,
                  unit: u.labelTl,
                })}
                onClick={() => setQuantity(u.id, qty - 1)}
                className="h-full w-11 text-action active:bg-surface-2"
              >
                −
              </button>
              <span className="price min-w-8 text-center">{qty}</span>
              <button
                type="button"
                aria-label={interpolate(dict.home.increaseAria, {
                  name: product.nameTl,
                  unit: u.labelTl,
                })}
                onClick={() => setQuantity(u.id, qty + 1)}
                className="h-full w-11 text-action active:bg-surface-2"
              >
                +
              </button>
              <span className="border-l border-hair px-2.5 text-[13px] text-ink-2">
                {u.labelTl}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CartSheet(props: {
  store: StoreMe;
  lines: Array<{
    productUnitId: string;
    nameTl: string;
    labelTl: string;
    quantity: number;
    priceCentavos: bigint;
    totalCentavos: bigint;
  }>;
  totalCentavos: bigint;
  idempotencyKey: string;
  setQuantity: (unitId: string, qty: number) => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const { store, lines, totalCentavos } = props;
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const place = trpc.orders.place.useMutation({
    onSuccess() {
      // Balance moved on the tab; refetch what shows it.
      void utils.store.me.invalidate();
      void utils.orders.list.invalidate();
    },
  });

  const deliverOn =
    store?.routeCutoffLocal != null && store.routeActiveWeekdays != null
      ? nextDeliveryDate(
          { cutoffLocal: store.routeCutoffLocal, activeWeekdays: store.routeActiveWeekdays },
          now(),
        )
      : null;

  if (place.data?.ok) {
    const placed = place.data.order;
    return (
      <SheetShell onClose={() => { props.onDone(); props.onClose(); }}>
        <div className="py-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-success-soft text-xl text-success">
            ✓
          </div>
          <h2 className="mt-3 text-lg font-medium">{dict.cart.placedTitle}</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            {interpolate(dict.cart.placedSubtitle, {
              price: formatPeso(placed.totalCentavos),
              when: deliveryLabel(dict, locale, placed.deliverOn),
            })}
          </p>
          <Button
            size="lg"
            block
            className="mt-5"
            onClick={() => {
              props.onDone();
              props.onClose();
            }}
          >
            {dict.cart.ok}
          </Button>
          <Link
            href="/orders"
            className="mt-3 inline-block text-[13px] font-medium text-action"
            onClick={() => props.onDone()}
          >
            {dict.cart.viewOrders}
          </Link>
        </div>
      </SheetShell>
    );
  }

  return (
    <SheetShell onClose={props.onClose}>
      <h2 className="text-lg font-medium">{dict.cart.title}</h2>

      <div className="mt-2">
        {lines.map((l) => (
          <div key={l.productUnitId} className="hair-b flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <div className="text-[14px] font-medium">
                {l.nameTl} <span className="font-normal text-ink-2">· {l.labelTl}</span>
              </div>
              <div className="price text-xs text-ink-2">
                {l.quantity} × {formatPeso(l.priceCentavos)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="price text-[14px] font-medium">{formatPeso(l.totalCentavos)}</span>
              <button
                type="button"
                aria-label={interpolate(dict.cart.removeAria, { name: l.nameTl })}
                onClick={() => props.setQuantity(l.productUnitId, 0)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-3 active:bg-surface-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-3">
        <span className="text-[14px] text-ink-2">{dict.common.sukiTotalLabel}</span>
        <span className="price text-lg font-semibold">{formatPeso(totalCentavos)}</span>
      </div>

      {deliverOn && (
        <p className="pb-3 text-[13px] text-ink-2">
          {interpolate(dict.cart.deliveryNote, { when: deliveryLabel(dict, locale, deliverOn) })}
        </p>
      )}

      {place.error && (
        <p className="pb-3 text-[13px] font-medium text-danger">{place.error.message}</p>
      )}

      <Button
        size="lg"
        block
        disabled={place.isPending || lines.length === 0}
        onClick={() =>
          place.mutate({
            idempotencyKey: props.idempotencyKey,
            items: lines.map((l) => ({ productUnitId: l.productUnitId, quantity: l.quantity })),
          })
        }
      >
        {place.isPending
          ? dict.cart.placing
          : interpolate(dict.cart.placeButton, { price: formatPeso(totalCentavos) })}
      </Button>
    </SheetShell>
  );
}

function SheetShell(props: { children: React.ReactNode; onClose: () => void }) {
  const dict = useDictionary();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={props.onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-t-lg bg-surface px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hair-strong" />
        {props.children}
      </div>
    </div>
  );
}
