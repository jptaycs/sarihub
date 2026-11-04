import { describe, expect, it } from "vitest";

import { advanceOrderStatus, markStopDelivered } from "./optimistic";

const orders = [
  { id: "a", status: "submitted" as const, storeName: "A" },
  { id: "b", status: "packed" as const, storeName: "B" },
];

describe("advanceOrderStatus", () => {
  it("moves only the named order and keeps the array order", () => {
    const out = advanceOrderStatus(orders, "a", "packed");
    expect(out.map((o) => `${o.id}:${o.status}`)).toEqual(["a:packed", "b:packed"]);
    expect(out[0]?.storeName).toBe("A");
  });

  it("returns the same array when the order is not on the board", () => {
    expect(advanceOrderStatus(orders, "zzz", "packed")).toBe(orders);
  });
});

describe("markStopDelivered", () => {
  it("flips the stop to delivered and leaves the others", () => {
    const stops = [
      { id: "a", status: "packed" as const },
      { id: "b", status: "in_transit" as const },
    ];
    const out = markStopDelivered(stops, "b");
    expect(out.map((s) => s.status)).toEqual(["packed", "delivered"]);
  });
});
