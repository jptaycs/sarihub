/**
 * Social sign-in next to phone OTP. Google and Facebook are free Supabase
 * OAuth providers (no card needed), so they fit the no-paid-APIs decision.
 * A button only shows once the provider is switched on in the Supabase
 * dashboard: the login page reads Supabase's public /auth/v1/settings.
 */
export const OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function enabledOAuthProviders(settings: unknown): OAuthProvider[] {
  if (typeof settings !== "object" || settings === null) return [];
  const external = (settings as { external?: unknown }).external;
  if (typeof external !== "object" || external === null) return [];
  const flags = external as Record<string, unknown>;
  return OAUTH_PROVIDERS.filter((p) => flags[p] === true);
}
