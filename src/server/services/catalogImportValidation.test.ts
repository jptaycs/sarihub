import { describe, expect, it } from "vitest";

import { getDictionary } from "~/lib/i18n/dictionaries";

import { validateRow } from "./catalogImportValidation";

const errors = getDictionary("tl").admin.catalog.csvImport.errors;

describe("validateRow", () => {
  it("accepts a valid row with both prices", () => {
    expect(
      validateRow(
        { name: "Sibuyas", category: "gulay", pack_price: "161.00", individual_price: "15" },
        errors,
      ),
    ).toEqual({
      ok: true,
      row: { name: "Sibuyas", category: "gulay", packCentavos: 16100, individualCentavos: 1500 },
    });
  });

  it("treats blank prices as 'no price this round', not an error", () => {
    expect(
      validateRow({ name: "Kamatis", category: "gulay", pack_price: "", individual_price: "" }, errors),
    ).toEqual({
      ok: true,
      row: { name: "Kamatis", category: "gulay", packCentavos: null, individualCentavos: null },
    });
  });

  it("matches category case-insensitively", () => {
    expect(
      validateRow({ name: "Sibuyas", category: "GULAY", pack_price: "", individual_price: "" }, errors),
    ).toEqual({
      ok: true,
      row: { name: "Sibuyas", category: "gulay", packCentavos: null, individualCentavos: null },
    });
  });

  it("rejects a blank name", () => {
    expect(
      validateRow({ name: "  ", category: "gulay", pack_price: "1", individual_price: "" }, errors),
    ).toEqual({ ok: false, reason: errors.blankName });
  });

  it("rejects an unknown category", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "prutas", pack_price: "", individual_price: "" },
      errors,
    );
    expect(result).toEqual({ ok: false, reason: 'Hindi kilalang kategorya: "prutas".' });
  });

  it("rejects a malformed price", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "gulay", pack_price: "abc", individual_price: "" },
      errors,
    );
    expect(result).toEqual({ ok: false, reason: 'Hindi tamang presyo (pack_price): "abc".' });
  });

  it("rejects a zero price", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "gulay", pack_price: "0", individual_price: "" },
      errors,
    );
    expect(result).toEqual({ ok: false, reason: 'Masyadong maliit o malaki ang presyo (pack_price): "0".' });
  });

  it("rejects a price above the ₱100,000 cap", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "gulay", pack_price: "", individual_price: "999999999" },
      errors,
    );
    expect(result).toEqual({
      ok: false,
      reason: 'Masyadong maliit o malaki ang presyo (individual_price): "999999999".',
    });
  });
});
