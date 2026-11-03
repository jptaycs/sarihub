/** Instant feedback on a tab-bar tap while the server resolves the session. */
export default function OwnerLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-28" aria-busy>
      <div className="h-14" />
      <div className="mt-4 h-9 w-48 animate-pulse rounded-md bg-surface-2" />
      <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface" />
      <div className="mt-5 h-12 animate-pulse rounded-pill bg-surface" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-3 h-32 animate-pulse rounded-lg bg-surface" />
      ))}
    </main>
  );
}
