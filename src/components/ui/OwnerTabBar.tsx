"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, House, LogIn, Receipt } from "lucide-react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

/**
 * Persistent frosted bottom tab bar for the owner app (Home / Orders /
 * Profile). Rendered by the `(owner)` route group layout, and directly by
 * /profile itself when the viewer is an owner. Guests get the same bar, with
 * Orders and "Sign in" both routing through /login and back.
 */
export function OwnerTabBar({ signedIn }: { signedIn: boolean }) {
  const dict = useDictionary();
  const pathname = usePathname();

  const tabs = [
    { href: "/home", match: "/home", icon: House, label: dict.nav.home },
    {
      href: signedIn ? "/orders" : `/login?next=${encodeURIComponent("/orders")}`,
      match: "/orders",
      icon: Receipt,
      label: dict.nav.orders,
    },
    signedIn
      ? { href: "/profile", match: "/profile", icon: CircleUser, label: dict.nav.profile }
      : {
          href: `/login?next=${encodeURIComponent("/home")}`,
          match: "/login",
          icon: LogIn,
          label: dict.nav.signIn,
        },
  ];

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-hair"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-[440px] items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.match);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.match}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 transition-transform duration-150 ease-[var(--ease-spring)] active:scale-90"
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-ink" : "text-ink-3"}
              />
              <span
                className={cn("text-[11px] font-semibold", active ? "text-ink" : "text-ink-3")}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
