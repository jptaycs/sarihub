import { describe, expect, it } from "vitest";

import { googleMapsDirectionsUrl } from "./geo";

describe("googleMapsDirectionsUrl", () => {
  it("builds a universal Google Maps directions link", () => {
    expect(googleMapsDirectionsUrl(13.9314, 121.617)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=13.9314,121.617",
    );
  });

  it("handles negative coordinates", () => {
    expect(googleMapsDirectionsUrl(-13.5, -121.25)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-13.5,-121.25",
    );
  });
});
