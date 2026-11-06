import { describe, expect, it } from "vitest";

import { classifyPasswordAuthError, signUpInput } from "./signUp";

const valid = {
  fullName: "Nena Reyes",
  storeName: "Tindahan ni Nena",
  phone: "0917 123 4567",
  addressLine: "",
  password: "sari2026!",
  confirmPassword: "sari2026!",
};

function messages(input: unknown): string[] {
  const r = signUpInput.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe("signUpInput", () => {
  it("accepts a complete form and normalises the phone to E.164", () => {
    const parsed = signUpInput.parse(valid);
    expect(parsed.phoneE164).toBe("+639171234567");
    expect(parsed.addressLine).toBeUndefined();
  });

  it("requires name and store name", () => {
    expect(messages({ ...valid, fullName: " ", storeName: "" })).toEqual([
      "validation.required",
      "validation.required",
    ]);
  });

  it("rejects a number that isn't a PH mobile", () => {
    expect(messages({ ...valid, phone: "12345" })).toEqual(["validation.phone"]);
  });

  it("needs a password of at least 8 characters, typed the same twice", () => {
    expect(messages({ ...valid, password: "short", confirmPassword: "short" })).toEqual([
      "validation.passwordTooShort",
    ]);
    expect(messages({ ...valid, confirmPassword: "different1" })).toEqual(["validation.passwordMismatch"]);
  });
});

describe("classifyPasswordAuthError", () => {
  it("spots a number that already has an account", () => {
    expect(classifyPasswordAuthError({ code: "phone_exists", message: "" })).toBe("already_registered");
    expect(classifyPasswordAuthError({ code: "user_already_exists", message: "" })).toBe("already_registered");
    expect(classifyPasswordAuthError({ message: "User already registered" })).toBe("already_registered");
  });

  it("spots a wrong number/password pair", () => {
    expect(classifyPasswordAuthError({ code: "invalid_credentials", message: "" })).toBe("wrong_password");
  });

  it("spots rate limiting and weak passwords", () => {
    expect(classifyPasswordAuthError({ status: 429, message: "" })).toBe("rate_limited");
    expect(classifyPasswordAuthError({ code: "weak_password", message: "" })).toBe("weak_password");
  });

  it("falls back to failed", () => {
    expect(classifyPasswordAuthError({ status: 500, message: "boom" })).toBe("failed");
  });
});
