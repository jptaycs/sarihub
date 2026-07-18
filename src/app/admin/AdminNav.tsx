"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, Package, Store, Tag, Truck, Wallet } from "lucide-react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

/** Vertical sidebar nav — the Apple translation for a tablet/desktop console
 * (NavigationSplitView / macOS System Settings), not a bottom tab bar. */
export function AdminNav() {
  const dict = useDictionary();
  const pathname = usePathname();
  const links = [
    { href: "/admin/orders", label: dict.admin.nav.orders, icon: Truck },
    { href: "/admin/catalog", label: dict.admin.nav.catalog, icon: Package },
    { href: "/admin/suki", label: dict.admin.nav.suki, icon: Wallet },
    { href: "/admin/stores", label: dict.admin.nav.stores, icon: Store },
    { href: "/buyer/prices", label: dict.admin.nav.prices, icon: Tag },
  ] as const;

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-md px-3 text-[14px] font-medium transition-colors",
              active ? "bg-action text-white" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.25 : 1.9} />
            {link.label}
          </Link>
        );
      })}

      <div className="hair-t my-2" />

      <Link
        href="/profile"
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-md px-3 text-[14px] font-medium transition-colors",
          pathname.startsWith("/profile") ? "bg-action text-white" : "text-ink-2 hover:bg-surface-2",
        )}
      >
        <CircleUser size={18} strokeWidth={pathname.startsWith("/profile") ? 2.25 : 1.9} />
        {dict.admin.nav.profile}
      </Link>
    </nav>
  );
}
