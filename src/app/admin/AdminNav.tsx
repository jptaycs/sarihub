"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

export function AdminNav() {
  const dict = useDictionary();
  const pathname = usePathname();
  const links = [
    { href: "/admin/orders", label: dict.admin.nav.orders },
    { href: "/admin/catalog", label: dict.admin.nav.catalog },
    { href: "/admin/suki", label: dict.admin.nav.suki },
    { href: "/admin/stores", label: dict.admin.nav.stores },
    { href: "/buyer/prices", label: dict.admin.nav.prices },
  ] as const;

  return (
    <nav className="flex gap-1.5">
      {links.map((link) => {
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
