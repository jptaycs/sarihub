import { describe, expect, it } from "vitest";

import { createStaffInput, createStoreInput, importCsvInput, recordAdjustmentInput, upsertProductInput, upsertUnitInput } from "./admin";
import { bulkAdjustPricesInput, setPriceInput } from "./price";
import { createPosSaleInput, recordStockMovementInput } from "./crew";

const uuid = "11111111-1111-4111-8111-111111111111";

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

/**
 * Schemas are shared by client forms and tRPC routers, so their messages
 * are dictionary keys — the UI (fieldError) and the tRPC error formatter
 * translate them. A raw Tagalog sentence here would show untranslated in
 * the English admin UI.
 */
describe("schema messages are validation keys", () => {
  it("required text fields", () => {
    expect(
      firstMessage(
        upsertProductInput.safeParse({
          nameTl: "",
          nameEn: "x",
          category: "gulay",
          isPerishable: true,
          source: "palengke",
          isActive: true,
        }),
      ),
    ).toBe("validation.required");
    expect(
      firstMessage(
        createStoreInput.safeParse({
          name: "",
          ownerName: "x",
          phone: "09171234567",
          lat: null,
          lng: null,
          routeId: null,
          stopOrder: null,
          sukiLimitCentavos: 0,
        }),
      ),
    ).toBe("validation.required");
  });

  it("digits-only sort order", () => {
    expect(
      firstMessage(
        upsertUnitInput.safeParse({
          productId: uuid,
          labelTl: "kilo",
          labelEn: "kilo",
          sortOrder: "abc",
          weightGrams: null,
          isActive: true,
        }),
      ),
    ).toBe("validation.numberOnly");
  });

  it("adjustment: non-zero amount and a reason", () => {
    expect(
      firstMessage(recordAdjustmentInput.safeParse({ storeId: uuid, amountCentavos: 0, reason: "ok", idempotencyKey: uuid })),
    ).toBe("validation.nonZero");
    expect(
      firstMessage(recordAdjustmentInput.safeParse({ storeId: uuid, amountCentavos: 100, reason: "", idempotencyKey: uuid })),
    ).toBe("validation.reasonRequired");
  });

  it("empty CSV", () => {
    expect(firstMessage(importCsvInput.safeParse({ csv: "  " }))).toBe("validation.emptyFile");
  });

  it("prices", () => {
    expect(firstMessage(setPriceInput.safeParse({ productUnitId: uuid, priceCentavos: 0 }))).toBe("validation.priceRequired");
    expect(firstMessage(setPriceInput.safeParse({ productUnitId: uuid, priceCentavos: 99_999_999 }))).toBe(
      "validation.priceTooLarge",
    );
    expect(firstMessage(bulkAdjustPricesInput.safeParse({ mode: "percent", direction: "up", value: 150 }))).toBe(
      "validation.percentRange",
    );
    expect(firstMessage(bulkAdjustPricesInput.safeParse({ mode: "fixed", direction: "up", value: 1.5 }))).toBe(
      "validation.amountInvalid",
    );
  });

  it("crew: reduce needs a reason, suki sale needs a store", () => {
    expect(
      firstMessage(recordStockMovementInput.safeParse({ routeId: uuid, productUnitId: uuid, kind: "reduce", quantity: 1 })),
    ).toBe("validation.reasonRequired");
    expect(
      firstMessage(
        createPosSaleInput.safeParse({
          routeId: uuid,
          idempotencyKey: uuid,
          storeId: null,
          payment: "suki",
          items: [{ productUnitId: uuid, quantity: 1 }],
        }),
      ),
    ).toBe("validation.storeRequired");
  });
});

describe("optional sign-in email (Google/Facebook accounts)", () => {
  const store = {
    name: "Tindahan",
    ownerName: "Aling Nena",
    phone: "09171234567",
    lat: null,
    lng: null,
    routeId: null,
    stopOrder: null,
    sukiLimitCentavos: 0,
  };

  it("is optional, and a blank field means none", () => {
    expect(createStoreInput.parse(store).loginEmail).toBeUndefined();
    expect(createStoreInput.parse({ ...store, loginEmail: "  " }).loginEmail).toBeUndefined();
  });

  it("is trimmed and lower-cased", () => {
    expect(createStoreInput.parse({ ...store, loginEmail: " Nena@Gmail.com " }).loginEmail).toBe(
      "nena@gmail.com",
    );
    expect(
      createStaffInput.parse({ name: "Ben", phone: "09171234567", role: "helper", loginEmail: "Ben@x.ph" })
        .loginEmail,
    ).toBe("ben@x.ph");
  });

  it("rejects a malformed address with a validation key", () => {
    expect(firstMessage(createStoreInput.safeParse({ ...store, loginEmail: "not-an-email" }))).toBe(
      "validation.email",
    );
  });
});
