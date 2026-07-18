import { describe, expect, it } from "vitest";

import { en } from "./dictionaries/en";
import { tl } from "./dictionaries/tl";
import { interpolate } from "./interpolate";

/** All leaf key-paths in a nested string dictionary, e.g. "admin.nav.orders". */
function keyPaths(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? keyPaths(value, path) : [path];
  });
}

describe("dictionaries", () => {
  it("tl and en have identical key shapes", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(tl).sort());
  });

  it("every value is a non-empty string", () => {
    for (const path of keyPaths(tl)) {
      const value = path.split(".").reduce<unknown>((o, k) => (o as never)[k], tl);
      expect(typeof value, `${path} in tl`).toBe("string");
      expect((value as string).length, `${path} in tl`).toBeGreaterThan(0);
    }
  });
});

describe("interpolate", () => {
  it("substitutes named placeholders", () => {
    expect(interpolate("Hello {name}", { name: "Aling Marisa" })).toBe("Hello Aling Marisa");
  });

  it("substitutes numbers", () => {
    expect(interpolate("{count} item", { count: 3 })).toBe("3 item");
  });

  it("handles multiple placeholders", () => {
    expect(interpolate("{a} and {b}", { a: "x", b: "y" })).toBe("x and y");
  });

  it("leaves unmatched placeholders untouched", () => {
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });

  it("passes through templates with no placeholders when vars is omitted", () => {
    expect(interpolate("Plain text")).toBe("Plain text");
  });
});
