import { describe, expect, it } from "vitest";

import { formatPeso, formatPhone, parsePhPhone } from "./format";

describe("formatPeso", () => {
  it("renders integer centavos as ₱X,XXX.XX", () => {
    expect(formatPeso(0)).toBe("₱0.00");
    expect(formatPeso(50)).toBe("₱0.50");
    expect(formatPeso(12345)).toBe("₱123.45");
    expect(formatPeso(123450)).toBe("₱1,234.50");
    expect(formatPeso(100000000)).toBe("₱1,000,000.00");
  });

  it("accepts bigint", () => {
    expect(formatPeso(123450n)).toBe("₱1,234.50");
  });
});

describe("parsePhPhone", () => {
  it.each([
    ["09178452310", "+639178452310"],
    ["+639178452310", "+639178452310"],
    ["639178452310", "+639178452310"],
    ["9178452310", "+639178452310"],
    ["0917 845 2310", "+639178452310"],
    ["+63 917-845-2310", "+639178452310"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(parsePhPhone(input)).toBe(expected);
  });

  it.each(["", "0817845231", "+1234567890", "0917845", "abcdef"])(
    "rejects invalid %s",
    (input) => {
      expect(parsePhPhone(input)).toBeNull();
    },
  );
});

describe("formatPhone", () => {
  it("renders E.164 PH as '0917 845 2310'", () => {
    expect(formatPhone("+639178452310")).toBe("0917 845 2310");
  });

  it("passes through non-PH input", () => {
    expect(formatPhone("+1234567890")).toBe("+1234567890");
  });
});
