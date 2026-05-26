import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "~/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase client bound to the current request's cookies.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Setting cookies from a Server Component is a no-op; middleware refreshes the session.
        }
      },
    },
  });
}
