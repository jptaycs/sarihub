import { NextResponse, type NextRequest } from "next/server";

import { loginHref, safeNext } from "~/lib/safeNext";
import { createSupabaseServer } from "~/lib/supabase/server";

/**
 * Google/Facebook send people back here with a one-time `code`; trading it
 * for a session sets the auth cookies, then we continue to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failed = new URL(loginHref(next), origin);
  failed.searchParams.set("error", "oauth");
  return NextResponse.redirect(failed);
}
