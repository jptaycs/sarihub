"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartState {
  /** One key per cart; a retried submit reuses it so the order can't double. */
  idempotencyKey: string;
  /** productUnitId → quantity. */
  quantities: Record<string, number>;
}

const OWNER_CART_KEY = "sarihub.cart.v1";

function freshCart(): CartState {
  return { idempotencyKey: crypto.randomUUID(), quantities: {} };
}

function loadCart(storageKey: string): CartState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return freshCart();
    const parsed = JSON.parse(raw) as CartState;
    if (typeof parsed.idempotencyKey !== "string" || typeof parsed.quantities !== "object") {
      return freshCart();
    }
    return parsed;
  } catch {
    return freshCart();
  }
}

/**
 * Cart persisted to localStorage — a 9 PM order on patchy 4G must survive an
 * accidental tab close. Starts empty during SSR, hydrates on mount.
 *
 * `storageKey` separates carts that must never mix: the owner's order cart
 * (default) and the crew app's POS sale cart live under different keys.
 */
export function useCart(storageKey: string = OWNER_CART_KEY) {
  const [cart, setCart] = useState<CartState>(freshCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(loadCart(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Storage full or blocked — the in-memory cart still works.
    }
  }, [cart, hydrated, storageKey]);

  const setQuantity = useCallback((productUnitId: string, quantity: number) => {
    setCart((prev) => {
      const quantities = { ...prev.quantities };
      if (quantity <= 0) delete quantities[productUnitId];
      else quantities[productUnitId] = Math.min(quantity, 999);
      return { ...prev, quantities };
    });
  }, []);

  const clear = useCallback(() => setCart(freshCart()), []);

  return { cart, setQuantity, clear };
}
