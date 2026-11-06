import { describe, expect, it } from "vitest";

import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("defaults the app to Tagalog", () => {
    expect(resolveLocale("app", {})).toBe("tl");
  });

  it("defaults the admin area to English, even when the app cookie says Tagalog", () => {
    expect(resolveLocale("admin", { app: "tl" })).toBe("en");
  });

  it("honours each area's own saved choice", () => {
    expect(resolveLocale("app", { app: "en", admin: "tl" })).toBe("en");
    expect(resolveLocale("admin", { app: "en", admin: "tl" })).toBe("tl");
  });

  it("ignores garbage cookie values", () => {
    expect(resolveLocale("app", { app: "fr" })).toBe("tl");
    expect(resolveLocale("admin", { admin: "xx" })).toBe("en");
  });
});
