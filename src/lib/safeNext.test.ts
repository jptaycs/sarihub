import { describe, expect, it } from "vitest";

import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("keeps same-origin paths with query strings", () => {
    expect(safeNext("/home?checkout=1")).toBe("/home?checkout=1");
    expect(safeNext("/admin/orders")).toBe("/admin/orders");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNext("//evil.com")).toBe("/home");
    expect(safeNext("/\evil.com")).toBe("/home");
    expect(safeNext("https://evil.com")).toBe("/home");
    expect(safeNext("javascript:alert(1)")).toBe("/home");
    expect(safeNext("/home\n//x")).toBe("/home");
  });

  it("falls back on missing or looping values", () => {
    expect(safeNext(null)).toBe("/home");
    expect(safeNext("")).toBe("/home");
    expect(safeNext("/login?next=/x")).toBe("/home");
    expect(safeNext("/verify")).toBe("/home");
  });
});
