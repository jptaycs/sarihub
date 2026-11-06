import { describe, expect, it } from "vitest";

import { classifyOtpSendError } from "./otpSendError";

describe("classifyOtpSendError", () => {
  it("treats a 429 as rate limited", () => {
    expect(classifyOtpSendError({ status: 429, message: "too many" })).toBe("rate_limited");
  });

  it("treats Supabase's missing-SMS-provider error as an unregistered number", () => {
    expect(
      classifyOtpSendError({ status: 500, message: "Unable to get SMS provider" }),
    ).toBe("unregistered_number");
  });

  it("falls back to send_failed for anything else", () => {
    expect(classifyOtpSendError({ status: 500, message: "boom" })).toBe("send_failed");
    expect(classifyOtpSendError({ status: undefined, message: "" })).toBe("send_failed");
  });
});
