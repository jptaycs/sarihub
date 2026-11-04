"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Carrot,
  Check,
  ChevronRight,
  CookingPot,
  Egg,
  Fish,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "~/components/ui/Button";
import { Wordmark } from "~/components/ui/Logo";
import { Stepper } from "~/components/ui/Stepper";
import { cn } from "~/lib/cn";
import { loginHref } from "~/lib/safeNext";
import { formatManila, now, toManila } from "~/lib/datetime";
import { nextDeliveryDate } from "~/lib/deliverySchedule";
import { formatPeso } from "~/lib/format";
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import type { Locale } from "~/lib/i18n/locale";
import { PERSIST_MAX_AGE_MS } from "~/lib/queryPersist";
import { trpc } from "~/lib/trpc/client";
import { useCart } from "~/lib/useCart";
import type { ProductCategory } from "~/server/db/schema";
import type { AppRouter } from "~/server/trpc/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Catalog = RouterOutputs["catalog"]["today"];
type CatalogProduct = Catalog["products"][number];
type StoreMe = RouterOutputs["store"]["me"];

/** Shared empty slice so a card with nothing in the cart keeps a stable prop. */
const EMPTY_QUANTITIES: Record<string, number> = {};

/** Where a guest lands after signing in from the cart: back here, cart open. */
const CHECKOUT_RETURN = "/home?checkout=1";

const CATEGORY_ICON: Record<ProductCategory, LucideIcon> = {
  gulay: Carrot,
  itlog: Egg,
  isda: Fish,
  kusina: CookingPot,
};

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

export function HomeClient(props: { signedIn: boolean; openCartOnLoad: boolean }) {
  const { signedIn } = props;
  const dict = useDictionary();
  const { locale } = useLocale();
  const router = useRouter();
  // Guests have no store; skip the call rather than eat an UNAUTHORIZED.
  const storeQuery = trpc.store.me.useQuery(undefined, { enabled: signedIn });
  // Persisted across app launches (see queryPersist.ts): gcTime ≥ the
  // persister's maxAge or the restored copy is collected before it's shown;
  // staleTime 0 so a restored list always refetches on mount instead of
  // passing as fresh for 30 s; one retry so "no signal" shows in about a
  // second rather than after three backoffs.
  const catalogQuery = trpc.catalog.today.useQuery(undefined, {
    gcTime: PERSIST_MAX_AGE_MS,
    staleTime: 0,
    retry: 1,
  });
  const { cart, setQuantity, clear, rotateKey, hydrated } = useCart();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const products = useMemo(() => catalogQuery.data?.products ?? [], [catalogQuery.data]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  // Typing stays responsive on a budget phone: the list filters a beat behind the keystroke.
  const deferredSearch = useDeferredValue(search);
  const visibleProducts = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!needle) return true;
      return p.nameTl.toLowerCase().includes(needle) || p.nameEn.toLowerCase().includes(needle);
    });
  }, [products, deferredSearch, category]);

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

  /** Per-product slice of the cart, stable by value so untouched cards skip re-rendering. */
  const cardQuantities = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const p of products) {
      const slice: Record<string, number> = {};
      let any = false;
      for (const u of p.units) {
        const q = cart.quantities[u.id];
        if (q) {
          slice[u.id] = q;
          any = true;
        }
      }
      if (any) map.set(p.id, slice);
    }
    return map;
  }, [products, cart.quantities]);
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
  // submitted yet. Prune it from the cart and say why, instead of silently
  // shrinking the total.
  useEffect(() => {
    // Guard against the catalog's first load: `unitIndex` is empty until
    // catalogQuery.data arrives, which would otherwise look identical to
    // "every cart line just went stale" and wipe a just-hydrated cart.
    if (!catalogQuery.data) return;
    const staleIds = Object.keys(cart.quantities).filter((id) => !unitIndex.has(id));
    if (staleIds.length === 0) return;
    const names = staleIds
      .map((id) => allUnitIndex.get(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map((u) => `${u.product.nameTl} (${u.labelTl})`);
    staleIds.forEach((id) => setQuantity(id, 0));
    if (names.length > 0) setRemovedNotice(names);
  }, [cart.quantities, unitIndex, allUnitIndex, setQuantity, catalogQuery.data]);

  // Coming back from sign-in at checkout: reopen the cart once it has
  // hydrated, then drop `?checkout=1` so a refresh doesn't reopen it again.
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    // `hydrated` matters: coming back from sign-in, the catalog is often
    // already in the query cache, so this would otherwise run against the
    // empty pre-hydration cart and never open the sheet.
    if (!props.openCartOnLoad || autoOpened || !catalogQuery.data || !hydrated) return;
    setAutoOpened(true);
    if (cartLines.length > 0) setSheetOpen(true);
    router.replace("/home", { scroll: false });
  }, [props.openCartOnLoad, autoOpened, catalogQuery.data, hydrated, cartLines.length, router]);

  const store = storeQuery.data ?? null;
  const loading = catalogQuery.isLoading || (signedIn && storeQuery.isLoading);
  // A cached price list beats a blank error: with no signal the owner still
  // sees last night's prices (flagged below). No cache at all is a real failure.
  // `paused` is React Query's state when the browser reports no network at
  // all — the fetch never starts, so there is no error to show either.
  const offlineCatalog = Boolean(
    catalogQuery.data && (catalogQuery.error || catalogQuery.fetchStatus === "paused"),
  );
  const failed = (catalogQuery.error && !catalogQuery.data) || (signedIn && storeQuery.error);

  return (
    <div className="flex flex-1 flex-col">
      <header className="glass sticky top-0 z-30 -mx-5 flex h-14 items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
        <Wordmark />
        {!signedIn && (
          <Link
            href={loginHref("/home")}
            className="rounded-pill bg-action inline-flex h-11 items-center px-5 text-[14px] font-semibold text-white transition-transform active:scale-95"
          >
            {dict.guest.signIn}
          </Link>
        )}
      </header>

      {signedIn ? (
        <section className="pt-4">
          <p className="text-ink-2 text-[15px]">{greeting(dict)}</p>
          <h1 className="title-large mt-0.5">{store?.ownerName ?? "Suki"}</h1>
          {store ? <SukiCard store={store} /> : !loading && <Notice>{dict.home.noStore}</Notice>}
        </section>
      ) : (
        <GuestHero />
      )}

      <div className="relative mt-5">
        <Search
          size={18}
          strokeWidth={2.25}
          className="text-ink-3 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <input
          type="search"
          inputMode="search"
          placeholder={dict.home.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-pill bg-surface text-ink placeholder:text-ink-3 h-12 w-full pr-4 pl-11 text-[16px] shadow-[var(--shadow-card)] transition-shadow outline-none focus:shadow-[0_0_0_2px_var(--color-action)]"
        />
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        <CategoryPill
          label={dict.home.allCategory}
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={dict.productCategories[c]}
            icon={CATEGORY_ICON[c]}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          />
        ))}
      </div>

      {removedNotice && (
        <div className="bg-warning-soft text-warning mt-3 flex items-start justify-between gap-3 rounded-md px-4 py-3 text-[14px]">
          <span>
            {interpolate(dict.home.cartItemsRemovedNotice, { names: removedNotice.join(", ") })}
          </span>
          <button
            type="button"
            onClick={() => setRemovedNotice(null)}
            className="shrink-0 font-semibold underline"
          >
            {dict.home.cartItemsRemovedDismiss}
          </button>
        </div>
      )}

      <h2 className="section-label mt-6 mb-2 px-1">{dict.home.todaysPrices}</h2>

      {offlineCatalog && catalogQuery.data && (
        <p role="status" className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning">
          {interpolate(dict.home.offlineNotice, {
            time: formatManila(catalogQuery.data.pricedAt, "EEE h:mm a", locale),
          })}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {loading && <ProductSkeleton />}
        {failed && !loading && (
          <p className="text-danger pt-8 text-center text-[14px]">{dict.common.connectionError}</p>
        )}
        {!loading && !failed && visibleProducts.length === 0 && (
          <p className="text-ink-2 pt-8 text-center text-[14px]">{dict.home.noResults}</p>
        )}
        {!loading &&
          !failed &&
          visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              quantities={cardQuantities.get(p.id) ?? EMPTY_QUANTITIES}
              setQuantity={setQuantity}
            />
          ))}
      </div>

      {cartCount > 0 && !sheetOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] z-40 px-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="animate-sheet-up rounded-pill bg-action pointer-events-auto mx-auto flex h-16 w-full max-w-[420px] items-center gap-3 pr-6 pl-3 text-white shadow-[var(--shadow-float)] transition-transform active:scale-[0.98]"
          >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <ShoppingBag size={20} strokeWidth={2.25} />
              <span className="tnum text-ink absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold">
                {cartCount}
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold">
              {interpolate(
                cartCount === 1 ? dict.home.viewOrderButtonOne : dict.home.viewOrderButtonOther,
                { count: cartCount },
              )}
            </span>
            <span className="price shrink-0 text-[16px] font-bold">{formatPeso(cartTotal)}</span>
          </button>
        </div>
      )}

      {sheetOpen && (
        <CartSheet
          signedIn={signedIn}
          store={store}
          lines={cartLines}
          totalCentavos={cartTotal}
          idempotencyKey={cart.idempotencyKey}
          setQuantity={setQuantity}
          onDone={clear}
          onStaleKey={rotateKey}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function GuestHero() {
  const dict = useDictionary();
  const steps = [dict.guest.stepBrowse, dict.guest.stepSignIn, dict.guest.stepDelivered];
  return (
    <section className="bg-action mt-4 overflow-hidden rounded-xl p-6 text-white">
      <div className="flex items-center gap-2 text-[13px] font-medium text-white/60">
        <Truck size={16} strokeWidth={2.25} />
        {dict.guest.welcome}
      </div>
      <h1 className="mt-3 text-[28px] leading-[1.1] font-bold tracking-[-0.025em]">
        {dict.guest.heroTitle}
      </h1>
      <p className="mt-2 text-[15px] leading-snug text-white/70">{dict.guest.heroSubtitle}</p>
      <ol className="mt-5 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-[15px] font-medium">
            <span className="tnum text-ink flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SukiCard({ store }: { store: NonNullable<StoreMe> }) {
  const dict = useDictionary();
  const limit = Number(store.sukiLimitCentavos);
  const used = Number(store.sukiBalanceCentavos);
  const pct = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  return (
    <Link
      href="/profile"
      className="bg-surface mt-4 block rounded-lg p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-ink-2 text-[14px] font-medium">{dict.home.sukiTab}</span>
        <ChevronRight size={18} className="text-ink-3" />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="price text-[26px] font-bold tracking-tight">
          {formatPeso(store.sukiBalanceCentavos)}
        </span>
        <span className="price text-ink-3 text-[14px]">
          / {formatPeso(store.sukiLimitCentavos)}
        </span>
      </div>
      <div className="rounded-pill bg-surface-2 mt-3 h-1.5 overflow-hidden">
        <div
          className={cn("rounded-pill h-full", pct >= 90 ? "bg-danger" : "bg-action")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-warning-soft text-warning mt-4 rounded-md px-4 py-3 text-[14px] leading-snug">
      {children}
    </div>
  );
}

function CategoryPill(props: {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        "rounded-pill inline-flex h-10 shrink-0 items-center gap-1.5 px-4 text-[15px] font-semibold transition-all active:scale-95",
        props.active ? "bg-action text-white" : "bg-surface text-ink shadow-[var(--shadow-card)]",
      )}
    >
      {Icon && <Icon size={16} strokeWidth={2.25} />}
      {props.label}
    </button>
  );
}

function ProductSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface h-32 animate-pulse rounded-lg" />
      ))}
    </>
  );
}

/**
 * Memoized so a stepper tap on one card doesn't re-render every other card:
 * `quantities` is sliced per card by the parent (`cardQuantities`).
 */
const ProductCard = memo(function ProductCard(props: {
  product: CatalogProduct;
  quantities: Record<string, number>;
  setQuantity: (unitId: string, qty: number) => void;
}) {
  const { product, quantities, setQuantity } = props;
  const dict = useDictionary();
  const Icon = CATEGORY_ICON[product.category];
  return (
    <article className="bg-surface rounded-lg p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className="bg-surface-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-md">
          <Icon size={24} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h3 className="lbl-tag truncate">{product.nameTl}</h3>
          <p className="lbl-en truncate">{product.nameEn}</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col">
        {product.units.map((u) => {
          const qty = quantities[u.id] ?? 0;
          const unavailable = u.outOfStock || u.priceCentavos === null;
          return (
            <li
              key={u.id}
              className="hair-t flex min-h-[60px] items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <div className={cn("text-[16px] font-medium", unavailable && "text-ink-3")}>
                  {u.labelTl}
                </div>
                {u.outOfStock ? (
                  <div className="text-danger text-[13px] font-medium">{dict.home.outOfStock}</div>
                ) : u.priceCentavos === null ? (
                  <div className="text-ink-3 text-[13px]">{dict.home.noPriceBadge}</div>
                ) : (
                  <div className="price text-ink-2 text-[15px] font-semibold">
                    {formatPeso(u.priceCentavos)}
                  </div>
                )}
              </div>

              {!unavailable &&
                (qty === 0 ? (
                  <button
                    type="button"
                    aria-label={interpolate(dict.home.addAria, {
                      name: product.nameTl,
                      unit: u.labelTl,
                    })}
                    onClick={() => setQuantity(u.id, 1)}
                    className="bg-action flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-150 ease-[var(--ease-spring)] active:scale-90"
                  >
                    <Plus size={22} strokeWidth={2.5} />
                  </button>
                ) : (
                  <Stepper
                    qty={qty}
                    onChange={(n) => setQuantity(u.id, n)}
                    decreaseLabel={interpolate(dict.home.decreaseAria, {
                      name: product.nameTl,
                      unit: u.labelTl,
                    })}
                    increaseLabel={interpolate(dict.home.increaseAria, {
                      name: product.nameTl,
                      unit: u.labelTl,
                    })}
                  />
                ))}
            </li>
          );
        })}
      </ul>
    </article>
  );
});

function CartSheet(props: {
  signedIn: boolean;
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
  onStaleKey: () => void;
  onClose: () => void;
}) {
  const { store, lines, totalCentavos, signedIn } = props;
  const dict = useDictionary();
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const place = trpc.orders.place.useMutation({
    onSuccess(data) {
      // Balance moved on the tab; refetch what shows it.
      void utils.store.me.invalidate();
      void utils.orders.list.invalidate();
      // Retire this cart's idempotency key the moment the order lands. If the
      // owner closes the PWA on the success sheet, tomorrow's cart must not
      // reuse the key and get yesterday's order echoed back as "placed".
      if (data.ok) props.onDone();
    },
    onError(error) {
      // The key was already used by another order: get a fresh one so the
      // next tap goes through.
      if (error.data?.code === "CONFLICT") props.onStaleKey();
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
    const finish = () => {
      props.onDone();
      props.onClose();
    };
    return (
      <SheetShell onClose={finish}>
        <div className="py-6 text-center">
          <div className="animate-pop-in bg-action mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white">
            <Check size={40} strokeWidth={3} />
          </div>
          <h2 className="mt-5 text-[24px] font-bold tracking-tight">{dict.cart.placedTitle}</h2>
          <p className="price text-ink-2 mt-2 text-[16px]">
            {interpolate(dict.cart.placedSubtitle, {
              price: formatPeso(placed.totalCentavos),
              when: deliveryLabel(dict, locale, placed.deliverOn),
            })}
          </p>
          <Button size="lg" block className="mt-7" onClick={finish}>
            {dict.cart.ok}
          </Button>
          <Link
            href="/orders"
            className="text-ink mt-4 inline-block text-[15px] font-semibold"
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
      <div className="flex items-center justify-between">
        <h2 className="text-[24px] font-bold tracking-tight">{dict.cart.title}</h2>
        <button
          type="button"
          aria-label={dict.common.closeAria}
          onClick={props.onClose}
          className="bg-surface-2 flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <ul className="mt-3">
        {lines.map((l) => (
          <li key={l.productUnitId} className="hair-b flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{l.nameTl}</div>
              <div className="price text-ink-2 text-[14px]">
                {l.labelTl} · {formatPeso(l.priceCentavos)}
              </div>
            </div>
            <Stepper
              qty={l.quantity}
              onChange={(n) => props.setQuantity(l.productUnitId, n)}
              decreaseLabel={interpolate(dict.home.decreaseAria, {
                name: l.nameTl,
                unit: l.labelTl,
              })}
              increaseLabel={interpolate(dict.home.increaseAria, {
                name: l.nameTl,
                unit: l.labelTl,
              })}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between py-4">
        <span className="text-ink-2 text-[15px]">{dict.common.sukiTotalLabel}</span>
        <span className="price text-[24px] font-bold tracking-tight">
          {formatPeso(totalCentavos)}
        </span>
      </div>

      {deliverOn && (
        <div className="bg-surface-2 text-ink-2 mb-4 flex gap-3 rounded-md px-4 py-3 text-[14px] leading-snug">
          <Truck size={18} strokeWidth={2} className="text-ink mt-0.5 shrink-0" />
          {interpolate(dict.cart.deliveryNote, { when: deliveryLabel(dict, locale, deliverOn) })}
        </div>
      )}

      {signedIn ? (
        <>
          {place.error && (
            <p role="alert" className="text-danger pb-3 text-[14px] font-medium">
              {place.error.message}
            </p>
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
        </>
      ) : (
        <>
          <p className="text-ink-2 pb-4 text-[14px] leading-snug">{dict.guest.checkoutNote}</p>
          <Link
            href={loginHref(CHECKOUT_RETURN)}
            className={cn(
              "rounded-pill bg-action flex h-14 w-full items-center justify-center text-[17px] font-semibold text-white transition-transform active:scale-[0.98]",
              lines.length === 0 && "pointer-events-none opacity-40",
            )}
          >
            {dict.guest.signInToOrder}
          </Link>
        </>
      )}
    </SheetShell>
  );
}

function SheetShell(props: { children: React.ReactNode; onClose: () => void }) {
  const dict = useDictionary();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
      <button
        type="button"
        aria-label={dict.common.closeAria}
        onClick={props.onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div className="animate-sheet-up bg-surface relative max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-xl px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <div className="rounded-pill bg-hair-strong mx-auto mb-4 h-1.5 w-10" />
        {props.children}
      </div>
    </div>
  );
}
