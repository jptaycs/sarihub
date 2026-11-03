"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Receipt, Search, ShoppingCart, Store, User, X } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Stepper } from "~/components/ui/Stepper";
import { cn } from "~/lib/cn";
import { formatManilaTime } from "~/lib/datetime";
import { formatPeso, formatPhone, pesosToCentavos } from "~/lib/format";
import { interpolate } from "~/lib/i18n/interpolate";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { trpc } from "~/lib/trpc/client";
import { useCart } from "~/lib/useCart";
import type { ProductCategory } from "~/server/db/schema";
import type { AppRouter } from "~/server/trpc/root";

import { CrewPage, StatusText } from "../_components/CrewPage";
import { CrewSheet } from "../_components/CrewSheet";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Catalog = RouterOutputs["catalog"]["today"];
type CatalogProduct = Catalog["products"][number];
type StoreHit = RouterOutputs["crew"]["storeSearch"][number];
type SaleRow = RouterOutputs["crew"]["salesToday"][number];

/** Separate from the owner's order cart — a helper's phone may hold both. */
const SALE_CART_KEY = "sarihub.crew.sale.v1";

type Line = {
  productUnitId: string;
  nameTl: string;
  labelTl: string;
  quantity: number;
  priceCentavos: bigint;
  totalCentavos: bigint;
};

export function SellClient() {
  const dict = useDictionary();
  return (
    <CrewPage title={dict.crew.sell.title}>{({ routeId }) => <SellBoard routeId={routeId} />}</CrewPage>
  );
}

function SellBoard(props: { routeId: string }) {
  const dict = useDictionary();
  const catalogQuery = trpc.catalog.today.useQuery();
  const { cart, setQuantity, clear, rotateKey } = useCart(SALE_CART_KEY);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const products = useMemo(() => catalogQuery.data?.products ?? [], [catalogQuery.data]);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!needle) return true;
      return p.nameTl.toLowerCase().includes(needle) || p.nameEn.toLowerCase().includes(needle);
    });
  }, [products, search, category]);

  const unitIndex = useMemo(() => {
    const map = new Map<string, { product: CatalogProduct; labelTl: string; priceCentavos: bigint }>();
    for (const p of products) {
      for (const u of p.units) {
        if (u.priceCentavos !== null && !u.outOfStock) {
          map.set(u.id, { product: p, labelTl: u.labelTl, priceCentavos: u.priceCentavos });
        }
      }
    }
    return map;
  }, [products]);

  const lines: Line[] = useMemo(
    () =>
      Object.entries(cart.quantities).flatMap(([unitId, quantity]) => {
        const unit = unitIndex.get(unitId);
        if (!unit) return [];
        return [
          {
            productUnitId: unitId,
            nameTl: unit.product.nameTl,
            labelTl: unit.labelTl,
            quantity,
            priceCentavos: unit.priceCentavos,
            totalCentavos: unit.priceCentavos * BigInt(quantity),
          },
        ];
      }),
    [cart.quantities, unitIndex],
  );
  const total = lines.reduce((sum, l) => sum + l.totalCentavos, 0n);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  // Drop lines whose unit lost its price or went out of stock while browsing.
  useEffect(() => {
    if (!catalogQuery.data) return;
    for (const id of Object.keys(cart.quantities)) {
      if (!unitIndex.has(id)) setQuantity(id, 0);
    }
  }, [cart.quantities, unitIndex, setQuantity, catalogQuery.data]);

  if (catalogQuery.isLoading) return <StatusText>{dict.common.loading}</StatusText>;
  if (catalogQuery.error || !catalogQuery.data) {
    return <StatusText danger>{dict.common.connectionError}</StatusText>;
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <Search size={18} strokeWidth={2.25} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          inputMode="search"
          placeholder={dict.crew.sell.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 w-full rounded-pill bg-surface pl-11 pr-4 text-[16px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--color-action)]"
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Pill label={dict.home.allCategory} active={category === null} onClick={() => setCategory(null)} />
        {categories.map((c) => (
          <Pill
            key={c}
            label={dict.productCategories[c]}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {visible.length === 0 && <StatusText>{dict.home.noResults}</StatusText>}
        {visible.map((p) => (
          <SaleProductCard key={p.id} product={p} quantities={cart.quantities} setQuantity={setQuantity} />
        ))}
      </div>

      <RecentSales routeId={props.routeId} onOpen={setReceiptId} />

      {count > 0 && !sheetOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40 px-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="animate-sheet-up pointer-events-auto mx-auto flex h-16 w-full max-w-[408px] items-center gap-3 rounded-pill bg-action pl-3 pr-6 text-white shadow-[var(--shadow-float)] transition-transform active:scale-[0.98]"
          >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <ShoppingCart size={20} strokeWidth={2.25} />
              <span className="tnum absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-ink">
                {count}
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold">
              {count === 1 ? dict.crew.sell.cartButtonOne : dict.crew.sell.cartButtonOther}
            </span>
            <span className="price shrink-0 text-[16px] font-bold">{formatPeso(total)}</span>
          </button>
        </div>
      )}

      {sheetOpen && (
        <SaleSheet
          routeId={props.routeId}
          lines={lines}
          total={total}
          idempotencyKey={cart.idempotencyKey}
          setQuantity={setQuantity}
          onDone={clear}
          onStaleKey={rotateKey}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {receiptId && <ReceiptSheet saleId={receiptId} onClose={() => setReceiptId(null)} />}
    </div>
  );
}

function Pill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-pill px-4 text-[15px] font-semibold transition-all active:scale-95",
        props.active ? "bg-action text-white" : "bg-surface text-ink shadow-[var(--shadow-card)]",
      )}
    >
      {props.label}
    </button>
  );
}

function SaleProductCard(props: {
  product: CatalogProduct;
  quantities: Record<string, number>;
  setQuantity: (unitId: string, qty: number) => void;
}) {
  const { product, quantities, setQuantity } = props;
  const dict = useDictionary();
  return (
    <article className="rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]">
      <h3 className="lbl-tag truncate">{product.nameTl}</h3>
      <p className="lbl-en truncate">{product.nameEn}</p>
      <ul className="mt-2 flex flex-col">
        {product.units.map((u) => {
          const qty = quantities[u.id] ?? 0;
          const unavailable = u.outOfStock || u.priceCentavos === null;
          return (
            <li key={u.id} className="hair-t flex min-h-[60px] items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className={cn("text-[16px] font-medium", unavailable && "text-ink-3")}>{u.labelTl}</div>
                {u.outOfStock ? (
                  <div className="text-[13px] font-medium text-danger">{dict.crew.sell.outOfStock}</div>
                ) : u.priceCentavos === null ? (
                  <div className="text-[13px] text-ink-3">{dict.crew.sell.noPrice}</div>
                ) : (
                  <div className="price text-[15px] font-semibold text-ink-2">{formatPeso(u.priceCentavos)}</div>
                )}
              </div>
              {!unavailable &&
                (qty === 0 ? (
                  <button
                    type="button"
                    aria-label={interpolate(dict.home.addAria, { name: product.nameTl, unit: u.labelTl })}
                    onClick={() => setQuantity(u.id, 1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action text-white transition-transform active:scale-90"
                  >
                    <Plus size={22} strokeWidth={2.5} />
                  </button>
                ) : (
                  <Stepper
                    qty={qty}
                    onChange={(n) => setQuantity(u.id, n)}
                    decreaseLabel={interpolate(dict.home.decreaseAria, { name: product.nameTl, unit: u.labelTl })}
                    increaseLabel={interpolate(dict.home.increaseAria, { name: product.nameTl, unit: u.labelTl })}
                  />
                ))}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function SaleSheet(props: {
  routeId: string;
  lines: Line[];
  total: bigint;
  idempotencyKey: string;
  setQuantity: (unitId: string, qty: number) => void;
  onDone: () => void;
  onStaleKey: () => void;
  onClose: () => void;
}) {
  const { lines, total } = props;
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const [customerMode, setCustomerMode] = useState<"walkin" | "store">("walkin");
  const [customerName, setCustomerName] = useState("");
  const [store, setStore] = useState<StoreHit | null>(null);
  const [payment, setPayment] = useState<"cash" | "suki">("cash");
  const [tendered, setTendered] = useState("");
  const sell = trpc.crew.sell.useMutation({
    onSuccess(data) {
      void utils.crew.stock.invalidate();
      void utils.crew.salesToday.invalidate();
      void utils.crew.storeSearch.invalidate();
      // Retire the cart (and its key) the moment the sale lands, not when the
      // success sheet is dismissed — a killed PWA must not carry this key
      // into tomorrow's sale and get this one echoed back as "Nabenta!".
      if (data.ok) props.onDone();
    },
    onError(error) {
      if (error.data?.code === "CONFLICT") props.onStaleKey();
    },
  });

  // Suki needs a store; dropping the store drops suki too.
  useEffect(() => {
    if (!store && payment === "suki") setPayment("cash");
  }, [store, payment]);

  const tenderedCentavos = pesosToCentavos(tendered);
  /** Sukli preview while ringing up; the success sheet recomputes from the server-locked total. */
  const change = tenderedCentavos !== null ? BigInt(tenderedCentavos) - total : null;
  const sukiRoom = store ? store.sukiLimitCentavos - store.sukiBalanceCentavos : null;

  if (sell.data?.ok) {
    const sale = sell.data.sale;
    // Cash changes hands against what the server actually charged.
    const changeDue = tenderedCentavos !== null ? BigInt(tenderedCentavos) - sale.totalCentavos : null;
    const finish = () => props.onClose();
    return (
      <CrewSheet title={dict.crew.sell.soldTitle} onClose={finish}>
        <div className="py-4 text-center">
          <div className="animate-pop-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-action text-white">
            <Check size={40} strokeWidth={3} />
          </div>
          <p className="price mt-4 text-[17px] text-ink-2">
            {sale.payment === "cash"
              ? interpolate(dict.crew.sell.soldSubtitleCash, { price: formatPeso(sale.totalCentavos) })
              : interpolate(dict.crew.sell.soldSubtitleSuki, {
                  price: formatPeso(sale.totalCentavos),
                  name: store?.ownerName ?? "",
                })}
          </p>
          {sale.payment === "cash" && changeDue !== null && changeDue >= 0n && (
            <p className="price mt-1 text-[15px] text-ink-2">
              {dict.crew.sell.changeLabel}: <span className="font-semibold text-ink">{formatPeso(changeDue)}</span>
            </p>
          )}
          <Button size="lg" block className="mt-6" onClick={finish}>
            {dict.crew.sell.ok}
          </Button>
        </div>
      </CrewSheet>
    );
  }

  return (
    <CrewSheet title={dict.crew.sell.cartTitle} onClose={props.onClose}>
      <ul className="mt-2">
        {lines.map((l) => (
          <li key={l.productUnitId} className="hair-b flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{l.nameTl}</div>
              <div className="price text-[14px] text-ink-2">
                {l.labelTl} · {formatPeso(l.priceCentavos)}
              </div>
            </div>
            <Stepper
              qty={l.quantity}
              onChange={(n) => props.setQuantity(l.productUnitId, n)}
              decreaseLabel={interpolate(dict.home.decreaseAria, { name: l.nameTl, unit: l.labelTl })}
              increaseLabel={interpolate(dict.home.increaseAria, { name: l.nameTl, unit: l.labelTl })}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between py-4">
        <span className="text-[15px] text-ink-2">{dict.crew.sell.total}</span>
        <span className="price text-[24px] font-bold tracking-tight">{formatPeso(total)}</span>
      </div>

      <span className="section-label mb-2 block">{dict.crew.sell.customerLabel}</span>
      <Segmented
        options={[
          { value: "walkin", label: dict.crew.sell.walkIn, icon: User },
          { value: "store", label: dict.crew.sell.pickStore, icon: Store },
        ]}
        value={customerMode}
        onChange={(v) => {
          setCustomerMode(v);
          if (v === "walkin") setStore(null);
        }}
      />
      {customerMode === "walkin" ? (
        <Input
          className="mt-3"
          placeholder={dict.crew.sell.walkInNamePlaceholder}
          value={customerName}
          maxLength={80}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      ) : store ? (
        <div className="mt-3 flex items-center gap-3 rounded-md bg-surface-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold">{store.name}</div>
            <div className="truncate text-[14px] text-ink-2">
              {store.ownerName} · <span className="tnum">{formatPhone(store.phoneE164)}</span>
            </div>
            {sukiRoom !== null && (
              <div className={cn("price mt-0.5 text-[13px]", sukiRoom < total ? "text-danger" : "text-ink-2")}>
                {interpolate(dict.crew.sell.sukiRoom, { available: formatPeso(sukiRoom > 0n ? sukiRoom : 0n) })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStore(null)}
            className="h-11 shrink-0 rounded-pill bg-surface px-4 text-[14px] font-semibold"
          >
            {dict.crew.sell.changeStore}
          </button>
        </div>
      ) : (
        <StoreSearch routeId={props.routeId} onPick={setStore} />
      )}

      <span className="section-label mb-2 mt-5 block">{dict.crew.sell.paymentLabel}</span>
      <Segmented
        options={[
          { value: "cash", label: dict.crew.sell.payCash },
          { value: "suki", label: dict.crew.sell.paySuki, disabled: !store },
        ]}
        value={payment}
        onChange={setPayment}
      />
      {!store && customerMode === "store" && (
        <p className="mt-2 text-[13px] text-ink-2">{dict.crew.sell.sukiNeedsStore}</p>
      )}

      {payment === "cash" && (
        <div className="mt-3 flex items-center gap-3">
          <label className="flex h-[52px] flex-1 items-center gap-1.5 rounded-md bg-surface-2 px-4 focus-within:bg-surface">
            <span className="text-[15px] text-ink-2">₱</span>
            <input
              inputMode="decimal"
              aria-label={dict.crew.sell.tenderedLabel}
              placeholder={dict.crew.sell.tenderedLabel}
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="tnum w-full bg-transparent text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
            />
          </label>
          <div className="shrink-0 text-right">
            <div className="text-[12px] text-ink-2">{dict.crew.sell.changeLabel}</div>
            <div className={cn("price text-[17px] font-bold", change !== null && change < 0n && "text-danger")}>
              {change !== null ? formatPeso(change) : "—"}
            </div>
          </div>
        </div>
      )}

      {sell.error && (
        <p role="alert" className="mt-4 text-[14px] font-medium text-danger">
          {sell.error.message}
        </p>
      )}

      <Button
        size="lg"
        block
        className="mt-5 h-16 text-[19px]"
        disabled={sell.isPending || lines.length === 0 || (customerMode === "store" && !store)}
        onClick={() =>
          sell.mutate({
            routeId: props.routeId,
            idempotencyKey: props.idempotencyKey,
            storeId: store?.id ?? null,
            customerName: customerMode === "walkin" && customerName.trim() ? customerName.trim() : undefined,
            payment,
            items: lines.map((l) => ({ productUnitId: l.productUnitId, quantity: l.quantity })),
          })
        }
      >
        {sell.isPending
          ? dict.crew.sell.selling
          : interpolate(dict.crew.sell.confirmButton, { price: formatPeso(total) })}
      </Button>
    </CrewSheet>
  );
}

function Segmented<T extends string>(props: {
  options: Array<{ value: T; label: string; icon?: typeof User; disabled?: boolean }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md bg-surface-2 p-1">
      {props.options.map((o) => {
        const Icon = o.icon;
        const active = o.value === props.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={o.disabled}
            aria-pressed={active}
            onClick={() => props.onChange(o.value)}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-sm text-[15px] font-semibold transition-colors disabled:opacity-40",
              active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2",
            )}
          >
            {Icon && <Icon size={17} strokeWidth={2.25} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function StoreSearch(props: { routeId: string; onPick: (store: StoreHit) => void }) {
  const dict = useDictionary();
  const [q, setQ] = useState("");
  const searchQuery = trpc.crew.storeSearch.useQuery({ routeId: props.routeId, q: q.trim() });
  const hits = searchQuery.data ?? [];
  return (
    <div className="mt-3">
      <Input
        placeholder={dict.crew.sell.storeSearchPlaceholder}
        value={q}
        maxLength={60}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <ul className="mt-2 overflow-hidden rounded-md bg-surface-2">
        {hits.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => props.onPick(s)}
              className="hair-b flex min-h-[56px] w-full items-center gap-3 px-4 text-left last:border-b-0 active:bg-hair"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{s.name}</span>
                <span className="block truncate text-[13px] text-ink-2">{s.ownerName}</span>
              </span>
              {s.routeId === props.routeId && <span className="h-2 w-2 shrink-0 rounded-full bg-action" />}
            </button>
          </li>
        ))}
        {!searchQuery.isLoading && hits.length === 0 && (
          <li className="px-4 py-3 text-[14px] text-ink-2">{dict.crew.sell.noStoreFound}</li>
        )}
      </ul>
    </div>
  );
}

function RecentSales(props: { routeId: string; onOpen: (saleId: string) => void }) {
  const dict = useDictionary();
  const { locale } = useLocale();
  const salesQuery = trpc.crew.salesToday.useQuery({ routeId: props.routeId }, { refetchInterval: 60_000 });
  const sales: SaleRow[] = salesQuery.data ?? [];
  return (
    <section className="mt-8">
      <h2 className="section-label mb-2 px-1">{dict.crew.sell.recentHeading}</h2>
      {sales.length === 0 ? (
        <p className="rounded-lg bg-surface px-4 py-6 text-center text-[14px] text-ink-2 shadow-[var(--shadow-card)]">
          {dict.crew.sell.recentEmpty}
        </p>
      ) : (
        <Card>
          {sales.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => props.onOpen(s.id)}
              className="hair-b flex min-h-[60px] w-full items-center gap-3 px-4 text-left last:border-b-0 active:bg-surface-2"
            >
              <Receipt size={20} strokeWidth={1.75} className="shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {s.storeName ?? s.customerName ?? dict.crew.sell.receiptWalkIn}
                </span>
                <span className="tnum block text-[13px] text-ink-2">
                  {formatManilaTime(s.createdAt, locale)} ·{" "}
                  {s.payment === "cash" ? dict.crew.sell.receiptCash : dict.crew.sell.receiptSuki}
                </span>
              </span>
              <span className="price shrink-0 text-[15px] font-semibold">{formatPeso(s.totalCentavos)}</span>
            </button>
          ))}
        </Card>
      )}
    </section>
  );
}

function ReceiptSheet(props: { saleId: string; onClose: () => void }) {
  const dict = useDictionary();
  const { locale } = useLocale();
  const saleQuery = trpc.crew.sale.useQuery({ saleId: props.saleId });
  const sale = saleQuery.data;
  return (
    <CrewSheet
      title={dict.crew.sell.receiptTitle}
      subtitle={
        sale
          ? `${sale.storeName ?? sale.customerName ?? dict.crew.sell.receiptWalkIn} · ${formatManilaTime(sale.createdAt, locale)}`
          : undefined
      }
      onClose={props.onClose}
    >
      {saleQuery.isLoading && <p className="py-6 text-center text-[15px] text-ink-2">{dict.common.loading}</p>}
      {saleQuery.error && <p className="py-6 text-center text-[15px] text-danger">{dict.common.connectionError}</p>}
      {sale && (
        <>
          <ul className="mt-3">
            {sale.items.map((i) => (
              <li key={i.id} className="hair-b flex items-center justify-between gap-3 py-3 text-[15px]">
                <span className="min-w-0">
                  {i.nameTl} <span className="text-ink-2">{i.unitLabelTl}</span>
                  <span className="tnum text-ink-2"> ×{i.quantity}</span>
                </span>
                <span className="price shrink-0 font-semibold">{formatPeso(i.lockedTotalCentavos)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between py-4">
            <span className="text-[15px] text-ink-2">
              {sale.payment === "cash" ? dict.crew.sell.receiptCash : dict.crew.sell.receiptSuki}
            </span>
            <span className="price text-[24px] font-bold tracking-tight">{formatPeso(sale.totalCentavos)}</span>
          </div>
        </>
      )}
      <Button variant="secondary" size="lg" block onClick={props.onClose}>
        <X size={18} strokeWidth={2.5} />
        {dict.common.closeAria}
      </Button>
    </CrewSheet>
  );
}
