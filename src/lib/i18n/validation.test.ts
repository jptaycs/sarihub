import { describe, expect, it } from "vitest";

import { en } from "./dictionaries/en";
import { tl } from "./dictionaries/tl";
import { fieldError, validationMessage } from "./validation";

describe("validationMessage", () => {
  it("produces a stable key, not copy", () => {
    expect(validationMessage("required")).toBe("validation.required");
  });
});

describe("fieldError", () => {
  it("passes undefined through (no error on the field)", () => {
    expect(fieldError(tl, undefined)).toBeUndefined();
  });

  it("looks a validation key up in the active dictionary", () => {
    expect(fieldError(tl, "validation.required")).toBe(tl.validation.required);
    expect(fieldError(en, "validation.required")).toBe(en.validation.required);
    expect(tl.validation.required).not.toBe(en.validation.required);
  });

  it("falls back to the generic message for a zod default like 'Invalid uuid'", () => {
    expect(fieldError(en, "Invalid uuid")).toBe(en.validation.invalid);
  });

  it("falls back to the generic message for an unknown key", () => {
    expect(fieldError(en, "validation.doesNotExist")).toBe(en.validation.invalid);
  });
});
