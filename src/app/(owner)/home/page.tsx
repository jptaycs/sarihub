import { createSupabaseServer } from "~/lib/supabase/server";

import { HomeClient } from "./HomeClient";

/** Public storefront: guests browse and fill a cart; sign-in happens at checkout. */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { checkout } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-48">
      <HomeClient signedIn={user !== null} openCartOnLoad={checkout === "1"} />
    </main>
  );
}
