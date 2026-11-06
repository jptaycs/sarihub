import "server-only";

import { env } from "~/lib/env";

import { enabledOAuthProviders, type OAuthProvider } from "./oauthProviders";

/**
 * Which social sign-ins are switched on in the Supabase dashboard, from
 * Supabase's public settings endpoint. Cached for five minutes; any failure
 * just hides the buttons — phone sign-in still works.
 */
export async function getEnabledOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return enabledOAuthProviders(await res.json());
  } catch {
    return [];
  }
}
