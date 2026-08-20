import { describe, expect, it } from "vitest";

import { tl } from "~/lib/i18n/dictionaries/tl";

import { notificationMessage } from "./notificationMessage";

describe("notificationMessage", () => {
  it("renders the confirmed template with the store name", () => {
    expect(notificationMessage(tl, "confirmed", "Aling Marisa")).toBe(
      "Suking Aling Marisa, natanggap na po ang order niyo. Aabot bukas ng umaga. – SariHub",
    );
  });

  it("renders the out_for_delivery template", () => {
    expect(notificationMessage(tl, "out_for_delivery", "Aling Marisa")).toBe(
      "Nasa daan na po ang order niyo, Aling Marisa! Aabot na sa umaga. – SariHub",
    );
  });

  it("renders the delivered template", () => {
    expect(notificationMessage(tl, "delivered", "Aling Marisa")).toBe(
      "Naihatid na po ang order niyo, Aling Marisa. Salamat sa pagtitiwala! – SariHub",
    );
  });
});
