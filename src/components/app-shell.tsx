"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChefHat,
  Cloud,
  HardDrive,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Refrigerator,
  Settings,
  ShoppingCart,
} from "lucide-react";
import type { ReactNode } from "react";
import { usePantry } from "./pantry-provider";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, mobile: true },
  { href: "/inventory", label: "Inventory", short: "Food", icon: Refrigerator, mobile: true },
  { href: "/import", label: "Import Groceries", short: "Import", icon: ReceiptText, mobile: false },
  { href: "/recipes", label: "Find Recipes", short: "Recipes", icon: ChefHat, mobile: true },
  { href: "/meal-plan", label: "Meal Planner", short: "Plan", icon: CalendarDays, mobile: true },
  { href: "/shopping", label: "Shopping List", short: "Shop", icon: ShoppingCart, mobile: true },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings, mobile: false },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function StorageBadge() {
  const { mode } = usePantry();
  if (mode.kind === "supabase") {
    return (
      <Link href="/settings#household" className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs text-primary-strong">
        <Cloud className="size-4 shrink-0" aria-hidden />
        <span className="truncate">
          Synced · <strong>{mode.householdName}</strong>
        </span>
      </Link>
    );
  }
  return (
    <Link href="/settings#household" className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
      <HardDrive className="size-4 shrink-0" aria-hidden />
      <span>Saved on this device only</span>
    </Link>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="PantryIQ home">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-on-primary" aria-hidden>
        <Refrigerator className="size-5" />
      </span>
      <span className="text-lg">PantryIQ</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
        <Logo />
        <nav aria-label="Main" className="mt-8 flex-1">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      active ? "bg-primary-soft text-primary-strong" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/inventory/new"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-strong"
          >
            <Plus className="size-5" aria-hidden /> Add Food
          </Link>
        </nav>
        <StorageBadge />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="pt-safe sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <div className="flex items-center gap-1">
              <Link href="/inventory/new" aria-label="Add food" className="grid size-11 place-items-center rounded-xl text-primary hover:bg-surface-2">
                <Plus className="size-6" aria-hidden />
              </Link>
              <Link href="/import" aria-label="Import groceries" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2">
                <ReceiptText className="size-5" aria-hidden />
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                aria-current={isActive(pathname, "/settings") ? "page" : undefined}
                className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 aria-[current=page]:text-primary"
              >
                <Settings className="size-5" aria-hidden />
              </Link>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 outline-none sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </main>

        {/* Mobile tab bar */}
        <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {NAV_ITEMS.filter((i) => i.mobile).map(({ href, short, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                      active ? "text-primary" : "text-muted",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                    {short}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
