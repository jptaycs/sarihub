/** Skeleton shown while the staff layout checks the session. */
export default function StaffLoading() {
  return (
    <div className="animate-fade-in pt-4" aria-busy>
      <div className="h-9 w-48 animate-pulse rounded-md bg-surface-2" />
      <div className="mt-2 h-4 w-28 animate-pulse rounded-md bg-surface-2" />
      <div className="mt-5 h-28 animate-pulse rounded-lg bg-surface" />
      <div className="mt-3 h-40 animate-pulse rounded-lg bg-surface" />
    </div>
  );
}
