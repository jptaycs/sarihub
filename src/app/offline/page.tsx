import { Logo } from "~/components/ui/Logo";

/** Served by the service worker when a navigation fails with no cached copy. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-4 text-lg font-medium">Walang koneksyon po</h1>
      <p className="mt-1 text-[13px] text-ink-2">
        Hindi kayo naka-connect sa internet. Subukan ulit kapag may signal na — nandito pa rin ang
        SariHub.
      </p>
    </main>
  );
}
