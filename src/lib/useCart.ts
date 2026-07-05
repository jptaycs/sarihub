"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartState {
  /** One key per cart; a retried submit reuses it so the order can't double. */
  idempotencyKey: string;
  /** productUnitId → quantity. */
  quantities: Record<string, number>;
}

const STORAGE_KEY = "sarihub.cart.v1";

function freshCart(): CartState {
  return { idempotencyKey: crypto.randomUUID(), quantities: {} };
}

function loadCart(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
 */
export function useCart() {
  const [cart, setCart] = useState<CartState>(freshCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage full or blocked — the in-memory cart still works.
    }
  }, [cart, hydrated]);

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
