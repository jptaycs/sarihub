"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Package, ShoppingCart, Truck, type LucideIcon } from "lucide-react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

/** The four jobs of the morning, in the order they happen. */
export function CrewTabBar() {
  const dict = useDictionary();
  const pathname = usePathname();

  const tabs: Array<{ href: Route; icon: LucideIcon; label: string }> = [
    { href: "/crew/pack", icon: Package, label: dict.crew.tabPack },
    { href: "/crew/stock", icon: Boxes, label: dict.crew.tabStock },
    { href: "/crew/sell", icon: ShoppingCart, label: dict.crew.tabSell },
    { href: "/crew/deliver", icon: Truck, label: dict.crew.tabDeliver },
  ];

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-hair"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-[440px] items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-transform duration-150 ease-[var(--ease-spring)] active:scale-90"
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-ink" : "text-ink-3"}
              />
              <span
                className={cn(
                  "max-w-full truncate px-0.5 text-[11px] font-semibold",
                  active ? "text-ink" : "text-ink-3",
                )}
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
