"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, Home, Receipt } from "lucide-react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

const TABS = [
  { href: "/home", icon: Home, key: "home" },
  { href: "/orders", icon: Receipt, key: "orders" },
  { href: "/profile", icon: CircleUser, key: "profile" },
] as const;

/**
 * Persistent bottom tab bar for the owner app (Home / Orders / Profile).
 * Rendered by the `(owner)` route group layout, and directly by /profile
 * itself when the viewer is an owner (that page sits outside the group so
 * staff can reach it too — see AGENTS.md's profile-page note).
 */
export function OwnerTabBar() {
  const dict = useDictionary();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-white/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[420px] items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.key === "home" ? pathname === "/home" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-transform duration-150 ease-[var(--ease-spring)] active:scale-95"
            >
              <Icon
                size={25}
                strokeWidth={active ? 2.25 : 1.75}
                className={active ? "text-action" : "text-ink-3"}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-action" : "text-ink-3",
                )}
              >
                {dict.nav[tab.key]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
