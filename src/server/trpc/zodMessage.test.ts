import { describe, expect, it } from "vitest";
import { z } from "zod";

import { en } from "~/lib/i18n/dictionaries/en";
import { tl } from "~/lib/i18n/dictionaries/tl";
import { validationMessage } from "~/lib/i18n/validation";

import { zodErrorMessage } from "./zodMessage";

const schema = z.object({
  reason: z.string().min(3, validationMessage("reasonRequired")),
  id: z.string().uuid(),
});

describe("zodErrorMessage", () => {
  it("translates the first issue's validation key in the request locale", () => {
    const r = schema.safeParse({ reason: "", id: "11111111-1111-4111-8111-111111111111" });
    if (r.success) throw new Error("expected failure");
    expect(zodErrorMessage("tl", r.error)).toBe(tl.validation.reasonRequired);
    expect(zodErrorMessage("en", r.error)).toBe(en.validation.reasonRequired);
  });

  it("maps a zod default message to the generic copy instead of leaking it", () => {
    const r = schema.safeParse({ reason: "fine", id: "nope" });
    if (r.success) throw new Error("expected failure");
    expect(zodErrorMessage("en", r.error)).toBe(en.validation.invalid);
  });
});
