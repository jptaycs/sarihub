import { createSupabaseServer } from "~/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5 pb-10 pt-2">
      <header className="py-3">
        <div className="text-xs text-ink-2">Magandang gabi po,</div>
        <div className="mt-0.5 text-[22px] font-medium leading-[1.15] tracking-tight">
          {user?.phone ? `Suki ${user.phone.slice(-4)}` : "Suki"}
        </div>
      </header>

      <div className="hair-t mt-2 pt-4 text-[13px] text-ink-2">
        Catalog goes here next. Naka-sign in ka na po.
      </div>
    </main>
  );
}
