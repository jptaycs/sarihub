import { describe, expect, it } from "vitest";

import { backoffMinutes } from "./smsBackoff";

describe("backoffMinutes", () => {
  it("doubles from 2 minutes for the first four failed attempts", () => {
    expect(backoffMinutes(1)).toBe(2);
    expect(backoffMinutes(2)).toBe(4);
    expect(backoffMinutes(3)).toBe(8);
    expect(backoffMinutes(4)).toBe(16);
  });

  it("returns null once the fifth attempt has failed — no more retries", () => {
    expect(backoffMinutes(5)).toBeNull();
    expect(backoffMinutes(6)).toBeNull();
  });
});
