"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Minus, Pencil, Plus, ReceiptText, Refrigerator, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, ConfirmDialog, EmptyState, Input, LinkButton, LoadingState, PageHeader, Select } from "@/components/ui";
import { addToShoppingList, loadSampleData } from "@/lib/actions";
import { LOCATION_LABELS, LOCATIONS, type InventoryItem, type StorageLocation } from "@/lib/types";
import { describeExpiry, expiryState, formatQuantity, normalizeName, titleCase, todayKey } from "@/lib/utils";

type Sort = "expiry" | "name" | "recent";

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DataGate label="Loading inventory">
        <Inventory />
      </DataGate>
    </Suspense>
  );
}

function Inventory() {
  const { data, mutate } = usePantry();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const locationParam = params.get("location");
  const location: StorageLocation | "all" = LOCATIONS.includes(locationParam as StorageLocation) ? (locationParam as StorageLocation) : "all";
  const sort: Sort = (["expiry", "name", "recent"] as const).find((s) => s === params.get("sort")) ?? "expiry";
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = todayKey();
  const soonDays = data.settings.expiringSoonDays;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const items = useMemo(() => {
    const q = normalizeName(query);
    return data.inventory
      .filter((i) => location === "all" || i.location === location)
      .filter((i) => !q || normalizeName(i.name).includes(q) || i.category.includes(q))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
        return (a.expiresOn ?? "9999-12-31").localeCompare(b.expiresOn ?? "9999-12-31") || a.name.localeCompare(b.name);
      });
  }, [data.inventory, location, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.inventory.length, fridge: 0, freezer: 0, pantry: 0 };
    for (const i of data.inventory) c[i.location] = (c[i.location] ?? 0) + 1;
    return c;
  }, [data.inventory]);

  const adjust = (item: InventoryItem, delta: number) =>
    mutate((repo) => repo.updateInventory(item.id, { quantity: Math.max(0, Math.round((item.quantity + delta) * 100) / 100) }));

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    await mutate((repo) => repo.deleteInventory(pendingDelete.id), { success: `Deleted ${pendingDelete.name}.` });
    setDeleting(false);
    setPendingDelete(null);
  };

  const tabs: { key: StorageLocation | "all"; label: string }[] = [{ key: "all", label: "All" }, ...LOCATIONS.map((l) => ({ key: l, label: LOCATION_LABELS[l] }))];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Everything in your fridge, freezer and pantry."
        actions={
          <>
            <LinkButton href="/import" variant="secondary">
              <ReceiptText className="size-4" aria-hidden /> Import
            </LinkButton>
            <LinkButton href={`/inventory/new${location !== "all" ? `?location=${location}` : ""}`}>
              <Plus className="size-4" aria-hidden /> Add Food
            </LinkButton>
          </>
        }
      />

      <nav aria-label="Storage location" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "all" ? "/inventory" : `/inventory?location=${t.key}`}
                aria-current={location === t.key ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                  location === t.key ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {t.label}
                <span className={clsx("rounded-full px-1.5 text-xs", location === t.key ? "bg-on-primary text-primary" : "bg-surface-2 text-muted")}>{counts[t.key] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data.inventory.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="inv-search" className="sr-only">
              Search inventory
            </label>
            <Input id="inv-search" type="search" placeholder="Search items" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <label htmlFor="inv-sort" className="sr-only">
            Sort by
          </label>
          <Select id="inv-sort" className="sm:w-48" value={sort} onChange={(e) => setParam("sort", e.target.value)}>
            <option value="expiry">Expiring first</option>
            <option value="name">Name A–Z</option>
            <option value="recent">Recently added</option>
          </Select>
        </div>
      )}

      {data.inventory.length === 0 ? (
        <EmptyState
          icon={<Refrigerator className="size-10" />}
          title="Your kitchen is empty"
          description="Add items one at a time, import a grocery receipt, or load a sample kitchen to try things out."
          action={
            <>
              <LinkButton href="/inventory/new">
                <Plus className="size-4" aria-hidden /> Add Food
              </LinkButton>
              <LinkButton href="/import" variant="secondary">
                Import Groceries
              </LinkButton>
              <Button variant="ghost" onClick={() => mutate((repo) => loadSampleData(repo), { success: "Sample kitchen loaded." })}>
                Load sample data
              </Button>
            </>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No matching items"
          description={query ? `Nothing matches “${query}”.` : `Nothing in the ${location === "all" ? "kitchen" : LOCATION_LABELS[location].toLowerCase()} yet.`}
          action={
            <LinkButton href={`/inventory/new${location !== "all" ? `?location=${location}` : ""}`}>
              <Plus className="size-4" aria-hidden /> Add Food
            </LinkButton>
          }
        />
      ) : (
        <ul className="space-y-2" aria-label="Inventory items">
          {items.map((item) => {
            const state = expiryState(item.expiresOn, soonDays, today);
            const low = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
            return (
              <li key={item.id} className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/inventory/${item.id}`} className="block truncate font-semibold hover:underline">
                      {item.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {location === "all" && <Badge>{LOCATION_LABELS[item.location]}</Badge>}
                      <span>{titleCase(item.category)}</span>
                      {state !== "none" && (
                        <Badge tone={state === "expired" ? "danger" : state === "soon" ? "warning" : "neutral"}>{describeExpiry(item.expiresOn, today)}</Badge>
                      )}
                      {item.quantity === 0 ? <Badge tone="danger">Out</Badge> : low && <Badge tone="warning">Low</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="secondary" className="!px-2" aria-label={`Use one ${item.name}`} disabled={item.quantity <= 0} onClick={() => adjust(item, -1)}>
                      <Minus className="size-4" aria-hidden />
                    </Button>
                    <span className="min-w-14 text-center text-sm font-semibold tabular-nums" aria-label={`Quantity ${formatQuantity(item.quantity, item.unit)}`}>
                      {formatQuantity(item.quantity, item.unit)}
                    </span>
                    <Button size="sm" variant="secondary" className="!px-2" aria-label={`Add one ${item.name}`} onClick={() => adjust(item, 1)}>
                      <Plus className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-border pt-2">
                  {(item.quantity === 0 || low) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        mutate((repo) => addToShoppingList(repo, [{ name: item.name, source: "Inventory" }], data.shopping), {
                          success: (r) => (r.added ? `Added ${item.name} to the shopping list.` : `${item.name} is already on the list.`),
                        })
                      }
                    >
                      <ShoppingCart className="size-4" aria-hidden /> Add to list
                    </Button>
                  )}
                  <LinkButton href={`/inventory/${item.id}`} size="sm" variant="ghost" aria-label={`Edit ${item.name}`}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <Button size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${item.name}`} onClick={() => setPendingDelete(item)}>
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete item?"
        message={
          <>
            Remove <strong>{pendingDelete?.name}</strong> from your inventory? This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
