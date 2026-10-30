"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChefHat,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  Refrigerator,
  Settings,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { loadSampleData } from "@/lib/actions";
import { getRetailer } from "@/lib/integrations";
import { rankRecipes } from "@/lib/recipes";
import { LOCATION_LABELS, LOCATIONS, SLOT_LABELS, type StorageLocation } from "@/lib/types";
import { describeExpiry, expiryState, formatDate, formatQuantity, todayKey } from "@/lib/utils";

const LOCATION_ICONS: Record<StorageLocation, typeof Refrigerator> = { fridge: Refrigerator, freezer: Snowflake, pantry: Package };

export default function DashboardPage() {
  return (
    <DataGate label="Loading your kitchen">
      <Dashboard />
    </DataGate>
  );
}

function Onboarding() {
  const { mutate, data } = usePantry();
  const [busy, setBusy] = useState<"sample" | "empty" | null>(null);
  const start = async (withSample: boolean) => {
    setBusy(withSample ? "sample" : "empty");
    await mutate(
      async (repo) => {
        if (withSample) await loadSampleData(repo);
        await repo.saveSettings({ ...data.settings, onboarded: true });
      },
      { success: withSample ? "Sample kitchen loaded. Edit or delete anything." : "Ready. Add your first item!" },
    );
    setBusy(null);
  };
  return (
    <Card className="mb-6 border-primary/30 bg-primary-soft">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Welcome to PantryIQ</h2>
          <p className="mt-1 text-sm">
            Track what&apos;s in your fridge, freezer and pantry, then get recipes that use what you already have. Want to explore with a sample
            kitchen first? It&apos;s clearly marked and you can delete it any time from Settings.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => start(true)} loading={busy === "sample"} disabled={!!busy}>
              Load sample kitchen
            </Button>
            <Button variant="secondary" onClick={() => start(false)} loading={busy === "empty"} disabled={!!busy}>
              Start empty
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data } = usePantry();
  const { inventory, settings, imports, mealPlan, shopping } = data;
  const today = todayKey();

  const counts = useMemo(() => {
    const c: Record<StorageLocation, number> = { fridge: 0, freezer: 0, pantry: 0 };
    for (const i of inventory) c[i.location]++;
    return c;
  }, [inventory]);

  const useSoon = useMemo(
    () =>
      inventory
        .filter((i) => ["expired", "soon"].includes(expiryState(i.expiresOn, settings.expiringSoonDays, today)))
        .sort((a, b) => (a.expiresOn ?? "").localeCompare(b.expiresOn ?? "")),
    [inventory, settings.expiringSoonDays, today],
  );
  const lowStock = inventory.filter((i) => i.lowStockThreshold != null && i.quantity <= i.lowStockThreshold);
  const awaiting = imports.filter((i) => i.status === "awaiting");
  const reviewing = imports.filter((i) => i.status === "review");
  const todaysMeals = mealPlan.filter((m) => m.date === today);
  const allMakeable = useMemo(() => rankRecipes(inventory, settings).filter((m) => m.missing.length === 0), [inventory, settings]);
  const makeable = allMakeable.slice(0, 3);
  const toBuy = shopping.filter((s) => !s.checked).length;

  const actions = [
    { href: "/inventory/new", label: "Add Food", sub: "Fridge, freezer or pantry", icon: Plus, primary: true },
    { href: "/import", label: "Import Groceries", sub: awaiting.length ? `${awaiting.length} awaiting confirmation` : "Paste a receipt or order", icon: ReceiptText },
    { href: "/recipes", label: "Find Recipes", sub: allMakeable.length ? `${allMakeable.length} ready to cook` : "From what you own", icon: ChefHat },
    { href: "/meal-plan", label: "Meal Planner", sub: todaysMeals.length ? `${todaysMeals.length} planned today` : "Plan your week", icon: CalendarDays },
    { href: "/shopping", label: "Shopping List", sub: toBuy ? `${toBuy} to buy` : "Nothing to buy", icon: ShoppingCart },
    { href: "/settings", label: "Settings", sub: "Household & integrations", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{settings.householdName}</h1>
      </div>

      {!settings.onboarded && inventory.length === 0 && <Onboarding />}

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="sr-only">
          Quick actions
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map(({ href, label, sub, icon: Icon, primary }) => (
            <li key={href}>
              <Link
                href={href}
                className={
                  primary
                    ? "flex h-full min-h-24 flex-col justify-between gap-2 rounded-2xl bg-primary p-4 text-on-primary hover:bg-primary-strong"
                    : "flex h-full min-h-24 flex-col justify-between gap-2 rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 hover:bg-surface-2"
                }
              >
                <Icon className={primary ? "size-6" : "size-6 text-primary"} aria-hidden />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className={primary ? "block text-xs opacity-90" : "block text-xs text-muted"}>{sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="mb-3 text-lg font-semibold">
          Storage
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {LOCATIONS.map((loc) => {
            const Icon = LOCATION_ICONS[loc];
            return (
              <li key={loc}>
                <Link href={`/inventory?location=${loc}`} className="flex flex-col items-center rounded-2xl border border-border bg-surface p-4 text-center hover:bg-surface-2">
                  <Icon className="size-6 text-primary" aria-hidden />
                  <span className="mt-1 text-2xl font-bold">{counts[loc]}</span>
                  <span className="text-xs text-muted">{LOCATION_LABELS[loc]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {(awaiting.length > 0 || reviewing.length > 0) && (
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-3 text-lg font-semibold">
            Grocery orders
          </h2>
          <ul className="space-y-2">
            {[...reviewing, ...awaiting].map((imp) => (
              <li key={imp.id}>
                <Card className="flex flex-wrap items-center gap-3 !p-4">
                  {imp.fulfillment === "delivery" ? <Truck className="size-5 text-info" aria-hidden /> : <PackageCheck className="size-5 text-info" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {getRetailer(imp.retailerId).name} · {imp.lines.filter((l) => l.include).length} items
                    </p>
                    <p className="text-xs text-muted">
                      {imp.status === "review"
                        ? "Needs review"
                        : `${imp.fulfillment === "delivery" ? "Delivery" : "Pickup"}${imp.expectedOn ? ` expected ${formatDate(imp.expectedOn)}` : ""} · not in inventory yet`}
                    </p>
                  </div>
                  <LinkButton href={`/import/${imp.id}`} size="sm" variant={imp.status === "awaiting" ? "primary" : "secondary"}>
                    {imp.status === "awaiting" ? (imp.fulfillment === "delivery" ? "Confirm delivered" : "Confirm picked up") : "Review"}
                  </LinkButton>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="use-soon-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="use-soon-heading" className="text-lg font-semibold">
              Use soon
            </h2>
            <Link href="/inventory?sort=expiry" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <Card className="!p-0">
            {useSoon.length === 0 ? (
              <p className="p-4 text-sm text-muted">Nothing expiring in the next {settings.expiringSoonDays} days.</p>
            ) : (
              <ul className="divide-y divide-border">
                {useSoon.slice(0, 6).map((i) => {
                  const state = expiryState(i.expiresOn, settings.expiringSoonDays, today);
                  return (
                    <li key={i.id}>
                      <Link href={`/inventory/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{i.name}</span>
                          <span className="text-xs text-muted">
                            {LOCATION_LABELS[i.location]} · {formatQuantity(i.quantity, i.unit)}
                          </span>
                        </span>
                        <Badge tone={state === "expired" ? "danger" : "warning"}>{describeExpiry(i.expiresOn, today)}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="today-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="today-heading" className="text-lg font-semibold">
              Today&apos;s meals
            </h2>
            <Link href="/meal-plan" className="text-sm font-medium text-primary hover:underline">
              Open planner
            </Link>
          </div>
          <Card className="!p-0">
            {todaysMeals.length === 0 ? (
              <p className="p-4 text-sm text-muted">No meals planned for today.</p>
            ) : (
              <ul className="divide-y divide-border">
                {todaysMeals.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{SLOT_LABELS[m.slot]}</span>
                      {m.recipeId ? (
                        <Link href={`/recipes/${m.recipeId}`} className="font-medium hover:underline">
                          {m.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{m.title}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="cook-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="cook-heading" className="text-lg font-semibold">
              Cook now
            </h2>
            <Link href="/recipes" className="text-sm font-medium text-primary hover:underline">
              All recipes
            </Link>
          </div>
          <Card className="!p-0">
            {makeable.length === 0 ? (
              <p className="p-4 text-sm text-muted">No recipe is fully covered yet. Recipes shows what you&apos;re missing.</p>
            ) : (
              <ul className="divide-y divide-border">
                {makeable.map((m) => (
                  <li key={m.recipe.id}>
                    <Link href={`/recipes/${m.recipe.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                      <span className="font-medium">{m.recipe.title}</span>
                      <span className="flex gap-1">
                        {m.usesExpiring > 0 && <Badge tone="warning">Uses expiring</Badge>}
                        <Badge tone="neutral">{m.recipe.minutes} min</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="low-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="low-heading" className="text-lg font-semibold">
              Running low
            </h2>
            <Link href="/shopping" className="text-sm font-medium text-primary hover:underline">
              Shopping list
            </Link>
          </div>
          <Card className="!p-0">
            {lowStock.length === 0 ? (
              <p className="p-4 text-sm text-muted">Nothing is below its low-stock level. Set levels when editing an item.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lowStock.map((i) => (
                  <li key={i.id}>
                    <Link href={`/inventory/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                      <span className="font-medium">{i.name}</span>
                      <Badge tone="warning">{formatQuantity(i.quantity, i.unit)} left</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
