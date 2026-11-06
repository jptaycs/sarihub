import { describe, expect, it } from "vitest";

import { enabledOAuthProviders } from "./oauthProviders";

describe("enabledOAuthProviders", () => {
  it("lists the providers Supabase reports as enabled, in display order", () => {
    expect(
      enabledOAuthProviders({ external: { facebook: true, google: true, phone: true, github: true } }),
    ).toEqual(["google", "facebook"]);
  });

  it("drops disabled providers", () => {
    expect(enabledOAuthProviders({ external: { google: false, facebook: true } })).toEqual(["facebook"]);
  });

  it("is empty for a missing or malformed settings payload", () => {
    expect(enabledOAuthProviders(null)).toEqual([]);
    expect(enabledOAuthProviders({})).toEqual([]);
    expect(enabledOAuthProviders({ external: "yes" })).toEqual([]);
  });
});
