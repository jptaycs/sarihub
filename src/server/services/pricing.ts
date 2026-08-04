// Deliberately no "import server-only" here — this is a pure function with no
// DB access, kept directly unit-testable. See the plan's Global Constraints
// note on why "server-only" can't resolve under Vitest in this repo.

const MIN_CENTAVOS = 1n;

/**
 * Adjust a live price by a percent or fixed amount, up or down. Percent math
 * necessarily passes through a float — rounded back to an integer centavos
 * value immediately, in this one function — then floored at 1 centavo so a
 * steep markdown can never zero out or go negative.
 */
export function adjustCentavos(
  currentCentavos: bigint,
  mode: "percent" | "fixed",
  direction: "up" | "down",
  value: number,
): bigint {
  const sign = direction === "up" ? 1 : -1;
  const result =
    mode === "fixed"
      ? currentCentavos + BigInt(Math.round(value)) * BigInt(sign)
      : BigInt(Math.round(Number(currentCentavos) * (1 + (sign * value) / 100)));
  return result < MIN_CENTAVOS ? MIN_CENTAVOS : result;
}
