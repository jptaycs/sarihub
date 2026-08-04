import { describe, expect, it } from "vitest";

import { adjustCentavos } from "./pricing";

describe("adjustCentavos", () => {
  it("increases by a percentage, rounding to the nearest centavo", () => {
    expect(adjustCentavos(10000n, "percent", "up", 10)).toBe(11000n);
    expect(adjustCentavos(9999n, "percent", "up", 1)).toBe(10099n);
  });

  it("decreases by a percentage", () => {
    expect(adjustCentavos(10000n, "percent", "down", 10)).toBe(9000n);
  });

  it("increases by a fixed centavos amount", () => {
    expect(adjustCentavos(10000n, "fixed", "up", 500)).toBe(10500n);
  });

  it("decreases by a fixed centavos amount", () => {
    expect(adjustCentavos(10000n, "fixed", "down", 500)).toBe(9500n);
  });

  it("floors at 1 centavo on a steep percent markdown", () => {
    expect(adjustCentavos(100n, "percent", "down", 100)).toBe(1n);
  });

  it("floors at 1 centavo on a steep fixed markdown", () => {
    expect(adjustCentavos(100n, "fixed", "down", 500)).toBe(1n);
  });
});
