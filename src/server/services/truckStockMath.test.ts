import { describe, expect, it } from "vitest";

import { loadShortfall, onHand, tallyMovements } from "./truckStockMath";

describe("onHand", () => {
  it("adds what went on the truck and subtracts what came off", () => {
    expect(onHand({ loaded: 10, added: 3, reduced: 1, sold: 4, delivered: 5 })).toBe(3);
  });

  it("goes negative when more left the truck than was recorded as loaded", () => {
    expect(onHand({ loaded: 0, added: 0, reduced: 0, sold: 2, delivered: 1 })).toBe(-3);
  });
});

describe("loadShortfall", () => {
  it("is the gap between what orders need and what is already on board", () => {
    expect(loadShortfall(10, 4)).toBe(6);
  });

  it("never asks to load more when the truck already carries enough", () => {
    expect(loadShortfall(4, 10)).toBe(0);
  });

  it("is zero when nothing is needed", () => {
    expect(loadShortfall(0, 0)).toBe(0);
  });
});

describe("tallyMovements", () => {
  it("groups movements per unit and maps each kind to its bucket", () => {
    const tally = tallyMovements([
      { productUnitId: "u1", kind: "load", quantity: 10 },
      { productUnitId: "u1", kind: "add", quantity: 2 },
      { productUnitId: "u1", kind: "reduce", quantity: 1 },
      { productUnitId: "u1", kind: "sale", quantity: 3 },
      { productUnitId: "u2", kind: "sale", quantity: 1 },
    ]);
    expect(tally.get("u1")).toEqual({ loaded: 10, added: 2, reduced: 1, sold: 3 });
    expect(tally.get("u2")).toEqual({ loaded: 0, added: 0, reduced: 0, sold: 1 });
  });

  it("returns an empty map for no movements", () => {
    expect(tallyMovements([]).size).toBe(0);
  });
});
