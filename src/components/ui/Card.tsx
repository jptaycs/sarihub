import { cn } from "~/lib/cn";

/**
 * The Apple "grouped table view" building block: a rounded, softly-shadowed
 * white container holding hairline-separated `CardRow`s.
 */
export function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]", props.className)}
    >
      {props.children}
    </div>
  );
}

export function CardRow(
  props: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode },
) {
  const { className, children, ...rest } = props;
  return (
    <div className={cn("hair-b px-4 py-3.5 last:border-b-0", className)} {...rest}>
      {children}
    </div>
  );
}
