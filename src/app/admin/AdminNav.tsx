"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/cn";

const LINKS = [
  { href: "/admin/orders", label: "Padala" },
  { href: "/admin/catalog", label: "Katalogo" },
  { href: "/admin/suki", label: "Suki" },
  { href: "/admin/stores", label: "Mga tindahan" },
  { href: "/buyer/prices", label: "Presyo" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex h-10 items-center rounded-pill border px-3.5 text-[13px] font-medium transition-colors",
              active
                ? "border-action bg-action text-white"
                : "border-hair-strong bg-white text-ink-2 hover:bg-surface-2",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
