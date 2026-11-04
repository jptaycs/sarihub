import { describe, expect, it } from "vitest";

import { isPersistedQuery, persistSerializer } from "./queryPersist";

describe("isPersistedQuery", () => {
  it("keeps only the public catalog (today's price list)", () => {
    expect(isPersistedQuery([["catalog", "today"], { type: "query" }])).toBe(true);
    expect(isPersistedQuery([["store", "me"], { type: "query" }])).toBe(false);
    expect(isPersistedQuery([["admin", "suki", "exposure"], { type: "query" }])).toBe(false);
    expect(isPersistedQuery([])).toBe(false);
  });
});

describe("persistSerializer", () => {
  it("round-trips centavo bigints and dates, which JSON.stringify can't", () => {
    const value = { pricedAt: new Date("2026-11-05T00:00:00Z"), priceCentavos: 12_345n };
    const back = persistSerializer.deserialize(persistSerializer.serialize(value)) as typeof value;
    expect(back.priceCentavos).toBe(12_345n);
    expect(back.pricedAt).toBeInstanceOf(Date);
    expect(back.pricedAt.toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });
});
