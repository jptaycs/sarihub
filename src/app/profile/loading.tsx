export default function ProfileLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-10" aria-busy>
      <div className="h-14" />
      <div className="mt-2 h-9 w-32 animate-pulse rounded-md bg-surface-2" />
      <div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface" />
    </main>
  );
}
