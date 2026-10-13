import { cn } from "~/lib/cn";

/** Black rounded-square app mark. `size` is the edge length in px. */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center bg-action font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        fontSize: size * 0.5,
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}
      aria-label="SariHub"
    >
      S
    </div>
  );
}

/** Logo mark + wordmark, for headers. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={28} />
      <span className="text-[17px] font-bold tracking-tight">SariHub</span>
    </div>
  );
}
