import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

/** Served by the service worker when a navigation fails with no cached copy. */
export default async function OfflinePage() {
  const dict = getDictionary(await getServerLocale());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-4 text-lg font-medium">{dict.offline.title}</h1>
      <p className="mt-1 text-[13px] text-ink-2">{dict.offline.message}</p>
    </main>
  );
}
