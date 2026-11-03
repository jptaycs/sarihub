import { describe, expect, it } from "vitest";

import { createPosSaleInput, recordStockMovementInput } from "./crew";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("recordStockMovementInput", () => {
  it("accepts an add without a reason", () => {
    const r = recordStockMovementInput.safeParse({
      routeId: uuid,
      productUnitId: uuid,
      kind: "add",
      quantity: 2,
    });
    expect(r.success).toBe(true);
  });

  it("requires a reason for a reduce", () => {
    const r = recordStockMovementInput.safeParse({
      routeId: uuid,
      productUnitId: uuid,
      kind: "reduce",
      quantity: 1,
    });
    expect(r.success).toBe(false);
  });

  it("accepts a reduce with a reason", () => {
    const r = recordStockMovementInput.safeParse({
      routeId: uuid,
      productUnitId: uuid,
      kind: "reduce",
      quantity: 1,
      reason: "nabulok",
    });
    expect(r.success).toBe(true);
  });
});

describe("createPosSaleInput", () => {
  const base = {
    routeId: uuid,
    idempotencyKey: uuid,
    items: [{ productUnitId: uuid, quantity: 1 }],
  };

  it("accepts a cash walk-in sale with no store", () => {
    expect(createPosSaleInput.safeParse({ ...base, payment: "cash", storeId: null }).success).toBe(
      true,
    );
  });

  it("refuses a suki sale without a store", () => {
    expect(createPosSaleInput.safeParse({ ...base, payment: "suki", storeId: null }).success).toBe(
      false,
    );
  });

  it("accepts a suki sale with a store", () => {
    expect(createPosSaleInput.safeParse({ ...base, payment: "suki", storeId: uuid }).success).toBe(
      true,
    );
  });

  it("refuses an empty sale", () => {
    expect(
      createPosSaleInput.safeParse({ ...base, items: [], payment: "cash", storeId: null }).success,
    ).toBe(false);
  });
});
