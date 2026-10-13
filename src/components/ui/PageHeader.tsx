import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "~/lib/cn";

/**
 * Sticky frosted header for phone screens: optional round back button on the
 * left, iOS large title below. Server- and client-safe (no hooks).
 */
export function PageHeader(props: {
  title: string;
  backHref?: Route;
  backLabel?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "glass sticky top-0 z-30 -mx-5 flex h-14 items-center justify-between px-5 pt-[env(safe-area-inset-top)]",
          props.className,
        )}
      >
        {props.backHref ? (
          <Link
            href={props.backHref}
            aria-label={props.backLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 transition-transform active:scale-95"
          >
            <ChevronLeft size={20} strokeWidth={2.25} />
          </Link>
        ) : (
          <span />
        )}
        {props.right}
      </div>
      <h1 className="title-large pb-4 pt-1">{props.title}</h1>
    </>
  );
}
