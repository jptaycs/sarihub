import { cn } from "~/lib/cn";

/**
 * The Apple "grouped table view" building block: a rounded, soft-shadowed
 * white container holding hairline-separated `CardRow`s.
 */
export function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(44,44,42,0.06)]",
        props.className,
      )}
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
    <div
      className={cn("hair-b px-4 py-3.5 last:border-b-0", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
