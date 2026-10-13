import { Logo } from "~/components/ui/Logo";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

/** Served by the service worker when a navigation fails with no cached copy. */
export default async function OfflinePage() {
  const dict = getDictionary(await getServerLocale());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center px-6 text-center">
      <Logo size={72} />
      <h1 className="mt-6 text-[26px] font-bold tracking-tight">{dict.offline.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{dict.offline.message}</p>
    </main>
  );
}
