"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  CircleUser,
  Ellipsis,
  Package,
  Store,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Wordmark } from "~/components/ui/Logo";
import { cn } from "~/lib/cn";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

import { AdminSheet } from "./_components/ui";

type NavLink = { href: Route; label: string; icon: LucideIcon };

/** The four admin sections — shared by the sidebar and the phone tab bar. */
function sectionLinks(dict: Dictionary): NavLink[] {
  return [
    { href: "/admin/orders", label: dict.admin.nav.orders, icon: Truck },
    { href: "/admin/catalog", label: dict.admin.nav.catalog, icon: Package },
    { href: "/admin/suki", label: dict.admin.nav.suki, icon: Wallet },
    { href: "/admin/stores", label: dict.admin.nav.stores, icon: Store },
  ];
}

/** Secondary destinations outside /admin (sidebar footer, phone "Menu" sheet). */
function extraLinks(dict: Dictionary): NavLink[] {
  return [
    { href: "/buyer/prices", label: dict.admin.nav.prices, icon: Tag },
    { href: "/profile", label: dict.admin.nav.profile, icon: CircleUser },
  ];
}

function StaffBadge(props: { staffName: string }) {
  const dict = useDictionary();
  const initial = props.staffName.trim().charAt(0).toUpperCase() || "A";
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px] font-semibold text-ink">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{props.staffName}</p>
        <p className="text-[13px] text-ink-2">{dict.profile.roleAdmin}</p>
      </div>
    </div>
  );
}

/** Desktop (≥ lg) persistent sidebar. */
export function AdminSidebar(props: { staffName: string }) {
  const dict = useDictionary();
  const pathname = usePathname();

  const item = (link: NavLink) => {
    const active = pathname.startsWith(link.href);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-pill px-4 text-[15px] font-medium transition-colors",
          active ? "bg-action text-white" : "text-ink hover:bg-surface-2",
        )}
      >
        <Icon size={19} strokeWidth={active ? 2.25 : 1.9} className={active ? "" : "text-ink-2"} />
        {link.label}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-hair bg-surface px-4 pb-6 pt-7 lg:flex">
      <div className="flex items-center gap-2 px-3">
        <Wordmark />
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-ink-2">
          {dict.profile.roleAdmin}
        </span>
      </div>

      <nav className="mt-8 flex flex-col gap-1">{sectionLinks(dict).map(item)}</nav>

      <div className="mt-6 px-4">
        <p className="section-label">{dict.admin.nav.menu}</p>
      </div>
      <nav className="mt-2 flex flex-col gap-1">{extraLinks(dict).map(item)}</nav>

      <div className="mt-auto rounded-lg bg-bg px-3 py-3">
        <StaffBadge staffName={props.staffName} />
      </div>
    </aside>
  );
}

/** Phone/tablet (< lg) sticky frosted top bar with the current section's name. */
export function AdminTopBar() {
  const dict = useDictionary();
  const pathname = usePathname();
  const current = sectionLinks(dict).find((l) => pathname.startsWith(l.href));

  return (
    <header className="glass sticky top-0 z-30 border-b border-hair pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Wordmark />
        {current && (
          <span className="truncate text-[15px] font-semibold text-ink-2">{current.label}</span>
        )}
      </div>
    </header>
  );
}

/** Phone/tablet (< lg) fixed bottom tab bar; the last tab opens a menu sheet. */
export function AdminTabBar(props: { staffName: string }) {
  const dict = useDictionary();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabClass =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-transform duration-150 ease-[var(--ease-spring)] active:scale-90";

  return (
    <>
      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-hair lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex h-16 max-w-[640px] items-stretch justify-around">
          {sectionLinks(dict).map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={tabClass}
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
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            className={tabClass}
          >
            <Ellipsis size={24} strokeWidth={menuOpen ? 2.4 : 1.8} className={menuOpen ? "text-ink" : "text-ink-3"} />
            <span className={cn("text-[11px] font-semibold", menuOpen ? "text-ink" : "text-ink-3")}>
              {dict.admin.nav.menu}
            </span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <AdminSheet title={dict.admin.nav.menu} onClose={() => setMenuOpen(false)}>
          <div className="rounded-lg bg-bg px-4 py-3.5">
            <StaffBadge staffName={props.staffName} />
          </div>
          <div className="mt-3 overflow-hidden rounded-lg bg-bg">
            {extraLinks(dict).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="hair-b flex min-h-[56px] items-center gap-3 px-4 text-[16px] font-medium last:border-b-0 active:bg-surface-2"
                >
                  <Icon size={20} strokeWidth={2} className="text-ink-2" />
                  <span className="flex-1">{link.label}</span>
                  <ChevronRight size={18} className="text-ink-3" />
                </Link>
              );
            })}
          </div>
        </AdminSheet>
      )}
    </>
  );
}
